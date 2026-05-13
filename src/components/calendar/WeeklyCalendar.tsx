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
  rectIntersection,
  closestCorners,
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
const DIAS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export function WeeklyCalendar({ onSelectSlot, mode = 'view', selectedSlot }: WeeklyCalendarProps) {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Garantir que a agenda comece em 'Hoje' se não houver data selecionada
  useEffect(() => {
    setCurrentDate(new Date());
  }, []);
  const [agenda, setAgenda] = useState<any[]>([]);
  const [salas, setSalas] = useState<any[]>([]);
  const [professores, setProfessores] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'sala' | 'professor'>('professor');
  const [filterId, setFilterId] = useState<number | string>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [menuLessonId, setMenuLessonId] = useState<string | null>(null);
  const lastChangeRef = useRef<number>(0);
  const [currentStart, setCurrentStart] = useState('');
  const [currentEnd, setCurrentEnd] = useState('');
  const [dragConfirmation, setDragConfirmation] = useState<any>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

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

    setCurrentStart(startStr);
    setCurrentEnd(endStr);

    const [aData, sData, pData] = await Promise.all([
      fetch(`/api/agenda?start=${startStr}&end=${endStr}`).then(res => res.ok ? res.json() : []),
      fetch('/api/salas').then(res => res.ok ? res.json() : []),
      fetch('/api/professores').then(res => res.ok ? res.json() : []),
    ]);
    
    setAgenda(Array.isArray(aData) ? aData : []);
    setProfessores(Array.isArray(pData) ? pData.filter((p: any) => p.status === 'ativo') : []);
    setSalas(Array.isArray(sData) ? sData : []);
  };

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate, filterType]); // Recarregar sempre que mudar a data ou o tipo de visão

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: addDays(start, 5) });
  }, [currentDate]);

  const filteredAgenda = useMemo(() => {
    return agenda.filter(item => {
      if (filterId === 'all') return true;
      return filterType === 'sala' ? item.sala_id === Number(filterId) : item.professor_id === Number(filterId);
    });
  }, [agenda, filterType, filterId]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const dropData = (over.id as string).split('|');
    let newDate = '';
    let newTime = '';
    let bodyData: any = {};

    if (dropData[0] === 'prof') {
      // prof|profId|time
      const profId = dropData[1];
      newTime = dropData[2];
      newDate = format(currentDate, 'yyyy-MM-dd');
      bodyData = { data: newDate, horario: newTime, professor_id: Number(profId) };
    } else {
      // sala|dayIdx|time
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
    
    // Update local state first for instant feedback
    const updatedAgenda = agenda.map(item => {
      if (item.id === activeId) {
        return { ...item, ...bodyData };
      }
      return item;
    });
    setAgenda(updatedAgenda);
    setDragConfirmation(null);

    // Call API
    await fetch(`/api/agenda/${activeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });
    fetchCalendarData();
  };

  const handleDragOver = (event: any) => {
    const { over } = event;
    if (!over) return;
    
    const now = Date.now();
    if (now - lastChangeRef.current < 800) return; // 800ms throttle

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
    if (confirm('Deseja realmente cancelar este agendamento?')) {
      await fetch(`/api/agenda/${id}`, { method: 'DELETE' });
      fetchCalendarData();
    }
  };

  return (
    <div className="flex flex-col h-full glass-card overflow-hidden">
      {/* Header do Calendário */}
      <div className="p-2.5 border-b border-slate-200 bg-white/50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <NavButton 
              id="prev-day"
              onClick={() => setCurrentDate(filterType === 'professor' ? addDays(currentDate, -1) : subWeeks(currentDate, 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </NavButton>
            <div className="px-4 flex flex-col items-center justify-center min-w-[180px]">
              <span className="text-sm font-bold text-slate-700">
                {filterType === 'professor' 
                  ? format(currentDate, "EEEE, dd 'de' MMM", { locale: ptBR })
                  : `${format(weekDays[0], "dd 'de' MMM", { locale: ptBR })} - ${format(weekDays[5], "dd 'de' MMM", { locale: ptBR })}`
                }
              </span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                {agenda.length} aulas ({currentStart} até {currentEnd}) | {agenda.filter(a => String(a.data).substring(0, 10) === currentStart).length} hoje
              </span>
            </div>
            <NavButton 
              id="next-day"
              onClick={() => setCurrentDate(filterType === 'professor' ? addDays(currentDate, 1) : addWeeks(currentDate, 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </NavButton>
          </div>
          
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            Hoje
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button 
               onClick={() => setFilterType('professor')}
               className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${filterType === 'professor' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}
             >
               <Users className="w-3.5 h-3.5 inline mr-1" /> Visão Diária (Emusys)
             </button>
             <button 
               onClick={() => setFilterType('sala')}
               className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${filterType === 'sala' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}
             >
               <CalendarIcon className="w-3.5 h-3.5 inline mr-1" /> Semanal (Salas)
             </button>
          </div>
          
          {filterType === 'sala' && (
            <select 
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
              value={filterId}
              onChange={(e) => setFilterId(e.target.value)}
            >
              <option value="all">Todas as Salas</option>
              {salas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Grid do Calendário */}
      <DndContext 
        onDragStart={({active}) => setActiveId(active.id as string)} 
        onDragEnd={handleDragEnd} 
        onDragOver={handleDragOver}
        sensors={sensors}
        collisionDetection={pointerWithin}
      >
        <div className="flex-1 overflow-auto bg-slate-50/30 custom-scrollbar pb-[320px]">
          {filterType === 'professor' ? (
            <div className="min-w-max">
              {/* Cabeçalho de Horas */}
              <div className="flex sticky top-0 bg-slate-50 z-20 border-b border-slate-200">
                <div className="w-[120px] min-w-[120px] h-8 border-r border-slate-200 sticky left-0 bg-slate-50 z-30 flex items-center justify-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Professor</span>
                </div>
                {HORARIOS.map(time => (
                  <div key={time} className="flex-1 min-w-[60px] h-8 border-r border-slate-200 flex items-center justify-center">
                    <span className="text-[10px] font-black text-slate-500">{time}</span>
                  </div>
                ))}
              </div>
              {/* Linhas de Professores */}
              {professores.map(prof => (
                <div key={prof.id} className="flex">
                  <div className="w-[120px] min-w-[120px] h-[70px] border-b border-r border-slate-200 bg-white sticky left-0 z-40 flex items-center px-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <span className="text-[11px] font-black text-slate-700 leading-tight line-clamp-2" title={prof.nome}>{prof.nome}</span>
                  </div>
                  {HORARIOS.map(time => {
                    const dayStr = currentDate.getFullYear() + '-' + String(currentDate.getMonth() + 1).padStart(2, '0') + '-' + String(currentDate.getDate()).padStart(2, '0');
                    const lessons = agenda.filter(a => {
                      if (!a.data || !a.professor_id) return false;
                      const itemDate = String(a.data).substring(0, 10);
                      const matchesProf = String(a.professor_id) === String(prof.id);
                      const itemTime = String(a.horario || '').substring(0, 5);
                      return itemDate === dayStr && itemTime === time && matchesProf;
                    });
                    
                    return (
                      <div key={`${prof.id}-${time}`} className="flex-1 min-w-[60px] border-b border-r border-slate-200 relative">
                        <CalendarSlot 
                          id={`prof|${prof.id}|${time}:00`}
                          isOccupied={lessons.length > 0}
                          isSelected={selectedSlot?.data === dayStr && selectedSlot?.horario?.startsWith(time)}
                          onSelect={() => {
                            if (menuLessonId) setMenuLessonId(null);
                            else onSelectSlot?.(dayStr, `${time}:00`, undefined);
                          }}
                        >
                          {lessons.map(lesson => (
                            <DraggableLesson 
                              key={lesson.id} 
                              lesson={lesson} 
                              onCancel={() => handleCancel(lesson.id)}
                              isOpen={menuLessonId === lesson.id}
                              onOpenMenu={() => setMenuLessonId(lesson.id)}
                              onCloseMenu={() => setMenuLessonId(null)}
                              refresh={fetchCalendarData}
                            />
                          ))}
                        </CalendarSlot>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-[80px_repeat(6,1fr)] min-w-[800px]">
              {/* Linha de Cabeçalho (Dias) */}
              <div className="h-10 border-b border-r border-slate-200 sticky top-0 bg-slate-50 z-20"></div>
              {weekDays.map((day, i) => (
                <div key={i} className={`h-10 border-b border-r border-slate-200 sticky top-0 bg-slate-50 z-20 flex flex-col items-center justify-center ${isSameDay(day, new Date()) ? 'bg-primary/5' : ''}`}>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">{format(day, 'eee', { locale: ptBR })}</span>
                  <span className={`text-xs font-black leading-tight ${isSameDay(day, new Date()) ? 'text-primary' : 'text-slate-700'}`}>{format(day, 'dd')}</span>
                </div>
              ))}

              {/* Linhas de Horário */}
              {HORARIOS.map((time) => (
                <React.Fragment key={time}>
                  <div className="h-[60px] border-b border-r border-slate-200 flex items-center justify-center bg-white sticky left-0 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <span className="text-[10px] font-black text-slate-400">{time}</span>
                  </div>
                  {weekDays.map((day, i) => {
                    const dayStr = day.toISOString().split('T')[0];
                    const lessons = agenda.filter(a => {
                      if (!a.data) return false;
                      const itemDate = String(a.data).substring(0, 10);
                      const matchesProfessor = filterType === 'professor' ? (filterId === 'all' || String(a.professor_id) === String(filterId)) : true;
                      const matchesSala = filterType === 'sala' ? (filterId === 'all' || String(a.sala_id) === String(filterId)) : true;
                      const itemTime = String(a.horario || '').substring(0, 5);
                      return itemDate === dayStr && itemTime === time && matchesProfessor && matchesSala;
                    });
                    
                    return (
                      <CalendarSlot 
                        key={`${i}-${time}`} 
                        id={`sala|${i}|${time}:00`}
                        isOccupied={lessons.length > 0}
                        isSelected={selectedSlot?.data === dayStr && selectedSlot?.horario?.startsWith(time)}
                        onSelect={() => {
                          if (menuLessonId) setMenuLessonId(null);
                          else onSelectSlot?.(dayStr, `${time}:00`, filterId !== 'all' ? Number(filterId) : undefined);
                        }}
                      >
                        {lessons.map(lesson => (
                          <DraggableLesson 
                            key={lesson.id} 
                            lesson={lesson} 
                            onCancel={() => handleCancel(lesson.id)}
                            isOpen={menuLessonId === lesson.id}
                            onOpenMenu={() => setMenuLessonId(lesson.id)}
                            onCloseMenu={() => setMenuLessonId(null)}
                            refresh={fetchCalendarData}
                          />
                        ))}
                      </CalendarSlot>
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
             return (
               <div className={`p-2.5 rounded-xl text-[10px] font-bold border shadow-2xl bg-opacity-95 transition-none min-w-[120px] max-w-[160px] cursor-grabbing ${
                 lesson.type === 'experimental' 
                   ? 'bg-blue-600 text-white border-blue-400' 
                   : (lesson.status === 'realizada' || lesson.status === 'presente') 
                     ? 'bg-emerald-600 text-white border-emerald-400' 
                     : lesson.status === 'a_repor' 
                       ? 'bg-amber-500 text-white border-amber-400'
                       : lesson.status === 'falta_aluno'
                         ? 'bg-red-600 text-white border-red-400'
                         : 'bg-primary text-white border-orange-400'
               }`}>
                 <p className="line-clamp-1 uppercase tracking-tighter">{lesson.nome}</p>
                 <p className="opacity-80 font-medium text-[8px] mt-0.5 line-clamp-1">{lesson.curso_nome}</p>
                 <div className="flex justify-between items-end mt-2 opacity-60">
                   <span className="text-[7px]">{lesson.horario.substring(0, 5)}</span>
                   <span className="text-[7px] uppercase">{lesson.professor_nome?.split(' ')[0]}</span>
                 </div>
               </div>
             );
           })() : null}
        </DragOverlay>
      </DndContext>

      {dragConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-[90%] max-w-sm relative" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
               <CalendarIcon className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Mover Aula?</h3>
            <p className="text-sm font-medium text-slate-600 mb-8 leading-relaxed">
              Você está movendo esta aula para <strong>{format(parseISO(dragConfirmation.newDate), "dd/MM/yyyy")}</strong> às <strong>{dragConfirmation.newTime.substring(0, 5)}</strong>. Confirma a alteração?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDragConfirmation(null)}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDragDrop}
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/30 transition-all active:scale-95"
              >
                Sim, Mover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavButton({ id, onClick, children }: any) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <button 
      ref={setNodeRef}
      onClick={onClick}
      className={`p-2 rounded-lg transition-all ${isOver ? 'bg-primary text-white shadow-md' : 'hover:bg-white hover:shadow-sm'}`}
    >
      {children}
    </button>
  );
}

function CalendarSlot({ id, children, isOccupied, isSelected, onSelect }: any) {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef}
      onClick={onSelect}
       className={`min-h-[56px] border-b border-r border-slate-100 relative transition-all cursor-pointer p-0.5 flex flex-col gap-0.5 ${
         isOver ? 'bg-primary/5 ring-2 ring-primary ring-inset' : 
         isSelected ? 'bg-primary/10 ring-2 ring-primary inset-0 z-10 shadow-inner' :
         isOccupied ? 'bg-slate-50/50' : 'bg-white hover:bg-slate-50'
       }`}
     >
       {isOver && (
         <div className="absolute inset-0 bg-primary/5 flex items-center justify-center">
            <div className="w-[90%] h-[80%] border-2 border-primary/30 border-dashed rounded-xl" />
         </div>
       )}
       {children}
     </div>
  );
}

function DraggableLesson({ lesson, onCancel, isOpen, onOpenMenu, onCloseMenu, refresh }: any) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lesson.id,
    disabled: isOpen
  });
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [newDate, setNewDate] = useState(lesson.data);
  const [newTime, setNewTime] = useState(lesson.horario ? lesson.horario.substring(0, 5) : '00:00');

  const handleAttendance = async (status: string) => {
    await fetch(`/api/aulas/${lesson.originalId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, type: lesson.type })
    });
    refresh();
    onCloseMenu();
  };

  const handlePayment = async () => {
    await fetch(`/api/agenda/${lesson.originalId}/pagar`, { method: 'POST' });
    toast.success('Pagamento registrado com sucesso!');
    onCloseMenu();
  };

  const handleReschedule = async () => {
    await fetch(`/api/aulas/${lesson.originalId}/reschedule`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: newDate, horario: newTime })
    });
    setIsRescheduling(false);
    onCloseMenu();
    refresh();
  };

  // Com DragOverlay, não aplicamos transform no elemento original
  const style = undefined;

  return (
    <div className={`relative w-full ${isOpen ? 'z-50' : 'z-10'}`}>
      <div 
        ref={setNodeRef} 
        style={style}
        {...listeners} 
        {...attributes}
        onClick={(e) => { e.stopPropagation(); onOpenMenu(); }}
         className={`w-full p-2.5 rounded-xl text-xs font-bold border flex flex-col justify-between group transition-all cursor-pointer ${
           isDragging ? 'opacity-0' : 'opacity-100 shadow-sm hover:shadow-md'
         } ${
          lesson.type === 'experimental' 
            ? 'bg-blue-600 text-white border-blue-400' 
            : (lesson.status === 'realizada' || lesson.status === 'presente') 
              ? 'bg-emerald-600 text-white border-emerald-400' 
              : lesson.status === 'a_repor'
                ? 'bg-amber-500 text-white border-amber-400'
                : lesson.status === 'falta_aluno'
                  ? 'bg-red-600 text-white border-red-400'
                  : 'bg-primary text-white border-orange-400'
        }`}
      >
        <div>
          <div className="flex justify-between items-start">
            <p className="line-clamp-1 uppercase tracking-tighter font-black leading-tight">{lesson.nome}</p>
          </div>
          <p className="opacity-90 font-bold text-[10px] leading-tight mt-1 line-clamp-1">{lesson.curso_nome}</p>
        </div>
        <div className="flex justify-between items-end mt-2">
          <span className="bg-black/10 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest">{lesson.professor_nome?.split(' ')[0]}</span>
          {(lesson.status === 'realizada' || lesson.status === 'presente') && <Check className="w-2.5 h-2.5" />}
          {lesson.status === 'falta_aluno' && <X className="w-2.5 h-2.5" />}
          {lesson.status === 'a_repor' && <Clock className="w-2.5 h-2.5" />}
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); onCloseMenu(); }} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute left-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 border-b border-slate-50 mb-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Ações do Aluno</p>
                <p className="text-xs font-bold text-slate-900 truncate">{lesson.nome}</p>
              </div>
              
              <button 
                onClick={() => handleAttendance('realizada')}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all"
              >
                <Check className="w-4 h-4" /> Marcar Presença
              </button>

              <button 
                onClick={() => handleAttendance('falta_aluno')}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
              >
                <XCircle className="w-4 h-4" /> Marcar Falta
              </button>

              <button 
                onClick={() => handleAttendance('a_repor')}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-amber-50 hover:text-amber-600 rounded-xl transition-all"
              >
                <Clock className="w-4 h-4" /> Mover p/ Reposição
              </button>

              <button 
                onClick={handlePayment}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-amber-50 hover:text-amber-600 rounded-xl transition-all"
              >
                <DollarSign className="w-4 h-4" /> Registrar Pagamento
              </button>

              <button 
                onClick={() => {
                  if (lesson.type === 'regular') navigate(`/alunos/${lesson.aluno_id}`);
                  else navigate('/atendimento');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
              >
                <User className="w-4 h-4" /> Abrir Perfil
              </button>

              <button 
                onClick={() => setIsRescheduling(true)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all"
              >
                <Edit2 className="w-4 h-4" /> Reagendar
              </button>

              <div className="h-px bg-slate-50 my-1" />

              <button 
                onClick={() => { if(confirm('Excluir aula?')) onCancel(); onCloseMenu(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
              >
                <Trash2 className="w-4 h-4" /> Excluir Aula
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {isRescheduling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-80 relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black text-slate-900 mb-4">Reagendar Aula</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nova Data</label>
                <input 
                  type="date" 
                  value={newDate} 
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Novo Horário</label>
                <input 
                  type="time" 
                  value={newTime} 
                  onChange={e => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button 
                onClick={() => { setIsRescheduling(false); onCloseMenu(); }}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button 
                onClick={handleReschedule}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-dark"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
