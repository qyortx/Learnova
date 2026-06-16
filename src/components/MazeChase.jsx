import React, { useState, useEffect, useRef } from 'react';
import { 
  Trophy, Heart, Clock, ArrowLeft, RotateCcw, 
  HelpCircle, Home, CheckCircle2, AlertOctagon, HelpCircle as HelpIcon,
  ArrowUp, ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight
} from 'lucide-react';
import { sound } from '../utils/sound';

// Grid size: 17 columns x 15 rows
const COLS = 17;
const ROWS = 15;

const MAZE_TEMPLATE = [
  "WWWWWWWWWWWWWWWWW",
  "WA..W.......W..BW",
  "W.W.W.WWWWW.W.W.W",
  "W.W.........W.W.W",
  "W.WWWWW.W.WWWWW.W",
  "W.......W.......W",
  "WWW.WWW.W.WWW.WWW",
  "W...W.......W...W",
  "W.W.W.WWWWW.W.W.W",
  "W.W...........W.W",
  "W.WWWWW.W.WWWWW.W",
  "W.W.........W.W.W",
  "W.W.W.WWWWW.W.W.W",
  "WC..W.......W..DW",
  "WWWWWWWWWWWWWWWWW"
];

// Position mappings for Zones inside the template grid
const ZONES = {
  A: { x: 1, y: 1, color: '#f59e0b', optionIndex: 0 },
  B: { x: 15, y: 1, color: '#ec4899', optionIndex: 1 },
  C: { x: 1, y: 13, color: '#3b82f6', optionIndex: 2 },
  D: { x: 15, y: 13, color: '#10b981', optionIndex: 3 }
};

