/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Plus, Minus, Info } from 'lucide-react';
import { soundEngine } from '../soundEngine';
import { AccuracyType } from '../types';

export const PracticePanel: React.FC = () => {
  const [bpm, setBpm] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [lastTapDeviation, setLastTapDeviation] = useState<number | null>(null);
  const [lastTapAccuracy, setLastTapAccuracy] = useState<AccuracyType | null>(null);
  const [bpmHistory, setBpmHistory] = useState<{ time: number; deviation: number; accuracy: AccuracyType }[]>([]);
  
  const bpmRef = useRef(bpm);
  const isPlayingRef = useRef(isPlaying);
  const nextBeatTimeRef = useRef(0);
  const beatIntervalRef = useRef(0.6); // seconds
  const timerRef = useRef<any>(null);

  useEffect(() => {
    bpmRef.current = bpm;
    beatIntervalRef.current = 60 / bpm;
  }, [bpm]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (isPlaying) {
      // Start scheduler
      const ctx = soundEngine.getContext();
      if (ctx) {
        nextBeatTimeRef.current = ctx.currentTime + 0.1;
        scheduler();
      }
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying]);

  // Audio scheduling loop
  const scheduler = () => {
    const ctx = soundEngine.getContext();
    if (!ctx || !isPlayingRef.current) return;

    const scheduleAheadTime = 0.1; // 100ms
    const lookahead = 25.0; // 25ms

    while (nextBeatTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      schedulePlay(nextBeatTimeRef.current);
      nextBeatTimeRef.current += beatIntervalRef.current;
    }

    timerRef.current = setTimeout(scheduler, lookahead);
  };

  const schedulePlay = (time: number) => {
    // Schedule a metronome tick via sound engine
    setTimeout(() => {
      if (isPlayingRef.current) {
        soundEngine.playTick(false);
        // Visual indicator trigger can be managed here if needed
      }
    }, (time - soundEngine.getContext()!.currentTime) * 1000);
  };

  // Handle the student's physical drum tap
  const handleTap = () => {
    soundEngine.init();
    const ctx = soundEngine.getContext();
    if (!ctx) return;

    if (!isPlaying) {
      // Play a simple tap sound if metronome isn't running
      soundEngine.playGood();
      return;
    }

    const current = ctx.currentTime;
    const interval = beatIntervalRef.current;
    
    // Find the closest scheduled beat (either the past beat or the upcoming beat)
    const timeSinceLastBeat = (current - nextBeatTimeRef.current + interval) % interval;
    const timeToNextBeat = interval - timeSinceLastBeat;
    
    let deviation = 0;
    if (timeSinceLastBeat < timeToNextBeat) {
      deviation = timeSinceLastBeat; // positive = late
    } else {
      deviation = -timeToNextBeat; // negative = early
    }

    const absDev = Math.abs(deviation);
    let accuracy: AccuracyType = 'MISS';

    if (absDev <= 0.06) {
      accuracy = 'PERFECT';
      soundEngine.playPerfect();
    } else if (absDev <= 0.12) {
      accuracy = 'GOOD';
      soundEngine.playGood();
    } else if (absDev <= 0.22) {
      accuracy = deviation < 0 ? 'EARLY' : 'LATE';
      soundEngine.playEarlyLate();
    } else {
      accuracy = 'MISS';
      soundEngine.playMiss();
    }

    const devMs = Math.round(deviation * 1000);
    setLastTapDeviation(devMs);
    setLastTapAccuracy(accuracy);

    setBpmHistory(prev => [
      { time: Date.now(), deviation: devMs, accuracy },
      ...prev.slice(0, 7)
    ]);
  };

  const getAccuracyColor = (acc: AccuracyType) => {
    switch (acc) {
      case 'PERFECT': return 'text-emerald-500 border-emerald-500';
      case 'GOOD': return 'text-cyan-500 border-cyan-500';
      case 'EARLY': return 'text-amber-500 border-amber-500';
      case 'LATE': return 'text-orange-500 border-orange-500';
      default: return 'text-rose-500 border-rose-500';
    }
  };

  const getAccuracyLabel = (acc: AccuracyType) => {
    switch (acc) {
      case 'PERFECT': return 'PERFEITO!';
      case 'GOOD': return 'BOM';
      case 'EARLY': return 'ADIANTADO (RUSH)';
      case 'LATE': return 'ATRASADO (DRAG)';
      default: return 'FORA DE TEMPO';
    }
  };

  return (
    <div className="flex-1 flex flex-col p-5 bg-[#121212] overflow-y-auto justify-between">
      <div>
        {/* Title */}
        <div className="mb-4">
          <h2 className="font-mono text-sm font-black text-white uppercase tracking-wider mb-1">
            TREINO DE BATIDA
          </h2>
          <p className="font-mono text-[10px] text-gray-500">
            Pratique sua consistência rítmica sem morrer ou reiniciar. Ajuste o andamento e treine à vontade!
          </p>
        </div>

        {/* BPM Selector */}
        <div className="bg-[#FFFDF9] border-4 border-black rounded-xl p-4 shadow-[4px_4px_0px_#000] mb-4 text-black flex flex-col items-center">
          <span className="font-mono text-[10px] text-gray-500 uppercase font-black">Andamento</span>
          
          <div className="flex items-center gap-6 my-2">
            <button
              onClick={() => {
                soundEngine.playGood();
                setBpm(p => Math.max(40, p - 5));
              }}
              className="w-10 h-10 bg-black hover:bg-gray-800 text-[#FFFDF9] border-2 border-black rounded-lg flex items-center justify-center font-black shadow-[2px_2px_0px_#FF5F00] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              <Minus size={16} />
            </button>
            <div className="text-center">
              <span className="font-mono text-3xl font-black text-black leading-none">{bpm}</span>
              <span className="font-mono text-[10px] text-gray-500 uppercase block font-bold">BPM</span>
            </div>
            <button
              onClick={() => {
                soundEngine.playGood();
                setBpm(p => Math.min(220, p + 5));
              }}
              className="w-10 h-10 bg-black hover:bg-gray-800 text-[#FFFDF9] border-2 border-black rounded-lg flex items-center justify-center font-black shadow-[2px_2px_0px_#FF5F00] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            onClick={() => {
              soundEngine.init();
              setIsPlaying(!isPlaying);
            }}
            className={`h-10 px-6 border-2 border-black rounded-lg font-mono text-xs font-black uppercase flex items-center gap-2 shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
              isPlaying ? 'bg-rose-500 text-white' : 'bg-[#FF5F00] text-white'
            }`}
          >
            {isPlaying ? <Square size={12} className="fill-white" /> : <Play size={12} className="fill-white" />}
            <span>{isPlaying ? 'PAUSAR METRÔNOMO' : 'LIGAR METRÔNOMO'}</span>
          </button>
        </div>

        {/* Real-Time Precision Meter */}
        <div className="bg-[#1e1e1e] border-4 border-black rounded-xl p-4 mb-4 text-center">
          <span className="font-mono text-[9px] text-[#FF5F00] uppercase font-black block mb-2">PRECISÃO DA ÚLTIMA BATIDA</span>
          
          {lastTapDeviation !== null && lastTapAccuracy !== null ? (
            <div className="flex flex-col items-center">
              <div className={`font-mono text-lg font-black border-2 px-3 py-1 rounded mb-1 uppercase ${getAccuracyColor(lastTapAccuracy)}`}>
                {getAccuracyLabel(lastTapAccuracy)}
              </div>
              <div className="font-mono text-xs text-white">
                Desvio: <span className="font-bold text-[#FF5F00]">{lastTapDeviation > 0 ? `+${lastTapDeviation}` : lastTapDeviation} ms</span>
              </div>
              <div className="w-full max-w-[200px] h-2 bg-gray-800 border border-gray-700 rounded relative mt-3 overflow-hidden">
                {/* Center marker */}
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-green-500"></div>
                {/* Accuracy bounds */}
                <div className="absolute top-0 bottom-0 left-[35%] right-[35%] bg-green-500/10"></div>
                {/* Tapper marker */}
                <div 
                  className="absolute top-0 bottom-0 w-1.5 bg-[#FF5F00] rounded-full transition-all duration-150"
                  style={{ 
                    left: `${Math.min(95, Math.max(5, 50 + (lastTapDeviation / 220) * 50))}%`,
                    transform: 'translateX(-50%)'
                  }}
                ></div>
              </div>
              <div className="flex justify-between w-full max-w-[200px] text-[8px] font-mono text-gray-500 mt-1 uppercase">
                <span>Adiantado (-)</span>
                <span>Atrasado (+)</span>
              </div>
            </div>
          ) : (
            <div className="font-mono text-[10px] text-gray-500 py-4 uppercase">
              Ligue o metrônomo e toque abaixo no ritmo!
            </div>
          )}
        </div>
      </div>

      {/* Tapping Drum Zone */}
      <div className="flex flex-col gap-3">
        <button
          onMouseDown={handleTap}
          onTouchStart={(e) => {
            e.preventDefault();
            handleTap();
          }}
          className="w-full h-24 bg-[#FFFDF9] hover:bg-[#eae6de] active:scale-95 border-4 border-black rounded-xl flex flex-col items-center justify-center shadow-[4px_4px_0px_#000] transition-all cursor-pointer select-none outline-none"
        >
          <span className="font-mono text-sm font-black text-black uppercase tracking-widest">TOQUE RÍTMICO</span>
          <span className="font-mono text-[9px] text-gray-500 uppercase mt-1">Clique ou toque no ritmo do clique</span>
        </button>

        {/* Short History */}
        {bpmHistory.length > 0 && (
          <div className="bg-[#1e1e1e] border-2 border-black rounded-lg p-2 max-h-24 overflow-y-auto">
            <span className="font-mono text-[8px] text-gray-400 uppercase font-black block mb-1">Últimos Toques:</span>
            <div className="flex flex-wrap gap-1 font-mono text-[8px]">
              {bpmHistory.map((item, idx) => (
                <div 
                  key={idx} 
                  className={`px-1.5 py-0.5 rounded border border-gray-800 bg-black flex items-center gap-1 ${
                    item.accuracy === 'PERFECT' ? 'text-emerald-500' :
                    item.accuracy === 'GOOD' ? 'text-cyan-400' :
                    item.accuracy === 'EARLY' ? 'text-amber-500' :
                    item.accuracy === 'LATE' ? 'text-orange-400' : 'text-rose-500'
                  }`}
                >
                  <span className="font-black">{item.accuracy[0]}</span>
                  <span>{item.deviation > 0 ? `+${item.deviation}` : item.deviation}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
