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
      <DialogTitle>
        <Typography variant="h4" align="center">
          Game Over!
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          {isNewHighScore && (
            <Box sx={{ mb: 2 }}>
              <EmojiEvents sx={{ fontSize: 48, color: 'gold' }} />
              <Typography variant="h6" color="primary">
                New High Score!
              </Typography>
            </Box>
          )}
          <Typography variant="h5" gutterBottom>
            Score: {score}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            High Score: {highScore}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Refresh />}
          onClick={onRestart}
          size="large"
        >
          Play Again
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={onViewLeaderboard}
          size="large"
        >
          Leaderboard
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default GameOver;
