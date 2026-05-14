import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Download, 
  Printer, 
  Settings, 
  ChevronRight, 
  CheckCircle2, 
  Package,
  DollarSign,
  Clock,
  Calendar,
  Save,
  Trash2,
  Edit3,
  Music,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CLAUSULAS_PADRAO = [
  "O CONTRATANTE compromete-se a efetuar o pagamento das mensalidades até o dia 10 de cada mês.",
  "Em caso de falta do aluno, não haverá reposição da aula, salvo em casos de doença comprovada por atestado médico.",
  "O cancelamento do contrato deve ser solicitado com 30 dias de antecedência.",
  "A escola reserva-se o direito de substituir o professor em caso de necessidade extrema.",
  "O material didático não está incluso no valor da mensalidade e deve ser adquirido separadamente."
];

export default function Contratos() {
  const [activeTab, setActiveTab] = useState<'planos' | 'gerar'>('planos');
  const [pacotes, setPacotes] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Novo Pacote Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPacote, setNewPacote] = useState({
    nome: '',
    curso_ids: [] as number[],
    aulas_por_semana: 1,
    duracao_aula_minutos: 45,
    valor_mensal: 0,
    desconto_automatico: 0,
    total_aulas: 12
  });

  // Gerar Contrato State
  const [selectedAluno, setSelectedAluno] = useState<any>(null);
  const [clauses, setClauses] = useState(CLAUSULAS_PADRAO);
  const [editingClause, setEditingClause] = useState<number | null>(null);

  const fetchData = async () => {
    const token = localStorage.getItem('acorde_token');
    const headers = { Authorization: `Bearer ${token}` };
    
    try {
      const [pRes, cRes, aRes] = await Promise.all([
        fetch('/api/pacotes', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/cursos', { headers }).then(r => r.ok ? r.json() : []),
        fetch('/api/alunos', { headers }).then(r => r.ok ? r.json() : [])
      ]);
      setPacotes(Array.isArray(pRes) ? pRes : []);
      setCursos(Array.isArray(cRes) ? cRes : []);
      setAlunos(Array.isArray(aRes) ? aRes : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreatePacote = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('acorde_token');
    const res = await fetch('/api/pacotes', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        ...newPacote,
        curso_ids: newPacote.curso_ids.join(',')
      }),
    });
    if (res.ok) {
      setIsModalOpen(false);
      fetchData();
      setNewPacote({ 
        nome: '', 
        curso_ids: [], 
        aulas_por_semana: 1, 
        duracao_aula_minutos: 45, 
        valor_mensal: 0, 
        desconto_automatico: 0,
        total_aulas: 12
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col flex-1 animate-in fade-in duration-500 overflow-hidden h-screen bg-[#1a0f0a]">
      <header className="h-24 px-8 bg-[#feccba] border-b-4 border-black flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-black uppercase italic italic tracking-tighter">Contratos & Planos</h1>
          <p className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest">Documentação e pacotes de serviços.</p>
        </div>
        <div className="flex bg-black/10 p-1 border-4 border-black shadow-[4px_4px_0_#000]">
          <button 
            onClick={() => setActiveTab('planos')}
            className={`px-4 py-2 text-[10px] font-black uppercase transition-all ${activeTab === 'planos' ? 'bg-[#ff6b00] text-white shadow-[2px_2px_0_#000]' : 'text-black/40 hover:text-black'}`}
          >
            <Package className="w-3.5 h-3.5 inline mr-1" /> PLANOS
          </button>
          <button 
            onClick={() => setActiveTab('gerar')}
            className={`px-4 py-2 text-[10px] font-black uppercase transition-all ${activeTab === 'gerar' ? 'bg-[#ff6b00] text-white shadow-[2px_2px_0_#000]' : 'text-black/40 hover:text-black'}`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1" /> GERAR_CONTRATO
          </button>
        </div>
      </header>

      <div className="p-8 flex-1 overflow-auto">
        {activeTab === 'planos' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white uppercase italic italic">Pacotes de Aulas</h2>
                <p className="text-[10px] text-[#8e7164] font-black uppercase">Defina os planos de estudo da escola.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-[#ff6b00] text-white px-6 py-3 border-4 border-black font-black uppercase text-xs shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" /> NOVO_PLANO
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {pacotes.map(pacote => (
                <div key={pacote.id} className="bg-[#fff8f6] border-4 border-black p-6 group shadow-[6px_6px_0_#000] relative overflow-hidden">
                  <div className="flex justify-between items-start mb-6">
                    <div className="bg-[#ff6b00] p-3 border-4 border-black text-white shadow-[4px_4px_0_#000]">
                      <Package className="w-6 h-6" />
                    </div>
                    <span className="bg-[#25d366] text-white px-3 py-1 border-2 border-black text-[8px] font-black uppercase tracking-widest shadow-[2px_2px_0_#000]">
                      R$ {pacote.valor_mensal} / MÊS
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-black uppercase italic italic mb-2">{pacote.nome}</h3>
                  <div className="flex flex-wrap gap-1 mb-6">
                    {(pacote.curso_ids || '').split(',').map((id: string) => {
                      const curso = cursos.find(c => String(c.id) === id);
                      return curso ? (
                        <span key={id} className="bg-[#feccba] text-black text-[8px] font-black uppercase px-2 py-0.5 border-2 border-black">
                          {curso.nome}
                        </span>
                      ) : null;
                    })}
                  </div>
                  
                  <div className="space-y-3 pt-6 border-t-4 border-black/5">
                    <div className="flex items-center gap-3 text-black">
                      <FileText className="w-4 h-4 text-[#ff6b00]" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{pacote.total_aulas} AULAS NO TOTAL</span>
                    </div>
                    <div className="flex items-center gap-3 text-black">
                      <Calendar className="w-4 h-4 text-[#ff6b00]" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{pacote.aulas_por_semana} AULA(S) POR SEMANA</span>
                    </div>
                    <div className="flex items-center gap-3 text-black">
                      <Clock className="w-4 h-4 text-[#ff6b00]" />
                      <span className="text-[10px] font-black uppercase tracking-widest">{pacote.duracao_aula_minutos} MINUTOS POR AULA</span>
                    </div>
                    {pacote.desconto_automatico > 0 && (
                      <div className="flex items-center gap-3 text-[#ff6b00]">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">DESCONTO DE R$ {pacote.desconto_automatico}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            {/* Seletor de Aluno e Configuração */}
            <div className="space-y-6 overflow-y-auto pr-4 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            {/* Seletor de Aluno e Configuração */}
            <div className="space-y-6 overflow-y-auto pr-4 custom-scrollbar">
              <div className="bg-[#fff8f6] border-4 border-black p-6 shadow-[6px_6px_0_#000]">
                <h3 className="text-[10px] font-black text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-[#ff6b00]" /> 1. SELECIONE_O_ALUNO
                </h3>
                <select 
                  className="w-full px-4 py-3 bg-white border-4 border-black text-xs font-black uppercase italic italic focus:ring-0 outline-none"
                  onChange={(e) => setSelectedAluno(alunos.find(a => a.id === Number(e.target.value)))}
                >
                  <option value="">BUSCAR_ALUNO_MATRICULADO...</option>
                  {alunos.map(aluno => <option key={aluno.id} value={aluno.id}>{aluno.nome}</option>)}
                </select>
              </div>

              <div className="bg-[#fff8f6] border-4 border-black p-6 shadow-[6px_6px_0_#000]">
                <div className="flex items-center justify-between mb-4">
                   <h3 className="text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-2">
                      <Settings className="w-4 h-4 text-[#ff6b00]" /> 2. CLÁUSULAS_DO_CONTRATO
                   </h3>
                   <button 
                     onClick={() => setClauses([...clauses, 'NOVA CLÁUSULA PERSONALIZADA...'])} 
                     className="bg-black text-white px-2 py-1 border-2 border-white text-[8px] font-black uppercase shadow-[2px_2px_0_#000] active:translate-y-1 active:shadow-none"
                   >
                     + ADD_ITEM
                   </button>
                </div>
                <div className="space-y-3">
                  {clauses.map((clause, index) => (
                    <div key={index} className="group relative bg-white border-2 border-black p-4 shadow-[4px_4px_0_#000] hover:translate-y-[-1px] transition-all">
                      {editingClause === index ? (
                        <textarea 
                          autoFocus
                          className="w-full bg-[#feccba]/20 border-2 border-black p-2 text-[10px] font-black uppercase italic italic focus:outline-none min-h-[80px]"
                          value={clause}
                          onChange={(e) => {
                            const newClauses = [...clauses];
                            newClauses[index] = e.target.value;
                            setClauses(newClauses);
                          }}
                          onBlur={() => setEditingClause(null)}
                        />
                      ) : (
                        <div className="flex items-start gap-3">
                          <span className="bg-black text-white w-5 h-5 border-2 border-white flex items-center justify-center text-[9px] font-black shrink-0 shadow-[2px_2px_0_#000]">{index + 1}</span>
                          <p className="text-[10px] text-black font-black uppercase italic italic leading-relaxed flex-1">{clause}</p>
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => setEditingClause(index)} className="p-1 bg-[#ff6b00] border-2 border-black text-white"><Edit3 className="w-3 h-3" /></button>
                            <button onClick={() => setClauses(clauses.filter((_, i) => i !== index))} className="p-1 bg-red-500 border-2 border-black text-white"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={handlePrint}
                disabled={!selectedAluno}
                className="w-full bg-[#ff6b00] text-white py-4 border-4 border-black font-black uppercase shadow-[8px_8px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Printer className="w-5 h-5" /> VISUALIZAR_E_IMPRIMIR_PDF
              </button>
            </div>

            {/* Preview do Contrato */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-12 shadow-inner overflow-y-auto print:hidden">
               <div id="contract-preview" className="font-serif text-slate-800 space-y-8">
                  <div className="text-center border-b-2 border-slate-900 pb-8">
                    <h1 className="text-2xl font-bold uppercase tracking-widest">Contrato de Prestação de Serviços Musicais</h1>
                    <p className="text-sm font-bold text-slate-500 mt-2">STUDIO ACORDE - CRM & ENSINO MUSICAL</p>
                  </div>

                  <section className="space-y-4">
                    <h4 className="font-bold border-b border-slate-200 pb-1">1. DAS PARTES</h4>
                    <p className="text-sm leading-relaxed">
                      De um lado, <strong>STUDIO ACORDE</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob nº 00.000.000/0001-00, com sede na Rua Exemplo, 123. 
                      E de outro lado, o(a) aluno(a) <strong>{selectedAluno?.nome || '_________________________________'}</strong>, 
                      portador(a) do CPF nº <strong>{selectedAluno?.cpf || '_________________'}</strong>, doravante denominado(a) CONTRATANTE.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h4 className="font-bold border-b border-slate-200 pb-1">2. DO OBJETO E VALORES</h4>
                    <p className="text-sm leading-relaxed">
                      O presente contrato tem como objeto a prestação de serviços de ensino musical no curso selecionado.
                      O valor da mensalidade acordado é de <strong>R$ {selectedAluno?.matriculas?.[0]?.pacote_id ? pacotes.find(p => p.id === selectedAluno.matriculas[0].pacote_id)?.valor_mensal : '________'}</strong>.
                    </p>
                  </section>

                  <section className="space-y-4">
                    <h4 className="font-bold border-b border-slate-200 pb-1">3. DAS CLÁUSULAS ESPECÍFICAS</h4>
                    <div className="space-y-3">
                      {clauses.map((c, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="font-bold">{i+1}.</span>
                          <p className="text-sm leading-relaxed">{c}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <div className="pt-20 grid grid-cols-2 gap-12">
                     <div className="text-center">
                        <div className="border-t border-slate-900 pt-2">
                          <p className="text-xs font-bold uppercase">Assinatura do Contratante</p>
                          <p className="text-[10px] text-slate-500">{selectedAluno?.nome || 'Aluno'}</p>
                        </div>
                     </div>
                     <div className="text-center">
                        <div className="border-t border-slate-900 pt-2">
                          <p className="text-xs font-bold uppercase">Assinatura da Escola</p>
                          <p className="text-[10px] text-slate-500">Studio Acorde Direção</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Novo Plano */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#fff8f6] border-8 border-black p-8 relative overflow-hidden shadow-[12px_12px_0_#000] w-full max-w-xl"
            >
              <div className="absolute top-0 right-0 p-4">
                 <button onClick={() => setIsModalOpen(false)} className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all">
                    <X className="w-4 h-4" />
                 </button>
              </div>

              <div className="mb-8 border-b-4 border-black pb-4">
                <h2 className="text-xl font-black text-black uppercase italic italic flex items-center gap-2">
                   <Package className="w-6 h-6 text-[#ff6b00]" /> NOVO_PLANO_DE_ENSINO
                </h2>
              </div>

              <form onSubmit={handleCreatePacote} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">NOME_DO_PLANO</label>
                    <input 
                      required
                      placeholder="EX: PIANO INDIVIDUAL GOLD"
                      className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black uppercase italic italic focus:ring-0 outline-none placeholder:text-black/10"
                      value={newPacote.nome}
                      onChange={(e) => setNewPacote({...newPacote, nome: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-black uppercase tracking-widest block">CURSOS_INCLUSOS</label>
                    <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar p-2 bg-black/5 border-2 border-black">
                      {cursos.map(curso => {
                        const isSelected = newPacote.curso_ids.includes(curso.id);
                        return (
                          <button
                            key={curso.id}
                            type="button"
                            onClick={() => {
                              const ids = isSelected 
                                ? newPacote.curso_ids.filter(id => id !== curso.id)
                                : [...newPacote.curso_ids, curso.id];
                              setNewPacote({ ...newPacote, curso_ids: ids });
                            }}
                            className={`p-2 border-2 text-left transition-all flex items-center gap-2 ${
                              isSelected ? 'bg-[#ff6b00] border-black text-white shadow-[2px_2px_0_#000]' : 'bg-white border-black/10 text-black/40 hover:border-black'
                            }`}
                          >
                            <Music className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-black/10'}`} />
                            <span className="text-[9px] font-black uppercase truncate">{curso.nome}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">TOTAL_DE_AULAS</label>
                        <input 
                          type="number"
                          className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black focus:ring-0 outline-none"
                          value={newPacote.total_aulas}
                          onChange={(e) => setNewPacote({...newPacote, total_aulas: Number(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">AULAS_/_SEMANA</label>
                        <input 
                          type="number"
                          className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black focus:ring-0 outline-none"
                          value={newPacote.aulas_por_semana}
                          onChange={(e) => setNewPacote({...newPacote, aulas_por_semana: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">DURAÇÃO_(MIN)</label>
                        <input 
                          type="number"
                          className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black focus:ring-0 outline-none"
                          value={newPacote.duracao_aula_minutos}
                          onChange={(e) => setNewPacote({...newPacote, duracao_aula_minutos: Number(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-black uppercase tracking-widest mb-1 block">VALOR_MENSAL_(R$)</label>
                        <input 
                          type="number"
                          className="w-full px-4 py-3 bg-white border-4 border-black text-sm font-black focus:ring-0 outline-none"
                          value={newPacote.valor_mensal}
                          onChange={(e) => setNewPacote({...newPacote, valor_mensal: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#ff6b00] text-white py-4 border-4 border-black font-black uppercase shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" /> SALVAR_PLANO
                  </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRINT STYLES */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #contract-preview, #contract-preview * { visibility: visible; }
          #contract-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 2cm;
            background: white;
            color: black;
          }
          .glass-card, header, .custom-scrollbar { display: none !important; }
        }
      `}</style>
    </div>
  );
}
