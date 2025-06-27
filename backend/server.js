// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Path to store leaderboard data
const LEADERBOARD_FILE = path.join(__dirname, 'leaderboard.json');

// Initialize leaderboard file if it doesn't exist
if (!fs.existsSync(LEADERBOARD_FILE)) {
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify([]));
}

// Helper function to read leaderboard
const readLeaderboard = () => {
  try {
    const data = fs.readFileSync(LEADERBOARD_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading leaderboard:', error);
    return [];
  }
};

// Helper function to write leaderboard
const writeLeaderboard = (data) => {
  try {
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing leaderboard:', error);
    return false;
  }
};

// GET /api/leaderboard - Get top 20 scores
app.get('/api/leaderboard', (req, res) => {
  try {
    const scores = readLeaderboard();
    // Sort by score (descending) and take top 20
    const topScores = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
    
    res.json({ success: true, scores: topScores });
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to get leaderboard' });
  }
});

// POST /api/leaderboard - Add new score
app.post('/api/leaderboard', (req, res) => {
  try {
    const { score, username, character, date, time } = req.body;
    
    // Basic validation
    if (!score || !username || typeof score !== 'number' || score < 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid score or username' 
      });
    }

    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username must be between 2 and 20 characters' 
      });
    }

    const scores = readLeaderboard();
    
    // Create new score entry
    const newScore = {
      score: Math.floor(score), // Ensure integer
      username: username.trim(),
      character: character || 'cooper',
      date: date || new Date().toLocaleDateString(),
      time: time || new Date().toLocaleTimeString(),
      timestamp: Date.now(),
      id: Date.now() + Math.random() // Simple unique ID
    };

    // Add to scores array
    scores.push(newScore);
    
    // Keep only top 100 scores to prevent file from growing too large
    const sortedScores = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);
    
    // Save to file
    if (writeLeaderboard(sortedScores)) {
      console.log(`New score added: ${username} - ${score} points`);
      res.json({ success: true, message: 'Score saved successfully' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save score' });
    }
  } catch (error) {
    console.error('Error saving score:', error);
    res.status(500).json({ success: false, error: 'Failed to save score' });
  }
});

// GET /api/leaderboard/user/:username - Get user's personal best
app.get('/api/leaderboard/user/:username', (req, res) => {
  try {
    const { username } = req.params;
    const scores = readLeaderboard();
    
    // Find user's best score
    const userScores = scores
      .filter(entry => entry.username.toLowerCase() === username.toLowerCase())
      .sort((a, b) => b.score - a.score);
    
    const personalBest = userScores.length > 0 ? userScores[0] : null;
    
    res.json({ 
      success: true, 
      personalBest,
      totalGames: userScores.length 
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get user stats' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PUMP House Leaderboard Server running on port ${PORT}`);
  console.log(`📊 Leaderboard API available at http://localhost:${PORT}/api/leaderboard`);
});

module.exports = app;