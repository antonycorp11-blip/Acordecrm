import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, Save, Music, Clock, CreditCard, Package, Cake, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WeeklyCalendar } from '../calendar/WeeklyCalendar';

interface AlunoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AlunoModal({ isOpen, onClose, onSuccess }: AlunoModalProps) {
  const [loading, setLoading] = useState(false);
  const [cursos, setCursos] = useState<any[]>([]);
  const [professores, setProfessores] = useState<any[]>([]);
  const [pacotes, setPacotes] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    data_nascimento: '',
    responsavel_nome: '',
    responsavel_telefone: '',
    responsavel_cpf: '',
    endereco: '',
    status: 'ativo',
    curso_id: '',
    professor_id: '',
    dia_semana: '',
    horario: '',
    sala_id: undefined as number | undefined,
    pacote_id: '',
    data_primeira_parcela: new Date().toISOString().split('T')[0],
    dia_vencimento: 10,
    total_parcelas: 12,
    is_emusys_legacy: false,
    emusys_aulas_feitas: 0,
    emusys_aulas_reposicao: 0,
    emusys_parcelas_pagas: 0,
    emusys_data_ultima_aula: ''
  });

  const calculateAge = (dateString: string) => {
    if (!dateString) return 0;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const isMinor = calculateAge(formData.data_nascimento) < 18 && formData.data_nascimento !== '';

  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('acorde_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      fetch('/api/cursos', { headers })
        .then(res => res.ok ? res.json() : [])
        .then(data => setCursos(Array.isArray(data) ? data : []))
        .catch(() => setCursos([]));
        
      fetch('/api/professores', { headers })
        .then(res => res.ok ? res.json() : [])
        .then(data => setProfessores(Array.isArray(data) ? data : []))
        .catch(() => setProfessores([]));
        
      fetch('/api/pacotes', { headers })
        .then(res => res.ok ? res.json() : [])
        .then(data => setPacotes(Array.isArray(data) ? data : []))
        .catch(() => setPacotes([]));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.curso_id || !formData.professor_id || !formData.horario || !formData.cpf || !formData.pacote_id) {
      alert('Por favor, preencha todos os campos obrigatórios (CPF, Plano, Curso, Professor e Horário)');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('acorde_token');
      const response = await fetch('/api/alunos', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        alert('Erro ao cadastrar aluno');
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-[90vw] h-[95vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <header className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-xl">
                  <User className="text-primary w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">Novo Aluno & Matrícula</h2>
                  <p className="text-xs text-slate-500 font-medium">Cadastre os dados e selecione o horário no calendário abaixo.</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* Sidebar do Formulário */}
              <form onSubmit={handleSubmit} className="w-full lg:w-[400px] border-r border-slate-100 p-8 overflow-y-auto space-y-8 bg-slate-50/30">
                <div className="space-y-6">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Dados Pessoais</h3>
                   <div className="space-y-4">
                     <div className="relative group">
                       <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                       <input 
                         required
                         type="text" 
                         placeholder="Nome Completo"
                         className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm"
                         value={formData.nome}
                          onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        />
                      </div>
                      <div className="relative group">
                        <Cake className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input 
                          type="date" 
                          placeholder="Data de Nascimento"
                          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm"
                          value={formData.data_nascimento}
                          onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">
                          Nascimento
                        </span>
                      </div>

                      <AnimatePresence>
                        {isMinor && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-4 overflow-hidden"
                          >
                            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl">
                              <p className="text-[10px] text-amber-700 font-bold uppercase tracking-tight">
                                Aluno menor de idade. Dados do responsável:
                              </p>
                            </div>
                            <div className="relative group">
                              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                              <input 
                                required={isMinor}
                                type="text" 
                                placeholder="Nome do Responsável"
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm"
                                value={formData.responsavel_nome}
                                onChange={(e) => setFormData({...formData, responsavel_nome: e.target.value})}
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="relative group">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input 
                                  required={isMinor}
                                  type="text" 
                                  placeholder="WhatsApp"
                                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm"
                                  value={formData.responsavel_telefone}
                                  onChange={(e) => setFormData({...formData, responsavel_telefone: e.target.value})}
                                />
                              </div>
                              <div className="relative group">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input 
                                  required={isMinor}
                                  type="text" 
                                  placeholder="CPF Responsável"
                                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm"
                                  value={formData.responsavel_cpf}
                                  onChange={(e) => setFormData({...formData, responsavel_cpf: e.target.value})}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative group">
                          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                          <input 
                            required
                            type="text" 
                            placeholder="CPF"
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm"
                            value={formData.cpf}
                            onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                          />
                        </div>
                        <div className="relative group">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                          <input 
                            required
                            type="text" 
                            placeholder="WhatsApp"
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm"
                            value={formData.telefone}
                            onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                          />
                        </div>
                     </div>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input 
                          type="email" 
                          placeholder="E-mail"
                          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                      <div className="relative group">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <input 
                          type="text" 
                          placeholder="Endereço Completo"
                          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm"
                          value={formData.endereco}
                          onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                        />
                      </div>
                    </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-primary/20 pb-2">Configuração da Aula</h3>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Selecione o Curso</label>
                      <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                        {cursos
                          .filter(c => !c.nome.includes('Black') && !c.nome.includes('Laranja') && !c.nome.includes('White'))
                          .map(curso => {
                          const isSelected = String(formData.curso_id) === String(curso.id);
                          return (
                            <button
                              key={curso.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, curso_id: curso.id })}
                              className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 group ${
                                isSelected 
                                  ? 'bg-primary/10 border-primary shadow-sm' 
                                  : 'bg-white border-slate-200 hover:border-primary/50'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-primary/20'
                              }`}>
                                <Music className="w-4 h-4" />
                              </div>
                              <span className={`text-[11px] font-bold leading-tight ${isSelected ? 'text-primary' : 'text-slate-600'}`}>
                                {curso.nome}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Selecione o Professor</label>
                      <div className="grid grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                        {professores.map(prof => {
                          const isSelected = String(formData.professor_id) === String(prof.id);
                          return (
                            <button
                              key={prof.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, professor_id: prof.id })}
                              className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 group ${
                                isSelected 
                                  ? 'bg-primary/10 border-primary shadow-sm' 
                                  : 'bg-white border-slate-200 hover:border-primary/50'
                              }`}
                            >
                              <div 
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black shadow-sm`}
                                style={{ backgroundColor: prof.cor_agenda || '#f97316' }}
                              >
                                {prof.nome.charAt(0)}
                              </div>
                              <span className={`text-[11px] font-bold leading-tight ${isSelected ? 'text-primary' : 'text-slate-600'}`}>
                                {prof.nome}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Selecione o Plano</label>
                      <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                        {pacotes.map(pacote => {
                          const isSelected = String(formData.pacote_id) === String(pacote.id);
                          return (
                            <button
                              key={pacote.id}
                              type="button"
                              onClick={() => setFormData({ ...formData, pacote_id: pacote.id })}
                              className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between group ${
                                isSelected 
                                  ? 'bg-emerald-50 border-emerald-500 shadow-sm' 
                                  : 'bg-white border-slate-200 hover:border-emerald-300'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                  isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                                }`}>
                                  <CreditCard className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className={`text-[11px] font-bold ${isSelected ? 'text-emerald-700' : 'text-slate-600'}`}>{pacote.nome}</p>
                                  <p className="text-[9px] text-slate-400 font-medium">{pacote.aulas_por_semana}x/semana - {pacote.duracao_aula_minutos}min</p>
                                </div>
                              </div>
                              <span className="text-xs font-black text-emerald-600">R$ {pacote.valor_mensal}</span>
                            </button>
                          );
                        })}
                      </div>
                      {pacotes.length === 0 && (
                        <p className="text-[10px] font-bold text-slate-400 italic">Crie planos na tela de Contratos primeiro.</p>
                      )}
                    </div>

                    {formData.horario && (
                      <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
                         <div>
                           <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Horário Selecionado</p>
                           <p className="text-sm font-bold text-slate-900">{formData.dia_semana}, {formData.horario.substring(0, 5)}</p>
                         </div>
                         <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      </div>
                    )}
                  </div>
                </div>
                    {formData.pacote_id && (
                      <div className="space-y-6 pt-6 border-t border-slate-200">
                        <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                           <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Configuração Financeira</h3>
                           <label className="flex items-center gap-2 cursor-pointer">
                              <span className="text-[9px] font-black text-slate-400 uppercase">Migração Legado</span>
                              <input 
                                type="checkbox" 
                                checked={formData.is_emusys_legacy}
                                onChange={(e) => setFormData({...formData, is_emusys_legacy: e.target.checked})}
                                className="w-4 h-4 rounded text-primary focus:ring-primary/20"
                              />
                           </label>
                        </div>

                        <AnimatePresence>
                          {formData.is_emusys_legacy && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="bg-primary/5 border border-primary/10 p-4 rounded-2xl space-y-4 mb-4"
                            >
                              <p className="text-[9px] font-black text-primary uppercase tracking-widest">Dados do Sistema Antigo (Emusys)</p>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Aulas já Feitas</label>
                                  <input 
                                    type="number"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium"
                                    value={formData.emusys_aulas_feitas}
                                    onChange={(e) => setFormData({...formData, emusys_aulas_feitas: Number(e.target.value)})}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">A Repor (Saldo)</label>
                                  <input 
                                    type="number"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium"
                                    value={formData.emusys_aulas_reposicao}
                                    onChange={(e) => setFormData({...formData, emusys_aulas_reposicao: Number(e.target.value)})}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Parcelas Pagas</label>
                                  <input 
                                    type="number"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium"
                                    value={formData.emusys_parcelas_pagas}
                                    onChange={(e) => setFormData({...formData, emusys_parcelas_pagas: Number(e.target.value)})}
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Data Última Aula</label>
                                  <input 
                                    type="date"
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium"
                                    value={formData.emusys_data_ultima_aula}
                                    onChange={(e) => setFormData({...formData, emusys_data_ultima_aula: e.target.value})}
                                  />
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Data da 1ª Parcela (Acorde)</label>
                            <input 
                              type="date"
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20"
                              value={formData.data_primeira_parcela}
                              onChange={(e) => setFormData({...formData, data_primeira_parcela: e.target.value})}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Dia de Vencimento</label>
                              <input 
                                type="number"
                                min="1" max="31"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20"
                                value={formData.dia_vencimento}
                                onChange={(e) => setFormData({...formData, dia_vencimento: Number(e.target.value)})}
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nº Total Parcelas</label>
                              <input 
                                type="number"
                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20"
                                value={formData.total_parcelas}
                                onChange={(e) => setFormData({...formData, total_parcelas: Number(e.target.value)})}
                              />
                            </div>
                          </div>
                          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                             <div className="flex justify-between items-center mb-1">
                               <span className="text-[10px] font-black text-emerald-600 uppercase">Valor por Parcela</span>
                               <span className="text-sm font-black text-emerald-700">
                                 R$ {pacotes.find(p => p.id === Number(formData.pacote_id))?.valor_mensal || 0}
                               </span>
                             </div>
                             <p className="text-[9px] text-emerald-600/70 font-bold leading-tight">As parcelas serão geradas automaticamente no financeiro.</p>
                          </div>
                        </div>
                      </div>
                    )}
              </form>

              {/* Calendário de Seleção e Preview */}
              <div className="flex-1 p-8 bg-slate-100/50 flex flex-col overflow-y-auto custom-scrollbar">
                {!formData.pacote_id ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
                     <div className="bg-white p-6 rounded-full shadow-xl shadow-slate-200/50">
                        <Package className="w-12 h-12 text-slate-300 animate-pulse" />
                     </div>
                     <div>
                       <h3 className="text-xl font-black text-slate-900">Selecione um Plano</h3>
                       <p className="text-sm text-slate-500 max-w-xs mx-auto">Você precisa escolher um plano de aulas antes de selecionar o horário na agenda.</p>
                     </div>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Selecione o Horário de Início</h3>
                      <div className="flex items-center gap-4 text-[10px] font-bold">
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-white border border-slate-300 rounded"></div> Disponível</div>
                        <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-orange-500 rounded"></div> Ocupado</div>
                      </div>
                    </div>
                    <div className="min-h-[400px] bg-white rounded-3xl p-4 shadow-sm border border-slate-200/50 mb-8">
                      <WeeklyCalendar 
                        mode="select"
                        selectedSlot={{ data: formData.dia_semana, horario: formData.horario }}
                        onSelectSlot={(data, horario, sala_id) => {
                          setFormData({ ...formData, dia_semana: data, horario, sala_id });
                        }}
                      />
                    </div>

                    {formData.horario && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Resumo das Aulas (Reserva Automática)</h3>
                          <span className="bg-primary/10 text-primary px-3 py-1 rounded-lg text-[10px] font-black uppercase">
                            {pacotes.find(p => p.id === Number(formData.pacote_id))?.total_aulas} Aulas Agendadas
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          {Array.from({ length: pacotes.find(p => p.id === Number(formData.pacote_id))?.total_aulas || 0 }).map((_, i) => {
                            const date = new Date(formData.dia_semana);
                            date.setDate(date.getDate() + (i * 7));
                            return (
                              <div key={i} className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm text-center">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Aula {i + 1}</p>
                                <p className="text-xs font-black text-slate-700">{date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                                <p className="text-[9px] font-bold text-primary mt-1">{formData.horario.substring(0, 5)}</p>
                              </div>
                            );
                          })}
                        </div>

                        <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl">
                           <div className="flex items-start gap-4">
                              <div className="bg-amber-500 p-2 rounded-xl text-white">
                                <Clock className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-amber-900">Atenção ao Cronograma</h4>
                                <p className="text-xs text-amber-800/70 font-medium leading-relaxed mt-1">
                                  Ao finalizar, o sistema irá bloquear automaticamente estes <strong>{pacotes.find(p => p.id === Number(formData.pacote_id))?.total_aulas} horários</strong> na agenda do professor e na sala selecionada.
                                </p>
                              </div>
                           </div>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
              </div>
            </div>

            <footer className="p-6 border-t border-slate-100 bg-white flex items-center justify-end gap-3 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
              <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all text-sm">Cancelar</button>
              <button 
                disabled={loading || !formData.horario || !formData.pacote_id}
                onClick={handleSubmit}
                className="bg-primary text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/30 text-sm active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? 'Processando...' : <><Save className="w-4 h-4" /> Finalizar Matrícula e Gerar Agenda</>}
              </button>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  );
}
