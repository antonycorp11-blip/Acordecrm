import React, { useState, useEffect, useCallback } from 'react';

interface TriadeNinjaProps {
  onClose: () => void;
  onGameOver: (score: number) => void;
  playRetroSound: (frequency: number, type: OscillatorType, duration: number) => void;
}

// Tríades Básicas para o jogo
const TRIADES = [
  { notes: 'C - E - G', answer: 'Dó Maior', type: 'maior' },
  { notes: 'C - Eb - G', answer: 'Dó Menor', type: 'menor' },
  { notes: 'D - F# - A', answer: 'Ré Maior', type: 'maior' },
  { notes: 'D - F - A', answer: 'Ré Menor', type: 'menor' },
  { notes: 'E - G# - B', answer: 'Mi Maior', type: 'maior' },
  { notes: 'E - G - B', answer: 'Mi Menor', type: 'menor' },
  { notes: 'F - A - C', answer: 'Fá Maior', type: 'maior' },
  { notes: 'F - Ab - C', answer: 'Fá Menor', type: 'menor' },
  { notes: 'G - B - D', answer: 'Sol Maior', type: 'maior' },
  { notes: 'G - Bb - D', answer: 'Sol Menor', type: 'menor' },
  { notes: 'A - C# - E', answer: 'Lá Maior', type: 'maior' },
  { notes: 'A - C - E', answer: 'Lá Menor', type: 'menor' },
  { notes: 'B - D# - F#', answer: 'Si Maior', type: 'maior' },
  { notes: 'B - D - F#', answer: 'Si Menor', type: 'menor' },
  // Algumas diminutas e aumentadas para desafio
  { notes: 'B - D - F', answer: 'Si Diminuta', type: 'diminuta' },
  { notes: 'C - E - G#', answer: 'Dó Aumentada', type: 'aumentada' },
];

