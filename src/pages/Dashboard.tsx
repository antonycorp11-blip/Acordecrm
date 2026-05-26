import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, HelpCircle, Search, AlertTriangle, Megaphone, Sparkles, Clock, Plus, TrendingUp, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (window.innerWidth < 768) {
      navigate('/agenda', { replace: true });
      return;
    }

    fetch('/api/dashboard/stats', {
      headers: { Authorization: `Bearer ${localStorage.getItem('acorde_token')}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => setStats(data))
      .catch(() => setStats({ totalAlunos: 0, aulasHoje: 0, receitaMensal: 0, proximasAulas: [] }));
  }, []);

  const faturamento = stats?.receitaMensal ?? 0;
  const proximasAulas = stats?.proximasAulas ?? [];
  const alunosApp = stats?.alunosAppStatus ?? [];
  const matriculasPorCurso = stats?.matriculasPorCurso ?? [];
  const maxQtd = matriculasPorCurso.length > 0 ? Math.max(...matriculasPorCurso.map((m: any) => m.qtd)) : 10;

  const dotColors = ['bg-green-500', 'bg-orange-500', 'bg-red-500'];

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden" style={{ background: '#000', fontFamily: "'Space Mono', monospace" }}>

      {/* TOP BAR */}
      <header className="flex items-center gap-4 px-6 py-4 border-b-4 border-[#3d2d26] shrink-0" style={{ background: '#1a0f0a' }}>
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-white font-black text-lg tracking-widest uppercase" style={{ fontFamily: "'Space Mono', monospace" }}>
            STUDIO CRM
          </h1>
          <span className="bg-[#ff6b00] text-white text-[10px] font-black px-2 py-0.5 rounded tracking-widest">V2.0_BETA</span>
        </div>
        <div className="flex items-center gap-2 bg-[#261812] border-2 border-[#5a4136] rounded px-3 py-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#8e7164]" />
          <input placeholder="Buscar aluno ou aula..." className="bg-transparent text-sm text-[#fff8f6] placeholder:text-[#8e7164] outline-none flex-1" style={{ fontFamily: "'Space Mono', monospace" }} />
        </div>
        <div className="flex items-center gap-3">
          <button className="text-[#8e7164] hover:text-white"><Bell className="w-5 h-5" /></button>
          <button className="text-[#8e7164] hover:text-white"><HelpCircle className="w-5 h-5" /></button>
          <div className="w-9 h-9 rounded-full border-2 border-[#ff6b00] bg-[#ff6b00] flex items-center justify-center text-white font-black text-sm">
            {(user?.nome || 'A').charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-auto p-6 space-y-5">

        {/* TOP ROW */}
        <div className="grid grid-cols-3 gap-5">
          {/* Total Alunos & Aulas */}
          <div className="col-span-2 grid grid-cols-2 gap-5">
            <div className="sticker-card rounded-lg p-5 flex flex-col justify-center" style={{ background: '#fff8f6' }}>
              <p className="text-[#ff6b00] text-[10px] font-black uppercase tracking-widest mb-3">TOTAL DE ALUNOS ATIVOS</p>
              <div className="text-[#261812] font-black text-6xl leading-none">
                {stats?.totalAlunos || 0}
              </div>
            </div>
            <div className="sticker-card rounded-lg p-5 flex flex-col justify-center" style={{ background: '#fff8f6' }}>
              <p className="text-[#ff6b00] text-[10px] font-black uppercase tracking-widest mb-3">AULAS AGENDADAS (HOJE)</p>
              <div className="text-[#261812] font-black text-6xl leading-none">
                {stats?.aulasHoje || 0}
              </div>
            </div>
          </div>

          {/* Alunos PWA Ativos */}
          <div className="rounded-lg p-5 relative flex flex-col" style={{ background: '#ff6b00', border: '3px solid #261812', boxShadow: '4px 4px 0 #261812' }}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <p className="text-white text-[11px] font-black uppercase tracking-widest">STATUS DE INSTALAÇÃO DO APP</p>
              <span className="text-white font-black text-xl">📱</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-48 custom-scrollbar">
              {alunosApp.length > 0 ? alunosApp.map((aluno: any, idx: number) => (
                <div key={idx} className={`bg-white rounded px-3 py-2 flex items-center justify-between gap-2 border-2 ${aluno.ativo ? 'border-emerald-500' : 'border-red-500'}`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs shrink-0">{aluno.ativo ? '🟢' : '🔴'}</span>
                    <span className="text-[#261812] text-xs font-black truncate" title={aluno.nome}>{aluno.nome}</span>
                  </div>
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${aluno.ativo ? 'bg-emerald-100 text-emerald-800 border border-emerald-400' : 'bg-red-100 text-red-800 border border-red-400'}`}>
                    {aluno.ativo ? 'ATIVO' : 'COBRAR'}
                  </span>
                </div>
              )) : (
                <div className="text-white/80 text-xs font-black uppercase text-center mt-5">Sem alunos cadastrados</div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="grid grid-cols-3 gap-5">

          {/* Matrículas por Curso Chart */}
          <div className="col-span-2 sticker-card rounded-lg overflow-hidden flex flex-col" style={{ background: '#fff8f6', minHeight: '280px' }}>
            <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: '#ff6b00', borderBottom: '3px solid #261812' }}>
              <div className="w-3 h-3 rounded-sm border border-white bg-white/20"></div>
              <p className="text-white text-[11px] font-black uppercase tracking-widest flex-1">MATRÍCULAS POR CURSO / INSTRUMENTO</p>
              <div className="flex gap-2">
                <div className="w-4 h-4 border border-white rounded-sm bg-white/20"></div>
                <div className="w-4 h-4 border border-white rounded-sm bg-white/20"></div>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-end">
              <div className="flex items-end gap-4 h-40 mb-3 border-b-4 border-[#261812] pb-1">
                {matriculasPorCurso.length > 0 ? matriculasPorCurso.map((m: any, i: number) => {
                  const heightPct = Math.max(5, (m.qtd / maxQtd) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-black text-white text-[10px] font-black px-2 py-1 rounded transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        {m.qtd} Aluno{m.qtd !== 1 ? 's' : ''}
                      </div>
                      <div
                        className="w-full rounded-t transition-all cursor-pointer hover:brightness-90 relative"
                        style={{ height: `${heightPct}%`, background: '#ff6b00', border: '3px solid #261812', borderBottom: 'none' }}
                      >
                         <div className="absolute inset-0 bg-white/10 w-1/3"></div>
                      </div>
                    </div>
                  );
                }) : (
                   <div className="w-full flex items-center justify-center text-[#8e7164] font-black uppercase text-xs">Sem dados de cursos</div>
                )}
              </div>
              <div className="flex gap-4">
                {matriculasPorCurso.map((m: any, i: number) => (
                  <div key={i} className="flex-1 text-center shrink-0 min-w-0">
                    <span className="text-[9px] font-black text-[#8e7164] uppercase truncate block">{m.curso.substring(0, 8)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Próximas Aulas */}
          <div className="sticker-card rounded-lg overflow-hidden" style={{ background: '#fff8f6' }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-[#7b5647]">
              <Clock className="w-4 h-4 text-[#7b5647]" />
              <p className="text-[#261812] text-[11px] font-black uppercase tracking-widest">PRÓXIMAS AULAS</p>
            </div>
            <div className="divide-y-2 divide-[#f8ddd2] min-h-[150px] flex flex-col">
              {proximasAulas.length > 0 ? proximasAulas.slice(0, 3).map((aula: any, i: number) => (
                <div key={aula.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded border-2 border-[#7b5647] bg-[#feccba] flex items-center justify-center text-[#261812] font-black text-xs shrink-0">
                    {(aula.nome || aula.aluno_nome || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#261812] text-xs font-black truncate">{aula.nome || aula.aluno_nome} – {aula.instrumento || aula.curso_nome || 'Aula'}</p>
                    <p className="text-[#ff6b00] text-[10px] font-black">{aula.horario} • {aula.sala || 'Sala'}</p>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColors[i % 3]}`}></div>
                </div>
              )) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center opacity-40">
                  <p className="text-[10px] font-black text-[#261812] uppercase tracking-widest">Sem aulas<br />agendadas hoje</p>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate('/agenda')}
              className="w-full py-3 border-t-2 border-[#7b5647] text-[#261812] text-[10px] font-black uppercase tracking-widest hover:bg-[#ff6b00] hover:text-white transition-all"
            >
              VER AGENDA COMPLETA
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-t-4 border-[#3d2d26]" style={{ background: '#1a0f0a' }}>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded border-2 border-[#5a4136] text-[#fff8f6] text-xs font-black uppercase tracking-widest hover:border-[#ff6b00] hover:text-[#ff6b00] transition-all">
          <Plus className="w-4 h-4" /> Registrar Pagamento
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded text-white text-xs font-black uppercase tracking-widest pressable-btn" style={{ background: '#ff6b00', border: '2px solid #261812' }}>
          <Megaphone className="w-4 h-4" /> Enviar Comunicado
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded border-2 border-[#5a4136] text-[#fff8f6] text-xs font-black uppercase tracking-widest hover:border-[#ff6b00] hover:text-[#ff6b00] transition-all">
          Estoque: Instrum...
        </button>
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-xl shrink-0" style={{ background: '#ff6b00', border: '3px solid #261812', boxShadow: '3px 3px 0 #261812' }}>
          +
        </button>
      </div>
    </div>
  );
}
