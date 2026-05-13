import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, HelpCircle, Search, AlertTriangle, Megaphone, Sparkles, Clock, Plus, TrendingUp, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/dashboard/stats', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => setStats(data))
      .catch(() => setStats({ totalAlunos: 0, aulasHoje: 0, receitaMensal: 0, proximasAulas: [] }));
  }, []);

  const faturamento = stats?.receitaMensal ?? 0;
  const proximasAulas = stats?.proximasAulas ?? [];

  // Data history - default to flat bars if empty
  const bars = stats?.historicoMatriculas ?? [10, 10, 10, 10, 10, 10];
  const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN'];

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

        {/* TOP CARDS ROW */}
        <div className="grid grid-cols-3 gap-5">

          {/* Faturamento do Mês */}
          <div className="sticker-card rounded-lg p-5" style={{ background: '#fff8f6' }}>
            <p className="text-[#ff6b00] text-[10px] font-black uppercase tracking-widest mb-3">FATURAMENTO DO MÊS</p>
            <div className="text-[#261812] font-black" style={{ fontSize: '3rem', lineHeight: 1, fontFamily: "'Space Mono', monospace" }}>
              R$
            </div>
            <div className="text-[#261812] font-black" style={{ fontSize: '2.8rem', lineHeight: 1, fontFamily: "'Space Mono', monospace" }}>
              {faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-4 inline-flex items-center gap-1 border-2 border-[#ff6b00] rounded px-2 py-1">
              <TrendingUp className="w-3 h-3 text-[#ff6b00]" />
              <span className="text-[#ff6b00] text-[10px] font-black">0% vs mês anterior</span>
            </div>
          </div>

          {/* Alertas Críticos */}
          <div className="rounded-lg p-5 relative" style={{ background: '#ff6b00', border: '3px solid #261812', boxShadow: '4px 4px 0 #261812' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-white text-[11px] font-black uppercase tracking-widest">SISTEMA ATIVO</p>
              <span className="text-white font-black text-xl">✓</span>
            </div>
            <div className="space-y-2">
              <div className="bg-white rounded px-3 py-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#ff6b00] shrink-0" />
                <span className="text-[#261812] text-xs font-black">Nenhum alerta crítico</span>
              </div>
            </div>
          </div>

          {/* Meta do Mês */}
          <div className="sticker-card rounded-lg p-5 flex flex-col items-center justify-center" style={{ background: '#fff8f6' }}>
            <div className="flex gap-2 text-[#ff6b00] mb-2">
              <Sparkles className="w-5 h-5" />
              <Sparkles className="w-4 h-4 mt-1" />
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-[#261812] font-black text-center text-sm uppercase tracking-widest leading-tight">
              META DE MATRÍCULAS<br />TEMPORADA ATUAL
            </p>
            <div className="w-full mt-4 rounded-sm overflow-hidden" style={{ background: '#261812', height: '24px', border: '2px solid #261812' }}>
              <div className="h-full rounded-sm flex items-center justify-end pr-2" style={{ width: '5%', background: '#7b5647' }}>
                <span className="text-white text-[10px] font-black">0%</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="grid grid-cols-3 gap-5">

          {/* Matrículas Ativas Chart */}
          <div className="col-span-2 sticker-card rounded-lg overflow-hidden" style={{ background: '#fff8f6' }}>
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: '#ff6b00', borderBottom: '3px solid #261812' }}>
              <div className="w-3 h-3 rounded-sm border border-white bg-white/20"></div>
              <p className="text-white text-[11px] font-black uppercase tracking-widest flex-1">MATRÍCULAS ATIVAS - HISTÓRICO 2024</p>
              <div className="flex gap-2">
                <div className="w-4 h-4 border border-white rounded-sm bg-white/20"></div>
                <div className="w-4 h-4 border border-white rounded-sm bg-white/20"></div>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-end gap-3 h-28 mb-3">
                {bars.map((h: number, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t transition-all"
                      style={{ height: `${h}%`, background: '#e2bfb0', border: '2px solid #7b5647' }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                {months.map((m, i) => (
                  <div key={i} className="flex-1 text-center">
                    <span className="text-[10px] font-black text-[#8e7164] uppercase">{m}</span>
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
