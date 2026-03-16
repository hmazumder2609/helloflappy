import os
import warnings
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel, field_validator
import aiosqlite

DB_PATH = os.environ.get("DB_PATH", "flappy.db")


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                username TEXT PRIMARY KEY,
                hashed_password TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS high_scores (
                username TEXT PRIMARY KEY,
                score INTEGER DEFAULT 0,
                FOREIGN KEY (username) REFERENCES users(username)
            )
        """)
        await db.commit()


def get_db():
    return aiosqlite.connect(DB_PATH)


@asynccontextmanager
async def lifespan(app):
    await init_db()
    yield


app = FastAPI(lifespan=lifespan)

# CORS configuration
CORS_ORIGINS = os.environ.get(
    "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security configuration
SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = "dev-only-insecure-key-" + os.urandom(16).hex()
    warnings.warn(
        "SECRET_KEY not set — using random dev key. Set SECRET_KEY env var in production.",
        stacklevel=1,
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

security = HTTPBearer()


# Pydantic models
class UserRegister(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        if len(v) < 3 or len(v) > 30:
            raise ValueError("Username must be 3-30 characters")
        if not v.isalnum():
            raise ValueError("Username must be alphanumeric")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    username: str


class ScoreResponse(BaseModel):
    username: str
    high_score: int


class ScoreSubmit(BaseModel):
    score: int

    @field_validator("score")
    @classmethod
    def validate_score(cls, v):
        if v < 0 or v > 9999:
            raise ValueError("Invalid score")
        return v


# Utility functions
import hashlib
import base64


def _prehash(password: str) -> bytes:
    """SHA256 pre-hash to safely handle passwords of any length with bcrypt."""
    return base64.b64encode(hashlib.sha256(password.encode("utf-8")).digest())


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(_prehash(plain_password), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(_prehash(password), bcrypt.gensalt(rounds=12)).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    return username


# Authentication endpoints
@app.post("/api/register", response_model=Token)
async def register(user_data: UserRegister):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT username FROM users WHERE username = ?", (user_data.username,)
        )
        if await cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered",
            )
        hashed_password = get_password_hash(user_data.password)
        await db.execute(
            "INSERT INTO users (username, hashed_password) VALUES (?, ?)",
            (user_data.username, hashed_password),
        )
        await db.execute(
            "INSERT INTO high_scores (username, score) VALUES (?, 0)",
            (user_data.username,),
        )
        await db.commit()

    access_token_expires = timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    access_token = create_access_token(
        data={"sub": user_data.username}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user_data.username,
    }


@app.post("/api/login", response_model=Token)
async def login(user_data: UserLogin):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT hashed_password FROM users WHERE username = ?",
            (user_data.username,),
        )
        row = await cursor.fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    if not verify_password(user_data.password, row[0]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    access_token_expires = timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    access_token = create_access_token(
        data={"sub": user_data.username}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user_data.username,
    }


@app.get("/api/me")
async def get_current_user_info(username: str = Depends(get_current_user)):
    return {"username": username}


# Score endpoints
@app.get("/api/scores", response_model=ScoreResponse)
async def get_score(username: str = Depends(get_current_user)):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT score FROM high_scores WHERE username = ?", (username,)
        )
        row = await cursor.fetchone()
    score = row[0] if row else 0
    return {"username": username, "high_score": score}


@app.post("/api/scores", response_model=ScoreResponse)
async def submit_score(
    score_data: ScoreSubmit, username: str = Depends(get_current_user)
):
    async with get_db() as db:
        cursor = await db.execute(
            "SELECT score FROM high_scores WHERE username = ?", (username,)
        )
        row = await cursor.fetchone()
        current_high_score = row[0] if row else 0

        if score_data.score > current_high_score:
            await db.execute(
                "INSERT OR REPLACE INTO high_scores (username, score) VALUES (?, ?)",
                (username, score_data.score),
            )
            await db.commit()
            current_high_score = score_data.score

    return {"username": username, "high_score": current_high_score}
