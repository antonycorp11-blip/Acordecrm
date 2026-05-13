import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, HelpCircle, Search, ChevronLeft, ChevronRight, Zap, Users, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];

export default function Agenda() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [professores, setProfessores] = useState<any[]>([]);
  const [aulas, setAulas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaOffset, setDiaOffset] = useState(0);
  const [navType, setNavType] = useState<'dia' | 'semana'>('dia');
  const [viewType, setViewType] = useState<'individual' | 'grupo'>('individual');
  const [selectedAula, setSelectedAula] = useState<any>(null);
  const [menuPos, setMenuPos] = useState<{x: number, y: number} | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const currentBaseDate = new Date();
  currentBaseDate.setDate(currentBaseDate.getDate() + diaOffset);
  
  const getDisplayDate = (offset: number) => {
    const d = new Date(currentBaseDate);
    d.setDate(d.getDate() + offset);
    return d;
  };

  const mesAno = currentBaseDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase().replace(' DE ', ' ');

  const fetchAulas = () => {
    const token = localStorage.getItem('acorde_token');
    const headers = { Authorization: `Bearer ${token}` };
    const start = getDisplayDate(0).toISOString().split('T')[0];
    
    setLoading(true);
    Promise.all([
      fetch('/api/professores', { headers }).then(r => r.ok ? r.json() : []),
      fetch(`/api/agenda?date=${start}`, { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([profs, ag]) => {
      setProfessores(Array.isArray(profs) ? profs.slice(0, 15) : []);
      setAulas(Array.isArray(ag) ? ag : []);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAulas();
  }, [diaOffset]);

  // Map aula to grid position - simplificado para o dia atual exibido (ou lógica de semana se fosse o caso)
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

  const handleDragStart = (e: React.DragEvent, aula: any) => {
    e.dataTransfer.setData('aulaId', aula.id);
    setIsDragging(true);
  };

  const handleDrop = async (e: React.DragEvent, profId: string, horario: string) => {
    e.preventDefault();
    setIsDragging(false);
    const aulaId = e.dataTransfer.getData('aulaId');
    if (!aulaId) return;

    try {
      const res = await fetch(`/api/agenda/${aulaId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('acorde_token')}`
        },
        body: JSON.stringify({ 
          professor_id: profId, 
          horario,
          data: currentBaseDate.toISOString().split('T')[0]
        })
      });

      if (res.ok) {
        toast.success('Aula remarcada!');
        fetchAulas();
      }
    } catch (err) {
      toast.error('Erro ao remarcar aula');
    }
  };

  const handleAulaClick = (e: React.MouseEvent, aula: any) => {
    e.stopPropagation();
    setMenuPos({ x: e.clientX, y: e.clientY });
    setSelectedAula(aula);
  };

  useEffect(() => {
    const handleClickOutside = () => setSelectedAula(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

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
              <span className="text-white font-black text-sm uppercase tracking-widest">QUADRO DE HORÁRIOS - {diaOffset === 0 ? 'HOJE' : getDisplayDate(0).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
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
              {/* DIA / SEMANA TOGGLE */}
              <div className="flex bg-[#261812] border-2 border-black p-0.5 rounded shadow-[3px_3px_0_#000] mr-4">
                <button 
                  onClick={() => setNavType('dia')}
                  className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all ${navType === 'dia' ? 'bg-[#ff6b00] text-white shadow-[1px_1px_0_#000]' : 'text-[#8e7164] hover:text-white'}`}
                >
                  Dia
                </button>
                <button 
                  onClick={() => setNavType('semana')}
                  className={`px-3 py-1 rounded text-[9px] font-black uppercase transition-all ${navType === 'semana' ? 'bg-[#ff6b00] text-white shadow-[1px_1px_0_#000]' : 'text-[#8e7164] hover:text-white'}`}
                >
                  Semana
                </button>
              </div>

              <button
                onClick={() => setDiaOffset(o => o - (navType === 'semana' ? 7 : 1))}
                className="px-4 py-2 rounded font-black text-xs uppercase text-[#261812] border-2 border-[#7b5647] hover:bg-[#feccba] transition-all"
              >
                Anterior
              </button>
              <button
                onClick={() => setDiaOffset(0)}
                className="px-5 py-2 rounded font-black text-xs uppercase text-white"
                style={{ background: '#261812', border: '2px solid #261812' }}
              >
                Hoje
              </button>
              <button
                onClick={() => setDiaOffset(o => o + (navType === 'semana' ? 7 : 1))}
                className="px-4 py-2 rounded font-black text-xs uppercase text-[#261812] border-2 border-[#7b5647] hover:bg-[#feccba] transition-all"
              >
                Próximo
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="border-2 border-[#261812] rounded px-3 py-1 font-black text-xs text-[#261812] uppercase">{mesAno}</span>
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
              <table className="min-w-full h-full" style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 px-4 py-3 text-[#261812] font-black text-[10px] uppercase tracking-widest text-left min-w-[150px]" style={{ background: '#feccba', borderRight: '3px solid #261812', borderBottom: '3px solid #261812' }}>
                      PROFESSORES
                    </th>
                    {HOURS.map(h => (
                      <th key={h} className="px-2 py-3 text-[#261812] font-black text-[10px] uppercase tracking-widest text-center min-w-[100px]" style={{ background: '#feccba', borderRight: '2px solid #e2bfb0', borderBottom: '3px solid #261812' }}>
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
                          <div className="w-5 h-5 rounded-sm shrink-0 shadow-sm" style={{ background: prof.cor_agenda || '#feccba', border: '2px solid #261812' }}></div>
                          <span className="text-[#261812] font-black text-[11px] truncate max-w-[110px] leading-tight">{prof.nome}</span>
                        </div>
                      </td>
                      {HOURS.map(h => {
                        const aulasDaHora = getAulaForProfHour(prof.id, h);
                        return (
                          <td 
                            key={h} 
                            className={`px-1 py-1 text-center align-top min-h-[60px] transition-colors ${isDragging ? 'bg-[#feccba]/30' : ''}`} 
                            style={{ borderRight: '1px solid #e2bfb0' }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, prof.id, h)}
                          >
                            <div className="flex flex-col gap-1 min-h-full">
                              {aulasDaHora.map(aula => {
                                const c = getAulaColor(aula);
                                return (
                                  <div
                                    key={aula.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, aula)}
                                    onClick={(e) => handleAulaClick(e, aula)}
                                    className="px-2 py-1.5 rounded text-[10px] font-black uppercase truncate w-full cursor-pointer transition-all hover:scale-105 active:scale-95 z-0"
                                    style={{ background: c.bg, border: `2px solid ${c.border}`, color: c.text, boxShadow: `3px 3px 0 ${c.border}` }}
                                    title={aula.aluno_nome || 'Aula'}
                                  >
                                    {(aula.aluno_nome || 'ALUNO').split(' ')[0].substring(0, 10)}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={HOURS.length + 1} className="py-20 text-center">
                        <p className="text-[#7b5647] font-black uppercase text-xs opacity-50 tracking-widest">Nenhum professor cadastrado</p>
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
      {/* MINI MENU */}
      {selectedAula && menuPos && (
        <div 
          className="fixed z-[100] bg-white border-4 border-black shadow-[6px_6px_0_#000] p-2 flex flex-col gap-1 animate-in zoom-in-95 duration-200"
          style={{ top: menuPos.y, left: menuPos.x }}
          onClick={e => e.stopPropagation()}
        >
          <button 
            onClick={() => navigate(`/alunos/${selectedAula.aluno_id}`)}
            className="px-4 py-2 text-[10px] font-black uppercase text-left hover:bg-[#ffeae1] transition-colors flex items-center gap-2 border-2 border-transparent hover:border-black"
          >
            <Users className="w-3.5 h-3.5" /> Ver Perfil
          </button>
          <button 
            onClick={() => {
              if (confirm('Deseja desmarcar esta aula?')) {
                fetch(`/api/agenda/${selectedAula.id}`, { 
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${localStorage.getItem('acorde_token')}` }
                }).then(() => {
                  fetchAulas();
                  setSelectedAula(null);
                });
              }
            }}
            className="px-4 py-2 text-[10px] font-black uppercase text-left hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2 border-2 border-transparent hover:border-black"
          >
            <Trash2 className="w-3.5 h-3.5" /> Desmarcar
          </button>
        </div>
      )}
    </div>
  );
}
