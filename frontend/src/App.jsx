import React, { useState, useEffect, useRef, useCallback } from 'react';

const App = () => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const keysRef = useRef({ left: false, right: false });
  const tiltRef = useRef({ gamma: 0, isActive: false });
  const [showLore, setShowLore] = useState(false);
  
  // Game constants
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const GRAVITY = 0.07;
  const JUMP_FORCE = -18;
  const PLAYER_SPEED = 3;
  const PLATFORM_WIDTH = 100;
  const PLATFORM_HEIGHT = 20;
  const PLATFORM_SPACING = 150;

  // Mobile detection and tilt settings
  const [isMobile, setIsMobile] = useState(false);
  const [tiltEnabled, setTiltEnabled] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(false);
  const TILT_SENSITIVITY = 15; // degrees
  const TILT_DEADZONE = 3; // degrees

  // API endpoint
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

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const mobileCheck = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const touchCheck = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      return mobileCheck || touchCheck;
    };

    setIsMobile(checkMobile());
    setShowMobileControls(checkMobile());
  }, []);

  // Request motion permissions for iOS
  const requestMotionPermission = async () => {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      try {
        const permission = await DeviceMotionEvent.requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.warn('Motion permission denied:', error);
        return false;
      }
    }
    return true; // Android or older iOS
  };

  // Enable tilt controls
  const enableTiltControls = async () => {
    const hasPermission = await requestMotionPermission();
    if (!hasPermission) {
      alert('Motion permission is required for tilt controls. Please enable it in your browser settings.');
      return;
    }

    setTiltEnabled(true);
    tiltRef.current.isActive = true;
  };

  // Disable tilt controls
  const disableTiltControls = () => {
    setTiltEnabled(false);
    tiltRef.current.isActive = false;
    keysRef.current.left = false;
    keysRef.current.right = false;
  };

  // Device orientation handler
  useEffect(() => {
    const handleOrientation = (event) => {
      if (!tiltRef.current.isActive) return;

      const gamma = event.gamma || 0; // Left-right tilt (-90 to 90)
      tiltRef.current.gamma = gamma;

      // Apply deadzone
      if (Math.abs(gamma) < TILT_DEADZONE) {
        keysRef.current.left = false;
        keysRef.current.right = false;
        return;
      }

      // Map tilt to movement
      if (gamma < -TILT_DEADZONE) {
        keysRef.current.left = true;
        keysRef.current.right = false;
      } else if (gamma > TILT_DEADZONE) {
        keysRef.current.right = true;
        keysRef.current.left = false;
      }
    };

    if (isMobile && tiltEnabled) {
      window.addEventListener('deviceorientation', handleOrientation);
      return () => window.removeEventListener('deviceorientation', handleOrientation);
    }
  }, [isMobile, tiltEnabled]);

  // Touch controls for mobile
  const [touchControls, setTouchControls] = useState({ left: false, right: false });

  const handleTouchStart = (direction) => {
    if (!tiltEnabled) {
      setTouchControls(prev => ({ ...prev, [direction]: true }));
      keysRef.current[direction] = true;
    }
  };

  const handleTouchEnd = (direction) => {
    if (!tiltEnabled) {
      setTouchControls(prev => ({ ...prev, [direction]: false }));
      keysRef.current[direction] = false;
    }
  };

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
    platforms.push({
      x: CANVAS_WIDTH / 2 - PLATFORM_WIDTH / 2,
      y: CANVAS_HEIGHT - 50,
      width: PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT
    });

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
    const savedUsername = localStorage.getItem('frogHouseUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setIsUsernameSet(true);
      loadUserPersonalBest(savedUsername);
    }

    const savedLeaderboard = localStorage.getItem('frogHouseLeaderboard');
    if (savedLeaderboard) {
      setLocalLeaderboard(JSON.parse(savedLeaderboard));
    }

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
          await loadGlobalLeaderboard();
          await loadUserPersonalBest(username);
        }
      }
    } catch (error) {
      console.error('Error saving global score:', error);
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
          if (!tiltEnabled) keysRef.current.left = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (!tiltEnabled) keysRef.current.right = true;
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
          if (!tiltEnabled) keysRef.current.left = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (!tiltEnabled) keysRef.current.right = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.gameStarted, showUsernameInput, tiltEnabled]);

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
      ctx.font = isMobile ? '18px Arial' : '24px Arial';
      ctx.fillText(`Score: ${gameState.score}`, 15, isMobile ? 30 : 40);
      
      if (userPersonalBest) {
        ctx.font = isMobile ? '14px Arial' : '18px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`PB: ${userPersonalBest}`, 15, isMobile ? 50 : 70);
      }
      
      if (globalLeaderboard.length > 0) {
        ctx.font = isMobile ? '12px Arial' : '16px Arial';
        ctx.fillStyle = '#ff6b35';
        ctx.fillText(`World: ${globalLeaderboard[0].score}`, 15, isMobile ? 70 : 95);
      }

      // Tilt indicator for mobile
      if (isMobile && tiltEnabled) {
        const tiltAngle = tiltRef.current.gamma;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '12px Arial';
        ctx.fillText(`Tilt: ${Math.round(tiltAngle)}°`, CANVAS_WIDTH - 80, 25);
      }
    }
  });

  // Mobile-specific styles
  const mobileStyles = {
    modal: {
      padding: isMobile ? '1rem' : '2rem',
      maxWidth: isMobile ? '95vw' : '500px',
      maxHeight: isMobile ? '90vh' : 'none',
      overflow: isMobile ? 'auto' : 'visible'
    },
    header: {
      padding: isMobile ? '0.5rem 0' : '1rem 0',
      fontSize: isMobile ? '1.2rem' : '2rem'
    },
    button: {
      padding: isMobile ? '0.5rem 0.75rem' : '0.75rem 1rem',
      fontSize: isMobile ? '0.8rem' : '0.9rem'
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      width: '100%',
      margin: 0,
      padding: 0,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: mobileStyles.header.padding,
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? '0 1rem' : '0 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: isMobile ? '0.5rem' : '1rem'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '2rem' }}>
              🐸 PUMP HOUSE 🐸 {!isMobile && '(Cooper NGMI)'}
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: isMobile ? '0.8rem' : '1rem' }}>
              A PUMP Jump Adventure
            </p>
          </div>
          <div style={{ 
            display: 'flex', 
            gap: isMobile ? '0.5rem' : '1rem', 
            alignItems: 'center', 
            flexWrap: 'wrap',
            fontSize: isMobile ? '0.8rem' : '1rem'
          }}>
            <button 
              onClick={() => setShowCharacterSelect(true)}
              style={{
                background: '#ff6b35',
                color: 'white',
                border: 'none',
                ...mobileStyles.button,
                borderRadius: '25px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
            >
              🎭 {isMobile ? selectedCharacter === 'cooper' ? 'Cooper' : 'Zeek' : `Character: ${selectedCharacter === 'cooper' ? 'Cooper' : 'Zeek'}`}
            </button>
            {isMobile && (
              <button 
                onClick={() => setShowMobileControls(!showMobileControls)}
                style={{
                  background: '#2196f3',
                  color: 'white',
                  border: 'none',
                  ...mobileStyles.button,
                  borderRadius: '25px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease'
                }}
              >
                📱 Controls
              </button>
            )}
            <button 
              onClick={() => setShowGlobalLeaderboard(true)}
              style={{
                background: '#4caf50',
                color: 'white',
                border: 'none',
                ...mobileStyles.button,
                borderRadius: '25px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
            >
              🏆 {isMobile ? 'Leaderboard' : 'Global Leaderboard'}
            </button>
            <button 
              onClick={() => setShowLore(true)}
              style={{
                background: '#9e9e9e',
                color: 'white',
                border: 'none',
                ...mobileStyles.button,
                borderRadius: '25px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
              }}
            >
              📖 {isMobile ? 'Lore' : 'The Lore'}
            </button>
            {isUsernameSet ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: isMobile ? '0.8rem' : '1rem' }}>👤 {username}</span>
                <button 
                  onClick={() => setShowUsernameInput(true)} 
                  style={{
                    background: 'transparent',
                    color: 'white',
                    border: '1px solid white',
                    borderRadius: '50%',
                    width: isMobile ? '25px' : '30px',
                    height: isMobile ? '25px' : '30px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '0.7rem' : '0.8rem'
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
                  ...mobileStyles.button,
                  borderRadius: '25px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {isMobile ? 'Username' : 'Set Username'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Controls Panel */}
      {isMobile && showMobileControls && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          padding: '1rem',
          textAlign: 'center',
          position: 'relative'
        }}>
          <button
            onClick={() => setShowMobileControls(false)}
            style={{
              position: 'absolute',
              top: '0.5rem',
              right: '0.5rem',
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '1.2rem',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
          <h3 style={{ margin: '0 0 1rem 0' }}>📱 Mobile Controls</h3>
          {!tiltEnabled ? (
            <div>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
                Enable tilt controls to move by tilting your phone left and right!
              </p>
              <button
                onClick={enableTiltControls}
                style={{
                  background: '#4caf50',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '25px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  marginBottom: '1rem'
                }}
              >
                📱 Enable Tilt Controls
              </button>
            </div>
          ) : (
            <div>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#4caf50' }}>
                ✅ Tilt controls enabled! Tilt your phone to move left and right.
              </p>
              <button
                onClick={disableTiltControls}
                style={{
                  background: '#ff6b35',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Disable Tilt Controls
              </button>
            </div>
          )}
        </div>
      )}

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
          zIndex: 1000,
          padding: isMobile ? '1rem' : '0'
        }} onClick={() => setShowCharacterSelect(false)}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            ...mobileStyles.modal,
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: isMobile ? '1rem' : '2rem'
            }}>
              <h2 style={{ margin: 0, color: '#333', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>🎭 Choose Your Character</h2>
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
              marginBottom: isMobile ? '1rem' : '2rem'
            }}>
              <div 
                onClick={() => handleCharacterSelect('cooper')}
                style={{
                  border: selectedCharacter === 'cooper' ? '3px solid #4caf50' : '2px solid #ddd',
                  borderRadius: '15px',
                  padding: isMobile ? '0.75rem' : '1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: selectedCharacter === 'cooper' ? '#f0f8f0' : '#f9f9f9',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  width: isMobile ? '60px' : '80px',
                  height: isMobile ? '60px' : '80px',
                  background: '#e0e0e0',
                  borderRadius: '10px',
                  margin: '0 auto 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '1.5rem' : '2rem'
                }}>
                  {playerImages.cooper ? (
                    <img 
                      src="/cooper.png" 
                      alt="Cooper" 
                      style={{ width: isMobile ? '40px' : '60px', height: isMobile ? '40px' : '60px', objectFit: 'contain' }}
                    />
                  ) : '🐸'}
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#333', fontSize: isMobile ? '1rem' : '1.2rem' }}>Cooper</h3>
                <p style={{ margin: 0, fontSize: isMobile ? '0.8rem' : '0.9rem', color: '#666' }}>Confirmed Scammer</p>
              </div>
              
              <div 
                onClick={() => handleCharacterSelect('zeek')}
                style={{
                  border: selectedCharacter === 'zeek' ? '3px solid #4caf50' : '2px solid #ddd',
                  borderRadius: '15px',
                  padding: isMobile ? '0.75rem' : '1rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: selectedCharacter === 'zeek' ? '#f0f8f0' : '#f9f9f9',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  width: isMobile ? '60px' : '80px',
                  height: isMobile ? '60px' : '80px',
                  background: '#e0e0e0',
                  borderRadius: '10px',
                  margin: '0 auto 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isMobile ? '1.5rem' : '2rem'
                }}>
                  {playerImages.zeek ? (
                    <img 
                      src="/zeek.png" 
                      alt="Zeek" 
                      style={{ width: isMobile ? '40px' : '60px', height: isMobile ? '40px' : '60px', objectFit: 'contain' }}
                    />
                  ) : '👹'}
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#333', fontSize: isMobile ? '1rem' : '1.2rem' }}>Zeek</h3>
                <p style={{ margin: 0, fontSize: isMobile ? '0.8rem' : '0.9rem', color: '#666' }}>Hero of the Trenches</p>
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
          zIndex: 1000,
          padding: isMobile ? '1rem' : '0'
        }} onClick={() => setShowUsernameInput(false)}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: isMobile ? '1.5rem' : '2rem',
            maxWidth: isMobile ? '95vw' : '400px',
            width: '90%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h2 style={{ margin: 0, color: '#333', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
                👤 {isUsernameSet ? 'Change Username' : 'Set Username'}
              </h2>
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
              <p style={{ color: '#666', marginBottom: '1rem', fontSize: isMobile ? '0.9rem' : '1rem' }}>
                Choose a username to compete on the global leaderboard!
              </p>
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
                  fontSize: isMobile ? '16px' : '1rem', // 16px prevents zoom on iOS
                  marginBottom: '1rem',
                  boxSizing: 'border-box'
                }}
                autoFocus={!isMobile} // Avoid auto-focus on mobile to prevent keyboard issues
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
                    fontSize: isMobile ? '0.9rem' : '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  {isUsernameSet ? 'Update' : 'Set Username'}
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
                    fontSize: isMobile ? '0.9rem' : '1rem'
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
          zIndex: 1000,
          padding: isMobile ? '1rem' : '0'
        }} onClick={() => setShowGlobalLeaderboard(false)}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: isMobile ? '1rem' : '2rem',
            maxWidth: isMobile ? '95vw' : '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: isMobile ? '1rem' : '2rem'
            }}>
              <h2 style={{ margin: 0, color: '#333', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
                🌍 Global Leaderboard 🌍
              </h2>
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
                  gridTemplateColumns: isMobile ? '40px 1fr 80px' : '50px 1fr 100px 80px',
                  gap: isMobile ? '0.5rem' : '1rem',
                  padding: '0.75rem',
                  background: '#f5f5f5',
                  borderRadius: '10px',
                  marginBottom: '1rem',
                  fontWeight: 'bold',
                  color: '#333',
                  fontSize: isMobile ? '0.8rem' : '1rem'
                }}>
                  <span>Rank</span>
                  <span>Username</span>
                  {!isMobile && <span>Character</span>}
                  <span>Score</span>
                </div>
                
                <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                  {globalLeaderboard.map((entry, index) => (
                    <div 
                      key={entry.id || index} 
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '40px 1fr 80px' : '50px 1fr 100px 80px',
                        gap: isMobile ? '0.5rem' : '1rem',
                        padding: '0.75rem',
                        borderRadius: '10px',
                        marginBottom: '0.5rem',
                        background: isUsernameSet && entry.username === username ? '#e8f5e8' : '#f9f9f9',
                        border: isUsernameSet && entry.username === username ? '2px solid #4caf50' : '1px solid #eee',
                        alignItems: 'center',
                        fontSize: isMobile ? '0.8rem' : '1rem'
                      }}
                    >
                      <span style={{ fontWeight: 'bold', color: '#666' }}>#{index + 1}</span>
                      <span style={{ 
                        fontWeight: isUsernameSet && entry.username === username ? 'bold' : 'normal',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {entry.username}
                      </span>
                      {!isMobile && (
                        <span style={{ fontSize: '0.9rem', color: '#666', textTransform: 'capitalize' }}>
                          {entry.character || 'cooper'}
                        </span>
                      )}
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
                <p style={{ margin: '0 0 1rem 0', color: '#856404', fontSize: isMobile ? '0.9rem' : '1rem' }}>
                  👤 Set a username to submit your scores to the global leaderboard!
                </p>
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
                    fontSize: isMobile ? '0.9rem' : '1rem',
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
      {showLore && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: isMobile ? '1rem' : '2rem'
        }} onClick={() => setShowLore(false)}>
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '20px',
              maxWidth: isMobile ? '95vw' : '600px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: isMobile ? '1rem' : '2rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
              textAlign: 'left',
              lineHeight: '1.6'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.5rem' }}>📖 The Lore</h2>
              <button 
                onClick={() => setShowLore(false)}
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
            <p><strong>How Cooper Shaw Scammed Zeek the Trench Hero</strong></p>
            <p>
              In the depths of the PUMP House, Zeek the Trench Hero labored tirelessly, slaying scams and minting frogs to preserve the sanctity of the chain. 
              But lurking in the shadows was Cooper Shaw — a silver-tongued schemer with a plan.
            </p>
            <p>
              Under the guise of a partnership, Cooper promised Zeek eternal clout and matching royalties. Zeek, trusting as ever, agreed — not realizing he was 
              signing away his trench-earned treasure.
            </p>
            <p>
              When the moment came, Cooper ghosted. He rerouted the mint, sniped the royalties, and claimed the memes as his own. Zeek’s cries echoed through 
              the swamp. But instead of vengeance, Zeek took to the lily pads — training, ascending, preparing for the day he'd leap higher than ever before.
            </p>
            <p>
              The Trench remembers. 🐸
            </p>
          </div>
        </div>
      )}

      {/* Game Container */}
      <main style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: isMobile ? 'calc(100vh - 120px)' : 'calc(100vh - 200px)',
        padding: isMobile ? '0.5rem' : '2rem'
      }}>
        <div style={{
          position: 'relative',
          maxWidth: '800px',
          width: '100%',
          height: isMobile ? 'calc(100vh - 140px)' : 'auto',
          maxHeight: isMobile ? 'calc(100vh - 140px)' : 'none',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            style={{ 
              width: '100%', 
              height: isMobile ? '100%' : 'auto',
              maxWidth: '800px', 
              maxHeight: isMobile ? 'calc(100vh - 140px)' : 'none',
              display: 'block',
              touchAction: 'manipulation' // Prevent pinch-to-zoom
            }}
            tabIndex="0"
          />
          
          {/* Touch Controls for Mobile (when tilt is disabled) */}
          {isMobile && !tiltEnabled && gameState.gameStarted && !gameState.gameOver && (
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              right: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              pointerEvents: 'none'
            }}>
              <button
                onTouchStart={() => handleTouchStart('left')}
                onTouchEnd={() => handleTouchEnd('left')}
                onMouseDown={() => handleTouchStart('left')}
                onMouseUp={() => handleTouchEnd('left')}
                onMouseLeave={() => handleTouchEnd('left')}
                style={{
                  background: touchControls.left ? 'rgba(76, 175, 80, 0.8)' : 'rgba(255, 255, 255, 0.3)',
                  border: '2px solid white',
                  borderRadius: '50%',
                  width: '60px',
                  height: '60px',
                  color: 'white',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  userSelect: 'none',
                  touchAction: 'manipulation'
                }}
              >
                ←
              </button>
              <button
                onTouchStart={() => handleTouchStart('right')}
                onTouchEnd={() => handleTouchEnd('right')}
                onMouseDown={() => handleTouchStart('right')}
                onMouseUp={() => handleTouchEnd('right')}
                onMouseLeave={() => handleTouchEnd('right')}
                style={{
                  background: touchControls.right ? 'rgba(76, 175, 80, 0.8)' : 'rgba(255, 255, 255, 0.3)',
                  border: '2px solid white',
                  borderRadius: '50%',
                  width: '60px',
                  height: '60px',
                  color: 'white',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  pointerEvents: 'auto',
                  userSelect: 'none',
                  touchAction: 'manipulation'
                }}
              >
                →
              </button>
            </div>
          )}
          
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
              textAlign: 'center',
              padding: isMobile ? '1rem' : '2rem'
            }}>
              <div>
                <h2 style={{ margin: '0 0 1rem 0', fontSize: isMobile ? '1.5rem' : '2rem' }}>
                  Welcome to PUMP House!
                </h2>
                <p style={{ margin: '0.5rem 0', fontSize: isMobile ? '1rem' : '1.1rem' }}>
                  {isMobile ? 'Tilt phone or use buttons to move' : 'Use ← → or A/D keys to move'}
                </p>
                <p style={{ margin: '0.5rem 0 2rem 0', fontSize: isMobile ? '0.9rem' : '1rem', opacity: 0.8 }}>
                  Jump on lily pads to go higher!
                </p>
                
                <div style={{ marginBottom: '2rem' }}>
                  <p style={{ margin: '0.5rem 0', fontSize: isMobile ? '0.9rem' : '1rem' }}>
                    Playing as: <strong>{selectedCharacter === 'cooper' ? 'Cooper' : 'Zeek'}</strong>
                  </p>
                  {isUsernameSet ? (
                    <p style={{ margin: '0.5rem 0', color: '#4caf50', fontSize: isMobile ? '0.9rem' : '1rem' }}>
                      👤 Username: <strong>{username}</strong>
                    </p>
                  ) : (
                    <p style={{ margin: '0.5rem 0', color: '#ffd700', fontSize: isMobile ? '0.9rem' : '1rem' }}>
                      Set a username to compete globally!
                    </p>
                  )}
                  
                  {isMobile && (
                    <p style={{ margin: '1rem 0', color: '#ff6b35', fontSize: '0.9rem' }}>
                      {tiltEnabled ? 
                        '📱 Tilt controls enabled!' : 
                        '📱 Enable tilt controls in the mobile panel above'
                      }
                    </p>
                  )}
                </div>
                
                <button 
                  onClick={startGame} 
                  style={{
                    background: '#4caf50',
                    color: 'white',
                    border: 'none',
                    padding: isMobile ? '0.75rem 1.5rem' : '1rem 2rem',
                    borderRadius: '25px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '1rem' : '1.2rem',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                    touchAction: 'manipulation'
                  }}
                >
                  {isMobile ? 'Tap to Start' : 'Press SPACE or Click to Start'}
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
              textAlign: 'center',
              padding: isMobile ? '1rem' : '2rem'
            }}>
              <div style={{ maxWidth: isMobile ? '100%' : '400px', width: '90%' }}>
                <h2 style={{ margin: '0 0 1rem 0', fontSize: isMobile ? '1.5rem' : '2rem' }}>Game Over!</h2>
                <p style={{ margin: '0 0 2rem 0', fontSize: isMobile ? '1.2rem' : '1.5rem', color: '#ffd700' }}>
                  Final Score: {gameState.score}
                </p>
                
                {/* Local Leaderboard */}
                {localLeaderboard.length > 0 && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '15px',
                    padding: isMobile ? '0.75rem' : '1rem',
                    marginBottom: '2rem'
                  }}>
                    <h3 style={{ margin: '0 0 1rem 0', fontSize: isMobile ? '1rem' : '1.2rem' }}>🏠 Your High Scores</h3>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '40px 1fr 60px' : '50px 1fr 80px',
                      gap: '0.5rem',
                      marginBottom: '0.5rem',
                      fontSize: isMobile ? '0.8rem' : '0.9rem',
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
                          gridTemplateColumns: isMobile ? '40px 1fr 60px' : '50px 1fr 80px',
                          gap: '0.5rem',
                          padding: '0.5rem',
                          borderRadius: '8px',
                          background: entry.score === gameState.score ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                          marginBottom: '0.25rem',
                          fontSize: isMobile ? '0.8rem' : '0.9rem'
                        }}
                      >
                        <span>#{index + 1}</span>
                        <span style={{ fontWeight: 'bold' }}>{entry.score}</span>
                        <span style={{ fontSize: isMobile ? '0.7rem' : '0.8rem' }}>{entry.date}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div style={{ 
                  display: 'flex', 
                  gap: isMobile ? '0.5rem' : '1rem', 
                  justifyContent: 'center', 
                  flexWrap: 'wrap' 
                }}>
                  <button 
                    onClick={resetGame} 
                    style={{
                      background: '#4caf50',
                      color: 'white',
                      border: 'none',
                      padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      fontSize: isMobile ? '0.9rem' : '1rem',
                      fontWeight: 'bold',
                      touchAction: 'manipulation'
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
                      padding: isMobile ? '0.75rem 1rem' : '0.75rem 1.5rem',
                      borderRadius: '25px',
                      cursor: 'pointer',
                      fontSize: isMobile ? '0.9rem' : '1rem',
                      touchAction: 'manipulation'
                    }}
                  >
                    Leaderboard
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Instructions */}
      {!isMobile && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '2rem',
          margin: '2rem auto',
          maxWidth: '800px',
          borderRadius: '20px',
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: '#333', fontSize: '1.3rem' }}>How to Play</h3>
          <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '1rem' }}>
            Move left and right with arrow keys or A/D. Your character will automatically bounce on lily pads. Try to reach new heights!
          </p>
          {isUsernameSet && (
            <p style={{ margin: 0, color: '#4caf50', fontWeight: 'bold', fontSize: '1rem' }}>
              👤 Playing as {username} with {selectedCharacter === 'cooper' ? 'Cooper' : 'Zeek'}: Your scores will be submitted to the global leaderboard!
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      {!isMobile && (
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
            <p style={{ margin: '0 0 1rem 0', fontSize: '1rem' }}>© 2025 PUMP House Game</p>
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
      )}
    </div>
  );
};

export default App;