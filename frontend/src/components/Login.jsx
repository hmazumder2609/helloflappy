import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (username.length < 3 || username.length > 30) {
        setError('Username must be 3-30 characters');
        return;
      }
      if (!/^[a-zA-Z0-9]+$/.test(username)) {
        setError('Username must be alphanumeric');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    setLoading(true);

    const isRegister = mode === 'register';
    const result = await login(username, password, isRegister);

    if (result.success) {
      navigate('/game');
    } else {
      setError(result.error || 'Authentication failed');
    }
    setLoading(false);
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Box
          className="glass-card glow-border"
          sx={{ p: 5, width: '100%' }}
        >
          <Typography
            variant="h3"
            component="h1"
            align="center"
            sx={{
              fontWeight: 800,
              mb: 1,
              background: 'linear-gradient(135deg, #00d4ff, #ff006e)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            FlappyDash
          </Typography>
          <Typography
            variant="body2"
            align="center"
            sx={{ color: 'rgba(255,255,255,0.5)', mb: 4 }}
          >
            {mode === 'login' ? 'Sign in to play' : 'Create your account'}
          </Typography>

          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(e, newMode) => newMode && setMode(newMode)}
              aria-label="login or register"
              sx={{
                '& .MuiToggleButton-root': {
                  color: 'rgba(255,255,255,0.5)',
                  borderColor: 'rgba(255,255,255,0.12)',
                  px: 4,
                  fontWeight: 600,
                  '&.Mui-selected': {
                    color: '#00d4ff',
                    backgroundColor: 'rgba(0, 212, 255, 0.1)',
                    borderColor: 'rgba(0, 212, 255, 0.3)',
                  },
                },
              }}
            >
              <ToggleButton value="login">Login</ToggleButton>
              <ToggleButton value="register">Register</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Username"
              variant="outlined"
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(0, 212, 255, 0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#00d4ff' },
                },
              }}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                  '&:hover fieldset': { borderColor: 'rgba(0, 212, 255, 0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#00d4ff' },
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 4,
                mb: 1,
                py: 1.5,
                fontWeight: 700,
                fontSize: '1rem',
                background: 'linear-gradient(135deg, #00d4ff, #ff006e)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #00bfe6, #e6005f)',
                },
                '&.Mui-disabled': {
                  background: 'rgba(255,255,255,0.1)',
                },
              }}
              disabled={loading}
            >
              {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Sign Up'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

export default Login;
