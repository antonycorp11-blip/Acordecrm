/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';
import { Volume2, RefreshCw, Play, Home, Award, Music, BookOpen } from 'lucide-react';
import { soundEngine } from '../soundEngine';
import { Bird, Obstacle, FloatingText, Particle, AccuracyType, Lesson, UserStats } from '../types';

interface GameCanvasProps {
  mode: 'ENDLESS' | 'LESSON';
  selectedLesson?: Lesson;
  onGameOver: (score: number, stats: { perfects: number; goods: number; misses: number; combo: number }) => void;
  onLessonComplete: (lessonId: number, score: number) => void;
  onGoHome: () => void;
  userStats: UserStats;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  mode,
  selectedLesson,
  onGameOver,
  onLessonComplete,
  onGoHome,
  userStats,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Dynamic Character Color styling
  const charId = userStats.selectedCharacterId || 'bird_classic';
  let charColor = '#FF5F00';
  if (charId === 'eighth_note') charColor = '#22D3EE';
  else if (charId === 'treble_clef') charColor = '#A855F7';
  else if (charId === 'cassette_retro') charColor = '#10B981';

  // React states for overlay screens
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [bpm, setBpm] = useState(mode === 'LESSON' && selectedLesson ? selectedLesson.bpm : 90);
  const [hasStarted, setHasStarted] = useState(false);
  const [showStageSuccess, setShowStageSuccess] = useState(false);

  // Synchronization start states
  const [syncCount, setSyncCount] = useState(0);
  const [isSynced, setIsSynced] = useState(false);

  // Rhythm precision state (0.7x tight to 1.45x wide-open responsive gap difficulty)
  const [rhythmPrecision, setRhythmPrecision] = useState(1.0);

  // High-precision timing refs (to bypass React re-render lag)
  const isPlayingRef = useRef(false);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const bpmRef = useRef(bpm);
  
  // Rhythm precision rating ref
  const rhythmAccuracyRatingRef = useRef(1.0);
  
  // Game metrics tracking
  const tapsCountRef = useRef(0);
  const lastTapTimeRef = useRef(0); // in gameTimeRef.current seconds
  const perfectsRef = useRef(0);
  const goodsRef = useRef(0);
  const missesRef = useRef(0);

  // Synchronization start refs
  const syncCountRef = useRef(0);
  const isSyncedRef = useRef(false);

  // Parallax background and shooting stars tracking refs
  const bgScrollXRef = useRef(0);
  const shootingStarsRef = useRef<{ x: number; y: number; speedX: number; speedY: number; life: number; maxLife: number }[]>([]);
  const lastTapBeatIndexRef = useRef(-1);

  // Time-tracking for metronome sync
  const gameTimeRef = useRef(0); // in seconds
  const lastFrameTimeRef = useRef(0);
  const nextBeatTimeRef = useRef(0);
  const beatIntervalRef = useRef(60 / bpm);
  const beatsInSessionRef = useRef(0);

  // Game assets / positions
  const birdRef = useRef<Bird>({
    y: 200,
    vy: 0,
    size: 16,
    angle: 0,
    flapTime: 0,
    pulseScale: 1,
  });

  const obstaclesRef = useRef<Obstacle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const screenShakeRef = useRef(0);

  // Sync refs to state changes
  useEffect(() => {
    bpmRef.current = bpm;
    beatIntervalRef.current = 60 / bpm;
  }, [bpm]);

  // Initial immediate launch of game loop
  useEffect(() => {
    if (!isPlaying) return;
    
    soundEngine.init();
    startGameLoop();
  }, [isPlaying]);

  // Reset function
  const handleReset = () => {
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setIsPlaying(true);
    setHasStarted(true);
    setShowStageSuccess(false);

    // Reset synchronization
    setSyncCount(0);
    syncCountRef.current = 0;
    setIsSynced(false);
    isSyncedRef.current = false;
    
    // Reset rhythm accuracy / precision factor
    rhythmAccuracyRatingRef.current = 1.0;
    setRhythmPrecision(1.0);

    // Reset game physics
    scoreRef.current = 0;
    comboRef.current = 0;
    maxComboRef.current = 0;
    tapsCountRef.current = 0;
    perfectsRef.current = 0;
    goodsRef.current = 0;
    missesRef.current = 0;

    birdRef.current = {
      y: 220,
      vy: 0,
      size: 16,
      angle: 0,
      flapTime: 0,
      pulseScale: 1,
    };

    obstaclesRef.current = [];
    floatingTextsRef.current = [];
    particlesRef.current = [];
    screenShakeRef.current = 0;
    bgScrollXRef.current = 0;
    shootingStarsRef.current = [];
    lastTapTimeRef.current = 0;
    lastTapBeatIndexRef.current = -1;

    // Reset rhythms
    gameTimeRef.current = 0;
    lastFrameTimeRef.current = performance.now();
    
    const startBpm = mode === 'LESSON' && selectedLesson ? selectedLesson.bpm : 90;
    setBpm(startBpm);
    beatIntervalRef.current = 60 / startBpm;
    nextBeatTimeRef.current = 0.5; // first beat at 0.5s
    beatsInSessionRef.current = 0;
  };

  // Trigger flap action
  // Trigger flap action
  const handleJump = () => {
    if (!isPlayingRef.current) return;

    soundEngine.init();

    const currentSecs = gameTimeRef.current;
    
    // Minimal tap cooldown (30ms) to allow responsive rapid tapping
    if (currentSecs - lastTapTimeRef.current < 0.03) {
      return;
    }
    
    const interval = beatIntervalRef.current;
    const T = interval;
    const H = 68; // Ideal jump height in pixels
    const PERFECT_JUMP_VY = -Math.abs(H / (15 * T)); // Always negative = UPWARD in Canvas
    
    lastTapTimeRef.current = currentSecs;
    tapsCountRef.current += 1;

    // Find the closest past or upcoming beat
    const timeSinceLastBeat = (currentSecs - nextBeatTimeRef.current + interval) % interval;
    const timeToNextBeat = interval - timeSinceLastBeat;

    let deviation = 0;
    if (timeSinceLastBeat < timeToNextBeat) {
      deviation = timeSinceLastBeat; // positive = late
    } else {
      deviation = -timeToNextBeat; // negative = early
    }

    const absDev = Math.abs(deviation);
    let accuracy: AccuracyType = 'MISS';

    // Rhythm thresholds
    if (absDev <= 0.15) {
      accuracy = 'PERFECT';
      perfectsRef.current += 1;
      comboRef.current += 1;
      birdRef.current.vy = PERFECT_JUMP_VY * 1.05;
      birdRef.current.flapTime = 12;
      birdRef.current.pulseScale = 1.35;
      soundEngine.playPerfect();
      spawnParticles(birdRef.current.size * 2, '#FF5F00');
    } else if (absDev <= 0.28) {
      accuracy = 'GOOD';
      goodsRef.current += 1;
      comboRef.current += 1;
      birdRef.current.vy = PERFECT_JUMP_VY;
      birdRef.current.flapTime = 10;
      birdRef.current.pulseScale = 1.2;
      soundEngine.playGood();
      spawnParticles(birdRef.current.size, '#FFFDF9');
    } else if (absDev <= 0.42) {
      accuracy = deviation < 0 ? 'EARLY' : 'LATE';
      birdRef.current.vy = PERFECT_JUMP_VY * 0.95;
      birdRef.current.flapTime = 8;
      comboRef.current = 0;
      soundEngine.playEarlyLate();
    } else {
      accuracy = 'MISS';
      missesRef.current += 1;
      // ALWAYS flap upwards on tap, even if timing is off!
      birdRef.current.vy = PERFECT_JUMP_VY * 0.88;
      birdRef.current.flapTime = 6;
      comboRef.current = 0;
      soundEngine.playMiss();
    }

    // Update dynamic rhythm precision rating
    if (accuracy === 'PERFECT') {
      rhythmAccuracyRatingRef.current = Math.min(1.45, rhythmAccuracyRatingRef.current + 0.12);
    } else if (accuracy === 'GOOD') {
      rhythmAccuracyRatingRef.current = Math.min(1.30, rhythmAccuracyRatingRef.current + 0.06);
    } else if (accuracy === 'EARLY' || accuracy === 'LATE') {
      rhythmAccuracyRatingRef.current = Math.max(0.80, rhythmAccuracyRatingRef.current - 0.08);
    } else if (accuracy === 'MISS') {
      rhythmAccuracyRatingRef.current = Math.max(0.70, rhythmAccuracyRatingRef.current - 0.15);
    }
    setRhythmPrecision(rhythmAccuracyRatingRef.current);

    // Instant sync on first tap!
    if (!isSyncedRef.current) {
      isSyncedRef.current = true;
      setIsSynced(true);
      soundEngine.playLevelUp();
      
      const scrollSpeed = (bpmRef.current / 100) * 2.2;
      const canvas = canvasRef.current;
      const startX = canvas ? canvas.width + 100 : 460;
      obstaclesRef.current = [
        generateObstacle(startX, 0),
        generateObstacle(startX + (beatIntervalRef.current * 4 * 60 * scrollSpeed), 1),
      ];
    }

    // Sync combo refs
    if (isSyncedRef.current) {
      if (comboRef.current > maxComboRef.current) {
        maxComboRef.current = comboRef.current;
        setMaxCombo(comboRef.current);
      }
      setCombo(comboRef.current);
    } else {
      // Don't accumulate score/combos during pre-sync!
      comboRef.current = 0;
      setCombo(0);
    }

    // Spawn floating accuracy banner
    let floatingColor = '#FFFDF9';
    let floatingLabel = 'MISS';
    if (accuracy === 'PERFECT') {
      floatingColor = '#10B981'; // emerald
      floatingLabel = 'PERFEITO!';
    } else if (accuracy === 'GOOD') {
      floatingColor = '#22D3EE'; // cyan
      floatingLabel = 'BOM';
    } else if (accuracy === 'EARLY') {
      floatingColor = '#F59E0B'; // amber
      floatingLabel = 'ADIANTADO';
    } else if (accuracy === 'LATE') {
      floatingColor = '#F97316'; // orange
      floatingLabel = 'ATRASADO';
    } else {
      floatingColor = '#EF4444'; // rose
      floatingLabel = 'FORA!';
    }

    // Add score multiplier on Perfect combos
    if (accuracy === 'PERFECT' && isSyncedRef.current) {
      const bonus = Math.floor(comboRef.current / 5);
      if (bonus > 0) {
        floatingLabel += ` +${bonus}`;
      }
    }

    floatingTextsRef.current.push({
      id: Math.random().toString(),
      text: floatingLabel,
      x: 70, // right above bird
      y: birdRef.current.y - 12,
      color: floatingColor,
      accuracy,
      life: 1.0,
    });
  };

