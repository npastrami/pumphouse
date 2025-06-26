import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

const App = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const keysRef = useRef({ left: false, right: false });
  
  // Game constants
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const GRAVITY = 0.07;
  const JUMP_FORCE = -18;
  const PLAYER_SPEED = 3;
  const PLATFORM_WIDTH = 100;
  const PLATFORM_HEIGHT = 20;
  const PLATFORM_SPACING = 150;

  // Game state
  const [gameState, setGameState] = useState({
    player: {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 100,
      width: 40,
      height: 40,
      velocityX: 0,
      velocityY: 0,
      onGround: false
    },
    platforms: [],
    camera: { y: 0 },
    score: 0,
    gameStarted: false,
    gameOver: false,
    highestPlatform: 0
  });

  // User and leaderboard states
  const [username, setUsername] = useState('');
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  const [showUsernameInput, setShowUsernameInput] = useState(false);
  const [tempUsername, setTempUsername] = useState('');
  const [localLeaderboard, setLocalLeaderboard] = useState([]);
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [showGlobalLeaderboard, setShowGlobalLeaderboard] = useState(false);
  const [userPersonalBest, setUserPersonalBest] = useState(null);

  // Player image reference
  const [playerImage, setPlayerImage] = useState(null);

  // Load player image
  useEffect(() => {
    const img = new Image();
    img.onload = () => setPlayerImage(img);
    img.src = '/cooper.png'; // Place your cooper.png in the public/ folder
  }, []);

  // Initialize platforms
  const generatePlatforms = useCallback(() => {
    const platforms = [];
    // Starting platform
    platforms.push({
      x: CANVAS_WIDTH / 2 - PLATFORM_WIDTH / 2,
      y: CANVAS_HEIGHT - 50,
      width: PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT
    });

    // Generate initial platforms going upward
    for (let i = 1; i < 100; i++) {
      platforms.push({
        x: Math.random() * (CANVAS_WIDTH - PLATFORM_WIDTH),
        y: CANVAS_HEIGHT - 50 - (i * PLATFORM_SPACING),
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT
      });
    }
    return platforms;
  }, []);

  // Generate more platforms as player goes higher
  const generateMorePlatforms = useCallback((currentHighest) => {
    const newPlatforms = [];
    const startY = currentHighest - PLATFORM_SPACING;
    
    // Generate 20 more platforms above the current highest
    for (let i = 1; i <= 20; i++) {
      newPlatforms.push({
        x: Math.random() * (CANVAS_WIDTH - PLATFORM_WIDTH),
        y: startY - (i * PLATFORM_SPACING),
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT
      });
    }
    return newPlatforms;
  }, []);

  // Load saved username and leaderboards
  useEffect(() => {
    // Load saved username
    const savedUsername = localStorage.getItem('frogHouseUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setIsUsernameSet(true);
    }

    // Load local leaderboard
    const savedLeaderboard = localStorage.getItem('frogHouseLeaderboard');
    if (savedLeaderboard) {
      setLocalLeaderboard(JSON.parse(savedLeaderboard));
    }

    // Load global leaderboard
    const savedGlobalLeaderboard = localStorage.getItem('frogHouseGlobalLeaderboard');
    if (savedGlobalLeaderboard) {
      const userScores = JSON.parse(savedGlobalLeaderboard);
      setGlobalLeaderboard(userScores.sort((a, b) => b.score - a.score).slice(0, 20));
    }
  }, []);

  // Calculate user's personal best
  useEffect(() => {
    if (isUsernameSet && username) {
      const savedGlobalLeaderboard = localStorage.getItem('frogHouseGlobalLeaderboard');
      if (savedGlobalLeaderboard) {
        const userScores = JSON.parse(savedGlobalLeaderboard);
        const userBestScore = userScores
          .filter(entry => entry.username === username)
          .sort((a, b) => b.score - a.score)[0];
        
        if (userBestScore) {
          setUserPersonalBest(userBestScore.score);
        }
      }
    } else {
      setUserPersonalBest(null);
    }
  }, [isUsernameSet, username, globalLeaderboard]);

  // Handle username submission
  const handleUsernameSubmit = () => {
    if (tempUsername.trim().length >= 2) {
      const cleanUsername = tempUsername.trim().slice(0, 20); // Limit to 20 chars
      setUsername(cleanUsername);
      setIsUsernameSet(true);
      setShowUsernameInput(false);
      localStorage.setItem('frogHouseUsername', cleanUsername);
    }
  };

  // Save score to local leaderboard
  const saveLocalScore = useCallback((score) => {
    const newEntry = {
      score: score,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString()
    };
    
    const updatedLeaderboard = [...localLeaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Keep only top 10
    
    setLocalLeaderboard(updatedLeaderboard);
    localStorage.setItem('frogHouseLeaderboard', JSON.stringify(updatedLeaderboard));
  }, [localLeaderboard]);

  // Save score to global leaderboard
  const saveGlobalScore = useCallback((score) => {
    if (!isUsernameSet || !username) return;

    const newEntry = {
      score: score,
      username: username,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      isReal: true
    };

    // Load existing user scores
    const savedGlobalLeaderboard = localStorage.getItem('frogHouseGlobalLeaderboard');
    const userScores = savedGlobalLeaderboard ? JSON.parse(savedGlobalLeaderboard) : [];
    
    // Add new score
    const updatedUserScores = [...userScores, newEntry];
    localStorage.setItem('frogHouseGlobalLeaderboard', JSON.stringify(updatedUserScores));

    // Update global leaderboard display
    const sortedScores = updatedUserScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);
    setGlobalLeaderboard(sortedScores);

    console.log('Score saved to global leaderboard!');
  }, [isUsernameSet, username]);

  // Initialize game
  useEffect(() => {
    const platforms = generatePlatforms();
    const highest = Math.min(...platforms.map(p => p.y));
    setGameState(prev => ({
      ...prev,
      platforms: platforms,
      highestPlatform: highest
    }));
  }, [generatePlatforms]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch(e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          keysRef.current.left = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          keysRef.current.right = true;
          break;
        case ' ':
          e.preventDefault();
          if (!gameState.gameStarted) {
            startGame();
          }
          break;
        case 'Escape':
          setShowGlobalLeaderboard(false);
          setShowUsernameInput(false);
          break;
        case 'Enter':
          if (showUsernameInput) {
            handleUsernameSubmit();
          }
          break;
      }
    };

    const handleKeyUp = (e) => {
      switch(e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          keysRef.current.left = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          keysRef.current.right = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.gameStarted, showUsernameInput]);

  const startGame = () => {
    const platforms = generatePlatforms();
    const highest = Math.min(...platforms.map(p => p.y));
    
    setGameState(prev => ({
      ...prev,
      gameStarted: true,
      gameOver: false,
      score: 0,
      player: {
        ...prev.player,
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT - 100,
        velocityX: 0,
        velocityY: 0,
        onGround: false
      },
      camera: { y: 0 },
      platforms: platforms,
      highestPlatform: highest
    }));
  };

  const resetGame = () => {
    // Save score to leaderboards when game ends
    if (gameState.score > 0) {
      saveLocalScore(gameState.score);
      
      // Save to global leaderboard if username is set
      if (isUsernameSet && username) {
        saveGlobalScore(gameState.score);
      }
    }
    
    const platforms = generatePlatforms();
    const highest = Math.min(...platforms.map(p => p.y));
    
    setGameState(prev => ({
      ...prev,
      gameStarted: false,
      gameOver: false,
      score: 0,
      player: {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT - 100,
        width: 40,
        height: 40,
        velocityX: 0,
        velocityY: 0,
        onGround: false
      },
      camera: { y: 0 },
      platforms: platforms,
      highestPlatform: highest
    }));
  };

  // Game loop
  useEffect(() => {
    if (!gameState.gameStarted || gameState.gameOver) return;

    const gameLoop = () => {
      setGameState(prev => {
        const newPlayer = { ...prev.player };
        
        // Handle input
        if (keysRef.current.left) {
          newPlayer.velocityX = -PLAYER_SPEED;
        } else if (keysRef.current.right) {
          newPlayer.velocityX = PLAYER_SPEED;
        } else {
          newPlayer.velocityX *= 0.8; // Friction
        }

        // Apply gravity
        newPlayer.velocityY += GRAVITY;

        // Update position
        newPlayer.x += newPlayer.velocityX;
        newPlayer.y += newPlayer.velocityY;

        // Wrap around screen horizontally
        if (newPlayer.x < -newPlayer.width) {
          newPlayer.x = CANVAS_WIDTH;
        } else if (newPlayer.x > CANVAS_WIDTH) {
          newPlayer.x = -newPlayer.width;
        }

        // Platform collision detection
        newPlayer.onGround = false;
        if (newPlayer.velocityY > 0) { // Only check when falling
          prev.platforms.forEach(platform => {
            if (newPlayer.x < platform.x + platform.width &&
                newPlayer.x + newPlayer.width > platform.x &&
                newPlayer.y + newPlayer.height > platform.y &&
                newPlayer.y + newPlayer.height < platform.y + platform.height + 10) {
              newPlayer.y = platform.y - newPlayer.height;
              newPlayer.velocityY = JUMP_FORCE;
              newPlayer.onGround = true;
            }
          });
        }

        // Update camera to follow player
        let newCamera = { ...prev.camera };
        const targetCameraY = newPlayer.y - CANVAS_HEIGHT * 0.7;
        if (targetCameraY < newCamera.y) {
          newCamera.y = targetCameraY;
        }

        // Update score based on height
        const newScore = Math.max(prev.score, Math.floor((CANVAS_HEIGHT - newPlayer.y) / 10));

        // Check game over
        const gameOver = newPlayer.y > newCamera.y + CANVAS_HEIGHT + 100;
        
        // Generate more platforms if player is getting close to the highest one
        let newPlatforms = prev.platforms;
        let newHighestPlatform = prev.highestPlatform;
        
        if (newPlayer.y < prev.highestPlatform + (PLATFORM_SPACING * 10)) {
          const morePlatforms = generateMorePlatforms(prev.highestPlatform);
          newPlatforms = [...prev.platforms, ...morePlatforms];
          newHighestPlatform = Math.min(...morePlatforms.map(p => p.y));
        }

        return {
          ...prev,
          player: newPlayer,
          camera: newCamera,
          score: newScore,
          gameOver,
          platforms: newPlatforms,
          highestPlatform: newHighestPlatform
        };
      });

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState.gameStarted, gameState.gameOver, generateMorePlatforms]);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to maintain aspect ratio
    const ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1a237e');
    gradient.addColorStop(0.5, '#4a148c');
    gradient.addColorStop(1, '#1b5e20');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (gameState.gameStarted && !gameState.gameOver) {
      // Draw platforms
      ctx.fillStyle = '#4caf50';
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 2;
      
      gameState.platforms.forEach(platform => {
        const screenY = platform.y - gameState.camera.y;
        if (screenY > -50 && screenY < CANVAS_HEIGHT + 50) {
          // Platform base (lily pad style)
          ctx.fillRect(platform.x, screenY, platform.width, platform.height);
          ctx.strokeRect(platform.x, screenY, platform.width, platform.height);
          
          // Lily pad details
          ctx.fillStyle = '#66bb6a';
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(platform.x + 10 + i * 30, screenY + 5, 8, 10);
          }
          ctx.fillStyle = '#4caf50';
        }
      });

      // Draw player (PNG image or fallback to drawn frog)
      const playerScreenY = gameState.player.y - gameState.camera.y;
      const playerX = gameState.player.x;
      
      if (playerImage) {
        // Draw the PNG image
        ctx.drawImage(
          playerImage,
          playerX,
          playerScreenY,
          gameState.player.width,
          gameState.player.height
        );
      } else {
        // Fallback: Draw frog character if image hasn't loaded
        // Frog body
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.ellipse(playerX + 20, playerScreenY + 25, 18, 15, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Frog head
        ctx.fillStyle = '#66bb6a';
        ctx.beginPath();
        ctx.ellipse(playerX + 20, playerScreenY + 15, 15, 12, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(playerX + 14, playerScreenY + 10, 4, 5, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(playerX + 26, playerScreenY + 10, 4, 5, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Pupils
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(playerX + 14, playerScreenY + 11, 2, 2, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(playerX + 26, playerScreenY + 11, 2, 2, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        // Mouth
        ctx.strokeStyle = '#2e7d32';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(playerX + 20, playerScreenY + 18, 6, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
        
        // Legs
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(playerX + 8, playerScreenY + 32, 8, 6);
        ctx.fillRect(playerX + 24, playerScreenY + 32, 8, 6);
      }

      // Score
      ctx.fillStyle = '#fff';
      ctx.font = '24px Arial';
      ctx.fillText(`Score: ${gameState.score}`, 20, 40);
      
      // Personal best
      if (userPersonalBest) {
        ctx.font = '18px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`PB: ${userPersonalBest}`, 20, 70);
      }
      
      // Global best
      if (globalLeaderboard.length > 0) {
        ctx.font = '16px Arial';
        ctx.fillStyle = '#ff6b35';
        ctx.fillText(`World: ${globalLeaderboard[0].score}`, 20, 95);
      }
    }
  });

  return (
    <div className="game-container">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="header-left">
            <h1>🐸 PUMP HOUSE 🐸 (FUCK COOPER)</h1>
            <p>A PUMP Jump Adventure</p>
          </div>
          <div className="header-right">
            <button 
              onClick={() => setShowGlobalLeaderboard(true)}
              className="leaderboard-button"
            >
              🏆 Global Leaderboard
            </button>
            {isUsernameSet ? (
              <div className="username-display">
                <span>👤 {username}</span>
                <button 
                  onClick={() => setShowUsernameInput(true)} 
                  className="change-username-btn"
                  title="Change username"
                >
                  ✏️
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowUsernameInput(true)}
                className="set-username-button"
              >
                Set Username
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Username Input Modal */}
      {showUsernameInput && (
        <div className="modal-overlay" onClick={() => setShowUsernameInput(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👤 {isUsernameSet ? 'Change Username' : 'Set Username'}</h2>
              <button 
                className="modal-close"
                onClick={() => setShowUsernameInput(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="username-input-section">
                <p>Choose a username to compete on the global leaderboard!</p>
                <input
                  type="text"
                  value={tempUsername}
                  onChange={(e) => setTempUsername(e.target.value)}
                  placeholder="Enter username (2-20 characters)"
                  maxLength={20}
                  className="username-input"
                  autoFocus
                />
                <div className="username-buttons">
                  <button 
                    onClick={handleUsernameSubmit}
                    disabled={tempUsername.trim().length < 2}
                    className="game-button"
                  >
                    {isUsernameSet ? 'Update Username' : 'Set Username'}
                  </button>
                  <button 
                    onClick={() => setShowUsernameInput(false)}
                    className="game-button secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Leaderboard Modal */}
      {showGlobalLeaderboard && (
        <div className="modal-overlay" onClick={() => setShowGlobalLeaderboard(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🌍 Global Leaderboard 🌍</h2>
              <button 
                className="modal-close"
                onClick={() => setShowGlobalLeaderboard(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {globalLeaderboard.length === 0 ? (
                <div className="empty-leaderboard">
                  <p>🎮 No scores yet! Be the first to compete!</p>
                  {!isUsernameSet && (
                    <button 
                      onClick={() => {
                        setShowGlobalLeaderboard(false);
                        setShowUsernameInput(true);
                      }}
                      className="game-button"
                    >
                      Set Username to Compete
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Leaderboard Header */}
                  <div className="leaderboard-header">
                    <span>Rank</span>
                    <span>Username</span>
                    <span>Date</span>
                    <span>Points</span>
                  </div>
                  
                  {/* Leaderboard Entries */}
                  <div className="global-leaderboard-list">
                    {globalLeaderboard.map((entry, index) => (
                      <div 
                        key={index} 
                        className={`global-leaderboard-entry ${
                          isUsernameSet && entry.username === username ? 'user-entry' : ''
                        }`}
                      >
                        <span className="rank">#{index + 1}</span>
                        <span className="wallet">
                          {entry.username}
                          {entry.isReal && <span className="verified-badge">✓</span>}
                        </span>
                        <span className="date">{entry.date}</span>
                        <span className="score">{entry.score}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {!isUsernameSet && globalLeaderboard.length > 0 && (
                <div className="connect-wallet-prompt">
                  <p>👤 Set a username to submit your scores to the global leaderboard!</p>
                  <button 
                    onClick={() => {
                      setShowGlobalLeaderboard(false);
                      setShowUsernameInput(true);
                    }}
                    className="game-button"
                  >
                    Set Username
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Game Container */}
      <main className="main-content">
        <div className="game-wrapper">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="game-canvas"
            tabIndex="0"
            style={{ width: '100%', maxWidth: '800px', height: 'auto' }}
          />
          
          {/* Game UI Overlays */}
          {!gameState.gameStarted && !gameState.gameOver && (
            <div className="game-overlay">
              <div className="overlay-content">
                <h2>Welcome to PUMP House!</h2>
                <p>Use ← → or A/D keys to move</p>
                <p className="instructions">Jump on lily pads to go higher!</p>
                {isUsernameSet ? (
                  <p className="username-connected">👤 Playing as: <strong>{username}</strong></p>
                ) : (
                  <p className="username-prompt">Set a username to compete globally!</p>
                )}
                <button onClick={startGame} className="game-button">
                  Press SPACE or Click to Start
                </button>
              </div>
            </div>
          )}

          {gameState.gameOver && (
            <div className="game-overlay">
              <div className="overlay-content">
                <h2>Game Over!</h2>
                <p className="instructions">Final Score: {gameState.score}</p>
                
                {/* Local Leaderboard */}
                {localLeaderboard.length > 0 && (
                  <div className="leaderboard">
                    <h3>🏠 Your High Scores</h3>
                    
                    {/* Local Leaderboard Header */}
                    <div className="local-leaderboard-header">
                      <span>Rank</span>
                      <span>Points</span>
                      <span>Date</span>
                    </div>
                    
                    {/* Local Leaderboard Entries */}
                    <div className="leaderboard-list">
                      {localLeaderboard.slice(0, 5).map((entry, index) => (
                        <div 
                          key={index} 
                          className={`leaderboard-entry ${entry.score === gameState.score ? 'current-score' : ''}`}
                        >
                          <span className="leaderboard-rank">#{index + 1}</span>
                          <span className="leaderboard-score">{entry.score}</span>
                          <span className="leaderboard-date">{entry.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="game-over-buttons">
                  <button onClick={resetGame} className="game-button">
                    Play Again
                  </button>
                  <button 
                    onClick={() => setShowGlobalLeaderboard(true)} 
                    className="game-button secondary"
                  >
                    View Global Leaderboard
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Instructions */}
      <div className="instructions-section">
        <div className="instructions-container">
          <h3>How to Play</h3>
          <p>Move left and right with arrow keys or A/D. Your frog will automatically bounce on lily pads. Try to reach new heights!</p>
          {isUsernameSet && (
            <p>👤 <strong>Playing as {username}:</strong> Your scores will be submitted to the global leaderboard!</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <p>© 2025 PUMP House Game</p>
          <div className="footer-links">
            <a 
              href="https://x.com/lima_lemon17431" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              🐦 Follow on Twitter
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;