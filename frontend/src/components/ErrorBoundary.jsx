import { Component } from 'react';
import { Box, Typography, Button } from '@mui/material';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Application error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%)',
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontFamily: "'Orbitron', monospace",
              fontWeight: 700,
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            Something went wrong
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            sx={{
              px: 5,
              py: 1.5,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #00d4ff, #ff006e)',
              '&:hover': {
                background: 'linear-gradient(135deg, #00bfe6, #e6005f)',
              },
            }}
          >
            Refresh Page
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
