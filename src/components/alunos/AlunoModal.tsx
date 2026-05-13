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
    valor_parcela: 0,
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
        const isLegacy = name.includes('legado') || name.includes('emusys');
        setFormData(prev => ({ 
          ...prev, 
          is_emusys_legacy: isLegacy,
          valor_parcela: selectedPacote.valor_mensal || 0,
          total_parcelas: selectedPacote.total_parcelas || 12
        }));
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/90 backdrop-blur-md overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        .retro-font { font-family: 'Space Mono', monospace; }
        .shadow-hard { box-shadow: 4px 4px 0px 0px rgba(0, 0, 0, 1); }
        .shadow-hard-white { box-shadow: 4px 4px 0px 0px rgba(255, 255, 255, 0.2); }
        .pixel-border { border: 4px solid white; }
        .sticker-card { border: 2px solid black; box-shadow: 4px 4px 0px 0px rgba(0,0,0,1); }
      `}</style>

      <motion.main 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-[98vw] max-w-[1800px] h-[95vh] bg-[#1A1A1A] border-4 border-white rounded-none flex flex-col shadow-hard-white relative z-10 retro-font text-white"
      >
        {/* Header Section */}
        <div className="flex justify-between items-center p-4 border-b-4 border-white shrink-0 bg-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF8A00] border-2 border-black flex items-center justify-center text-xl shadow-hard">
              👤
            </div>
            <div>
              <h1 className="text-xl font-bold uppercase tracking-tighter">Matrícula</h1>
              <p className="text-[#FF8A00] text-[8px] uppercase tracking-widest">&gt;&gt; NOVO ALUNO</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="bg-red-600 border-2 border-black p-1 hover:bg-red-500 shadow-hard transition-all active:translate-y-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column */}
            <section className="lg:col-span-4 space-y-4">
              <div className="sticker-card bg-[#FDF9F0] p-4 text-black">
                <h2 className="text-[11px] font-bold uppercase mb-3 border-b border-black pb-1 flex items-center gap-2">
                  <span>📝</span> Dados Pessoais
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[8px] font-bold uppercase">Nome Completo</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-white border border-black px-2 py-1 text-xs focus:outline-none"
                      value={formData.nome}
                      onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] font-bold uppercase">Nascimento</label>
                      <input 
                        type="date" 
                        className="w-full bg-white border border-black px-2 py-1 text-xs focus:outline-none"
                        value={formData.data_nascimento}
                        onChange={(e) => setFormData({...formData, data_nascimento: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold uppercase">WhatsApp</label>
                      <input 
                        required
                        type="text" 
                        className="w-full bg-white border border-black px-2 py-1 text-xs focus:outline-none"
                        value={formData.telefone}
                        onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {isMinor && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 overflow-hidden bg-orange-100 p-2 border border-black">
                        <p className="text-[7px] font-bold uppercase text-orange-800">Responsável</p>
                        <input placeholder="NOME" className="w-full bg-white border border-black px-2 py-1 text-[10px]" value={formData.responsavel_nome} onChange={(e) => setFormData({...formData, responsavel_nome: e.target.value})} />
                        <div className="grid grid-cols-2 gap-2">
                          <input placeholder="CPF" className="w-full bg-white border border-black px-2 py-1 text-[10px]" value={formData.responsavel_cpf} onChange={(e) => setFormData({...formData, responsavel_cpf: e.target.value})} />
                          <input placeholder="FONE" className="w-full bg-white border border-black px-2 py-1 text-[10px]" value={formData.responsavel_telefone} onChange={(e) => setFormData({...formData, responsavel_telefone: e.target.value})} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] font-bold uppercase">CPF</label>
                      <input 
                        required
                        type="text" 
                        className="w-full bg-white border border-black px-2 py-1 text-xs focus:outline-none"
                        value={formData.cpf}
                        onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold uppercase">E-mail</label>
                      <input 
                        type="email" 
                        className="w-full bg-white border border-black px-2 py-1 text-xs focus:outline-none"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold uppercase">Endereço</label>
                    <input 
                      type="text" 
                      className="w-full bg-white border border-black px-2 py-1 text-xs focus:outline-none"
                      value={formData.endereco}
                      onChange={(e) => setFormData({...formData, endereco: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Course Selection */}
              <div className="sticker-card bg-[#3D2B1F] p-4">
                <h2 className="text-white text-[11px] font-bold uppercase mb-3 border-b border-white pb-1 flex items-center gap-2">
                  <span>🎸</span> Curso
                </h2>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                  {cursos.filter(c => !['Black','Laranja','White'].some(x => c.nome.includes(x))).map(curso => (
                    <button
                      key={curso.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, curso_id: curso.id })}
                      className={`font-bold py-1.5 border-2 border-black shadow-hard transition-all text-[10px] ${
                        formData.curso_id === curso.id 
                          ? 'bg-[#FF8A00] text-black translate-x-0.5 translate-y-0.5 shadow-none' 
                          : 'bg-white text-black hover:bg-[#FF8A00]/20'
                      }`}
                    >
                      {curso.nome.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plan Selection */}
              <div className="sticker-card bg-[#00FF41] p-4 text-black">
                <h2 className="text-[11px] font-bold uppercase mb-3 border-b border-black pb-1 flex items-center gap-2">
                  <span>💰</span> Plano
                </h2>
                <div className="space-y-2">
                  {pacotes.map(pacote => (
                    <button
                      key={pacote.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, pacote_id: pacote.id })}
                      className={`w-full p-2 border-2 border-black shadow-hard text-left transition-all ${
                        formData.pacote_id === pacote.id
                          ? 'bg-black text-white translate-x-0.5 translate-y-0.5 shadow-none'
                          : 'bg-white hover:bg-black/5'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold">{pacote.nome.toUpperCase()}</span>
                        <span className="text-[10px] font-black">R$ {pacote.valor_mensal}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Legacy Migration */}
              {formData.is_emusys_legacy && (
                <div className="sticker-card bg-[#FF8A00] p-4 text-black">
                  <h2 className="text-[11px] font-bold uppercase mb-3 border-b border-black pb-1">💾 Legado</h2>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[7px] font-bold uppercase">Aulas Orig.</label>
                        <select 
                          className="w-full bg-white border border-black px-1 py-1 text-[10px]"
                          value={formData.emusys_original_aulas}
                          onChange={(e) => setFormData({...formData, emusys_original_aulas: Number(e.target.value)})}
                        >
                          <option value={24}>24</option>
                          <option value={48}>48</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[7px] font-bold uppercase">Feitas</label>
                        <input type="number" className="w-full bg-white border border-black px-1 py-1 text-[10px]" value={formData.emusys_aulas_feitas} onChange={(e) => setFormData({...formData, emusys_aulas_feitas: Number(e.target.value)})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[7px] font-bold uppercase">Parc. Orig.</label>
                        <select 
                          className="w-full bg-white border border-black px-1 py-1 text-[10px]"
                          value={formData.emusys_original_parcelas}
                          onChange={(e) => setFormData({...formData, emusys_original_parcelas: Number(e.target.value)})}
                        >
                          <option value={6}>6</option>
                          <option value={12}>12</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[7px] font-bold uppercase">Pagas</label>
                        <input type="number" className="w-full bg-white border border-black px-1 py-1 text-[10px]" value={formData.emusys_parcelas_pagas} onChange={(e) => setFormData({...formData, emusys_parcelas_pagas: Number(e.target.value)})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[7px] font-bold uppercase block">Valor Parcela (R$)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          className="w-full bg-white border border-black px-1 py-1 text-[10px]" 
                          value={formData.valor_parcela} 
                          onChange={(e) => setFormData({...formData, valor_parcela: Number(e.target.value)})} 
                        />
                      </div>
                      <div>
                        <label className="text-[7px] font-bold uppercase block">Data Última Aula</label>
                        <input 
                          type="date" 
                          className="w-full bg-white border border-black px-1 py-1 text-[10px]" 
                          value={formData.emusys_data_ultima_aula} 
                          onChange={(e) => setFormData({...formData, emusys_data_ultima_aula: e.target.value})} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Right Column - Agenda */}
            <section className="lg:col-span-8 flex flex-col h-full">
              <div className="sticker-card bg-white p-4 h-full text-black flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-bold uppercase text-[14px]">Agenda de Aulas</h2>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-white border border-black"></span> <span className="text-[7px] font-bold">LIVRE</span></div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#FF8A00] border border-black"></span> <span className="text-[7px] font-bold">OCUP.</span></div>
                    <div className="flex items-center gap-1"><span className="w-2 h-2 bg-[#00FF41] border border-black"></span> <span className="text-[7px] font-bold">SEL.</span></div>
                  </div>
                </div>

                {/* Calendar Controls */}
                <div className="flex items-center justify-between mb-2 bg-gray-100 border border-black p-1">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSemanaOffset(o => o - 1)} className="border-2 border-black px-2 py-0.5 hover:bg-black hover:text-white text-[12px] font-black">&lt;</button>
                    <div className="font-black uppercase text-[12px] px-4 min-w-[280px] text-center border-x border-black bg-white py-0.5">
                      {getDisplayDate(0).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}
                    </div>
                    <button onClick={() => setSemanaOffset(o => o + 1)} className="border-2 border-black px-2 py-0.5 hover:bg-black hover:text-white text-[12px] font-black">&gt;</button>
                  </div>
                  <button onClick={() => setSemanaOffset(0)} className="bg-[#FF8A00] text-black font-black text-[10px] px-4 py-1 border-2 border-black shadow-hard hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all">HOJE</button>
                </div>

                {/* Schedule Table */}
                <div className="flex-1 overflow-auto border border-black relative bg-gray-50">
                  {agendaLoading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-50 flex items-center justify-center">
                      <span className="font-bold text-[8px] animate-pulse uppercase tracking-widest">Sincronizando...</span>
                    </div>
                  )}
                  <table className="w-full text-[9px] border-collapse">
                    <thead className="sticky top-0 z-40 bg-gray-200 border-b border-black">
                      <tr>
                        <th className="p-2 border-r border-black text-left sticky left-0 bg-gray-200 min-w-[100px]">PROFESSOR</th>
                        {HOURS.map(h => (
                          <th key={h} className="p-1 border-r border-black min-w-[60px] text-center">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {professores.length > 0 ? professores.map((prof) => (
                        <tr key={prof.id} className="border-b border-gray-200">
                          <td className="p-2 font-bold border-r border-black sticky left-0 bg-white z-10 flex items-center gap-1">
                             <div className="w-2 h-2 border border-black shadow-sm shrink-0" style={{ background: prof.cor_agenda || '#FF8A00' }}></div>
                             <span className="truncate text-[8px]">{prof.nome.toUpperCase()}</span>
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
                                className={`p-1 border-r border-gray-100 transition-all cursor-pointer h-10 ${
                                  isOccupied ? 'bg-[#FF8A00] cursor-not-allowed opacity-40' : 
                                  isSelected ? 'bg-[#00FF41] border-2 border-black' : 
                                  'hover:bg-[#00FF41]/20'
                                }`}
                              >
                                {isOccupied && <div className="text-[7px] font-black text-white leading-tight truncate">{aulasNoHorario[0].aluno_nome?.split(' ')[0]}</div>}
                              </td>
                            );
                          })}
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={HOURS.length + 1} className="py-10 text-center opacity-30 text-[10px] font-bold uppercase tracking-widest">Nenhum professor cadastrado</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Summary Banner */}
                {formData.horario && (
                  <div className="mt-3 p-2 bg-[#00FF41] text-black border-2 border-black font-bold text-center uppercase tracking-widest shadow-hard flex items-center justify-between text-[8px]">
                    <span>SELECIONADO: {getDisplayDate(0).toLocaleDateString('pt-BR')} ÀS {formData.horario.substring(0, 5)}</span>
                    <div className="flex items-center gap-2">
                      <span className="opacity-60">PROF:</span>
                      <span className="text-[9px]">{professores.find(p => p.id === formData.professor_id)?.nome.split(' ')[0].toUpperCase()}</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="p-4 border-t-4 border-white flex justify-end items-center gap-4 bg-[#1A1A1A] shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 text-[10px] font-bold uppercase hover:underline decoration-[#FF8A00] decoration-2"
          >
            Cancelar
          </button>
          <button 
            disabled={loading || !formData.horario || !formData.pacote_id}
            onClick={handleSubmit}
            className="px-8 py-3 bg-[#FF8A00] text-black font-bold uppercase border-2 border-black shadow-hard hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all flex items-center gap-2 disabled:opacity-50 text-[11px]"
          >
            {loading ? 'Sincronizando...' : <><span>💾</span> Matricular</>}
          </button>
        </footer>
      </motion.main>
    </div>

  );
}
