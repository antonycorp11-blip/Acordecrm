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
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { WeeklyCalendar } from '../components/calendar/WeeklyCalendar';

export default function Atendimento() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leads' | 'experimentais' | 'vagas'>('leads');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  
  const [cursos, setCursos] = useState<any[]>([]);
  const [professores, setProfessores] = useState<any[]>([]);

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
    status: 'novo'
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
      setFormData({ nome: '', telefone: '', interesse_curso_id: '', status: 'novo' });
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
          <div className="space-y-6">
            {/* Seção de Lembretes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {experimentaisPendentes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2 px-2">
                    <Clock className="w-3 h-3 text-[#ff6b00]" /> CONFIRMAR_HOJE
                  </h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
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
                            <p className="text-xs font-black text-black uppercase italic italic">{exp.leads?.nome}</p>
                            <p className="text-[8px] font-black text-[#8e7164] uppercase">{exp.cursos?.nome} • PROF. {exp.professores?.nome?.split(' ')[0]}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => sendReminder(exp)}
                          className="bg-[#25d366] text-white p-2 border-2 border-black shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none transition-all"
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
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {leads.filter(l => l.status === 'experimental_concluida').length > 0 ? (
                    leads.filter(l => l.status === 'experimental_concluida').map((lead) => (
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
                            <p className="text-xs font-black text-black uppercase italic italic">{lead.nome}</p>
                            <p className="text-[8px] font-black text-[#8e7164] uppercase">AULA CONCLUÍDA • {lead.cursos?.nome}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const msg = `Olá ${lead.nome}! Gostamos muito de ter você aqui na Acorde! 😊 O que achou da aula? Vamos dar o próximo passo e garantir sua vaga na turma?`;
                            const phone = (lead.telefone || '').replace(/\D/g, '');
                            window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                          className="bg-[#ff6b00] text-white p-2 border-2 border-black shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none transition-all"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-8 border-4 border-dashed border-white/10 rounded-xl text-center">
                      <p className="text-[10px] font-black text-white/20 uppercase">NENHUM_LEAD_EM_PÓS-VENDA</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {['novo', 'em_contato', 'experimental_agendada'].map((status) => (
              <div key={status} className="space-y-4">
                <div className="flex items-center justify-between px-2 border-b-2 border-white/10 pb-2">
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest italic italic">
                    {status.replace('_', ' ')}
                  </h3>
                  <span className="bg-[#ff6b00] text-white text-[10px] px-2 py-0.5 border-2 border-black font-black shadow-[2px_2px_0_#000]">
                    {leads.filter(l => l.status === status).length}
                  </span>
                </div>
                
                <div className="space-y-4">
                  {leads.filter(l => l.status === status).map((lead) => (
                    <motion.div 
                      layout
                      key={lead.id} 
                      className="bg-[#fff8f6] border-4 border-black p-5 cursor-pointer group shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[8px] font-black bg-[#feccba] text-black px-2 py-0.5 border-2 border-black uppercase tracking-tighter">
                          {lead.cursos?.nome || 'CURSO_INDEFINIDO'}
                        </span>
                        <button className="text-black/20 hover:text-black"><MoreVertical className="w-4 h-4" /></button>
                      </div>
                      <h4 className="font-black text-black uppercase italic italic">{lead.nome}</h4>
                      <p className="text-[10px] font-black text-[#8e7164] mt-1 flex items-center gap-1 uppercase">
                        <Phone className="w-3 h-3" /> {lead.telefone}
                      </p>
                      
                      <div className="mt-4 pt-3 border-t-2 border-black/5 flex items-center justify-between">
                        <button 
                          onClick={() => {
                            setSelectedLead(lead);
                            setExpData({ ...expData, lead_id: lead.id, curso_id: lead.curso_id });
                            setIsExpModalOpen(true);
                          }}
                          className="text-[9px] font-black text-[#ff6b00] flex items-center gap-1 hover:underline uppercase"
                        >
                          <Calendar className="w-3 h-3" /> AGENDAR_EXP
                        </button>
                        <button className="text-black/20 group-hover:translate-x-1 transition-all">
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  
                  {leads.filter(l => l.status === status).length === 0 && (
                    <div className="border-4 border-dashed border-white/5 rounded-xl p-8 text-center">
                       <p className="text-[10px] font-black text-white/10 uppercase">VAZIO</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            </div>
          </div>
        )}

        {activeTab === 'vagas' && (
          <div className="space-y-             <div className="space-y-4">
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
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-900">Novo Interessado</h2>
                <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleCreateLead} className="space-y-4">
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nome do Lead</label>
                   <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={formData.nome} onChange={(e) => setFormData({...formData, nome: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">WhatsApp</label>
                   <input required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={formData.telefone} onChange={(e) => setFormData({...formData, telefone: e.target.value})} />
                 </div>
                 <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Curso de Interesse</label>
                   <select required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" value={formData.interesse_curso_id} onChange={(e) => setFormData({...formData, interesse_curso_id: e.target.value})}>
                     <option value="">Selecione...</option>
                     {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                   </select>
                 </div>
                 <button type="submit" className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-lg shadow-primary/30 mt-4 active:scale-95 transition-all">Salvar Lead</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Aula Experimental (Calendário) */}
      <AnimatePresence>
        {isExpModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-[90vw] h-[95vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <header className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/10 p-2 rounded-xl"><Calendar className="text-blue-500 w-5 h-5" /></div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Agendar Aula Experimental</h2>
                    <p className="text-xs text-slate-500 font-medium">Lead: {selectedLead?.nome}</p>
                  </div>
                </div>
                <button onClick={() => setIsExpModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </header>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                <form onSubmit={handleScheduleExp} className="w-full lg:w-[350px] border-r border-slate-100 p-8 overflow-y-auto space-y-8 bg-slate-50/30">
                   <div className="space-y-4">
                     <div>
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Professor</label>
                       <select required className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm" value={expData.professor_id} onChange={(e) => setExpData({...expData, professor_id: e.target.value})}>
                         <option value="">Selecione...</option>
                         {professores.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                       </select>
                     </div>
                     {expData.horario && (
                       <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                         <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Horário Selecionado</p>
                         <p className="text-sm font-bold text-slate-900">{expData.data}, {expData.horario.substring(0, 5)}</p>
                       </div>
                     )}
                   </div>
                </form>
                <div className="flex-1 p-8 bg-slate-100/50 flex flex-col">
                   <WeeklyCalendar 
                     mode="select" 
                     selectedSlot={{ data: expData.data, horario: expData.horario }}
                     onSelectSlot={(data, horario, sala_id) => setExpData({...expData, data, horario, sala_id})} 
                   />
                </div>
              </div>
              
              <footer className="p-6 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shadow-lg">
                <button onClick={() => setIsExpModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 text-sm">Cancelar</button>
                <button 
                  disabled={!expData.horario}
                  onClick={handleScheduleExp}
                  className="bg-blue-600 text-white px-8 py-2.5 rounded-xl font-black shadow-lg shadow-blue-300 text-sm active:scale-95 transition-all disabled:opacity-50"
                >
                  Confirmar Agendamento
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
