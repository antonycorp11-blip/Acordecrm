import React, { useState, useEffect } from 'react';
import { Bell, Home, Trophy, BookOpen, Target, ChevronRight, Play, HelpCircle, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AreaAluno() {
  const { user, logout } = useAuth();
  const [alunoData, setAlunoData] = useState<any>(null);
  const [aulasHoje, setAulasHoje] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dados dinâmicos do aluno
  const xp = alunoData?.xp || 0;
  const xpMax = 1000; // Exemplo de escala de nível
  const nivel = Math.floor(xp / 100) + 1;
  const classe = alunoData?.instrumento ? `${alunoData.instrumento.toUpperCase()}_TRAINEE` : 'MASTER_IN_TRAINING';
  const xpPct = Math.min(100, ((xp % 100) / 100) * 100);

  useEffect(() => {
    const token = localStorage.getItem('acorde_token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/alunos/me', { headers }).then(r => r.ok ? r.json() : null),
      fetch('/api/agenda', { headers }).then(r => r.ok ? r.json() : [])
    ]).then(([me, agenda]) => {
      setAlunoData(me);
      
      const now = new Date();
      const allAulas = Array.isArray(agenda) ? agenda : [];
      
      // Ordenar por data e hora para achar a próxima
      const futureAulas = allAulas
        .filter((a: any) => {
          const aulaDate = new Date(`${a.data}T${a.horario || '00:00:00'}`);
          return aulaDate >= now;
        })
        .sort((a: any, b: any) => new Date(`${a.data}T${a.horario}`).getTime() - new Date(`${b.data}T${b.horario}`).getTime());

      setAulasHoje(futureAulas);
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
    { icon: HelpCircle, label: 'GEAR SHOP', path: '#' },
  ];

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#1a0a05] text-[#ff6b00] font-black uppercase tracking-widest animate-pulse">
      CONECTANDO AO MUSIC_HUB...
    </div>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#1a0a05', fontFamily: "'Space Mono', monospace" }}>

      {/* TOP BAR — Mobile style */}
      <header className="flex items-center justify-between px-5 py-4 shrink-0" style={{ background: '#261812', borderBottom: '3px solid #000' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded border-2 border-[#ff6b00]" style={{ background: '#ff6b00' }}>
            <div className="w-full h-full flex items-center justify-center text-white font-black">
              {(alunoData?.nome || user?.nome || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
          <h1 className="text-white font-black text-lg uppercase tracking-widest">MUSIC_HUB</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-[#8e7164] hover:text-[#ff6b00]">
            <Bell className="w-6 h-6" />
          </button>
          <button onClick={logout} className="text-[#8e7164] hover:text-red-500">
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* SCROLL CONTENT */}
      <div className="flex-1 overflow-auto pb-24">
        <div className="px-4 py-5 space-y-4">

          {/* Welcome Card */}
          <div className="rounded-xl p-5 relative overflow-hidden" style={{ background: '#fff8f6', border: '3px solid #261812', boxShadow: '4px 4px 0 #000' }}>
            <p className="text-[#8e7164] text-[10px] font-black uppercase tracking-widest mb-1">BEM-VINDO DE VOLTA</p>
            <h2 className="text-[#261812] font-black text-xl uppercase leading-tight mb-4">
              {alunoData?.nome?.split(' ')[0] || 'PLAYER_ONE'}
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-[#ffeae1] border-2 border-[#261812] p-3 rounded shadow-[2px_2px_0_#000]">
                 <p className="text-[8px] font-black text-[#8e7164] uppercase mb-1">INSTRUMENTO</p>
                 <p className="text-[#ff6b00] font-black text-[12px] uppercase">{alunoData?.matriculas?.[0]?.cursos?.nome || 'ALUNO'}</p>
               </div>
               <div className="bg-[#ffeae1] border-2 border-[#261812] p-3 rounded shadow-[2px_2px_0_#000]">
                 <p className="text-[8px] font-black text-[#8e7164] uppercase mb-1">RANKING GERAL</p>
                 <p className="text-[#261812] font-black text-xl">#42</p>
               </div>
            </div>
          </div>

          {/* XP Bar Section */}
          <div className="rounded-xl p-4 bg-[#261812] border-2 border-[#3d2d26] shadow-[4px_4px_0_#000]">
            <div className="flex justify-between items-center mb-2">
              <p className="text-white font-black text-[10px] uppercase tracking-widest">LVL {nivel} • {classe}</p>
              <span className="text-[#ff6b00] font-black text-[10px]">{xp} XP</span>
            </div>
            <div className="h-4 bg-[#1a0a05] rounded border border-black overflow-hidden">
               <div className="h-full bg-[#ff6b00] transition-all duration-1000" style={{ width: `${xpPct}%` }}></div>
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
                <p className="text-white font-black text-xl uppercase">
                  {new Date(aulasHoje[0].data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às {aulasHoje[0].horario?.substring(0,5)}
                </p>
                <p className="text-white/80 font-black text-xs uppercase">PROF. {aulasHoje[0].professor_nome?.split(' ')[0]}</p>
              </div>
              <button className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'white', border: '2px solid #261812' }}>
                <ChevronRight className="w-6 h-6 text-[#261812]" />
              </button>
            </div>
          ) : (
            <div className="rounded-xl p-5 text-center" style={{ background: '#261812', border: '3px solid #3d2d26', boxShadow: '4px 4px 0 #000' }}>
              <p className="text-[#8e7164] font-black text-sm uppercase">VOCÊ NÃO TEM AULAS HOJE</p>
              <button className="mt-3 text-[#ff6b00] font-black text-[10px] uppercase underline decoration-2 underline-offset-4">AGENDAR REPOSIÇÃO</button>
            </div>
          )}

          {/* Menu Grid */}
          <div className="grid grid-cols-2 gap-3">
            {menus.map((item, i) => (
              <div key={i} className="block rounded-xl p-5 text-center transition-all bg-[#fff8f6] border-2 border-black shadow-[3px_3px_0_#000] active:translate-y-1 active:shadow-none">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#ffeae1', border: '2px solid #e2bfb0' }}>
                  <item.icon className="w-7 h-7 text-[#a04100]" />
                </div>
                <p className="text-[#261812] font-black text-[10px] uppercase tracking-widest">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Missões Ativas */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-white font-black text-lg uppercase tracking-widest">MISSÕES DO DIA</h3>
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
                    <p className="text-[#8e7164] text-[10px] font-bold uppercase">{missao.descricao}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block font-black text-[#ff6b00] text-[10px] uppercase">+{missao.xp} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM NAV — Mobile */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-around py-4 shrink-0 z-20" style={{ background: '#261812', borderTop: '4px solid #000' }}>
        {[
          { icon: Home, label: 'HOME', active: true },
          { icon: Trophy, label: 'RANKING' },
          { icon: BookOpen, label: 'AULAS' },
          { icon: Target, label: 'QUESTS' },
        ].map((item, i) => (
          <button key={i} className="flex flex-col items-center gap-1">
            <item.icon className={`w-6 h-6 ${item.active ? 'text-[#ff6b00]' : 'text-[#8e7164]'}`} />
            <span className={`text-[7px] font-black uppercase tracking-widest ${item.active ? 'text-[#ff6b00]' : 'text-[#5a4136]'}`}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
