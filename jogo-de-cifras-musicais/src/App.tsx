import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  BookOpen, 
  Award, 
  Trophy, 
  HelpCircle, 
  Heart, 
  Compass, 
  Music, 
  Zap, 
  ChevronRight, 
  CheckCircle2, 
  Sparkles, 
  ArrowLeft,
  Shield,
  Crosshair,
  Flame,
  RefreshCw,
  Globe,
  Layers,
  Target
} from "lucide-react";

import { NoteMapping, GameState, Meteor, Laser, Particle, Star, PowerUp, PowerUpType, Boss, BossLaser } from "./types";
import { modulesData } from "./data/modules";
import { scenariosData } from "./data/scenarios";
import { audio } from "./audio";

// Internal Canvas resolution constants
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 700;

export default function App() {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    highScore: 0,
    lives: 3,
    combo: 0,
    maxCombo: 0,
    level: 1,
    currentModuleId: 1,
    activeTarget: null,
    isPlaying: false,
    isGameOver: false,
    showingChallenge: false,
    challengeTimer: 0,
    gameTime: 0,
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [showModulesModal, setShowModulesModal] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [campaignMode, setCampaignMode] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);
  const [audioInited, setAudioInited] = useState(false);

  // Target shift & Scenario alert states
  const [shiftAlert, setShiftAlert] = useState<{ name: string; cipher: string } | null>(null);
  const [scenarioNotice, setScenarioNotice] = useState<{ name: string; description: string } | null>(null);

  // Mobile Controls States
  const [autoFire, setAutoFire] = useState(false);
  const isShootButtonPressed = useRef(false);
  const joystickVector = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Scenario state (5 unique visual environments)
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);

  // Progression: 3 hits complete a target note!
  const [targetHitCount, setTargetHitCount] = useState(0);
  const targetHitCountRef = useRef(0);
  const targetsCompletedInModuleRef = useRef(0);
  const accuracyStreakRef = useRef(0); // Sustained accuracy streak tracker!
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [targetRequired] = useState(3); 
  const [completedTargets, setCompletedTargets] = useState<string[]>([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);

  const updateTargetHitCount = (val: number) => {
    targetHitCountRef.current = val;
    setTargetHitCount(val);
  };

  // Score Multiplier calculation: Streak + Module level difficulty + Boss Phase
  const calculateMultiplier = (): number => {
    const base = 1.0;
    // Sustained accuracy streak bonus (+0.25x per 2 consecutive correct hits, max +3.0x)
    const streakBonus = Math.min(3.0, Math.floor(accuracyStreakRef.current / 2) * 0.25);
    // Level difficulty bonus (+0.5x per module index)
    const moduleBonus = currentModuleIndex * 0.5;
    // Boss Phase bonus (+1.5x in Phase 1, +3.0x in Phase 2)
    let bossBonus = 0;
    if (bossRef.current.active) {
      bossBonus = bossRef.current.phase === 2 ? 3.0 : 1.5;
    }
    const total = Number((base + streakBonus + moduleBonus + bossBonus).toFixed(1));
    return Math.max(1.0, total);
  };

  const handleToggleBGM = () => {
    initAudioCtx();
    const nextState = !bgmEnabled;
    setBgmEnabled(nextState);
    audio.toggleBGM(nextState);
  };

  // --- REFS FOR THE HIGH FREQUENCY CANVAS LOOP ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameLoopRef = useRef<number | null>(null);

  const keysPressed = useRef<Record<string, boolean>>({});
  const playerX = useRef(250);
  const playerY = useRef(620);
  const damageFlash = useRef(0);
  const screenShake = useRef(0);
  const invincibilityFrames = useRef(0);
  const isDragging = useRef(false);
  const lastShootTime = useRef(0);
  const lastTargetShiftTime = useRef(performance.now());
  const activeTargetRef = useRef<NoteMapping | null>(null);

  // Sync activeTargetRef with state
  useEffect(() => {
    activeTargetRef.current = gameState.activeTarget;
  }, [gameState.activeTarget]);

  // Active Power-up timers
  const activePowerUps = useRef<{ spreadTimer: number; speedTimer: number; shieldCount: number }>({
    spreadTimer: 0,
    speedTimer: 0,
    shieldCount: 0,
  });

  // Dynamic game arrays
  const lasersRef = useRef<Laser[]>([]);
  const meteorsRef = useRef<Meteor[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const starsRef = useRef<Star[]>([]);
  
  // Boss entity state
  const bossRef = useRef<Boss>({
    active: false,
    name: "CHEFÃO SINFÔNICO",
    maxHp: 100,
    hp: 100,
    x: 250,
    y: 80,
    width: 100,
    height: 55,
    cipher: "C",
    targetNote: { name: "DÓ", cipher: "C", frequencies: [261.63, 329.63, 392.0] },
    phase: 1,
    shootTimer: 0,
    dirX: 1.8,
  });
  const bossLasersRef = useRef<BossLaser[]>([]);

  // Floating text indicators (e.g. "+10", "ERROU!") inside canvas
  const floatingTextsRef = useRef<Array<{
    id: number;
    x: number;
    y: number;
    text: string;
    color: string;
    opacity: number;
    vy: number;
    size?: number;
  }>>([]);

  const gameRef = useRef({
    lastSpawnTime: 0,
  });

  // Load high score on mount
  useEffect(() => {
    const savedHighScore = localStorage.getItem("cifras_estelares_highscore");
    if (savedHighScore) {
      setGameState((prev) => ({ ...prev, highScore: parseInt(savedHighScore, 10) }));
    }

    // Initialize Starfield once
    const starList: Star[] = [];
    for (let i = 0; i < 50; i++) {
      starList.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2.5 + 0.5,
        speed: Math.random() * 2.5 + 0.5,
      });
    }
    starsRef.current = starList;
  }, []);

  // Sync sound settings with audio engine
  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    audio.toggleSound(nextState);
    if (nextState) {
      audio.resume();
    }
  };

  // Safe initialize audio on any interaction
  const initAudioCtx = () => {
    if (!audioInited) {
      audio.init();
      audio.resume();
      setAudioInited(true);
    }
  };

  // --- GAMEPLAY CONTROL TRIGGERS ---
  
  const startNewModule = (moduleId: number) => {
    initAudioCtx();
    const modIdx = modulesData.findIndex((m) => m.id === moduleId);
    if (modIdx === -1) return;

    setCurrentModuleIndex(modIdx);
    setCurrentTargetIndex(0);
    setCompletedTargets([]);
    updateTargetHitCount(0);
    targetsCompletedInModuleRef.current = 0;
    accuracyStreakRef.current = 0;
    bossRef.current.active = false;
    bossLasersRef.current = [];
    powerUpsRef.current = [];
    activePowerUps.current = { spreadTimer: 0, speedTimer: 0, shieldCount: 0 };
    lastTargetShiftTime.current = performance.now();

    const firstTarget = modulesData[modIdx].notes[0];

    setGameState((prev) => ({
      ...prev,
      score: prev.score,
      lives: 3,
      combo: 0,
      currentModuleId: moduleId,
      activeTarget: firstTarget,
      isPlaying: true,
      isGameOver: false,
      showingChallenge: true,
    }));

    audio.setBossMode(false);
    audio.startBGM();
    triggerChallengeScreen(firstTarget);
    setGameStarted(true);
  };

  const startCampaign = () => {
    initAudioCtx();
    setCampaignMode(true);
    setGameState((prev) => ({
      ...prev,
      score: 0,
      lives: 3,
      combo: 0,
      level: 1,
    }));
    startNewModule(1);
  };

  const triggerChallengeScreen = (target: NoteMapping) => {
    setGameState((prev) => ({ ...prev, showingChallenge: true }));
    // Clear obstacles on screen to let player prepare
    meteorsRef.current = [];
    lasersRef.current = [];
    bossLasersRef.current = [];
    
    // Play target chord preview
    setTimeout(() => {
      audio.playChord(target.frequencies, 1.2);
    }, 200);

    // Freeze briefly for preview
    setTimeout(() => {
      setGameState((prev) => ({ ...prev, showingChallenge: false }));
    }, 1100);
  };

  const resetGame = () => {
    initAudioCtx();
    bossRef.current.active = false;
    bossLasersRef.current = [];
    powerUpsRef.current = [];
    activePowerUps.current = { spreadTimer: 0, speedTimer: 0, shieldCount: 0 };
    lastTargetShiftTime.current = performance.now();
    accuracyStreakRef.current = 0;

    setGameState((prev) => ({
      ...prev,
      score: 0,
      lives: 3,
      combo: 0,
      isGameOver: false,
      showingChallenge: true,
    }));
    setCompletedTargets([]);
    updateTargetHitCount(0);
    targetsCompletedInModuleRef.current = 0;
    
    const mod = modulesData[currentModuleIndex];
    const target = mod.notes[0];
    setCurrentTargetIndex(0);
    setGameState((prev) => ({ ...prev, activeTarget: target }));
    audio.setBossMode(false);
    audio.startBGM();
    triggerChallengeScreen(target);
  };

  // Sudden Dynamic Target Switch ("Nota alvo mudar do nada")
  const triggerSuddenTargetSwitch = () => {
    if (bossRef.current.active) return; // Don't shift target during Boss fight

    const currentModule = modulesData[currentModuleIndex];
    const currentTarget = activeTargetRef.current || gameState.activeTarget;
    const candidates = currentModule.notes.filter((n) => n.cipher !== currentTarget?.cipher);
    
    if (candidates.length === 0) return;

    const newTarget = candidates[Math.floor(Math.random() * candidates.length)];
    const newTargetIndex = currentModule.notes.findIndex((n) => n.cipher === newTarget.cipher);
    if (newTargetIndex !== -1) {
      setCurrentTargetIndex(newTargetIndex);
    }
    updateTargetHitCount(0); // Reset hit count so player builds 0/3 -> 1/3 -> 2/3 -> 3/3 on the new note!
    activeTargetRef.current = newTarget;
    setGameState((prev) => ({ ...prev, activeTarget: newTarget }));
    lastTargetShiftTime.current = performance.now();

    // 1. Immediately update existing meteors on screen to match newTarget (at most 1 target)
    let assignedTarget = false;
    meteorsRef.current.forEach((m) => {
      if (!assignedTarget && m.cipher === newTarget.cipher) {
        m.isTarget = true;
        assignedTarget = true;
      } else {
        m.isTarget = false;
      }
    });

    // 2. Spawn 1 fresh meteor with the NEW target note if none were on screen
    if (!assignedTarget) {
      spawnMeteor(newTarget, true);
    }

    // 3. Show prominent banner overlay alert for 3.5 seconds
    setShiftAlert({ name: newTarget.name, cipher: newTarget.cipher });
    setTimeout(() => {
      setShiftAlert(null);
    }, 3500);

    // Sound effect & audio preview of new note
    audio.playTargetShift();
    setTimeout(() => {
      audio.playChord(newTarget.frequencies, 0.8);
    }, 150);

    // Visual feedback
    screenShake.current = 10;
    addExplosion(CANVAS_WIDTH / 2, 180, "#fbbf24", 25);
  };

  // Spawn Power-up items
  const spawnPowerUp = (x: number, y: number) => {
    const types: PowerUpType[] = ['spread', 'speed', 'shield', 'bomb', 'life'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const metaMap: Record<PowerUpType, { color: string; label: string }> = {
      spread: { color: "#a855f7", label: "⚡ TRIPLO" },
      speed: { color: "#ec4899", label: "🚀 TURBO" },
      shield: { color: "#3b82f6", label: "🛡️ ESCUDO" },
      bomb: { color: "#eab308", label: "💥 BOMBA" },
      life: { color: "#ef4444", label: "❤️ VIDA" },
    };

    const meta = metaMap[type];
    powerUpsRef.current.push({
      id: Math.random(),
      x,
      y,
      radius: 16,
      type,
      speedY: 1.8,
      color: meta.color,
      label: meta.label,
    });
  };

  // Spawn Boss entity (Space Monster)
  const spawnBoss = () => {
    const currentModule = modulesData[currentModuleIndex];
    const targetNote = gameState.activeTarget || currentModule.notes[0];
    const maxHp = 100 + currentModule.id * 20;

    bossRef.current = {
      active: true,
      name: `MONSTRO ESPACIAL SINFÔNICO V${currentModule.id}`,
      maxHp,
      hp: maxHp,
      x: CANVAS_WIDTH / 2,
      y: 85,
      width: 120,
      height: 70,
      cipher: targetNote.cipher,
      targetNote,
      phase: 1,
      shootTimer: 0,
      dirX: 2.0,
    };

    // Clear regular meteors and lasers to clear arena
    meteorsRef.current = [];
    lasersRef.current = [];

    audio.setBossMode(true); // Switch to thrilling boss battle music!
    audio.playBossSiren();
    screenShake.current = 20;
    addFloatingText(CANVAS_WIDTH / 2, 220, "👾 MONSTRO ESPACIAL SURGIU!", "239, 68, 68", 24);
  };

  // Spawn meteor capsules (balanced target availability)
  const spawnMeteor = (target: NoteMapping, forceTarget = false) => {
    const currentModule = modulesData[currentModuleIndex];
    const targetCountOnScreen = meteorsRef.current.filter((m) => m.cipher === target.cipher).length;
    
    // Balanced spawn: only spawn target note if forced OR if no target note is on screen and 45% chance triggers.
    // If a target note is already on screen, spawn a distractor note to prevent identical flooding!
    let isCorrect = false;
    if (forceTarget) {
      isCorrect = true;
    } else if (targetCountOnScreen === 0) {
      isCorrect = Math.random() < 0.45;
    } else {
      isCorrect = false;
    }

    let cipher = "";
    if (isCorrect) {
      cipher = target.cipher;
    } else {
      const choices = currentModule.notes.filter((n) => n.cipher !== target.cipher);
      if (choices.length > 0) {
        cipher = choices[Math.floor(Math.random() * choices.length)].cipher;
      } else {
        cipher = "C";
      }
    }

    const radius = 32;
    const x = Math.random() * (CANVAS_WIDTH - radius * 2) + radius;
    const y = -radius;

    const speedUpMultiplier = 1 + (completedTargets.length * 0.12);
    const baseSpeed = (1.8 + (currentModule.id * 0.15)) * speedUpMultiplier;
    const speedY = baseSpeed + Math.random() * 0.8;
    const speedX = (Math.random() - 0.5) * 0.5;

    const techColors = ["#a855f7", "#ec4899", "#3b82f6", "#06b6d4"];
    const color = techColors[Math.floor(Math.random() * techColors.length)];

    const id = Math.random();
    meteorsRef.current.push({
      id,
      x,
      y,
      radius,
      cipher,
      speedY,
      speedX,
      color,
      isTarget: cipher === target.cipher,
      rotation: Math.random() * Math.PI,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
    });
  };

  // Particle explosion helper
  const addExplosion = (x: number, y: number, color: string, count = 18) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4.5 + 1.5;
      particlesRef.current.push({
        id: Math.random(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 3.5 + 1,
        color,
        alpha: 1,
        decay: Math.random() * 0.03 + 0.015,
      });
    }
  };

  // Add floating textual feedback directly inside Canvas
  const addFloatingText = (x: number, y: number, text: string, color: string, size = 18) => {
    floatingTextsRef.current.push({
      id: Math.random(),
      x,
      y,
      text,
      color,
      opacity: 1,
      vy: -1.5,
      size,
    });
  };

  // Handle chord correct destruction logic
  const handleCorrectHit = (meteor: Meteor) => {
    audio.playExplosion();
    const targetObj = gameState.activeTarget;
    if (targetObj) {
      audio.playChord(targetObj.frequencies, 0.7);
    } else {
      audio.playSuccess();
    }

    addExplosion(meteor.x, meteor.y, "#22c55e", 20);

    // 25% chance to drop a power-up on correct meteor destroy!
    if (Math.random() < 0.25) {
      spawnPowerUp(meteor.x, meteor.y);
    }

    // Increment sustained accuracy streak!
    accuracyStreakRef.current += 1;
    const currentMult = calculateMultiplier();

    // Damage Boss if active!
    if (bossRef.current.active) {
      const bossDmgScore = Math.round(15 * currentMult);
      bossRef.current.hp -= 25;
      audio.playBossHit();
      addFloatingText(bossRef.current.x, bossRef.current.y, `-25 DANO (+${bossDmgScore} PTS)`, "239, 68, 68", 20);
      if (bossRef.current.hp <= 0) {
        handleBossDefeated();
        return;
      }
    }

    const nextCombo = gameState.combo + 1;
    const baseScore = 10 * Math.min(nextCombo, 10);
    const scoreGain = Math.round(baseScore * currentMult);
    const nextMaxCombo = Math.max(gameState.maxCombo, nextCombo);

    addFloatingText(meteor.x, meteor.y - 10, `+${scoreGain} (x${currentMult.toFixed(1)})`, "34, 197, 94", 22);
    if (nextCombo > 1 && nextCombo % 3 === 0) {
      addFloatingText(meteor.x, meteor.y - 35, `COMBO x${nextCombo}! MULT x${currentMult.toFixed(1)}`, "251, 191, 36", 18);
    }

    setGameState((prev) => {
      const newScore = prev.score + scoreGain;
      let newHighScore = prev.highScore;
      if (newScore > prev.highScore) {
        newHighScore = newScore;
        localStorage.setItem("cifras_estelares_highscore", newHighScore.toString());
      }
      return {
        ...prev,
        score: newScore,
        highScore: newHighScore,
        combo: nextCombo,
        maxCombo: nextMaxCombo,
      };
    });

    // Advance note criteria
    const newHitCount = targetHitCountRef.current + 1;
    updateTargetHitCount(newHitCount);

    if (newHitCount >= targetRequired) {
      addFloatingText(meteor.x, meteor.y - 30, "🎉 NOTA COMPLETA!", "251, 191, 36", 20);
      handleTargetCompleted();
    } else {
      addFloatingText(meteor.x, meteor.y - 30, `🎯 ALVO (${newHitCount}/${targetRequired})`, "34, 197, 94", 18);
    }
  };

  // Move to next note/chord or module / boss trigger
  const handleTargetCompleted = () => {
    updateTargetHitCount(0);

    const currentModule = modulesData[currentModuleIndex];
    const completedNote = activeTargetRef.current || currentModule.notes[currentTargetIndex];
    
    setCompletedTargets((prev) => {
      if (completedNote && !prev.includes(completedNote.name)) {
        return [...prev, completedNote.name];
      }
      return prev;
    });

    targetsCompletedInModuleRef.current += 1;

    const nextIndex = currentTargetIndex + 1;

    // Check if finished all notes in this module
    if (nextIndex >= currentModule.notes.length) {
      audio.playSuccess();
      const nextModuleId = currentModule.id + 1;
      
      if (nextModuleId > modulesData.length) {
        // Complete game victory
        audio.stopBGM();
        audio.setBossMode(false);
        setGameState((prev) => ({
          ...prev,
          isPlaying: false,
          isGameOver: false,
        }));
        setGameStarted(false);
      } else {
        setGameState((prev) => ({
          ...prev,
          showingChallenge: true,
        }));
        
        // Auto-switch visual scenario on level up!
        const nextScenIdx = (currentScenarioIndex + 1) % scenariosData.length;
        setCurrentScenarioIndex(nextScenIdx);
        const nextScen = scenariosData[nextScenIdx];
        setScenarioNotice({ name: nextScen.name, description: nextScen.description });
        setTimeout(() => setScenarioNotice(null), 3500);

        if (campaignMode) {
          setTimeout(() => {
            startNewModule(nextModuleId);
          }, 1400);
        } else {
          setGameState((prev) => ({ ...prev, isPlaying: false }));
        }
      }
      return;
    }

    // Advance to next target note within current module
    setCurrentTargetIndex(nextIndex);
    const nextTarget = currentModule.notes[nextIndex];
    activeTargetRef.current = nextTarget;

    setGameState((prev) => ({
      ...prev,
      activeTarget: nextTarget,
      level: prev.level + 1,
    }));

    // Sync existing meteors on screen
    meteorsRef.current.forEach((m) => {
      m.isTarget = m.cipher === nextTarget.cipher;
    });

    // Spawn boss every 3 completed targets in module IF boss is not active
    if (targetsCompletedInModuleRef.current > 0 && targetsCompletedInModuleRef.current % 3 === 0 && !bossRef.current.active) {
      spawnBoss();
    } else {
      triggerChallengeScreen(nextTarget);
    }
  };

  // Handle Boss defeat
  const handleBossDefeated = () => {
    bossRef.current.active = false;
    bossLasersRef.current = [];
    audio.setBossMode(false); // Return to exploration soundtrack!
    audio.playSuccess();
    audio.playExplosion();

    screenShake.current = 25;
    addExplosion(bossRef.current.x, bossRef.current.y, "#fbbf24", 45);
    addExplosion(bossRef.current.x - 30, bossRef.current.y + 10, "#a855f7", 30);
    addExplosion(bossRef.current.x + 30, bossRef.current.y - 10, "#22d3ee", 30);

    // Drop 3 guaranteed power-ups!
    spawnPowerUp(bossRef.current.x - 40, bossRef.current.y);
    spawnPowerUp(bossRef.current.x, bossRef.current.y + 20);
    spawnPowerUp(bossRef.current.x + 40, bossRef.current.y);

    const mult = calculateMultiplier();
    const bonusPoints = Math.round(500 * mult);
    addFloatingText(CANVAS_WIDTH / 2, 200, `💥 CHEFÃO DERROTADO! +${bonusPoints} PTS! (x${mult.toFixed(1)})`, "251, 191, 36", 22);

    setGameState((prev) => ({
      ...prev,
      score: prev.score + bonusPoints,
    }));

    // Auto-advance scenario!
    const nextScenIdx = (currentScenarioIndex + 1) % scenariosData.length;
    setCurrentScenarioIndex(nextScenIdx);
    const nextScen = scenariosData[nextScenIdx];
    setScenarioNotice({ name: nextScen.name, description: nextScen.description });
    setTimeout(() => setScenarioNotice(null), 3500);
  };

  // Handle wrong cipher hit
  const handleWrongHit = (meteor: Meteor) => {
    // Reset sustained accuracy streak on mistake!
    accuracyStreakRef.current = 0;

    // Check if shield protects player
    if (activePowerUps.current.shieldCount > 0) {
      activePowerUps.current.shieldCount -= 1;
      audio.playPowerup();
      addExplosion(meteor.x, meteor.y, "#3b82f6", 15);
      addFloatingText(meteor.x, meteor.y, "🛡️ ESCUDO PROTEGEU!", "59, 130, 246", 18);
      return;
    }

    audio.playFailure();
    addExplosion(meteor.x, meteor.y, "#ef4444", 20);
    addFloatingText(meteor.x, meteor.y, "ERROU! -1 VIDA", "239, 110, 110", 20);

    setGameState((prev) => {
      const nextLives = prev.lives - 1;
      const isOver = nextLives <= 0;
      if (isOver) {
        audio.stopBGM();
        audio.setBossMode(false);
      }
      return {
        ...prev,
        lives: nextLives,
        combo: 0,
        isGameOver: isOver,
        isPlaying: !isOver,
      };
    });
  };

  // KEYBOARD CONTROLS LISTENERS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "a", "d", "w", "s", "A", "D", "W", "S"].includes(e.key)) {
        e.preventDefault();
      }
      keysPressed.current[e.key] = true;
      initAudioCtx();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [audioInited]);

  // CORE RAF LOOP FOR PHYSICS AND RENDERING
  useEffect(() => {
    if (!gameState.isPlaying || gameState.showingChallenge || gameState.isGameOver) {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      // Decrement timers
      if (invincibilityFrames.current > 0) invincibilityFrames.current--;
      if (activePowerUps.current.spreadTimer > 0) activePowerUps.current.spreadTimer--;
      if (activePowerUps.current.speedTimer > 0) activePowerUps.current.speedTimer--;

      // Check Sudden Target Switch ("Nota alvo mudar do nada") every 22 seconds
      if (!bossRef.current.active && time - lastTargetShiftTime.current > 22000) {
        triggerSuddenTargetSwitch();
      }

      const activeScenario = scenariosData[currentScenarioIndex];

      // 1. CLEAR CANVAS
      ctx.fillStyle = "#020208";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Apply screen-shake transformation
      ctx.save();
      if (screenShake.current > 0) {
        const dx = (Math.random() - 0.5) * screenShake.current;
        const dy = (Math.random() - 0.5) * screenShake.current;
        ctx.translate(dx, dy);
        screenShake.current *= 0.85;
        if (screenShake.current < 0.2) screenShake.current = 0;
      }

      // Draw faint, dynamic background scenario nebula & celestial art
      const nebulaGrad = ctx.createRadialGradient(
        CANVAS_WIDTH / 2, 
        CANVAS_HEIGHT / 2, 
        10, 
        CANVAS_WIDTH / 2, 
        CANVAS_HEIGHT / 2, 
        CANVAS_WIDTH
      );
      nebulaGrad.addColorStop(0, activeScenario.colorMain + "12");
      nebulaGrad.addColorStop(0.6, activeScenario.colorMain + "04");
      nebulaGrad.addColorStop(1, "rgba(2, 2, 8, 0)");
      ctx.fillStyle = nebulaGrad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Rich Scenario Visual Artwork Engine (5 Distinct Environments)
      ctx.save();
      if (activeScenario.type === "space") {
        // 🌌 1. ESPAÇO PROFUNDO: Rotating Cyan Spiral Galaxy + Floating Nebular Dust
        const gx = 380;
        const gy = 140;
        ctx.save();
        ctx.translate(gx, gy);
        ctx.rotate(time * 0.0003);
        const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 55);
        coreGrad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
        coreGrad.addColorStop(0.3, "rgba(34, 211, 238, 0.5)");
        coreGrad.addColorStop(1, "rgba(34, 211, 238, 0)");
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 55, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(168, 85, 247, 0.35)";
        ctx.lineWidth = 3;
        for (let arm = 0; arm < 2; arm++) {
          ctx.beginPath();
          const armOffset = arm * Math.PI;
          for (let r = 5; r < 80; r += 2) {
            const theta = r * 0.08 + armOffset;
            const x = r * Math.cos(theta);
            const y = r * Math.sin(theta) * 0.5;
            if (r === 5) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();

        // Nebular cloud pulse
        const cloudY = (time * 0.015) % CANVAS_HEIGHT;
        const cloudGrad = ctx.createRadialGradient(110, cloudY, 10, 110, cloudY, 130);
        cloudGrad.addColorStop(0, "rgba(56, 189, 248, 0.12)");
        cloudGrad.addColorStop(0.6, "rgba(168, 85, 247, 0.06)");
        cloudGrad.addColorStop(1, "transparent");
        ctx.fillStyle = cloudGrad;
        ctx.beginPath();
        ctx.arc(110, cloudY, 130, 0, Math.PI * 2);
        ctx.fill();

      } else if (activeScenario.type === "planet") {
        // 🪐 2. PLANETA ALIENÍGENA XENON-9: Gas Giant Horizon + Multi-layered Rings + City Spires
        const px = CANVAS_WIDTH / 2;
        const py = -90;
        const pradius = 260;
        const pGrad = ctx.createRadialGradient(px - 50, py - 50, 20, px, py, pradius);
        pGrad.addColorStop(0, "rgba(192, 132, 252, 0.4)");
        pGrad.addColorStop(0.5, "rgba(126, 34, 206, 0.25)");
        pGrad.addColorStop(1, "rgba(15, 23, 42, 0)");
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(px, py, pradius, 0, Math.PI * 2);
        ctx.fill();

        // Spinning Planetary Rings
        ctx.save();
        ctx.translate(px, py + 80);
        ctx.rotate(Math.PI / 10);
        [ { rX: 340, rY: 65, color: "rgba(236, 72, 153, 0.3)", w: 8 },
          { rX: 380, rY: 75, color: "rgba(168, 85, 247, 0.25)", w: 5 },
          { rX: 410, rY: 82, color: "rgba(34, 211, 238, 0.2)", w: 3 }
        ].forEach((ring) => {
          ctx.beginPath();
          ctx.ellipse(0, 0, ring.rX, ring.rY, time * 0.0004, 0, Math.PI * 2);
          ctx.strokeStyle = ring.color;
          ctx.lineWidth = ring.w;
          ctx.stroke();
        });
        ctx.restore();

        // City Horizon Spires on Bottom
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        const spires = [
          { x: 20, w: 22, h: 80 }, { x: 70, w: 16, h: 130 }, { x: 120, w: 28, h: 105 },
          { x: 210, w: 18, h: 150 }, { x: 300, w: 25, h: 115 }, { x: 380, w: 20, h: 140 }, { x: 430, w: 28, h: 90 }
        ];
        spires.forEach((s) => {
          ctx.fillRect(s.x, CANVAS_HEIGHT - s.h, s.w, s.h);
          ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(s.x, CANVAS_HEIGHT - s.h, s.w, s.h);
          if (Math.sin(time * 0.005 + s.x) > 0) {
            ctx.fillStyle = "#ec4899";
            ctx.beginPath();
            ctx.arc(s.x + s.w / 2, CANVAS_HEIGHT - s.h - 3, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
          }
        });

      } else if (activeScenario.type === "solar") {
        // ☀️ 3. ERUPÇÃO SOLAR: Fiery Sun Core + Undulating Prominences + Flare Beams
        const sunY = CANVAS_HEIGHT + 160;
        const sunR = 300;
        const sunGrad = ctx.createRadialGradient(CANVAS_WIDTH / 2, sunY, 50, CANVAS_WIDTH / 2, sunY, sunR);
        sunGrad.addColorStop(0, "rgba(254, 240, 138, 0.5)");
        sunGrad.addColorStop(0.4, "rgba(249, 115, 22, 0.35)");
        sunGrad.addColorStop(0.8, "rgba(239, 68, 68, 0.15)");
        sunGrad.addColorStop(1, "transparent");
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(CANVAS_WIDTH / 2, sunY, sunR, 0, Math.PI * 2);
        ctx.fill();

        // Solar Flare Prominences
        ctx.strokeStyle = "rgba(251, 191, 36, 0.45)";
        ctx.lineWidth = 4;
        [-120, 0, 120].forEach((offsetX, idx) => {
          const wave = Math.sin(time * 0.003 + idx) * 20;
          ctx.beginPath();
          ctx.moveTo(CANVAS_WIDTH / 2 + offsetX - 40, CANVAS_HEIGHT - 20);
          ctx.quadraticCurveTo(
            CANVAS_WIDTH / 2 + offsetX, 
            CANVAS_HEIGHT - 110 + wave, 
            CANVAS_WIDTH / 2 + offsetX + 40, 
            CANVAS_HEIGHT - 20
          );
          ctx.stroke();
        });

        // Radiating Light Beams
        ctx.save();
        ctx.translate(CANVAS_WIDTH / 2, sunY);
        ctx.rotate(time * 0.0002);
        for (let r = 0; r < 8; r++) {
          const angle = (r * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(angle) * 450, Math.sin(angle) * 450);
          ctx.strokeStyle = "rgba(249, 115, 22, 0.06)";
          ctx.lineWidth = 14;
          ctx.stroke();
        }
        ctx.restore();

      } else if (activeScenario.type === "crystal") {
        // 💎 4. CINTURÃO DE CRISTAL: Flowing Cosmic Aurora + Floating 3D Emerald Crystals
        ctx.save();
        ctx.lineWidth = 22;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          const alpha = 0.08 + i * 0.03;
          ctx.strokeStyle = i % 2 === 0 ? `rgba(16, 185, 129, ${alpha})` : `rgba(34, 211, 238, ${alpha})`;
          for (let x = 0; x <= CANVAS_WIDTH; x += 30) {
            const y = 80 + i * 35 + Math.sin(x * 0.01 + time * 0.0015 + i) * 22;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();

        // 3D Emerald Shards
        const crystals = [
          { x: 80, y: 180, scale: 1.2, speed: 0.002 },
          { x: 420, y: 240, scale: 0.9, speed: -0.0018 },
          { x: 140, y: 480, scale: 1.0, speed: 0.0015 },
          { x: 360, y: 520, scale: 0.8, speed: -0.0022 },
        ];
        crystals.forEach((c, idx) => {
          const floatY = c.y + Math.sin(time * c.speed + idx) * 15;
          ctx.save();
          ctx.translate(c.x, floatY);
          ctx.rotate(time * c.speed * 0.8);
          ctx.scale(c.scale, c.scale);

          // Left facet
          ctx.beginPath();
          ctx.moveTo(0, -22);
          ctx.lineTo(-14, 0);
          ctx.lineTo(0, 22);
          ctx.closePath();
          ctx.fillStyle = "rgba(6, 95, 70, 0.5)";
          ctx.fill();

          // Right facet
          ctx.beginPath();
          ctx.moveTo(0, -22);
          ctx.lineTo(14, 0);
          ctx.lineTo(0, 22);
          ctx.closePath();
          ctx.fillStyle = "rgba(52, 211, 153, 0.6)";
          ctx.fill();

          // Edge
          ctx.beginPath();
          ctx.moveTo(0, -22);
          ctx.lineTo(0, 22);
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(0, -22); ctx.lineTo(14, 0); ctx.lineTo(0, 22); ctx.lineTo(-14, 0); ctx.closePath();
          ctx.strokeStyle = "#10b981"; ctx.lineWidth = 2; ctx.stroke();
          ctx.restore();
        });

      } else if (activeScenario.type === "void") {
        // 🕳️ 5. SINGULARIDADE CÓSMICA: Black Hole Event Horizon + Accretion Disk
        const bhX = CANVAS_WIDTH / 2;
        const bhY = 180;

        const bhGrad = ctx.createRadialGradient(bhX, bhY, 10, bhX, bhY, 150);
        bhGrad.addColorStop(0, "#000000");
        bhGrad.addColorStop(0.35, "rgba(251, 191, 36, 0.35)");
        bhGrad.addColorStop(0.65, "rgba(236, 72, 153, 0.2)");
        bhGrad.addColorStop(1, "transparent");
        ctx.fillStyle = bhGrad;
        ctx.beginPath();
        ctx.arc(bhX, bhY, 150, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(bhX, bhY);
        ctx.rotate(time * 0.001);
        ctx.beginPath();
        ctx.ellipse(0, 0, 130, 38, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(251, 191, 36, 0.7)";
        ctx.lineWidth = 8;
        ctx.stroke();

        ctx.beginPath();
        ctx.ellipse(0, 0, 110, 28, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(236, 72, 153, 0.8)";
        ctx.lineWidth = 4;
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(bhX, bhY, 32, 0, Math.PI * 2);
        ctx.fillStyle = "#020208";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();

      // Draw scenario cyber grid scanlines
      ctx.strokeStyle = activeScenario.gridColor;
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_WIDTH; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // 2. UPDATE & DRAW STARS BACKGROUND (Warp Speed if Speed powerup active!)
      const speedMultiplier = activePowerUps.current.speedTimer > 0 ? 2.5 : 1.0;
      starsRef.current.forEach((star) => {
        star.y += star.speed * speedMultiplier;
        if (star.y > CANVAS_HEIGHT) {
          star.y = 0;
          star.x = Math.random() * CANVAS_WIDTH;
        }
        ctx.fillStyle = "rgba(255, 255, 255, " + (star.size * 0.45) + ")";
        ctx.fillRect(star.x, star.y, star.size, star.size * (speedMultiplier > 1 ? 3 : 1));
      });

      // 3. SHIP MOVEMENT (Keyboard & Touch Joystick/D-pad)
      const shipSpeed = activePowerUps.current.speedTimer > 0 ? 9.0 : 6.2;
      
      // Joystick / D-Pad Movement vector
      if (joystickVector.current.x !== 0 || joystickVector.current.y !== 0) {
        playerX.current = Math.max(25, Math.min(CANVAS_WIDTH - 25, playerX.current + joystickVector.current.x * shipSpeed));
        playerY.current = Math.max(380, Math.min(CANVAS_HEIGHT - 50, playerY.current + joystickVector.current.y * shipSpeed));
      }

      // Keyboard Controls
      if (keysPressed.current["ArrowLeft"] || keysPressed.current["a"] || keysPressed.current["A"]) {
        playerX.current = Math.max(25, playerX.current - shipSpeed);
      }
      if (keysPressed.current["ArrowRight"] || keysPressed.current["d"] || keysPressed.current["D"]) {
        playerX.current = Math.min(CANVAS_WIDTH - 25, playerX.current + shipSpeed);
      }
      if (keysPressed.current["ArrowUp"] || keysPressed.current["w"] || keysPressed.current["W"]) {
        playerY.current = Math.max(380, playerY.current - shipSpeed);
      }
      if (keysPressed.current["ArrowDown"] || keysPressed.current["s"] || keysPressed.current["S"]) {
        playerY.current = Math.min(CANVAS_HEIGHT - 50, playerY.current + shipSpeed);
      }

      // Fire interval: Faster if Speed Turbo active!
      const shootInterval = activePowerUps.current.speedTimer > 0 ? 120 : 220;

      // 4. MANUAL, BUTTON & AUTO SHOOTING
      const shouldShoot = keysPressed.current[" "] || isDragging.current || isShootButtonPressed.current || autoFire;
      if (shouldShoot && time - lastShootTime.current > shootInterval) {
        if (activePowerUps.current.spreadTimer > 0) {
          // ⚡ TRIPLO SPREAD LASERS
          lasersRef.current.push(
            { id: Math.random(), x: playerX.current - 12, y: playerY.current - 10, width: 4, height: 15, speed: 9.5, vx: -2.0, color: "#a855f7" },
            { id: Math.random(), x: playerX.current, y: playerY.current - 12, width: 5, height: 16, speed: 10.0, vx: 0, color: "#22d3ee" },
            { id: Math.random(), x: playerX.current + 12, y: playerY.current - 10, width: 4, height: 15, speed: 9.5, vx: 2.0, color: "#a855f7" }
          );
        } else {
          // Standard laser
          lasersRef.current.push({
            id: Math.random(),
            x: playerX.current,
            y: playerY.current - 10,
            width: 4,
            height: 15,
            speed: 8.5,
            vx: 0,
            color: activeScenario.colorMain,
          });
        }
        audio.playLaser();
        lastShootTime.current = time;
      }

      // 5. SPAWN ENEMY METEORS (Only if Boss is not active)
      if (!bossRef.current.active) {
        const moduleDifficultyCoeff = Math.min(8, modulesData[currentModuleIndex].id);
        const spawnSpeedMultiplier = 1 + (completedTargets.length * 0.12);
        const spawnInterval = Math.max(550, (2100 - (moduleDifficultyCoeff * 130)) / spawnSpeedMultiplier);

        if (time - gameRef.current.lastSpawnTime > spawnInterval) {
          const activeTarget = gameState.activeTarget;
          if (activeTarget) {
            spawnMeteor(activeTarget);
          }
          gameRef.current.lastSpawnTime = time;
        }
      }

      // 6. BOSS LOGIC & RENDERING (Space Monster Boss)
      if (bossRef.current.active) {
        const b = bossRef.current;
        b.x += b.dirX;
        if (b.x - b.width / 2 < 20 || b.x + b.width / 2 > CANVAS_WIDTH - 20) {
          b.dirX *= -1;
        }

        // Boss Phase 2 transition at 50% HP
        if (b.hp <= b.maxHp * 0.5 && b.phase === 1) {
          b.phase = 2;
          b.dirX *= 1.4;
          audio.playBossSiren();
          addFloatingText(b.x, b.y + 40, "⚠️ MONSTRO FURIOSO! FASE 2!", "239, 68, 68", 20);
        }

        // Boss shooting logic
        b.shootTimer++;
        const bossShootInterval = b.phase === 2 ? 60 : 90;
        if (b.shootTimer > bossShootInterval) {
          b.shootTimer = 0;
          if (b.phase === 2) {
            bossLasersRef.current.push(
              { id: Math.random(), x: b.x - 25, y: b.y + 20, vx: -1.5, vy: 4.5, radius: 6, color: "#f43f5e" },
              { id: Math.random(), x: b.x, y: b.y + 25, vx: 0, vy: 5.0, radius: 7, color: "#f43f5e" },
              { id: Math.random(), x: b.x + 25, y: b.y + 20, vx: 1.5, vy: 4.5, radius: 6, color: "#f43f5e" }
            );
          } else {
            bossLasersRef.current.push({
              id: Math.random(),
              x: b.x,
              y: b.y + 25,
              vx: 0,
              vy: 4.5,
              radius: 6,
              color: "#f43f5e",
            });
          }
        }

        // DRAW 5 UNIQUE COSMIC SPACE MONSTER BOSSES BASED ON MODULE
        ctx.save();
        ctx.translate(b.x, b.y);

        const timeNow = performance.now();
        const pulse = Math.sin(timeNow * 0.005) * 4;
        const moduleIdx = currentModuleIndex % 5;

        // Boss Bio-Aura
        ctx.beginPath();
        ctx.arc(0, 0, (b.width / 1.5) + pulse, 0, Math.PI * 2);
        ctx.fillStyle = b.phase === 2 ? "rgba(239, 68, 68, 0.25)" : "rgba(168, 85, 247, 0.18)";
        ctx.fill();

        if (moduleIdx === 0) {
          // 🦑 BOSS 1: KRAKEN ESTELAR (Deep Violet/Cyan Alien Tentacle Monster)
          const tentacleOffsets = [-1, -0.4, 0.4, 1];
          tentacleOffsets.forEach((tOffset, tIdx) => {
            const wave = Math.sin(timeNow * 0.006 + tIdx * 1.5) * 16;
            const isLeft = tOffset < 0;
            ctx.beginPath();
            ctx.moveTo(isLeft ? -25 : 25, 0);
            const cpX = (isLeft ? -60 : 60) + wave;
            const cpY = -10 + tIdx * 12;
            const endX = (isLeft ? -80 : 80) + wave * 1.4;
            const endY = 25 + tIdx * 8;
            ctx.quadraticCurveTo(cpX, cpY, endX, endY);
            ctx.strokeStyle = b.phase === 2 ? "#ef4444" : "#a855f7";
            ctx.lineWidth = 5;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(endX, endY, 5, 0, Math.PI * 2);
            ctx.fillStyle = b.phase === 2 ? "#f43f5e" : "#06b6d4";
            ctx.fill();
          });

          // Skull Body
          ctx.fillStyle = "#110e2e";
          ctx.beginPath();
          ctx.moveTo(-b.width / 2, -10);
          ctx.quadraticCurveTo(-b.width / 3, -b.height, 0, -b.height / 1.2);
          ctx.quadraticCurveTo(b.width / 3, -b.height, b.width / 2, -10);
          ctx.lineTo(b.width / 2.2, 25);
          ctx.lineTo(0, 38);
          ctx.lineTo(-b.width / 2.2, 25);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = b.phase === 2 ? "#ef4444" : "#22d3ee";
          ctx.lineWidth = 3;
          ctx.stroke();

          // 3 Eyes
          [{ x: -22, y: -15, size: 8 }, { x: 0, y: -22, size: 11 }, { x: 22, y: -15, size: 8 }].forEach((eye) => {
            ctx.beginPath();
            ctx.arc(eye.x, eye.y, eye.size, 0, Math.PI * 2);
            ctx.fillStyle = "#000000";
            ctx.fill();
            ctx.strokeStyle = b.phase === 2 ? "#ef4444" : "#fbbf24";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(eye.x, eye.y, eye.size * 0.55, 0, Math.PI * 2);
            ctx.fillStyle = b.phase === 2 ? "#f43f5e" : "#06b6d4";
            ctx.fill();
          });

          // Mouth Core
          ctx.beginPath();
          ctx.arc(0, 10, 13, 0, Math.PI * 2);
          ctx.fillStyle = b.phase === 2 ? "rgba(239, 68, 68, 0.9)" : "rgba(251, 191, 36, 0.9)";
          ctx.fill();
          ctx.fillStyle = "#000000";
          ctx.font = 'bold 13px "JetBrains Mono", monospace';
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(b.cipher, 0, 10);

        } else if (moduleIdx === 1) {
          // 🐉 BOSS 2: DRAGÃO SOLAR MECÂNICO (Fiery Orange Dragon with Fiery Wings & Curved Horns)
          const wingFlap = Math.sin(timeNow * 0.008) * 12;
          [-1, 1].forEach((dir) => {
            ctx.beginPath();
            ctx.moveTo(dir * 18, -10);
            ctx.lineTo(dir * (70 + wingFlap), -35 + wingFlap);
            ctx.lineTo(dir * (80 + wingFlap), 18);
            ctx.lineTo(dir * 25, 12);
            ctx.closePath();
            ctx.fillStyle = b.phase === 2 ? "rgba(239, 68, 68, 0.6)" : "rgba(249, 115, 22, 0.5)";
            ctx.fill();
            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 2;
            ctx.stroke();
          });

          // Curved Horns
          [-1, 1].forEach((dir) => {
            ctx.beginPath();
            ctx.moveTo(dir * 15, -20);
            ctx.quadraticCurveTo(dir * 32, -48, dir * 42, -32);
            ctx.strokeStyle = "#fbbf24";
            ctx.lineWidth = 4;
            ctx.stroke();
          });

          // Dragon Head
          ctx.fillStyle = "#3a0905";
          ctx.beginPath();
          ctx.moveTo(0, -32);
          ctx.lineTo(28, -8);
          ctx.lineTo(22, 22);
          ctx.lineTo(0, 36);
          ctx.lineTo(-22, 22);
          ctx.lineTo(-28, -8);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#f97316";
          ctx.lineWidth = 3;
          ctx.stroke();

          // Cyclops Flame Eye
          ctx.beginPath();
          ctx.arc(0, -8, 12, 0, Math.PI * 2);
          ctx.fillStyle = "#facc15";
          ctx.fill();
          ctx.fillStyle = "#000";
          ctx.beginPath();
          ctx.arc(0, -8, 5, 0, Math.PI * 2);
          ctx.fill();

          // Jaw Core
          ctx.beginPath();
          ctx.arc(0, 16, 12, 0, Math.PI * 2);
          ctx.fillStyle = "#ef4444";
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = 'bold 12px "JetBrains Mono", monospace';
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(b.cipher, 0, 16);

        } else if (moduleIdx === 2) {
          // 💎 BOSS 3: MECHA CRISTALINO (Emerald/Jade Diamond Mech with Orbit Crystals)
          const rot = timeNow * 0.003;
          for (let i = 0; i < 4; i++) {
            const angle = rot + (i * Math.PI / 2);
            const cx = Math.cos(angle) * 60;
            const cy = Math.sin(angle) * 30;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 8);
            ctx.lineTo(cx + 6, cy);
            ctx.lineTo(cx, cy + 8);
            ctx.lineTo(cx - 6, cy);
            ctx.closePath();
            ctx.fillStyle = "#10b981";
            ctx.fill();
            ctx.strokeStyle = "#34d399";
            ctx.stroke();
          }

          // Main Diamond Armor
          ctx.fillStyle = "#022c22";
          ctx.beginPath();
          ctx.moveTo(0, -40);
          ctx.lineTo(38, 0);
          ctx.lineTo(0, 40);
          ctx.lineTo(-38, 0);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#34d399";
          ctx.lineWidth = 3.5;
          ctx.stroke();

          // Inner Crystal Matrix
          ctx.beginPath();
          ctx.arc(0, 0, 15, 0, Math.PI * 2);
          ctx.fillStyle = "#10b981";
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = 'bold 13px "JetBrains Mono", monospace';
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(b.cipher, 0, 0);

        } else if (moduleIdx === 3) {
          // 🌌 BOSS 4: LEVIATÃ VAZIO (Void Purple Dreadnought with Rotating Event Horizon Halo)
          ctx.beginPath();
          ctx.ellipse(0, 0, 70, 22, Math.sin(timeNow * 0.002) * 0.25, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(168, 85, 247, 0.75)";
          ctx.lineWidth = 4;
          ctx.stroke();

          // Void Armor
          ctx.fillStyle = "#1e0b24";
          ctx.beginPath();
          ctx.moveTo(-45, -18);
          ctx.lineTo(0, -36);
          ctx.lineTo(45, -18);
          ctx.lineTo(36, 26);
          ctx.lineTo(0, 40);
          ctx.lineTo(-36, 26);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#a855f7";
          ctx.lineWidth = 3;
          ctx.stroke();

          // 6 Glowing Eyes
          [-26, -16, -6, 6, 16, 26].forEach((eyeX) => {
            ctx.beginPath();
            ctx.arc(eyeX, -8, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = "#f43f5e";
            ctx.fill();
          });

          // Void Core
          ctx.beginPath();
          ctx.arc(0, 12, 13, 0, Math.PI * 2);
          ctx.fillStyle = "#fbbf24";
          ctx.fill();
          ctx.fillStyle = "#000000";
          ctx.font = 'bold 12px "JetBrains Mono", monospace';
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(b.cipher, 0, 12);

        } else {
          // 👑 BOSS 5: IMPERADOR GALÁCTICO (Supreme Gold/Magenta Being with Imperial Crown Spikes)
          ctx.beginPath();
          ctx.arc(0, 0, 55, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(251, 191, 36, 0.8)";
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 6]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Imperial Gold Body
          ctx.fillStyle = "#2e1065";
          ctx.beginPath();
          ctx.moveTo(0, -42);
          ctx.lineTo(22, -18);
          ctx.lineTo(40, 8);
          ctx.lineTo(18, 40);
          ctx.lineTo(-18, 40);
          ctx.lineTo(-40, 8);
          ctx.lineTo(-22, -18);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = "#f59e0b";
          ctx.lineWidth = 3.5;
          ctx.stroke();

          // Crown Spikes
          [-18, 0, 18].forEach((spikeX, idx) => {
            ctx.beginPath();
            ctx.moveTo(spikeX - 5, -42);
            ctx.lineTo(spikeX, -58 + (idx === 1 ? -8 : 0));
            ctx.lineTo(spikeX + 5, -42);
            ctx.fillStyle = "#fbbf24";
            ctx.fill();
          });

          // Supreme Core
          ctx.beginPath();
          ctx.arc(0, 2, 15, 0, Math.PI * 2);
          ctx.fillStyle = "#ec4899";
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = 'bold 13px "JetBrains Mono", monospace';
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(b.cipher, 0, 2);
        }
        ctx.font = 'bold 13px "JetBrains Mono", monospace';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.cipher, 0, 10);

        ctx.restore();

        // Render Boss HP bar on top of Canvas
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fillRect(50, 15, CANVAS_WIDTH - 100, 16);
        ctx.strokeStyle = b.phase === 2 ? "#ef4444" : "#fbbf24";
        ctx.lineWidth = 2;
        ctx.strokeRect(50, 15, CANVAS_WIDTH - 100, 16);

        const hpRatio = Math.max(0, b.hp / b.maxHp);
        ctx.fillStyle = b.phase === 2 ? "#ef4444" : "#fbbf24";
        ctx.fillRect(52, 17, (CANVAS_WIDTH - 104) * hpRatio, 12);

        ctx.fillStyle = "#ffffff";
        ctx.font = 'bold 10px "Space Grotesk", sans-serif';
        ctx.textAlign = "center";
        ctx.fillText(`${b.name}: ${Math.ceil(b.hp)} / ${b.maxHp} HP`, CANVAS_WIDTH / 2, 26);
      }

      // 7. PHYSICS: BOSS LASERS VS PLAYER
      bossLasersRef.current.forEach((bl, blIdx) => {
        bl.x += bl.vx;
        bl.y += bl.vy;

        ctx.beginPath();
        ctx.arc(bl.x, bl.y, bl.radius, 0, Math.PI * 2);
        ctx.fillStyle = bl.color;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Collision with player
        const dx = playerX.current - bl.x;
        const dy = playerY.current - bl.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 18 + bl.radius) {
          bossLasersRef.current.splice(blIdx, 1);
          
          if (activePowerUps.current.shieldCount > 0) {
            activePowerUps.current.shieldCount -= 1;
            audio.playPowerup();
            addExplosion(bl.x, bl.y, "#3b82f6", 15);
            addFloatingText(bl.x, bl.y, "🛡️ ESCUDO ABANDONADO!", "59, 130, 246", 18);
          } else {
            audio.playFailure();
            damageFlash.current = 20;
            screenShake.current = 15;
            setGameState((prev) => {
              const nextLives = prev.lives - 1;
              const isOver = nextLives <= 0;
              return {
                ...prev,
                lives: nextLives,
                combo: 0,
                isGameOver: isOver,
                isPlaying: !isOver,
              };
            });
          }
        }

        if (bl.y > CANVAS_HEIGHT) {
          bossLasersRef.current.splice(blIdx, 1);
        }
      });

      // 8. PHYSICS: LASERS VS METEORS & BOSS
      lasersRef.current.forEach((laser, lIdx) => {
        laser.y -= laser.speed;
        laser.x += laser.vx || 0;
        
        ctx.beginPath();
        ctx.moveTo(laser.x, laser.y);
        ctx.lineTo(laser.x, laser.y - laser.height);
        ctx.strokeStyle = laser.color || activeScenario.colorMain;
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(laser.x, laser.y);
        ctx.lineTo(laser.x, laser.y - laser.height);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Laser vs Boss collision
        if (bossRef.current.active) {
          const b = bossRef.current;
          const dx = laser.x - b.x;
          const dy = laser.y - b.y;
          if (Math.abs(dx) < b.width / 2 && Math.abs(dy) < b.height / 2) {
            lasersRef.current.splice(lIdx, 1);
            b.hp -= 5;
            audio.playBossHit();
            addExplosion(laser.x, laser.y, "#fbbf24", 8);
            if (b.hp <= 0) {
              handleBossDefeated();
            }
            return;
          }
        }

        if (laser.y < 0) {
          lasersRef.current.splice(lIdx, 1);
        }
      });

      // 9. PHYSICS: METEORS
      const currentActiveTarget = activeTargetRef.current || gameState.activeTarget;

      meteorsRef.current.forEach((meteor, mIdx) => {
        meteor.y += meteor.speedY;
        meteor.x += meteor.speedX;
        meteor.rotation += meteor.rotationSpeed;

        if (meteor.x - meteor.radius < 0 || meteor.x + meteor.radius > CANVAS_WIDTH) {
          meteor.speedX *= -1;
        }

        const isCorrectTarget = currentActiveTarget ? (meteor.cipher === currentActiveTarget.cipher) : meteor.isTarget;

        ctx.save();
        ctx.translate(meteor.x, meteor.y);

        ctx.beginPath();
        ctx.arc(0, 0, meteor.radius, 0, Math.PI * 2);
        ctx.fillStyle = isCorrectTarget ? "rgba(8, 51, 68, 0.45)" : "rgba(15, 23, 42, 0.8)";
        ctx.fill();

        ctx.strokeStyle = isCorrectTarget ? "#22d3ee" : meteor.color;
        ctx.lineWidth = isCorrectTarget ? 4 : 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, meteor.radius + (isCorrectTarget ? 6 : 3), 0, Math.PI * 2);
        ctx.strokeStyle = isCorrectTarget ? "rgba(34, 211, 238, 0.3)" : "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = isCorrectTarget ? 3 : 1;
        ctx.stroke();

        ctx.restore();

        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${meteor.radius * 0.75}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(meteor.cipher, meteor.x, meteor.y + 1);

        // Collision: Laser vs Meteor
        lasersRef.current.forEach((laser, lIdx) => {
          const dx = laser.x - meteor.x;
          const dy = laser.y - meteor.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < meteor.radius + 2) {
            lasersRef.current.splice(lIdx, 1);
            meteorsRef.current.splice(mIdx, 1);

            if (isCorrectTarget) {
              handleCorrectHit(meteor);
            } else {
              handleWrongHit(meteor);
            }
          }
        });

        // Collision: Player vs Meteor
        if (invincibilityFrames.current === 0) {
          const dx = playerX.current - meteor.x;
          const dy = playerY.current - meteor.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const minDist = 18 + meteor.radius;
          
          if (dist < minDist) {
            meteorsRef.current.splice(mIdx, 1);
            
            if (isCorrectTarget) {
              handleCorrectHit(meteor);
            } else {
              handleWrongHit(meteor);
              damageFlash.current = 20;
              screenShake.current = 15;
              invincibilityFrames.current = 60;
            }
            return;
          }
        }

        if (meteor.y - meteor.radius > CANVAS_HEIGHT) {
          meteorsRef.current.splice(mIdx, 1);
          if (isCorrectTarget) {
            addFloatingText(meteor.x, CANVAS_HEIGHT - 30, "PERDEU COMBO!", "244, 63, 94", 16);
            setGameState((prev) => ({ ...prev, combo: 0 }));
            audio.playFailure();
          }
        }
      });

      // 10. PHYSICS & RENDER: POWER-UPS
      powerUpsRef.current.forEach((pw, pwIdx) => {
        pw.y += pw.speedY;

        ctx.save();
        ctx.translate(pw.x, pw.y);

        ctx.beginPath();
        ctx.arc(0, 0, pw.radius, 0, Math.PI * 2);
        ctx.fillStyle = pw.color + "33";
        ctx.fill();
        ctx.strokeStyle = pw.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = 'bold 10px "Space Grotesk", sans-serif';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(pw.label, 0, 0);

        ctx.restore();

        // Collision: Player vs PowerUp
        const dx = playerX.current - pw.x;
        const dy = playerY.current - pw.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 18 + pw.radius) {
          powerUpsRef.current.splice(pwIdx, 1);
          audio.playPowerup();
          addExplosion(pw.x, pw.y, pw.color, 18);
          addFloatingText(pw.x, pw.y - 10, `+ POWER-UP: ${pw.label}!`, "34, 197, 94", 20);

          if (pw.type === "spread") {
            activePowerUps.current.spreadTimer = 600; // 10s
          } else if (pw.type === "speed") {
            activePowerUps.current.speedTimer = 600; // 10s
          } else if (pw.type === "shield") {
            activePowerUps.current.shieldCount += 1;
          } else if (pw.type === "bomb") {
            audio.playBomb();
            screenShake.current = 18;
            addExplosion(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, "#eab308", 40);
            
            // Destroy all wrong meteors on screen & grant bonus points!
            const curTarget = activeTargetRef.current || gameState.activeTarget;
            const wrongMeteors = meteorsRef.current.filter((m) => curTarget ? m.cipher !== curTarget.cipher : !m.isTarget);
            wrongMeteors.forEach((m) => addExplosion(m.x, m.y, "#eab308", 12));
            meteorsRef.current = meteorsRef.current.filter((m) => curTarget ? m.cipher === curTarget.cipher : m.isTarget);

            if (bossRef.current.active) {
              bossRef.current.hp -= 30;
              if (bossRef.current.hp <= 0) handleBossDefeated();
            }

            setGameState((prev) => ({ ...prev, score: prev.score + 50 }));
            addFloatingText(CANVAS_WIDTH / 2, 300, "💥 BOMBA DE ACORDE ATIVADA!", "234, 179, 8", 22);
          } else if (pw.type === "life") {
            setGameState((prev) => ({ ...prev, lives: Math.min(5, prev.lives + 1) }));
          }
        }

        if (pw.y > CANVAS_HEIGHT + 20) {
          powerUpsRef.current.splice(pwIdx, 1);
        }
      });

      // 11. PARTICLES UPDATE & DRAW
      particlesRef.current.forEach((p, pIdx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particlesRef.current.splice(pIdx, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // 12. DRAW FLOATING TEXTS
      floatingTextsRef.current.forEach((t, tIdx) => {
        t.y += t.vy;
        t.opacity -= 0.02;

        if (t.opacity <= 0) {
          floatingTextsRef.current.splice(tIdx, 1);
        } else {
          ctx.fillStyle = `rgba(${t.color}, ${t.opacity})`;
          ctx.font = `bold ${t.size || 16}px "Space Grotesk", sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(t.text, t.x, t.y);
        }
      });

      // 13. DRAW FUTURISTIC SHIP
      let drawShip = true;
      if (invincibilityFrames.current > 0 && Math.floor(time / 100) % 2 === 0) {
        drawShip = false;
      }

      if (drawShip) {
        ctx.save();
        ctx.translate(playerX.current, playerY.current);

        // Draw Shield Bubble if Active
        if (activePowerUps.current.shieldCount > 0) {
          ctx.beginPath();
          ctx.arc(0, 0, 28, 0, Math.PI * 2);
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
          ctx.fill();
        }

        // Thrusters
        ctx.fillStyle = activePowerUps.current.speedTimer > 0 ? "#a855f7" : "#f97316";
        ctx.fillRect(-6, 12, 4, 4 + Math.random() * 10);
        ctx.fillRect(2, 12, 4, 4 + Math.random() * 10);

        // Left Wing
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(-24, 6);
        ctx.lineTo(-18, 14);
        ctx.lineTo(-4, 12);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = activeScenario.colorMain;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Right Wing
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.lineTo(24, 6);
        ctx.lineTo(18, 14);
        ctx.lineTo(4, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Center Core
        ctx.fillStyle = "#334155";
        ctx.fillRect(-4, -2, 8, 14);

        // Cockpit
        ctx.fillStyle = activeScenario.colorMain;
        ctx.beginPath();
        ctx.arc(0, -6, 5, Math.PI, 0, false);
        ctx.lineTo(5, 4);
        ctx.lineTo(-5, 4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      // 14. POWERUP CANVAS HUD BADGES
      let hudY = CANVAS_HEIGHT - 25;
      if (activePowerUps.current.spreadTimer > 0) {
        const secs = Math.ceil(activePowerUps.current.spreadTimer / 60);
        ctx.fillStyle = "#a855f7";
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = "left";
        ctx.fillText(`⚡ TRIPLO: ${secs}s`, 15, hudY);
        hudY -= 18;
      }
      if (activePowerUps.current.speedTimer > 0) {
        const secs = Math.ceil(activePowerUps.current.speedTimer / 60);
        ctx.fillStyle = "#ec4899";
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = "left";
        ctx.fillText(`🚀 TURBO: ${secs}s`, 15, hudY);
        hudY -= 18;
      }
      if (activePowerUps.current.shieldCount > 0) {
        ctx.fillStyle = "#3b82f6";
        ctx.font = 'bold 12px "Space Grotesk", sans-serif';
        ctx.textAlign = "left";
        ctx.fillText(`🛡️ ESCUDO (${activePowerUps.current.shieldCount})`, 15, hudY);
      }

      ctx.restore();

      // RED DAMAGE FLASH SCREEN OVERLAY
      if (damageFlash.current > 0) {
        ctx.fillStyle = `rgba(239, 68, 68, ${damageFlash.current / 20})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        damageFlash.current--;
      }

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameRef.current.lastSpawnTime = performance.now();
    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.showingChallenge, gameState.isGameOver, currentModuleIndex, currentTargetIndex, currentScenarioIndex]);

  // Handle Touch or Mouse Drag Movement
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    initAudioCtx();
    isDragging.current = true;
    updatePlayerPosition(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    updatePlayerPosition(e);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const updatePlayerPosition = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    playerX.current = Math.max(25, Math.min(CANVAS_WIDTH - 25, clickX));
  };

  const activeModule = modulesData[currentModuleIndex];
  const activeTarget = gameState.activeTarget;
  const activeScenario = scenariosData[currentScenarioIndex];

  const getNextNoteName = () => {
    const notes = modulesData[currentModuleIndex]?.notes || [];
    if (notes.length === 0) return "-";
    const nextIdx = (currentTargetIndex + 1) % notes.length;
    return notes[nextIdx]?.name || "-";
  };

  return (
    <div className="h-screen w-screen bg-[#020208] bg-cyber-grid text-white flex flex-col font-sans relative overflow-hidden select-none">
      
      {/* Starfield Background Layer */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-10 left-20 w-1 h-1 bg-white rounded-full"></div>
        <div className="absolute top-40 left-80 w-1 h-1 bg-white rounded-full"></div>
        <div className="absolute top-60 left-1/4 w-0.5 h-0.5 bg-cyan-300 rounded-full"></div>
        <div className="absolute top-20 right-1/4 w-1 h-1 bg-purple-400 rounded-full"></div>
        <div className="absolute bottom-40 left-1/3 w-1 h-1 bg-white rounded-full"></div>
      </div>

      {/* HEADER / NAVIGATION - Hidden during active gameplay */}
      {!(gameStarted && gameState.isPlaying) && (
        <header className="border-b border-cyan-900/50 bg-black/40 backdrop-blur-sm sticky top-0 z-40 shrink-0">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
                <Music className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div>
                <h1 className="font-display font-bold text-sm tracking-tight bg-gradient-to-r from-cyan-400 via-indigo-200 to-amber-300 bg-clip-text text-transparent">
                  CIFRAS ESTELARES
                </h1>
                <p className="text-[8px] text-cyan-400 font-bold uppercase tracking-widest leading-none">
                  ARCADE MUSICAL
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Scenario Selector Button ("Novos Cenários") */}
              <button
                onClick={() => {
                  initAudioCtx();
                  setCurrentScenarioIndex((prev) => (prev + 1) % scenariosData.length);
                }}
                id="scenario-switch-btn"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-950/40 text-xs font-semibold cursor-pointer transition-all hover:bg-indigo-900/40 text-indigo-200"
                title="Trocar Cenário Cosmico"
              >
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">{activeScenario.name}</span>
              </button>

              {/* Audio Toggle */}
              <button
                onClick={handleToggleSound}
                id="audio-toggle-btn"
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  soundEnabled 
                    ? "bg-cyan-950/40 border-cyan-500/40 text-cyan-400 hover:bg-cyan-900/30" 
                    : "bg-black/40 border-slate-800/80 text-slate-500 hover:bg-slate-800/30"
                }`}
                title={soundEnabled ? "Desativar Efeitos de Som" : "Ativar Efeitos de Som"}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {/* Background Music BGM Toggle */}
              <button
                onClick={handleToggleBGM}
                id="bgm-toggle-btn"
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  bgmEnabled 
                    ? "bg-amber-950/40 border-amber-500/40 text-amber-400 hover:bg-amber-900/30 shadow-[0_0_8px_rgba(245,158,11,0.2)]" 
                    : "bg-black/40 border-slate-800/80 text-slate-500 hover:bg-slate-800/30"
                }`}
                title={bgmEnabled ? "Desativar Música de Fundo" : "Ativar Música de Fundo"}
              >
                <Music className="w-3.5 h-3.5" />
              </button>

              {/* Modules Selector Button */}
              <button
                onClick={() => { initAudioCtx(); setShowModulesModal(true); }}
                id="modules-btn"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800/80 bg-black/40 text-xs font-semibold cursor-pointer transition-all hover:bg-slate-800/50"
              >
                <Compass className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow animate-duration-10000" />
                <span className="hidden sm:inline text-slate-300">Treino</span>
              </button>

              {/* Cheat Sheet Toggle */}
              <button
                onClick={() => { initAudioCtx(); setShowCheatSheet(true); }}
                id="cheat-sheet-btn"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-800/80 bg-black/40 text-xs font-semibold cursor-pointer transition-all hover:bg-slate-800/50"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline text-slate-300">Cifras</span>
              </button>

              {/* How to Play button */}
              <button
                onClick={() => setShowHowToPlay(true)}
                id="how-to-play-btn"
                className="p-1.5 rounded-lg bg-black/40 border border-slate-800/80 text-slate-300 hover:bg-slate-800/50 cursor-pointer"
                title="Como Jogar"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col items-center justify-center p-1.5 overflow-hidden">
        
        {/* MOBILE CENTER PLAYPORT */}
        <section className="w-full max-w-[430px] flex-1 flex flex-col items-center justify-center h-full overflow-hidden">
          
          {/* HIGH-TECH TOP HUD BAR WITH TARGET OBJECTIVE INTEGRATED ON TOP */}
          <div className="w-full bg-black/70 border-t border-x border-cyan-900/60 rounded-t-2xl px-3 py-1.5 flex flex-col gap-1.5 select-none relative overflow-hidden backdrop-blur-md z-10">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
            
            {/* ROW 1: SCORE, LEVEL, LIVES, COMBO */}
            <div className="grid grid-cols-3 gap-2 text-center items-center">
              {/* SCORE / HIGHSCORE */}
              <div className="flex flex-col justify-center text-left pl-0.5">
                <span className="text-[7px] text-gray-400 font-bold uppercase tracking-widest block">Pontos</span>
                <span className="text-xs font-mono font-bold text-cyan-100 leading-none mt-0.5">
                  {String(gameState.score).padStart(6, "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                </span>
                <span className="text-[6px] text-gray-500 font-mono block">
                  MAX: {gameState.highScore.toLocaleString()}
                </span>
              </div>

              {/* STAGE LEVEL */}
              <div className="flex flex-col items-center justify-center bg-cyan-950/30 border border-cyan-800/40 rounded-lg py-0.5 px-2">
                <span className="text-[7px] text-cyan-400 font-bold uppercase tracking-wider block">Fase</span>
                <span className="text-[11px] font-mono font-bold text-white leading-none mt-0.5">
                  {String(completedTargets.length + 1).padStart(2, "0")} / {String(activeModule.notes.length).padStart(2, "0")}
                </span>
              </div>

              {/* LIVES AND COMBO */}
              <div className="flex flex-col justify-center items-end pr-0.5">
                <span className="text-[7px] text-gray-400 font-bold uppercase tracking-widest block">Vidas</span>
                <div className="flex gap-0.5 mt-0.5 mb-0.5">
                  {[1, 2, 3, 4, 5].slice(0, Math.max(3, gameState.lives)).map((heartIdx) => {
                    const active = heartIdx <= gameState.lives;
                    return (
                      <div 
                        key={heartIdx} 
                        className={`w-2 h-2 rotate-45 border transition-all duration-300 ${
                          active 
                            ? "bg-red-500 border-red-300 shadow-[0_0_6px_rgba(239,68,68,0.7)] animate-pulse" 
                            : "bg-red-950 border-red-900 opacity-40"
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[6px] text-gray-500 font-bold block uppercase">Combo</span>
                  <span className="text-[10px] font-mono font-bold text-orange-400 italic leading-none">
                    x{gameState.combo}
                  </span>
                </div>
              </div>
            </div>

            {/* ROW 2: NOTA ALVO PANEL (MOVED TO THE TOP!) */}
            <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl px-2.5 py-1 flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 border border-cyan-400/50 rounded-lg bg-cyan-900/50 flex flex-col items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.25)] shrink-0">
                  <div className="text-[6px] uppercase text-cyan-300 font-extrabold tracking-tighter leading-none">Cifra</div>
                  <div className="text-sm font-black text-white leading-none mt-0.5">{activeTarget ? activeTarget.cipher : "-"}</div>
                </div>
                
                <div className="h-6 w-px bg-cyan-800/40"></div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7px] uppercase tracking-widest text-cyan-400 font-black leading-none">ALVO ATUAL</span>
                    <span className="text-[8px] font-mono font-extrabold text-amber-300 bg-amber-950/80 border border-amber-500/50 px-1.5 py-0.5 rounded-md shadow-[0_0_6px_rgba(245,158,11,0.3)]">
                      {targetHitCount}/{targetRequired} ACERTOS
                    </span>
                  </div>
                  <div className="text-[11px] font-black text-white tracking-wide mt-0.5">
                    DESTRUA: <span className="text-amber-300 underline font-display">{activeTarget ? activeTarget.name : "..."}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right pr-2 border-r border-cyan-800/40">
                  <div className="text-[7px] uppercase tracking-wider text-gray-400 font-bold">Próxima</div>
                  <div className="text-[10px] font-bold text-cyan-200 truncate max-w-[75px]">
                    {getNextNoteName()}
                  </div>
                </div>

                {/* MULTIPLIER BADGE DISPLAY */}
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 bg-amber-950/80 border border-amber-500/60 rounded-lg px-2 py-0.5 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                    <Zap className="w-3 h-3 text-amber-400 shrink-0 animate-pulse" />
                    <span className="text-[10px] font-mono font-black text-amber-300">
                      {calculateMultiplier().toFixed(1)}x
                    </span>
                  </div>
                  <span className="text-[6px] text-amber-400/80 font-bold uppercase tracking-tighter mt-0.5">
                    MULTIPLICADOR
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ACTIVE LEVEL PROGRESS BAR */}
          <div className="w-full h-1 bg-black border-x border-cyan-900/50 flex z-10">
            {Array.from({ length: targetRequired }).map((_, stepIdx) => (
              <div 
                key={stepIdx} 
                className={`flex-1 h-full border-r border-black/40 transition-all duration-300 ${
                  stepIdx < targetHitCount 
                    ? "bg-gradient-to-r from-cyan-400 to-indigo-500 shadow-[0_0_8px_rgba(34,211,238,0.4)]" 
                    : "bg-cyan-950/20"
                }`}
              />
            ))}
          </div>

          {/* THE EMULATED ARCADE VIEWPORT */}
          <div className="relative w-full aspect-[500/700] border-x border-b border-cyan-900/50 rounded-b-2xl shadow-2xl overflow-hidden bg-[#020208] flex-1">
            
            {/* CANVAS FOR 60FPS GRAPHICS */}
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="w-full h-full block cursor-crosshair touch-none"
            />

            {/* OVERLAY: TARGET SHIFT ALERT BANNER */}
            <AnimatePresence>
              {shiftAlert && (
                <motion.div
                  initial={{ y: -60, opacity: 0, scale: 0.8 }}
                  animate={{ y: 15, opacity: 1, scale: 1 }}
                  exit={{ y: -60, opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="absolute top-2 left-3 right-3 bg-gradient-to-r from-amber-500/95 via-yellow-400/95 to-amber-600/95 text-black px-3.5 py-2.5 rounded-xl shadow-[0_0_25px_rgba(251,191,36,0.8)] border-2 border-yellow-200 z-30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl animate-bounce">⚡</span>
                    <div>
                      <div className="text-[9px] font-black uppercase tracking-widest leading-none text-black/80">
                        MUDANÇA DE ALVO SURPRESA!
                      </div>
                      <div className="text-xs font-black tracking-tight leading-tight uppercase font-display text-black">
                        NOVO ALVO: <span className="underline">{shiftAlert.name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-black text-amber-300 rounded-lg text-xs font-mono font-black border border-amber-300/40">
                    {shiftAlert.cipher}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* OVERLAY: SCENARIO NOTICE BANNER */}
            <AnimatePresence>
              {scenarioNotice && (
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  className="absolute top-14 left-4 right-4 bg-indigo-950/95 border-2 border-cyan-400 text-white px-3.5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md z-30 text-center"
                >
                  <div className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest mb-0.5">
                    🌌 NOVO CENÁRIO DESBLOQUEADO:
                  </div>
                  <div className="text-sm font-black text-white font-display uppercase tracking-wide">
                    {scenarioNotice.name}
                  </div>
                  <div className="text-[9px] text-indigo-200 font-medium mt-0.5 leading-tight">
                    {scenarioNotice.description}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* TOUCH CONTROLS OVERLAY FOR MOBILE & TABLET (MINIMALIST & TRANSPARENT) */}
            {gameStarted && gameState.isPlaying && !gameState.showingChallenge && (
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between z-20 pointer-events-auto select-none gap-2">
                {/* LEFT SIDE: SLEEK MINIMAL TRANSPARENT JOYSTICK (NO ARROW BUTTONS) */}
                <div 
                  className="relative w-16 h-16 rounded-full bg-cyan-950/20 border border-cyan-400/30 flex items-center justify-center touch-none cursor-pointer backdrop-blur-[2px] shadow-lg shadow-cyan-950/50"
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    const rect = e.currentTarget.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const dx = (touch.clientX - centerX) / (rect.width / 2);
                    const dy = (touch.clientY - centerY) / (rect.height / 2);
                    joystickVector.current = { x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) };
                  }}
                  onTouchMove={(e) => {
                    const touch = e.touches[0];
                    const rect = e.currentTarget.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const dx = (touch.clientX - centerX) / (rect.width / 2);
                    const dy = (touch.clientY - centerY) / (rect.height / 2);
                    joystickVector.current = { x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) };
                  }}
                  onTouchEnd={() => {
                    joystickVector.current = { x: 0, y: 0 };
                  }}
                  onMouseDown={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    const dx = (e.clientX - centerX) / (rect.width / 2);
                    const dy = (e.clientY - centerY) / (rect.height / 2);
                    joystickVector.current = { x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) };
                  }}
                  onMouseUp={() => {
                    joystickVector.current = { x: 0, y: 0 };
                  }}
                >
                  <div className="text-[7px] text-cyan-400/40 font-bold pointer-events-none uppercase tracking-tighter">ANÁLOGO</div>
                  {/* Inner Knob Indicator */}
                  <div 
                    className="absolute w-7 h-7 rounded-full bg-gradient-to-br from-cyan-400/80 to-indigo-500/80 border border-white/80 shadow-md pointer-events-none transition-transform duration-75"
                    style={{
                      transform: `translate(${joystickVector.current.x * 18}px, ${joystickVector.current.y * 18}px)`
                    }}
                  />
                </div>

                {/* RIGHT SIDE: TRANSPARENT SHOOT BUTTON & AUTO-FIRE TOGGLE */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => setAutoFire(!autoFire)}
                    className={`px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                      autoFire 
                        ? "bg-amber-500/90 border-amber-300 text-black shadow-amber-500/30 animate-pulse" 
                        : "bg-black/30 border-cyan-800/40 text-cyan-300/70 hover:bg-cyan-950/40"
                    }`}
                  >
                    ⚡ AUTO: {autoFire ? "ON" : "OFF"}
                  </button>

                  <button
                    onTouchStart={(e) => {
                      e.preventDefault();
                      isShootButtonPressed.current = true;
                      initAudioCtx();
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      isShootButtonPressed.current = false;
                    }}
                    onMouseDown={() => {
                      isShootButtonPressed.current = true;
                      initAudioCtx();
                    }}
                    onMouseUp={() => {
                      isShootButtonPressed.current = false;
                    }}
                    className="w-16 h-16 rounded-full bg-red-600/35 hover:bg-red-600/60 active:bg-red-500/80 border border-red-400/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] flex flex-col items-center justify-center text-white active:scale-95 cursor-pointer touch-none select-none backdrop-blur-[2px] transition-all"
                  >
                    <span className="text-base leading-none">🔥</span>
                    <span className="text-[8px] font-black uppercase tracking-widest mt-0.5 text-white/90">ATIRAR</span>
                  </button>
                </div>
              </div>
            )}

            {/* OVERLAY 1: GAME START PAGE */}
            <AnimatePresence>
              {!gameStarted && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#020208]/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-20 overflow-y-auto"
                >
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-cyan-500/30 mb-3"
                  >
                    <Music className="w-6 h-6 text-white" />
                  </motion.div>

                  <h2 className="font-display font-black text-2xl tracking-tight leading-none mb-1 bg-gradient-to-r from-cyan-400 via-indigo-200 to-amber-300 bg-clip-text text-transparent">
                    CIFRAS ESTELARES
                  </h2>
                  <p className="text-cyan-400 text-[10px] uppercase tracking-widest font-bold mb-3">
                    Arcade Musical Ultra-Rápido!
                  </p>

                  <div className="w-full max-w-sm bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-3 text-left mb-3 text-[11px] text-slate-300 space-y-1.5">
                    <p className="font-bold text-cyan-400 text-center uppercase tracking-widest text-[9px] mb-1">🔥 NOVIDADES DA VERSÃO 2.0:</p>
                    <div className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-bold">⚡</span>
                      <p><strong className="text-cyan-300">Níveis Ultra Rápida:</strong> 1 acerto passa a cifra! A nota alvo muda de repente durante a batalha!</p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">👾</span>
                      <p><strong className="text-amber-300">Batalhas de Chefão:</strong> Enfrante naves boss no fim das fases, desvie de lasers e acerte weak points!</p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-purple-400 font-bold">🎁</span>
                      <p><strong className="text-purple-300">Power-ups Coletáveis:</strong> Pegue Tiro Triplo (⚡), Turbo Velocity (🚀), Escudo (🛡️) e Bombas (💥)!</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-full max-w-xs">
                    <button
                      onClick={startCampaign}
                      id="campaign-start-btn"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-indigo-600 hover:shadow-[0_0_15px_rgba(34,211,238,0.35)] text-white font-bold text-xs cursor-pointer shadow-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-white text-white" />
                      Iniciar Campanha Rápida
                    </button>

                    <button
                      onClick={() => startNewModule(activeModule.id)}
                      id="free-play-start-btn"
                      className="w-full py-2.5 rounded-xl bg-black/40 border border-cyan-900/50 hover:bg-cyan-950/20 text-cyan-100 font-bold text-xs cursor-pointer transition-all"
                    >
                      Treino Rápido (Módulo {activeModule.id})
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* OVERLAY 2: CHALLENGE SCREEN */}
            <AnimatePresence>
              {gameState.showingChallenge && gameState.isPlaying && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="absolute inset-0 bg-[#020208]/90 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-10"
                >
                  <motion.div 
                    initial={{ y: -15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="px-4 py-1 rounded-full bg-cyan-950/20 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-widest mb-3"
                  >
                    Alvo da Fase
                  </motion.div>

                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: [0.95, 1.03, 1] }}
                    transition={{ duration: 0.4 }}
                    className="p-6 rounded-2xl border border-cyan-500/30 bg-black/90 shadow-2xl shadow-cyan-500/10 max-w-sm w-full relative overflow-hidden"
                  >
                    <span className="text-[9px] text-cyan-400 font-extrabold uppercase tracking-widest block mb-0.5">
                      🎯 DESTRUA A CIFRA:
                    </span>
                    <h2 className="font-display font-black text-2xl tracking-tight text-white leading-tight uppercase select-none mb-3">
                      {activeTarget ? activeTarget.name : ""}
                    </h2>

                    <div className="h-[1px] bg-gradient-to-r from-transparent via-cyan-900/40 to-transparent my-2"></div>

                    <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                      Associe o nome à cifra correspondente. <br/>
                      1 acerto avança a fase! Cuidado com a mudança de alvo surpresa!
                    </p>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* OVERLAY 3: GAME OVER SCREEN */}
            <AnimatePresence>
              {gameState.isGameOver && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#020208]/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-20"
                >
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500 shadow-xl mb-3"
                  >
                    <Heart className="w-6 h-6 fill-red-500 text-red-500 animate-pulse" />
                  </motion.div>

                  <h2 className="font-display font-black text-2xl tracking-tight text-red-500 leading-none mb-1">
                    FIM DE JOGO
                  </h2>

                  <div className="w-full max-w-sm bg-cyan-950/10 border border-cyan-950/30 rounded-xl p-4 text-left mb-4 font-mono text-[11px] space-y-2">
                    <div className="flex justify-between items-center pb-1.5 border-b border-cyan-950/20">
                      <span className="text-gray-400 font-sans">Módulo Praticado:</span>
                      <span className="font-bold text-white text-right max-w-[150px] truncate">{activeModule.name.split(": ")[1]}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-sans">Pontuação Final:</span>
                      <span className="font-bold text-cyan-400 text-xs">{gameState.score}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 font-sans">Maior Combo:</span>
                      <span className="font-bold text-orange-400">{gameState.maxCombo}x</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 w-full max-w-xs">
                    <button
                      onClick={resetGame}
                      id="gameover-retry-btn"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-cyan-500 to-indigo-600 hover:shadow-[0_0_15px_rgba(34,211,238,0.35)] text-white font-bold text-xs uppercase cursor-pointer tracking-wider flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Tentar Novamente
                    </button>

                    <button
                      onClick={() => setGameStarted(false)}
                      id="gameover-menu-btn"
                      className="w-full py-2.5 rounded-xl bg-black/40 border border-cyan-900/50 hover:bg-cyan-950/20 text-cyan-100 font-bold text-xs cursor-pointer transition-all"
                    >
                      Voltar ao Menu Principal
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </section>
      </main>

      {/* MODAL 1: MODULES SELECTOR */}
      <AnimatePresence>
        {showModulesModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#090d16] border border-cyan-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-cyan-900/40 mb-4">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-display font-bold text-lg text-white">Módulos de Treino</h3>
                </div>
                <button 
                  onClick={() => setShowModulesModal(false)}
                  className="text-gray-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {modulesData.map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => {
                      setShowModulesModal(false);
                      startNewModule(mod.id);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      mod.id === modulesData[currentModuleIndex].id
                        ? "bg-cyan-950/40 border-cyan-400 text-white shadow-lg shadow-cyan-500/10"
                        : "bg-slate-900/50 border-slate-800/80 hover:bg-slate-800/50 text-slate-300"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-cyan-400 mb-0.5">{mod.name}</div>
                      <div className="text-[10px] text-gray-400">{mod.description}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-cyan-400 shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 2: CHEAT SHEET (TABELA DE CIFRAS) */}
      <AnimatePresence>
        {showCheatSheet && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#090d16] border border-indigo-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-indigo-900/40 mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-display font-bold text-lg text-white">Guia de Cifras Musicais</h3>
                </div>
                <button 
                  onClick={() => setShowCheatSheet(false)}
                  className="text-gray-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
                {[
                  { cipher: "C", name: "DÓ" },
                  { cipher: "D", name: "RÉ" },
                  { cipher: "E", name: "MI" },
                  { cipher: "F", name: "FÁ" },
                  { cipher: "G", name: "SOL" },
                  { cipher: "A", name: "LÁ" },
                  { cipher: "B", name: "SI" },
                  { cipher: "m", name: "Menor (ex: Cm)" },
                ].map((item, idx) => (
                  <div key={idx} className="p-3 bg-indigo-950/20 border border-indigo-800/30 rounded-xl">
                    <div className="text-lg font-bold text-indigo-300">{item.cipher}</div>
                    <div className="text-[10px] text-gray-400 font-sans mt-0.5">{item.name}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 3: HOW TO PLAY */}
      <AnimatePresence>
        {showHowToPlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#090d16] border border-cyan-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-cyan-900/40 mb-4">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-cyan-400" />
                  <h3 className="font-display font-bold text-lg text-white">Instruções de Jogo</h3>
                </div>
                <button 
                  onClick={() => setShowHowToPlay(false)}
                  className="text-gray-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <p>⚡ <strong className="text-white">Progressão Ultra Rápida:</strong> Acerte 1 vez a cifra correspondente ao alvo e passe para a próxima cifra instantaneamente!</p>
                <p>⚡ <strong className="text-white">Mudança de Alvo Surpresa:</strong> A cada alguns segundos a nota alvo pode mudar inesperadamente, mantendo a atenção máxima!</p>
                <p>👾 <strong className="text-white">Naves Boss:</strong> Enfrente naves chefão periódicas, esquivando-se de seus tiros de plasma e destruindo suas cifras alvos para arrancar HP do boss!</p>
                <p>🎁 <strong className="text-white">Power-ups:</strong> Colete cápsulas voadoras de Tiro Triplo (⚡), Turbo (🚀), Escudo (🛡️) e Bombas (💥)!</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="border-t border-cyan-950/40 bg-black/60 py-1.5 px-4 text-center shrink-0">
        <p className="text-[9px] text-gray-500">
          Cifras Estelares 2.0 • Aprendizado Rápido de Teoria Musical & Arcade
        </p>
      </footer>
    </div>
  );
}