export default function MazeChase({ game, onBack }) {
  const { title, desc, questions } = game;

  const [gameState, setGameState] = useState('intro'); // 'intro', 'playing', 'ended'
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [time, setTime] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState(null); // { text, type }
  
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const animationFrameRef = useRef(null);

  // References for game state to use inside the requestAnimationFrame loop
  const gameStateRef = useRef({
    player: { x: 8, y: 9, gridX: 8, gridY: 9, nextDir: null, currentDir: null, speed: 0.07 },
    ghosts: [
      { x: 3, y: 3, gridX: 3, gridY: 3, currentDir: 'right', speed: 0.04, color: '#ef4444' },
      { x: 13, y: 3, gridX: 13, gridY: 3, currentDir: 'left', speed: 0.04, color: '#a855f7' },
      { x: 8, y: 3, gridX: 8, gridY: 3, currentDir: 'down', speed: 0.045, color: '#fb923c' }
    ],
    invincibilityFrames: 0,
    activeCorrectZoneIndex: 0,
    questions: questions,
    currentQIndex: 0
  });

  // Keep question state synced in ref
  useEffect(() => {
    const currentQ = questions[currentQIndex];
    if (currentQ) {
      gameStateRef.current.activeCorrectZoneIndex = currentQ.correct;
      gameStateRef.current.currentQIndex = currentQIndex;
    }
  }, [currentQIndex, questions]);

  // Handle timer
  useEffect(() => {
    if (gameState === 'playing') {
      timerRef.current = setInterval(() => {
        setTime(t => t + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState]);

  const handleStartGame = () => {
    sound.playClick();
    setGameState('playing');
    setTime(0);
    setScore(0);
    setLives(3);
    setCurrentQIndex(0);
    setFeedbackMsg(null);

    // Initialize ref values
    gameStateRef.current.player = { x: 8, y: 9, gridX: 8, gridY: 9, nextDir: null, currentDir: null, speed: 0.07 };
    gameStateRef.current.ghosts = [
      { x: 3, y: 3, gridX: 3, gridY: 3, currentDir: 'right', speed: 0.038, color: '#ef4444' },
      { x: 13, y: 3, gridX: 13, gridY: 3, currentDir: 'left', speed: 0.038, color: '#a855f7' },
      { x: 8, y: 3, gridX: 8, gridY: 3, currentDir: 'down', speed: 0.043, color: '#fb923c' }
    ];
    gameStateRef.current.invincibilityFrames = 0;
    gameStateRef.current.currentQIndex = 0;
  };

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameState !== 'playing') return;

      let keyDir = null;
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') keyDir = 'up';
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') keyDir = 'down';
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') keyDir = 'left';
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') keyDir = 'right';

      if (keyDir) {
        e.preventDefault(); // Prevent page scrolling
        gameStateRef.current.player.nextDir = keyDir;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Handle virtual D-pad buttons (compact fallback)
  const handleDPadPress = (dir) => {
    if (gameState !== 'playing') return;
    sound.playJump();
    gameStateRef.current.player.nextDir = dir;
  };

  // Game loop & canvas drawing
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let isRunning = true;

    // Helper functions for movement
    const isWall = (gx, gy) => {
      if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return true;
      return MAZE_TEMPLATE[gy][gx] === 'W';
    };

    const getZoneAt = (gx, gy) => {
      const type = MAZE_TEMPLATE[gy]?.[gx];
      if (['A', 'B', 'C', 'D'].includes(type)) {
        return ZONES[type];
      }
      return null;
    };

    const getGhostDirections = (gx, gy, currentDir) => {
      const dirs = [];
      const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
      
      const potential = [
        { name: 'up', dx: 0, dy: -1 },
        { name: 'down', dx: 0, dy: 1 },
        { name: 'left', dx: -1, dy: 0 },
        { name: 'right', dx: 1, dy: 0 }
      ];

      potential.forEach(p => {
        if (!isWall(gx + p.dx, gy + p.dy) && p.name !== opposite[currentDir]) {
          dirs.push(p.name);
        }
      });

      if (dirs.length === 0) {
        dirs.push(opposite[currentDir]);
      }
      return dirs;
    };

    // Main update & render loop
    const loop = () => {
      if (!isRunning) return;

      const state = gameStateRef.current;
      const player = state.player;
      
      // Update Invincibility
      if (state.invincibilityFrames > 0) {
        state.invincibilityFrames--;
      }

      // --- PLAYER GRID-TARGET MOVEMENT ---
      const pdx = player.gridX - player.x;
      const pdy = player.gridY - player.y;
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy);

      if (pdist < player.speed) {
        // Snap to target center
        player.x = player.gridX;
        player.y = player.gridY;

        // Determine direction to use
        let dirToUse = player.currentDir;
        if (player.nextDir) {
          let nextDx = 0, nextDy = 0;
          if (player.nextDir === 'up') nextDy = -1;
          if (player.nextDir === 'down') nextDy = 1;
          if (player.nextDir === 'left') nextDx = -1;
          if (player.nextDir === 'right') nextDx = 1;

          if (!isWall(player.gridX + nextDx, player.gridY + nextDy)) {
            player.currentDir = player.nextDir;
            dirToUse = player.nextDir;
            player.nextDir = null;
          }
        }

        // Apply movement vector to target grid
        if (dirToUse) {
          let currDx = 0, currDy = 0;
          if (dirToUse === 'up') currDy = -1;
          if (dirToUse === 'down') currDy = 1;
          if (dirToUse === 'left') currDx = -1;
          if (dirToUse === 'right') currDx = 1;

          if (!isWall(player.gridX + currDx, player.gridY + currDy)) {
            player.gridX += currDx;
            player.gridY += currDy;
          } else {
            player.currentDir = null; // Blocked by wall, stop
          }
        }
      } else {
        // Move towards target cell
        if (player.x < player.gridX) player.x += player.speed;
        if (player.x > player.gridX) player.x -= player.speed;
        if (player.y < player.gridY) player.y += player.speed;
        if (player.y > player.gridY) player.y -= player.speed;
      }

      // --- GHOST GRID-TARGET MOVEMENT ---
      state.ghosts.forEach(ghost => {
        const gdx = ghost.gridX - ghost.x;
        const gdy = ghost.gridY - ghost.y;
        const gdist = Math.sqrt(gdx * gdx + gdy * gdy);

        if (gdist < ghost.speed) {
          ghost.x = ghost.gridX;
          ghost.y = ghost.gridY;

          // Decide next cell
          const availableDirs = getGhostDirections(ghost.gridX, ghost.gridY, ghost.currentDir);
          
          let bestDir = availableDirs[0];
          let minDistance = Infinity;

          availableDirs.forEach(d => {
            let gx = ghost.gridX;
            let gy = ghost.gridY;
            if (d === 'up') gy -= 1;
            if (d === 'down') gy += 1;
            if (d === 'left') gx -= 1;
            if (d === 'right') gx += 1;

            const distToPlayer = Math.abs(gx - player.gridX) + Math.abs(gy - player.gridY);
            const noise = Math.random() * 0.3; // noise prevents ghosts from bundling together
            if (distToPlayer + noise < minDistance) {
              minDistance = distToPlayer + noise;
              bestDir = d;
            }
          });

          ghost.currentDir = bestDir;

          let nextDx = 0, nextDy = 0;
          if (bestDir === 'up') nextDy = -1;
          if (bestDir === 'down') nextDy = 1;
          if (bestDir === 'left') nextDx = -1;
          if (bestDir === 'right') nextDx = 1;

          ghost.gridX += nextDx;
          ghost.gridY += nextDy;
        } else {
          // Move towards target cell
          if (ghost.x < ghost.gridX) ghost.x += ghost.speed;
          if (ghost.x > ghost.gridX) ghost.x -= ghost.speed;
          if (ghost.y < ghost.gridY) ghost.y += ghost.speed;
          if (ghost.y > ghost.gridY) ghost.y -= ghost.speed;
        }
      });

      // --- COLLISION DETECTIONS ---
      // 1. Ghost Collisions (checked visual distance)
      if (state.invincibilityFrames === 0) {
        state.ghosts.forEach(ghost => {
          const dist = Math.sqrt(Math.pow(player.x - ghost.x, 2) + Math.pow(player.y - ghost.y, 2));
          if (dist < 0.6) {
            // Collision!
            sound.playIncorrect();
            state.invincibilityFrames = 60; // 1 second invincibility
            
            // Reset player positions
            player.x = 8;
            player.y = 9;
            player.gridX = 8;
            player.gridY = 9;
            player.currentDir = null;
            player.nextDir = null;
            
            setLives(l => {
              const newLives = l - 1;
              if (newLives <= 0) {
                setGameState('ended');
                sound.playGameOver();
              }
              return newLives;
            });
            setFeedbackMsg({ text: 'Tertabrak Monster! 👾', type: 'hit' });
            setTimeout(() => setFeedbackMsg(null), 1500);
          }
        });
      }

      // 2. Zone Answer Collisions (only check when player snaps to grid)
      if (player.x === player.gridX && player.y === player.gridY) {
        const zone = getZoneAt(player.gridX, player.gridY);
        if (zone) {
          const correctIndex = state.activeCorrectZoneIndex;

          if (zone.optionIndex === correctIndex) {
            // Correct!
            sound.playCorrect();
            setScore(s => s + 100);
            setFeedbackMsg({ text: 'Jawaban Benar! 🎉 (+100 Poin)', type: 'correct' });
            
            // Reset position for next question
            player.x = 8;
            player.y = 9;
            player.gridX = 8;
            player.gridY = 9;
            player.currentDir = null;
            player.nextDir = null;

            setTimeout(() => {
              setFeedbackMsg(null);
              setCurrentQIndex(qIdx => {
                const nextIdx = qIdx + 1;
                if (nextIdx >= state.questions.length) {
                  setGameState('ended');
                  sound.playWin();
                }
                return nextIdx;
              });
            }, 1500);
          } else {
            // Wrong Answer!
            sound.playIncorrect();
            setFeedbackMsg({ text: 'Jawaban Salah! ❌ Coba lagi', type: 'wrong' });
            
            player.x = 8;
            player.y = 9;
            player.gridX = 8;
            player.gridY = 9;
            player.currentDir = null;
            player.nextDir = null;

            setLives(l => {
              const newLives = l - 1;
              if (newLives <= 0) {
                setGameState('ended');
                sound.playGameOver();
              }
              return newLives;
            });

            setTimeout(() => setFeedbackMsg(null), 1500);
          }
        }
      }

      // --- RENDERING CANVAS ---
      const cellW = canvas.width / COLS;
      const cellH = canvas.height / ROWS;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Maze Grid Walls
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const type = MAZE_TEMPLATE[r][c];
          
          if (type === 'W') {
            ctx.fillStyle = '#111326'; // Dark outer block
            ctx.fillRect(c * cellW, r * cellH, cellW, cellH);

            ctx.strokeStyle = '#22254e'; // Neon blue/violet borders
            ctx.lineWidth = 1;
            ctx.strokeRect(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2);
          }
        }
      }

      // Draw Zones with Answer Options (directly rendering option text instead of A, B, C, D)
      const currentQ = state.questions[state.currentQIndex];
      if (currentQ) {
        Object.keys(ZONES).forEach(key => {
          const zone = ZONES[key];
          const isCorrect = zone.optionIndex === state.activeCorrectZoneIndex;
          const optionText = currentQ.options[zone.optionIndex];

          if (optionText === undefined) return; // skip if option doesn't exist

          // Pulse border effect
          const pulse = 1 + Math.sin(Date.now() / 150) * 0.08;

          // Semi-translucent dark background for zone
          ctx.fillStyle = 'rgba(10, 11, 18, 0.7)';
          ctx.fillRect(zone.x * cellW, zone.y * cellH, cellW, cellH);

          // Glowing border
          ctx.strokeStyle = zone.color;
          ctx.lineWidth = isCorrect ? 3 : 1.5;
          ctx.shadowColor = zone.color;
          ctx.shadowBlur = isCorrect ? 8 * pulse : 2;
          ctx.strokeRect(zone.x * cellW + 2, zone.y * cellH + 2, cellW - 4, cellH - 4);
          ctx.shadowBlur = 0; // reset shadow

          // Measure text width to render a beautiful text pill badge centered over the zone
          ctx.font = 'bold 9px Inter, system-ui, sans-serif';
          const textWidth = ctx.measureText(optionText).width;
          const badgeW = Math.max(cellW * 1.6, textWidth + 12);
          const badgeH = 18;
          const bx = zone.x * cellW + cellW / 2 - badgeW / 2;
          const by = zone.y * cellH + cellH / 2 - badgeH / 2;

          // Draw glassmorphic badge background
          ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
          ctx.strokeStyle = zone.color;
          ctx.lineWidth = 1;
          
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(bx, by, badgeW, badgeH, 6);
          } else {
            ctx.rect(bx, by, badgeW, badgeH);
          }
          ctx.fill();
          ctx.stroke();

          // Write Option Text directly
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(optionText, zone.x * cellW + cellW / 2, zone.y * cellH + cellH / 2 + 0.5);
        });
      }

      // Draw Player (Pacman Smiley)
      const px = player.x * cellW + cellW / 2;
      const py = player.y * cellH + cellH / 2;
      const playerRadius = Math.min(cellW, cellH) * 0.42;

      if (state.invincibilityFrames === 0 || Math.floor(state.invincibilityFrames / 4) % 2 === 0) {
        ctx.beginPath();
        ctx.arc(px, py, playerRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24'; // Golden yellow
        ctx.fill();

        // Eye looking in movement direction
        ctx.fillStyle = '#000';
        let eyeX = px;
        let eyeY = py;
        if (player.currentDir === 'up') eyeY -= 3;
        else if (player.currentDir === 'down') eyeY += 3;
        else if (player.currentDir === 'left') eyeX -= 3;
        else if (player.currentDir === 'right') eyeX += 3;
        else eyeY -= 1; // looking slightly up normally
        
        ctx.beginPath();
        ctx.arc(eyeX, eyeY, playerRadius * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Ghosts (Monsters)
      state.ghosts.forEach(ghost => {
        const gx = ghost.x * cellW + cellW / 2;
        const gy = ghost.y * cellH + cellH / 2;
        const r = Math.min(cellW, cellH) * 0.42;

        ctx.fillStyle = ghost.color;
        ctx.beginPath();
        ctx.arc(gx, gy - r * 0.1, r, Math.PI, 0, false); // Top dome
        ctx.lineTo(gx + r, gy + r);
        
        // Tentacle wave
        const tentacleWaves = 3;
        for (let i = 0; i < tentacleWaves; i++) {
          const waveX = gx + r - (i * 2 * r) / tentacleWaves;
          const offset = Math.sin(Date.now() / 80 + i) * 2.5;
          ctx.lineTo(waveX, gy + r + offset);
        }
        
        ctx.lineTo(gx - r, gy);
        ctx.closePath();
        ctx.fill();

        // Ghost Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(gx - r * 0.35, gy - r * 0.15, r * 0.24, 0, Math.PI * 2);
        ctx.arc(gx + r * 0.35, gy - r * 0.15, r * 0.24, 0, Math.PI * 2);
        ctx.fill();

        // Ghost Pupils
        ctx.fillStyle = '#000';
        let pupilDx = 0;
        let pupilDy = 0;
        if (ghost.currentDir === 'left') pupilDx = -1.5;
        if (ghost.currentDir === 'right') pupilDx = 1.5;
        if (ghost.currentDir === 'up') pupilDy = -1.5;
        if (ghost.currentDir === 'down') pupilDy = 1.5;

        ctx.beginPath();
        ctx.arc(gx - r * 0.35 + pupilDx, gy - r * 0.15 + pupilDy, r * 0.09, 0, Math.PI * 2);
        ctx.arc(gx + r * 0.35 + pupilDx, gy - r * 0.15 + pupilDy, r * 0.09, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState]);

  const currentQ = questions[currentQIndex];

  return (
    <div style={styles.container}>
      {/* Top Header Navigation */}
      <div style={styles.headerNav}>
        <button onClick={() => { sound.playClick(); onBack(); }} style={styles.backBtn}>
          <ArrowLeft size={18} /> Keluar
        </button>
        <span style={styles.gameTitleText}>{title}</span>
      </div>

      {gameState === 'intro' && (
        /* Game Introduction Screen */
        <div className="glass-panel animate-fade-in" style={styles.introCard}>
          <div style={{ ...styles.gameBadge, background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' }}>👾 Pengejaran Labirin</div>
          <h2 style={styles.title}>{title}</h2>
          <p style={styles.desc}>{desc || 'Gunakan tombol arah keyboard (Arrow Keys / WASD) untuk mengendalikan karakter. Arahkan karakter langsung ke kotak jawaban yang benar di dalam labirin dan hindari kejaran monster!'}</p>
          
          <div style={styles.metaRow}>
            <div style={styles.metaItem}>
              <HelpIcon size={20} color="var(--secondary)" />
              <span>{questions.length} Pertanyaan</span>
            </div>
            <div style={styles.metaItem}>
              <Heart size={20} color="var(--danger)" />
              <span>3 Kesempatan Nyawa</span>
            </div>
          </div>

          <button onClick={handleStartGame} className="btn btn-primary" style={styles.startBtn}>
            Mulai Bermain
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        /* Gameplay Panel */
        <div style={styles.playLayout} className="animate-fade-in">
          {/* Stats Bar */}
          <div className="glass-panel" style={styles.statsBar}>
            <div style={styles.stat}>
              <Trophy size={18} color="var(--warning)" />
              <div>
                <span style={styles.statLabel}>SKOR</span>
                <span style={styles.statValue}>{score}</span>
              </div>
            </div>
            <div style={styles.stat}>
              <Heart size={18} color="var(--danger)" />
              <div>
                <span style={styles.statLabel}>NYAWA</span>
                <span style={{ ...styles.statValue, color: lives === 1 ? 'var(--danger)' : 'white', display: 'flex', gap: '2px' }}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Heart 
                      key={i} 
                      size={16} 
                      fill={i < lives ? 'var(--danger)' : 'transparent'} 
                      color={i < lives ? 'var(--danger)' : 'rgba(255,255,255,0.2)'} 
                    />
                  ))}
                </span>
              </div>
            </div>
            <div style={styles.stat}>
              <Clock size={18} color="var(--primary)" />
              <div>
                <span style={styles.statLabel}>WAKTU</span>
                <span style={styles.statValue}>{time}s</span>
              </div>
            </div>
          </div>

          {/* Question Banner (Options grid removed as per instructions) */}
          {currentQ && (
            <div className="glass-panel" style={styles.questionBanner}>
              <div style={styles.qHeader}>
                <span style={styles.qProgress}>SOAL {currentQIndex + 1} DARI {questions.length}</span>
              </div>
              <h3 style={styles.qText}>{currentQ.q}</h3>
            </div>
          )}

          {/* Game Canvas Container */}
          <div style={styles.canvasContainer}>
            <canvas 
              ref={canvasRef} 
              width={510} 
              height={450} 
              style={styles.canvas}
            />

            {/* Collision Feedback Overlay */}
            {feedbackMsg && (
              <div style={{
                ...styles.feedbackOverlay,
                backgroundColor: feedbackMsg.type === 'correct' 
                  ? 'rgba(16, 185, 129, 0.85)' 
                  : feedbackMsg.type === 'wrong' 
                    ? 'rgba(239, 68, 68, 0.85)' 
                    : 'rgba(249, 115, 22, 0.85)'
              }} className="animate-pop">
                <span style={styles.feedbackText}>{feedbackMsg.text}</span>
              </div>
            )}
          </div>

          {/* Virtual D-pad (Extremely compact helper for touch support, kept simple) */}
          <div style={styles.dpadContainer}>
            <div style={styles.dpadRow}>
              <button onClick={() => handleDPadPress('up')} style={styles.dpadBtn} className="btn btn-secondary">
                <ArrowUp size={16} />
              </button>
            </div>
            <div style={styles.dpadRow}>
              <button onClick={() => handleDPadPress('left')} style={styles.dpadBtn} className="btn btn-secondary">
                <ArrowLeftIcon size={16} />
              </button>
              <div style={{ width: '30px' }}></div>
              <button onClick={() => handleDPadPress('right')} style={styles.dpadBtn} className="btn btn-secondary">
                <ArrowRight size={16} />
              </button>
            </div>
            <div style={styles.dpadRow}>
              <button onClick={() => handleDPadPress('down')} style={styles.dpadBtn} className="btn btn-secondary">
                <ArrowDown size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === 'ended' && (
        /* Ending Summary Screen */
        <div className="glass-panel animate-fade-in" style={styles.endedCard}>
          <div style={styles.trophyIcon}>{lives > 0 ? '🏆' : '💀'}</div>
          <h2 style={styles.victoryTitle}>{lives > 0 ? 'Misi Selesai!' : 'Game Over'}</h2>
          <p style={styles.victorySubtitle}>
            {lives > 0 
              ? 'Luar biasa! Anda berhasil menaklukkan labirin kuis ini!' 
              : 'Jangan menyerah! Coba lagi untuk mengalahkan monster labirin.'}
          </p>

          <div style={styles.scoreBoardGrid}>
            <div style={styles.scoreItem}>
              <span style={styles.scoreVal}>{score}</span>
              <span style={styles.scoreLbl}>Total Skor</span>
            </div>
            <div style={styles.scoreItem}>
              <span style={styles.scoreVal}>{time} Detik</span>
              <span style={styles.scoreLbl}>Waktu Bermain</span>
            </div>
            <div style={styles.scoreItem}>
              <span style={styles.scoreVal}>{lives} / 3</span>
              <span style={styles.scoreLbl}>Sisa Nyawa</span>
            </div>
          </div>

          <div style={styles.endActions}>
            <button onClick={() => { sound.playClick(); onBack(); }} className="btn btn-secondary">
              <Home size={18} /> Menu Utama
            </button>
            <button onClick={handleStartGame} className="btn btn-primary">
              <RotateCcw size={18} /> Main Lagi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '750px',
    margin: '0 auto',
    padding: '10px 15px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    height: '100vh',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  headerNav: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    width: '100%',
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    flexShrink: 0
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontFamily: 'var(--font-display)',
    fontWeight: '600',
    fontSize: '0.9rem'
  },
  gameTitleText: {
    fontWeight: '700',
    fontSize: '1.1rem',
    color: 'white',
    fontFamily: 'var(--font-display)'
  },
  introCard: {
    padding: '30px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px'
  },
  gameBadge: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '700',
    fontFamily: 'var(--font-display)'
  },
  title: {
    fontSize: '1.8rem',
    background: 'linear-gradient(135deg, #fff 40%, #db2777 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  desc: {
    color: 'var(--text-muted)',
    lineHeight: '1.5',
    fontSize: '0.95rem',
    maxWidth: '520px'
  },
  metaRow: {
    display: 'flex',
    gap: '15px',
    marginTop: '5px'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.85rem',
    color: 'white',
    background: 'rgba(255,255,255,0.03)',
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)'
  },
  startBtn: {
    marginTop: '10px',
    padding: '12px 28px',
    fontSize: '1rem'
  },
  playLayout: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    overflow: 'hidden'
  },
  statsBar: {
    display: 'flex',
    justifyContent: 'space-around',
    padding: '8px 12px',
    alignItems: 'center',
    width: '100%',
    maxWidth: '510px',
    flexShrink: 0
  },
  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  statLabel: {
    display: 'block',
    fontSize: '0.6rem',
    color: 'var(--text-muted)',
    fontWeight: '700',
    letterSpacing: '0.05em'
  },
  statValue: {
    display: 'block',
    fontSize: '1rem',
    fontWeight: '800',
    color: 'white',
    fontFamily: 'var(--font-display)'
  },
  questionBanner: {
    width: '100%',
    maxWidth: '510px',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    flexShrink: 0
  },
  qHeader: {
    display: 'flex',
    justifyContent: 'center'
  },
  qProgress: {
    fontSize: '0.7rem',
    color: 'var(--secondary)',
    fontWeight: '800',
    letterSpacing: '0.05em'
  },
  qText: {
    fontSize: '1.1rem',
    textAlign: 'center',
    color: 'white',
    lineHeight: '1.3'
  },
  canvasContainer: {
    position: 'relative',
    width: '510px',
    height: '450px',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 15px 30px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)',
    maxWidth: '100%',
    maxHeight: 'calc(100vh - 230px)', // ensure canvas dynamically shrinks to fit viewport
    aspectRatio: '17/15',
    flexShrink: 1
  },
  canvas: {
    display: 'block',
    background: '#07080d',
    width: '100%',
    height: '100%'
  },
  feedbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    color: 'white',
    backdropFilter: 'blur(2px)'
  },
  feedbackText: {
    fontSize: '1.2rem',
    fontWeight: '800',
    textAlign: 'center',
    padding: '12px 24px',
    background: 'rgba(0,0,0,0.4)',
    borderRadius: '10px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
  },
  dpadContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
    marginTop: '5px',
    background: 'rgba(255,255,255,0.01)',
    padding: '6px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.04)',
    width: '100%',
    maxWidth: '180px',
    flexShrink: 0
  },
  dpadRow: {
    display: 'flex',
    gap: '3px'
  },
  dpadBtn: {
    width: '36px',
    height: '36px',
    padding: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px'
  },
  endedCard: {
    padding: '30px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
    maxWidth: '520px',
    margin: '0 auto'
  },
  trophyIcon: {
    fontSize: '3.5rem',
    animation: 'float 3s ease-in-out infinite'
  },
  victoryTitle: {
    fontSize: '1.8rem',
    color: 'white'
  },
  victorySubtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    marginTop: '-6px'
  },
  scoreBoardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px',
    width: '100%',
    margin: '8px 0'
  },
  scoreItem: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '12px 6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  scoreVal: {
    fontSize: '1.3rem',
    fontWeight: '800',
    color: '#ec4899',
    fontFamily: 'var(--font-display)'
  },
  scoreLbl: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: '600'
  },
  endActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '10px',
    width: '100%'
  }
};
