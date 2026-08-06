import React, { useState, useEffect } from 'react';
import { Zap, Flame, Clock } from 'lucide-react';

interface HoraDuplaBannerProps {
  className?: string;
}

export const HoraDuplaBanner: React.FC<HoraDuplaBannerProps> = ({ className = '' }) => {
  const [data, setData] = useState<{
    isActive: boolean;
    isBefore: boolean;
    secondsUntilStart: number;
    secondsRemaining: number;
    formattedWindow: string;
  } | null>(null);

  const [timerSeconds, setTimerSeconds] = useState<number>(0);

  const fetchHoraDupla = async () => {
    try {
      const res = await fetch('/api/gamificacao/hora-dupla');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.isActive) {
          setTimerSeconds(json.secondsRemaining || 0);
        } else {
          setTimerSeconds(json.secondsUntilStart || 0);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar Hora Dupla:', e);
    }
  };

  useEffect(() => {
    fetchHoraDupla();
    const interval = setInterval(fetchHoraDupla, 30000); // recalibra com backend a cada 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timerSeconds <= 0) return;
    const timer = setInterval(() => {
      setTimerSeconds(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timerSeconds]);

  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!data) return null;

  return (
    <div className={`w-full overflow-hidden rounded-lg font-mono border-4 border-black shadow-[6px_6px_0_#000] transition-all ${className}`}>
      {data.isActive ? (
        /* HORA DUPLA ATIVA! */
        <div className="bg-gradient-to-r from-[#ff0055] via-[#ff6b00] to-[#ffeb3b] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-black animate-pulse">
          <div className="flex items-center gap-3">
            <div className="bg-black text-white p-2.5 rounded-full border-2 border-white shadow-[2px_2px_0_#000]">
              <Flame className="w-7 h-7 text-[#ffeb3b] animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-black text-white text-[10px] font-black uppercase px-2 py-0.5 tracking-widest border border-white">
                  🔥 EVENTO ESPECIAL
                </span>
                <span className="bg-white text-black font-black text-[10px] uppercase px-2 py-0.5 tracking-widest border border-black">
                  2X PONTOS EM TODOS OS JOGOS
                </span>
              </div>
              <h3 className="font-black text-xl sm:text-2xl uppercase tracking-tight italic mt-1 text-black drop-shadow-[1px_1px_0_#fff]">
                HORA DUPLA ATIVA!
              </h3>
            </div>
          </div>

          <div className="bg-black text-[#00ffcc] border-4 border-white px-4 py-2 flex items-center gap-3 shadow-[4px_4px_0_#000] shrink-0">
            <Clock className="w-5 h-5 text-[#ffeb3b] animate-spin" />
            <div className="text-right">
              <div className="text-[9px] font-black uppercase text-white tracking-widest">TERMINA EM</div>
              <div className="text-2xl font-black font-mono leading-none tracking-wider text-[#00ffcc]">
                {formatTime(timerSeconds)}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* A HORA DUPLA COMEÇA EM */
        <div className="bg-[#261812] border-2 border-[#ff6b00] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="bg-[#ff6b00] text-black p-2.5 rounded-md border-2 border-black shadow-[2px_2px_0_#000]">
              <Zap className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="text-[10px] font-black text-[#ff6b00] uppercase tracking-widest">
                ⚡ PRÓXIMO EVENTO ({data.formattedWindow})
              </div>
              <h3 className="font-black text-sm sm:text-base uppercase tracking-tight italic text-white">
                A HORA DUPLA COMEÇA EM:
              </h3>
            </div>
          </div>

          <div className="bg-black text-[#ffeb3b] border-2 border-[#ff6b00] px-4 py-2 flex items-center gap-3 shadow-[3px_3px_0_#000] shrink-0">
            <Clock className="w-5 h-5 text-[#ff6b00]" />
            <div>
              <div className="text-[8px] font-black uppercase text-[#8e7164] tracking-widest">CONTAGEM REGRESSIVA</div>
              <div className="text-xl sm:text-2xl font-black font-mono leading-none tracking-wider text-[#ffeb3b]">
                {formatTime(timerSeconds)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
