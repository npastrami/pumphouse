import React, { useState, useEffect, useRef, useCallback } from 'react';

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

  // API endpoint - change this to your server's URL
  const API_BASE_URL = 'http://localhost:3001/api';

  // Character selection
  const [selectedCharacter, setSelectedCharacter] = useState('cooper');
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);

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

  // Player images
  const [playerImages, setPlayerImages] = useState({
    cooper: null,
    zeek: null
  });

  // Load player images
  useEffect(() => {
    const loadImage = (src, key) => {
      const img = new Image();
      img.onload = () => {
        setPlayerImages(prev => ({ ...prev, [key]: img }));
      };
      img.onerror = () => {
        console.warn(`Failed to load image: ${src}`);
      };
      img.src = src;
    };

    loadImage('/cooper.png', 'cooper');
    loadImage('/zeek.png', 'zeek');
  }, []);

  // Load saved character selection
  useEffect(() => {
    const savedCharacter = localStorage.getItem('pumpHouseCharacter');
    if (savedCharacter && (savedCharacter === 'cooper' || savedCharacter === 'zeek')) {
      setSelectedCharacter(savedCharacter);
    }
  }, []);

  // Save character selection
  const handleCharacterSelect = (character) => {
    setSelectedCharacter(character);
    localStorage.setItem('pumpHouseCharacter', character);
    setShowCharacterSelect(false);
  };

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

  // Load global leaderboard from server
  const loadGlobalLeaderboard = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/leaderboard`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGlobalLeaderboard(data.scores || []);
        }
      }
    } catch (error) {
      console.error('Error loading global leaderboard:', error);
      // Fallback to localStorage if server is not available
      const savedGlobalLeaderboard = localStorage.getItem('frogHouseGlobalLeaderboard');
      if (savedGlobalLeaderboard) {
        const userScores = JSON.parse(savedGlobalLeaderboard);
        setGlobalLeaderboard(userScores.sort((a, b) => b.score - a.score).slice(0, 20));
      }
    }
  };

  // Load user's personal best
  const loadUserPersonalBest = async (username) => {
    if (!username) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/leaderboard/user/${encodeURIComponent(username)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.personalBest) {
          setUserPersonalBest(data.personalBest.score);
        }
      }
    } catch (error) {
      console.error('Error loading user personal best:', error);
    }
  };

  // Load saved username and leaderboards
  useEffect(() => {
    // Load saved username
    const savedUsername = localStorage.getItem('frogHouseUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setIsUsernameSet(true);
      loadUserPersonalBest(savedUsername);
    }

    // Load local leaderboard
    const savedLeaderboard = localStorage.getItem('frogHouseLeaderboard');
    if (savedLeaderboard) {
      setLocalLeaderboard(JSON.parse(savedLeaderboard));
    }

    // Load global leaderboard
    loadGlobalLeaderboard();
  }, []);

  // Handle username submission
  const handleUsernameSubmit = () => {
    if (tempUsername.trim().length >= 2) {
      const cleanUsername = tempUsername.trim().slice(0, 20);
      setUsername(cleanUsername);
      setIsUsernameSet(true);
      setShowUsernameInput(false);
      localStorage.setItem('frogHouseUsername', cleanUsername);
      loadUserPersonalBest(cleanUsername);
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
      .slice(0, 10);
    
    setLocalLeaderboard(updatedLeaderboard);
    localStorage.setItem('frogHouseLeaderboard', JSON.stringify(updatedLeaderboard));
  }, [localLeaderboard]);

  // Save score to global leaderboard
  const saveGlobalScore = useCallback(async (score) => {
    if (!isUsernameSet || !username) return;

    const newEntry = {
      score: score,
      username: username,
      character: selectedCharacter,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString()
    };

    try {
      const response = await fetch(`${API_BASE_URL}/leaderboard`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEntry),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('Score saved to global leaderboard!');
          // Reload the global leaderboard and user's personal best
          await loadGlobalLeaderboard();
          await loadUserPersonalBest(username);
        }
      }
    } catch (error) {
      console.error('Error saving global score:', error);
      // Fallback to localStorage if server is not available
      const savedGlobalLeaderboard = localStorage.getItem('frogHouseGlobalLeaderboard');
      const userScores = savedGlobalLeaderboard ? JSON.parse(savedGlobalLeaderboard) : [];
      
      const updatedUserScores = [...userScores, newEntry];
      localStorage.setItem('frogHouseGlobalLeaderboard', JSON.stringify(updatedUserScores));

      const sortedScores = updatedUserScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
      setGlobalLeaderboard(sortedScores);
    }
  }, [isUsernameSet, username, selectedCharacter]);

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
          setShowCharacterSelect(false);
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
    if (gameState.score > 0) {
      saveLocalScore(gameState.score);
      
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
        
        if (keysRef.current.left) {
          newPlayer.velocityX = -PLAYER_SPEED;
        } else if (keysRef.current.right) {
          newPlayer.velocityX = PLAYER_SPEED;
        } else {
          newPlayer.velocityX *= 0.8;
        }

        newPlayer.velocityY += GRAVITY;
        newPlayer.x += newPlayer.velocityX;
        newPlayer.y += newPlayer.velocityY;

        if (newPlayer.x < -newPlayer.width) {
          newPlayer.x = CANVAS_WIDTH;
        } else if (newPlayer.x > CANVAS_WIDTH) {
          newPlayer.x = -newPlayer.width;
        }

        newPlayer.onGround = false;
        if (newPlayer.velocityY > 0) {
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

        let newCamera = { ...prev.camera };
        const targetCameraY = newPlayer.y - CANVAS_HEIGHT * 0.7;
        if (targetCameraY < newCamera.y) {
          newCamera.y = targetCameraY;
        }

        const newScore = Math.max(prev.score, Math.floor((CANVAS_HEIGHT - newPlayer.y) / 10));
        const gameOver = newPlayer.y > newCamera.y + CANVAS_HEIGHT + 100;
        
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

    const ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1a237e');
    gradient.addColorStop(0.5, '#4a148c');
    gradient.addColorStop(1, '#1b5e20');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (gameState.gameStarted && !gameState.gameOver) {
      ctx.fillStyle = '#4caf50';
      ctx.strokeStyle = '#2e7d32';
      ctx.lineWidth = 2;
      
      gameState.platforms.forEach(platform => {
        const screenY = platform.y - gameState.camera.y;
        if (screenY > -50 && screenY < CANVAS_HEIGHT + 50) {
          ctx.fillRect(platform.x, screenY, platform.width, platform.height);
          ctx.strokeRect(platform.x, screenY, platform.width, platform.height);
          
          ctx.fillStyle = '#66bb6a';
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(platform.x + 10 + i * 30, screenY + 5, 8, 10);
          }
          ctx.fillStyle = '#4caf50';
        }
      });

      const playerScreenY = gameState.player.y - gameState.camera.y;
      const playerX = gameState.player.x;
      
      const currentPlayerImage = playerImages[selectedCharacter];
      if (currentPlayerImage) {
        ctx.drawImage(
          currentPlayerImage,
          playerX,
          playerScreenY,
          gameState.player.width,
          gameState.player.height
        );
      } else {
        // Fallback frog drawing
        ctx.fillStyle = '#4caf50';
        ctx.beginPath();
        ctx.ellipse(playerX + 20, playerScreenY + 25, 18, 15, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#66bb6a';
        ctx.beginPath();
        ctx.ellipse(playerX + 20, playerScreenY + 15, 15, 12, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(playerX + 14, playerScreenY + 10, 4, 5, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(playerX + 26, playerScreenY + 10, 4, 5, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(playerX + 14, playerScreenY + 11, 2, 2, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(playerX + 26, playerScreenY + 11, 2, 2, 0, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = '#2e7d32';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(playerX + 20, playerScreenY + 18, 6, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
        
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(playerX + 8, playerScreenY + 32, 8, 6);
        ctx.fillRect(playerX + 24, playerScreenY + 32, 8, 6);
      }

      ctx.fillStyle = '#fff';
      ctx.font = '24px Arial';
      ctx.fillText(`Score: ${gameState.score}`, 20, 40);
      
      if (userPersonalBest) {
        ctx.font = '18px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`PB: ${userPersonalBest}`, 20, 70);
      }
      
      if (globalLeaderboard.length > 0) {
        ctx.font = '16px Arial';
        ctx.fillStyle = '#ff6b35';
        ctx.fillText(`World: ${globalLeaderboard[0].score}`, 20, 95);
      }
    }
  });

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '1rem 0',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '2rem' }}>🐸 PUMP HOUSE 🐸 (Cooper NGMI)</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8 }}>A PUMP Jump Adventure</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setShowCharacterSelect(true)}
              style={{
                background: '#ff6b35',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1rem',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
            >
              🎭 Character: {selectedCharacter === 'cooper' ? 'Cooper' : 'Zeek'}
            </button>
            <button 
              onClick={() => setShowGlobalLeaderboard(true)}
              style={{
                background: '#4caf50',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1rem',
                borderRadius: '25px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
            >
              🏆 Global Leaderboard
            </button>
            {isUsernameSet ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>👤 {username}</span>
                <button 
                  onClick={() => setShowUsernameInput(true)} 
                  style={{
                    background: 'transparent',
                    color: 'white',
                    border: '1px solid white',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontSize: '0.8rem'
                  }}
                  title="Change username"
                >
                  ✏️
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowUsernameInput(true)}
                style={{
                  background: '#9c27b0',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1rem',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}
              >
                Set Username
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Character Selection Modal */}
      {showCharacterSelect && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowCharacterSelect(false)}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <h2 style={{ margin: 0, color: '#333' }}>🎭 Choose Your Character</h2>
              <button 
                onClick={() => setShowCharacterSelect(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <div 
                onClick={() => handleCharacterSelect('cooper')}
                style={{
                  border: selectedCharacter === 'cooper' ? '3px solid #4caf50' : '2px solid #ddd',
                  borderRadius: '15px',
                  padding: '1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: selectedCharacter === 'cooper' ? '#f0f8f0' : '#f9f9f9',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: '#e0e0e0',
                  borderRadius: '10px',
                  margin: '0 auto 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem'
                }}>
                  {playerImages.cooper ? (
                    <img 
                      src="/cooper.png" 
                      alt="Cooper" 
                      style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                    />
                  ) : '🐸'}
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Cooper</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Confirmed Scammer</p>
              </div>
              
              <div 
                onClick={() => handleCharacterSelect('zeek')}
                style={{
                  border: selectedCharacter === 'zeek' ? '3px solid #4caf50' : '2px solid #ddd',
                  borderRadius: '15px',
                  padding: '1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: selectedCharacter === 'zeek' ? '#f0f8f0' : '#f9f9f9',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: '#e0e0e0',
                  borderRadius: '10px',
                  margin: '0 auto 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem'
                }}>
                  {playerImages.zeek ? (
                    <img 
                      src="/zeek.png" 
                      alt="Zeek" 
                      style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                    />
                  ) : '👹'}
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>Zeek</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>Hero of the Trenches</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Username Input Modal */}
      {showUsernameInput && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowUsernameInput(false)}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h2 style={{ margin: 0, color: '#333' }}>👤 {isUsernameSet ? 'Change Username' : 'Set Username'}</h2>
              <button 
                onClick={() => setShowUsernameInput(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>
            <div>
              <p style={{ color: '#666', marginBottom: '1rem' }}>Choose a username to compete on the global leaderboard!</p>
              <input
                type="text"
                value={tempUsername}
                onChange={(e) => setTempUsername(e.target.value)}
                placeholder="Enter username (2-20 characters)"
                maxLength={20}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  marginBottom: '1rem',
                  boxSizing: 'border-box'
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={handleUsernameSubmit}
                  disabled={tempUsername.trim().length < 2}
                  style={{
                    flex: 1,
                    background: tempUsername.trim().length >= 2 ? '#4caf50' : '#ccc',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    cursor: tempUsername.trim().length >= 2 ? 'pointer' : 'not-allowed',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  {isUsernameSet ? 'Update Username' : 'Set Username'}
                </button>
                <button 
                  onClick={() => setShowUsernameInput(false)}
                  style={{
                    flex: 1,
                    background: '#666',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Leaderboard Modal */}
      {showGlobalLeaderboard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowGlobalLeaderboard(false)}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <h2 style={{ margin: 0, color: '#333' }}>🌍 Global Leaderboard 🌍</h2>
              <button 
                onClick={() => setShowGlobalLeaderboard(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ✕
              </button>
            </div>
            
            {globalLeaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#666' }}>
                <p>🎮 No scores yet! Be the first to compete!</p>
                {!isUsernameSet && (
                  <button 
                    onClick={() => {
                      setShowGlobalLeaderboard(false);
                      setShowUsernameInput(true);
                    }}
                    style={{
                      background: '#4caf50',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 'bold'
                    }}
                  >
                    Set Username to Compete
                  </button>
                )}
              </div>
            ) : (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr 100px 80px',
                  gap: '1rem',
                  padding: '0.75rem',
                  background: '#f5f5f5',
                  borderRadius: '10px',
                  marginBottom: '1rem',
                  fontWeight: 'bold',
                  color: '#333'
                }}>
                  <span>Rank</span>
                  <span>Username</span>
                  <span>Character</span>
                  <span>Score</span>
                </div>
                
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  {globalLeaderboard.map((entry, index) => (
                    <div 
                      key={entry.id || index} 
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '50px 1fr 100px 80px',
                        gap: '1rem',
                        padding: '0.75rem',
                        borderRadius: '10px',
                        marginBottom: '0.5rem',
                        background: isUsernameSet && entry.username === username ? '#e8f5e8' : '#f9f9f9',
                        border: isUsernameSet && entry.username === username ? '2px solid #4caf50' : '1px solid #eee',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ fontWeight: 'bold', color: '#666' }}>#{index + 1}</span>
                      <span style={{ fontWeight: isUsernameSet && entry.username === username ? 'bold' : 'normal' }}>
                        {entry.username}
                      </span>
                      <span style={{ fontSize: '0.9rem', color: '#666', textTransform: 'capitalize' }}>
                        {entry.character || 'cooper'}
                      </span>
                      <span style={{ fontWeight: 'bold', color: '#4caf50' }}>{entry.score}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {!isUsernameSet && globalLeaderboard.length > 0 && (
              <div style={{
                marginTop: '2rem',
                padding: '1rem',
                background: '#fff3cd',
                borderRadius: '10px',
                textAlign: 'center'
              }}>
                <p style={{ margin: '0 0 1rem 0', color: '#856404' }}>👤 Set a username to submit your scores to the global leaderboard!</p>
                <button 
                  onClick={() => {
                    setShowGlobalLeaderboard(false);
                    setShowUsernameInput(true);
                  }}
                  style={{
                    background: '#4caf50',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  Set Username
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Game Container */}
      <main style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 200px)',
        padding: '2rem'
      }}>
        <div style={{
          position: 'relative',
          maxWidth: '800px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ width: '100%', maxWidth: '800px', height: 'auto', display: 'block' }}
            tabIndex="0"
          />
          
          {/* Game UI Overlays */}
          {!gameState.gameStarted && !gameState.gameOver && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              textAlign: 'center'
            }}>
              <div>
                <h2 style={{ margin: '0 0 1rem 0', fontSize: '2rem' }}>Welcome to PUMP House!</h2>
                <p style={{ margin: '0.5rem 0', fontSize: '1.1rem' }}>Use ← → or A/D keys to move</p>
                <p style={{ margin: '0.5rem 0 2rem 0', fontSize: '1rem', opacity: 0.8 }}>Jump on lily pads to go higher!</p>
                
                <div style={{ marginBottom: '2rem' }}>
                  <p style={{ margin: '0.5rem 0', fontSize: '1rem' }}>
                    Playing as: <strong>{selectedCharacter === 'cooper' ? 'Cooper' : 'Zeek'}</strong>
                  </p>
                  {isUsernameSet ? (
                    <p style={{ margin: '0.5rem 0', color: '#4caf50' }}>👤 Username: <strong>{username}</strong></p>
                  ) : (
                    <p style={{ margin: '0.5rem 0', color: '#ffd700' }}>Set a username to compete globally!</p>
                  )}
                </div>
                
                <button 
                  onClick={startGame} 
                  style={{
                    background: '#4caf50',
                    color: 'white',
                    border: 'none',
                    padding: '1rem 2rem',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)'
                  }}
                >
                  Press SPACE or Click to Start
                </button>
              </div>
            </div>
          )}

          {gameState.gameOver && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              textAlign: 'center'
            }}>
              <div style={{ maxWidth: '400px', width: '90%' }}>
                <h2 style={{ margin: '0 0 1rem 0', fontSize: '2rem' }}>Game Over!</h2>
                <p style={{ margin: '0 0 2rem 0', fontSize: '1.5rem', color: '#ffd700' }}>Final Score: {gameState.score}</p>
                
                {/* Local Leaderboard */}
                {localLeaderboard.length > 0 && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '15px',
                    padding: '1rem',
                    marginBottom: '2rem'
                  }}>
                    <h3 style={{ margin: '0 0 1rem 0' }}>🏠 Your High Scores</h3>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '50px 1fr 80px',
                      gap: '0.5rem',
                      marginBottom: '0.5rem',
                      fontSize: '0.9rem',
                      opacity: 0.8
                    }}>
                      <span>Rank</span>
                      <span>Score</span>
                      <span>Date</span>
                    </div>
                    
                    {localLeaderboard.slice(0, 5).map((entry, index) => (
                      <div 
                        key={index} 
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '50px 1fr 80px',
                          gap: '0.5rem',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          background: entry.score === gameState.score ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                          marginBottom: '0.25rem',
                          fontSize: '0.9rem'
                        }}
                      >
                        <span>#{index + 1}</span>
                        <span style={{ fontWeight: 'bold' }}>{entry.score}</span>
                        <span style={{ fontSize: '0.8rem' }}>{entry.date}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button 
                    onClick={resetGame} 
                    style={{
                      background: '#4caf50',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 'bold'
                    }}
                  >
                    Play Again
                  </button>
                  <button 
                    onClick={() => setShowGlobalLeaderboard(true)} 
                    style={{
                      background: '#666',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
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
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '2rem',
        margin: '2rem auto',
        maxWidth: '800px',
        borderRadius: '20px',
        textAlign: 'center',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#333' }}>How to Play</h3>
        <p style={{ margin: '0 0 1rem 0', color: '#666' }}>
          Move left and right with arrow keys or A/D. Your character will automatically bounce on lily pads. Try to reach new heights!
        </p>
        {isUsernameSet && (
          <p style={{ margin: 0, color: '#4caf50', fontWeight: 'bold' }}>
            👤 Playing as {username} with {selectedCharacter === 'cooper' ? 'Cooper' : 'Zeek'}: Your scores will be submitted to the global leaderboard!
          </p>
        )}
      </div>

      {/* Footer */}
      <footer style={{
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '2rem 0',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem'
        }}>
          <p style={{ margin: '0 0 1rem 0' }}>© 2025 PUMP House Game</p>
          <div>
            <a 
              href="https://x.com/i/communities/1938265091519943153" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                color: '#4caf50',
                textDecoration: 'none',
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
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