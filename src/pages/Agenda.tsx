import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, HelpCircle, Search, ChevronLeft, ChevronRight, Zap, Users, AlertTriangle, Trash2, RefreshCcw, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];

export default function Agenda() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.rescheduleAula) {
      setReschedulingAula(location.state.rescheduleAula);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const [professores, setProfessores] = useState<any[]>([]);
  const [aulas, setAulas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaOffset, setDiaOffset] = useState(0);
  const [navType, setNavType] = useState<'dia' | 'semana'>('dia');
  const [selectedProfessor, setSelectedProfessor] = useState<string>('todos');
  const [confirmedMsgIds, setConfirmedMsgIds] = useState<Set<number>>(new Set());
  const [selectedAula, setSelectedAula] = useState<any>(null);
  const [cancelModalAula, setCancelModalAula] = useState<any>(null);

  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [menuPos, setMenuPos] = useState<{x: number, y: number} | null>(null);
  const [reschedulingAula, setReschedulingAula] = useState<any>(null);
  const [mousePos, setMousePos] = useState({x: 0, y: 0});
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
    const start = format(getDisplayDate(0), 'yyyy-MM-dd');
    
    setLoading(true);
    Promise.all([
      fetch(`/api/professores?_t=${Date.now()}`, { headers: { ...headers, 'Cache-Control': 'no-cache, no-store, must-revalidate' } }).then(r => r.ok ? r.json() : []),
      fetch(`/api/agenda?date=${start}&_t=${Date.now()}`, { headers: { ...headers, 'Cache-Control': 'no-cache, no-store, must-revalidate' } }).then(r => r.ok ? r.json() : []),
    ]).then(([profs, ag]) => {
      setProfessores(Array.isArray(profs) ? profs : []);
      setAulas(Array.isArray(ag) ? ag : []);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAulas();
  }, [diaOffset]);

  // Map aula to grid position - simplificado para o dia atual exibido (ou lógica de semana se fosse o caso)
  const getAulaForProfHour = (profId: number, hour: string) => {
    const targetDate = format(currentBaseDate, 'yyyy-MM-dd');
    return aulas.filter(a => {
      if (a.status === 'cancelada') return false;
      const h = (a.horario || '').substring(0, 5);
      const d = a.data ? a.data.split('T')[0] : '';
      return a.professor_id === profId && h === hour && d === targetDate;
    });
  };

  // Color based on tipo/status
  const getAulaColor = (aula: any) => {
    if (aula.status === 'realizada' || aula.status === 'presente') return { bg: '#22c55e', border: '#14532d', text: '#ffffff' }; // Verde
    if (aula.status === 'confirmada') return { bg: '#3b82f6', border: '#1e3a8a', text: '#ffffff' }; // Azul
    if (aula.type === 'experimental' || aula.tipo === 'experimental') return { bg: '#fef08a', border: '#a16207', text: '#713f12' }; // Amarelo
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
          data: format(currentBaseDate, 'yyyy-MM-dd')
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
    const x = e.clientX;
    let y = e.clientY;
    if (y > window.innerHeight - 250) {
      y = window.innerHeight - 250;
    }
    setMenuPos({ x, y });
    setSelectedAula(aula);
  };

  const handleSlotClick = async (e: React.MouseEvent, profId: string, horario: string) => {
    if (!reschedulingAula) return;
    e.stopPropagation();
    
    try {
      const res = await fetch(`/api/agenda/${reschedulingAula.id}`, { 
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('acorde_token')}`
        },
        body: JSON.stringify({ 
          professor_id: profId, 
          horario,
          data: format(currentBaseDate, 'yyyy-MM-dd')
        })
      });

      if (res.ok) {
        toast.success('Aula reagendada com sucesso!');
        fetchAulas();
      } else {
        toast.error('Erro ao reagendar aula');
      }
    } catch (err) {
      toast.error('Erro ao remarcar aula');
    } finally {
      setReschedulingAula(null);
    }
  };

  useEffect(() => {
    const handleClickOutside = () => setSelectedAula(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!reschedulingAula) return;
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [reschedulingAula]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setReschedulingAula(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden" style={{ background: '#1a0f0a', fontFamily: "'Space Mono', monospace" }}>

      {/* TOP BAR */}
      <header className="flex items-center gap-4 px-6 pt-12 pb-4 md:pt-4 border-b-4 border-[#3d2d26] shrink-0" style={{ background: '#1a0f0a' }}>
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-white font-black text-lg tracking-widest uppercase truncate max-w-[120px] md:max-w-none">STUDIO CRM</h1>
          <span className="text-[#ff6b00] font-black text-lg tracking-widest uppercase ml-2 hidden md:inline">| AGENDA</span>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-[#261812] border-2 border-[#5a4136] rounded px-3 py-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#8e7164]" />
          <input placeholder="Buscar aluno ou professor..." className="bg-transparent text-sm text-[#fff8f6] placeholder:text-[#8e7164] outline-none flex-1" style={{ fontFamily: "'Space Mono', monospace" }} />
        </div>
        <div className="flex items-center gap-3">
          <button className="hidden md:block text-[#8e7164] hover:text-white"><Bell className="w-5 h-5" /></button>
          <button className="hidden md:block text-[#8e7164] hover:text-white"><HelpCircle className="w-5 h-5" /></button>
          <button 
            onClick={() => { logout(); navigate('/login'); }}
            className="md:hidden flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded border-2 border-red-800 text-[10px] font-black uppercase tracking-wider hover:bg-red-700 active:translate-y-0.5"
          >
            <LogOut className="w-3.5 h-3.5" /> Sair
          </button>
          <div className="hidden md:flex w-9 h-9 rounded-full border-2 border-[#ff6b00] bg-[#ff6b00] items-center justify-center text-white font-black text-sm">
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
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-5 py-3 shrink-0" style={{ background: '#fff8f6', borderBottom: '3px solid #261812' }}>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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

            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <span className="border-2 border-[#261812] rounded px-3 py-1 font-black text-xs text-[#261812] uppercase">{mesAno}</span>
              <div className="flex items-center gap-4 ml-4 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                <button
                  onClick={() => setSelectedProfessor('todos')}
                  className="flex items-center gap-2 text-xs font-black uppercase tracking-wider whitespace-nowrap"
                >
                  <div className={`w-4 h-4 rounded-full border-2 ${selectedProfessor === 'todos' ? 'bg-[#ff6b00] border-[#ff6b00]' : 'border-[#7b5647]'}`}></div>
                  <span className="text-[#261812]">TODOS</span>
                </button>
                {professores.map(p => {
                  const hasClassesToday = aulas.some(a => a.professor_id === p.id && a.status !== 'cancelada');
                  if (!hasClassesToday) return null;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProfessor(p.id.toString())}
                      className="flex items-center gap-2 text-xs font-black uppercase tracking-wider whitespace-nowrap"
                    >
                      <div className={`w-4 h-4 rounded-full border-2 ${selectedProfessor === p.id.toString() ? 'bg-[#ff6b00] border-[#ff6b00]' : 'border-[#7b5647]'}`}></div>
                      <span className="text-[#261812]">{p.nome.split(' ')[0]}</span>
                    </button>
                  );
                })}
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
              <>
              {/* VISÃO MOBILE (Cards) */}
              <div className="md:hidden flex flex-col gap-4 p-4 min-h-full">
                {aulas.length > 0 ? (
                  [...aulas]
                    .filter(a => a.status !== 'cancelada')
                    .filter(a => selectedProfessor === 'todos' || a.professor_id.toString() === selectedProfessor)
                    .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''))
                    .map(aula => {
                    const c = getAulaColor(aula);
                    const prof = professores.find(p => p.id === aula.professor_id);
                    const isMsgSent = confirmedMsgIds.has(aula.id);
                    return (
                      <div 
                        key={aula.id} 
                        className={`p-5 border-4 border-black shadow-[6px_6px_0_#000] cursor-pointer hover:bg-[#ffeae1] active:translate-y-1 active:shadow-[2px_2px_0_#000] transition-all ${isMsgSent ? 'bg-yellow-300' : 'bg-white'}`}
                        onClick={(e) => {
                           e.stopPropagation();
                           if (selectedAula?.id === aula.id) {
                               setSelectedAula(null);
                           } else {
                               setSelectedAula(aula);
                           }
                        }}
                      >
                        <div className="flex justify-between items-center mb-3">
                           <span className="font-black text-2xl uppercase text-black">{aula.horario ? aula.horario.substring(0, 5) : '--:--'}</span>
                           <span 
                             className={`text-[10px] uppercase font-black px-2 py-1 border-2 border-black shadow-[2px_2px_0_#000] ${aula.status !== 'confirmada' ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''}`}
                             style={{ background: c.bg, color: c.text }}
                             onClick={(e) => {
                               e.stopPropagation();
                               if (aula.status !== 'confirmada') {
                                 if (window.confirm('Tem certeza que deseja confirmar esta aula para o professor? (Isso enviará uma notificação a ele)')) {
                                   fetch(`/api/agenda/${aula.id}/confirmar`, { 
                                     method: 'POST',
                                     headers: { 'Authorization': `Bearer ${localStorage.getItem('acorde_token')}` }
                                   }).then(res => {
                                     if(res.ok) {
                                       toast.success('Aula confirmada com sucesso!');
                                       fetchAulas();
                                     } else {
                                       toast.error('Erro ao confirmar aula.');
                                     }
                                   });
                                 }
                               }
                             }}
                             title={aula.status !== 'confirmada' ? 'Clique para confirmar aula' : 'Aula confirmada'}
                           >
                             {aula.status || 'PENDENTE'}
                           </span>
                        </div>
                        <h3 className="font-black text-xl uppercase mb-1 text-black truncate">{aula.aluno_nome || 'ALUNO SEM NOME'}</h3>
                        <p className="text-[#ff6b00] font-black uppercase text-xs">PROF. {prof ? prof.nome.split(' ')[0] : 'DESCONHECIDO'}</p>

                        {/* ACÕES EXPOSTAS DO CARD */}
                        {selectedAula?.id === aula.id && (
                           <div className="mt-4 pt-4 border-t-4 border-dashed border-[#ff6b00] flex flex-col gap-2">
                               <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (aula.type === 'experimental') {
                                      navigate('/atendimento');
                                      toast.info('Edite o lead na tela de Atendimento & CRM.');
                                    } else {
                                      navigate(`/alunos/${aula.aluno_id}`);
                                    }
                                  }}
                                  className="w-full px-4 py-3 bg-[#feccba] border-4 border-black font-black text-xs uppercase text-left hover:bg-[#ff6b00] hover:text-white transition-colors flex items-center gap-2 text-black shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none"
                                >
                                  <Users className="w-4 h-4 shrink-0" /> {aula.type === 'experimental' ? 'Editar Lead (Atendimento)' : 'Perfil do Aluno'}
                                </button>
                               <button 
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    
                                    const today = new Date();
                                    const todayStr = format(today, 'yyyy-MM-dd');
                                    const tomorrow = new Date();
                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

                                    const datePart = aula.data || '';
                                    const parts = datePart.split('-');
                                    let dateText = 'hoje';
                                    const isToday = datePart === todayStr;
                                    const isTomorrow = datePart === tomorrowStr;
                                    
                                    if (isToday) {
                                      dateText = 'hoje';
                                    } else if (isTomorrow) {
                                      dateText = 'amanhã';
                                    } else if (parts.length === 3) {
                                      const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                                      const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                                      const dayMonth = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                                      dateText = `no dia ${dayMonth} (${weekday})`;
                                    }

                                    const hour = parseInt((aula.horario || '00:00:00').substring(0, 2), 10);
                                    const isMorning = hour < 12;
                                    const timeText = `${dateText} às ${(aula.horario || '').substring(0, 5)}${!isToday && !isTomorrow ? '' : (isMorning ? ' da manhã' : '')}`;
                                    
                                    const name = (aula.aluno_nome || 'Aluno(a)').split(' ')[0];
                                    const msg = `Olá ${name}, tudo bem? Passando para confirmar a sua aula ${timeText}. Podemos aguardar sua presença?`;

                                    // 1. Copy message
                                    navigator.clipboard.writeText(msg);
                                    toast.success('Mensagem de WhatsApp copiada!');
                                    
                                    // 2. Open WhatsApp link directly (synchronously to bypass mobile popup blockers)
                                    const phoneClean = (aula.telefone || '').replace(/\D/g, '');
                                    if (phoneClean) {
                                        setConfirmedMsgIds(prev => new Set(prev).add(aula.id));
                                        window.open(`https://api.whatsapp.com/send?phone=55${phoneClean}&text=${encodeURIComponent(msg)}`, '_blank');
                                    } else {
                                        toast.error('Telefone do aluno não cadastrado.');
                                    }
                                    setSelectedAula(null);
                                  }}
                                 className="w-full px-4 py-3 bg-green-500 text-white border-4 border-black font-black text-xs uppercase text-left hover:bg-green-600 transition-colors flex items-center gap-2 shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none mt-2"
                               >
                                 <span className="text-xl -mt-1 flex items-center justify-center shrink-0">💬</span> Confirmar no WhatsApp (Direto)
                               </button>
                               
                               {aula.type === 'regular' && (
                                 <button 
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     fetch(`/api/agenda/${aula.id}/solicitar-confirmacao`, { 
                                       method: 'POST',
                                       headers: { 'Authorization': `Bearer ${localStorage.getItem('acorde_token')}` }
                                     }).then(res => {
                                       if (res.ok) {
                                         toast.success('Notificação de confirmação enviada!');
                                         fetchAulas();
                                         setSelectedAula(null);
                                       } else {
                                         toast.error('Erro ao solicitar confirmação.');
                                       }
                                     });
                                   }}
                                   className="w-full px-4 py-3 bg-[#1a0f0a] text-white border-4 border-black font-black text-xs uppercase text-left hover:bg-black transition-colors flex items-center gap-2 shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none mt-2"
                                 >
                                   <Bell className="w-4 h-4 shrink-0" /> Notificar App (Push)
                                 </button>
                               )}

                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setReschedulingAula(aula);
                                   setSelectedAula(null);
                                 }}
                                 className="w-full px-4 py-3 bg-[#e0f2fe] text-black border-4 border-black font-black text-xs uppercase text-left hover:bg-[#bae6fd] transition-colors flex items-center gap-2 shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none mt-2"
                               >
                                 <RefreshCcw className="w-4 h-4 shrink-0" /> Reagendar
                               </button>

                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setCancelModalAula(aula);
                                   setSelectedAula(null);
                                 }}
                                 className="w-full px-4 py-3 bg-red-500 text-white border-4 border-black font-black text-xs uppercase text-left hover:bg-red-600 transition-colors flex items-center gap-2 shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none mt-2"
                               >
                                 <Trash2 className="w-4 h-4 shrink-0" /> Cancelar Aula
                               </button>
                           </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <p className="text-center font-black uppercase text-xs opacity-50 mt-10 text-[#261812]">Nenhuma aula programada</p>
                )}
              </div>

              {/* VISÃO DESKTOP (Tabela) */}
              <table className="min-w-full h-full hidden md:table" style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
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
                  {professores.filter(p => selectedProfessor === 'todos' || p.id.toString() === selectedProfessor).length > 0 ? professores.filter(p => selectedProfessor === 'todos' || p.id.toString() === selectedProfessor).map((prof, pi) => {
                    const dayNames = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
                    const currentDayName = dayNames[currentBaseDate.getDay()];
                    
                    return (
                    <tr key={prof.id} style={{ borderBottom: '4px solid #261812' }}>
                      <td className="sticky left-0 z-10 px-2 py-1 align-top" style={{ background: '#fff8f6', borderRight: '4px solid #261812' }}>
                        <div className="flex items-center gap-1 mt-0.5">
                          <div className="w-4 h-4 rounded-sm shrink-0 shadow-sm" style={{ background: prof.cor_agenda || '#feccba', border: '1.5px solid #261812' }}></div>
                          <span className="text-[#261812] font-black text-[9px] truncate max-w-[120px] leading-tight uppercase">{prof.nome.split(' ')[0]}</span>
                        </div>
                      </td>
                      {HOURS.map(h => {
                        const aulasDaHora = getAulaForProfHour(prof.id, h);
                        return (
                          <td 
                            key={h} 
                            className={`px-1 py-1 text-center align-top min-h-[60px] transition-colors ${reschedulingAula ? 'hover:bg-[#feccba]/50 cursor-crosshair' : (isDragging ? 'bg-[#feccba]/30' : '')}`} 
                            style={{ borderRight: '1px solid #e2bfb0' }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, prof.id, h)}
                            onClick={(e) => handleSlotClick(e, prof.id, h)}
                          >
                            <div className="flex flex-col gap-1 min-h-full">
                              {aulasDaHora.map(aula => {
                                const c = getAulaColor(aula);
                                const isMsgSent = confirmedMsgIds.has(aula.id);
                                return (
                                  <div
                                    key={aula.id}
                                    draggable={!reschedulingAula}
                                    onDragStart={(e) => handleDragStart(e, aula)}
                                    onClick={(e) => {
                                      if (selectedAula?.id === aula.id) {
                                        setSelectedAula(null);
                                        setMenuPos(null);
                                      } else {
                                        handleAulaClick(e, aula);
                                      }
                                    }}
                                    className={`px-2 py-1 rounded text-[10px] font-black uppercase truncate w-full cursor-pointer transition-all hover:scale-105 active:scale-95 z-0 relative ${isMsgSent ? 'bg-yellow-300' : ''}`}
                                    style={{ background: isMsgSent ? '#fde047' : c.bg, border: `2px solid ${c.border}`, color: c.text, boxShadow: `3px 3px 0 ${c.border}`, opacity: reschedulingAula ? 0.5 : 1 }}
                                    title={aula.aluno_nome || (aula.type === 'experimental' ? 'Aula Experimental' : 'Aula')}
                                  >
                                    {(aula.type === 'experimental' || aula.tipo === 'experimental') && (
                                      <span
                                        className="absolute -top-1.5 -right-1 text-[7px] font-black px-1 py-px rounded border border-yellow-600 leading-tight"
                                        style={{
                                          background: 'linear-gradient(135deg, #facc15 0%, #fbbf24 50%, #f59e0b 100%)',
                                          color: '#713f12',
                                          boxShadow: '0 0 6px 1px #fde047, 0 0 12px 2px #fbbf2466',
                                          animation: 'pulse 1.5s ease-in-out infinite'
                                        }}
                                      >
                                        ✨EXP
                                      </span>
                                    )}
                                    {(aula.type === 'experimental' || aula.tipo === 'experimental')
                                      ? (aula.aluno_nome && aula.aluno_nome !== 'Aula Experimental'
                                          ? aula.aluno_nome.split(' ')[0].substring(0, 8)
                                          : 'EXP')
                                      : (aula.aluno_nome || 'ALUNO').split(' ')[0].substring(0, 10)
                                    }
                                  </div>
                                );
                              })}
                              {aulasDaHora.length === 0 && prof.disponibilidade && prof.disponibilidade.includes(`${currentDayName}-${h}`) && (
                                <div className="px-2 py-1.5 rounded text-[8px] font-black uppercase w-full bg-[#FF8A00]/20 border-2 border-[#FF8A00] text-[#FF8A00] opacity-80 text-center flex flex-col items-center justify-center">
                                  <div className="w-1.5 h-1.5 bg-[#FF8A00] rounded-sm mb-0.5"></div>
                                  DISPONÍVEL
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={HOURS.length + 1} className="py-20 text-center">
                        <p className="text-[#7b5647] font-black uppercase text-xs opacity-50 tracking-widest">Nenhum professor cadastrado</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </>
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
      {/* MINI MENU DESKTOP */}
      {selectedAula && menuPos && (
        <div 
          className="hidden md:flex fixed z-[100] bg-white border-4 border-black shadow-[6px_6px_0_#000] p-2 flex-col gap-1 animate-in zoom-in-95 duration-200 font-['Space_Mono']"
          style={{ top: menuPos.y, left: menuPos.x }}
          onClick={e => e.stopPropagation()}
        >
          <button 
             onClick={(e) => {
               e.stopPropagation();
               if (selectedAula.status !== 'confirmada') {
                 if (window.confirm('Tem certeza que deseja confirmar esta aula para o professor? (Isso enviará uma notificação a ele)')) {
                   fetch(`/api/agenda/${selectedAula.id}/confirmar`, { 
                     method: 'POST',
                     headers: { 'Authorization': `Bearer ${localStorage.getItem('acorde_token')}` }
                   }).then(res => {
                     if(res.ok) {
                       toast.success('Aula confirmada com sucesso!');
                       fetchAulas();
                       setSelectedAula(null);
                     } else {
                       toast.error('Erro ao confirmar aula.');
                     }
                   });
                 }
               } else {
                 toast.info('Esta aula já está confirmada.');
               }
             }}
            className="px-4 py-2 text-[10px] font-black uppercase text-left hover:bg-[#ffeae1] transition-colors flex items-center gap-2 border-2 border-transparent hover:border-black text-black"
          >
            <Zap className="w-3.5 h-3.5" /> Confirmar Aula
          </button>
          <button 
            onClick={() => {
              if (selectedAula?.type === 'experimental') {
                navigate('/atendimento');
                toast.info('Edite o lead na tela de Atendimento & CRM.');
                setSelectedAula(null);
              } else {
                navigate(`/alunos/${selectedAula.aluno_id}`);
              }
            }}
            className="px-4 py-2 text-[10px] font-black uppercase text-left hover:bg-[#ffeae1] transition-colors flex items-center gap-2 border-2 border-transparent hover:border-black text-black"
          >
            <Users className="w-3.5 h-3.5" /> {selectedAula?.type === 'experimental' ? 'Editar Lead' : 'Ver Perfil'}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setReschedulingAula(selectedAula);
              setSelectedAula(null);
            }}
            className="px-4 py-2 text-[10px] font-black uppercase text-left hover:bg-[#ffeae1] transition-colors flex items-center gap-2 border-2 border-transparent hover:border-black text-black"
          >
            <RefreshCcw className="w-3.5 h-3.5" /> Reagendar
          </button>
          <button 
            onClick={() => {
              const today = new Date();
              const todayStr = format(today, 'yyyy-MM-dd');
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

              const datePart = selectedAula.data || '';
              const parts = datePart.split('-');
              let dateText = 'hoje';
              const isToday = datePart === todayStr;
              const isTomorrow = datePart === tomorrowStr;
              
              if (isToday) {
                dateText = 'hoje';
              } else if (isTomorrow) {
                dateText = 'amanhã';
              } else if (parts.length === 3) {
                const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
                const dayMonth = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                dateText = `no dia ${dayMonth} (${weekday})`;
              }

              const hour = parseInt((selectedAula.horario || '00:00:00').substring(0, 2), 10);
              const isMorning = hour < 12;
              const timeText = `${dateText} às ${(selectedAula.horario || '').substring(0, 5)}${!isToday && !isTomorrow ? '' : (isMorning ? ' da manhã' : '')}`;
              
              const name = (selectedAula.aluno_nome || 'Aluno(a)').split(' ')[0];
              const msg = `Olá ${name}, tudo bem? Passando para confirmar a sua aula ${timeText}. Podemos aguardar sua presença?`;

              // 1. Copy message
              navigator.clipboard.writeText(msg);
              toast.success('Mensagem de confirmação copiada!');
              
              // 2. Open WhatsApp link directly (synchronously to bypass mobile popup blockers)
              const phoneClean = (selectedAula.telefone || '').replace(/\D/g, '');
              if (phoneClean) {
                  setConfirmedMsgIds(prev => new Set(prev).add(selectedAula.id));
                  window.open(`https://api.whatsapp.com/send?phone=55${phoneClean}&text=${encodeURIComponent(msg)}`, '_blank');
              } else {
                  toast.error('Telefone do aluno não cadastrado.');
              }
              setSelectedAula(null);
            }}
            className="px-4 py-2 text-[10px] font-black uppercase text-left hover:bg-green-500 hover:text-white transition-colors flex items-center gap-2 border-2 border-transparent hover:border-black text-black"
          >
            <span className="text-sm -mt-0.5 w-3.5 h-3.5 flex items-center justify-center">💬</span> Confirmar no WhatsApp
          </button>
          {selectedAula.type === 'regular' && (
            <button 
              onClick={() => {
                fetch(`/api/agenda/${selectedAula.id}/solicitar-confirmacao`, { 
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${localStorage.getItem('acorde_token')}` }
                }).then(res => {
                  if (res.ok) {
                    toast.success('Notificação de confirmação enviada!');
                    fetchAulas();
                    setSelectedAula(null);
                  } else {
                    toast.error('Erro ao solicitar confirmação.');
                  }
                });
              }}
              className="px-4 py-2 text-[10px] font-black uppercase text-left hover:bg-[#ff6b00] hover:text-white transition-colors flex items-center gap-2 border-2 border-transparent hover:border-black text-black"
            >
              <Bell className="w-3.5 h-3.5" /> Solicitar Confirmação
            </button>
          )}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setCancelModalAula(selectedAula);
              setSelectedAula(null);
            }}
            className="px-4 py-2 text-[10px] font-black uppercase text-left hover:bg-red-500 hover:text-white transition-colors flex items-center gap-2 border-2 border-transparent hover:border-black text-black"
          >
            <Trash2 className="w-3.5 h-3.5" /> Cancelar Aula
          </button>
        </div>
      )}
      {/* FLOATING PROXY PARA REAGENDAMENTO */}
      {reschedulingAula && (
        <div 
          className="fixed z-[9999] pointer-events-none opacity-90 transition-transform duration-75"
          style={{ top: mousePos.y + 15, left: mousePos.x + 15 }}
        >
          <div className="bg-[#feccba] border-4 border-black p-3 shadow-[6px_6px_0_#000]">
             <p className="text-[10px] font-black uppercase tracking-wider text-[#ff6b00]">Movendo aula:</p>
             <p className="text-sm font-black uppercase text-black">{reschedulingAula.aluno_nome?.split(' ')[0]}</p>
             <p className="text-[9px] font-black mt-2 text-black/60 italic">Navegue pelas datas se desejar e clique num horário vazio para soltar</p>
             <p className="text-[9px] text-red-600 font-black mt-1">Aperte ESC para cancelar</p>
          </div>
        </div>
      )}


      {/* CANCEL MODAL */}
      {cancelModalAula && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-black p-6 w-full max-w-sm font-['Space_Mono'] shadow-[8px_8px_0_#000]">
            
            <h3 className="text-xl font-black uppercase text-black mb-4">Cancelar Aula?</h3>
            <p className="text-xs font-bold text-black mb-4 uppercase">
              Deseja apenas cancelar esta aula ou enviá-la para a fila de reposições do aluno?
            </p>
            <div className="mb-6">
              <label className="block text-[10px] font-black text-black uppercase mb-2">Motivo / Observação (Opcional se for Falta):</label>
              <textarea 
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex: Professor faltou, Atestado Médico..."
                className="w-full bg-[#f4f4f5] border-2 border-black p-3 text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-[#ff6b00]"
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  if (!motivoCancelamento.trim()) {
                    toast.error('Informe o motivo para enviar para reposição!');
                    return;
                  }

                  fetch(`/api/agenda/${cancelModalAula.id}/cancelar`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('acorde_token')}` },
                    body: JSON.stringify({ reposicao: true, motivo_cancelamento: motivoCancelamento })
                  }).then(() => {
                    toast.success('Aula enviada para a fila de reposição.');
                    fetchAulas();
                    setCancelModalAula(null); setMotivoCancelamento('');;
                  });
                }}
                className="w-full px-4 py-3 bg-green-500 text-black border-4 border-black font-black uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none hover:bg-green-400"
              >
                SIM (Mover para Reposição)
              </button>
              <button 
                onClick={() => {
                  fetch(`/api/agenda/${cancelModalAula.id}/cancelar`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('acorde_token')}` },
                    body: JSON.stringify({ reposicao: false })
                  }).then(() => {
                    toast.success('Aula cancelada (Registrada como Falta).');
                    fetchAulas();
                    setCancelModalAula(null); setMotivoCancelamento('');;
                  });
                }}
                className="w-full px-4 py-3 bg-red-500 text-white border-4 border-black font-black uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none hover:bg-red-400"
              >
                NÃO (Registrar como Falta)
              </button>
              <button 
                onClick={() => { setCancelModalAula(null); setMotivoCancelamento(''); }}
                className="w-full mt-4 text-[#8e7164] font-bold text-sm uppercase hover:text-white"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
