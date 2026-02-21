import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
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

function FlappyBird() {
  const canvasRef = useRef(null);
  const gameLoopRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [birdY, setBirdY] = useState(GAME_HEIGHT / 2);
  const [birdVelocity, setBirdVelocity] = useState(0);
  const [pipes, setPipes] = useState([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  // Initialize pipes
  useEffect(() => {
    const initialPipes = [];
    for (let i = 0; i < 3; i++) {
      initialPipes.push(createPipe(GAME_WIDTH + i * PIPE_SPACING));
    }
    setPipes(initialPipes);
  }, []);

  // Load high score
  useEffect(() => {
    const loadHighScore = async () => {
      try {
        const response = await api.get('/scores');
        setHighScore(response.data.high_score);
      } catch (error) {
        console.error('Failed to load high score:', error);
      }
    };
    if (user) {
      loadHighScore();
    }
  }, [user]);

  const createPipe = (x) => {
    const minHeight = 50;
    const maxHeight = GAME_HEIGHT - PIPE_GAP - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    return {
      x,
      topHeight,
      bottomHeight: GAME_HEIGHT - topHeight - PIPE_GAP,
      passed: false,
    };
  };

  const jump = useCallback(() => {
    if (gameOver) return;
    if (isPaused) {
      setIsPaused(false);
      return;
    }
    setBirdVelocity(JUMP_VELOCITY);
  }, [gameOver, isPaused]);

  const checkCollision = (birdX, birdY, birdSize) => {
    // Ground and ceiling collision
    if (birdY <= 0 || birdY + birdSize >= GAME_HEIGHT) {
      return true;
    }

    // Pipe collision
    for (const pipe of pipes) {
      const birdLeft = birdX;
      const birdRight = birdX + birdSize;
      const birdTop = birdY;
      const birdBottom = birdY + birdSize;

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
  };

  const resetGame = useCallback(async () => {
    setBirdY(GAME_HEIGHT / 2);
    setBirdVelocity(0);
    setScore(0);
    setGameOver(false);
    setShowGameOver(false);
    setIsNewHighScore(false);
    setIsPaused(false);

    const initialPipes = [];
    for (let i = 0; i < 3; i++) {
      initialPipes.push(createPipe(GAME_WIDTH + i * PIPE_SPACING));
    }
    setPipes(initialPipes);
  }, []);

  const handleGameOver = useCallback(async () => {
    setGameOver(true);
    setShowGameOver(true);

    // Submit score
    try {
      const response = await api.post('/scores', { score });
      const newHighScore = response.data.high_score;
      if (newHighScore > highScore) {
        setIsNewHighScore(true);
        setHighScore(newHighScore);
      }
    } catch (error) {
      console.error('Failed to submit score:', error);
    }
  }, [score, highScore]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const gameLoop = () => {
      if (gameOver || isPaused) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      // Update bird
      setBirdY((prevY) => {
        const newY = Math.max(0, Math.min(GAME_HEIGHT - BIRD_SIZE, prevY + birdVelocity));
        return newY;
      });
      setBirdVelocity((prevVel) => prevVel + GRAVITY);

      // Update pipes
      setPipes((prevPipes) => {
        const updatedPipes = prevPipes.map((pipe) => ({
          ...pipe,
          x: pipe.x - PIPE_SPEED,
        }));

        // Remove off-screen pipes and add new ones
        const visiblePipes = updatedPipes.filter((pipe) => pipe.x + PIPE_WIDTH > 0);
        const lastPipe = visiblePipes[visiblePipes.length - 1];

        if (lastPipe && lastPipe.x < GAME_WIDTH - PIPE_SPACING) {
          visiblePipes.push(createPipe(GAME_WIDTH));
        }

        // Check score
        visiblePipes.forEach((pipe) => {
          if (!pipe.passed && pipe.x + PIPE_WIDTH < GAME_WIDTH / 2 - BIRD_SIZE / 2) {
            pipe.passed = true;
            setScore((prev) => prev + 1);
          }
        });

        return visiblePipes;
      });

      // Check collision
      if (checkCollision(GAME_WIDTH / 2 - BIRD_SIZE / 2, birdY, BIRD_SIZE)) {
        handleGameOver();
      }

      // Draw
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
      ctx.fillStyle = '#228B22';
      pipes.forEach((pipe) => {
        // Top pipe
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
        // Bottom pipe
        ctx.fillRect(
          pipe.x,
          GAME_HEIGHT - pipe.bottomHeight,
          PIPE_WIDTH,
          pipe.bottomHeight
        );
        // Pipe caps
        ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, PIPE_WIDTH + 10, 20);
        ctx.fillRect(
          pipe.x - 5,
          GAME_HEIGHT - pipe.bottomHeight,
          PIPE_WIDTH + 10,
          20
        );
      });

      // Bird
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(
        GAME_WIDTH / 2,
        birdY + BIRD_SIZE / 2,
        BIRD_SIZE / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
      // Bird eye
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(
        GAME_WIDTH / 2 + 8,
        birdY + BIRD_SIZE / 2 - 5,
        4,
        0,
        Math.PI * 2
      );
      ctx.fill();

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [birdY, birdVelocity, pipes, gameOver, isPaused, handleGameOver]);

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
        backgroundColor: '#f5f5f5',
        p: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 3,
          position: 'relative',
          backgroundColor: 'white',
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
          <Typography variant="h6">Welcome, {user?.username}!</Typography>
          <Box>
            <IconButton
              color="primary"
              onClick={() => setShowLeaderboard(true)}
              sx={{ mr: 1 }}
            >
              <EmojiEvents />
            </IconButton>
            <IconButton color="error" onClick={handleLogout}>
              <Logout />
            </IconButton>
          </Box>
        </Box>

        {/* Score display */}
        <Box
          sx={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            p: 1,
            borderRadius: 1,
          }}
        >
          <Typography variant="h6">Score: {score}</Typography>
          <Typography variant="body2" color="text.secondary">
            High: {highScore}
          </Typography>
        </Box>

        {/* Game canvas */}
        <Box
          sx={{
            border: '2px solid #2196F3',
            borderRadius: 1,
            overflow: 'hidden',
            cursor: 'pointer',
          }}
          onClick={jump}
        >
          <canvas
            ref={canvasRef}
            width={GAME_WIDTH}
            height={GAME_HEIGHT}
            style={{ display: 'block' }}
          />
        </Box>

        {/* Instructions */}
        {!gameOver && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Click or press SPACE to jump
            </Typography>
          </Box>
        )}

        {/* Game Over Dialog */}
        <GameOver
          open={showGameOver}
          score={score}
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
      </Paper>
    </Box>
  );
}

export default FlappyBird;
