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
    <div className="flex flex-col flex-1 animate-in fade-in duration-500 overflow-hidden h-screen">
      <header className="h-24 px-8 frosted-bg border-b border-slate-200/50 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Atendimento & CRM</h1>
          <p className="text-sm font-medium text-slate-500">Transforme interessados em alunos matriculados.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-black hover:bg-primary-dark transition-all shadow-lg shadow-orange-200 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Novo Lead
          </button>
        </div>
      </header>

      <div className="p-8 space-y-6 flex-1 overflow-auto">
        <div className="flex items-center gap-4 border-b border-slate-200">
           <button 
             onClick={() => setActiveTab('leads')}
             className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative ${
               activeTab === 'leads' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
             }`}
           >
             Leads (Interessados)
             {activeTab === 'leads' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
           </button>
           <button 
             onClick={() => setActiveTab('vagas')}
             className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative ${
               activeTab === 'vagas' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
             }`}
           >
             Busca de Vagas
             {activeTab === 'vagas' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
           </button>
           <button 
             onClick={() => setActiveTab('experimentais')}
             className={`pb-4 px-2 text-sm font-black uppercase tracking-widest transition-all relative ${
               activeTab === 'experimentais' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
             }`}
           >
             Calendário Experimental
             {activeTab === 'experimentais' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />}
           </button>
        </div>

        {activeTab === 'leads' && (
          <div className="space-y-6">
            {/* Seção de Lembretes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {experimentaisPendentes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
                    <Clock className="w-3 h-3 text-primary" /> Confirmar Hoje / Próximas
                  </h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                    {experimentaisPendentes.map((exp) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={exp.id}
                        className="glass-card p-4 border-primary/20 bg-primary/5 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-primary text-xs shadow-sm">
                            {exp.horario ? exp.horario.substring(0, 5) : '--:--'}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900">{exp.leads?.nome}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">{exp.cursos?.nome} • Prof. {exp.professores?.nome}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => sendReminder(exp)}
                          className="bg-emerald-500 text-white p-2.5 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 active:scale-95"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2">
                  <Users className="w-3 h-3 text-blue-500" /> Pós-Aula: Aguardando Matrícula
                </h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                  {leads.filter(l => l.status === 'experimental_concluida').length > 0 ? (
                    leads.filter(l => l.status === 'experimental_concluida').map((lead) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={lead.id}
                        className="glass-card p-4 border-blue-200 bg-blue-50 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-blue-600 text-xs shadow-sm">
                            <Check className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900">{lead.nome}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Aula Realizada • {lead.cursos?.nome}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const msg = `Olá ${lead.nome}! Gostamos muito de ter você aqui na Acorde! 😊 O que achou da aula? Vamos dar o próximo passo e garantir sua vaga na turma?`;
                            const phone = (lead.telefone || '').replace(/\D/g, '');
                            window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                          }}
                          className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))
                  ) : (
                    <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                      <p className="text-[10px] font-bold text-slate-300 uppercase">Nenhum lead em pós-venda</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['novo', 'em_contato', 'experimental_agendada'].map((status) => (
              <div key={status} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {status.replace('_', ' ')}
                  </h3>
                  <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {leads.filter(l => l.status === status).length}
                  </span>
                </div>
                
                <div className="space-y-3">
                  {leads.filter(l => l.status === status).map((lead) => (
                    <motion.div 
                      layout
                      key={lead.id} 
                      className="glass-card p-4 hover:border-primary/30 cursor-pointer group transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded uppercase tracking-tighter border border-blue-100">
                          {lead.cursos?.nome || 'Curso Indefinido'}
                        </span>
                        <button className="text-slate-300 hover:text-slate-500"><MoreVertical className="w-4 h-4" /></button>
                      </div>
                      <h4 className="font-bold text-slate-900">{lead.nome}</h4>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {lead.telefone}
                      </p>
                      
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button 
                          onClick={() => {
                            setSelectedLead(lead);
                            setExpData({ ...expData, lead_id: lead.id, curso_id: lead.curso_id });
                            setIsExpModalOpen(true);
                          }}
                          className="text-[10px] font-black text-primary flex items-center gap-1 hover:underline"
                        >
                          <Calendar className="w-3 h-3" /> Agendar Aula
                        </button>
                        <button className="text-slate-400 group-hover:translate-x-1 transition-all">
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  
                  {leads.filter(l => l.status === status).length === 0 && (
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center">
                       <p className="text-[10px] font-bold text-slate-400">Nenhum lead aqui</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            </div>
          </div>
        )}

        {activeTab === 'vagas' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Music className="w-3 h-3" /> 1. Escolha o Instrumento
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                   {cursos
                     .filter(c => !c.nome.includes('Black') && !c.nome.includes('Laranja') && !c.nome.includes('White'))
                     .map(c => c.nome)
                     .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates if any
                     .map(inst => (
                     <button
                       key={inst}
                       onClick={() => { setSearchInstrumento(inst); if(searchDia) handleSearchVagas(inst, searchDia); }}
                       className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                         searchInstrumento === inst 
                           ? 'bg-primary border-primary shadow-lg shadow-primary/30 scale-105' 
                           : 'bg-white border-slate-100 hover:border-primary/30'
                       }`}
                     >
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center ${searchInstrumento === inst ? 'bg-white/20' : 'bg-slate-50'}`}>
                         <Music className={`w-5 h-5 ${searchInstrumento === inst ? 'text-white' : 'text-slate-400'}`} />
                       </div>
                       <span className={`text-xs font-black text-center line-clamp-1 ${searchInstrumento === inst ? 'text-white' : 'text-slate-600'}`} title={inst}>{inst}</span>
                     </button>
                   ))}
                </div>
             </div>

             <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> 2. Escolha o Dia da Semana
                </h3>
                <div className="flex flex-wrap gap-2">
                   {['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].map(dia => (
                     <button
                       key={dia}
                       onClick={() => { setSearchDia(dia); if(searchInstrumento) handleSearchVagas(searchInstrumento, dia); }}
                       className={`px-6 py-3 rounded-xl font-bold text-sm transition-all border-2 ${
                         searchDia === dia 
                           ? 'bg-slate-900 border-slate-900 text-white shadow-xl' 
                           : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                       }`}
                     >
                       {dia.charAt(0).toUpperCase() + dia.slice(1)}
                     </button>
                   ))}
                </div>
             </div>

             {searchInstrumento && searchDia && (
               <motion.div 
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 className="glass-card p-8 border-primary/20 relative overflow-hidden"
               >
                  <div className="absolute top-0 right-0 p-4">
                     <div className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                        Sincronizado com Emusys
                     </div>
                  </div>

                  <h4 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <CheckCircle2 className="text-emerald-500" /> Vagas Encontradas
                  </h4>

                  {searchingVagas ? (
                    <div className="py-12 text-center text-slate-400 font-bold">Buscando horários disponíveis...</div>
                  ) : vagasResult.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 font-bold">Nenhuma vaga encontrada para este critério.</div>
                  ) : (
                    <div className="space-y-6">
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {vagasResult.map((item, idx) => (
                            <div key={idx} className="bg-white/50 border border-slate-100 p-4 rounded-2xl">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Prof. {item.professor}</p>
                               <div className="flex flex-wrap gap-2">
                                  {item.vagas.map((h: string) => (
                                    <span key={h} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold border border-emerald-100 flex items-center gap-1">
                                      <Clock className="w-3 h-3" /> {h}
                                    </span>
                                  ))}
                               </div>
                            </div>
                          ))}
                       </div>

                       <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Visualização do Texto</p>
                          <textarea 
                            readOnly 
                            className="w-full h-32 text-sm text-slate-600 font-medium bg-slate-50 p-4 rounded-xl border border-slate-100 resize-none focus:outline-none"
                            value={generateText()}
                          />
                       </div>

                       <div className="mt-4 p-6 bg-slate-900 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl shadow-slate-200">
                          <div className="flex items-center gap-4 text-white">
                             <div className="bg-emerald-500 p-3 rounded-xl shadow-lg shadow-emerald-500/30">
                                <MessageCircle className="w-6 h-6" />
                             </div>
                             <div>
                                <p className="text-xs font-bold text-slate-400">Pronto para enviar!</p>
                                <p className="text-sm font-black">Copie o texto formatado para o WhatsApp</p>
                             </div>
                          </div>
                          <button 
                            onClick={copyToWhatsApp}
                            className="bg-white text-slate-900 px-8 py-3 rounded-xl font-black hover:bg-emerald-50 active:scale-95 transition-all shadow-lg flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" /> Copiar Texto
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
