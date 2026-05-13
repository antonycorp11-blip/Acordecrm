import React, { useState, useEffect } from 'react';
import { Bell, Home, Users, Calendar, User, CheckCircle2, XCircle, ChevronRight, Plus, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AreaProfessor() {
  const { user } = useAuth();
  const [aulasHoje, setAulasHoje] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const xp = 8450;
  const xpMax = 10000;
  const nivel = 42;
  const xpPct = Math.min(100, (xp / xpMax) * 100);
  const hoje = format(new Date(), "d 'de' MMM", { locale: ptBR }).toUpperCase();
  const todayDay = format(new Date(), 'dd');
  const todayMonth = format(new Date(), 'MMM', { locale: ptBR }).toUpperCase();

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/agenda', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        setAulasHoje((Array.isArray(data) ? data : []).slice(0, 3));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handlePresenca = async (aulaId: number, status: string) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/aulas/${aulaId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setAulasHoje(prev => prev.map(a => a.id === aulaId ? { ...a, status } : a));
  };

  const demoAulas = [
    { id: 1, nome: 'Ricardo Souza', horario: '14:00', horario_fim: '15:00', curso_nome: 'PIANO INTERMEDIÁRIO', status: 'pendente', live: true },
    { id: 2, nome: 'Ana Beatriz', horario: '15:30', horario_fim: '16:30', curso_nome: 'VIOLÃO INICIANTE', status: 'pendente', live: false },
    { id: 3, nome: null, horario: '17:00', horario_fim: '18:00', curso_nome: 'HORÁRIO DISPONÍVEL', status: 'vago', live: false },
  ];

  const displayAulas = aulasHoje.length > 0 ? aulasHoje : demoAulas;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#1a0a05', fontFamily: "'Space Mono', monospace" }}>

      {/* TOP BAR */}
      <header className="flex items-center justify-between px-5 py-4 shrink-0" style={{ background: '#261812', borderBottom: '3px solid #000' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded border-2 border-[#ff6b00] overflow-hidden">
            <div className="w-full h-full flex items-center justify-center text-white font-black" style={{ background: '#ff6b00' }}>
              {(user?.nome || 'P').charAt(0).toUpperCase()}
            </div>
          </div>
          <h1 className="text-white font-black text-lg uppercase tracking-widest">MUSIC_HUB</h1>
        </div>
        <button className="text-[#8e7164] hover:text-[#ff6b00]">
          <Bell className="w-6 h-6" />
        </button>
      </header>

      {/* SCROLL CONTENT */}
      <div className="flex-1 overflow-auto pb-24 px-4 py-5 space-y-4">

        {/* Resumo do Dia Card */}
        <div className="rounded-xl p-5 relative" style={{ background: '#ff6b00', border: '3px solid #261812', boxShadow: '4px 4px 0 #000' }}>
          {/* Badge superior */}
          <div className="flex items-center justify-between mb-3">
            <div className="bg-[#261812]/40 rounded px-3 py-1">
              <span className="text-white/60 font-black text-[9px] uppercase tracking-widest">Nome do professor</span>
            </div>
            <div className="w-12 h-12 rounded border-2 border-white/30 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <Star className="w-6 h-6 text-white" />
            </div>
          </div>

          <h2 className="text-white font-black text-xl uppercase tracking-widest mb-2">RESUMO_DO_DIA</h2>
          <p className="text-white/80 font-black text-sm mb-1">XP: {xp.toLocaleString()} / {xpMax.toLocaleString()}</p>
          <p className="text-white/80 font-black text-sm mb-4">LVL {nivel}</p>

          {/* XP bar */}
          <div className="h-3 rounded overflow-hidden mb-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div className="h-full rounded" style={{ width: `${xpPct}%`, background: '#261812' }}></div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
              <p className="text-white/60 font-black text-[10px] uppercase tracking-widest">AULAS HOJE</p>
              <p className="text-white font-black text-3xl">{displayAulas.filter((a: any) => a.status !== 'vago').length.toString().padStart(2, '0')}</p>
            </div>
            <div className="rounded-lg px-4 py-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
              <p className="text-white/60 font-black text-[10px] uppercase tracking-widest">ALUNOS ATIVOS</p>
              <p className="text-white font-black text-3xl">24</p>
            </div>
          </div>
        </div>

        {/* Financeiro Card */}
        <div className="rounded-xl p-5" style={{ background: '#261812', border: '2px solid #3d2d26' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[#8e7164] font-black text-[10px]">💳</span>
              <span className="text-[#8e7164] font-black text-[10px] uppercase tracking-widest">FINANCEIRO_SETEMBRO</span>
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[#ff6b00] font-black text-2xl">R$ 12.480,00</p>
              <p className="text-[#8e7164] font-bold text-xs mt-1">+12% vs mês anterior</p>
            </div>
            {/* Mini bar chart */}
            <div className="flex items-end gap-1 h-12">
              {[40, 55, 45, 70, 60, 85].map((h, i) => (
                <div key={i} className="w-4 rounded-t" style={{ height: `${h}%`, background: i === 5 ? '#ff6b00' : '#3d2d26' }}></div>
              ))}
            </div>
          </div>
        </div>

        {/* Agenda do dia */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-black text-xl uppercase tracking-widest">AGENDA_HOJE</h3>
            <span className="font-black text-white text-sm px-3 py-1 rounded" style={{ background: '#7b5647' }}>
              {todayMonth.substring(0, 3)} {todayDay}
            </span>
          </div>

          <div className="space-y-3">
            {displayAulas.map((aula: any) => {
              const isVago = aula.status === 'vago' || !aula.nome;
              return (
                <div
                  key={aula.id}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: isVago ? 'transparent' : '#fff8f6',
                    border: isVago ? '2px dashed #5a4136' : '3px solid #261812',
                    boxShadow: isVago ? 'none' : '3px 3px 0 #261812'
                  }}
                >
                  <div className="flex items-center gap-4 p-4">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded flex items-center justify-center shrink-0" style={{ background: isVago ? '#261812' : '#feccba', border: `2px solid ${isVago ? '#3d2d26' : '#7b5647'}` }}>
                      <span className="font-black text-xl" style={{ color: isVago ? '#5a4136' : '#a04100' }}>♪</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm uppercase" style={{ color: isVago ? '#5a4136' : '#261812' }}>
                        {aula.horario} - {aula.horario_fim || `${parseInt(aula.horario) + 1}:00`}
                      </p>
                      <p className="font-black text-base" style={{ color: isVago ? '#3d2d26' : '#261812' }}>
                        {aula.nome || 'VAGO'}
                      </p>
                      <p className="font-bold text-xs uppercase" style={{ color: isVago ? '#5a4136' : '#8e7164' }}>
                        {aula.curso_nome}
                      </p>
                    </div>

                    {/* Action */}
                    {isVago ? (
                      <button className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: '#3d2d26', border: '2px solid #5a4136' }}>
                        <Plus className="w-5 h-5 text-[#8e7164]" />
                      </button>
                    ) : aula.live ? (
                      <div className="shrink-0">
                        <span className="font-black text-white text-[10px] px-3 py-2 rounded uppercase" style={{ background: '#ff6b00', transform: 'rotate(3deg)', display: 'inline-block' }}>LIVE</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => handlePresenca(aula.id, 'presente')}
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ background: '#ff6b00', border: '2px solid #261812' }}
                        >
                          <ChevronRight className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Confirmar presença buttons */}
                  {!isVago && !aula.live && aula.status === 'pendente' && (
                    <div className="grid grid-cols-2 gap-0 border-t-2 border-[#f8ddd2]">
                      <button
                        onClick={() => handlePresenca(aula.id, 'presente')}
                        className="flex items-center justify-center gap-2 py-3 font-black text-xs uppercase text-emerald-700 hover:bg-emerald-50 transition-all"
                        style={{ borderRight: '1px solid #f8ddd2' }}
                      >
                        <CheckCircle2 className="w-4 h-4" /> Presente
                      </button>
                      <button
                        onClick={() => handlePresenca(aula.id, 'ausente')}
                        className="flex items-center justify-center gap-2 py-3 font-black text-xs uppercase text-red-600 hover:bg-red-50 transition-all"
                      >
                        <XCircle className="w-4 h-4" /> Falta
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Registrar Presença CTA */}
        <div className="rounded-xl p-6 text-center" style={{ background: '#fff8f6', border: '3px solid #261812', boxShadow: '4px 4px 0 #000' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#feccba', border: '2px solid #7b5647' }}>
            <CheckCircle2 className="w-8 h-8 text-[#a04100]" />
          </div>
          <p className="text-[#8e7164] font-black text-[10px] uppercase tracking-widest mb-2">REGISTRAR_PRESENÇA</p>
          <p className="text-[#261812] font-bold text-sm mb-5">Marque as presenças da última aula para manter o ranking atualizado!</p>
          <button className="w-full py-4 rounded font-black text-white uppercase tracking-widest pressable-btn" style={{ background: '#7b5647', border: '2px solid #261812' }}>
            IR AGORA
          </button>
          {/* NEW BEAT sticker */}
          <div className="mt-3 inline-block transform rotate-3">
            <span className="font-black text-[#261812] text-[10px] uppercase px-3 py-1 border-2 border-[#261812]" style={{ background: '#ffd700' }}>
              NEW BEAT! 🎵
            </span>
          </div>
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-around py-3 z-20" style={{ background: '#261812', borderTop: '3px solid #3d2d26' }}>
        {[
          { icon: Home, label: 'HOME', active: true },
          { icon: Users, label: 'ALUNOS' },
          { icon: Calendar, label: 'AGENDA' },
          { icon: User, label: 'PERFIL' },
        ].map((item, i) => (
          <button key={i} className="flex flex-col items-center gap-1 px-4">
            <div className="w-10 h-10 rounded flex items-center justify-center" style={{ background: item.active ? '#ff6b00' : 'transparent' }}>
              <item.icon className={`w-5 h-5 ${item.active ? 'text-white' : 'text-[#8e7164]'}`} />
            </div>
            <span className={`text-[8px] font-black uppercase tracking-widest ${item.active ? 'text-[#ff6b00]' : 'text-[#5a4136]'}`}>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
