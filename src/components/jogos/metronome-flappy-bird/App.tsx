/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { DeviceFrame } from './components/DeviceFrame';
import { Header } from './components/Header';
import { MainMenu } from './components/MainMenu';
import { LessonsPanel } from './components/LessonsPanel';
import { StatsPanel } from './components/StatsPanel';
import { PracticePanel } from './components/PracticePanel';
import { GameCanvas } from './components/GameCanvas';
import { ShopPanel } from './components/ShopPanel';
import { soundEngine } from './soundEngine';
import { GameState, Lesson, UserStats } from './types';
import { RefreshCw, Play, Home, Award, Calendar, ChevronRight } from 'lucide-react';

const INITIAL_LESSONS: Lesson[] = [
  {
    id: 1,
    title: 'Pulso Firme',
    bpm: 80,
    description: 'Aprenda a sentir a batida principal em um ritmo confortável de 80 BPM. Sincronize seus saltos com o metrônomo.',
    minAccuracy: 60,
    targetPipes: 4,
    difficulty: 'Fácil',
    unlocked: true,
    completed: false,
  },
  {
    id: 2,
    title: 'Andamento Moderado',
    bpm: 100,
    description: 'Suba para 100 BPM! O ritmo acelera um pouco, exigindo toques mais precisos e reações mais rápidas.',
    minAccuracy: 65,
    targetPipes: 6,
    difficulty: 'Médio',
    unlocked: false,
    completed: false,
  },
  {
    id: 3,
    title: 'Voo Sincopado',
    bpm: 115,
    description: 'Em 115 BPM, os canos começam a se mover verticalmente! Siga o ritmo do metrônomo com precisão absoluta.',
    minAccuracy: 70,
    targetPipes: 8,
    difficulty: 'Médio',
    unlocked: false,
    completed: false,
  },
  {
    id: 4,
    title: 'Corrente Rápida',
    bpm: 130,
    description: '130 BPM! Ritmo rápido e canos em movimento contínuo com passagens estreitas. Concentração rítmica máxima!',
    minAccuracy: 75,
    targetPipes: 10,
    difficulty: 'Difícil',
    unlocked: false,
    completed: false,
  },
  {
    id: 5,
    title: 'O Núcleo do Ritmo',
    bpm: 150,
    description: 'O teste definitivo de velocidade e tempo: 150 BPM! Espaçamento estreito e desvios rápidos de batida.',
    minAccuracy: 80,
    targetPipes: 12,
    difficulty: 'Mestre',
    unlocked: false,
    completed: false,
  },
];

const INITIAL_STATS: UserStats = {
  highScore: 0,
  totalAttempts: 0,
  perfectHits: 0,
  goodHits: 0,
  misses: 0,
  avgAccuracy: 0,
  totalTaps: 0,
  longestCombo: 0,
  unlockedStage: 1,
  unlockedCharacterIds: ['bird_classic', 'eighth_note'],
  selectedCharacterId: 'bird_classic',
};

export interface MetronomeFlappyBirdProps {
  onClose: () => void;
  onGameOver?: (score: number) => void;
}