export const TriadeNinja: React.FC<TriadeNinjaProps> = ({ onClose, onGameOver, playRetroSound }) => {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentTriad, setCurrentTriad] = useState(TRIADES[0]);
  const [options, setOptions] = useState<string[]>([]);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [combo, setCombo] = useState(0);

  const generateRound = useCallback(() => {
    const target = TRIADES[Math.floor(Math.random() * TRIADES.length)];
    setCurrentTriad(target);
    
    // Generates 3 other wrong answers
    const wrongs = TRIADES.filter(t => t.answer !== target.answer).sort(() => 0.5 - Math.random()).slice(0, 3);
    const roundOptions = [target.answer, ...wrongs.map(w => w.answer)].sort(() => 0.5 - Math.random());
    
    setOptions(roundOptions);
    setFeedbackState('idle');
  }, []);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    setCombo(0);
    generateRound();
    playRetroSound(440, 'square', 0.1);
    setTimeout(() => playRetroSound(660, 'square', 0.1), 100);
    setTimeout(() => playRetroSound(880, 'square', 0.2), 200);
  };

  const handleGameOver = () => {
    setGameState('gameover');
    playRetroSound(200, 'sawtooth', 0.3);
    setTimeout(() => playRetroSound(150, 'sawtooth', 0.3), 300);
    setTimeout(() => playRetroSound(100, 'sawtooth', 0.6), 600);
    onGameOver(score);
  };

  const handleGuess = (guess: string) => {
    if (feedbackState !== 'idle' || gameState !== 'playing') return;

    if (guess === currentTriad.answer) {
      setFeedbackState('correct');
      const newCombo = combo + 1;
      setCombo(newCombo);
      setScore(s => s + (10 * newCombo)); // Combo multiplier
      
      playRetroSound(880, 'sine', 0.1);
      setTimeout(() => playRetroSound(1320, 'sine', 0.1), 100);
      
      setTimeout(() => {
        generateRound();
      }, 500);
    } else {
      setFeedbackState('wrong');
      setCombo(0);
      const newLives = lives - 1;
      setLives(newLives);
      
      playRetroSound(150, 'square', 0.3);
      
      if (newLives <= 0) {
        setTimeout(() => handleGameOver(), 500);
      } else {
        setTimeout(() => {
          generateRound();
        }, 800);
      }
    }
  };

  return (
    <div className="bg-[#110804] border-8 border-purple-900 p-4 shadow-[8px_8px_0_#000] flex flex-col gap-4 relative font-['Space_Mono']">
      {/* HUD */}
      <div className="flex justify-between items-center border-b-4 border-purple-900 pb-2">
        <button
          onClick={onClose}
          className="bg-purple-900 text-white font-black text-[8px] uppercase px-2 py-1 shadow-[2px_2px_0_#000] active:translate-y-[1px] transition-all cursor-pointer"
        >
          ← RETORNAR
        </button>
        <div className="flex gap-1 text-red-500 text-sm">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={i < lives ? 'opacity-100' : 'opacity-20 grayscale'}>❤️</span>
          ))}
        </div>
      </div>

      <div className="bg-black border-4 border-purple-600 p-2 text-center flex justify-between px-4 items-center">
        <span className="text-purple-400 font-black text-xs uppercase">SCORE: {score}</span>
        <span className={`text-yellow-400 font-black text-xs uppercase ${combo > 1 ? 'animate-pulse' : ''}`}>
          COMBO x{combo}
        </span>
      </div>

      {gameState === 'start' && (
        <div className="py-10 flex flex-col items-center justify-center text-center gap-6">
          <h2 className="text-purple-500 font-black text-3xl uppercase tracking-widest drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
            TRÍADE NINJA
          </h2>
          <p className="text-purple-200 font-black text-[10px] uppercase max-w-[200px] leading-relaxed">
            Identifique o acorde correto a partir de suas 3 notas! Erre 3 vezes e é GAME OVER.
          </p>
          <button
            onClick={startGame}
            className="mt-4 bg-purple-600 text-white hover:bg-white hover:text-purple-900 font-black text-sm py-3 px-6 border-4 border-black uppercase tracking-widest shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          >
            🕹️ INICIAR TREINO
          </button>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="flex flex-col items-center gap-8 py-6">
          <div className="relative">
            <div className={`text-4xl md:text-5xl text-center font-black transition-all duration-300 ${
              feedbackState === 'correct' ? 'text-green-400 scale-110 drop-shadow-[0_0_15px_#4ade80]' : 
              feedbackState === 'wrong' ? 'text-red-500 scale-90 translate-x-2' : 'text-purple-300'
            }`}>
              {currentTriad.notes}
            </div>
            {feedbackState === 'wrong' && (
              <div className="absolute -bottom-6 left-0 right-0 text-center text-red-500 font-black text-[10px] uppercase animate-bounce">
                Era: {currentTriad.answer}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full px-2">
            {options.map((opt, idx) => {
              let btnClass = "bg-[#1a0a05] text-purple-200 border-purple-900 hover:bg-purple-900";
              
              if (feedbackState !== 'idle') {
                if (opt === currentTriad.answer) {
                  btnClass = "bg-green-600 text-white border-green-800 scale-105"; // Reveal correct
                } else {
                  btnClass = "bg-black text-gray-600 border-gray-800 opacity-50"; // Dim others
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleGuess(opt)}
                  disabled={feedbackState !== 'idle'}
                  className={`p-4 border-4 font-black text-[10px] uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer ${btnClass}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="py-8 flex flex-col items-center text-center gap-6">
          <h2 className="text-red-600 font-black text-4xl uppercase tracking-widest drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]">
            FIM DE JOGO
          </h2>
          <div className="bg-black border-4 border-purple-900 p-6 w-full shadow-[inset_0_0_20px_rgba(88,28,135,0.5)]">
            <p className="text-purple-300 font-black text-xs uppercase mb-2">PONTUAÇÃO TOTAL</p>
            <p className="text-yellow-400 font-black text-4xl animate-pulse">{score}</p>
          </div>
          <button
            onClick={startGame}
            className="mt-2 bg-purple-600 text-white hover:bg-white hover:text-black font-black text-xs py-3 px-6 border-4 border-black uppercase tracking-widest shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          >
            🔄 TENTAR NOVAMENTE
          </button>
        </div>
      )}
    </div>
  );
};
