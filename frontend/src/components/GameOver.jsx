import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { EmojiEvents, Refresh } from '@mui/icons-material';

function GameOver({ open, score, highScore, isNewHighScore, onRestart, onViewLeaderboard }) {
  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0 }}>
        <Typography
          variant="h4"
          align="center"
          sx={{ fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}
        >
          GAME OVER
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 3 }}>
          {isNewHighScore && (
            <Box sx={{ mb: 3, animation: 'float 2s ease-in-out infinite' }}>
              <EmojiEvents className="gold-glow" sx={{ fontSize: 56 }} />
              <Typography
                variant="h6"
                className="gold-glow"
                sx={{ fontWeight: 700, mt: 1 }}
              >
                New High Score!
              </Typography>
            </Box>
          )}
          <Typography
            className="neon-score"
            sx={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1 }}
          >
            {score}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.4)', mt: 1 }}
          >
            Best: {highScore}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 1 }}>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={onRestart}
          size="large"
          sx={{
            px: 4,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #00d4ff, #ff006e)',
            '&:hover': {
              background: 'linear-gradient(135deg, #00bfe6, #e6005f)',
            },
          }}
        >
          Play Again
        </Button>
        <Button
          variant="outlined"
          onClick={onViewLeaderboard}
          size="large"
          sx={{
            px: 4,
            borderColor: 'rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.7)',
            '&:hover': {
              borderColor: '#00d4ff',
              color: '#00d4ff',
            },
          }}
        >
          Leaderboard
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default GameOver;
