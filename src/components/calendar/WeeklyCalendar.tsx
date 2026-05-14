import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Home, 
  Trash2,
  Calendar as CalendarIcon,
  Check,
  DollarSign,
  User,
  ExternalLink,
  MoreVertical,
  Edit2,
  X,
  XCircle,
  CheckCircle,
  Clock,
  Plus,
  ArrowRight
} from 'lucide-react';
import { 
  format, 
  addDays, 
  startOfWeek, 
  eachDayOfInterval, 
  addWeeks, 
  subWeeks, 
  parseISO,
  isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { 
  DndContext, 
  DragOverlay, 
  useDraggable, 
  useDroppable,
  DragEndEvent,
  PointerSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from '@dnd-kit/core';
import { restrictToWindowEdges, snapCenterToCursor } from '@dnd-kit/modifiers';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface WeeklyCalendarProps {
  onSelectSlot?: (data: string, horario: string, sala_id?: number) => void;
  mode?: 'view' | 'select';
  selectedSlot?: { data: string, horario: string, sala_id?: number };
}

const HORARIOS = Array.from({ length: 15 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

export function WeeklyCalendar({ onSelectSlot, selectedSlot }: WeeklyCalendarProps) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agenda, setAgenda] = useState<any[]>([]);
  const [salas, setSalas] = useState<any[]>([]);
  const [professores, setProfessores] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'sala' | 'professor'>('professor');
  const [filterId, setFilterId] = useState<number | string>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [menuLessonId, setMenuLessonId] = useState<string | null>(null);
  const lastChangeRef = useRef<number>(0);
  const [dragConfirmation, setDragConfirmation] = useState<any>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: addDays(start, 5) });
  }, [currentDate]);

  const fetchCalendarData = async () => {
    let startStr = '';
    let endStr = '';
    
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const d = date.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    if (filterType === 'professor') {
      startStr = formatDate(currentDate);
      endStr = startStr;
    } else {
      startStr = formatDate(weekDays[0]);
      endStr = formatDate(weekDays[5]);
    }

    const token = localStorage.getItem('acorde_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const [aData, sData, pData] = await Promise.all([
        fetch(`/api/agenda?start=${startStr}&end=${endStr}`, { headers }).then(res => res.ok ? res.json() : []),
        fetch('/api/salas', { headers }).then(res => res.ok ? res.json() : []),
        fetch('/api/professores', { headers }).then(res => res.ok ? res.json() : []),
      ]);
      
      setAgenda(Array.isArray(aData) ? aData : []);
      setProfessores(Array.isArray(pData) ? pData.filter((p: any) => p.status === 'ativo') : []);
      setSalas(Array.isArray(sData) ? sData : []);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate, filterType, filterId]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const dropData = (over.id as string).split('|');
    let newDate = '';
    let newTime = '';
    let bodyData: any = {};

    if (dropData[0] === 'prof') {
      const profId = dropData[1];
      newTime = dropData[2];
      newDate = format(currentDate, 'yyyy-MM-dd');
      bodyData = { data: newDate, horario: newTime, professor_id: Number(profId) };
    } else {
      const dayIdx = dropData[1];
      newTime = dropData[2];
      newDate = format(weekDays[Number(dayIdx)], 'yyyy-MM-dd');
      bodyData = { data: newDate, horario: newTime, sala_id: filterId !== 'all' ? Number(filterId) : undefined };
    }
    
    const lesson = agenda.find(a => a.id === active.id);
    if (lesson) {
        const currentDateStr = String(lesson.data).substring(0, 10);
        const currentTimeStr = String(lesson.horario).substring(0, 5);
        const isSameTime = currentDateStr === newDate && currentTimeStr === newTime.substring(0, 5);
        if (dropData[0] === 'prof' && isSameTime && lesson.professor_id === bodyData.professor_id) return;
        if (dropData[0] !== 'prof' && isSameTime && lesson.sala_id === bodyData.sala_id) return;
    }

    setDragConfirmation({
        activeId: active.id,
        bodyData,
        newDate,
        newTime
    });
  };

  const confirmDragDrop = async () => {
    if (!dragConfirmation) return;
    const { activeId, bodyData } = dragConfirmation;
    
    const token = localStorage.getItem('acorde_token');
    await fetch(`/api/agenda/${activeId}`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(bodyData)
    });
    setDragConfirmation(null);
    fetchCalendarData();
  };

  const handleDragOver = (event: any) => {
    const { over } = event;
    if (!over) return;
    const now = Date.now();
    if (now - lastChangeRef.current < 800) return;

    if (over.id === 'prev-day') {
      lastChangeRef.current = now;
      setCurrentDate(prev => filterType === 'professor' ? addDays(prev, -1) : subWeeks(prev, 1));
    }
    if (over.id === 'next-day') {
      lastChangeRef.current = now;
      setCurrentDate(prev => filterType === 'professor' ? addDays(prev, 1) : addWeeks(prev, 1));
    }
  };

  const handleCancel = async (id: string) => {
    const token = localStorage.getItem('acorde_token');
    await fetch(`/api/agenda/${id}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchCalendarData();
  };

  return (
    <div className="flex flex-col h-full bg-[#1a0f0a] border-4 border-black overflow-hidden shadow-[8px_8px_0_#000]">
      <div className="p-4 border-b-4 border-black bg-[#feccba] flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex bg-black/10 p-1 border-2 border-black shadow-[2px_2px_0_#000]">
            <NavButton id="prev-day" onClick={() => setCurrentDate(filterType === 'professor' ? addDays(currentDate, -1) : subWeeks(currentDate, 1))}>
              <ChevronLeft className="w-5 h-5 text-black" />
            </NavButton>
            <div className="px-6 flex flex-col items-center justify-center min-w-[200px]">
              <span className="text-xs font-black text-black uppercase italic italic tracking-tighter">
                {filterType === 'professor' 
                  ? format(currentDate, "EEEE, dd 'de' MMM", { locale: ptBR })
                  : `${format(weekDays[0], "dd 'de' MMM", { locale: ptBR })} - ${format(weekDays[5], "dd 'de' MMM", { locale: ptBR })}`
                }
              </span>
            </div>
            <NavButton id="next-day" onClick={() => setCurrentDate(filterType === 'professor' ? addDays(currentDate, 1) : addWeeks(currentDate, 1))}>
              <ChevronRight className="w-5 h-5 text-black" />
            </NavButton>
          </div>
          <button onClick={() => setCurrentDate(new Date())} className="px-5 py-2.5 bg-black text-white border-2 border-white text-[10px] font-black uppercase italic italic shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all">
            HOJE
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-black/5 p-1 border-2 border-black shadow-[2px_2px_0_#000]">
             <button onClick={() => setFilterType('professor')} className={`px-4 py-2 text-[10px] font-black uppercase transition-all ${filterType === 'professor' ? 'bg-[#ff6b00] text-white shadow-inner' : 'text-[#8e7164]'}`}>
               <Users className="w-4 h-4 inline mr-2" /> PROF
             </button>
             <button onClick={() => setFilterType('sala')} className={`px-4 py-2 text-[10px] font-black uppercase transition-all ${filterType === 'sala' ? 'bg-[#ff6b00] text-white shadow-inner' : 'text-[#8e7164]'}`}>
               <CalendarIcon className="w-4 h-4 inline mr-2" /> SALAS
             </button>
          </div>
          {filterType === 'sala' && (
            <select className="px-4 py-2 bg-white border-4 border-black text-[10px] font-black uppercase italic italic focus:ring-0 outline-none shadow-[4px_4px_0_#000]" value={filterId} onChange={(e) => setFilterId(e.target.value)}>
              <option value="all">TODAS</option>
              {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          )}
        </div>
      </div>

      <DndContext onDragStart={({active}) => setActiveId(active.id as string)} onDragEnd={handleDragEnd} onDragOver={handleDragOver} sensors={sensors} collisionDetection={pointerWithin}>
        <div className="flex-1 overflow-auto bg-[#fff8f6] custom-scrollbar pb-32">
          {filterType === 'professor' ? (
            <div className="min-w-max">
              <div className="flex sticky top-0 bg-[#feccba] z-20 border-b-4 border-black">
                <div className="w-[140px] min-w-[140px] h-10 border-r-4 border-black sticky left-0 bg-[#feccba] z-30 flex items-center justify-center">
                  <span className="text-[9px] font-black text-black uppercase tracking-widest italic italic">PROFESSORES</span>
                </div>
                {HORARIOS.map(time => (<div key={time} className="flex-1 min-w-[70px] h-10 border-r-2 border-black/10 flex items-center justify-center"><span className="text-[10px] font-black text-black">{time}</span></div>))}
              </div>
              {professores.map(prof => (
                <div key={prof.id} className="flex border-b-2 border-black/5 last:border-b-0">
                  <div className="w-[140px] min-w-[140px] h-20 border-r-4 border-black bg-[#ffeae1] sticky left-0 z-10 flex items-center px-4 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)]"><span className="text-[10px] font-black text-black leading-tight uppercase italic italic">{prof.nome}</span></div>
                  {HORARIOS.map(time => {
                    const dayStr = format(currentDate, 'yyyy-MM-dd');
                    const lessons = agenda.filter(a => String(a.data).substring(0, 10) === dayStr && String(a.horario || '').substring(0, 5) === time && String(a.professor_id) === String(prof.id));
                    return (
                      <div key={`${prof.id}-${time}`} className="flex-1 min-w-[70px] border-r-2 border-black/5 relative">
                        <CalendarSlot id={`prof|${prof.id}|${time}:00`} isOccupied={lessons.length > 0} isSelected={selectedSlot?.data === dayStr && selectedSlot?.horario?.startsWith(time)} onSelect={() => onSelectSlot?.(dayStr, `${time}:00`)}>
                          {lessons.map(lesson => <DraggableLesson key={lesson.id} lesson={lesson} onCancel={() => handleCancel(lesson.id)} isOpen={menuLessonId === lesson.id} onOpenMenu={() => setMenuLessonId(lesson.id)} onCloseMenu={() => setMenuLessonId(null)} refresh={fetchCalendarData} />)}
                        </CalendarSlot>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-[100px_repeat(6,1fr)] min-w-[900px]">
              <div className="h-12 border-b-4 border-r-4 border-black sticky top-0 bg-[#feccba] z-20"></div>
              {weekDays.map((day, i) => (
                <div key={i} className={`h-12 border-b-4 border-r-2 border-black/10 sticky top-0 bg-[#feccba] z-20 flex flex-col items-center justify-center ${isSameDay(day, new Date()) ? 'bg-[#ff6b00]/10' : ''}`}>
                  <span className="text-[9px] font-black text-black uppercase tracking-widest italic italic">{format(day, 'eee', { locale: ptBR })}</span>
                  <span className="text-sm font-black">{format(day, 'dd')}</span>
                </div>
              ))}
              {HORARIOS.map((time) => (
                <React.Fragment key={time}>
                  <div className="h-[70px] border-b-2 border-r-4 border-black flex items-center justify-center bg-[#ffeae1] sticky left-0 z-10"><span className="text-[10px] font-black text-black">{time}</span></div>
                  {weekDays.map((day, i) => {
                    const dayStr = day.toISOString().split('T')[0];
                    const lessons = agenda.filter(a => String(a.data).substring(0, 10) === dayStr && String(a.horario || '').substring(0, 5) === time && (filterId === 'all' || String(a.sala_id) === String(filterId)));
                    return (
                      <div key={`${i}-${time}`} className="border-b-2 border-r-2 border-black/5">
                        <CalendarSlot key={`${i}-${time}`} id={`sala|${i}|${time}:00`} isOccupied={lessons.length > 0} isSelected={selectedSlot?.data === dayStr && selectedSlot?.horario?.startsWith(time)} onSelect={() => onSelectSlot?.(dayStr, `${time}:00`, filterId !== 'all' ? Number(filterId) : undefined)}>
                          {lessons.map(lesson => <DraggableLesson key={lesson.id} lesson={lesson} onCancel={() => handleCancel(lesson.id)} isOpen={menuLessonId === lesson.id} onOpenMenu={() => setMenuLessonId(lesson.id)} onCloseMenu={() => setMenuLessonId(null)} refresh={fetchCalendarData} />)}
                        </CalendarSlot>
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
        <DragOverlay modifiers={[snapCenterToCursor, restrictToWindowEdges]} dropAnimation={null}>
           {activeId ? (() => {
             const lesson = agenda.find(a => a.id === activeId);
             if (!lesson) return null;
             return <div className="p-3 border-4 border-black text-[9px] font-black uppercase italic italic bg-[#ff6b00] text-white shadow-[8px_8px_0_#000] scale-110 cursor-grabbing"><p>{lesson.nome}</p></div>;
           })() : null}
        </DragOverlay>
      </DndContext>

      {dragConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#fff8f6] border-8 border-black p-8 shadow-[12px_12px_0_#000] w-full max-w-sm relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-black mb-2 uppercase italic italic tracking-tighter">ALTERAR_SESSÃO?</h3>
            <p className="text-xs font-black text-[#8e7164] mb-8 uppercase leading-relaxed">
              MOVER_AULA_PARA: <br/>
              <span className="text-black">{format(parseISO(dragConfirmation.newDate), "dd/MM/yyyy")}</span> ÀS <span className="text-black">{dragConfirmation.newTime.substring(0, 5)}</span>.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setDragConfirmation(null)} className="flex-1 py-4 border-4 border-black text-[10px] font-black uppercase bg-white hover:bg-black/5 transition-all shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none">CANCELAR</button>
              <button onClick={confirmDragDrop} className="flex-1 py-4 border-4 border-black text-[10px] font-black uppercase bg-[#ff6b00] text-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all">CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({ id, onClick, children }: any) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <button ref={setNodeRef} onClick={onClick} className={`p-2 transition-all ${isOver ? 'bg-[#ff6b00] shadow-inner' : 'hover:bg-black/10'}`}>{children}</button>;
}

function CalendarSlot({ id, children, isOccupied, isSelected, onSelect }: any) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return <div ref={setNodeRef} onClick={onSelect} className={`min-h-[64px] relative transition-all cursor-pointer p-1 ${isOver ? 'bg-[#ff6b00]/20' : isSelected ? 'bg-[#ff6b00]/10' : isOccupied ? 'bg-black/5' : ''}`}>{children}</div>;
}

function DraggableLesson({ lesson, onCancel, isOpen, onOpenMenu, onCloseMenu, refresh }: any) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef } = useDraggable({ id: lesson.id, disabled: isOpen });
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(lesson.data);
  const [newTime, setNewTime] = useState(lesson.horario ? lesson.horario.substring(0, 5) : '00:00');

  const handleAttendance = async (status: string) => {
    const token = localStorage.getItem('acorde_token');
    await fetch(`/api/aulas/${lesson.originalId}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status, type: lesson.type })
    });
    refresh();
    onCloseMenu();
  };

  const handlePayment = async () => {
    const token = localStorage.getItem('acorde_token');
    await fetch(`/api/agenda/${lesson.originalId}/pagar`, { 
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    toast.success('PAGAMENTO_CONFIRMADO!');
    onCloseMenu();
  };

  const handleReschedule = async () => {
    const token = localStorage.getItem('acorde_token');
    await fetch(`/api/aulas/${lesson.originalId}/reschedule`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ data: newDate, horario: newTime })
    });
    setIsRescheduling(false);
    onCloseMenu();
    refresh();
  };

  return (
    <div className={`relative w-full ${isOpen ? 'z-[60]' : 'z-10'}`}>
      <div 
        ref={setNodeRef} 
        {...listeners} 
        {...attributes}
        onClick={(e) => { e.stopPropagation(); onOpenMenu(); }} 
        className="w-full p-2 border-2 border-black bg-[#ff6b00] text-white text-[8px] font-black uppercase truncate italic italic cursor-pointer shadow-[2px_2px_0_#000]"
      >
        {lesson.nome}
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-50 bg-black/10" onClick={(e) => { e.stopPropagation(); onCloseMenu(); }} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute z-[60] bg-[#fff8f6] border-4 border-black p-1 mt-2 w-56 shadow-[6px_6px_0_#000]" onClick={e => e.stopPropagation()}>
              <div className="p-3 border-b-2 border-black/10 mb-1 bg-[#feccba]">
                <p className="text-[10px] font-black text-black truncate uppercase italic italic">{lesson.nome}</p>
              </div>
              <MenuAction icon={Check} label="MARCAR_PRESENÇA" onClick={() => handleAttendance('realizada')} color="hover:bg-[#25d366] hover:text-white" />
              <MenuAction icon={XCircle} label="MARCAR_FALTA" onClick={() => handleAttendance('falta_aluno')} color="hover:bg-[#ff4444] hover:text-white" />
              <MenuAction icon={Clock} label="MOVER_P/_REPOSIÇÃO" onClick={() => handleAttendance('a_repor')} color="hover:bg-[#ffcc00] hover:text-black" />
              <MenuAction icon={DollarSign} label="REGISTRAR_PAGTO" onClick={handlePayment} color="hover:bg-[#25d366] hover:text-white" />
              <MenuAction icon={User} label="ABRIR_PERFIL" onClick={() => { if (lesson.type === 'regular') navigate(`/alunos/${lesson.aluno_id}`); else navigate('/atendimento'); }} color="hover:bg-black hover:text-white" />
              <MenuAction icon={Edit2} label="REAGENDAR" onClick={() => setIsRescheduling(true)} color="hover:bg-[#ff6b00] hover:text-white" />
              <div className="h-0.5 bg-black/10 my-0.5" />
              <MenuAction icon={Trash2} label="EXCLUIR" onClick={() => { if(confirm('Excluir?')) onCancel(); onCloseMenu(); }} color="hover:bg-red-600 hover:text-white" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {isRescheduling && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#fff8f6] border-8 border-black p-8 shadow-[12px_12px_0_#000] w-full max-w-sm relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-black mb-6 uppercase italic italic tracking-tighter">REAGENDAR_SESSÃO</h3>
            <div className="space-y-6">
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic italic outline-none" />
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic italic outline-none" />
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setIsRescheduling(false)} className="flex-1 py-4 border-4 border-black text-[10px] font-black uppercase bg-white shadow-[4px_4px_0_#000]">CANCELAR</button>
              <button onClick={handleReschedule} className="flex-1 py-4 border-4 border-black text-[10px] font-black uppercase bg-[#ff6b00] text-white shadow-[4px_4px_0_#000]">SALVAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuAction({ icon: Icon, label, onClick, color }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 text-[9px] font-black uppercase tracking-widest transition-all ${color}`}>
      <Icon className="w-4 h-4" /> {label}
    </button>
  );
}