  // Keyboard binding for Spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleJump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Spawn visual pixel-art particles
  const spawnParticles = (count: number, color: string) => {
    const b = birdRef.current;
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x: 60 + Math.random() * 8,
        y: b.y + Math.random() * 8,
        vx: -(1.5 + Math.random() * 2), // blow to left
        vy: -1 + Math.random() * 2,
        size: 3 + Math.random() * 3,
        color,
        life: 1,
        maxLife: 20 + Math.random() * 15,
      });
    }
  };

  const spawnExplosion = (x: number, y: number) => {
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color: i % 2 === 0 ? '#FF5F00' : '#FFFDF9',
        life: 1,
        maxLife: 30 + Math.random() * 20,
      });
    }
  };

  // Core Game Loop
  const startGameLoop = () => {
    isPlayingRef.current = true;
    let animId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle viewport size
    canvas.width = 360;
    canvas.height = 500;

    // Setup first obstacle
    // Distance between obstacles in terms of beats: let's make it 4 beats!
    // At BPM, we place them cleanly
    const scrollSpeed = (bpmRef.current / 100) * 2.2;
    obstaclesRef.current = [
      generateObstacle(canvas.width + 100, 0),
      generateObstacle(canvas.width + 100 + (beatIntervalRef.current * 4 * 60 * scrollSpeed), 1),
    ];

    const loop = (timestamp: number) => {
      if (!isPlayingRef.current) return;

      // Initialize or reset lastFrameTime on the very first frame to prevent massive dt jump
      if (!lastFrameTimeRef.current || lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = timestamp;
      }

      // Calculate dt
      const elapsed = (timestamp - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = timestamp;

      // Limit frame leaps to prevent collision passing
      const dt = Math.min(elapsed, 0.1);
      gameTimeRef.current += dt;

      updateGame(canvas, dt);
      renderGame(ctx, canvas);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  };

  // Obstacle Generation
  const generateObstacle = (xPosition: number, idx: number): Obstacle => {
    const gap = mode === 'LESSON' && selectedLesson ? (130 - selectedLesson.id * 8) : 105; // gap gets narrower
    const minHeight = 50;
    const maxHeight = 300;
    const topHeight = minHeight + Math.random() * (maxHeight - gap - minHeight);
    const bottomHeight = 500 - topHeight - gap;

    // Movement feature for Lesson 3+ or Endless high score
    const isMoving = (mode === 'LESSON' && selectedLesson && selectedLesson.id >= 3) || 
                     (mode === 'ENDLESS' && scoreRef.current > 6);

    return {
      id: idx,
      x: xPosition,
      topHeight,
      bottomHeight,
      passed: false,
      width: 54,
      isMoving,
      direction: Math.random() > 0.5 ? 1 : -1,
      range: 40 + Math.random() * 40,
      initialTopHeight: topHeight,
    };
  };

  // Update Game Logic
  const updateGame = (canvas: HTMLCanvasElement, dt: number) => {
    // 1. Process Metronome Clock Beep
    const currentSecs = gameTimeRef.current;
    if (currentSecs >= nextBeatTimeRef.current) {
      beatsInSessionRef.current += 1;
      const isStrong = beatsInSessionRef.current % 4 === 1;
      
      soundEngine.playTick(isStrong);
      
      // Flash glowing ring on the bird in rhythm
      birdRef.current.pulseScale = 1.25;

      // Advance next beat scheduler
      nextBeatTimeRef.current += beatIntervalRef.current;
    }

    // 2. Physics - Bird falling (Balanced snappier gravity, perfectly frame-rate and metronome-BPM corrected)
    const b = birdRef.current;
    const T = beatIntervalRef.current;
    const H = 68; // Match the tap jump height
    const PHYSICS_GRAVITY = H / (7.5 * T * T);
    b.vy += PHYSICS_GRAVITY * dt;
    
    // Cap vertical velocities (Terminal Velocity limits) to scale dynamically with the metronome BPM
    const PERFECT_JUMP_VY = -H / (15 * T);
    const TERMINAL_VELOCITY = -PERFECT_JUMP_VY * 1.5; // Scale with peak velocity
    const MAX_UPWARD_VELOCITY = PERFECT_JUMP_VY * 1.5; // Scale with peak velocity
    b.vy = Math.max(MAX_UPWARD_VELOCITY, Math.min(TERMINAL_VELOCITY, b.vy));
    
    b.y += b.vy * (60 * dt); // frame-rate independent vertical motion scaling

    // If combo is high (5 or more), spawn blazing fire trail particles
    if (comboRef.current >= 5 && Math.random() < 0.5) {
      const colors = ['#EF4444', '#F97316', '#F59E0B', '#FFD700']; // Red, orange, amber, gold
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      particlesRef.current.push({
        x: 60 - b.size / 2 - Math.random() * 5,
        y: b.y + (Math.random() - 0.5) * 10,
        vx: -1.5 - Math.random() * 2, // shoot backwards
        vy: -0.5 + Math.random() * 1.0,
        size: 2.5 + Math.random() * 3,
        color: randomColor,
        life: 1,
        maxLife: 15 + Math.random() * 10,
      });
    }

    // Dynamic rotation angle based on vertical speed
    b.angle = Math.max(-0.4, Math.min(0.6, b.vy * (0.12 * (0.5 / T))));

    // Decaying pulse scale
    if (b.pulseScale > 1.0) {
      b.pulseScale -= 1.5 * dt;
    } else {
      b.pulseScale = 1.0;
    }

    // Flapping wings decay
    if (b.flapTime > 0) {
      b.flapTime -= 1;
    }

    // Check bottom/top boundaries
    if (b.y + b.size > 440) {
      if (!isSyncedRef.current) {
        // Safe bounce back up in pre-sync state so they can't die!
        b.y = 220;
        b.vy = PERFECT_JUMP_VY * 0.5;
        soundEngine.playGood();
      } else {
        // Hit bottom - GameOver
        triggerCrash(canvas.height - 60);
        return;
      }
    }
    if (b.y - b.size < 5) {
      b.y = 5 + b.size;
      b.vy = -PERFECT_JUMP_VY * 0.1; // Gentle downward push so the bird bounces nicely and never sticks to the top!
    }

    // 3. Scroll and update obstacles
    if (isSyncedRef.current) {
      const scrollSpeed = (bpmRef.current / 100) * 125 * dt; // proportional scroll speed
      
      obstaclesRef.current.forEach((obs) => {
        obs.x -= scrollSpeed;

        const defaultGap = mode === 'LESSON' && selectedLesson ? (130 - selectedLesson.id * 8) : 105;
        
        // Dynamically adjust gap based on rhythm precision! (0.70x to 1.45x)
        const dynamicGap = defaultGap * rhythmAccuracyRatingRef.current;
        const defaultTop = obs.initialTopHeight;
        const defaultBottom = 500 - defaultTop - dynamicGap;

        if (comboRef.current > 0 && obs.x < 240 && obs.x + obs.width > -40) {
          // RHYTHMIC FLOW STATE: Pipes open up and align with the bird's vertical position
          // Aligning is even easier when the player has higher precision!
          const targetGap = Math.max(90, 135 * rhythmAccuracyRatingRef.current);
          const targetTop = Math.max(40, Math.min(460 - targetGap, b.y - targetGap / 2));
          const targetBottom = 500 - targetTop - targetGap;

          // Smoothly morph to flow state targets
          obs.topHeight += (targetTop - obs.topHeight) * 6.5 * dt;
          obs.bottomHeight += (targetBottom - obs.bottomHeight) * 6.5 * dt;
        } else {
          // Standard / Restoring state
          if (obs.isMoving) {
            // Handle standard moving obstacles
            const speed = 35 * dt;
            obs.topHeight += obs.direction * speed;
            
            // Boundaries
            const minTop = 60;
            const maxTop = 260;
            if (obs.topHeight < minTop) {
              obs.topHeight = minTop;
              obs.direction = 1;
            } else if (obs.topHeight > maxTop) {
              obs.topHeight = maxTop;
              obs.direction = -1;
            }
            obs.bottomHeight = 500 - obs.topHeight - dynamicGap;
          } else {
            // Smoothly restore to static position with dynamic gap adjustment
            obs.topHeight += (defaultTop - obs.topHeight) * 6.5 * dt;
            obs.bottomHeight += (defaultBottom - obs.bottomHeight) * 6.5 * dt;
          }
        }

        // Apply strict safety limits to prevent pipe boundaries from going off-screen
        if (obs.topHeight < 40) obs.topHeight = 40;
        if (obs.bottomHeight < 40) obs.bottomHeight = 40;

        // Check pass
        if (!obs.passed && obs.x + obs.width < 60) {
          obs.passed = true;
          scoreRef.current += 1;
          setScore(scoreRef.current);
          
          // Play level-up sound/effects when milestone met
          soundEngine.playPerfect();

          // Stage success in Lesson Mode
          if (mode === 'LESSON' && selectedLesson && scoreRef.current >= selectedLesson.targetPipes) {
            triggerStageSuccess();
          }

          // Speed Up in Endless Mode
          if (mode === 'ENDLESS' && scoreRef.current > 0 && scoreRef.current % 5 === 0) {
            const newBpm = Math.min(180, bpmRef.current + 10);
            setBpm(newBpm);
            bpmRef.current = newBpm;
            beatIntervalRef.current = 60 / newBpm;
            soundEngine.playLevelUp();
            
            floatingTextsRef.current.push({
              id: Math.random().toString(),
              text: `VELOCIDADE UP! ${newBpm} BPM`,
              x: 50,
              y: 160,
              color: '#FF5F00',
              accuracy: 'PERFECT',
              life: 1.2,
            });
          }
        }
      });

      // Clean off-screen obstacles and keep generating
      if (obstaclesRef.current.length > 0 && obstaclesRef.current[0].x + obstaclesRef.current[0].width < -20) {
        obstaclesRef.current.shift();
        
        // Calculate where to spawn next based on clean beat spacing (spaced exactly 4 beats apart!)
        const lastObstacle = obstaclesRef.current[obstaclesRef.current.length - 1];
        const spacing = beatIntervalRef.current * 4 * (bpmRef.current / 100) * 125;
        const nextX = Math.max(canvas.width + 40, lastObstacle.x + spacing);
        
        obstaclesRef.current.push(generateObstacle(nextX, lastObstacle.id + 1));
      }
    }

    // 4. Update Floating Texts
    floatingTextsRef.current.forEach((t) => {
      t.y -= 35 * dt; // float up
      t.life -= dt * 1.5;
    });
    floatingTextsRef.current = floatingTextsRef.current.filter((t) => t.life > 0);

    // 5. Update Particles
    particlesRef.current.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life += 1;
    });
    particlesRef.current = particlesRef.current.filter((p) => p.life < p.maxLife);

    // 6. Shake Screen Decay
    if (screenShakeRef.current > 0) {
      screenShakeRef.current -= dt * 15;
    }

    // 7. Collision Check
    if (isSyncedRef.current) {
      obstaclesRef.current.forEach((obs) => {
        const bx = 60; // Fixed bird X
        const by = b.y;
        const r = b.size - 2;

        // Pipe borders
        const pipeLeft = obs.x;
        const pipeRight = obs.x + obs.width;

        if (bx + r > pipeLeft && bx - r < pipeRight) {
          // Horizontal intersection. Check vertical openings
          if (by - r < obs.topHeight || by + r > 500 - obs.bottomHeight) {
            triggerCrash(by);
          }
        }
      });
    }

    // 8. Background Parallax Offset & Shooting Stars updates
    const currentScrollSpeed = isSyncedRef.current ? ((bpmRef.current / 100) * 125) : 15;
    bgScrollXRef.current += currentScrollSpeed * dt;

    // Spawn random shooting stars occasionally
    if (Math.random() < 0.015 && shootingStarsRef.current.length < 3) {
      shootingStarsRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * 160,
        speedX: -220 - Math.random() * 120,
        speedY: 120 + Math.random() * 100,
        life: 0,
        maxLife: 0.4 + Math.random() * 0.4,
      });
    }

    // Update active shooting stars
    shootingStarsRef.current = shootingStarsRef.current.filter((star) => {
      star.x += star.speedX * dt;
      star.y += star.speedY * dt;
      star.life += dt;
      return star.life < star.maxLife;
    });
  };

  const triggerCrash = (y: number) => {
    isPlayingRef.current = false;
    soundEngine.playCrash();
    screenShakeRef.current = 10;
    spawnExplosion(60, y);

    // Wait a brief moment before navigating to game over screen to let the explosion finish
    setTimeout(() => {
      setIsPlaying(false);
      onGameOver(scoreRef.current, {
        perfects: perfectsRef.current,
        goods: goodsRef.current,
        misses: missesRef.current,
        combo: maxComboRef.current,
      });
    }, 1000);
  };

  const triggerStageSuccess = () => {
    isPlayingRef.current = false;
    soundEngine.playLevelUp();
    setShowStageSuccess(true);
    setIsPlaying(false);

    if (selectedLesson) {
      onLessonComplete(selectedLesson.id, scoreRef.current);
    }
  };

  // Render Frame
  const renderGame = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.save();

    // Screen Shake effect
    if (screenShakeRef.current > 0) {
      const dx = (Math.random() - 0.5) * screenShakeRef.current;
      const dy = (Math.random() - 0.5) * screenShakeRef.current;
      ctx.translate(dx, dy);
    }

    const currentBpm = bpmRef.current;
    
    // Scenery color palettes based on BPM tiers
    let themeBg = '#121212';
    let themeFarMtn = '#151515';
    let themeNearMtn = '#181818';
    let themeGridColor = charColor;
    let themeMoonGlow = charColor;
    let speedMultiplier = 1.0;
    let themeName = 'BASS DUET 🎵';
    
    if (currentBpm < 110) {
      themeBg = '#0b0f19';
      themeFarMtn = '#121828';
      themeNearMtn = '#182238';
      themeGridColor = '34, 211, 238'; // Cyan
      themeMoonGlow = '34, 211, 238';
      speedMultiplier = 1.0;
      themeName = 'ACOUSTIC CHILL 🎵';
    } else if (currentBpm < 140) {
      themeBg = '#1c092c';
      themeFarMtn = '#280f3d';
      themeNearMtn = '#351652';
      themeGridColor = '236, 72, 153'; // Pink
      themeMoonGlow = '236, 72, 153';
      speedMultiplier = 1.4;
      themeName = 'SYNTH OVERDRIVE ⚡';
    } else if (currentBpm < 165) {
      themeBg = '#0c0226';
      themeFarMtn = '#16053e';
      themeNearMtn = '#230b5c';
      themeGridColor = '168, 85, 247'; // Purple
      themeMoonGlow = '168, 85, 247';
      speedMultiplier = 1.8;
      themeName = 'NEON TEMPO 🌌';
    } else {
      themeBg = '#1e0202';
      themeFarMtn = '#300404';
      themeNearMtn = '#460808';
      themeGridColor = '239, 68, 68'; // Crimson Red
      themeMoonGlow = '251, 146, 60'; // Gold/Orange
      speedMultiplier = 2.4;
      themeName = 'HYPER DRUMBEAT 🔥';
    }

    // Clear and background
    ctx.fillStyle = themeBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Timing helper for beat synchronization
    const lastBeatTime = nextBeatTimeRef.current - beatIntervalRef.current;
    const beatProgress = Math.max(0, Math.min(1, (gameTimeRef.current - lastBeatTime) / beatIntervalRef.current));
    const beatPulse = Math.max(0, 1 - beatProgress * 3.2); // sharp pulse on beat, decays in first 30%

    // 1. Draw grid mesh lines (8-bit clean grid, subtly pulsing in signature character color on beat!)
    ctx.strokeStyle = `rgba(${themeGridColor}, ${0.06 + beatPulse * 0.10})`;
    ctx.lineWidth = 1;
    const gridSpacing = 30;
    for (let x = 0; x < canvas.width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 440);
      ctx.stroke();
    }
    for (let y = 0; y < 440; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Capture background scroll value
    const bgScrollX = bgScrollXRef.current;

    // 2. Draw 18 cozy retro stars with slow twinkle + slow parallax scroll
    const starCoords = [
      {x: 25, y: 35, size: 2}, {x: 80, y: 75, size: 1.5}, {x: 140, y: 20, size: 2.5},
      {x: 210, y: 90, size: 1.5}, {x: 280, y: 40, size: 2}, {x: 330, y: 80, size: 1},
      {x: 50, y: 120, size: 1.5}, {x: 110, y: 150, size: 2}, {x: 180, y: 110, size: 2.5},
      {x: 250, y: 140, size: 1.5}, {x: 310, y: 120, size: 2}, {x: 15, y: 200, size: 1},
      {x: 95, y: 230, size: 2}, {x: 165, y: 180, size: 1.5}, {x: 235, y: 220, size: 2.5},
      {x: 345, y: 190, size: 1.5}, {x: 70, y: 50, size: 2.5}, {x: 190, y: 55, size: 2}
    ];
    starCoords.forEach((star, idx) => {
      ctx.save();
      ctx.fillStyle = '#FFFDF9';
      const twinkle = 0.4 + Math.sin(gameTimeRef.current * 4.5 + idx) * 0.35 + beatPulse * 0.35;
      ctx.globalAlpha = Math.max(0.1, Math.min(1.0, twinkle));
      // Parallax star scroll (extremely slow looping scroll)
      const sx = (star.x - bgScrollX * 0.05 * speedMultiplier + canvas.width + 40) % (canvas.width + 40) - 20;
      ctx.fillRect(sx, star.y, star.size, star.size);
      ctx.restore();
    });

    // 3. Draw Retro Glowing Crescent Moon (Pulsates to the beat, colors match character theme!)
    ctx.save();
    const mx = canvas.width - 70;
    const my = 80;
    const mr = 26 * (1.0 + beatPulse * 0.08);
    
    // Draw radiant glow matching current character styling
    const moonGlow = ctx.createRadialGradient(mx, my, mr * 0.3, mx, my, mr * 2.2);
    moonGlow.addColorStop(0, `rgba(${themeMoonGlow}, 0.25)`);
    moonGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(mx, my, mr * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Solid crescent moon base shape
    ctx.fillStyle = '#FFFDF9';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fill();
    
    // Transparent cutout to create crescent look (shaded with background color)
    ctx.fillStyle = themeBg;
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.arc(mx - mr * 0.45, my - mr * 0.15, mr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Draw Shooting Stars with glowing fading tails
    shootingStarsRef.current.forEach(star => {
      ctx.save();
      const progress = star.life / star.maxLife;
      const alpha = 1.0 - progress;
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(star.x, star.y);
      ctx.lineTo(star.x - star.speedX * 0.05, star.y - star.speedY * 0.05);
      ctx.stroke();
      ctx.restore();
    });

    // 5. Floating Parallax Scrolling 8-bit Clouds (Two layers of depth!)
    // Layer 1: Far Slow Clouds
    ctx.save();
    ctx.fillStyle = '#181818';
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 3; i++) {
      const cloudSpeedFactor = 0.12 * speedMultiplier;
      const cx = (canvas.width + 80 - (bgScrollX * cloudSpeedFactor + i * 140)) % (canvas.width + 120) - 40;
      const cy = 30 + (i * 30);
      ctx.fillRect(cx, cy, 36, 10);
      ctx.fillRect(cx + 6, cy - 5, 20, 5);
      ctx.fillRect(cx - 4, cy + 3, 8, 4);
      ctx.fillRect(cx + 32, cy + 3, 8, 4);
    }
    ctx.restore();

    // Layer 2: Mid-Speed Closer Clouds
    ctx.save();
    ctx.fillStyle = '#222222';
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 3; i++) {
      const cloudSpeedFactor = 0.22 * speedMultiplier;
      const cx = (canvas.width + 80 - (bgScrollX * cloudSpeedFactor + i * 160 + 70)) % (canvas.width + 120) - 40;
      const cy = 45 + (i * 40);
      ctx.fillRect(cx, cy, 42, 12);
      ctx.fillRect(cx + 8, cy - 6, 24, 6);
      ctx.fillRect(cx - 5, cy + 3, 10, 5);
      ctx.fillRect(cx + 38, cy + 3, 10, 5);
    }
    ctx.restore();

    // 6. Beat-Reactive Audio Equalizer Columns (Glowing behind far mountains)
    const eqWidth = 14;
    const eqSpacing = 16;
    const startX = 20;
    ctx.save();
    ctx.fillStyle = `rgba(${themeGridColor}, 0.14)`;
    
    for (let i = 0; i < 11; i++) {
      const baseH = 20 + Math.sin(gameTimeRef.current * 2.5 + i) * 12;
      const impulseH = beatPulse * 45 * (0.5 + Math.abs(Math.sin(i * 1.8)) * 0.5);
      const totalH = baseH + impulseH;
      const eqX = startX + i * (eqWidth + eqSpacing);
      const eqY = 440 - totalH;
      
      ctx.fillRect(eqX, eqY, eqWidth, totalH);
      
      // Top high-intensity floating cap line
      ctx.fillStyle = `rgb(${themeGridColor})`;
      ctx.globalAlpha = 0.20 + beatPulse * 0.35;
      ctx.fillRect(eqX, eqY, eqWidth, 3);
      ctx.fillStyle = `rgba(${themeGridColor}, 0.14)`;
    }
    ctx.restore();

    // 7. Parallax Far Distant Mountain Range (Layer 2 - Repeating seamless pattern, bounces on beat!)
    const mountainFarOffset = (bgScrollX * 0.35 * speedMultiplier) % 480;
    ctx.save();
    ctx.fillStyle = themeFarMtn;
    const farBounce = beatPulse * 4;

    // Draw first copy
    ctx.beginPath();
    ctx.moveTo(0 - mountainFarOffset, 440);
    ctx.lineTo(80 - mountainFarOffset, 330 - farBounce);
    ctx.lineTo(160 - mountainFarOffset, 410);
    ctx.lineTo(240 - mountainFarOffset, 310 - farBounce * 1.2);
    ctx.lineTo(320 - mountainFarOffset, 420);
    ctx.lineTo(400 - mountainFarOffset, 320 - farBounce);
    ctx.lineTo(480 - mountainFarOffset, 440);
    ctx.closePath();
    ctx.fill();

    // Draw second copy for flawless infinite wrapping
    ctx.beginPath();
    ctx.moveTo(480 - mountainFarOffset, 440);
    ctx.lineTo(480 + 80 - mountainFarOffset, 330 - farBounce);
    ctx.lineTo(480 + 160 - mountainFarOffset, 410);
    ctx.lineTo(480 + 240 - mountainFarOffset, 310 - farBounce * 1.2);
    ctx.lineTo(480 + 320 - mountainFarOffset, 420);
    ctx.lineTo(480 + 400 - mountainFarOffset, 320 - farBounce);
    ctx.lineTo(480 + 480 - mountainFarOffset, 440);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 8. Parallax Close Mountain Layer (Layer 3 - Repeating seamless pattern, fast scroll, responsive pulse!)
    const mountainNearOffset = (bgScrollX * 0.65 * speedMultiplier) % 360;
    ctx.save();
    ctx.fillStyle = themeNearMtn;
    const nearBounce = beatPulse * 6;

    // Draw first copy
    ctx.beginPath();
    ctx.moveTo(0 - mountainNearOffset, 440);
    ctx.lineTo(40 - mountainNearOffset, 360 - nearBounce);
    ctx.lineTo(90 - mountainNearOffset, 410);
    ctx.lineTo(160 - mountainNearOffset, 330 - nearBounce * 1.3);
    ctx.lineTo(220 - mountainNearOffset, 390);
    ctx.lineTo(290 - mountainNearOffset, 310 - nearBounce);
    ctx.lineTo(360 - mountainNearOffset, 440);
    ctx.closePath();
    ctx.fill();

    // Draw second copy for flawless infinite wrapping
    ctx.beginPath();
    ctx.moveTo(360 - mountainNearOffset, 440);
    ctx.lineTo(360 + 40 - mountainNearOffset, 360 - nearBounce);
    ctx.lineTo(360 + 90 - mountainNearOffset, 410);
    ctx.lineTo(360 + 160 - mountainNearOffset, 330 - nearBounce * 1.3);
    ctx.lineTo(360 + 220 - mountainNearOffset, 390);
    ctx.lineTo(360 + 290 - mountainNearOffset, 310 - nearBounce);
    ctx.lineTo(360 + 360 - mountainNearOffset, 440);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Draw Music Zone Theme Banner
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(10, 8, 140, 18);
    ctx.strokeStyle = `rgba(${themeGridColor}, 0.5)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 8, 140, 18);
    
    ctx.fillStyle = '#FFFDF9';
    ctx.font = '700 8px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${themeName}`, 14, 20);
    ctx.restore();

    // Draw Obstacles
    obstaclesRef.current.forEach((obs) => {
      const isFlowActive = comboRef.current > 0 && obs.x < 240 && obs.x + obs.width > -40;

      // Draw a glowing neon aura/shadow around the pipes if alignment is active!
      if (isFlowActive) {
        ctx.save();
        ctx.strokeStyle = charColor;
        ctx.globalAlpha = 0.35 + Math.sin(gameTimeRef.current * 15) * 0.15;
        ctx.lineWidth = 14;
        ctx.lineJoin = 'round';
        
        // Glow for top pipe
        ctx.strokeRect(obs.x, -10, obs.width, obs.topHeight + 10);
        ctx.strokeRect(obs.x - 4, obs.topHeight - 20, obs.width + 8, 20);

        // Glow for bottom pipe
        const bY = 500 - obs.bottomHeight;
        ctx.strokeRect(obs.x, bY, obs.width, obs.bottomHeight + 10);
        ctx.strokeRect(obs.x - 4, bY, obs.width + 8, 20);
        ctx.restore();
      }

      // Determine obstacle style based on BPM
      let obstacleStyle: 'PIPE' | 'SQUARE' | 'CRYSTAL' | 'SONIC' = 'PIPE';
      if (currentBpm < 110) {
        obstacleStyle = 'PIPE';
      } else if (currentBpm < 140) {
        obstacleStyle = 'SQUARE';
      } else if (currentBpm < 165) {
        obstacleStyle = 'CRYSTAL';
      } else {
        obstacleStyle = 'SONIC';
      }

      ctx.save();
      // Setup base style
      ctx.fillStyle = '#FFFDF9';
      ctx.strokeStyle = isFlowActive ? charColor : (obstacleStyle === 'PIPE' ? '#000000' : `rgb(${themeGridColor})`);
      ctx.lineWidth = 3.5;

      if (obstacleStyle === 'PIPE') {
        // ---- STYLE 1: CLASSIC NEON CYLINDER PIPES (BPM < 110) ----
        // 1. Top Obstacle
        ctx.fillRect(obs.x, 0, obs.width, obs.topHeight);
        ctx.strokeRect(obs.x, -10, obs.width, obs.topHeight + 10);
        // Top pipe cap details
        ctx.fillStyle = '#FFFDF9';
        ctx.fillRect(obs.x - 4, obs.topHeight - 18, obs.width + 8, 18);
        ctx.strokeRect(obs.x - 4, obs.topHeight - 18, obs.width + 8, 18);
        // 8-bit lines inside cap
        ctx.beginPath();
        ctx.moveTo(obs.x + 6, obs.topHeight - 9);
        ctx.lineTo(obs.x + obs.width - 6, obs.topHeight - 9);
        ctx.strokeStyle = isFlowActive ? charColor : '#000000';
        ctx.stroke();

        // 2. Bottom Obstacle
        const bY = 500 - obs.bottomHeight;
        ctx.fillStyle = '#FFFDF9';
        ctx.fillRect(obs.x, bY, obs.width, obs.bottomHeight);
        ctx.strokeRect(obs.x, bY, obs.width, obs.bottomHeight + 10);
        // Bottom pipe cap details
        ctx.fillStyle = '#FFFDF9';
        ctx.fillRect(obs.x - 4, bY, obs.width + 8, 18);
        ctx.strokeRect(obs.x - 4, bY, obs.width + 8, 18);
        // 8-bit lines inside cap
        ctx.beginPath();
        ctx.moveTo(obs.x + 6, bY + 9);
        ctx.lineTo(obs.x + obs.width - 6, bY + 9);
        ctx.strokeStyle = isFlowActive ? charColor : '#000000';
        ctx.stroke();

      } else if (obstacleStyle === 'SQUARE') {
        // ---- STYLE 2: RETRO SQUARE SOUND AMPLIFIERS (110 - 139 BPM) ----
        // 1. Top Obstacle
        ctx.fillRect(obs.x, 0, obs.width, obs.topHeight);
        ctx.strokeRect(obs.x, -5, obs.width, obs.topHeight + 5);
        // Draw retro speaker cones inside top
        ctx.fillStyle = `rgba(${themeGridColor}, 0.2)`;
        ctx.fillRect(obs.x + 6, 10, obs.width - 12, obs.topHeight - 20);
        ctx.strokeRect(obs.x + 6, 10, obs.width - 12, obs.topHeight - 20);
        // Sound waves lines
        ctx.fillStyle = `rgb(${themeGridColor})`;
        const waveCount = Math.max(1, Math.floor(obs.topHeight / 25));
        for (let i = 0; i < waveCount; i++) {
          const wy = 20 + i * 22;
          if (wy < obs.topHeight - 15) {
            ctx.fillRect(obs.x + 12, wy, obs.width - 24, 4);
          }
        }

        // 2. Bottom Obstacle
        const bY = 500 - obs.bottomHeight;
        ctx.fillStyle = '#FFFDF9';
        ctx.fillRect(obs.x, bY, obs.width, obs.bottomHeight);
        ctx.strokeRect(obs.x, bY, obs.width, obs.bottomHeight + 10);
        // Speaker cones inside bottom
        ctx.fillStyle = `rgba(${themeGridColor}, 0.2)`;
        ctx.fillRect(obs.x + 6, bY + 10, obs.width - 12, obs.bottomHeight - 20);
        ctx.strokeRect(obs.x + 6, bY + 10, obs.width - 12, obs.bottomHeight - 20);
        // Sound wave lines inside bottom
        ctx.fillStyle = `rgb(${themeGridColor})`;
        const bWaveCount = Math.max(1, Math.floor(obs.bottomHeight / 25));
        for (let i = 0; i < bWaveCount; i++) {
          const wy = bY + 15 + i * 22;
          if (wy < 440 - 10) {
            ctx.fillRect(obs.x + 12, wy, obs.width - 24, 4);
          }
        }

      } else if (obstacleStyle === 'CRYSTAL') {
        // ---- STYLE 3: CRYSTALLINE NEON TRIANGLE COLUMNS (140 - 164 BPM) ----
        // Top triangle stalactite
        ctx.beginPath();
        ctx.moveTo(obs.x, 0);
        ctx.lineTo(obs.x + obs.width, 0);
        ctx.lineTo(obs.x + obs.width / 2, obs.topHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Inner crystal shard glow lines
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width / 2, 5);
        ctx.lineTo(obs.x + obs.width / 2, obs.topHeight - 8);
        ctx.strokeStyle = `rgb(${themeGridColor})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Bottom triangle stalagmite
        const bY = 500 - obs.bottomHeight;
        ctx.fillStyle = '#FFFDF9';
        ctx.beginPath();
        ctx.moveTo(obs.x, 440);
        ctx.lineTo(obs.x + obs.width, 440);
        ctx.lineTo(obs.x + obs.width / 2, bY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Inner crystal shard glow lines
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width / 2, 435);
        ctx.lineTo(obs.x + obs.width / 2, bY + 8);
        ctx.strokeStyle = `rgb(${themeGridColor})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();

      } else {
        // ---- STYLE 4: GLOWING SONIC EQ SPECTRUM TOWERS (>=165 BPM) ----
        const segmentH = 15;
        const segmentGap = 4;
        
        // Top Stack
        const topSegments = Math.floor(obs.topHeight / (segmentH + segmentGap));
        for (let i = 0; i < topSegments; i++) {
          const sy = i * (segmentH + segmentGap);
          const isHigh = i > topSegments * 0.7;
          ctx.fillStyle = isHigh ? '#EF4444' : '#FFFDF9';
          ctx.fillRect(obs.x, sy, obs.width, segmentH);
          ctx.strokeRect(obs.x, sy, obs.width, segmentH);
          
          ctx.fillStyle = `rgb(${themeGridColor})`;
          ctx.fillRect(obs.x + obs.width / 2 - 3, sy + segmentH / 2 - 3, 6, 6);
        }

        // Bottom Stack
        const bY = 500 - obs.bottomHeight;
        const bottomSegments = Math.floor(obs.bottomHeight / (segmentH + segmentGap));
        for (let i = 0; i < bottomSegments; i++) {
          const sy = 440 - segmentH - i * (segmentH + segmentGap);
          const isHigh = i > bottomSegments * 0.7;
          ctx.fillStyle = isHigh ? '#EF4444' : '#FFFDF9';
          ctx.fillRect(obs.x, sy, obs.width, segmentH);
          ctx.strokeRect(obs.x, sy, obs.width, segmentH);
          
          ctx.fillStyle = `rgb(${themeGridColor})`;
          ctx.fillRect(obs.x + obs.width / 2 - 3, sy + segmentH / 2 - 3, 6, 6);
        }
      }
      ctx.restore();
    });

    // Draw floor (orange clean strip)
    ctx.fillStyle = '#FF5F00';
    ctx.fillRect(0, 440, canvas.width, 60);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 440);
    ctx.lineTo(canvas.width, 440);
    ctx.stroke();

    // Draw diagonal warning hashes on floor (synchronized with bgScrollX)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    const scrollOffset = bgScrollXRef.current % 20;
    for (let x = -20; x < canvas.width + 20; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x - scrollOffset, 440);
      ctx.lineTo(x - 5 - scrollOffset, 500);
      ctx.stroke();
    }

    // Draw Particles
    particlesRef.current.forEach((p) => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });

    // Draw The Bird (Orange pixel-art chunky bird)
    const b = birdRef.current;
    ctx.save();
    ctx.translate(60, b.y);
    ctx.rotate(b.angle);

    // Sync pulse scale with the metronome rhythm
    const scale = b.pulseScale;
    ctx.scale(scale, scale);

    // 8-bit Fire Flame Jet behind character if combo is >= 5!
    if (comboRef.current >= 5) {
      ctx.save();
      // subtle flicker opacity
      ctx.globalAlpha = 0.75 + Math.sin(performance.now() * 0.03) * 0.2;
      
      // Draw roaring pixel-art flame jetting out of the back (negative X)
      ctx.fillStyle = '#EF4444'; // Red outer flame
      ctx.fillRect(-b.size - 6, -6, 5, 12);
      ctx.fillRect(-b.size - 10, -2, 5, 5);
      ctx.fillRect(-b.size - 1, 3, 5, 8);
      
      ctx.fillStyle = '#F97316'; // Orange mid flame
      ctx.fillRect(-b.size - 4, -4, 4, 8);
      ctx.fillRect(-b.size - 8, -1, 5, 3);
      ctx.fillRect(-b.size + 1, 4, 3, 5);
      
      ctx.fillStyle = '#F59E0B'; // Yellow core
      ctx.fillRect(-b.size - 2, -2, 3, 4);
      ctx.fillRect(-b.size - 5, 0, 3, 2);
      ctx.restore();
    }

    // Glowing Beat Ring (pulsing outward under the bird)
    if (scale > 1.0) {
      ctx.strokeStyle = 'rgba(255, 95, 0, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, b.size * 2 * (scale - 0.2), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw glowing spinning octagonal Rhythm Shield if rhythm combo is active!
    if (comboRef.current > 0) {
      ctx.save();
      // Counter-rotate the shield so it spins independently of the bird's vertical dive angle
      ctx.rotate(-b.angle - gameTimeRef.current * 4);
      
      ctx.strokeStyle = charColor;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6 + Math.sin(gameTimeRef.current * 20) * 0.25;
      
      ctx.beginPath();
      const shieldSize = b.size + 15 + Math.sin(gameTimeRef.current * 12) * 2;
      // Draw a chunky 8-bit octagon
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const x = Math.cos(angle) * shieldSize;
        const y = Math.sin(angle) * shieldSize;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // Draw orbit energy pixel dots
      ctx.fillStyle = charColor;
      ctx.globalAlpha = 0.8;
      for (let i = 0; i < 3; i++) {
        const orbitAngle = gameTimeRef.current * 6 + (i * Math.PI * 2) / 3;
        const ox = Math.cos(orbitAngle) * shieldSize;
        const oy = Math.sin(orbitAngle) * shieldSize;
        ctx.fillRect(ox - 2.5, oy - 2.5, 5, 5);
      }
      ctx.restore();
    }

    // Drawing a custom chunky 8-bit character based on selectedCharacterId with outlines
    // Using outer scope charId

    if (charId === 'eighth_note') {
      // EIGHTH_NOTE character wearing headphones!
      // Outline/Border
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.ellipse(-3, 4, 7, 5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      
      // Stem
      ctx.fillRect(1, -9, 3.5, 13);
      // Flag
      ctx.fillRect(3, -9, 6, 4);
      ctx.fillRect(7, -7, 2.5, 9);

      // Main color
      ctx.fillStyle = '#22D3EE'; // Cyan
      ctx.beginPath();
      ctx.ellipse(-3, 4, 5.5, 3.5, -0.2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#22D3EE';
      ctx.fillRect(2, -9, 2, 12);
      ctx.fillRect(4.5, -8.5, 4, 3);
      ctx.fillRect(7.5, -6.5, 1.5, 8);

      // Eye
      ctx.fillStyle = '#FFFDF9';
      ctx.fillRect(-5, 2, 4, 4);
      ctx.fillStyle = '#000000';
      ctx.fillRect(-3, 3, 2, 2);

      // Beak (musical note beak!)
      ctx.fillStyle = '#FFB300';
      ctx.fillRect(1, 4, 3, 4);

      // Headphones
      // Left Ear Cup
      ctx.fillStyle = '#FFFDF9';
      ctx.fillRect(-10, 2, 3.5, 5);
      ctx.fillStyle = '#000000';
      ctx.strokeRect(-10, 2, 3.5, 5);

      // Right Ear Cup
      ctx.fillStyle = '#FFFDF9';
      ctx.fillRect(2.5, 2, 3.5, 5);
      ctx.fillStyle = '#000000';
      ctx.strokeRect(2.5, 2, 3.5, 5);

      // Headband Arc
      ctx.strokeStyle = '#FFFDF9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-3, 2, 6.5, Math.PI, 0);
      ctx.stroke();

    } else if (charId === 'treble_clef') {
      // TREBLE_CLEF character!
      ctx.fillStyle = '#000000';
      ctx.fillRect(-2, -10, 5, 20); // center line
      ctx.fillRect(-6, -7, 12, 5);  // top loop
      ctx.fillRect(-8, 1, 13, 5);   // middle loop
      ctx.fillRect(-9, 5, 10, 5);    // bottom circle

      ctx.fillStyle = '#A855F7'; // Purple
      ctx.fillRect(-1, -9, 3, 18);
      ctx.fillRect(-5, -6, 10, 3);
      ctx.fillRect(-7, 2, 11, 3);
      ctx.fillRect(-8, 6, 8, 3);

      // Eye
      ctx.fillStyle = '#FFFDF9';
      ctx.fillRect(1, -2, 4, 4);
      ctx.fillStyle = '#000000';
      ctx.fillRect(3, -1, 2, 2);

      // Beak
      ctx.fillStyle = '#FFB300';
      ctx.fillRect(4.5, 1.5, 3.5, 3.5);

      // Headphones
      ctx.fillStyle = '#FFFDF9';
      ctx.fillRect(-7, -1, 2, 4);
      ctx.fillRect(4, -1, 2, 4);

    } else if (charId === 'cassette_retro') {
      // CASSETTE character!
      ctx.fillStyle = '#000000';
      ctx.fillRect(-12, -8, 24, 16);

      ctx.fillStyle = '#10B981'; // Retro Emerald
      ctx.fillRect(-10, -6, 20, 12);

      // Spools
      ctx.fillStyle = '#FFFDF9';
      ctx.fillRect(-5, -2, 3, 3);
      ctx.fillRect(2, -2, 3, 3);
      ctx.fillStyle = '#000000';
      ctx.fillRect(-4, -1, 1, 1);
      ctx.fillRect(3, -1, 1, 1);

      // Beak
      ctx.fillStyle = '#FFB300';
      ctx.fillRect(10, -1, 3, 3);

      // Headphones
      ctx.fillStyle = '#A855F7';
      ctx.fillRect(-13, -3, 2, 6);
      ctx.fillRect(11, -3, 2, 6);

    } else {
      // BIRD_CLASSIC (default)
      // Outline / Border
      ctx.fillStyle = '#000000';
      ctx.fillRect(-11, -11, 22, 22);

      // Body
      ctx.fillStyle = '#FF5F00'; // Pure deep orange
      ctx.fillRect(-9, -9, 18, 18);

      // Wing (flapping effect)
      ctx.fillStyle = '#FFFDF9'; // Clean white
      if (b.flapTime > 4) {
        // Wing pointing up
        ctx.fillRect(-12, -7, 6, 12);
        ctx.strokeRect(-12, -7, 6, 12);
      } else {
        // Wing normal
        ctx.fillRect(-10, -3, 8, 8);
        ctx.strokeRect(-10, -3, 8, 8);
      }

      // Big Eye (retro style)
      ctx.fillStyle = '#FFFDF9';
      ctx.fillRect(2, -7, 6, 6);
      ctx.fillStyle = '#000000';
      ctx.fillRect(5, -6, 3, 3); // Pupil

      // Cute yellow beak
      ctx.fillStyle = '#FFB300';
      ctx.fillRect(8, -1, 4, 5);
    }

    ctx.restore();

    // Draw Floating Accuracy Text
    floatingTextsRef.current.forEach((t) => {
      ctx.font = 'bold 11px monospace';
      ctx.fillStyle = t.color;
      
      // Black background shadow for 8-bit contrast
      ctx.fillStyle = '#000000';
      ctx.fillText(t.text, t.x + 1, t.y + 1);
      
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    });

    // 8. Rhythmic Ribbon/Ticker (Taiko Style!) at the top
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 10, canvas.width, 36);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.strokeRect(-2, 10, canvas.width + 4, 36);

    // Central Hit Zone Bracket [  |  ]
    const hitZoneX = 60; // perfectly aligned with the bird's horizontal line!
    ctx.strokeStyle = '#FF5F00';
    ctx.lineWidth = 3;
    
    // Left bracket
    ctx.beginPath();
    ctx.moveTo(hitZoneX - 12, 14);
    ctx.lineTo(hitZoneX - 12, 42);
    ctx.stroke();

    // Right bracket
    ctx.beginPath();
    ctx.moveTo(hitZoneX + 12, 14);
    ctx.lineTo(hitZoneX + 12, 42);
    ctx.stroke();

    // Core alignment tick
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hitZoneX, 16);
    ctx.lineTo(hitZoneX, 40);
    ctx.stroke();

    // Labels for the visualizer
    ctx.font = '7px monospace';
    ctx.fillStyle = '#888888';
    ctx.fillText('ADIANTADO', hitZoneX - 52, 21);
    ctx.fillText('ATRASADO', hitZoneX + 20, 21);

    // Draw beats (diamonds) moving from right to left!
    // We calculate beats relative to our gameTime and tempo
    const interval = beatIntervalRef.current;
    const scrollSecs = gameTimeRef.current;
    
    // Draw 3 ahead beats and 1 past beat
    const currentBeatIndex = Math.floor(scrollSecs / interval);
    
    for (let i = currentBeatIndex - 1; i <= currentBeatIndex + 3; i++) {
      if (i < 0) continue;
      
      const beatTime = i * interval + 0.5; // synced first beat at 0.5s
      const timeDiff = beatTime - scrollSecs;
      
      // Calculate screen pixel position based on scroll speed
      // When timeDiff is 0, the beat is exactly at hitZoneX (60px)
      // Speed multiplier matches the physical obstacle speed
      const pixelX = hitZoneX + timeDiff * (bpmRef.current / 100) * 125;

      if (pixelX > 0 && pixelX < canvas.width) {
        // Draw beat diamond
        ctx.fillStyle = i % 4 === 0 ? '#FF5F00' : '#FFFDF9'; // Accent on first bar beats
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(pixelX, 21); // top
        ctx.lineTo(pixelX + 6, 28); // right
        ctx.lineTo(pixelX, 35); // bottom
        ctx.lineTo(pixelX - 6, 28); // left
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Little visual ring pulsing outward on the beat
        if (timeDiff < 0.05 && timeDiff > -0.05) {
          ctx.strokeStyle = 'rgba(255, 95, 0, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pixelX, 28, 12, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  };

  return (
    <div className="flex-1 flex flex-col relative bg-[#121212]" ref={containerRef}>
      {/* Dynamic HUD Headers */}
      <div className="h-10 bg-[#1e1e1e] border-b-2 border-black flex items-center justify-between px-4 text-white font-mono text-[11px] shrink-0 z-20">
        <div className="flex items-center gap-1.5">
          <Music size={12} className="text-[#FF5F00] animate-pulse" />
          <span className="font-black text-[#FF5F00]">{bpm} BPM</span>
        </div>
        <div className="flex items-center gap-3">
          <div>
            PONTOS: <span className="font-black text-white">{score}</span>
            {mode === 'LESSON' && selectedLesson && (
              <span className="text-gray-500 text-[9px]">/{selectedLesson.targetPipes}</span>
            )}
          </div>
          {combo > 1 && (
            <div className="bg-[#FF5F00] text-white px-1.5 py-0.2 rounded font-black text-[9px] animate-bounce">
              COMBO x{combo}
            </div>
          )}
        </div>
      </div>

      {/* Main interactive Canvas */}
      <div 
        className="flex-1 w-full bg-[#121212] flex items-center justify-center relative cursor-pointer overflow-hidden touch-none select-none"
        onPointerDown={(e) => {
          e.preventDefault();
          handleJump();
        }}
      >
        <canvas ref={canvasRef} className="block border-b-4 border-black" />

        {/* Start Game overlay */}
        {!hasStarted && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center z-40">
            {mode === 'LESSON' && selectedLesson ? (
              <div className="bg-[#FFFDF9] border-4 border-black p-4 rounded-xl shadow-[4px_4px_0px_#000] max-w-[280px] mb-5 text-black">
                <span className="font-mono text-[9px] font-black bg-[#FF5F00] text-white px-2 py-0.5 rounded uppercase">
                  AULA {selectedLesson.id}
                </span>
                <h3 className="font-mono text-sm font-black uppercase text-black mt-2">
                  {selectedLesson.title}
                </h3>
                <p className="font-mono text-[10px] text-gray-700 leading-normal mt-1">
                  Velocidade: <strong>{selectedLesson.bpm} BPM</strong>
                  <br />
                  Objetivo: Superar <strong>{selectedLesson.targetPipes} obstáculos</strong> no ritmo!
                </p>
              </div>
            ) : (
              <div className="mb-4">
                <h3 className="font-mono text-md font-black uppercase text-[#FF5F00]">MODO INFINITO</h3>
                <p className="font-mono text-[10px] text-gray-400 max-w-[260px] mx-auto mt-1">
                  Supere canos em ritmo contínuo. A velocidade aumenta 10 BPM a cada 5 canos ultrapassados!
                </p>
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="h-12 bg-[#FF5F00] hover:bg-[#ff7722] text-white border-4 border-black rounded-xl px-8 font-mono text-xs font-black uppercase shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
              id="start-session-btn"
            >
              COMEÇAR LIÇÃO
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                soundEngine.playGood();
                onGoHome();
              }}
              className="mt-4 font-mono text-[10px] text-gray-500 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <Home size={11} />
              <span>VOLTAR AO MENU</span>
            </button>
          </div>
        )}

        {/* Pre-Sync synchronization overlay */}
        {isPlaying && !isSynced && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-6 text-center z-40 pointer-events-none select-none animate-in fade-in duration-300">
            <span className="font-mono text-[9px] text-gray-400 uppercase tracking-widest mb-1.5">
              Sinta a batida do metrônomo
            </span>
            <h3 className="font-mono text-xs font-black text-[#FF5F00] uppercase tracking-wide mb-4">
              Sincronize 4 batidas para decolar!
            </h3>
            <div className="flex gap-3 mb-5">
              {[0, 1, 2, 3].map((index) => (
                <div 
                  key={index}
                  className={`w-9 h-9 border-4 border-black rounded-xl flex items-center justify-center transition-all duration-150 ${
                    index < syncCount 
                      ? 'bg-[#FF5F00] text-white scale-110 shadow-[2px_2px_0px_#000]' 
                      : 'bg-gray-900 border-gray-700 text-gray-600 shadow-none'
                  }`}
                >
                  <span className="font-mono text-xs font-black">
                    {index < syncCount ? '✓' : index + 1}
                  </span>
                </div>
              ))}
            </div>
            <p className="font-mono text-[9px] text-gray-500 leading-normal max-w-[220px]">
              Clique na tela ou use [Espaço] em sincronia com o som do metrônomo.
            </p>
          </div>
        )}

        {/* Stage Success Overlay */}
        {showStageSuccess && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-6 text-center z-40">
            <h2 className="font-mono text-2xl font-black text-emerald-500 uppercase tracking-widest mb-1">
              PARABÉNS!
            </h2>
            <p className="font-mono text-[10px] text-gray-400 uppercase mb-5">
              Lição Concluída com Sucesso!
            </p>

            <div className="bg-[#FFFDF9] border-4 border-black p-4 rounded-xl shadow-[4px_4px_0px_#000] max-w-[280px] mb-6 text-black flex flex-col gap-1.5 font-mono text-[10px]">
              <div className="flex justify-between border-b border-gray-300 pb-1">
                <span className="text-gray-500">LIÇÃO COMPLETA:</span>
                <span className="font-bold text-[#FF5F00]">AULA {selectedLesson?.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Canos Superados:</span>
                <span className="font-bold">{score}</span>
              </div>
              <div className="flex justify-between">
                <span>Maior Combo:</span>
                <span className="font-bold text-emerald-600">{maxCombo}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-[200px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  soundEngine.playPerfect();
                  onGoHome();
                }}
                className="h-10 bg-emerald-500 hover:bg-emerald-600 text-white border-2 border-black rounded-lg px-4 font-mono text-[10px] font-black uppercase shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                id="next-stage-btn"
              >
                PROSSEGUIR
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rhythmic Guide Assist Footer with Live Precision Meter */}
      {hasStarted && isSynced && isPlaying && (
        <div className="h-14 bg-[#181818] border-t-2 border-black flex flex-col justify-center px-4 shrink-0 pointer-events-none select-none">
          <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-wider mb-1.5">
            <span className="text-gray-400 font-bold flex items-center gap-1">
              <span 
                className="w-1.5 h-1.5 rounded-full" 
                style={{ 
                  backgroundColor: rhythmPrecision >= 1.25 ? '#10B981' :
                                   rhythmPrecision >= 1.05 ? '#22D3EE' :
                                   rhythmPrecision >= 0.9  ? '#FFFDF9' : '#EF4444'
                }} 
              />
              Precisão: <span 
                style={{ 
                  color: rhythmPrecision >= 1.25 ? '#10B981' :
                         rhythmPrecision >= 1.05 ? '#22D3EE' :
                         rhythmPrecision >= 0.9  ? '#FFFDF9' : '#EF4444'
                }}
              >
                {rhythmPrecision >= 1.25 ? "FLUXO PERFEITO (Abertura Máxima)" :
                 rhythmPrecision >= 1.05 ? "BOM RITMO (Abertura Expandida)" :
                 rhythmPrecision >= 0.9  ? "RITMO ESTÁVEL (Abertura Padrão)" :
                                           "DESALINHADO (Abertura Estreita!)"}
              </span>
            </span>
            <span 
              className="font-black"
              style={{ 
                color: rhythmPrecision >= 1.05 ? charColor : '#9CA3AF'
              }}
            >
              x{rhythmPrecision.toFixed(2)}
            </span>
          </div>
          
          {/* Flat 8-bit meter */}
          <div className="w-full h-2 bg-black border border-gray-800 rounded-full overflow-hidden p-0.5 flex">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                backgroundColor: rhythmPrecision >= 1.25 ? '#10B981' :
                                 rhythmPrecision >= 1.05 ? '#22D3EE' :
                                 rhythmPrecision >= 0.9  ? '#FFFDF9' : '#EF4444',
                width: `${Math.max(10, Math.min(100, ((rhythmPrecision - 0.7) / (1.45 - 0.7)) * 100))}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
