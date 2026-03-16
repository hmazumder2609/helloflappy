import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import { EmojiEvents } from '@mui/icons-material';

function Leaderboard({ open, highScore, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 0 }}>
        <Typography
          variant="h5"
          align="center"
          sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}
        >
          Your Best
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <EmojiEvents
            className="gold-glow"
            sx={{ fontSize: 72, mb: 2, animation: 'float 3s ease-in-out infinite' }}
          />
          <Box
            className="glass-card"
            sx={{
              p: 4,
              mx: 'auto',
              maxWidth: 240,
              border: '1px solid rgba(0, 212, 255, 0.2)',
            }}
          >
            <Typography
              className="neon-score"
              sx={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1 }}
            >
              {highScore}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: 'rgba(255,255,255,0.4)', mt: 1 }}
            >
              High Score
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            px: 5,
            borderColor: 'rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.7)',
            '&:hover': {
              borderColor: '#00d4ff',
              color: '#00d4ff',
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default Leaderboard;
