import React, { useEffect, useState } from 'react';
import { Bell, HelpCircle, Search, ChevronLeft, ChevronRight, Zap, Users, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];

export default function Agenda() {
  const { user } = useAuth();
  const [professores, setProfessores] = useState<any[]>([]);
  const [aulas, setAulas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [viewType, setViewType] = useState<'individual' | 'grupo'>('individual');

  const hoje = new Date();
  const mesAno = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase().replace(' DE ', ' ');

  useEffect(() => {
    const token = localStorage.getItem('acorde_token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/professores', { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/agenda', { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([profs, ag]) => {
      setProfessores(Array.isArray(profs) ? profs.slice(0, 9) : []);
      setAulas(Array.isArray(ag) ? ag : []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Map aula to grid position
  const getAulaForProfHour = (profId: number, hour: string) => {
    return aulas.filter(a => {
      const h = (a.horario || '').substring(0, 5);
      return a.professor_id === profId && h === hour;
    });
  };

  // Color based on tipo/status
  const getAulaColor = (aula: any) => {
    if (aula.tipo === 'experimental') return { bg: '#fff8f6', border: '#7b5647', text: '#261812' };
    return { bg: '#ff6b00', border: '#261812', text: '#fff' };
  };

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden" style={{ background: '#1a0f0a', fontFamily: "'Space Mono', monospace" }}>

      {/* TOP BAR */}
      <header className="flex items-center gap-4 px-6 py-4 border-b-4 border-[#3d2d26] shrink-0" style={{ background: '#1a0f0a' }}>
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-white font-black text-lg tracking-widest uppercase">STUDIO CRM</h1>
          <span className="text-[#ff6b00] font-black text-lg tracking-widest uppercase ml-2">| AGENDA</span>
        </div>
        <div className="flex items-center gap-2 bg-[#261812] border-2 border-[#5a4136] rounded px-3 py-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#8e7164]" />
          <input placeholder="Buscar aluno ou professor..." className="bg-transparent text-sm text-[#fff8f6] placeholder:text-[#8e7164] outline-none flex-1" style={{ fontFamily: "'Space Mono', monospace" }} />
        </div>
        <div className="flex items-center gap-3">
          <button className="text-[#8e7164] hover:text-white"><Bell className="w-5 h-5" /></button>
          <button className="text-[#8e7164] hover:text-white"><HelpCircle className="w-5 h-5" /></button>
          <div className="w-9 h-9 rounded-full border-2 border-[#ff6b00] bg-[#ff6b00] flex items-center justify-center text-white font-black text-sm">
            {(user?.nome || 'A').charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* CALENDAR CONTAINER */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full rounded-lg overflow-hidden flex flex-col" style={{ border: '4px solid #261812', boxShadow: '6px 6px 0 #000' }}>

          {/* Calendar Header */}
          <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ background: '#ff6b00', borderBottom: '3px solid #261812' }}>
            <div className="flex items-center gap-2">
              <span className="text-white text-[10px] font-black">📅</span>
              <span className="text-white font-black text-sm uppercase tracking-widest">QUADRO DE HORÁRIOS - SEMANA ATUAL</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
              <div className="w-4 h-4 bg-yellow-500 rounded-sm"></div>
              <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
            </div>
          </div>

          {/* Nav + Legend */}
          <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ background: '#fff8f6', borderBottom: '3px solid #261812' }}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSemanaOffset(o => o - 1)}
                className="px-4 py-2 rounded font-black text-xs uppercase text-[#261812] border-2 border-[#7b5647] hover:bg-[#feccba] transition-all"
              >
                Anterior
              </button>
              <button
                className="px-5 py-2 rounded font-black text-xs uppercase text-white"
                style={{ background: '#261812', border: '2px solid #261812' }}
              >
                Hoje
              </button>
              <button
                onClick={() => setSemanaOffset(o => o + 1)}
                className="px-4 py-2 rounded font-black text-xs uppercase text-[#261812] border-2 border-[#7b5647] hover:bg-[#feccba] transition-all"
              >
                Próximo
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="border-2 border-[#261812] rounded px-3 py-1 font-black text-xs text-[#261812] uppercase">{mesAno.substring(0, 12)}</span>
              <div className="flex items-center gap-4 ml-4">
                <button
                  onClick={() => setViewType('individual')}
                  className="flex items-center gap-2 text-xs font-black uppercase tracking-wider"
                >
                  <div className={`w-4 h-4 rounded-full border-2 ${viewType === 'individual' ? 'bg-[#ff6b00] border-[#ff6b00]' : 'border-[#7b5647]'}`}></div>
                  <span className="text-[#261812]">AULA INDIVIDUAL</span>
                </button>
                <button
                  onClick={() => setViewType('grupo')}
                  className="flex items-center gap-2 text-xs font-black uppercase tracking-wider"
                >
                  <div className={`w-4 h-4 rounded-full border-2 ${viewType === 'grupo' ? 'bg-[#ff6b00] border-[#ff6b00]' : 'border-[#7b5647]'}`}></div>
                  <span className="text-[#261812]">PRÁTICA EM GRUPO</span>
                </button>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-auto" style={{ background: '#ffeae1' }}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-[#7b5647] font-black uppercase text-sm animate-pulse">Carregando agenda...</span>
              </div>
            ) : (
              <table className="min-w-full h-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 px-4 py-3 text-[#261812] font-black text-[10px] uppercase tracking-widest text-left min-w-[130px]" style={{ background: '#feccba', borderRight: '3px solid #261812', borderBottom: '3px solid #261812' }}>
                      PROFESSORES
                    </th>
                    {HOURS.map(h => (
                      <th key={h} className="px-2 py-3 text-[#261812] font-black text-[10px] uppercase tracking-widest text-center min-w-[72px]" style={{ background: '#feccba', borderRight: '2px solid #e2bfb0', borderBottom: '3px solid #261812' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {professores.length > 0 ? professores.map((prof, pi) => (
                    <tr key={prof.id} style={{ borderBottom: '2px solid #e2bfb0' }}>
                      <td className="sticky left-0 z-10 px-4 py-2" style={{ background: '#fff8f6', borderRight: '3px solid #261812' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-sm shrink-0" style={{ background: prof.cor || '#feccba', border: '1px solid #7b5647' }}></div>
                          <span className="text-[#261812] font-black text-[11px] truncate max-w-[90px]">{prof.nome}</span>
                        </div>
                      </td>
                      {HOURS.map(h => {
                        const aulasDaHora = getAulaForProfHour(prof.id, h);
                        return (
                          <td key={h} className="px-1 py-2 text-center align-middle" style={{ borderRight: '1px solid #e2bfb0' }}>
                            {aulasDaHora.map(aula => {
                              const c = getAulaColor(aula);
                              return (
                                <div
                                  key={aula.id}
                                  className="px-2 py-1 rounded text-[10px] font-black uppercase truncate max-w-[68px] mx-auto cursor-pointer"
                                  style={{ background: c.bg, border: `2px solid ${c.border}`, color: c.text, boxShadow: `2px 2px 0 ${c.border}` }}
                                  title={aula.nome || aula.aluno_nome}
                                >
                                  {(aula.nome || aula.aluno_nome || '').split(' ')[0].substring(0, 7)}
                                </div>
                              );
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={HOURS.length + 1} className="py-20 text-center">
                        <p className="text-[#7b5647] font-black uppercase text-xs opacity-50 tracking-widest">Nenhum professor com aula hoje</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Status Bar */}
          <div className="flex items-center gap-8 px-5 py-3 shrink-0" style={{ background: '#261812', borderTop: '3px solid #000' }}>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#ff6b00]" />
              <span className="text-white font-black text-[10px] uppercase tracking-widest">{aulas.length} AULAS HOJE</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#8e7164]" />
              <span className="text-white font-black text-[10px] uppercase tracking-widest">{professores.length} PROFESSORES ATIVOS</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#ff6b00]" />
              <span className="text-white font-black text-[10px] uppercase tracking-widest">SISTEMA SINCRONIZADO</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[#8e7164] font-black text-[10px] uppercase tracking-widest">QUADRO_HORARIO_V1.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
