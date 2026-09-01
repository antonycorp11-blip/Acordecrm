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
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { WeeklyCalendar } from '../components/calendar/WeeklyCalendar';
import { DndContext, useSensor, useSensors, PointerSensor, TouchSensor, DragOverlay } from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';

// Helper para selecionar os ícones 8-bit fiéis ao Stitch com base no curso/instrumento
function getStitchIconName(cursoNome: string): string {
  const t = (cursoNome || '').toLowerCase();
  if (t.includes('piano') || t.includes('teclado') || t.includes('sintetizador') || t.includes('notas')) return 'piano';
  if (t.includes('canto') || t.includes('vocal') || t.includes('voz')) return 'mic';
  if (t.includes('bateria') || t.includes('percussão') || t.includes('ritmo')) return 'album';
  if (t.includes('guitarra') || t.includes('violão') || t.includes('baixo') || t.includes('ukulele')) return 'music_note';
  if (t.includes('teoria') || t.includes('partitura')) return 'menu_book';
  return 'graphic_eq';
}

// Configuração visual das colunas do Stitch 8-bit
const STITCH_COLUMNS = [
  { id: 'em_atendimento', title: 'Novos Leads / Atendimento', bgHeader: 'bg-[#ff6b00] text-white', rotate: '-rotate-1', shadow: 'shadow-[6px_6px_0_#170b06]' },
  { id: 'nao_responde', title: 'Não Responde', bgHeader: 'bg-[#5b443b] text-[#feccba]', rotate: 'rotate-1', shadow: 'shadow-[6px_6px_0_#170b06]' },
  { id: 'aula_marcada', title: 'Experimental Marcada', bgHeader: 'bg-[#41312a] text-[#ffb693]', rotate: '-rotate-1', shadow: 'shadow-[6px_6px_0_#170b06]' },
  { id: 'sem_interesse', title: 'Sem Interesse', bgHeader: 'bg-[#3d2d26] text-[#e2bfb0]', rotate: 'rotate-2', shadow: 'shadow-[6px_6px_0_#170b06]' },
  { id: 'finalizado', title: 'Matriculado / Encerrado', bgHeader: 'bg-[#261812] text-[#8e7164]', rotate: 'rotate-1', shadow: 'shadow-[6px_6px_0_#170b06]' },
];

