import React, { useState, useEffect } from 'react';
import { X, User, Phone, MapPin, Mail, CreditCard, Music, Clock, Save, Zap, Users, AlertTriangle, ChevronLeft, ChevronRight, Search, Cake, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AlunoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const HOURS = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];

export function AlunoModal({ isOpen, onClose, onSuccess }: AlunoModalProps) {
  const [loading, setLoading] = useState(false);
  const [cursos, setCursos] = useState<any[]>([]);
  const [professores, setProfessores] = useState<any[]>([]);
  const [pacotes, setPacotes] = useState<any[]>([]);
  const [aulas, setAulas] = useState<any[]>([]);
  const [semanaOffset, setSemanaOffset] = useState(0);
  const [agendaLoading, setAgendaLoading] = useState(false);
  
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
    emusys_original_aulas: 48,
    emusys_aulas_feitas: 0,
    emusys_original_parcelas: 12,
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

  const currentBaseDate = new Date();
  currentBaseDate.setDate(currentBaseDate.getDate() + semanaOffset);
  
  const getDisplayDate = (offset: number) => {
    const d = new Date(currentBaseDate);
    d.setDate(d.getDate() + offset);
    return d;
  };

  const mesAno = currentBaseDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();

  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('acorde_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      fetch('/api/cursos', { headers })
        .then(res => res.ok ? res.json() : [])
        .then(data => setCursos(Array.isArray(data) ? data : []));
        
      fetch('/api/professores', { headers })
        .then(res => res.ok ? res.json() : [])
        .then(data => setProfessores(Array.isArray(data) ? data : []));
        
      fetch('/api/pacotes', { headers })
        .then(res => res.ok ? res.json() : [])
        .then(data => setPacotes(Array.isArray(data) ? data : []));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('acorde_token');
      const headers = { Authorization: `Bearer ${token}` };
      setAgendaLoading(true);
      const start = getDisplayDate(0).toISOString().split('T')[0];
      
      fetch(`/api/agenda?date=${start}`, { headers })
        .then(r => r.ok ? r.json() : [])
        .then(data => setAulas(Array.isArray(data) ? data : []))
        .finally(() => setAgendaLoading(false));
    }
  }, [isOpen, semanaOffset]);

  useEffect(() => {
    if (formData.pacote_id) {
      const selectedPacote = pacotes.find(p => String(p.id) === String(formData.pacote_id));
      if (selectedPacote) {
        const name = selectedPacote.nome.toLowerCase();
        if (name.includes('legado') || name.includes('emusys')) {
          setFormData(prev => ({ ...prev, is_emusys_legacy: true }));
        }
      }
    }
  }, [formData.pacote_id, pacotes]);

  const getAulaForProfHour = (profId: number, hour: string) => {
    return aulas.filter(a => {
      const h = (a.horario || '').substring(0, 5);
      return a.professor_id === profId && h === hour;
    });
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        .retro-font { font-family: 'Space Mono', monospace; }
        .shadow-hard { box-shadow: 6px 6px 0px 0px rgba(0, 0, 0, 1); }
        .shadow-hard-white { box-shadow: 6px 6px 0px 0px rgba(255, 255, 255, 0.2); }
        .pixel-border { border: 4px solid white; }
        .sticker-card { border: 3px solid black; box-shadow: 6px 6px 0px 0px rgba(0,0,0,1); }
      `}</style>

      <motion.main 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-7xl bg-[#1A1A1A] border-4 border-white rounded-none p-6 md:p-10 shadow-hard-white relative z-10 retro-font text-white my-8"
      >
        {/* Header Section */}
        <div className="flex justify-between items-start mb-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#FF8A00] border-4 border-black flex items-center justify-center text-3xl shadow-hard">
              👤
            </div>
            <div>
              <h1 className="text-3xl font-bold uppercase tracking-tighter">Novo Aluno & Matrícula</h1>
              <p className="text-[#FF8A00] text-sm mt-1 uppercase tracking-widest">&gt;&gt; CADASTRO DE NOVO INTEGRANTE DA BANDA</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="bg-red-600 border-4 border-black p-2 hover:bg-red-500 shadow-hard transition-all active:translate-y-1"
          >
            <X className="w-8 h-8" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column */}
          <section className="lg:col-span-4 space-y-6">
            <div className="sticker-card bg-[#FDF9F0] p-6 -rotate-1 text-black">
              <h2 className="font-bold uppercase mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                <span>📝</span> Dados Pessoais
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase">Nome Completo</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-white border-2 border-black px-3 py-2 text-sm focus:outline-none"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase">Nascimento</label>
                    <input 
                      type="date" 
                      className="w-full bg-white border-2 border-black px-3 py-2 text-sm focus:outline-none"
                      value={formData.data_nascimento}
                      onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase">WhatsApp</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-white border-2 border-black px-3 py-2 text-sm focus:outline-none"
                      value={formData.telefone}
                      onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    />
                  </div>
                </div>
                
                <AnimatePresence>
                  {isMinor && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 overflow-hidden bg-orange-100 p-3 border-2 border-black">
                      <p className="text-[9px] font-bold uppercase text-orange-800">Responsável (Aluno Menor)</p>
                      <input placeholder="NOME RESPONSÁVEL" className="w-full bg-white border-2 border-black px-2 py-1 text-xs" value={formData.responsavel_nome} onChange={(e) => setFormData({...formData, responsavel_nome: e.target.value})} />
                      <div className="grid grid-cols-2 gap-2">
                        <input placeholder="CPF RESP" className="w-full bg-white border-2 border-black px-2 py-1 text-xs" value={formData.responsavel_cpf} onChange={(e) => setFormData({...formData, responsavel_cpf: e.target.value})} />
                        <input placeholder="WHATSAPP RESP" className="w-full bg-white border-2 border-black px-2 py-1 text-xs" value={formData.responsavel_telefone} onChange={(e) => setFormData({...formData, responsavel_telefone: e.target.value})} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div>
                  <label className="block text-[10px] font-bold uppercase">CPF</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-white border-2 border-black px-3 py-2 text-sm focus:outline-none"
                    value={formData.cpf}
                    onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase">E-mail</label>
                  <input 
                    type="email" 
                    className="w-full bg-white border-2 border-black px-3 py-2 text-sm focus:outline-none"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase">Endereço</label>
                  <input 
                    type="text" 
                    className="w-full bg-white border-2 border-black px-3 py-2 text-sm focus:outline-none"
                    value={formData.endereco}
                    onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Course Selection */}
            <div className="sticker-card bg-[#3D2B1F] p-6 rotate-1">
              <h2 className="text-white font-bold uppercase mb-4 border-b-2 border-white pb-2 flex items-center gap-2">
                <span>🎸</span> Instrumento & Curso
              </h2>
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                {cursos.filter(c => !['Black','Laranja','White'].some(x => c.nome.includes(x))).map(curso => (
                  <button
                    key={curso.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, curso_id: curso.id })}
                    className={`font-bold py-2 border-4 border-black shadow-hard transition-all ${
                      formData.curso_id === curso.id 
                        ? 'bg-[#FF8A00] text-black translate-x-1 translate-y-1 shadow-none' 
                        : 'bg-white text-black hover:bg-[#FF8A00]/20'
                    }`}
                  >
                    {curso.nome.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Plan Selection */}
            <div className="sticker-card bg-[#00FF41] p-6 -rotate-1 text-black">
              <h2 className="font-bold uppercase mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                <span>💰</span> Plano de Aulas
              </h2>
              <div className="space-y-3">
                {pacotes.map(pacote => (
                  <button
                    key={pacote.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, pacote_id: pacote.id })}
                    className={`w-full p-3 border-4 border-black shadow-hard text-left transition-all ${
                      formData.pacote_id === pacote.id
                        ? 'bg-black text-white translate-x-1 translate-y-1 shadow-none'
                        : 'bg-white hover:bg-black/5'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold">{pacote.nome.toUpperCase()}</span>
                      <span className="text-sm font-black">R$ {pacote.valor_mensal}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Legacy Migration */}
            {formData.is_emusys_legacy && (
              <div className="sticker-card bg-[#FF8A00] p-6 rotate-1 text-black">
                <h2 className="font-bold uppercase mb-4 border-b-2 border-black pb-2">💾 Migração Emusys</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase">Aulas Originais</label>
                      <select 
                        className="w-full bg-white border-2 border-black px-2 py-1 text-xs"
                        value={formData.emusys_original_aulas}
                        onChange={(e) => setFormData({...formData, emusys_original_aulas: Number(e.target.value)})}
                      >
                        <option value={24}>24 AULAS</option>
                        <option value={48}>48 AULAS</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase">Aulas Feitas</label>
                      <input type="number" className="w-full bg-white border-2 border-black px-2 py-1 text-xs" value={formData.emusys_aulas_feitas} onChange={(e) => setFormData({...formData, emusys_aulas_feitas: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase">Parcelas Originais</label>
                      <select 
                        className="w-full bg-white border-2 border-black px-2 py-1 text-xs"
                        value={formData.emusys_original_parcelas}
                        onChange={(e) => setFormData({...formData, emusys_original_parcelas: Number(e.target.value)})}
                      >
                        <option value={6}>6 PARCELAS</option>
                        <option value={12}>12 PARCELAS</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase">Pagas</label>
                      <input type="number" className="w-full bg-white border-2 border-black px-2 py-1 text-xs" value={formData.emusys_parcelas_pagas} onChange={(e) => setFormData({...formData, emusys_parcelas_pagas: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase">Data Última Aula</label>
                    <input type="date" className="w-full bg-white border-2 border-black px-2 py-1 text-xs" value={formData.emusys_data_ultima_aula} onChange={(e) => setFormData({...formData, emusys_data_ultima_aula: e.target.value})} />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Right Column - Agenda */}
          <section className="lg:col-span-8">
            <div className="sticker-card bg-white p-6 h-full text-black">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="font-bold uppercase text-xl">Selecione o Horário</h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1"><span className="w-3 h-3 bg-white border-2 border-black"></span> <span className="text-[10px] font-bold">LIVRE</span></div>
                  <div className="flex items-center gap-1"><span className="w-3 h-3 bg-[#FF8A00] border-2 border-black"></span> <span className="text-[10px] font-bold">OCUPADO</span></div>
                  <div className={`flex items-center gap-1 ${formData.horario ? 'animate-bounce' : 'opacity-20'}`}><span className="w-3 h-3 bg-[#00FF41] border-2 border-black"></span> <span className="text-[10px] font-bold">SELECIONADO</span></div>
                </div>
              </div>

              {/* Calendar Controls */}
              <div className="flex items-center justify-between mb-4 bg-gray-100 border-2 border-black p-2">
                <div className="flex gap-2">
                  <button onClick={() => setSemanaOffset(o => o - 1)} className="border-2 border-black px-2 hover:bg-black hover:text-white">&lt;</button>
                  <div className="font-bold uppercase text-sm px-4">{mesAno}</div>
                  <button onClick={() => setSemanaOffset(o => o + 1)} className="border-2 border-black px-2 hover:bg-black hover:text-white">&gt;</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSemanaOffset(0)} className="bg-[#FF8A00] text-black font-bold text-[10px] px-3 py-1 border-2 border-black">HOJE</button>
                </div>
              </div>

              {/* Schedule Table */}
              <div className="overflow-auto border-2 border-black max-h-[60vh] relative">
                {agendaLoading && (
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-50 flex items-center justify-center">
                    <span className="font-bold text-xs animate-pulse">SINCRONIZANDO...</span>
                  </div>
                )}
                <table className="w-full text-[10px] border-collapse">
                  <thead className="sticky top-0 z-40 bg-gray-200 border-b-2 border-black">
                    <tr>
                      <th className="p-3 border-r-2 border-black text-left sticky left-0 bg-gray-200 min-w-[120px]">PROFESSOR</th>
                      {HOURS.map(h => (
                        <th key={h} className="p-2 border-r border-black min-w-[80px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {professores.map((prof) => (
                      <tr key={prof.id} className="border-b border-gray-300">
                        <td className="p-3 font-bold border-r-2 border-black sticky left-0 bg-white z-10 flex items-center gap-2">
                           <div className="w-3 h-3 border border-black shadow-sm" style={{ background: prof.cor_agenda || '#FF8A00' }}></div>
                           <span className="truncate w-full">{prof.nome.toUpperCase()}</span>
                        </td>
                        {HOURS.map(h => {
                          const aulasNoHorario = getAulaForProfHour(prof.id, h);
                          const isOccupied = aulasNoHorario.length > 0;
                          const isSelected = formData.professor_id === prof.id && formData.horario === `${h}:00` && formData.dia_semana === getDisplayDate(0).toISOString().split('T')[0];
                          
                          return (
                            <td 
                              key={h} 
                              onClick={() => {
                                if (!isOccupied) {
                                  setFormData({
                                    ...formData,
                                    professor_id: prof.id,
                                    horario: `${h}:00`,
                                    dia_semana: getDisplayDate(0).toISOString().split('T')[0]
                                  });
                                }
                              }}
                              className={`p-2 border-r border-gray-300 transition-all cursor-pointer h-12 ${
                                isOccupied ? 'bg-[#FF8A00] cursor-not-allowed opacity-50' : 
                                isSelected ? 'bg-[#00FF41] border-2 border-black' : 
                                'hover:bg-[#00FF41]/20'
                              }`}
                            >
                              {isOccupied && <div className="text-[8px] font-black text-white leading-tight">{aulasNoHorario[0].aluno_nome?.split(' ')[0]}</div>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary Banner */}
              {formData.horario && (
                <div className="mt-8 p-4 bg-[#00FF41] text-black border-4 border-black font-bold text-center uppercase tracking-widest shadow-hard flex items-center justify-between">
                  <span>AGENDA SELECIONADA: {getDisplayDate(0).toLocaleDateString('pt-BR')} ÀS {formData.horario.substring(0, 5)}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-black border border-white"></div>
                    <span className="text-xs">PROF. {professores.find(p => p.id === formData.professor_id)?.nome.split(' ')[0].toUpperCase()}</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer Actions */}
        <footer className="mt-10 pt-8 border-t-4 border-white flex flex-col md:flex-row justify-end items-center gap-4">
          <button 
            onClick={onClose}
            className="w-full md:w-auto px-10 py-3 bg-transparent text-white font-bold uppercase hover:underline decoration-[#FF8A00] decoration-4"
          >
            Cancelar
          </button>
          <button 
            disabled={loading || !formData.horario || !formData.pacote_id}
            onClick={handleSubmit}
            className="w-full md:w-auto px-10 py-4 bg-[#FF8A00] text-black font-bold uppercase border-4 border-black shadow-hard hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? 'SINCRONIZANDO...' : <><span>💾</span> Finalizar Matrícula & Gerar Agenda</>}
          </button>
        </footer>
      </motion.main>
    </div>
  );
}
