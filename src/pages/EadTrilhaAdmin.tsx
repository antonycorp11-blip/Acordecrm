import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Edit3, X, Save, Brain, HelpCircle, ArrowRight, Eye, Video } from 'lucide-react';
import { toast } from 'sonner';

export default function EadTrilhaAdmin() {
  const [modulos, setModulos] = useState<any[]>([]);
  const [aulas, setAulas] = useState<any[]>([]);
  const [conquistas, setConquistas] = useState<any[]>([]);

  // Modais
  const [isModuloModalOpen, setIsModuloModalOpen] = useState(false);
  const [isAulaModalOpen, setIsAulaModalOpen] = useState(false);

  // Estados dos formulários
  const [moduloForm, setModuloForm] = useState({
    id: undefined as number | undefined,
    nome: '',
    descricao: '',
    ordem: 1,
    arte_index: 0,
    conquista_id: '' as string | number,
    prova_final: [] as any[]
  });

  const [aulaForm, setAulaForm] = useState({
    id: undefined as number | undefined,
    modulo_id: '',
    titulo: '',
    youtube_url: '',
    ordem: 1,
    conquista_id: '' as string | number,
    questionario: [] as any[]
  });

  // IA ChatGPT text import
  const [rawTextIa, setRawTextIa] = useState('');
  const [loadingIa, setLoadingIa] = useState(false);

  const fetchDados = async () => {
    const token = localStorage.getItem('acorde_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    try {
      const [resMod, resAul, resConq] = await Promise.all([
        fetch('/api/trilha/modulos', { headers }),
        fetch('/api/trilha/aulas', { headers }),
        fetch('/api/gamificacao/conquistas', { headers })
      ]);
      if (resMod.ok) setModulos(await resMod.json());
      if (resAul.ok) setAulas(await resAul.json());
      if (resConq.ok) setConquistas(await resConq.json());
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar dados do EAD.');
    }
  };

  useEffect(() => {
    fetchDados();
  }, []);

  const handleOpenModuloModal = (mod?: any) => {
    if (mod) {
      setModuloForm({
        id: mod.id,
        nome: mod.nome || '',
        descricao: mod.descricao || '',
        ordem: mod.ordem || 1,
        arte_index: mod.arte_index || 0,
        conquista_id: mod.conquista_id || '',
        prova_final: Array.isArray(mod.prova_final) ? mod.prova_final : []
      });
    } else {
      setModuloForm({
        id: undefined,
        nome: '',
        descricao: '',
        ordem: modulos.length + 1,
        arte_index: 0,
        conquista_id: '',
        prova_final: []
      });
    }
    setRawTextIa('');
    setIsModuloModalOpen(true);
  };

  const handleOpenAulaModal = (aula?: any, initialModuloId?: number) => {
    if (aula) {
      setAulaForm({
        id: aula.id,
        modulo_id: aula.modulo_id || '',
        titulo: aula.titulo || '',
        youtube_url: aula.youtube_url || '',
        ordem: aula.ordem || 1,
        conquista_id: aula.conquista_id || '',
        questionario: Array.isArray(aula.questionario) ? aula.questionario : []
      });
    } else {
      setAulaForm({
        id: undefined,
        modulo_id: initialModuloId ? String(initialModuloId) : (modulos[0]?.id || ''),
        titulo: '',
        youtube_url: '',
        ordem: (aulas.filter(a => Number(a.modulo_id) === Number(initialModuloId)).length) + 1,
        conquista_id: '',
        questionario: []
      });
    }
    setRawTextIa('');
    setIsAulaModalOpen(true);
  };

  const handleSaveModulo = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('acorde_token');
    try {
      const res = await fetch('/api/trilha/modulos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: moduloForm.id,
          nome: moduloForm.nome,
          descricao: moduloForm.descricao,
          ordem: Number(moduloForm.ordem),
          arte_index: Number(moduloForm.arte_index),
          prova_final: moduloForm.prova_final,
          conquista_id: moduloForm.conquista_id ? Number(moduloForm.conquista_id) : null
        })
      });
      if (!res.ok) throw new Error('Falha ao salvar módulo');
      toast.success(moduloForm.id ? 'Módulo atualizado!' : 'Módulo criado com sucesso!');
      setIsModuloModalOpen(false);
      fetchDados();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveAula = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('acorde_token');
    try {
      const res = await fetch('/api/trilha/aulas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          id: aulaForm.id,
          modulo_id: Number(aulaForm.modulo_id),
          titulo: aulaForm.titulo,
          youtube_url: aulaForm.youtube_url,
          ordem: Number(aulaForm.ordem),
          questionario: aulaForm.questionario,
          conquista_id: aulaForm.conquista_id ? Number(aulaForm.conquista_id) : null
        })
      });
      if (!res.ok) throw new Error('Falha ao salvar aula');
      toast.success(aulaForm.id ? 'Aula atualizada!' : 'Aula criada com sucesso!');
      setIsAulaModalOpen(false);
      fetchDados();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteModulo = async (id: number) => {
    if (!window.confirm('Atenção: excluir este módulo apagará todas as aulas associadas a ele! Deseja continuar?')) return;
    const token = localStorage.getItem('acorde_token');
    try {
      const res = await fetch(`/api/trilha/modulos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao excluir');
      toast.success('Módulo removido com sucesso!');
      fetchDados();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteAula = async (id: number) => {
    if (!window.confirm('Deseja excluir esta aula permanentemente?')) return;
    const token = localStorage.getItem('acorde_token');
    try {
      const res = await fetch(`/api/trilha/aulas/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao excluir');
      toast.success('Aula removida com sucesso!');
      fetchDados();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Processar questionário por IA
  const handleProcessQuestionsWithIa = async (target: 'aula' | 'modulo') => {
    if (!rawTextIa.trim()) {
      toast.error('Por favor, cole as perguntas e respostas primeiro.');
      return;
    }
    setLoadingIa(true);
    const token = localStorage.getItem('acorde_token');
    try {
      const res = await fetch('/api/trilha/gerar-questionario-ia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ textoBruto: rawTextIa })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao processar');
      }
      const questions = await res.json();
      if (target === 'aula') {
        setAulaForm(prev => ({ ...prev, questionario: [...prev.questionario, ...questions] }));
      } else {
        setModuloForm(prev => ({ ...prev, prova_final: [...prev.prova_final, ...questions] }));
      }
      setRawTextIa('');
      toast.success(`${questions.length} questões geradas com sucesso!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao integrar com o Gemini.');
    } finally {
      setLoadingIa(false);
    }
  };

  const handleAddQuestionManual = (target: 'aula' | 'modulo') => {
    const newQ = {
      pergunta: 'Nova Pergunta?',
      opcoes: ['Alternativa A', 'Alternativa B', 'Alternativa C', 'Alternativa D'],
      resposta_correta_idx: 0
    };
    if (target === 'aula') {
      setAulaForm(prev => ({ ...prev, questionario: [...prev.questionario, newQ] }));
    } else {
      setModuloForm(prev => ({ ...prev, prova_final: [...prev.prova_final, newQ] }));
    }
  };

  const handleRemoveQuestion = (target: 'aula' | 'modulo', idx: number) => {
    if (target === 'aula') {
      const updated = [...aulaForm.questionario];
      updated.splice(idx, 1);
      setAulaForm(prev => ({ ...prev, questionario: updated }));
    } else {
      const updated = [...moduloForm.prova_final];
      updated.splice(idx, 1);
      setModuloForm(prev => ({ ...prev, prova_final: updated }));
    }
  };

  const handleUpdateQuestionField = (target: 'aula' | 'modulo', idx: number, field: string, val: any) => {
    if (target === 'aula') {
      const updated = [...aulaForm.questionario];
      updated[idx] = { ...updated[idx], [field]: val };
      setAulaForm(prev => ({ ...prev, questionario: updated }));
    } else {
      const updated = [...moduloForm.prova_final];
      updated[idx] = { ...updated[idx], [field]: val };
      setModuloForm(prev => ({ ...prev, prova_final: updated }));
    }
  };

  const handleUpdateOptionField = (target: 'aula' | 'modulo', questionIdx: number, optionIdx: number, val: string) => {
    if (target === 'aula') {
      const updated = [...aulaForm.questionario];
      const op = [...updated[questionIdx].opcoes];
      op[optionIdx] = val;
      updated[questionIdx] = { ...updated[questionIdx], opcoes: op };
      setAulaForm(prev => ({ ...prev, questionario: updated }));
    } else {
      const updated = [...moduloForm.prova_final];
      const op = [...updated[questionIdx].opcoes];
      op[optionIdx] = val;
      updated[questionIdx] = { ...updated[questionIdx], opcoes: op };
      setModuloForm(prev => ({ ...prev, prova_final: updated }));
    }
  };

  return (
    <div className="p-6 space-y-6 font-['Space_Mono'] bg-[#fff8f6] min-h-screen text-black">
      {/* Top Header */}
      <div className="flex justify-between items-center border-b-4 border-black pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-[#ff6b00]" /> GERENCIAMENTO EAD — TRILHA
          </h1>
          <p className="text-[10px] font-bold text-stone-500 uppercase mt-1">Crie módulos, adicione videoaulas e configure os questionários de aproveitamento</p>
        </div>
        <button
          onClick={() => handleOpenModuloModal()}
          className="bg-black text-white px-4 py-2 border-2 border-black font-black text-xs uppercase shadow-[4px_4px_0_#ff6b00] hover:translate-y-0.5 active:translate-y-1 transition-all flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Novo Módulo
        </button>
      </div>

      {/* Grid de Módulos */}
      <div className="space-y-6">
        {modulos.map((mod) => {
          const modAulas = aulas.filter(a => Number(a.modulo_id) === Number(mod.id));
          const moduloConquista = conquistas.find(c => Number(c.id) === Number(mod.conquista_id));
          return (
            <div key={mod.id} className="bg-white border-4 border-black p-5 shadow-[6px_6px_0_#000] space-y-4">
              <div className="flex justify-between items-start border-b-2 border-stone-200 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#ff6b00] text-white font-black text-[9px] px-2 py-0.5 border border-black uppercase">
                      MÓDULO #{mod.ordem}
                    </span>
                    <h2 className="text-lg font-black uppercase tracking-tight">{mod.nome}</h2>
                  </div>
                  <p className="text-xs text-stone-500 font-bold uppercase">{mod.descricao || 'Sem descrição cadastrada.'}</p>
                  
                  {moduloConquista && (
                    <div className="text-[9px] font-black uppercase text-[#ff6b00] flex items-center gap-1">
                      <span>🏆 Medalha de Conclusão:</span>
                      <span className="bg-[#feccba]/40 border border-[#ff6b00]/30 px-1.5 py-0.5">{moduloConquista.nome}</span>
                    </div>
                  )}
                  {mod.prova_final && Array.isArray(mod.prova_final) && mod.prova_final.length > 0 && (
                    <div className="text-[9px] font-black uppercase text-emerald-600 flex items-center gap-1">
                      <span>📝 Prova Final:</span>
                      <span className="bg-emerald-100 border border-emerald-500/30 px-1.5 py-0.5">{mod.prova_final.length} questões cadastradas</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenAulaModal(undefined, mod.id)}
                    className="bg-[#4ade80] hover:bg-emerald-400 text-black px-2.5 py-1.5 border-2 border-black font-black text-[10px] uppercase shadow-[2px_2px_0_#000] active:translate-y-0.5 transition-all"
                  >
                    + Aula
                  </button>
                  <button
                    onClick={() => handleOpenModuloModal(mod)}
                    className="bg-[#ffeb3b] hover:bg-[#ffd54f] text-black p-1.5 border-2 border-black shadow-[2px_2px_0_#000] active:translate-y-0.5 transition-all"
                    title="Editar Módulo"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteModulo(mod.id)}
                    className="bg-red-500 hover:bg-red-600 text-white p-1.5 border-2 border-black shadow-[2px_2px_0_#000] active:translate-y-0.5 transition-all"
                    title="Excluir Módulo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Aulas do Módulo */}
              <div className="pl-4 space-y-3">
                <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Vídeos e Questionários</h4>
                {modAulas.length === 0 ? (
                  <p className="text-xs text-stone-400 italic">Nenhuma aula cadastrada neste módulo ainda.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {modAulas.map((aula) => {
                      const aulaConquista = conquistas.find(c => Number(c.id) === Number(aula.conquista_id));
                      return (
                        <div key={aula.id} className="border-2 border-black bg-[#fff8f6] p-3 flex justify-between items-start hover:shadow-[3px_3px_0_#000] transition-all">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-black text-white font-black text-[8px] px-1 py-0.5">#{aula.ordem}</span>
                              <h5 className="font-black text-xs uppercase text-[#261812]">{aula.titulo}</h5>
                            </div>
                            <div className="flex items-center gap-2 text-[8px] font-bold text-stone-500 uppercase">
                              <span className="flex items-center gap-0.5"><Video className="w-2.5 h-2.5" /> YT: {aula.youtube_url?.substring(0, 15)}...</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5"><HelpCircle className="w-2.5 h-2.5" /> {Array.isArray(aula.questionario) ? aula.questionario.length : 0} Qs</span>
                            </div>
                            {aulaConquista && (
                              <p className="text-[8px] font-black uppercase text-[#ff6b00]">🎖️ {aulaConquista.nome}</p>
                            )}
                          </div>

                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => handleOpenAulaModal(aula)}
                              className="bg-white hover:bg-stone-100 text-black p-1 border border-black shadow-[1px_1px_0_#000] active:translate-y-0.5 transition-all"
                              title="Editar Aula"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAula(aula.id)}
                              className="bg-red-100 text-red-600 hover:bg-red-500 hover:text-white p-1 border border-black shadow-[1px_1px_0_#000] active:translate-y-0.5 transition-all"
                              title="Excluir Aula"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {modulos.length === 0 && (
          <div className="bg-white border-4 border-dashed border-stone-300 p-8 text-center">
            <p className="text-sm font-black text-stone-400 uppercase">Nenhum módulo criado ainda.</p>
            <p className="text-xs text-stone-400 uppercase mt-1">Comece clicando em "+ Novo Módulo" no topo!</p>
          </div>
        )}
      </div>

      {/* ================= MODAL MÓDULO ================= */}
      {isModuloModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 overflow-y-auto font-['Space_Mono']">
          <div className="bg-[#fff8f6] border-8 border-black p-6 w-full max-w-4xl relative shadow-[12px_12px_0_#000] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-sm uppercase italic tracking-widest text-[#ff6b00]">
                {moduloForm.id ? '📝 EDITAR MÓDULO' : '✨ NOVO MÓDULO'}
              </h3>
              <button
                onClick={() => setIsModuloModalOpen(false)}
                className="bg-black text-[#feccba] border-2 border-black font-black text-xs px-2 py-1 shadow-[4px_4px_0_#000] hover:bg-red-500 hover:text-white transition-all active:translate-y-0.5"
              >
                X
              </button>
            </div>

            <form onSubmit={handleSaveModulo} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Campos do Módulo */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-stone-500 block mb-1">Título do Módulo</label>
                    <input
                      type="text"
                      required
                      value={moduloForm.nome}
                      onChange={(e) => setModuloForm({ ...moduloForm, nome: e.target.value })}
                      className="w-full border-4 border-black p-2 text-xs font-bold uppercase focus:ring-0"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-stone-500 block mb-1">Descrição</label>
                    <textarea
                      value={moduloForm.descricao}
                      onChange={(e) => setModuloForm({ ...moduloForm, descricao: e.target.value })}
                      rows={2}
                      className="w-full border-4 border-black p-2 text-xs font-bold uppercase focus:ring-0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase text-stone-500 block mb-1">Ordem</label>
                      <input
                        type="number"
                        required
                        value={moduloForm.ordem}
                        onChange={(e) => setModuloForm({ ...moduloForm, ordem: Number(e.target.value) })}
                        className="w-full border-4 border-black p-2 text-xs font-bold focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-stone-500 block mb-1">Capa/Arte Index (0-6)</label>
                      <input
                        type="number"
                        required
                        min={0}
                        max={6}
                        value={moduloForm.arte_index}
                        onChange={(e) => setModuloForm({ ...moduloForm, arte_index: Number(e.target.value) })}
                        className="w-full border-4 border-black p-2 text-xs font-bold focus:ring-0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-stone-500 block mb-1">Medalha/Troféu Concedido</label>
                    <select
                      value={moduloForm.conquista_id}
                      onChange={(e) => setModuloForm({ ...moduloForm, conquista_id: e.target.value })}
                      className="w-full border-4 border-black p-2 text-xs font-bold focus:ring-0 bg-white"
                    >
                      <option value="">Selecione um Troféu (Opcional)</option>
                      {conquistas.map(c => (
                        <option key={c.id} value={c.id}>[{c.classe}] {c.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Editor de Prova Final */}
                <div className="border-4 border-black p-4 bg-white space-y-4">
                  <div className="flex justify-between items-center border-b-2 border-stone-200 pb-2">
                    <h4 className="text-xs font-black uppercase text-[#ff6b00] flex items-center gap-1">
                      <Brain className="w-4 h-4" /> PROVA FINAL DO MÓDULO
                    </h4>
                    <span className="text-[8px] font-black bg-stone-100 px-1">{moduloForm.prova_final.length} PERGUNTAS</span>
                  </div>

                  {/* IA Importador */}
                  <div className="border-2 border-dashed border-black p-2 space-y-2 bg-[#fff8f6]">
                    <label className="text-[8px] font-black uppercase text-stone-500 block">🤖 IMPORTADOR AUTOMÁTICO DE QUESTÕES POR IA (ChatGPT)</label>
                    <textarea
                      placeholder="Cole o texto cru com as perguntas e respostas geradas pelo ChatGPT aqui..."
                      value={rawTextIa}
                      onChange={(e) => setRawTextIa(e.target.value)}
                      rows={2}
                      className="w-full border-2 border-black p-2 text-[9px] font-bold focus:ring-0"
                    />
                    <button
                      type="button"
                      disabled={loadingIa}
                      onClick={() => handleProcessQuestionsWithIa('modulo')}
                      className="w-full bg-[#ff6b00] text-white border-2 border-black py-1 text-[8px] font-black uppercase shadow-[2px_2px_0_#000] hover:translate-y-0.5 active:translate-y-1 transition-all"
                    >
                      {loadingIa ? 'PROCESSANDO COM GEMINI AI...' : 'ESTRUTURAR QUESTÕES VIA IA'}
                    </button>
                  </div>

                  {/* Lista de Questões */}
                  <div className="max-h-56 overflow-y-auto space-y-3 custom-scrollbar">
                    {moduloForm.prova_final.map((q, idx) => (
                      <div key={idx} className="border-2 border-black p-3 bg-white space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion('modulo', idx)}
                          className="absolute top-2 right-2 text-red-500 font-bold hover:text-red-700 text-[10px]"
                        >
                          Remover
                        </button>
                        <div className="space-y-1.5">
                          <span className="text-[8px] font-black bg-black text-white px-1">QUESTÃO {idx + 1}</span>
                          <input
                            type="text"
                            required
                            value={q.pergunta}
                            onChange={(e) => handleUpdateQuestionField('modulo', idx, 'pergunta', e.target.value)}
                            className="w-full border border-black p-1 text-[10px] font-bold focus:ring-0"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {q.opcoes.map((opt: string, optIdx: number) => (
                            <div key={optIdx} className="space-y-0.5">
                              <label className="text-[7px] font-black text-stone-400">ALT {String.fromCharCode(65 + optIdx)}</label>
                              <input
                                type="text"
                                required
                                value={opt}
                                onChange={(e) => handleUpdateOptionField('modulo', idx, optIdx, e.target.value)}
                                className="w-full border border-stone-300 p-1 text-[8px] font-bold focus:ring-0"
                              />
                            </div>
                          ))}
                        </div>

                        <div>
                          <label className="text-[8px] font-black uppercase text-stone-500 block mb-1">Gabarito (Alternativa Correta)</label>
                          <select
                            value={q.resposta_correta_idx !== undefined ? q.resposta_correta_idx : q.resposta_correta}
                            onChange={(e) => handleUpdateQuestionField('modulo', idx, 'resposta_correta_idx', Number(e.target.value))}
                            className="w-full border border-black p-1 text-[9px] font-bold focus:ring-0 bg-white"
                          >
                            {q.opcoes.map((_: any, oIdx: number) => (
                              <option key={oIdx} value={oIdx}>Alternativa {String.fromCharCode(65 + oIdx)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddQuestionManual('modulo')}
                    className="w-full border-2 border-dashed border-black py-1.5 text-[9px] font-black uppercase hover:bg-stone-50 transition-colors"
                  >
                    + Adicionar Pergunta Manualmente
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t-2 border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModuloModalOpen(false)}
                  className="bg-white border-2 border-black px-4 py-2 font-black text-xs uppercase shadow-[2px_2px_0_#000] hover:translate-y-0.5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#ff6b00] text-white border-2 border-black px-4 py-2 font-black text-xs uppercase shadow-[2px_2px_0_#000] hover:translate-y-0.5 active:translate-y-1 transition-all"
                >
                  Salvar Módulo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL AULA ================= */}
      {isAulaModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 overflow-y-auto font-['Space_Mono']">
          <div className="bg-[#fff8f6] border-8 border-black p-6 w-full max-w-4xl relative shadow-[12px_12px_0_#000] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-sm uppercase italic tracking-widest text-[#ff6b00]">
                {aulaForm.id ? '📝 EDITAR AULA' : '✨ NOVA AULA'}
              </h3>
              <button
                onClick={() => setIsAulaModalOpen(false)}
                className="bg-black text-[#feccba] border-2 border-black font-black text-xs px-2 py-1 shadow-[4px_4px_0_#000] hover:bg-red-500 hover:text-white transition-all active:translate-y-0.5"
              >
                X
              </button>
            </div>

            <form onSubmit={handleSaveAula} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Campos da Aula */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-stone-500 block mb-1">Módulo</label>
                    <select
                      required
                      value={aulaForm.modulo_id}
                      onChange={(e) => setAulaForm({ ...aulaForm, modulo_id: e.target.value })}
                      className="w-full border-4 border-black p-2 text-xs font-bold focus:ring-0 bg-white"
                    >
                      {modulos.map(m => (
                        <option key={m.id} value={m.id}>MÓDULO #{m.ordem} — {m.nome}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-stone-500 block mb-1">Título da Aula</label>
                    <input
                      type="text"
                      required
                      value={aulaForm.titulo}
                      onChange={(e) => setAulaForm({ ...aulaForm, titulo: e.target.value })}
                      className="w-full border-4 border-black p-2 text-xs font-bold uppercase focus:ring-0"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-stone-500 block mb-1">Link do Vídeo do YouTube (Não Listado)</label>
                    <input
                      type="url"
                      required
                      placeholder="Ex: https://www.youtube.com/watch?v=VIDEO_ID"
                      value={aulaForm.youtube_url}
                      onChange={(e) => setAulaForm({ ...aulaForm, youtube_url: e.target.value })}
                      className="w-full border-4 border-black p-2 text-xs font-bold focus:ring-0"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase text-stone-500 block mb-1">Ordem na Trilha</label>
                      <input
                        type="number"
                        required
                        value={aulaForm.ordem}
                        onChange={(e) => setAulaForm({ ...aulaForm, ordem: Number(e.target.value) })}
                        className="w-full border-4 border-black p-2 text-xs font-bold focus:ring-0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase text-stone-500 block mb-1">Medalha/Troféu Concedido</label>
                    <select
                      value={aulaForm.conquista_id}
                      onChange={(e) => setAulaForm({ ...aulaForm, conquista_id: e.target.value })}
                      className="w-full border-4 border-black p-2 text-xs font-bold focus:ring-0 bg-white"
                    >
                      <option value="">Selecione um Troféu (Opcional)</option>
                      {conquistas.map(c => (
                        <option key={c.id} value={c.id}>[{c.classe}] {c.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Editor de Questionário */}
                <div className="border-4 border-black p-4 bg-white space-y-4">
                  <div className="flex justify-between items-center border-b-2 border-stone-200 pb-2">
                    <h4 className="text-xs font-black uppercase text-[#ff6b00] flex items-center gap-1">
                      <Brain className="w-4 h-4" /> QUESTIONÁRIO DA AULA
                    </h4>
                    <span className="text-[8px] font-black bg-stone-100 px-1">{aulaForm.questionario.length} PERGUNTAS</span>
                  </div>

                  {/* IA Importador */}
                  <div className="border-2 border-dashed border-black p-2 space-y-2 bg-[#fff8f6]">
                    <label className="text-[8px] font-black uppercase text-stone-500 block">🤖 IMPORTADOR AUTOMÁTICO DE QUESTÕES POR IA (ChatGPT)</label>
                    <textarea
                      placeholder="Cole o texto cru com as perguntas e respostas geradas pelo ChatGPT aqui..."
                      value={rawTextIa}
                      onChange={(e) => setRawTextIa(e.target.value)}
                      rows={2}
                      className="w-full border-2 border-black p-2 text-[9px] font-bold focus:ring-0"
                    />
                    <button
                      type="button"
                      disabled={loadingIa}
                      onClick={() => handleProcessQuestionsWithIa('aula')}
                      className="w-full bg-[#ff6b00] text-white border-2 border-black py-1 text-[8px] font-black uppercase shadow-[2px_2px_0_#000] hover:translate-y-0.5 active:translate-y-1 transition-all"
                    >
                      {loadingIa ? 'PROCESSANDO COM GEMINI AI...' : 'ESTRUTURAR QUESTÕES VIA IA'}
                    </button>
                  </div>

                  {/* Lista de Questões */}
                  <div className="max-h-56 overflow-y-auto space-y-3 custom-scrollbar">
                    {aulaForm.questionario.map((q, idx) => (
                      <div key={idx} className="border-2 border-black p-3 bg-white space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion('aula', idx)}
                          className="absolute top-2 right-2 text-red-500 font-bold hover:text-red-700 text-[10px]"
                        >
                          Remover
                        </button>
                        <div className="space-y-1.5">
                          <span className="text-[8px] font-black bg-black text-white px-1">QUESTÃO {idx + 1}</span>
                          <input
                            type="text"
                            required
                            value={q.pergunta}
                            onChange={(e) => handleUpdateQuestionField('aula', idx, 'pergunta', e.target.value)}
                            className="w-full border border-black p-1 text-[10px] font-bold focus:ring-0"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {q.opcoes.map((opt: string, optIdx: number) => (
                            <div key={optIdx} className="space-y-0.5">
                              <label className="text-[7px] font-black text-stone-400">ALT {String.fromCharCode(65 + optIdx)}</label>
                              <input
                                type="text"
                                required
                                value={opt}
                                onChange={(e) => handleUpdateOptionField('aula', idx, optIdx, e.target.value)}
                                className="w-full border border-stone-300 p-1 text-[8px] font-bold focus:ring-0"
                              />
                            </div>
                          ))}
                        </div>

                        <div>
                          <label className="text-[8px] font-black uppercase text-stone-500 block mb-1">Gabarito (Alternativa Correta)</label>
                          <select
                            value={q.resposta_correta_idx !== undefined ? q.resposta_correta_idx : q.resposta_correta}
                            onChange={(e) => handleUpdateQuestionField('aula', idx, 'resposta_correta_idx', Number(e.target.value))}
                            className="w-full border border-black p-1 text-[9px] font-bold focus:ring-0 bg-white"
                          >
                            {q.opcoes.map((_: any, oIdx: number) => (
                              <option key={oIdx} value={oIdx}>Alternativa {String.fromCharCode(65 + oIdx)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddQuestionManual('aula')}
                    className="w-full border-2 border-dashed border-black py-1.5 text-[9px] font-black uppercase hover:bg-stone-50 transition-colors"
                  >
                    + Adicionar Pergunta Manualmente
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t-2 border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAulaModalOpen(false)}
                  className="bg-white border-2 border-black px-4 py-2 font-black text-xs uppercase shadow-[2px_2px_0_#000] hover:translate-y-0.5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#ff6b00] text-white border-2 border-black px-4 py-2 font-black text-xs uppercase shadow-[2px_2px_0_#000] hover:translate-y-0.5 active:translate-y-1 transition-all"
                >
                  Salvar Aula
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
