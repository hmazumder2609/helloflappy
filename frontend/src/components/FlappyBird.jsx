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

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const BIRD_SIZE = 40;
const PIPE_WIDTH = 60;
const PIPE_GAP = 150;
const GRAVITY = 0.5;
const JUMP_VELOCITY = -8;
const PIPE_SPEED = 2;
const PIPE_SPACING = 250;
const BIRD_X = GAME_WIDTH / 2 - BIRD_SIZE / 2;

function createPipe(x) {
  const minHeight = 50;
  const maxHeight = GAME_HEIGHT - PIPE_GAP - minHeight;
  const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
  return {
    x,
    topHeight,
    bottomHeight: GAME_HEIGHT - topHeight - PIPE_GAP,
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

function checkCollision(birdY, pipes) {
  if (birdY <= 0 || birdY + BIRD_SIZE >= GAME_HEIGHT) {
    return true;
  }

  for (const pipe of pipes) {
    const birdLeft = BIRD_X;
    const birdRight = BIRD_X + BIRD_SIZE;
    const birdTop = birdY;
    const birdBottom = birdY + BIRD_SIZE;

    const pipeLeft = pipe.x;
    const pipeRight = pipe.x + PIPE_WIDTH;
    const pipeTopBottom = pipe.topHeight;
    const pipeBottomTop = GAME_HEIGHT - pipe.bottomHeight;

    if (
      birdRight > pipeLeft &&
      birdLeft < pipeRight &&
      (birdTop < pipeTopBottom || birdBottom > pipeBottomTop)
    ) {
      return true;
    }
  }

  return false;
}

function FlappyBird() {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Game-loop state lives in refs to avoid effect re-creation
  const birdYRef = useRef(GAME_HEIGHT / 2);
  const birdVelocityRef = useRef(0);
  const pipesRef = useRef(createInitialPipes());
  const scoreRef = useRef(0);
  const gameOverRef = useRef(false);
  const isPausedRef = useRef(false);
  const highScoreRef = useRef(0);

  // React state only for UI rendering
  const [displayScore, setDisplayScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  // Load high score
  useEffect(() => {
    const controller = new AbortController();
    const loadHighScore = async () => {
      try {
        const response = await api.get('/scores', { signal: controller.signal });
        const hs = response.data.high_score;
        highScoreRef.current = hs;
        setHighScore(hs);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to load high score:', error);
        }
      }
    };
    if (user) {
      loadHighScore();
    }
    return () => controller.abort();
  }, [user]);

  const handleGameOver = useCallback(async () => {
    gameOverRef.current = true;
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

  const jump = useCallback(() => {
    if (gameOverRef.current) return;
    if (isPausedRef.current) {
      isPausedRef.current = false;
      return;
    }
    birdVelocityRef.current = JUMP_VELOCITY;
  }, []);

  const resetGame = useCallback(() => {
    birdYRef.current = GAME_HEIGHT / 2;
    birdVelocityRef.current = 0;
    pipesRef.current = createInitialPipes();
    scoreRef.current = 0;
    gameOverRef.current = false;
    isPausedRef.current = false;
    setDisplayScore(0);
    setShowGameOver(false);
    setIsNewHighScore(false);
  }, []);

  // Single persistent game loop — runs once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      if (gameOverRef.current || isPausedRef.current) {
        draw(ctx);
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // Update bird physics
      birdVelocityRef.current += GRAVITY;
      birdYRef.current = Math.max(
        0,
        Math.min(GAME_HEIGHT - BIRD_SIZE, birdYRef.current + birdVelocityRef.current)
      );

      // Update pipes
      const pipes = pipesRef.current;
      for (const pipe of pipes) {
        pipe.x -= PIPE_SPEED;
      }

      // Remove off-screen pipes
      while (pipes.length > 0 && pipes[0].x + PIPE_WIDTH <= 0) {
        pipes.shift();
      }

      // Add new pipes
      const lastPipe = pipes[pipes.length - 1];
      if (lastPipe && lastPipe.x < GAME_WIDTH - PIPE_SPACING) {
        pipes.push(createPipe(GAME_WIDTH));
      }

      // Check scoring
      let scoreChanged = false;
      for (const pipe of pipes) {
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.passed = true;
          scoreRef.current += 1;
          scoreChanged = true;
        }
      }
      if (scoreChanged) {
        setDisplayScore(scoreRef.current);
      }

      // Check collision — reads current ref values, no stale state
      if (checkCollision(birdYRef.current, pipes)) {
        handleGameOver();
        draw(ctx);
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      draw(ctx);
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    function draw(ctx) {
      ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Background
      ctx.fillStyle = '#87CEEB';
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Ground
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(0, GAME_HEIGHT - 20, GAME_WIDTH, 20);
      ctx.fillStyle = '#90EE90';
      ctx.fillRect(0, GAME_HEIGHT - 20, GAME_WIDTH, 5);

      // Pipes
      const pipes = pipesRef.current;
      ctx.fillStyle = '#228B22';
      for (const pipe of pipes) {
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        ctx.fillRect(pipe.x, GAME_HEIGHT - pipe.bottomHeight, PIPE_WIDTH, pipe.bottomHeight);
        ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, PIPE_WIDTH + 10, 20);
        ctx.fillRect(pipe.x - 5, GAME_HEIGHT - pipe.bottomHeight, PIPE_WIDTH + 10, 20);
      }

      // Bird
      const birdY = birdYRef.current;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(GAME_WIDTH / 2, birdY + BIRD_SIZE / 2, BIRD_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      // Bird eye
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(GAME_WIDTH / 2 + 8, birdY + BIRD_SIZE / 2 - 5, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [handleGameOver]);

  // Keyboard controls
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

  // Touch support
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
        sx={{
          p: 3,
          maxWidth: '100%',
        }}
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

        {/* Game canvas */}
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

        {/* Instructions */}
        {!gameOverRef.current && (
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
        )}

        {/* Game Over Dialog */}
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

        {/* Leaderboard Dialog */}
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
