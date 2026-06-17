import React, { useState, useEffect } from 'react';

interface Mission {
  id: string;
  title: string;
  target: number;
  progress: number;
  reward: number;
  completed: boolean;
  gameId: string;
}

const DAILY_MISSIONS_TEMPLATES = [
  { id: 'm1', title: 'Jogue Acorde Genius', target: 3, reward: 500, gameId: 'Acorde Genius' },
  { id: 'm2', title: 'Jogue Chord Rush', target: 3, reward: 500, gameId: 'Chord Rush' },
  { id: 'm3', title: 'Jogue Tríade Ninja', target: 2, reward: 800, gameId: 'Tríade Ninja' },
  { id: 'm4', title: 'Jogue Acorde Genius', target: 5, reward: 1000, gameId: 'Acorde Genius' },
];

export const DailyMissions = ({ onClaimReward }: { onClaimReward: (reward: number) => void }) => {
  const [missions, setMissions] = useState<Mission[]>([]);

  useEffect(() => {
    const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const storedStr = localStorage.getItem('acorde_daily_missions');
    
    if (storedStr) {
      const data = JSON.parse(storedStr);
      if (data.date === today) {
        setMissions(data.missions);
        return;
      }
    }

    // Generate new missions
    const shuffled = [...DAILY_MISSIONS_TEMPLATES].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 2).map(m => ({ ...m, progress: 0, completed: false }));
    
    setMissions(selected);
    localStorage.setItem('acorde_daily_missions', JSON.stringify({ date: today, missions: selected }));
  }, []);

  const saveMissions = (newMissions: Mission[]) => {
    const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    setMissions(newMissions);
    localStorage.setItem('acorde_daily_missions', JSON.stringify({ date: today, missions: newMissions }));
  };

  // We expose a global window event to update progress
  useEffect(() => {
    const handleGamePlayed = (e: any) => {
      const gamePlayed = e.detail;
      setMissions(prev => {
        let updated = false;
        const newM = prev.map(m => {
          if (m.gameId === gamePlayed && !m.completed && m.progress < m.target) {
            updated = true;
            return { ...m, progress: m.progress + 1 };
          }
          return m;
        });
        if (updated) {
          const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
          localStorage.setItem('acorde_daily_missions', JSON.stringify({ date: today, missions: newM }));
          return newM;
        }
        return prev;
      });
    };

    window.addEventListener('acorde_game_played' as any, handleGamePlayed);
    return () => window.removeEventListener('acorde_game_played' as any, handleGamePlayed);
  }, []);

  const claim = (missionId: string) => {
    const m = missions.find(x => x.id === missionId);
    if (!m || m.completed || m.progress < m.target) return;

    onClaimReward(m.reward);
    const newMissions = missions.map(x => x.id === missionId ? { ...x, completed: true } : x);
    saveMissions(newMissions);
  };

  if (missions.length === 0) return null;

  return (
    <div className="bg-[#1a110d] border-4 border-[#3d2d26] p-4 mt-4 shadow-[4px_4px_0_#000]">
      <h3 className="text-[#00ffcc] font-black text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
        🎯 MISSÕES DIÁRIAS
      </h3>
      <div className="space-y-3">
        {missions.map(m => (
          <div key={m.id} className="bg-black border-2 border-[#3d2d26] p-3 flex justify-between items-center">
            <div>
              <p className="text-white font-bold text-[10px] uppercase">{m.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="bg-[#3d2d26] h-1.5 w-24 relative">
                  <div className="bg-[#ffeb3b] h-full transition-all" style={{ width: `${(m.progress / m.target) * 100}%` }}></div>
                </div>
                <span className="text-[#8e7164] text-[8px] font-mono">{m.progress}/{m.target}</span>
              </div>
            </div>
            {m.completed ? (
              <span className="text-[#00ffcc] font-black text-[9px] uppercase px-2 py-1 border border-[#00ffcc]">CONCLUÍDO</span>
            ) : m.progress >= m.target ? (
              <button 
                onClick={() => claim(m.id)}
                className="bg-[#00ffcc] text-black hover:bg-white hover:text-black font-black text-[9px] uppercase px-3 py-1.5 border-2 border-black active:translate-y-px transition-all shadow-[2px_2px_0_#000]"
              >
                RESGATAR +{m.reward}
              </button>
            ) : (
              <span className="text-[#8e7164] font-black text-[9px] uppercase px-2">+ {m.reward} COINS</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
