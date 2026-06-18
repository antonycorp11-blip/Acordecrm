import React, { useState, useEffect, useCallback } from 'react';

interface ChordRushProps {
  onClose: () => void;
  onGameOver: (score: number) => void;
  playRetroSound: (frequency: number, type: OscillatorType, duration: number) => void;
}

const CHORDS = [
  // Maiores
  { name: 'Dó Maior', notes: 'C', fakeNotes: ['Cm', 'C7', 'G', 'C9'] },
  { name: 'Ré Maior', notes: 'D', fakeNotes: ['Dm', 'D7', 'A', 'D9'] },
  { name: 'Mi Maior', notes: 'E', fakeNotes: ['Em', 'E7', 'B', 'E9'] },
  { name: 'Fá Maior', notes: 'F', fakeNotes: ['Fm', 'F7', 'C', 'F9'] },
  { name: 'Sol Maior', notes: 'G', fakeNotes: ['Gm', 'G7', 'D', 'G9'] },
  { name: 'Lá Maior', notes: 'A', fakeNotes: ['Am', 'A7', 'E', 'A9'] },
  { name: 'Si Maior', notes: 'B', fakeNotes: ['Bm', 'B7', 'F#', 'B9'] },
  // Menores
  { name: 'Dó Menor', notes: 'Cm', fakeNotes: ['C', 'Cm7', 'Gm', 'Cdim'] },
  { name: 'Ré Menor', notes: 'Dm', fakeNotes: ['D', 'Dm7', 'Am', 'Ddim'] },
  { name: 'Mi Menor', notes: 'Em', fakeNotes: ['E', 'Em7', 'Bm', 'Edim'] },
  { name: 'Fá Menor', notes: 'Fm', fakeNotes: ['F', 'Fm7', 'Cm', 'Fdim'] },
  { name: 'Sol Menor', notes: 'Gm', fakeNotes: ['G', 'Gm7', 'Dm', 'Gdim'] },
  { name: 'Lá Menor', notes: 'Am', fakeNotes: ['A', 'Am7', 'Em', 'Adim'] },
  { name: 'Si Menor', notes: 'Bm', fakeNotes: ['B', 'Bm7', 'F#m', 'Bdim'] },
  // Com Sétima
  { name: 'Dó com Sétima', notes: 'C7', fakeNotes: ['C', 'Cmaj7', 'Cm7', 'G7'] },
  { name: 'Ré com Sétima', notes: 'D7', fakeNotes: ['D', 'Dmaj7', 'Dm7', 'A7'] },
  { name: 'Mi com Sétima', notes: 'E7', fakeNotes: ['E', 'Emaj7', 'Em7', 'B7'] },
  { name: 'Fá com Sétima', notes: 'F7', fakeNotes: ['F', 'Fmaj7', 'Fm7', 'C7'] },
  { name: 'Sol com Sétima', notes: 'G7', fakeNotes: ['G', 'Gmaj7', 'Gm7', 'D7'] },
  { name: 'Lá com Sétima', notes: 'A7', fakeNotes: ['A', 'Amaj7', 'Am7', 'E7'] },
  { name: 'Si com Sétima', notes: 'B7', fakeNotes: ['B', 'Bmaj7', 'Bm7', 'F#7'] },
];

