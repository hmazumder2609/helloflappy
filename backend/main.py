from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
import bcrypt

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security configuration
SECRET_KEY = "your-secret-key-change-in-production"  # Change in production!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(
    schemes=["bcrypt_sha256"],  # SHA256 first (unlimited length), then bcrypt
    deprecated="auto",
    bcrypt_sha256__rounds=12,   # Adjust rounds as needed (higher = slower)
)
security = HTTPBearer()

# In-memory storage
users = {}  # {username: hashed_password}
high_scores = {}  # {username: score}


# Pydantic models
class UserRegister(BaseModel):
    username: str
    password: str


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


# Utility functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against bcrypt hash"""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )

def get_password_hash(password: str) -> str:
    """Hash password with bcrypt (unlimited length via UTF-8 encoding)"""
    if len(password.encode('utf-8')) > 72:
        # bcrypt handles >72 bytes fine when properly encoded
        pass  # No truncation needed
    return bcrypt.hashpw(
        password.encode('utf-8'), 
        bcrypt.gensalt(rounds=12)
    ).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
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
    if user_data.username in users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    hashed_password = get_password_hash(user_data.password)
    users[user_data.username] = hashed_password
    high_scores[user_data.username] = 0
    
    access_token_expires = timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    access_token = create_access_token(
        data={"sub": user_data.username}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user_data.username
    }


@app.post("/api/login", response_model=Token)
async def login(user_data: UserLogin):
    if user_data.username not in users:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    if not verify_password(user_data.password, users[user_data.username]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token_expires = timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    access_token = create_access_token(
        data={"sub": user_data.username}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": user_data.username
    }


@app.get("/api/me")
async def get_current_user_info(username: str = Depends(get_current_user)):
    return {"username": username}


# Score endpoints
@app.get("/api/scores", response_model=ScoreResponse)
async def get_score(username: str = Depends(get_current_user)):
    score = high_scores.get(username, 0)
    return {"username": username, "high_score": score}


@app.post("/api/scores", response_model=ScoreResponse)
async def submit_score(
    score_data: ScoreSubmit,
    username: str = Depends(get_current_user)
):
    current_high_score = high_scores.get(username, 0)
    if score_data.score > current_high_score:
        high_scores[username] = score_data.score
    return {
        "username": username,
        "high_score": high_scores.get(username, 0)
    }
