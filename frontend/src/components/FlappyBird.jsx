import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import { Logout, EmojiEvents } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import GameOver from './GameOver';
import Leaderboard from './Leaderboard';

// --- Game constants ---
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const BIRD_SIZE = 40;
const PIPE_WIDTH = 60;
const PIPE_GAP = 155;
const GRAVITY = 0.55;
const JUMP_VELOCITY = -8.5;
const PIPE_SPEED = 3.0;
const PIPE_SPACING = 300;
const MAX_FALL_SPEED = 10;
const GROUND_HEIGHT = 20;
const BIRD_X = GAME_WIDTH / 2 - BIRD_SIZE / 2;
const BIRD_RADIUS = BIRD_SIZE / 2 - 3;

// --- Pure helpers ---

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function createPipe(x) {
  const minHeight = 60;
  const maxHeight = GAME_HEIGHT - PIPE_GAP - GROUND_HEIGHT - minHeight;
  const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
  return {
    x,
    topHeight,
    bottomHeight: GAME_HEIGHT - GROUND_HEIGHT - topHeight - PIPE_GAP,
    passed: false,
  };
}

function createInitialPipes() {
  const pipes = [];
  for (let i = 0; i < 3; i++) {
    pipes.push(createPipe(GAME_WIDTH + i * PIPE_SPACING));
  }
  return pipes;
}

function circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) < (radius * radius);
}

function checkCollision(birdY, pipes) {
  const cx = BIRD_X + BIRD_SIZE / 2;
  const cy = birdY + BIRD_SIZE / 2;

  if (birdY <= 0 || birdY + BIRD_SIZE >= GAME_HEIGHT - GROUND_HEIGHT) {
    return true;
  }

  for (const pipe of pipes) {
    if (circleRectCollision(cx, cy, BIRD_RADIUS, pipe.x, 0, PIPE_WIDTH, pipe.topHeight)) {
      return true;
    }
    const bottomY = GAME_HEIGHT - GROUND_HEIGHT - pipe.bottomHeight;
    if (circleRectCollision(cx, cy, BIRD_RADIUS, pipe.x, bottomY, PIPE_WIDTH, pipe.bottomHeight)) {
      return true;
    }
  }

  return false;
}

// --- Component ---

