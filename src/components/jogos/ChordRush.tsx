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
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
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
      setSelectedOption(null);
      
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
    setSelectedOption(option);

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
    <div className="bg-[#1d100a] border-8 border-black p-4 md:p-6 shadow-[8px_8px_0_#000] flex flex-col gap-5 relative text-[#f8ddd2] font-mono select-none w-full max-w-2xl mx-auto overflow-hidden">
      
      {/* Top Header Bar - Stitch 8-Bit Style */}
      <header className="flex justify-between items-center bg-[#2b1c16] border-4 border-black px-4 py-3 shadow-[4px_4px_0_#000]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (gameState !== 'gameover' && score > 0) {
                onGameOver(score);
              }
              onClose();
            }}
            className="bg-[#ff6b00] text-black border-2 border-black px-3 py-1 font-black text-xs uppercase shadow-[2px_2px_0_#000] hover:bg-white active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            ← SAIR
          </button>
          <h1 className="font-sans font-black text-lg md:text-xl uppercase tracking-tighter text-[#ffb693] drop-shadow-[2px_2px_0_#000]">
            CIFRA_MASTER
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-bold text-[#e2bfb0] uppercase block opacity-80">SCORE</span>
            <span className="font-black text-sm text-[#ff6b00] tracking-wider">{score} PONTOS</span>
          </div>
        </div>
      </header>

      {/* Start State */}
      {gameState === 'start' && (
        <div className="py-10 px-4 flex flex-col items-center justify-center text-center gap-6 bg-[#261812] border-4 border-black shadow-[6px_6px_0_#000] my-2">
          <div className="bg-white text-black px-4 py-1.5 font-bold text-xs uppercase -rotate-2 border-2 border-black shadow-[3px_3px_0_#000] inline-block">
            MODO DE TREINO RÍTMICO
          </div>
          <div>
            <h2 className="text-[#ff6b00] font-sans font-black text-3xl md:text-4xl uppercase tracking-tighter drop-shadow-[3px_3px_0_#000]">
              CHORD RUSH
            </h2>
            <p className="text-[#e2bfb0] font-bold text-xs uppercase max-w-xs mx-auto mt-2 leading-relaxed">
              Identifique a cifra correspondente para cada nome de acorde antes que o tempo acabe!
            </p>
          </div>
          <button
            onClick={startGame}
            className="mt-2 bg-[#ff6b00] text-black hover:bg-white font-sans font-black text-sm sm:text-base py-4 px-8 border-4 border-black uppercase tracking-widest shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
          >
            🕹️ INSERT COIN / INICIAR
          </button>
        </div>
      )}

      {/* Playing State */}
      {gameState === 'playing' && (
        <div className="flex flex-col items-center gap-5 w-full">
          
          {/* Level & Combo Header */}
          <div className="w-full max-w-md">
            <div className="flex justify-between items-end mb-2">
              <div className="bg-white text-black px-3 py-1 text-xs font-bold uppercase -rotate-2 border-2 border-black shadow-[3px_3px_0_#000] inline-block">
                CIFRA MASTER: NIVEL 01
              </div>
              <div className="font-sans font-black text-lg text-[#ff6b00] italic drop-shadow-[1px_1px_0_#000]">
                COMBO x{combo}
              </div>
            </div>
            
            {/* Time / Progress Bar */}
            <div className="w-full h-7 bg-[#362720] border-4 border-black relative overflow-hidden shadow-[4px_4px_0_#000]">
              <div 
                className={`h-full transition-all duration-100 shadow-[inset_-4px_0px_0px_0px_rgba(0,0,0,0.3)] ${
                  timeLeft > 35 ? 'bg-[#ff6b00]' : 'bg-red-600'
                }`}
                style={{ width: `${timeLeft}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-[10px] tracking-widest drop-shadow-[1px_1px_0_#000]">
                TEMPO: {Math.max(0, timeLeft)}%
              </div>
            </div>
          </div>

          {/* Gameplay Sticker Card */}
          <div className="relative my-2">
            <div className={`bg-white w-64 h-64 sm:w-80 sm:h-80 flex flex-col items-center justify-center border-4 border-black shadow-[6px_6px_0_0_#ffb693] relative z-10 -rotate-2 transition-transform duration-200 hover:rotate-0 ${
              isCorrectFeedback === true ? 'scale-105 border-[#00ff66]' : ''
            }`}>
              <span className="text-3xl sm:text-4xl md:text-5xl font-sans font-black text-black select-none text-center px-4 uppercase tracking-tight">
                {currentChord.name}
              </span>
              <div className="absolute -bottom-4 -left-4 bg-[#ffb693] text-[#351000] border-3 border-black px-4 py-2 text-xs font-bold uppercase rotate-3 shadow-[3px_3px_0_#000]">
                IDENTIFIQUE A CIFRA
              </div>
            </div>
            {/* Background sticker decoration */}
            <div className="absolute -top-4 -right-4 w-28 h-28 bg-[#5b443b] opacity-40 border-3 border-black -rotate-12 -z-0"></div>
          </div>

          {/* Input Buttons 2x2 Grid */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            {options.map((opt, idx) => {
              const isSelected = selectedOption === opt;
              const isRight = opt === currentChord.notes;
              
              let btnStyle = "bg-[#362720] text-[#f8ddd2] hover:bg-[#41312a] border-4 border-black shadow-[5px_5px_0_0_#000]";
              if (isSelected) {
                if (isCorrectFeedback === true) {
                  btnStyle = "bg-[#ff6b00] text-black border-4 border-black shadow-[5px_5px_0_0_#fff] scale-105";
                } else if (isCorrectFeedback === false) {
                  btnStyle = "bg-red-600 text-white border-4 border-black shadow-[5px_5px_0_0_#000]";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleOptionClick(opt)}
                  className={`py-5 text-2xl sm:text-3xl font-sans font-black uppercase hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:scale-95 transition-all relative group cursor-pointer flex items-center justify-center ${btnStyle}`}
                >
                  <span className="relative z-10">{opt}</span>
                  <div className="absolute top-1 left-2 text-[9px] font-mono text-[#ffb693] opacity-60">
                    OPÇÃO {idx + 1}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tip / Instruction Banner */}
          <div className="mt-2 max-w-md text-center opacity-80 px-2">
            <p className="text-xs text-[#e2bfb0] italic">
              "O sistema de cifras usa letras para representar notas e acordes. Mantenha o ritmo para acelerar seu combo!"
            </p>
          </div>

        </div>
      )}

      {/* Game Over State */}
      {gameState === 'gameover' && (
        <div className="py-8 px-4 flex flex-col items-center justify-center text-center gap-5 bg-[#261812] border-4 border-black shadow-[6px_6px_0_#000] my-2">
          <h2 className="text-red-500 font-sans font-black text-3xl sm:text-4xl uppercase tracking-widest animate-bounce drop-shadow-[2px_2px_0_#000]">
            FIM DE JOGO 💀
          </h2>
          <div className="bg-[#170b06] border-4 border-[#ffb693] p-5 w-full max-w-xs shadow-[4px_4px_0_#000]">
            <p className="text-[#e2bfb0] font-bold text-xs uppercase">
              PONTUAÇÃO FINAL
            </p>
            <p className="text-[#ff6b00] font-sans font-black text-4xl mt-1 tracking-tight">
              {score} XP
            </p>
            <p className="text-gray-400 font-bold text-[10px] uppercase mt-2">
              MAIOR COMBO: <span className="text-white">x{combo}</span>
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button
              onClick={startGame}
              className="flex-1 bg-[#ff6b00] text-black hover:bg-white font-sans font-black text-xs py-3.5 px-4 border-4 border-black uppercase tracking-widest shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
            >
              🔄 TENTAR NOVAMENTE
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-white text-black hover:bg-[#ff6b00] hover:text-white font-sans font-black text-xs py-3.5 px-4 border-4 border-black uppercase tracking-widest shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
            >
              🏠 VOLTAR
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