// Componente de coluna droppable do Kanban
function DroppableColumn({ id, title, leads, bgHeader, rotate, shadow, children }: any) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div 
      ref={setNodeRef} 
      className="flex-1 min-w-[290px] bg-[#2b1c16]/90 backdrop-blur-sm border-3 border-[#ffb693] p-4 shadow-[8px_8px_0_#170b06] flex flex-col gap-4 min-h-[540px] rounded-sm relative z-10"
    >
      {/* Header Estilo Badge Retro Stitch */}
      <div className={`${bgHeader} ${rotate} ${shadow} px-4 py-3 border-3 border-black flex items-center justify-between transition-transform hover:rotate-0`}>
        <h3 className="text-xs font-black uppercase tracking-tight italic font-['Space_Grotesk'] flex items-center gap-2">
          <span className="w-2 h-2 bg-white inline-block animate-pulse"></span>
          {title}
        </h3>
        <span className="bg-black text-white text-[10px] px-2 py-0.5 border border-white font-black shadow-[2px_2px_0_#000] font-['Space_Mono']">
          {leads.length}
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto max-h-[62vh] custom-scrollbar pr-1">
        {children}
        {leads.length === 0 && (
          <div className="flex-1 border-3 border-dashed border-[#ffb693]/20 p-8 flex flex-col items-center justify-center min-h-[160px] bg-[#170b06]/40 text-center">
            <span className="material-symbols-outlined text-3xl text-[#e2bfb0]/20 mb-2">drag_indicator</span>
            <p className="text-[9px] font-black text-[#e2bfb0]/40 uppercase tracking-widest font-['Space_Mono']">
              Arraste Leads aqui
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente do Card do Kanban (Fiel ao Design Stitch 8-Bit)
function CardVisual({ lead, cursos, onEdit, onMove, onAgendarExp, dragProps, isOverlay }: any) {
  if (!lead) return null;
  const [expanded, setExpanded] = useState(false);
  const phoneClean = (lead.telefone || '').replace(/\D/g, '');
  const courseObj = cursos.find((c: any) => c.id === lead.interesse_curso_id || String(c.id) === String(lead.interesse_curso_id));
  const courseName = courseObj?.nome || 'CURSO INDEFINIDO';
  const iconName = getStitchIconName(courseName);

  const origensMap: Record<string, string> = {
    trafego_pago: 'Tráfego Pago',
    indicacao: 'Indicação',
    outros: 'Outros'
  };
  const origemLabel = lead.origem ? origensMap[lead.origem] || lead.origem : null;

  return (
    <div
      {...dragProps}
      className={`bg-[#f8ddd2] text-[#1d100a] border-3 border-black p-4 shadow-[6px_6px_0_#ffb693] relative flex flex-col gap-2.5 group transition-all duration-150 select-none ${
        isOverlay ? 'shadow-[10px_10px_0_#ff6b00] border-dashed border-[#ff6b00] rotate-2 scale-95 opacity-90 z-[9999]' : 'hover:-translate-y-1 hover:shadow-[8px_8px_0_#ff6b00]'
      }`}
    >
      {/* Top badges & Icon */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[8px] font-black bg-[#ff6b00] text-white px-2 py-0.5 border border-black uppercase tracking-tighter shrink-0 font-['Space_Mono'] shadow-[1px_1px_0_#000]">
            {courseName}
          </span>
          {origemLabel && (
            <span className="text-[7px] font-black bg-[#2b1c16] text-[#ffb693] px-1.5 py-0.5 border border-black uppercase tracking-tighter shrink-0 font-['Space_Mono']">
              {origemLabel}
            </span>
          )}
        </div>
        <span className="material-symbols-outlined text-xl text-[#ff6b00] shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>
          {iconName}
        </span>
      </div>

      {/* Title & Phone */}
      <div className="flex justify-between items-center gap-2">
        <div>
          <h4 className="font-black text-[#1d100a] uppercase italic text-sm leading-tight font-['Space_Grotesk']">
            {lead.nome || <span className="italic opacity-50 font-normal lowercase">sem nome</span>}
          </h4>
          <p className="text-[9px] font-black text-[#7a5446] font-['Space_Mono'] flex items-center gap-1 mt-0.5">
            <Phone className="w-3 h-3 text-[#ff6b00]" /> {lead.telefone || 'Sem Telefone'}
          </p>
        </div>
      </div>

      {/* Quick Actions Row (Stitch Style) */}
      <div className="flex items-center gap-2 mt-1">
        {phoneClean && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const msg = `Olá ${lead.nome || ''}! Tudo bem? Falo do Studio Acorde. 😊`;
              window.open(`https://api.whatsapp.com/send?phone=55${phoneClean}&text=${encodeURIComponent(msg)}`, '_blank');
            }}
            title="Chamar no WhatsApp"
            className="flex-1 border-2 border-black bg-[#25d366] text-black py-1.5 font-black text-[9px] uppercase font-['Space_Mono'] flex items-center justify-center gap-1 shadow-[2px_2px_0_#000] hover:bg-[#20bd5a] active:translate-y-0.5 active:shadow-none cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5" /> CHAT
          </button>
        )}

        {lead.status !== 'matriculado' && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onAgendarExp(lead);
            }}
            title="Agendar Experimental"
            className="flex-1 border-2 border-black bg-[#ff6b00] text-white py-1.5 font-black text-[9px] uppercase font-['Space_Mono'] flex items-center justify-center gap-1 shadow-[2px_2px_0_#000] hover:bg-[#ff8c33] active:translate-y-0.5 active:shadow-none cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" /> AULA
          </button>
        )}

        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(lead);
          }}
          title="Editar Lead"
          className="border-2 border-black bg-white text-black p-1.5 font-black text-[9px] uppercase font-['Space_Mono'] flex items-center justify-center shadow-[2px_2px_0_#000] hover:bg-[#ffeae1] active:translate-y-0.5 active:shadow-none cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">edit</span>
        </button>

        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className="border-2 border-black bg-black text-white px-2 py-1.5 font-black text-[9px] uppercase font-['Space_Mono'] flex items-center justify-center shadow-[2px_2px_0_#000] cursor-pointer"
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-2 pt-2 border-t-2 border-black/15 flex flex-col gap-2">
          {lead.observacoes && (
            <p className="text-[8.5px] font-bold text-[#261812]/80 bg-[#ffdbcc]/50 p-2 border border-black/20 font-['Space_Mono'] uppercase">
              {lead.observacoes}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="text-[8px] font-black uppercase text-[#5a4136] font-['Space_Mono']">STATUS RÁPIDO:</span>
            <select
              onPointerDown={(e) => e.stopPropagation()}
              value={lead.status === 'iniciado' ? 'em_atendimento' : (lead.status || 'em_atendimento')}
              onChange={(e) => {
                e.stopPropagation();
                onMove(lead.id, e.target.value);
              }}
              className="text-[8px] font-black text-black uppercase bg-white border border-black p-1 focus:outline-none cursor-pointer font-['Space_Mono'] shadow-[1px_1px_0_#000]"
            >
              <option value="em_atendimento">Em Atendimento</option>
              <option value="nao_responde">Não Responde</option>
              <option value="sem_interesse">Sem Interesse</option>
              <option value="aula_marcada">Aula Marcada</option>
              <option value="finalizado">Matriculado/Encerrado</option>
            </select>
          </div>
        </div>
      )}
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
    opacity: isDragging ? 0.15 : 1,
    cursor: 'grab'
  };

  const dragProps = { ref: setNodeRef, style, ...listeners, ...attributes };

  return (
    <CardVisual
      lead={lead}
      cursos={cursos}
      onEdit={onEdit}
      onMove={onMove}
      onAgendarExp={onAgendarExp}
      dragProps={dragProps}
      isOverlay={false}
    />
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
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para Edição de Leads
  const [editingLead, setEditingLead] = useState<any>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    nome: '',
    telefone: '',
    interesse_curso_id: '',
    status: '',
    observacoes: '',
    origem: ''
  });

  // Sensores para Drag & Drop
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
    status: 'em_atendimento',
    observacoes: '',
    origem: ''
  });

  const [expData, setExpData] = useState({
    lead_id: '',
    professor_id: '',
    curso_id: '',
    data: '',
    horario: '',
    sala_id: undefined as number | undefined
  });

  // Helper de Trava de Duplicidade de Telefone
  const isDuplicatePhone = (phone: string, currentLeadId?: any) => {
    const cleanNew = (phone || '').replace(/\D/g, '');
    if (!cleanNew || cleanNew.length < 8) return false;
    return leads.some(l => {
      if (currentLeadId && (l.id === currentLeadId || String(l.id) === String(currentLeadId))) {
        return false;
      }
      const cleanExisting = (l.telefone || '').replace(/\D/g, '');
      return cleanExisting === cleanNew;
    });
  };

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

    fetch('/api/leads/verificar-followup', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => { if (res.ok) return res.json(); })
      .then(data => {
        if (data && data.count > 0) {
          toast.info(`Follow-up por e-mail disparado para ${data.count} leads pendentes!`);
        }
      })
      .catch(err => console.error("Erro ao verificar follow-up:", err));
  }, []);

  const sendReminder = (exp: any) => {
    const horario = exp.horario ? exp.horario.substring(0, 5) : '--:--';
    const msg = `Olá ${exp.leads?.nome}! 🎸 Passando para confirmar nossa aula experimental de ${exp.cursos?.nome || 'música'} hoje às ${horario} com o Prof. ${exp.professores?.nome}? Estamos te esperando na Acorde! 😊`;
    const phone = exp.leads?.telefone?.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleSearchVagas = async (inst: string, dia: string) => {
    if (!inst || !dia) return;
    setSearchingVagas(true);
    
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

  // Criar Lead com Trava de Duplicidade por Telefone
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = (formData.telefone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      toast.error("⚠️ Digite um número de WhatsApp/telefone válido (mínimo 8 dígitos).");
      return;
    }

    if (isDuplicatePhone(formData.telefone)) {
      toast.error("⛔ TRAVA DE DUPLICIDADE: Já existe um lead cadastrado com este telefone! Não é permitido criar leads duplicados.", { duration: 6000 });
      return;
    }

    const token = localStorage.getItem('acorde_token');
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      toast.success("✨ Lead cadastrado com sucesso!");
      setIsModalOpen(false);
      fetchLeads();
      setFormData({ nome: '', telefone: '', interesse_curso_id: '', status: 'em_atendimento', observacoes: '', origem: '' });
    } else {
      toast.error("Erro ao cadastrar lead.");
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
      toast.success("Aula experimental agendada!");
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

  // Editar Lead com Trava de Duplicidade por Telefone
  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = (editFormData.telefone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) {
      toast.error("⚠️ Digite um número de WhatsApp/telefone válido.");
      return;
    }

    if (isDuplicatePhone(editFormData.telefone, editingLead?.id)) {
      toast.error("⛔ TRAVA DE DUPLICIDADE: Já existe outro lead cadastrado com este telefone!", { duration: 6000 });
      return;
    }

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
      status: lead.status || 'em_atendimento',
      observacoes: lead.observacoes || '',
      origem: lead.origem || ''
    });
    setIsEditModalOpen(true);
  };

  // ALGORITMO DE BUSCA POR NOME OU TELEFONE (PRIORIDADE ABSOLUTA AOS ÚLTIMOS 4 DÍGITOS)
  const filterAndSortLeads = (leadsList: any[]) => {
    const rawTerm = searchTerm.trim();
    if (!rawTerm) return leadsList;

    const termLower = rawTerm.toLowerCase();
    const searchDigits = rawTerm.replace(/\D/g, '');

    const scored = leadsList
      .map((lead) => {
        const name = (lead.nome || '').toLowerCase();
        const phoneClean = (lead.telefone || '').replace(/\D/g, '');
        const phoneRaw = (lead.telefone || '').toLowerCase();

        let score = 0;

        // Regra de Ouro: Se a busca é por dígitos de telefone (especialmente últimos 4 dígitos)
        if (searchDigits.length >= 4) {
          if (phoneClean.endsWith(searchDigits)) {
            // PRIORIDADE MÁXIMA: Termina exatamente com os últimos dígitos pesquisados
            score = 2000 + (phoneClean.length === searchDigits.length ? 1000 : 0);
          } else if (phoneClean.includes(searchDigits)) {
            score = 500;
          }
        } else if (searchDigits.length > 0 && phoneClean.includes(searchDigits)) {
          score = 300;
        }

        // Match por nome ou texto
        if (name.includes(termLower)) {
          score = Math.max(score, 200);
        } else if (phoneRaw.includes(termLower)) {
          score = Math.max(score, 150);
        }

        return { lead, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map((item) => item.lead);
  };

  const processedLeads = filterAndSortLeads(leads);

  // Cálculos de KPI Fiem ao Stitch
  const totalLeads = leads.length;
  const emAtendimentoCount = leads.filter(l => l.status === 'em_atendimento' || l.status === 'iniciado' || !l.status).length;
  const aulaMarcadaCount = leads.filter(l => l.status === 'aula_marcada').length;
  const naoRespondeCount = leads.filter(l => l.status === 'nao_responde').length;
  const conversaoRate = totalLeads > 0 ? Math.round((leads.filter(l => l.status === 'finalizado' || l.status === 'matriculado').length / totalLeads) * 100) : 0;

  return (
    <div className="flex flex-col flex-1 animate-in fade-in duration-500 overflow-hidden h-screen bg-[#1d100a] text-[#f8ddd2] relative font-['Space_Mono']">
      {/* Floating Background Decor (8-Bit Music Stickers - Stitch Maximalist) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0">
        <span className="material-symbols-outlined floating-sticker text-[80px] top-[10%] left-[5%] text-[#ff6b00]" style={{ animationDelay: '0s' }}>piano</span>
        <span className="material-symbols-outlined floating-sticker text-[60px] top-[40%] left-[80%] text-[#ffb693]" style={{ animationDelay: '1s' }}>music_note</span>
        <span className="material-symbols-outlined floating-sticker text-[120px] top-[70%] left-[15%] text-[#ff6b00]" style={{ animationDelay: '2s' }}>album</span>
        <span className="material-symbols-outlined floating-sticker text-[90px] top-[20%] left-[60%] text-[#ffb693]" style={{ animationDelay: '3s' }}>event</span>
        <span className="material-symbols-outlined floating-sticker text-[70px] top-[80%] left-[85%] text-[#ff6b00]" style={{ animationDelay: '4s' }}>electric_car</span>
        <span className="material-symbols-outlined floating-sticker text-[50px] top-[15%] left-[25%] text-[#ffb693]" style={{ animationDelay: '5s' }}>graphic_eq</span>
      </div>

      {/* TopAppBar Fiel ao Stitch com Buscador Integrado */}
      <header className="px-4 sm:px-8 py-3 sm:py-4 bg-[#2b1c16] border-b-3 border-[#ffb693] flex flex-wrap items-center justify-between gap-3 sm:gap-4 shrink-0 shadow-[0_6px_0_#170b06] relative z-20">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="bg-[#ff6b00] text-white p-2.5 sm:p-3 border-3 border-black shadow-[4px_4px_0_#000] -rotate-1 shrink-0">
            <span className="material-symbols-outlined text-2xl sm:text-3xl">person_add</span>
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-black text-[#ffb693] uppercase tracking-tighter italic font-['Space_Grotesk'] flex items-center gap-2">
              STUDIO_MASTER <span className="bg-[#ff6b00] text-white text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.5 border border-black not-italic font-['Space_Mono'] shadow-[2px_2px_0_#000]">CRM 8-BIT</span>
            </h1>
            <p className="text-[8.5px] sm:text-[9.5px] font-bold text-[#e2bfb0] uppercase tracking-widest font-['Space_Mono'] mt-0.5">
              VIBE CHECK: ACTIVE • GESTÃO DE LEADS MAXIMALISTA
            </p>
          </div>
        </div>

        {/* BARRA DE PESQUISA POR NOME OU TELEFONE (INTEGRADA NO HEADER) */}
        <div className="flex-1 w-full sm:w-auto sm:max-w-xl sm:mx-4 order-3 sm:order-2">
          <div className="bg-[#170b06] border-2 sm:border-3 border-[#ffb693] px-3 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3 shadow-[4px_4px_0_#000] focus-within:border-[#ff6b00] transition-colors">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ff6b00] shrink-0 animate-pulse" />
            <input
              type="text"
              placeholder="BUSCAR LEAD POR NOME OU ÚLTIMOS 4 DÍGITOS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-[#f8ddd2] font-black text-[10px] sm:text-xs uppercase w-full focus:outline-none placeholder:text-[#e2bfb0]/40 font-['Space_Mono']"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-[#ffb693] hover:text-white shrink-0 p-0.5 cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Dashboard de Métricas / KPI Bar (Vibe do Dia Stitch) */}
        <div className="hidden xl:flex items-center gap-4 bg-[#170b06] px-5 py-2.5 border-3 border-[#41312a] shadow-[4px_4px_0_#000] order-2">
          <div className="text-center">
            <p className="text-[8px] font-black text-[#e2bfb0] uppercase tracking-widest font-['Space_Mono']">NOVOS LEADS</p>
            <p className="text-lg font-black text-[#ffb693] font-['Space_Grotesk']">{emAtendimentoCount}</p>
          </div>
          <div className="w-px h-8 bg-[#41312a]"></div>
          <div className="text-center">
            <p className="text-[8px] font-black text-[#e2bfb0] uppercase tracking-widest font-['Space_Mono']">AULAS MARCADAS</p>
            <p className="text-lg font-black text-[#25d366] font-['Space_Grotesk']">{aulaMarcadaCount}</p>
          </div>
          <div className="w-px h-8 bg-[#41312a]"></div>
          <div className="text-center">
            <p className="text-[8px] font-black text-[#e2bfb0] uppercase tracking-widest font-['Space_Mono']">CONVERSÃO</p>
            <p className="text-lg font-black text-[#ff6b00] font-['Space_Grotesk']">{conversaoRate}%</p>
          </div>
          <div className="w-px h-8 bg-[#41312a]"></div>
          <div className="text-center">
            <p className="text-[8px] font-black text-[#e2bfb0] uppercase tracking-widest font-['Space_Mono']">TOTAL LEADS</p>
            <p className="text-lg font-black text-white font-['Space_Grotesk']">{totalLeads}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 order-2 sm:order-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#ff6b00] hover:bg-[#ff8c33] text-white px-3.5 sm:px-5 py-2 sm:py-2.5 border-2 sm:border-3 border-black font-black uppercase text-[10px] sm:text-xs shadow-[3px_3px_0_#000] sm:shadow-[4px_4px_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer font-['Space_Mono']"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> NOVO_LEAD
          </button>
        </div>
      </header>

      {/* Main Content Workspace */}
      <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 flex-1 overflow-auto relative z-10 font-['Space_Mono']">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-6 border-b-3 border-[#ffb693]/20">
           <button 
             onClick={() => setActiveTab('leads')}
             className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative cursor-pointer ${
               activeTab === 'leads' ? 'text-[#ff6b00]' : 'text-[#e2bfb0]/60 hover:text-[#ffb693]'
             }`}
           >
             LEADS_INTERESSADOS ({processedLeads.length})
             {activeTab === 'leads' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#ff6b00] shadow-[0_2px_0_#000]" />}
           </button>
           <button 
             onClick={() => setActiveTab('vagas')}
             className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative cursor-pointer ${
               activeTab === 'vagas' ? 'text-[#ff6b00]' : 'text-[#e2bfb0]/60 hover:text-[#ffb693]'
             }`}
           >
             BUSCA_DE_VAGAS
             {activeTab === 'vagas' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#ff6b00] shadow-[0_2px_0_#000]" />}
           </button>
           <button 
             onClick={() => setActiveTab('experimentais')}
             className={`pb-4 px-2 text-xs font-black uppercase tracking-widest transition-all relative cursor-pointer ${
               activeTab === 'experimentais' ? 'text-[#ff6b00]' : 'text-[#e2bfb0]/60 hover:text-[#ffb693]'
             }`}
           >
             CALENDÁRIO_EXP
             {activeTab === 'experimentais' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#ff6b00] shadow-[0_2px_0_#000]" />}
           </button>
        </div>

        {activeTab === 'leads' && (
          <div className="space-y-6 flex flex-col flex-1 overflow-hidden">
            {/* Lembretes de Confirmação de Aula Experimental */}
            {experimentaisPendentes.length > 0 && (
              <div className="space-y-3 shrink-0 max-w-md mb-2">
                <h3 className="text-[10px] font-black text-[#ffb693] uppercase tracking-widest flex items-center gap-2 px-2">
                  <Clock className="w-3.5 h-3.5 text-[#ff6b00]" /> CONFIRMAR_HOJE ({experimentaisPendentes.length})
                </h3>
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                  {experimentaisPendentes.map((exp) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={exp.id}
                      className="bg-[#f8ddd2] text-black border-3 border-black p-3.5 flex items-center justify-between gap-4 shadow-[4px_4px_0_#000]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center font-black text-[#ff6b00] text-xs shadow-[2px_2px_0_#000]">
                          {exp.horario ? exp.horario.substring(0, 5) : '--:--'}
                        </div>
                        <div>
                          <p className="text-xs font-black text-black uppercase italic">{exp.leads?.nome || 'Sem Nome'}</p>
                          <p className="text-[8px] font-black text-[#7a5446] uppercase">{exp.cursos?.nome} • PROF. {exp.professores?.nome?.split(' ')[0]}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => sendReminder(exp)}
                        className="bg-[#25d366] text-black p-2 border-2 border-black shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none transition-all cursor-pointer hover:bg-[#20bd5a]"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Resultado da Pesquisa Indicador */}
            {searchTerm && (
              <div className="flex items-center justify-between bg-[#170b06] border-3 border-[#ff6b00] p-3 shadow-[4px_4px_0_#000]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ff6b00]">search</span>
                  <p className="text-xs font-black text-white uppercase">
                    RESULTADO DA BUSCA POR: <span className="text-[#ff6b00]">"{searchTerm}"</span> — {processedLeads.length} LEAD(S) ENCONTRADO(S) (PRIORIDADE AOS ÚLTIMOS DÍGITOS)
                  </p>
                </div>
                <button
                  onClick={() => setSearchTerm('')}
                  className="bg-[#ff6b00] text-white px-3 py-1 border border-black text-[9px] font-black uppercase shadow-[2px_2px_0_#000] hover:bg-[#ff8c33] cursor-pointer"
                >
                  LIMPAR BUSCA
                </button>
              </div>
            )}

            {/* Kanban Board com DndContext (Estilo Stitch) */}
            <DndContext 
              sensors={sensors} 
              onDragStart={(event) => setActiveId(String(event.active.id))}
              onDragEnd={(event) => { handleDragEnd(event); setActiveId(null); }}
            >
              <div className="flex gap-6 overflow-x-auto pb-6 pt-2 custom-scrollbar min-h-[520px] flex-1 max-w-full items-start">
                {STITCH_COLUMNS.map((col) => {
                  const colLeads = processedLeads.filter((l) => {
                    if (col.id === 'em_atendimento') {
                      return l.status === 'em_atendimento' || l.status === 'iniciado' || !l.status;
                    }
                    return l.status === col.id;
                  });
                  
                  return (
                    <DroppableColumn 
                      key={col.id} 
                      id={col.id} 
                      title={col.title} 
                      leads={colLeads}
                      bgHeader={col.bgHeader}
                      rotate={col.rotate}
                      shadow={col.shadow}
                    >
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

              {/* Overlay que flutua durante o arrasto */}
              <DragOverlay>
                {activeId ? (
                  <CardVisual
                    lead={leads.find(l => String(l.id) === activeId)}
                    cursos={cursos}
                    onEdit={() => {}}
                    onMove={() => {}}
                    onAgendarExp={() => {}}
                    dragProps={{}}
                    isOverlay={true}
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}

        {/* Tab Busca de Vagas */}
        {activeTab === 'vagas' && (
          <div className="space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
               <Music className="w-3.5 h-3.5 text-[#ff6b00]" /> 1. Escolha o Instrumento
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
                   className={`p-4 border-3 transition-all flex flex-col items-center gap-2 cursor-pointer ${
                     searchInstrumento === inst 
                       ? 'bg-[#ff6b00] border-black text-white shadow-[4px_4px_0_#000] -translate-y-1' 
                       : 'bg-[#f8ddd2] border-black text-black shadow-[4px_4px_0_#000] hover:-translate-y-1'
                   }`}
                 >
                   <div className={`w-10 h-10 border-2 border-black flex items-center justify-center ${searchInstrumento === inst ? 'bg-white/20' : 'bg-white shadow-[2px_2px_0_#000]'}`}>
                     <Music className={`w-5 h-5 ${searchInstrumento === inst ? 'text-white' : 'text-black'}`} />
                   </div>
                   <span className="text-[10px] font-black text-center uppercase italic font-['Space_Grotesk']" title={inst}>{inst}</span>
                 </button>
               ))}
            </div>

            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                 <Calendar className="w-3.5 h-3.5 text-[#ff6b00]" /> 2. ESCOLHA O DIA DA SEMANA
              </h3>
              <div className="flex flex-wrap gap-3">
                 {['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].map(dia => (
                   <button
                     key={dia}
                     onClick={() => { setSearchDia(dia); if(searchInstrumento) handleSearchVagas(searchInstrumento, dia); }}
                     className={`px-6 py-3 border-3 font-black text-[10px] uppercase transition-all shadow-[4px_4px_0_#000] cursor-pointer ${
                       searchDia === dia 
                         ? 'bg-[#ff6b00] border-black text-white' 
                         : 'bg-white border-black text-black hover:bg-[#ffeae1]'
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
                className="bg-[#f8ddd2] border-4 border-black p-8 relative overflow-hidden shadow-[8px_8px_0_#000] text-black"
              >
                 <div className="absolute top-0 right-0 p-4">
                    <div className="bg-[#ff6b00] text-white px-3 py-1 border-2 border-black text-[8px] font-black uppercase tracking-widest animate-pulse">
                       SINC_EMUSYS
                    </div>
                 </div>

                 <h4 className="text-lg font-black text-black uppercase italic mb-6 flex items-center gap-2 font-['Space_Grotesk']">
                   <CheckCircle2 className="text-[#ff6b00]" /> VAGAS_ENCONTRADAS
                 </h4>

                 {searchingVagas ? (
                   <div className="py-12 text-center text-[#7a5446] font-black uppercase text-xs">BUSCANDO_HORÁRIOS...</div>
                 ) : vagasResult.length === 0 ? (
                   <div className="py-12 text-center text-[#7a5446] font-black uppercase text-xs">NENHUMA_VAGA_DISPONÍVEL</div>
                 ) : (
                   <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {vagasResult.map((item, idx) => (
                           <div key={idx} className="bg-white border-3 border-black p-4 shadow-[4px_4px_0_#000]">
                              <p className="text-[9px] font-black text-[#7a5446] uppercase tracking-widest mb-2 border-b-2 border-black/10 pb-1 font-['Space_Mono']">PROF. {item.professor?.split(' ')[0]}</p>
                              <div className="flex flex-wrap gap-2">
                                 {item.vagas.map((h: string) => (
                                   <span key={h} className="bg-[#ffdbcc] text-black px-2 py-1 border-2 border-black text-[9px] font-black flex items-center gap-1 shadow-[2px_2px_0_#000]">
                                     <Clock className="w-3 h-3 text-[#ff6b00]" /> {h}
                                   </span>
                                 ))}
                              </div>
                           </div>
                         ))}
                      </div>

                      <div className="mt-8 bg-white border-3 border-black p-4 shadow-[4px_4px_0_#000]">
                         <p className="text-[9px] font-black text-[#7a5446] uppercase tracking-widest mb-2">PREVIEW_WHATSAPP</p>
                         <textarea 
                           readOnly 
                           className="w-full h-32 text-xs text-black font-black bg-[#fff8f6] p-4 border-2 border-black resize-none focus:outline-none uppercase font-['Space_Mono']"
                           value={generateText()}
                         />
                      </div>

                      <div className="mt-4 p-6 bg-black flex flex-col md:flex-row items-center justify-between gap-4 shadow-[4px_4px_0_rgba(255,107,0,0.3)]">
                         <div className="flex items-center gap-4 text-white">
                            <div className="bg-[#ff6b00] p-3 border-2 border-white shadow-[4px_4px_0_#ff6b00]/20">
                               <MessageCircle className="w-6 h-6" />
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-[#e2bfb0] uppercase font-['Space_Mono']">PRONTO PARA ENVIAR!</p>
                               <p className="text-sm font-black uppercase italic font-['Space_Grotesk']">COPIE O TEXTO FORMATADO</p>
                            </div>
                         </div>
                         <button 
                           onClick={copyToWhatsApp}
                           className="bg-[#ff6b00] text-white px-8 py-3 border-2 border-white font-black uppercase text-xs hover:bg-[#ff8c33] active:translate-y-1 transition-all flex items-center gap-2 cursor-pointer font-['Space_Mono']"
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

        {/* Tab Calendário */}
        {activeTab === 'experimentais' && (
          <div className="h-[600px]">
            <WeeklyCalendar />
          </div>
        )}
      </div>

      {/* Modal de Novo Lead (com Trava de Duplicidade por Telefone) */}
      <AnimatePresence>
         {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#f8ddd2] border-8 border-black p-8 relative overflow-hidden shadow-[12px_12px_0_#000] w-full max-w-3xl text-black font-['Space_Mono']"
            >
              <div className="absolute top-0 right-0 p-4">
                 <button onClick={() => setIsModalOpen(false)} className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer">
                    <X className="w-4 h-4" />
                 </button>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-black text-black uppercase italic flex items-center gap-2 font-['Space_Grotesk']">
                   <Plus className="w-6 h-6 text-[#ff6b00]" /> NOVO_INTERESSADO
                </h2>
                <div className="h-2 w-20 bg-[#ff6b00] mt-2 border-2 border-black"></div>
              </div>

              <form onSubmit={handleCreateLead} className="space-y-6 md:space-y-0 md:grid md:grid-cols-2 md:gap-6">
                 {/* Coluna da Esquerda */}
                 <div className="space-y-6">
                   <div>
                     <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">NOME_COMPLETO (OPCIONAL)</label>
                     <input 
                       className="w-full px-4 py-3 bg-white text-black border-4 border-black text-sm font-black uppercase italic focus:ring-0 focus:outline-none" 
                       value={formData.nome} 
                       onChange={(e) => setFormData({...formData, nome: e.target.value})} 
                     />
                   </div>

                   <div>
                     <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 flex items-center justify-between">
                       <span>WHATSAPP_CONTATO *</span>
                       {isDuplicatePhone(formData.telefone) && (
                         <span className="text-red-600 font-bold text-[9px] flex items-center gap-1 animate-pulse">
                           <AlertTriangle className="w-3 h-3" /> DUPLICADO!
                         </span>
                       )}
                     </label>
                     <input 
                       required 
                       placeholder="(00) 00000-0000"
                       className={`w-full px-4 py-3 bg-white text-black border-4 text-sm font-black uppercase italic focus:ring-0 focus:outline-none ${
                         isDuplicatePhone(formData.telefone) ? 'border-red-600 bg-red-50 text-red-900' : 'border-black'
                       }`}
                       value={formData.telefone} 
                       onChange={(e) => setFormData({...formData, telefone: e.target.value})} 
                     />
                     {isDuplicatePhone(formData.telefone) && (
                       <p className="text-[9px] font-black text-red-600 uppercase mt-1">
                         ⛔ Já existe um lead cadastrado com este telefone. Duplicidade bloqueada.
                       </p>
                     )}
                   </div>

                   <div>
                     <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1.5 block">ORIGEM_DO_LEAD / CANAL</label>
                     <div className="grid grid-cols-3 gap-2">
                       {[
                         { id: 'trafego_pago', label: 'Tráfego Pago' },
                         { id: 'indicacao', label: 'Indicação' },
                         { id: 'outros', label: 'Outros' }
                       ].map((opt) => {
                         const isSelected = formData.origem === opt.id;
                         return (
                           <button
                             key={opt.id}
                             type="button"
                             onClick={() => setFormData({...formData, origem: opt.id})}
                             className={`p-2 border-2 text-[8px] font-black uppercase text-center transition-all cursor-pointer ${
                               isSelected
                                 ? 'bg-[#ff6b00] text-white border-black shadow-[2px_2px_0_#000] translate-x-[-1px] translate-y-[-1px]'
                                 : 'bg-white text-black border-black shadow-[2px_2px_0_#000] hover:bg-black/5'
                             }`}
                           >
                             {opt.label}
                           </button>
                         );
                       })}
                     </div>
                   </div>
                 </div>

                 {/* Coluna da Direita */}
                 <div className="space-y-6 flex flex-col justify-between">
                   <div>
                     <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1.5 block">CURSO_DE_INTERESSE</label>
                     <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto custom-scrollbar border-4 border-black p-2 bg-white">
                       {cursos
                         .filter(c => !c.nome.includes('Black') && !c.nome.includes('Laranja') && !c.nome.includes('White'))
                         .map(c => {
                           const isSelected = formData.interesse_curso_id === String(c.id) || formData.interesse_curso_id === c.id;
                           return (
                             <button
                               key={c.id}
                               type="button"
                               onClick={() => setFormData({...formData, interesse_curso_id: String(c.id)})}
                               className={`p-2 border-2 text-[8px] font-black uppercase text-center transition-all cursor-pointer ${
                                 isSelected
                                   ? 'bg-[#ff6b00] text-white border-black shadow-[2px_2px_0_#000] translate-x-[-1px] translate-y-[-1px]'
                                   : 'bg-[#fff8f6] text-black border-black shadow-[2px_2px_0_#000] hover:bg-black/5'
                               }`}
                             >
                               {c.nome}
                             </button>
                           );
                         })}
                     </div>
                   </div>

                   <div className="flex-1 flex flex-col mt-2">
                     <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">ANOTAÇÃO_INICIAL</label>
                     <textarea 
                       rows={4}
                       className="w-full flex-1 px-4 py-3 bg-white text-black border-4 border-black text-sm font-black uppercase italic focus:ring-0 focus:outline-none resize-none min-h-[100px]" 
                       value={formData.observacoes} 
                       onChange={(e) => setFormData({...formData, observacoes: e.target.value})} 
                     />
                   </div>
                 </div>

                 {/* Botão de Envio (Bloqueado se duplicado) */}
                 <div className="md:col-span-2 pt-4">
                   <button 
                     type="submit" 
                     disabled={isDuplicatePhone(formData.telefone)}
                     className="w-full bg-[#ff6b00] text-white py-4 border-4 border-black font-black uppercase shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {isDuplicatePhone(formData.telefone) ? '⛔ TELEFONE DUPLICADO (BLOQUEADO)' : 'SALVAR_LEAD'}
                   </button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Edição de Lead (com Trava de Duplicidade) */}
      <AnimatePresence>
         {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#f8ddd2] border-8 border-black p-8 relative overflow-hidden shadow-[12px_12px_0_#000] w-full max-w-3xl text-black font-['Space_Mono']"
            >
              <div className="absolute top-0 right-0 p-4">
                 <button onClick={() => setIsEditModalOpen(false)} className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer">
                    <X className="w-4 h-4" />
                 </button>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-black text-black uppercase italic flex items-center gap-2 font-['Space_Grotesk']">
                   <Plus className="w-6 h-6 text-[#ff6b00]" /> ANOTAÇÕES_&_DADOS
                </h2>
                <div className="h-2 w-20 bg-[#ff6b00] mt-2 border-2 border-black"></div>
              </div>

              <form onSubmit={handleUpdateLead} className="space-y-6 md:space-y-0 md:grid md:grid-cols-2 md:gap-6">
                 {/* Coluna da Esquerda */}
                 <div className="space-y-6">
                   <div>
                     <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">NOME_COMPLETO (OPCIONAL)</label>
                     <input 
                       className="w-full px-4 py-3 bg-white text-black border-4 border-black text-sm font-black uppercase italic focus:ring-0 focus:outline-none" 
                       value={editFormData.nome} 
                       onChange={(e) => setEditFormData({...editFormData, nome: e.target.value})} 
                     />
                   </div>

                   <div>
                     <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 flex items-center justify-between">
                       <span>WHATSAPP_CONTATO *</span>
                       {isDuplicatePhone(editFormData.telefone, editingLead?.id) && (
                         <span className="text-red-600 font-bold text-[9px] flex items-center gap-1 animate-pulse">
                           <AlertTriangle className="w-3 h-3" /> DUPLICADO!
                         </span>
                       )}
                     </label>
                     <input 
                       required 
                       className={`w-full px-4 py-3 bg-white text-black border-4 text-sm font-black uppercase italic focus:ring-0 focus:outline-none ${
                         isDuplicatePhone(editFormData.telefone, editingLead?.id) ? 'border-red-600 bg-red-50 text-red-900' : 'border-black'
                       }`}
                       value={editFormData.telefone} 
                       onChange={(e) => setEditFormData({...editFormData, telefone: e.target.value})} 
                     />
                   </div>

                   <div>
                     <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">STATUS_CRM</label>
                     <select 
                       required
                       className="w-full px-4 py-3 bg-white text-black border-4 border-black text-sm font-black uppercase italic focus:ring-0 focus:outline-none cursor-pointer" 
                       value={editFormData.status} 
                       onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
                     >
                       <option value="em_atendimento">Em Atendimento</option>
                       <option value="nao_responde">Não Responde</option>
                       <option value="sem_interesse">Sem Interesse</option>
                       <option value="aula_marcada">Aula Marcada</option>
                       <option value="finalizado">Matriculado/Encerrado</option>
                     </select>
                   </div>

                   <div>
                     <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1.5 block">ORIGEM_DO_LEAD / CANAL</label>
                     <div className="grid grid-cols-3 gap-2">
                       {[
                         { id: 'trafego_pago', label: 'Tráfego Pago' },
                         { id: 'indicacao', label: 'Indicação' },
                         { id: 'outros', label: 'Outros' }
                       ].map((opt) => {
                         const isSelected = editFormData.origem === opt.id;
                         return (
                           <button
                             key={opt.id}
                             type="button"
                             onClick={() => setEditFormData({...editFormData, origem: opt.id})}
                             className={`p-2 border-2 text-[8px] font-black uppercase text-center transition-all cursor-pointer ${
                               isSelected
                                 ? 'bg-[#ff6b00] text-white border-black shadow-[2px_2px_0_#000] translate-x-[-1px] translate-y-[-1px]'
                                 : 'bg-white text-black border-black shadow-[2px_2px_0_#000] hover:bg-black/5'
                             }`}
                           >
                             {opt.label}
                           </button>
                         );
                       })}
                     </div>
                   </div>
                 </div>

                 {/* Coluna da Direita */}
                 <div className="space-y-6 flex flex-col justify-between">
                   <div>
                     <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1.5 block">CURSO_DE_INTERESSE</label>
                     <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto custom-scrollbar border-4 border-black p-2 bg-white">
                       {cursos
                         .filter(c => !c.nome.includes('Black') && !c.nome.includes('Laranja') && !c.nome.includes('White'))
                         .map(c => {
                           const isSelected = editFormData.interesse_curso_id === String(c.id) || editFormData.interesse_curso_id === c.id;
                           return (
                             <button
                               key={c.id}
                               type="button"
                               onClick={() => setEditFormData({...editFormData, interesse_curso_id: String(c.id)})}
                               className={`p-2 border-2 text-[8px] font-black uppercase text-center transition-all cursor-pointer ${
                                 isSelected
                                   ? 'bg-[#ff6b00] text-white border-black shadow-[2px_2px_0_#000] translate-x-[-1px] translate-y-[-1px]'
                                   : 'bg-[#fff8f6] text-black border-black shadow-[2px_2px_0_#000] hover:bg-black/5'
                               }`}
                             >
                               {c.nome}
                             </button>
                           );
                         })}
                     </div>
                   </div>

                   <div className="flex-1 flex flex-col mt-2">
                     <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">ANOTAÇÕES_GERAIS</label>
                     <textarea 
                       rows={4}
                       className="w-full flex-1 px-4 py-3 bg-white text-black border-4 border-black text-sm font-black uppercase italic focus:ring-0 focus:outline-none resize-none min-h-[100px]" 
                       value={editFormData.observacoes} 
                       onChange={(e) => setEditFormData({...editFormData, observacoes: e.target.value})} 
                     />
                   </div>
                 </div>

                 {/* Botão de Envio (Bloqueado se duplicado) */}
                 <div className="md:col-span-2 pt-4">
                   <button 
                     type="submit" 
                     disabled={isDuplicatePhone(editFormData.telefone, editingLead?.id)}
                     className="w-full bg-[#ff6b00] text-white py-4 border-4 border-black font-black uppercase shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     {isDuplicatePhone(editFormData.telefone, editingLead?.id) ? '⛔ TELEFONE DUPLICADO (BLOQUEADO)' : 'SALVAR_ALTERAÇÕES'}
                   </button>
                 </div>
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
              className="bg-[#f8ddd2] border-8 border-black w-full max-w-[95vw] h-[95vh] relative overflow-hidden flex flex-col shadow-[12px_12px_0_#000] font-['Space_Mono']"
            >
              <header className="p-6 border-b-8 border-black flex items-center justify-between bg-[#feccba] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="bg-[#ff6b00] p-3 border-4 border-black text-white shadow-[4px_4px_0_#000]"><Calendar className="w-6 h-6" /></div>
                  <div>
                    <h2 className="text-xl font-black text-black uppercase italic tracking-tighter font-['Space_Grotesk']">Agendamento_de_Experimental</h2>
                    <p className="text-[10px] font-black text-[#7a5446] uppercase tracking-widest">LEAD: {selectedLead?.nome}</p>
                  </div>
                </div>
                <button onClick={() => setIsExpModalOpen(false)} className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none cursor-pointer"><X className="w-6 h-6" /></button>
              </header>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                <div className="w-full lg:w-[380px] border-r-8 border-black p-8 overflow-y-auto space-y-8 bg-[#f8ddd2]">
                   <div className="space-y-6">
                     <div>
                       <label className="text-[10px] font-black text-black uppercase tracking-widest mb-2 block">SELECIONE_O_PROFESSOR</label>
                       <select 
                         required 
                         className="w-full px-4 py-3 bg-white text-black border-4 border-black text-sm font-black uppercase italic focus:ring-0 outline-none cursor-pointer font-['Space_Mono']" 
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
                           <p className="text-lg font-black uppercase italic font-['Space_Grotesk']">{expData.data} @ {expData.horario.substring(0, 5)}</p>
                         </motion.div>
                       )}
                     </AnimatePresence>

                     <div className="p-4 bg-black/5 border-4 border-dashed border-black/20 rounded-none">
                        <p className="text-[9px] font-black text-[#7a5446] uppercase leading-relaxed">
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
                <button onClick={() => setIsExpModalOpen(false)} className="text-xs font-black uppercase text-black hover:underline tracking-widest cursor-pointer">CANCELAR_OPERAÇÃO</button>
                <button 
                  disabled={!expData.horario || !expData.professor_id}
                  onClick={handleScheduleExp}
                  className="bg-[#ff6b00] text-white px-10 py-4 border-4 border-black font-black uppercase text-xs shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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
