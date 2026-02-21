import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
} from '@mui/material';
import { EmojiEvents } from '@mui/icons-material';

function Leaderboard({ open, highScore, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h5" align="center">
          Your High Score
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <EmojiEvents sx={{ fontSize: 64, color: 'gold', mb: 2 }} />
          <Paper
            elevation={2}
            sx={{
              p: 3,
              backgroundColor: 'primary.light',
              color: 'primary.contrastText',
            }}
          >
            <Typography variant="h3">{highScore}</Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>
              Best Score
            </Typography>
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
        <Button variant="contained" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default Leaderboard;