export default function App({ onClose, onGameOver: onGameOverProp }: MetronomeFlappyBirdProps) {
  const [gameState, setGameState] = useState<GameState>('MENU');
  const [isMuted, setIsMuted] = useState(false);
  const [score, setScore] = useState(0);
  const [gameMode, setGameMode] = useState<'ENDLESS' | 'LESSON'>('ENDLESS');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | undefined>(undefined);
  
  // Game session diagnostics (timing logs)
  const [sessionStats, setSessionStats] = useState({
    perfects: 0,
    goods: 0,
    misses: 0,
    combo: 0,
  });

  // Persistent User Statistics
  const [userStats, setUserStats] = useState<UserStats>(INITIAL_STATS);
  const [lessons, setLessons] = useState<Lesson[]>(INITIAL_LESSONS);

  // Load stats from localStorage
  useEffect(() => {
    const savedStats = localStorage.getItem('metronome_bird_stats_v1');
    const savedLessons = localStorage.getItem('metronome_bird_lessons_v1');

    if (savedStats) {
      try {
        const parsed = JSON.parse(savedStats);
        setUserStats(parsed);
      } catch (e) {
        console.error("Error parsing user statistics", e);
      }
    }

    if (savedLessons) {
      try {
        const parsed = JSON.parse(savedLessons);
        setLessons(parsed);
      } catch (e) {
        console.error("Error parsing lessons history", e);
      }
    }

    // Set initial mute state from soundEngine config
    setIsMuted(soundEngine.getMutedState());
  }, []);

  // Save stats to localStorage helper
  const saveStats = (newStats: UserStats, updatedLessons?: Lesson[]) => {
    setUserStats(newStats);
    localStorage.setItem('metronome_bird_stats_v1', JSON.stringify(newStats));
    
    if (updatedLessons) {
      setLessons(updatedLessons);
      localStorage.setItem('metronome_bird_lessons_v1', JSON.stringify(updatedLessons));
    }
  };

  // Sound toggle handler
  const handleMuteToggle = () => {
    const newState = soundEngine.toggleMute();
    setIsMuted(newState);
  };

  // Navigation handlers
  const handleGoHome = () => {
    setGameState('MENU');
    setSelectedLesson(undefined);
  };

  // Start Endless Game
  const handleStartEndless = () => {
    setGameMode('ENDLESS');
    setGameState('PLAYING');
  };

  // Start Lesson Game
  const handleStartLesson = (lesson: Lesson) => {
    setGameMode('LESSON');
    setSelectedLesson(lesson);
    setGameState('PLAYING');
  };

  // Lesson Success Completion
  const handleLessonComplete = (lessonId: number, lessonScore: number) => {
    const nextStageId = lessonId + 1;
    const isNewUnlock = nextStageId > userStats.unlockedStage && nextStageId <= 5;
    const newUnlockedStage = isNewUnlock ? nextStageId : userStats.unlockedStage;

    const updatedLessons = lessons.map(les => {
      if (les.id === lessonId) {
        return { ...les, completed: true };
      }
      if (les.id === nextStageId) {
        return { ...les, unlocked: true };
      }
      return les;
    });

    const currentCoins = userStats.coins !== undefined ? userStats.coins : 25;

    // Update global profile statistics
    const updatedStats: UserStats = {
      ...userStats,
      totalAttempts: userStats.totalAttempts + 1,
      unlockedStage: newUnlockedStage,
      highScore: Math.max(userStats.highScore, lessonScore),
      coins: currentCoins + lessonScore + 5, // 5 extra coin complete bonus
    };

    saveStats(updatedStats, updatedLessons);
    if (onGameOverProp) {
      onGameOverProp(Math.max(lessonScore, 1));
    }
  };

  // Game Over trigger
  const handleGameOver = (
    finalScore: number,
    stats: { perfects: number; goods: number; misses: number; combo: number }
  ) => {
    setScore(finalScore);
    setSessionStats(stats);
    setGameState('GAMEOVER');

    const currentCoins = userStats.coins !== undefined ? userStats.coins : 25;

    // Compile global stats
    const updatedStats: UserStats = {
      ...userStats,
      highScore: gameMode === 'ENDLESS' ? Math.max(userStats.highScore, finalScore) : userStats.highScore,
      totalAttempts: userStats.totalAttempts + 1,
      perfectHits: userStats.perfectHits + stats.perfects,
      goodHits: userStats.goodHits + stats.goods,
      misses: userStats.misses + stats.misses,
      longestCombo: Math.max(userStats.longestCombo, stats.combo),
      totalTaps: userStats.totalTaps + stats.perfects + stats.goods + stats.misses,
      coins: currentCoins + finalScore, // 1 coin per cleared pipe
    };

    saveStats(updatedStats);
    if (onGameOverProp) {
      onGameOverProp(finalScore);
    }
  };

  // Reset global stats
  const handleResetStats = () => {
    localStorage.removeItem('metronome_bird_stats_v1');
    localStorage.removeItem('metronome_bird_lessons_v1');
    setUserStats(INITIAL_STATS);
    setLessons(INITIAL_LESSONS);
  };

  const handleEquipCharacter = (id: string) => {
    const updatedStats: UserStats = {
      ...userStats,
      selectedCharacterId: id,
    };
    saveStats(updatedStats);
  };

  const handleBuyCharacter = (id: string, cost: number) => {
    const currentCoins = userStats.coins !== undefined ? userStats.coins : 25;
    const currentUnlocked = userStats.unlockedCharacterIds ?? ['bird_classic', 'eighth_note'];

    if (currentCoins >= cost && !currentUnlocked.includes(id)) {
      const updatedStats: UserStats = {
        ...userStats,
        coins: currentCoins - cost,
        unlockedCharacterIds: [...currentUnlocked, id],
        selectedCharacterId: id, // auto-equip
      };
      saveStats(updatedStats);
    }
  };

  // Compute title based on current screen
  const getHeaderTitle = () => {
    switch (gameState) {
      case 'MENU':
        return 'PÁSSARO RÍTMICO';
      case 'PLAYING':
        return gameMode === 'LESSON' && selectedLesson 
          ? `AULA ${selectedLesson.id}: ${selectedLesson.bpm} BPM` 
          : 'MODO INFINITO';
      case 'GAMEOVER':
        return 'FIM DE JOGO';
      case 'LESSONS':
        return 'LIÇÕES RÍTMICAS';
      case 'STATS':
        return 'DIAGNÓSTICO';
      case 'PRACTICE':
        return 'METRÔNOMO LIVRE';
      case 'SHOP':
        return 'LOJA DE PERSONAGENS';
      default:
        return 'METROBIRD';
    }
  };

  // Game over advisory commentary
  const getAdvisoryComment = () => {
    const totalHits = sessionStats.perfects + sessionStats.goods;
    const totalTaps = totalHits + sessionStats.misses;
    const acc = totalTaps > 0 ? Math.round((totalHits / totalTaps) * 100) : 0;

    if (score === 0) {
      return "Siga a fita rítmica de diamantes no topo para acertar as batidas!";
    }
    if (acc >= 85) {
      return "Sua estabilidade de tempo é perfeita! Ótimo senso rítmico.";
    }
    if (sessionStats.perfects > sessionStats.goods * 2) {
      return "Precisão fantástica nos cliques perfeitos! Continue estendendo seus combos.";
    }
    if (sessionStats.misses > totalHits) {
      return "Você está errando o andamento. Pratique no 'Treino de Batida' para sincronizar seu ouvido.";
    }
    return "Sempre espere o som do metrônomo antes de clicar para evitar adiantar.";
  };

  return (
    <DeviceFrame>
      {/* Dynamic Navigation Header */}
      <Header
        title={getHeaderTitle()}
        showBack={gameState !== 'MENU'}
        onBack={handleGoHome}
        onClose={onClose}
        highScore={userStats.highScore}
        onMuteToggle={handleMuteToggle}
        isMuted={isMuted}
      />

      {/* Primary Subpanels Router */}
      {gameState === 'MENU' && (
        <MainMenu
          onStartEndless={handleStartEndless}
          onOpenLessons={() => setGameState('LESSONS')}
          onOpenPractice={() => setGameState('PRACTICE')}
          onOpenStats={() => setGameState('STATS')}
          onOpenShop={() => setGameState('SHOP')}
          highScore={userStats.highScore}
        />
      )}

      {gameState === 'PLAYING' && (
        <GameCanvas
          mode={gameMode}
          selectedLesson={selectedLesson}
          onGameOver={handleGameOver}
          onLessonComplete={handleLessonComplete}
          onGoHome={handleGoHome}
          userStats={userStats}
        />
      )}

      {gameState === 'LESSONS' && (
        <LessonsPanel
          lessons={lessons}
          onSelectLesson={handleStartLesson}
          unlockedStage={userStats.unlockedStage}
        />
      )}

      {gameState === 'STATS' && (
        <StatsPanel
          stats={userStats}
          onResetStats={handleResetStats}
        />
      )}

      {gameState === 'PRACTICE' && (
        <PracticePanel />
      )}

      {gameState === 'SHOP' && (
        <ShopPanel
          stats={userStats}
          onEquipCharacter={handleEquipCharacter}
          onBuyCharacter={handleBuyCharacter}
          onBack={handleGoHome}
        />
      )}

      {gameState === 'GAMEOVER' && (
        <div className="flex-1 flex flex-col justify-between p-6 bg-[#121212] overflow-y-auto">
          {/* Header message */}
          <div className="text-center mt-2">
            <h2 
              className="font-mono text-3xl font-black text-rose-500 uppercase tracking-widest mb-1 animate-pulse"
              style={{ textShadow: '2px 2px 0px #000' }}
            >
              FIM DE JOGO
            </h2>
            <p className="font-mono text-[10px] text-gray-500 uppercase">
              Seu voo rítmico terminou
            </p>
          </div>

          {/* Core Score card */}
          <div className="bg-[#FFFDF9] border-4 border-black rounded-xl p-4 my-4 shadow-[4px_4px_0px_#000] text-black">
            <div className="text-center pb-3 border-b-2 border-black/10">
              <span className="font-mono text-[10px] text-gray-500 uppercase block font-bold">Canos Superados</span>
              <span className="font-mono text-4xl font-black text-black">{score}</span>
            </div>

            {/* Precision logs */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-4 font-mono text-[10px] leading-none">
              <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 px-2 py-1.5 rounded">
                <span className="text-emerald-700 font-bold">PERFEITO</span>
                <span className="font-black text-emerald-800">{sessionStats.perfects}</span>
              </div>
              <div className="flex justify-between items-center bg-cyan-50 border border-cyan-200 px-2 py-1.5 rounded">
                <span className="text-cyan-700 font-bold">BOM</span>
                <span className="font-black text-cyan-800">{sessionStats.goods}</span>
              </div>
              <div className="flex justify-between items-center bg-rose-50 border border-rose-200 px-2 py-1.5 rounded">
                <span className="text-rose-700 font-bold">ERROS</span>
                <span className="font-black text-rose-800">{sessionStats.misses}</span>
              </div>
              <div className="flex justify-between items-center bg-amber-50 border border-amber-200 px-2 py-1.5 rounded">
                <span className="text-amber-700 font-bold">MAX COMBO</span>
                <span className="font-black text-amber-800">x{sessionStats.combo}</span>
              </div>
            </div>
          </div>

          {/* Diagnostic commentary box */}
          <div className="bg-[#1a1a1a] border-2 border-black/80 rounded-lg p-3.5 mb-6 text-center">
            <span className="font-mono text-[9px] text-[#FF5F00] font-black uppercase tracking-wider block mb-1">Análise do Professor</span>
            <p className="font-mono text-[10px] text-gray-300 leading-normal">
              "{getAdvisoryComment()}"
            </p>
          </div>

          {/* Action trigger buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                soundEngine.playPerfect();
                setGameState('PLAYING');
                // Auto trigger restart parameters
              }}
              className="w-full h-12 bg-[#FF5F00] hover:bg-[#ff7722] text-white border-4 border-black rounded-xl font-mono text-xs font-black uppercase shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
              id="try-again-btn"
            >
              TENTAR NOVAMENTE
            </button>

            <button
              onClick={() => {
                soundEngine.playGood();
                handleGoHome();
              }}
              className="w-full h-10 bg-[#FFFDF9] hover:bg-[#eae6de] text-black border-2 border-black rounded-xl font-mono text-[10px] font-black uppercase shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
              id="exit-to-menu-btn"
            >
              VOLTAR AO MENU
            </button>
          </div>
        </div>
      )}
    </DeviceFrame>
  );
}
