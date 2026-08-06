import React, { useState, useEffect } from 'react';
import { Zap, Flame, Clock } from 'lucide-react';

interface HoraDuplaBannerProps {
  className?: string;
}

export function getHoraDuplaClientInfo() {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const cuiabaMs = utcMs - (4 * 3600000);
  const cuiabaDate = new Date(cuiabaMs);

  const year = cuiabaDate.getFullYear();
  const month = String(cuiabaDate.getMonth() + 1).padStart(2, '0');
  const day = String(cuiabaDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  let startHour = 18; // Hoje (06/08/2026): 18h às 21h no horário de Cuiabá
  let endHour = 21;

  if (dateStr !== '2026-08-06') {
    const daySeed = Number(day) + Number(month) * 31 + year;
    startHour = 15 + (daySeed % 6);
    endHour = startHour + 1;
  }

  const startTime = new Date(Date.UTC(cuiabaDate.getFullYear(), cuiabaDate.getMonth(), cuiabaDate.getDate(), startHour + 4, 0, 0));
  const endTime = new Date(Date.UTC(cuiabaDate.getFullYear(), cuiabaDate.getMonth(), cuiabaDate.getDate(), endHour + 4, 0, 0));

  const currentMs = now.getTime();
  const startMs = startTime.getTime();
  const endMs = endTime.getTime();

  const isBefore = currentMs < startMs;
  const isActive = currentMs >= startMs && currentMs < endMs;
  const isEnded = currentMs >= endMs;

  let secondsUntilStart = 0;
  let secondsRemaining = 0;

  if (isBefore) {
    secondsUntilStart = Math.floor((startMs - currentMs) / 1000);
  } else if (isActive) {
    secondsRemaining = Math.floor((endMs - currentMs) / 1000);
  } else if (isEnded) {
    const nextDayDate = new Date(cuiabaMs + 86400000);
    const nextYear = nextDayDate.getFullYear();
    const nextMonth = String(nextDayDate.getMonth() + 1).padStart(2, '0');
    const nextDay = String(nextDayDate.getDate()).padStart(2, '0');
    const nextDaySeed = Number(nextDay) + Number(nextMonth) * 31 + nextYear;
    const nextStartHour = (nextYear === 2026 && nextMonth === '08' && nextDay === '06') ? 18 : 15 + (nextDaySeed % 6);
    const nextStartTime = new Date(Date.UTC(nextDayDate.getFullYear(), nextDayDate.getMonth(), nextDayDate.getDate(), nextStartHour + 4, 0, 0));
    secondsUntilStart = Math.floor((nextStartTime.getTime() - currentMs) / 1000);
  }

  return {
    isBefore,
    isActive,
    isEnded,
    secondsUntilStart: Math.max(0, secondsUntilStart),
    secondsRemaining: Math.max(0, secondsRemaining),
    formattedWindow: `${String(startHour).padStart(2, '0')}:00 às ${String(endHour).padStart(2, '0')}:00`
  };
}

export const HoraDuplaBanner: React.FC<HoraDuplaBannerProps> = ({ className = '' }) => {
  const [data, setData] = useState(() => getHoraDuplaClientInfo());
  const [timerSeconds, setTimerSeconds] = useState<number>(() => {
    const info = getHoraDuplaClientInfo();
    return info.isActive ? info.secondsRemaining : info.secondsUntilStart;
  });

  const fetchHoraDupla = async () => {
    try {
      const res = await fetch('/api/gamificacao/hora-dupla');
      if (res.ok) {
        const json = await res.json();
        if (json && json.formattedWindow) {
          setData(json);
          if (json.isActive) {
            setTimerSeconds(json.secondsRemaining || 0);
          } else {
            setTimerSeconds(json.secondsUntilStart || 0);
          }
          return;
        }
      }
    } catch (e) {
      // usa calculo client-side
    }
    const local = getHoraDuplaClientInfo();
    setData(local);
    setTimerSeconds(local.isActive ? local.secondsRemaining : local.secondsUntilStart);
  };

  useEffect(() => {
    fetchHoraDupla();
    const interval = setInterval(fetchHoraDupla, 30000);
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
};