function FlappyBird() {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const birdYRef = useRef(GAME_HEIGHT / 2);
  const birdVelocityRef = useRef(0);
  const pipesRef = useRef(createInitialPipes());
  const scoreRef = useRef(0);
  const highScoreRef = useRef(0);

  // 'waiting' | 'countdown' | 'playing' | 'gameover'
  const gameStateRef = useRef('waiting');
  const countdownValueRef = useRef(3);
  const countdownTimerRef = useRef(null);

  const lastTimeRef = useRef(null);
  const groundOffsetRef = useRef(0);
  const scorePopupsRef = useRef([]);
  const deathFlashRef = useRef(0);

  const [displayScore, setDisplayScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    if (user) {
      api.get('/scores', { signal: controller.signal })
        .then((response) => {
          const hs = response.data.high_score;
          highScoreRef.current = hs;
          setHighScore(hs);
        })
        .catch((error) => {
          if (!controller.signal.aborted) {
            console.error('Failed to load high score:', error);
          }
        });
    }
    return () => controller.abort();
  }, [user]);

  const handleGameOver = useCallback(async () => {
    gameStateRef.current = 'gameover';
    setShowGameOver(true);

    const currentScore = scoreRef.current;
    try {
      const response = await api.post('/scores', { score: currentScore });
      const newHighScore = response.data.high_score;
      if (newHighScore > highScoreRef.current) {
        setIsNewHighScore(true);
        highScoreRef.current = newHighScore;
        setHighScore(newHighScore);
      }
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  }, []);

  const startCountdown = useCallback(() => {
    gameStateRef.current = 'countdown';
    countdownValueRef.current = 3;
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    countdownTimerRef.current = setInterval(() => {
      countdownValueRef.current -= 1;
      if (countdownValueRef.current <= 0) {
        countdownValueRef.current = 0;
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
        gameStateRef.current = 'playing';
        lastTimeRef.current = null;
      }
    }, 700);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  const jump = useCallback(() => {
    const state = gameStateRef.current;
    if (state === 'gameover') return;
    if (state === 'waiting') {
      startCountdown();
      return;
    }
    if (state === 'countdown') return;
    birdVelocityRef.current = JUMP_VELOCITY;
  }, [startCountdown]);

  const resetGame = useCallback(() => {
    birdYRef.current = GAME_HEIGHT / 2;
    birdVelocityRef.current = 0;
    pipesRef.current = createInitialPipes();
    scoreRef.current = 0;
    deathFlashRef.current = 0;
    scorePopupsRef.current = [];
    lastTimeRef.current = null;
    setDisplayScore(0);
    setShowGameOver(false);
    setIsNewHighScore(false);
    startCountdown();
  }, [startCountdown]);

  // ===== GAME LOOP =====
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ----- Drawing helpers -----

    function drawDeathFlash() {
      if (deathFlashRef.current <= 0) return;
      const alpha = (deathFlashRef.current / 10) * 0.4;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    function drawCountdown(count) {
      ctx.fillStyle = 'rgba(10, 10, 26, 0.6)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      ctx.save();
      ctx.font = 'bold 120px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 40;
      ctx.fillStyle = '#00d4ff';
      ctx.fillText(count, GAME_WIDTH / 2, GAME_HEIGHT / 2);
      ctx.shadowBlur = 80;
      ctx.fillText(count, GAME_WIDTH / 2, GAME_HEIGHT / 2);
      ctx.restore();

      ctx.save();
      ctx.font = 'bold 28px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ff006e';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ff006e';
      ctx.fillText('GET READY', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100);
      ctx.restore();
    }

    function drawWaiting(timestamp) {
      ctx.fillStyle = 'rgba(10, 10, 26, 0.5)';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      const pulse = 0.6 + Math.sin(timestamp / 400) * 0.4;
      ctx.save();
      ctx.font = 'bold 36px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 20 * pulse;
      ctx.fillStyle = `rgba(0, 212, 255, ${pulse})`;
      ctx.fillText('TAP TO START', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60);
      ctx.restore();

      ctx.save();
      ctx.font = '18px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText('Click, tap, or press SPACE', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 110);
      ctx.restore();
    }

    function drawBird(timestamp) {
      const birdY = birdYRef.current;
      const velocity = birdVelocityRef.current;
      const cx = BIRD_X + BIRD_SIZE / 2;
      const cy = birdY + BIRD_SIZE / 2;

      let bobOffset = 0;
      const state = gameStateRef.current;
      if (state === 'waiting' || state === 'countdown') {
        bobOffset = Math.sin(timestamp / 300) * 8;
      }

      const angleDeg = (state === 'playing' || state === 'gameover')
        ? clamp(velocity * 4, -30, 70)
        : 0;
      const angleRad = (angleDeg * Math.PI) / 180;

      ctx.save();
      ctx.translate(cx, cy + bobOffset);
      ctx.rotate(angleRad);

      // Body
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      // Wing
      ctx.fillStyle = '#FFA500';
      ctx.beginPath();
      const wingFlap = Math.sin(timestamp / 80) * 4;
      ctx.ellipse(-4, 4 + wingFlap, 12, 6, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Eye white
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(10, -6, 7, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(12, -6, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = '#FF6347';
      ctx.beginPath();
      ctx.moveTo(16, -2);
      ctx.lineTo(26, 2);
      ctx.lineTo(16, 6);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    function drawPipe(pipe) {
      const grad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
      grad.addColorStop(0, '#32CD32');
      grad.addColorStop(0.5, '#228B22');
      grad.addColorStop(1, '#1a6b1a');

      const capGrad = ctx.createLinearGradient(pipe.x - 5, 0, pipe.x + PIPE_WIDTH + 5, 0);
      capGrad.addColorStop(0, '#3adf3a');
      capGrad.addColorStop(0.5, '#2da82d');
      capGrad.addColorStop(1, '#1a7a1a');

      // Top pipe
      ctx.fillStyle = grad;
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      ctx.fillStyle = capGrad;
      ctx.fillRect(pipe.x - 5, pipe.topHeight - 24, PIPE_WIDTH + 10, 24);

      // Bottom pipe
      const bottomY = GAME_HEIGHT - GROUND_HEIGHT - pipe.bottomHeight;
      ctx.fillStyle = grad;
      ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, pipe.bottomHeight);
      ctx.fillStyle = capGrad;
      ctx.fillRect(pipe.x - 5, bottomY, PIPE_WIDTH + 10, 24);

      // Outlines
      ctx.strokeStyle = '#145214';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      ctx.strokeRect(pipe.x - 5, pipe.topHeight - 24, PIPE_WIDTH + 10, 24);
      ctx.strokeRect(pipe.x, bottomY, PIPE_WIDTH, pipe.bottomHeight);
      ctx.strokeRect(pipe.x - 5, bottomY, PIPE_WIDTH + 10, 24);
    }

    function drawGround() {
      const offset = groundOffsetRef.current;
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, GROUND_HEIGHT);
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(0, GAME_HEIGHT - GROUND_HEIGHT, GAME_WIDTH, 5);
      ctx.fillStyle = '#7a3b10';
      for (let x = -offset; x < GAME_WIDTH; x += 24) {
        ctx.fillRect(x, GAME_HEIGHT - GROUND_HEIGHT + 8, 12, 4);
      }
    }

    function drawScorePopups() {
      for (const popup of scorePopupsRef.current) {
        const alpha = clamp(1 - popup.age / 30, 0, 1);
        const y = popup.y - popup.age * 1.5;
        ctx.save();
        ctx.font = 'bold 28px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.shadowColor = `rgba(0, 212, 255, ${alpha})`;
        ctx.shadowBlur = 10;
        ctx.fillText('+1', popup.x, y);
        ctx.restore();
      }
    }

    function drawCanvasScore() {
      const score = scoreRef.current;
      ctx.save();
      ctx.font = 'bold 64px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = 4;
      ctx.strokeText(score, GAME_WIDTH / 2, 30);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 6;
      ctx.fillText(score, GAME_WIDTH / 2, 30);
      ctx.restore();
    }

    function drawScene(timestamp) {
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT - GROUND_HEIGHT);
      skyGrad.addColorStop(0, '#4FC3F7');
      skyGrad.addColorStop(1, '#87CEEB');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT - GROUND_HEIGHT);

      // Pipes
      for (const pipe of pipesRef.current) {
        drawPipe(pipe);
      }

      // Ground
      drawGround();

      // Bird
      drawBird(timestamp);

      // Score popups
      drawScorePopups();

      // On-canvas score
      const state = gameStateRef.current;
      if (state === 'playing' || state === 'gameover') {
        drawCanvasScore();
      }
    }

    // ----- Main loop -----

    function gameLoop(timestamp) {
      const state = gameStateRef.current;

      // Non-playing states
      if (state !== 'playing') {
        drawScene(timestamp);
        if (state === 'countdown') {
          drawCountdown(countdownValueRef.current);
        } else if (state === 'waiting') {
          drawWaiting(timestamp);
        }
        if (deathFlashRef.current > 0) {
          deathFlashRef.current -= 1;
          drawDeathFlash();
        }
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // DeltaTime
      let dt = 1;
      if (lastTimeRef.current !== null) {
        dt = clamp((timestamp - lastTimeRef.current) / 16.667, 0.5, 2.0);
      }
      lastTimeRef.current = timestamp;

      // Progressive difficulty
      const speedMultiplier = 1 + Math.min(Math.floor(scoreRef.current / 5) * 0.08, 0.6);

      // Bird physics
      birdVelocityRef.current += GRAVITY * dt;
      if (birdVelocityRef.current > MAX_FALL_SPEED) {
        birdVelocityRef.current = MAX_FALL_SPEED;
      }
      birdYRef.current = clamp(
        birdYRef.current + birdVelocityRef.current * dt,
        0,
        GAME_HEIGHT - GROUND_HEIGHT - BIRD_SIZE
      );

      // Pipes
      const currentSpeed = PIPE_SPEED * speedMultiplier * dt;
      const pipes = pipesRef.current;
      for (const pipe of pipes) {
        pipe.x -= currentSpeed;
      }

      // Scrolling ground
      groundOffsetRef.current = (groundOffsetRef.current + currentSpeed) % 24;

      // Remove off-screen pipes
      while (pipes.length > 0 && pipes[0].x + PIPE_WIDTH <= 0) {
        pipes.shift();
      }

      // Add new pipes
      const lastPipe = pipes[pipes.length - 1];
      if (lastPipe && lastPipe.x < GAME_WIDTH - PIPE_SPACING) {
        pipes.push(createPipe(GAME_WIDTH));
      }

      // Scoring
      let scoreChanged = false;
      for (const pipe of pipes) {
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.passed = true;
          scoreRef.current += 1;
          scoreChanged = true;
          scorePopupsRef.current.push({
            x: BIRD_X + BIRD_SIZE,
            y: birdYRef.current,
            age: 0,
          });
        }
      }
      if (scoreChanged) {
        setDisplayScore(scoreRef.current);
      }

      // Update popups
      const popups = scorePopupsRef.current;
      for (let i = popups.length - 1; i >= 0; i--) {
        popups[i].age += dt;
        if (popups[i].age > 30) {
          popups.splice(i, 1);
        }
      }

      // Collision
      if (checkCollision(birdYRef.current, pipes)) {
        deathFlashRef.current = 10;
        handleGameOver();
        drawScene(timestamp);
        drawDeathFlash();
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      drawScene(timestamp);
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [handleGameOver]);

  // Keyboard
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [jump]);

  // Touch
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleTouch = (e) => {
      e.preventDefault();
      jump();
    };
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    return () => canvas.removeEventListener('touchstart', handleTouch);
  }, [jump]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Box
        className="glass-card glow-border"
        sx={{ p: 3, maxWidth: '100%' }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(135deg, #00d4ff, #ff006e)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              FlappyDash
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              {user?.username}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography
                className="neon-score"
                sx={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1 }}
              >
                {displayScore}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                Best: {highScore}
              </Typography>
            </Box>
            <IconButton
              onClick={() => setShowLeaderboard(true)}
              sx={{ color: '#ffd700' }}
            >
              <EmojiEvents />
            </IconButton>
            <IconButton
              onClick={handleLogout}
              sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#ff006e' } }}
            >
              <Logout />
            </IconButton>
          </Box>
        </Box>

        {/* Canvas */}
        <Box
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            cursor: 'pointer',
            maxWidth: '100%',
            width: GAME_WIDTH,
            aspectRatio: `${GAME_WIDTH}/${GAME_HEIGHT}`,
            boxShadow: '0 0 30px rgba(0, 212, 255, 0.15), 0 0 80px rgba(0, 212, 255, 0.05)',
            border: '1px solid rgba(0, 212, 255, 0.15)',
          }}
          onClick={jump}
        >
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            style={{ display: 'block', width: '100%', height: '100%' }}
          />
        </Box>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.35)',
              animation: 'glow-pulse 2s ease-in-out infinite',
            }}
          >
            Click, tap, or press SPACE to jump
          </Typography>
        </Box>

        <GameOver
          open={showGameOver}
          score={displayScore}
          highScore={highScore}
          isNewHighScore={isNewHighScore}
          onRestart={resetGame}
          onViewLeaderboard={() => {
            setShowGameOver(false);
            setShowLeaderboard(true);
          }}
        />

        <Leaderboard
          open={showLeaderboard}
          highScore={highScore}
          onClose={() => setShowLeaderboard(false)}
        />
      </Box>
    </Box>
  );
}

export default FlappyBird;
