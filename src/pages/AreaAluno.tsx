import React, { useState, useEffect } from 'react';
import { Bell, Home, Trophy, BookOpen, Target, ChevronRight, Play, HelpCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AreaAluno() {
  const { user } = useAuth();
  const [aulasHoje, setAulasHoje] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // XP simulado — virá do backend futuramente
  const xp = 14400;
  const xpMax = 20000;
  const nivel = 42;
  const classe = 'MASTER_IN_TRAINING';
  const xpPct = Math.min(100, (xp / xpMax) * 100);

  const hoje = format(new Date(), "d 'de' MMM", { locale: ptBR }).toUpperCase();

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/agenda', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        setAulasHoje((Array.isArray(data) ? data : []).filter((a: any) => a.data === todayStr).slice(0, 3));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const missoes = [
    { id: 1, titulo: 'PRATICAR ESCALAS', descricao: '30 minutos de piano clássico', xp: 250, progresso: 60, tipo: 'play' },
    { id: 2, titulo: '8-BIT THEORY QUIZ', descricao: 'Acertar 10 questões de teoria', xp: 150, status: 'READY', tipo: 'quiz' },
  ];

  const menus = [
    { icon: Trophy, label: 'HALL DA FAMA', path: '/ranking' },
    { icon: BookOpen, label: 'MINHAS AULAS', path: '/agenda' },
    { icon: Target, label: 'MISSÕES', path: '#' },
    { icon: HelpCircle, label: 'LOJA DE GEAR', path: '#' },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#1a0a05', fontFamily: "'Space Mono', monospace" }}>

      {/* TOP BAR — Mobile style */}
      <header className="flex items-center justify-between px-5 py-4 shrink-0" style={{ background: '#261812', borderBottom: '3px solid #000' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded border-2 border-[#ff6b00]" style={{ background: '#ff6b00' }}>
            <div className="w-full h-full flex items-center justify-center text-white font-black">
              {(user?.nome || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
          <h1 className="text-white font-black text-lg uppercase tracking-widest">MUSIC_HUB</h1>
        </div>
        <button className="text-[#8e7164] hover:text-[#ff6b00]">
          <Bell className="w-6 h-6" />
        </button>
      </header>

      {/* SCROLL CONTENT */}
      <div className="flex-1 overflow-auto pb-24">
        <div className="px-4 py-5 space-y-4">

          {/* Status Card */}
          <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: '#fff8f6', border: '3px solid #261812', boxShadow: '4px 4px 0 #000' }}>
            {/* NOVO badge */}
            <div className="absolute top-0 right-0 px-3 py-1 font-black text-white text-[10px] uppercase" style={{ background: '#ff6b00', borderBottomLeftRadius: '8px', borderTopRightRadius: '8px' }}>
              NOVO!
            </div>
            <p className="text-[#8e7164] text-[10px] font-black uppercase tracking-widest mb-2">STATUS DE TREINAMENTO</p>
            <h2 className="text-[#261812] font-black text-2xl uppercase leading-tight mb-4">
              LVL {nivel} -<br />{classe}
            </h2>
            {/* XP bar */}
            <div className="rounded overflow-hidden mb-3" style={{ height: '28px', background: '#261812', border: '2px solid #261812' }}>
              <div className="h-full flex items-center" style={{ width: `${xpPct}%`, background: '#ff6b00' }}>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-[#261812] font-black text-xs">{xp.toLocaleString()} XP</span>
              <span className="text-[#8e7164] font-black text-xs">{xpMax.toLocaleString()} XP</span>
            </div>
          </div>

          {/* Próxima Sessão */}
          {aulasHoje[0] ? (
            <div className="rounded-xl p-5 flex items-center gap-4" style={{ background: '#ff6b00', border: '3px solid #261812', boxShadow: '4px 4px 0 #000' }}>
              <div className="w-14 h-14 rounded flex items-center justify-center shrink-0" style={{ background: '#261812', border: '2px solid rgba(255,255,255,0.2)' }}>
                <span className="text-[#ff6b00] font-black text-2xl">♪</span>
              </div>
              <div className="flex-1">
                <p className="text-white/80 font-black text-[10px] uppercase tracking-widest mb-1">PRÓXIMA SESSÃO</p>
                <p className="text-white font-black text-xl uppercase">Hoje às {aulasHoje[0].horario}</p>
                <p className="text-white/80 font-black text-xs uppercase">ESTÚDIO_A • {aulasHoje[0].curso_nome || 'AULA'}</p>
              </div>
              <button className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'white', border: '2px solid #261812' }}>
                <ChevronRight className="w-6 h-6 text-[#261812]" />
              </button>
            </div>
          ) : !loading ? (
            <div className="rounded-xl p-5 text-center" style={{ background: '#261812', border: '3px solid #5a4136' }}>
              <p className="text-[#8e7164] font-black text-sm uppercase">Nenhuma aula hoje</p>
            </div>
          ) : null}

          {/* Menu Grid */}
          <div className="grid grid-cols-2 gap-3">
            {menus.map((item, i) => (
              <a key={i} href={item.path} className="block rounded-xl p-5 text-center hover:opacity-90 transition-all" style={{ background: '#fff8f6', border: '3px solid #261812', boxShadow: '3px 3px 0 #261812' }}>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#ffeae1', border: '2px solid #e2bfb0' }}>
                  <item.icon className="w-7 h-7 text-[#a04100]" />
                </div>
                <p className="text-[#261812] font-black text-[10px] uppercase tracking-widest">{item.label}</p>
              </a>
            ))}
          </div>

          {/* Missões Ativas */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-white font-black text-lg uppercase tracking-widest">MISSÕES ATIVAS</h3>
              <div className="flex-1 border-t-2 border-dashed border-[#ff6b00]"></div>
            </div>
            <div className="space-y-3">
              {missoes.map(missao => (
                <div key={missao.id} className="rounded-xl p-4 flex items-center gap-4" style={{ background: '#261812', border: '2px solid #3d2d26' }}>
                  <div className="w-12 h-12 rounded flex items-center justify-center shrink-0" style={{ background: missao.tipo === 'play' ? '#ff6b00' : '#3d2d26', border: '2px solid #5a4136' }}>
                    {missao.tipo === 'play' ? <Play className="w-5 h-5 text-white" /> : <HelpCircle className="w-5 h-5 text-[#8e7164]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-sm uppercase">{missao.titulo}</p>
                    <p className="text-[#8e7164] text-xs font-bold">{missao.descricao}</p>
                    {missao.progresso ? (
                      <div className="mt-2 h-1.5 rounded overflow-hidden" style={{ background: '#3d2d26' }}>
                        <div className="h-full rounded" style={{ width: `${missao.progresso}%`, background: '#ff6b00' }}></div>
                      </div>
                    ) : null}
                  </div>
                  <div className="shrink-0">
                    {missao.status ? (
                      <span className="font-black text-white text-[10px] px-3 py-2 rounded uppercase" style={{ background: '#ff6b00' }}>{missao.status}</span>
                    ) : (
                      <span className="font-black text-[#ff6b00] text-[10px] uppercase">+{missao.xp} XP</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM NAV — Mobile */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-around py-3 shrink-0 border-t-3 border-[#3d2d26] z-20" style={{ background: '#261812', borderTop: '3px solid #3d2d26' }}>
        {[
          { icon: Home, label: 'HOME', active: true },
          { icon: Trophy, label: 'RANKING' },
          { icon: BookOpen, label: 'LESSONS' },
          { icon: Target, label: 'QUESTS' },
        ].map((item, i) => (
          <button key={i} className="flex flex-col items-center gap-1 px-4">
            <div className={`w-10 h-10 rounded flex items-center justify-center ${item.active ? '' : ''}`} style={{ background: item.active ? '#ff6b00' : 'transparent' }}>
              <item.icon className={`w-5 h-5 ${item.active ? 'text-white' : 'text-[#8e7164]'}`} />
            </div>
            <span className={`text-[8px] font-black uppercase tracking-widest ${item.active ? 'text-[#ff6b00]' : 'text-[#5a4136]'}`}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
