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
  Music
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
    <div className="flex flex-col flex-1 animate-in fade-in duration-500 overflow-hidden">
      <header className="h-16 px-8 frosted-bg border-b border-slate-200/50 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Contratos e Planos</h1>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('planos')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === 'planos' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}
          >
            <Package className="w-3.5 h-3.5 inline mr-1" /> Planos
          </button>
          <button 
            onClick={() => setActiveTab('gerar')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === 'gerar' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}
          >
            <FileText className="w-3.5 h-3.5 inline mr-1" /> Gerar Contrato
          </button>
        </div>
      </header>

      <div className="p-8 flex-1 overflow-auto">
        {activeTab === 'planos' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Pacotes de Aulas</h2>
                <p className="text-sm text-slate-500">Defina os planos de estudo da escola.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/30 text-sm active:scale-95 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Novo Plano
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pacotes.map(pacote => (
                <div key={pacote.id} className="glass-card p-6 border border-slate-200/50 group hover:border-primary/30 transition-all hover:shadow-xl hover:shadow-primary/5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-primary/10 p-2.5 rounded-xl group-hover:bg-primary group-hover:text-white transition-all">
                      <Package className="w-5 h-5" />
                    </div>
                    <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                      R$ {pacote.valor_mensal} / mês
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mb-1">{pacote.nome}</h3>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {(pacote.curso_ids || '').split(',').map((id: string) => {
                      const curso = cursos.find(c => String(c.id) === id);
                      return curso ? (
                        <span key={id} className="bg-primary/5 text-primary text-[9px] font-black uppercase px-2 py-0.5 rounded border border-primary/10">
                          {curso.nome}
                        </span>
                      ) : null;
                    })}
                  </div>
                  
                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-3 text-slate-500">
                      <FileText className="w-4 h-4" />
                      <span className="text-xs font-black">{pacote.total_aulas} aulas no total</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span className="text-xs font-medium">{pacote.aulas_por_semana} aula(s) por semana</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-medium">{pacote.duracao_aula_minutos} minutos por aula</span>
                    </div>
                    {pacote.desconto_automatico > 0 && (
                      <div className="flex items-center gap-3 text-emerald-600">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-xs font-bold">Desconto de R$ {pacote.desconto_automatico} incluso</span>
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
              <div className="glass-card p-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">1. Selecione o Aluno</h3>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20"
                  onChange={(e) => setSelectedAluno(alunos.find(a => a.id === Number(e.target.value)))}
                >
                  <option value="">Selecione um aluno matriculado...</option>
                  {alunos.map(aluno => <option key={aluno.id} value={aluno.id}>{aluno.nome}</option>)}
                </select>
              </div>

              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                   <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">2. Cláusulas do Contrato</h3>
                   <button onClick={() => setClauses([...clauses, 'Nova cláusula personalizada...'])} className="text-primary text-[10px] font-black uppercase hover:underline">Adicionar Cláusula</button>
                </div>
                <div className="space-y-3">
                  {clauses.map((clause, index) => (
                    <div key={index} className="group relative bg-slate-50 border border-slate-200 p-4 rounded-xl hover:border-primary/30 transition-all">
                      {editingClause === index ? (
                        <textarea 
                          autoFocus
                          className="w-full bg-white border border-primary/20 p-2 rounded-lg text-xs font-medium focus:outline-none"
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
                          <span className="bg-slate-200 text-slate-500 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">{index + 1}</span>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed flex-1">{clause}</p>
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => setEditingClause(index)} className="p-1 hover:bg-primary/10 rounded text-primary"><Edit3 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setClauses(clauses.filter((_, i) => i !== index))} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
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
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl mt-4 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Printer className="w-5 h-5" /> Visualizar e Gerar PDF
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-900">Novo Plano / Pacote</h2>
                <button onClick={() => setIsModalOpen(false)}><Trash2 className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={handleCreatePacote} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nome do Plano</label>
                    <input 
                      required
                      placeholder="Ex: Piano Individual Gold"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                      value={newPacote.nome}
                      onChange={(e) => setNewPacote({...newPacote, nome: e.target.value})}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Cursos Inclusos</label>
                    <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
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
                            className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2 ${
                              isSelected ? 'bg-primary/10 border-primary' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                              <Music className="w-3 h-3" />
                            </div>
                            <span className={`text-[10px] font-bold ${isSelected ? 'text-primary' : 'text-slate-600'}`}>{curso.nome}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Total de Aulas</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                        value={newPacote.total_aulas}
                        onChange={(e) => setNewPacote({...newPacote, total_aulas: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Aulas / Semana</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                        value={newPacote.aulas_por_semana}
                        onChange={(e) => setNewPacote({...newPacote, aulas_por_semana: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Duração (Min)</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                        value={newPacote.duracao_aula_minutos}
                        onChange={(e) => setNewPacote({...newPacote, duracao_aula_minutos: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Valor Mensal (R$)</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                        value={newPacote.valor_mensal}
                        onChange={(e) => setNewPacote({...newPacote, valor_mensal: Number(e.target.value)})}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Desconto (R$)</label>
                      <input 
                        type="number"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                        value={newPacote.desconto_automatico}
                        onChange={(e) => setNewPacote({...newPacote, desconto_automatico: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-primary text-white py-4 rounded-2xl font-black shadow-lg shadow-primary/30 mt-4 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" /> Salvar Plano
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