export const ChordRush: React.FC<ChordRushProps> = ({ onClose, onGameOver, playRetroSound }) => {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(100);
  const [currentChord, setCurrentChord] = useState(CHORDS[0]);
  const [options, setOptions] = useState<string[]>([]);
  const [isCorrectFeedback, setIsCorrectFeedback] = useState<boolean | null>(null);
  const [combo, setCombo] = useState(0);
  const [availableChords, setAvailableChords] = useState<typeof CHORDS>([]);

  const generateLevel = useCallback(() => {
    setAvailableChords((prevAvailable) => {
      let pool = prevAvailable.length > 0 ? prevAvailable : [...CHORDS];
      
      const randomIndex = Math.floor(Math.random() * pool.length);
      const randomChord = pool[randomIndex];
      const newPool = pool.filter((_, i) => i !== randomIndex);
      
      setCurrentChord(randomChord);
      
      const shuffledFakes = [...randomChord.fakeNotes].sort(() => 0.5 - Math.random());
      const levelOptions = [randomChord.notes, ...shuffledFakes.slice(0, 3)];
      setOptions(levelOptions.sort(() => 0.5 - Math.random()));
      setIsCorrectFeedback(null);
      
      return newPool;
    });
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === 'playing') {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleGameOver();
            return 0;
          }
          return prev - 2; // Decreases every 100ms
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [gameState]);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setCombo(0);
    setTimeLeft(100);
    generateLevel();
    playRetroSound(880, 'square', 0.1);
    setTimeout(() => playRetroSound(1760, 'square', 0.25), 100);
  };

  const handleGameOver = () => {
    setGameState('gameover');
    playRetroSound(150, 'sawtooth', 0.5);
    setTimeout(() => playRetroSound(100, 'sawtooth', 0.8), 300);
    onGameOver(score);
  };

  const handleOptionClick = (option: string) => {
    if (gameState !== 'playing') return;

    if (option === currentChord.notes) {
      // Correct!
      setIsCorrectFeedback(true);
      const newCombo = combo + 1;
      setCombo(newCombo);
      const points = 10 + (Math.min(newCombo, 5) * 2); // 10 base + up to 10 combo bonus
      
      playRetroSound(880, 'sine', 0.1);
      setTimeout(() => playRetroSound(1320, 'sine', 0.15), 100);
      setScore((s) => s + points);
      setTimeLeft(100); // Reset time for next chord
      setTimeout(generateLevel, 300);
    } else {
      // Wrong!
      setIsCorrectFeedback(false);
      setCombo(0);
      handleGameOver();
    }
  };

  return (
    <div className="bg-black border-8 border-[#3d2d26] p-4 shadow-[8px_8px_0_#000] flex flex-col gap-4 relative">
      {/* Decorative Top Line */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => {
            if (gameState !== 'gameover' && score > 0) {
              onGameOver(score);
            }
            onClose();
          }}
          className="bg-[#261812] text-[#feccba] border-2 border-[#feccba] font-black text-[7px] uppercase px-2.5 py-1 hover:bg-black active:translate-y-[1px] transition-all cursor-pointer"
        >
          ← SAIR DO JOGO
        </button>
        <span className="text-[#ff6b00] font-black text-[8px] uppercase tracking-widest animate-pulse">
          CHORDRUSH_GABINETE_v1.0
        </span>
      </div>

      <div className="bg-[#1a0a05] border-4 border-[#3d2d26] p-3 font-mono text-center space-y-2">
        <div className="flex justify-between text-[10px] text-[#feccba] font-black uppercase">
          <span>SCORE: {score}</span>
          <span className={`text-[#00ff66] ${combo > 1 ? 'animate-pulse' : ''}`}>COMBO x{combo}</span>
          <span>TIME: {Math.max(0, timeLeft)}%</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-[#3d2d26] h-2 border border-black relative overflow-hidden">
          <div 
            className={`h-full transition-all duration-100 ${timeLeft > 30 ? 'bg-[#00ff66]' : 'bg-red-500'}`}
            style={{ width: `${timeLeft}%` }}
          />
        </div>
      </div>

      {gameState === 'start' && (
        <div className="py-8 flex flex-col items-center justify-center text-center gap-4">
          <h2 className="text-[#00ff66] font-black text-2xl uppercase tracking-widest animate-pulse">
            CHORD RUSH
          </h2>
          <p className="text-[#feccba] font-black text-[10px] uppercase max-w-[200px] leading-relaxed">
            Identifique o acorde correto pelo nome antes que o tempo acabe!
          </p>
          <button
            onClick={startGame}
            className="mt-2 bg-[#ff6b00] text-white hover:bg-white hover:text-black font-black text-sm py-3 px-6 border-4 border-black uppercase tracking-widest shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          >
            🕹️ INSERT COIN
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="flex flex-col items-center gap-6 py-2">
          <div className={`text-6xl font-black transition-all ${isCorrectFeedback === true ? 'text-[#00ff66] scale-110' : 'text-white'}`}>
            {currentChord.name}
          </div>
          
          <div className="grid grid-cols-2 gap-3 w-full">
            {options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleOptionClick(opt)}
                className={`p-4 border-4 border-black font-black text-xs uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer ${
                  isCorrectFeedback === false && opt !== currentChord.notes 
                    ? 'bg-red-600 text-white' 
                    : 'bg-[#fff8f6] text-black hover:bg-[#feccba]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="py-6 flex flex-col items-center text-center gap-4">
          <h2 className="text-red-500 font-black text-3xl uppercase tracking-widest animate-bounce">
            GAME OVER
          </h2>
          <div className="bg-[#261812] border-4 border-black p-4 w-full">
            <p className="text-[#feccba] font-black text-[10px] uppercase">
              PONTUAÇÃO FINAL: <span className="text-[#00ff66] text-lg">{score}</span>
            </p>
          </div>
          <button
            onClick={startGame}
            className="mt-2 bg-white text-black hover:bg-[#ff6b00] hover:text-white font-black text-xs py-3 px-6 border-4 border-black uppercase tracking-widest shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          >
            🔄 JOGAR NOVAMENTE
          </button>
        </div>
      )}
    </div>
  );
};
