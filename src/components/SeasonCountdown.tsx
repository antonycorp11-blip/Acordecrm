import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, Sparkles, Trophy } from 'lucide-react';

interface SeasonCountdownProps {
  targetDate?: string; // ISO String, ex: "2026-08-21T23:59:59"
  seasonName?: string;
  className?: string;
}

export const SeasonCountdown: React.FC<SeasonCountdownProps> = ({
  targetDate = "2026-09-22T23:59:59",
  seasonName = "TEMPORADA 3",
  className = ""
}) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isEnded, setIsEnded] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const target = new Date(targetDate).getTime();
      const now = new Date().getTime();
      const difference = target - now;

      if (difference <= 0) {
        setIsEnded(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      } else {
        setIsEnded(false);
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className={`bg-gradient-to-r from-amber-500/10 via-orange-500/15 to-red-500/10 border border-orange-500/30 rounded-xl p-4 shadow-lg backdrop-blur-md ${className}`}>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
            <Trophy className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-widest bg-orange-500 text-black px-2 py-0.5 rounded">
                {seasonName}
              </span>
              <span className="text-xs text-orange-300 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Fim da Temporada
              </span>
            </div>
            <p className="text-sm font-semibold text-gray-200 mt-0.5">
              O ranking & moedas resetam ao término da contagem!
            </p>
          </div>
        </div>

        {isEnded ? (
          <div className="flex items-center gap-2 text-red-400 font-bold bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/30">
            <ShieldAlert className="w-5 h-5" />
            <span>Temporada Encerrada! Processando pódio...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-center">
            <div className="flex flex-col bg-black/40 border border-orange-500/20 rounded-lg px-3 py-1.5 min-w-[54px]">
              <span className="text-xl font-black text-orange-400 font-mono leading-none">{String(timeLeft.days).padStart(2, '0')}</span>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Dias</span>
            </div>
            <span className="text-orange-500 font-bold text-lg">:</span>
            <div className="flex flex-col bg-black/40 border border-orange-500/20 rounded-lg px-3 py-1.5 min-w-[54px]">
              <span className="text-xl font-black text-orange-400 font-mono leading-none">{String(timeLeft.hours).padStart(2, '0')}</span>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Horas</span>
            </div>
            <span className="text-orange-500 font-bold text-lg">:</span>
            <div className="flex flex-col bg-black/40 border border-orange-500/20 rounded-lg px-3 py-1.5 min-w-[54px]">
              <span className="text-xl font-black text-orange-400 font-mono leading-none">{String(timeLeft.minutes).padStart(2, '0')}</span>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Min</span>
            </div>
            <span className="text-orange-500 font-bold text-lg">:</span>
            <div className="flex flex-col bg-black/40 border border-orange-500/20 rounded-lg px-3 py-1.5 min-w-[54px]">
              <span className="text-xl font-black font-mono leading-none text-orange-300">{String(timeLeft.seconds).padStart(2, '0')}</span>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Seg</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
