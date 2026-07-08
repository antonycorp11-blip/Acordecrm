import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Plus, 
  MessageCircle, 
  Phone, 
  Calendar, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Music, 
  Filter, 
  Users, 
  ChevronRight, 
  MoreVertical, 
  X, 
  Check,
  Save,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { WeeklyCalendar } from '../components/calendar/WeeklyCalendar';
import { DndContext, useSensor, useSensors, PointerSensor, TouchSensor } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';

// Componente de coluna droppable do Kanban
function DroppableColumn({ id, title, leads, children }: any) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef} 
      className="flex-1 min-w-[270px] bg-[#261812]/20 border-4 border-black p-4 shadow-[4px_4px_0_#000] flex flex-col gap-4 min-h-[500px]"
    >
      <div className="flex items-center justify-between border-b-2 border-black pb-2 px-1">
        <h3 className="text-[10px] font-black text-white uppercase tracking-widest italic">{title}</h3>
        <span className="bg-[#ff6b00] text-white text-[9px] px-2 py-0.5 border-2 border-black font-black shadow-[2px_2px_0_#000]">
          {leads.length}
        </span>
      </div>
      <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[60vh] custom-scrollbar pr-1">
        {children}
        {leads.length === 0 && (
          <div className="flex-1 border-4 border-dashed border-white/5 p-8 flex items-center justify-center min-h-[150px]">
            <p className="text-[8px] font-black text-white/10 uppercase">Arraste Leads aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente de card draggable do Kanban
function DraggableCard({ lead, cursos, onEdit, onMove, onAgendarExp }: any) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(lead.id)
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.3 : 1,
    cursor: 'grab'
  };

  const phoneClean = (lead.telefone || '').replace(/\D/g, '');
  const courseName = cursos.find((c: any) => c.id === lead.interesse_curso_id)?.nome || 'CURSO INDEFINIDO';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-[#fff8f6] border-4 border-black p-4 shadow-[4px_4px_0_#000] relative flex flex-col gap-2 group hover:translate-y-[-2px] transition-all duration-150"
    >
      {/* Botão de arrastar (drag handle) para desktop */}
      <div 
        {...listeners} 
        {...attributes}
        className="absolute top-2 right-2 text-black/30 hover:text-black cursor-grab active:cursor-grabbing hidden md:block"
        title="Arraste para mover"
      >
        <MoreVertical className="w-4 h-4" />
      </div>

      <div className="flex justify-between items-start pr-6">
        <span className="text-[7px] font-black bg-[#feccba] text-black px-1.5 py-0.5 border border-black uppercase tracking-tighter">
          {courseName}
        </span>
      </div>

      <h4 className="font-black text-black uppercase italic text-xs leading-tight">
        {lead.nome || <span className="italic opacity-50 font-normal lowercase">sem nome</span>}
      </h4>

      <p className="text-[9px] font-black text-[#8e7164] flex items-center gap-1 uppercase">
        <Phone className="w-3 h-3 text-[#ff6b00]" /> {lead.telefone}
      </p>

      {lead.observacoes && (
        <p className="text-[8px] font-bold text-black/60 bg-black/5 p-1.5 border border-black/10 line-clamp-2 uppercase">
          {lead.observacoes}
        </p>
      )}

      {/* Ações do Card */}
      <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5">
          {/* WhatsApp */}
          {phoneClean && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const msg = `Olá! Tudo bem? Entramos em contato a partir do Studio Acorde. 😊`;
                window.open(`https://api.whatsapp.com/send?phone=55${phoneClean}&text=${encodeURIComponent(msg)}`, '_blank');
              }}
              title="Chamar no WhatsApp"
              className="bg-[#25d366] text-black p-1 border border-black shadow-[1.5px_1.5px_0_#000] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
          )}
          
          {/* Agendar Experimental (se não for matriculado) */}
          {lead.status !== 'matriculado' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAgendarExp(lead);
              }}
              title="Agendar Experimental"
              className="bg-[#ff6b00] text-white p-1 border border-black shadow-[1.5px_1.5px_0_#000] active:translate-y-0.5 active:shadow-none hover:bg-[#ff8c33] transition-all flex items-center justify-center cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Mudar de status pelo Mobile ou cliques */}
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          {/* Select de status rápido */}
          <select
            value={lead.status || 'iniciado'}
            onChange={(e) => {
              e.stopPropagation();
              onMove(lead.id, e.target.value);
            }}
            className="text-[8px] font-black uppercase bg-white border border-black p-0.5 focus:outline-none cursor-pointer"
          >
            <option value="iniciado">Iniciado</option>
            <option value="em_atendimento">Em Atend.</option>
            <option value="nao_responde">Não Resp.</option>
            <option value="sem_interesse">Sem Inter.</option>
            <option value="aula_marcada">Aula Marc.</option>
            <option value="matriculado">Matriculado</option>
            <option value="finalizado">Encerrado</option>
          </select>

          {/* Editar anotações */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(lead);
            }}
            className="bg-black text-white px-1.5 py-0.5 border border-black text-[8px] font-black uppercase shadow-[1.5px_1.5px_0_#000] cursor-pointer"
          >
            Anotar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Atendimento() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leads' | 'experimentais' | 'vagas'>('leads');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  
  const [cursos, setCursos] = useState<any[]>([]);
  const [professores, setProfessores] = useState<any[]>([]);

  // Estados para Edição de Leads
  const [editingLead, setEditingLead] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nome: '',
    telefone: '',
    interesse_curso_id: '',
    status: '',
    observacoes: ''
  });

  // Sensores para Drag & Drop (com distância limite para não bugar cliques de botões)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Estado para Busca de Vagas
  const [searchInstrumento, setSearchInstrumento] = useState('');
  const [searchDia, setSearchDia] = useState('');
  const [vagasResult, setVagasResult] = useState<any[]>([]);
  const [searchingVagas, setSearchingVagas] = useState(false);
  const [experimentaisPendentes, setExperimentaisPendentes] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    interesse_curso_id: '',
    status: 'iniciado',
    observacoes: ''
  });

  const [expData, setExpData] = useState({
    lead_id: '',
    professor_id: '',
    curso_id: '',
    data: '',
    horario: '',
    sala_id: undefined as number | undefined
  });

  const fetchLeads = () => {
    const token = localStorage.getItem('acorde_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    setLoading(true);
    fetch('/api/leads', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setLeads(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setLeads([]);
        setLoading(false);
      });

    fetch('/api/leads/experimentais-pendentes', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => setExperimentaisPendentes(Array.isArray(data) ? data : []))
      .catch(() => setExperimentaisPendentes([]));
  };

  useEffect(() => {
    const token = localStorage.getItem('acorde_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    fetchLeads();
    fetch('/api/cursos', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => setCursos(Array.isArray(data) ? data : []))
      .catch(() => setCursos([]));
      
    fetch('/api/professores', { headers })
      .then(res => res.ok ? res.json() : [])
      .then(data => setProfessores(Array.isArray(data) ? data : []))
      .catch(() => setProfessores([]));

    // Disparo da verificação de follow-up em background ao abrir o CRM
    fetch('/api/leads/verificar-followup', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data && data.count > 0) {
          toast.info(`Follow-up por e-mail disparado para ${data.count} leads pendentes!`);
        }
      })
      .catch(err => console.error("Erro ao verificar follow-up:", err));
  }, []);

  const sendReminder = (exp: any) => {
    const dataFormatted = new Date(exp.data + 'T12:00:00').toLocaleDateString('pt-BR');
    const horario = exp.horario ? exp.horario.substring(0, 5) : '--:--';
    const msg = `Olá ${exp.leads?.nome}! 🎸 Passando para confirmar nossa aula experimental de ${exp.cursos?.nome || 'música'} hoje às ${horario} com o Prof. ${exp.professores?.nome}? Estamos te esperando aqui na Acorde! 😊`;
    const phone = exp.leads?.telefone?.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSearchVagas = async (inst: string, dia: string) => {
    if (!inst || !dia) return;
    setSearchingVagas(true);
    
    // Mapeamento de nomes para busca
    const searchTerms: { [key: string]: string } = {
      'Canto': 'Vocal',
      'Guitarra': 'Guitarra',
      'Bateria': 'Bateria',
      'Piano': 'Piano',
      'Violão': 'Violão',
      'Teclado': 'Teclado'
    };

    const term = searchTerms[inst] || inst;

    try {
      const token = localStorage.getItem('acorde_token');
      const res = await fetch(`/api/vagas?instrumento=${term}&dia_semana=${dia}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setVagasResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingVagas(false);
    }
  };

  const generateText = () => {
    const dia = searchDia.charAt(0).toUpperCase() + searchDia.slice(1);
    const inst = searchInstrumento.charAt(0).toUpperCase() + searchInstrumento.slice(1);
    
    let text = `*ACORDE - Escola de Música* 🎸\n\n`;
    text += `Olá! Tudo bem? Conforme conversamos, seguem os horários disponíveis para aula de *${inst}* nesta *${dia}*:\n\n`;

    if (vagasResult.length === 0) {
      text += "Infelizmente não temos vagas disponíveis para este critério no momento. 😔";
    } else {
      vagasResult.forEach(item => {
        text += `*Prof. ${item.professor}* (${dia})\n`;
        text += `🕒 ${item.vagas.join(' | ')}\n\n`;
      });

      text += `Qual desses horários melhor se encaixa para você? Se quiser garantir a vaga, é só me avisar por aqui! 😊`;
    }
    
    return text;
  };

  const copyToWhatsApp = () => {
    const text = generateText();
    navigator.clipboard.writeText(text);
    toast.success('Texto formatado copiado com sucesso!');
  };

  const handleCreateLead = async (e: React.FormEvent) => {
    const token = localStorage.getItem('acorde_token');
    e.preventDefault();
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      setIsModalOpen(false);
      fetchLeads();
      setFormData({ nome: '', telefone: '', interesse_curso_id: '', status: 'iniciado', observacoes: '' });
    }
  };

  const handleScheduleExp = async (e: React.FormEvent) => {
    const token = localStorage.getItem('acorde_token');
    e.preventDefault();
    const res = await fetch('/api/leads/experimental', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(expData),
    });
    if (res.ok) {
      setIsExpModalOpen(false);
      fetchLeads();
    }
  };

  const updateLeadStatus = async (leadId: any, newStatus: string) => {
    const token = localStorage.getItem('acorde_token');
    try {
      const res = await fetch(`/api/leads/${leadId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setLeads(prev => prev.map(l => l.id === Number(leadId) || l.id === leadId ? { ...l, ...updated } : l));
        toast.success("Status do lead atualizado!");
      } else {
        toast.error("Erro ao atualizar status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro na comunicação com o servidor");
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over) {
      const leadId = active.id;
      const newStatus = over.id;
      updateLeadStatus(leadId, newStatus);
    }
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('acorde_token');
    try {
      const res = await fetch(`/api/leads/${editingLead.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        fetchLeads();
        toast.success("Anotações e dados do lead salvos!");
      } else {
        toast.error("Erro ao atualizar lead");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão");
    }
  };

  const openEditModal = (lead: any) => {
    setEditingLead(lead);
    setEditFormData({
      nome: lead.nome || '',
      telefone: lead.telefone || '',
      interesse_curso_id: lead.interesse_curso_id || '',
      status: lead.status || 'iniciado',
      observacoes: lead.observacoes || ''
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="flex flex-col flex-1 animate-in fade-in duration-500 overflow-hidden h-screen bg-[#1a0f0a]">
      <header className="h-24 px-8 bg-[#feccba] border-b-4 border-black flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-black uppercase italic italic tracking-tighter">Atendimento & CRM</h1>
          <p className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest">Transforme interessados em alunos matriculados.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#ff6b00] text-white px-6 py-3 border-4 border-black font-black uppercase text-xs shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> NOVO_LEAD
          </button>
        </div>
      </header>

      <div className="p-8 space-y-6 flex-1 overflow-auto">
        <div className="flex items-center gap-6 border-b-4 border-black/20">
           <button 
             onClick={() => setActiveTab('leads')}
             className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative ${
               activeTab === 'leads' ? 'text-[#ff6b00]' : 'text-[#8e7164] hover:text-white'
             }`}
           >
             LEADS_INTERESSADOS
             {activeTab === 'leads' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#ff6b00]" />}
           </button>
           <button 
             onClick={() => setActiveTab('vagas')}
             className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative ${
               activeTab === 'vagas' ? 'text-[#ff6b00]' : 'text-[#8e7164] hover:text-white'
             }`}
           >
             BUSCA_DE_VAGAS
             {activeTab === 'vagas' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#ff6b00]" />}
           </button>
           <button 
             onClick={() => setActiveTab('experimentais')}
             className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative ${
               activeTab === 'experimentais' ? 'text-[#ff6b00]' : 'text-[#8e7164] hover:text-white'
             }`}
           >
             CALENDÁRIO_EXP
             {activeTab === 'experimentais' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#ff6b00]" />}
           </button>
        </div>

        {activeTab === 'leads' && (
          <div className="space-y-6 flex flex-col flex-1 overflow-hidden">
            {/* Seção de Lembretes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
              {experimentaisPendentes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2 px-2">
                    <Clock className="w-3 h-3 text-[#ff6b00]" /> CONFIRMAR_HOJE
                  </h3>
                  <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                    {experimentaisPendentes.map((exp) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={exp.id}
                        className="bg-[#fff8f6] border-4 border-black p-4 flex items-center justify-between gap-4 shadow-[4px_4px_0_#000]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center font-black text-[#ff6b00] text-xs shadow-[2px_2px_0_#000]">
                            {exp.horario ? exp.horario.substring(0, 5) : '--:--'}
                          </div>
                          <div>
                            <p className="text-xs font-black text-black uppercase italic">{exp.leads?.nome || 'Sem Nome'}</p>
                            <p className="text-[8px] font-black text-[#8e7164] uppercase">{exp.cursos?.nome} • PROF. {exp.professores?.nome?.split(' ')[0]}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => sendReminder(exp)}
                          className="bg-[#25d366] text-black p-2 border-2 border-black shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2 px-2">
                  <Users className="w-3 h-3 text-[#ff6b00]" /> PÓS-AULA: AGUARDANDO_MATRÍCULA
                </h3>
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                  {leads.filter(l => l.status === 'aula_marcada' && l.aulas_experimentais?.some((ae: any) => ae.status === 'concluida')).length > 0 ? (
                    leads.filter(l => l.status === 'aula_marcada' && l.aulas_experimentais?.some((ae: any) => ae.status === 'concluida')).map((lead) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={lead.id}
                        className="bg-[#ffeae1] border-4 border-black p-4 flex items-center justify-between gap-4 shadow-[4px_4px_0_#000]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center font-black text-[#ff6b00] text-xs shadow-[2px_2px_0_#000]">
                            <Check className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-black uppercase italic">{lead.nome || 'Sem Nome'}</p>
                            <p className="text-[8px] font-black text-[#8e7164] uppercase">AULA CONCLUÍDA • {lead.cursos?.nome || 'Música'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const msg = `Olá ${lead.nome || 'tudo bem'}! Gostamos muito de ter você aqui na Acorde! 😊 O que achou da aula? Vamos dar o próximo passo e garantir sua vaga na turma?`;
                            const phone = (lead.telefone || '').replace(/\D/g, '');
                            window.open(`https://api.whatsapp.com/send?phone=55${phone}&text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                          className="bg-[#ff6b00] text-white p-2 border-2 border-black shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-6 border-4 border-dashed border-white/10 text-center flex items-center justify-center h-[90px]">
                      <p className="text-[9px] font-black text-white/20 uppercase">NENHUM_LEAD_EM_PÓS-VENDA</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Kanban Board com DndContext */}
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="flex gap-6 overflow-x-auto pb-6 pt-2 custom-scrollbar min-h-[500px] flex-1 max-w-full items-start">
                {[
                  { id: 'iniciado', title: 'Iniciado' },
                  { id: 'em_atendimento', title: 'Em Atendimento' },
                  { id: 'nao_responde', title: 'Não Responde' },
                  { id: 'aula_marcada', title: 'Aula Marcada' },
                  { id: 'sem_interesse', title: 'Não Tem Interesse' },
                  { id: 'matriculado', title: 'Matriculado' },
                  { id: 'finalizado', title: 'Finalizado' },
                ].map((col) => {
                  const colLeads = leads.filter((l) => l.status === col.id || (!l.status && col.id === 'iniciado'));
                  
                  return (
                    <DroppableColumn key={col.id} id={col.id} title={col.title} leads={colLeads}>
                      {colLeads.map((lead) => (
                        <DraggableCard
                          key={lead.id}
                          lead={lead}
                          cursos={cursos}
                          onEdit={openEditModal}
                          onMove={updateLeadStatus}
                          onAgendarExp={(l: any) => {
                            setSelectedLead(l);
                            setExpData({ ...expData, lead_id: l.id, curso_id: l.interesse_curso_id });
                            setIsExpModalOpen(true);
                          }}
                        />
                      ))}
                    </DroppableColumn>
                  );
                })}
              </div>
            </DndContext>
          </div>
        )}

        {activeTab === 'vagas' && (
          <div className="space-y-4">
                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                   <Music className="w-3 h-3 text-[#ff6b00]" /> 1. Escolha o Instrumento
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                   {cursos
                     .filter(c => !c.nome.includes('Black') && !c.nome.includes('Laranja') && !c.nome.includes('White'))
                     .map(c => c.nome)
                     .filter((v, i, a) => a.indexOf(v) === i)
                     .map(inst => (
                     <button
                       key={inst}
                       onClick={() => { setSearchInstrumento(inst); if(searchDia) handleSearchVagas(inst, searchDia); }}
                       className={`p-4 border-4 transition-all flex flex-col items-center gap-2 ${
                         searchInstrumento === inst 
                           ? 'bg-[#ff6b00] border-black shadow-[4px_4px_0_#000] translate-x-[-2px] translate-y-[-2px]' 
                           : 'bg-[#fff8f6] border-black shadow-[4px_4px_0_#000] hover:translate-y-[-2px]'
                       }`}
                     >
                       <div className={`w-10 h-10 border-2 border-black flex items-center justify-center ${searchInstrumento === inst ? 'bg-white/20' : 'bg-white shadow-[2px_2px_0_#000]'}`}>
                         <Music className={`w-5 h-5 ${searchInstrumento === inst ? 'text-white' : 'text-black'}`} />
                       </div>
                       <span className={`text-[10px] font-black text-center line-clamp-1 uppercase italic italic ${searchInstrumento === inst ? 'text-white' : 'text-black'}`} title={inst}>{inst}</span>
                     </button>
                   ))}
                </div>
                <div className="space-y-4">
                <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                   <Calendar className="w-3 h-3 text-[#ff6b00]" /> 2. ESCOLHA_O_DIA_DA_SEMANA
                </h3>
                <div className="flex flex-wrap gap-3">
                   {['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].map(dia => (
                     <button
                       key={dia}
                       onClick={() => { setSearchDia(dia); if(searchInstrumento) handleSearchVagas(searchInstrumento, dia); }}
                       className={`px-6 py-3 border-4 font-black text-[10px] uppercase transition-all shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none ${
                         searchDia === dia 
                           ? 'bg-[#ff6b00] border-black text-white' 
                           : 'bg-white border-black text-black'
                       }`}
                     >
                       {dia}
                     </button>
                   ))}
                </div>
              </div>

             {searchInstrumento && searchDia && (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="bg-[#fff8f6] border-4 border-black p-8 relative overflow-hidden shadow-[8px_8px_0_#000]"
               >
                  <div className="absolute top-0 right-0 p-4">
                     <div className="bg-[#ff6b00] text-white px-3 py-1 border-2 border-black text-[8px] font-black uppercase tracking-widest animate-pulse">
                        SINC_EMUSYS
                     </div>
                  </div>

                  <h4 className="text-lg font-black text-black uppercase italic italic mb-6 flex items-center gap-2">
                    <CheckCircle2 className="text-[#ff6b00]" /> VAGAS_ENCONTRADAS
                  </h4>

                  {searchingVagas ? (
                    <div className="py-12 text-center text-[#8e7164] font-black uppercase text-xs">BUSCANDO_HORÁRIOS...</div>
                  ) : vagasResult.length === 0 ? (
                    <div className="py-12 text-center text-[#8e7164] font-black uppercase text-xs">NENHUMA_VAGA_DISPONÍVEL</div>
                  ) : (
                    <div className="space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {vagasResult.map((item, idx) => (
                            <div key={idx} className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_#000]">
                               <p className="text-[9px] font-black text-[#8e7164] uppercase tracking-widest mb-2 border-b-2 border-black/5 pb-1">PROF. {item.professor?.split(' ')[0]}</p>
                               <div className="flex flex-wrap gap-2">
                                  {item.vagas.map((h: string) => (
                                    <span key={h} className="bg-[#feccba] text-black px-2 py-1 border-2 border-black text-[9px] font-black flex items-center gap-1 shadow-[2px_2px_0_#000]">
                                      <Clock className="w-3 h-3" /> {h}
                                    </span>
                                  ))}
                               </div>
                            </div>
                          ))}
                       </div>

                       <div className="mt-8 bg-white border-4 border-black p-4 shadow-[4px_4px_0_#000]">
                          <p className="text-[9px] font-black text-[#8e7164] uppercase tracking-widest mb-2">PREVIEW_WHATSAPP</p>
                          <textarea 
                            readOnly 
                            className="w-full h-32 text-xs text-black font-black bg-[#fff8f6] p-4 border-2 border-black resize-none focus:outline-none uppercase"
                            value={generateText()}
                          />
                       </div>

                       <div className="mt-4 p-6 bg-black flex flex-col md:flex-row items-center justify-between gap-4 shadow-[4px_4px_0_rgba(255,107,0,0.3)]">
                          <div className="flex items-center gap-4 text-white">
                             <div className="bg-[#ff6b00] p-3 border-2 border-white shadow-[4px_4px_0_#ff6b00]/20">
                                <MessageCircle className="w-6 h-6" />
                             </div>
                             <div>
                                <p className="text-[10px] font-black text-[#8e7164] uppercase">PRONTO PARA ENVIAR!</p>
                                <p className="text-sm font-black uppercase italic italic">COPIE O TEXTO FORMATADO</p>
                             </div>
                          </div>
                          <button 
                            onClick={copyToWhatsApp}
                            className="bg-[#ff6b00] text-white px-8 py-3 border-2 border-white font-black uppercase text-xs hover:bg-[#ff8c33] active:translate-y-1 transition-all flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" /> COPIAR_TEXTO
                          </button>
                       </div>
                    </div>
                  )}
               </motion.div>
              )}
          </div>
        )}

        {activeTab === 'experimentais' && (
          <div className="h-[600px]">
            <WeeklyCalendar />
          </div>
        )}
      </div>

      {/* Modal de Novo Lead */}
      <AnimatePresence>
         {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#fff8f6] border-8 border-black p-8 relative overflow-hidden shadow-[12px_12px_0_#000] w-full max-w-md"
            >
              <div className="absolute top-0 right-0 p-4">
                 <button onClick={() => setIsModalOpen(false)} className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer">
                    <X className="w-4 h-4" />
                 </button>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-black text-black uppercase italic flex items-center gap-2">
                   <Plus className="w-6 h-6 text-[#ff6b00]" /> NOVO_INTERESSADO
                </h2>
                <div className="h-2 w-20 bg-[#ff6b00] mt-2 border-2 border-black"></div>
              </div>

              <form onSubmit={handleCreateLead} className="space-y-6">
                 <div>
                   <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">NOME_COMPLETO (OPCIONAL)</label>
                   <input 
                     className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic focus:ring-0 focus:outline-none" 
                     value={formData.nome} 
                     onChange={(e) => setFormData({...formData, nome: e.target.value})} 
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">WHATSAPP_CONTATO</label>
                   <input 
                     required 
                     className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic focus:ring-0 focus:outline-none" 
                     value={formData.telefone} 
                     onChange={(e) => setFormData({...formData, telefone: e.target.value})} 
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">CURSO_DE_INTERESSE</label>
                   <select 
                     required 
                     className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic focus:ring-0 focus:outline-none" 
                     value={formData.interesse_curso_id} 
                     onChange={(e) => setFormData({...formData, interesse_curso_id: e.target.value})}
                   >
                     <option value="">SELECIONE...</option>
                     {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">ANOTAÇÃO_INICIAL</label>
                   <textarea 
                     rows={3}
                     className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic focus:ring-0 focus:outline-none resize-none" 
                     value={formData.observacoes} 
                     onChange={(e) => setFormData({...formData, observacoes: e.target.value})} 
                   />
                 </div>
                 <button 
                   type="submit" 
                   className="w-full bg-[#ff6b00] text-white py-4 border-4 border-black font-black uppercase shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                 >
                   SALVAR_LEAD
                 </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Edição de Lead (Anotações e Dados) */}
      <AnimatePresence>
         {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#fff8f6] border-8 border-black p-8 relative overflow-hidden shadow-[12px_12px_0_#000] w-full max-w-md"
            >
              <div className="absolute top-0 right-0 p-4">
                 <button onClick={() => setIsEditModalOpen(false)} className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer">
                    <X className="w-4 h-4" />
                 </button>
              </div>

              <div className="mb-8">
                <h2 className="text-xl font-black text-black uppercase italic flex items-center gap-2">
                   <Plus className="w-6 h-6 text-[#ff6b00]" /> ANOTAÇÕES_&_DADOS
                </h2>
                <div className="h-2 w-20 bg-[#ff6b00] mt-2 border-2 border-black"></div>
              </div>

              <form onSubmit={handleUpdateLead} className="space-y-6">
                 <div>
                   <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">NOME_COMPLETO (OPCIONAL)</label>
                   <input 
                     className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic focus:ring-0 focus:outline-none" 
                     value={editFormData.nome} 
                     onChange={(e) => setEditFormData({...editFormData, nome: e.target.value})} 
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">WHATSAPP_CONTATO</label>
                   <input 
                     required 
                     className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic focus:ring-0 focus:outline-none" 
                     value={editFormData.telefone} 
                     onChange={(e) => setEditFormData({...editFormData, telefone: e.target.value})} 
                   />
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">CURSO_DE_INTERESSE</label>
                   <select 
                     className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic focus:ring-0 focus:outline-none" 
                     value={editFormData.interesse_curso_id} 
                     onChange={(e) => setEditFormData({...editFormData, interesse_curso_id: e.target.value})}
                   >
                     <option value="">SELECIONE...</option>
                     {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                   </select>
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">STATUS_CRM</label>
                   <select 
                     required
                     className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic focus:ring-0 focus:outline-none" 
                     value={editFormData.status} 
                     onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                   >
                     <option value="iniciado">Atendimento Iniciado</option>
                     <option value="em_atendimento">Em Atendimento</option>
                     <option value="nao_responde">Não Responde</option>
                     <option value="sem_interesse">Não Tem Interesse</option>
                     <option value="aula_marcada">Aula Marcada</option>
                     <option value="matriculado">Matriculado</option>
                     <option value="finalizado">Atendimento Encerrado</option>
                   </select>
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">ANOTAÇÕES_GERAIS</label>
                   <textarea 
                     rows={4}
                     className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic focus:ring-0 focus:outline-none resize-none" 
                     value={editFormData.observacoes} 
                     onChange={(e) => setEditFormData({...editFormData, observacoes: e.target.value})} 
                   />
                 </div>
                 <button 
                   type="submit" 
                   className="w-full bg-[#ff6b00] text-white py-4 border-4 border-black font-black uppercase shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
                 >
                   SALVAR_ALTERAÇÕES
                 </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Aula Experimental (Calendário) */}
      <AnimatePresence>
        {isExpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#fff8f6] border-8 border-black w-full max-w-[95vw] h-[95vh] relative overflow-hidden flex flex-col shadow-[12px_12px_0_#000]"
            >
              <header className="p-6 border-b-8 border-black flex items-center justify-between bg-[#feccba] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-[#ff6b00] p-3 border-4 border-black text-white shadow-[4px_4px_0_#000]"><Calendar className="w-6 h-6" /></div>
                  <div>
                    <h2 className="text-xl font-black text-black uppercase italic italic tracking-tighter">Agendamento_de_Experimental</h2>
                    <p className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest">LEAD: {selectedLead?.nome}</p>
                  </div>
                </div>
                <button onClick={() => setIsExpModalOpen(false)} className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none"><X className="w-6 h-6" /></button>
              </header>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                <div className="w-full lg:w-[380px] border-r-8 border-black p-8 overflow-y-auto space-y-8 bg-[#fff8f6]">
                   <div className="space-y-6">
                     <div>
                       <label className="text-[10px] font-black text-black uppercase tracking-widest mb-2 block">SELECIONE_O_PROFESSOR</label>
                       <select 
                         required 
                         className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic italic focus:ring-0 outline-none" 
                         value={expData.professor_id} 
                         onChange={(e) => setExpData({...expData, professor_id: e.target.value})}
                       >
                         <option value="">BUSCAR_PROFESSOR...</option>
                         {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                       </select>
                     </div>
                     
                     <AnimatePresence>
                       {expData.horario && (
                         <motion.div 
                           initial={{ opacity: 0, x: -20 }}
                           animate={{ opacity: 1, x: 0 }}
                           className="bg-[#ff6b00] border-4 border-black p-6 shadow-[6px_6px_0_#000] text-white"
                         >
                           <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">HORÁRIO_SELECIONADO</p>
                           <p className="text-lg font-black uppercase italic italic">{expData.data} @ {expData.horario.substring(0, 5)}</p>
                         </motion.div>
                       )}
                     </AnimatePresence>

                     <div className="p-4 bg-black/5 border-4 border-dashed border-black/20 rounded-none">
                        <p className="text-[9px] font-black text-[#8e7164] uppercase leading-relaxed">
                          DICA: CLIQUE EM UM ESPAÇO VAZIO NO CALENDÁRIO À DIREITA PARA DEFINIR O HORÁRIO DA AULA.
                        </p>
                     </div>
                   </div>
                </div>
                <div className="flex-1 p-4 bg-[#1a0f0a]/5 flex flex-col overflow-hidden">
                   <div className="bg-white border-4 border-black h-full shadow-[8px_8px_0_#000] overflow-hidden">
                     <WeeklyCalendar 
                       mode="select" 
                       selectedSlot={{ data: expData.data, horario: expData.horario }}
                       onSelectSlot={(data, horario, sala_id) => setExpData({...expData, data, horario, sala_id})} 
                     />
                   </div>
                </div>
              </div>
              
              <footer className="p-6 border-t-8 border-black bg-[#feccba] flex items-center justify-end gap-6 shrink-0">
                <button onClick={() => setIsExpModalOpen(false)} className="text-xs font-black uppercase text-black hover:underline tracking-widest">CANCELAR_OPERAÇÃO</button>
                <button 
                  disabled={!expData.horario || !expData.professor_id}
                  onClick={handleScheduleExp}
                  className="bg-[#ff6b00] text-white px-10 py-4 border-4 border-black font-black uppercase text-xs shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" /> CONFIRMAR_AGENDAMENTO
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
