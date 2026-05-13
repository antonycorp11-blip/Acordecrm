import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Search, Filter, ArrowUpRight, ArrowDownLeft,
  Calendar, CreditCard, CheckCircle2, AlertCircle, Plus, X, Save, FileUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TIPOS_EXTRA = [
  { value: 'ensaio', label: 'Ensaio' },
  { value: 'aluguel_sala', label: 'Aluguel de Sala' },
  { value: 'aluguel_equipamento', label: 'Aluguel de Equipamento' },
  { value: 'multa_rescisao', label: 'Multa de Rescisão' },
  { value: 'outros', label: 'Outros' },
];

export default function Financeiro() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
  });
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [resumo, setResumo] = useState<any>({ receitaMes: 0, faturamentoPrevisto: 0, pendentes: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraForm, setExtraForm] = useState({ descricao: '', valor: '', tipo_receita: 'ensaio', data_vencimento: new Date().toISOString().split('T')[0], aluno_id: '' });
  const [alunos, setAlunos] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'caixa' | 'professores'>('caixa');
  const [remuneracao, setRemuneracao] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [baixaModal, setBaixaModal] = useState<{ id: number | null, open: boolean }>({ id: null, open: false });
  const [baixaMetodo, setBaixaMetodo] = useState('dinheiro');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pagsRes, resumoRes, alunosRes, remunRes] = await Promise.all([
        fetch(`/api/pagamentos?mes=${currentMonth}`).then(r => r.ok ? r.json() : []),
        fetch(`/api/financeiro/resumo?mes=${currentMonth}`).then(r => r.ok ? r.json() : null),
        fetch('/api/alunos').then(r => r.ok ? r.json() : []),
        fetch(`/api/financeiro/remuneracao?mes_ano=${currentMonth}`).then(r => r.ok ? r.json() : []),
      ]);
      setPagamentos(Array.isArray(pagsRes) ? pagsRes : []);
      setResumo(resumoRes || { receitaMes: 0, faturamentoPrevisto: 0, pendentes: 0, total: 0 });
      setAlunos(Array.isArray(alunosRes) ? alunosRes : []);
      setRemuneracao(Array.isArray(remunRes) ? remunRes : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentMonth]);

  const handleMonthChange = (offset: number) => {
    const [m, y] = currentMonth.split('/').map(Number);
    const date = new Date(y, m - 1 + offset, 1);
    setCurrentMonth(`${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`);
  };

  const handleBaixa = async () => {
    if (!baixaModal.id) return;
    setSaving(true);
    await fetch(`/api/pagamentos/${baixaModal.id}/baixa`, { 
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ metodo_pagamento: baixaMetodo }) 
    });
    setSaving(false);
    setBaixaModal({ id: null, open: false });
    fetchData();
  };

  const handleSaveExtra = async () => {
    if (!extraForm.descricao || !extraForm.valor) return alert('Preencha descrição e valor.');
    setSaving(true);
    const now = new Date();
    await fetch('/api/pagamentos/entrada-extra', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...extraForm, 
        valor: Number(extraForm.valor), 
        aluno_id: extraForm.aluno_id || null,
        referencia_mes_ano: `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}` 
      })
    });
    setSaving(false);
    setShowExtraModal(false);
    setExtraForm({ descricao: '', valor: '', tipo_receita: 'ensaio', data_vencimento: new Date().toISOString().split('T')[0], aluno_id: '' });
    fetchData();
  };

  const handleImportPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const res = await fetch('/api/financeiro/importar-pdf', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      
      if (result.success) {
        alert(result.message);
        fetchData();
      } else {
        alert('Erro ao importar: ' + (result.error || result.message));
      }
    } catch (error) {
      console.error(error);
      alert('Erro na conexão com o servidor');
    } finally {
      setImporting(false);
      // @ts-ignore
      e.target.value = '';
    }
  };

  const filtered = pagamentos.filter(p => {
    const term = search.toLowerCase();
    return !term || p.aluno_nome?.toLowerCase().includes(term) || p.referencia_mes_ano?.includes(term) || p.tipo_receita?.toLowerCase().includes(term) || p.descricao?.toLowerCase().includes(term);
  });

  return (
    <div className="flex flex-col flex-1 animate-in fade-in duration-500">
      <header className="h-24 px-8 frosted-bg border-b border-slate-200/50 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Financeiro</h1>
          <p className="text-sm font-medium text-slate-500">Mensalidades, entradas e fluxo de caixa do mês.</p>
        </div>
          <div className="flex bg-slate-100 p-1 rounded-xl mr-4">
            <button 
              onClick={() => setActiveTab('caixa')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === 'caixa' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}
            >
              Caixa Geral
            </button>
            <button 
              onClick={() => setActiveTab('professores')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activeTab === 'professores' ? 'bg-white shadow-sm text-primary' : 'text-slate-400'}`}
            >
              Professores
            </button>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronLeft className="w-4 h-4" /></button>
              <div className="px-4 flex items-center text-sm font-black text-slate-700 min-w-[120px] justify-center uppercase">
                {currentMonth}
              </div>
              <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronRight className="w-4 h-4" /></button>
            </div>
            {activeTab === 'caixa' && (
              <div className="flex items-center gap-3">
                <label className={`cursor-pointer bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-slate-900/30 text-sm active:scale-95 transition-all flex items-center gap-2 ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
                  <FileUp className="w-4 h-4" />
                  {importing ? 'Processando...' : 'Importar PDF'}
                  <input type="file" accept=".pdf" className="hidden" onChange={handleImportPDF} disabled={importing} />
                </label>
                <button onClick={() => setShowExtraModal(true)} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-600/30 text-sm active:scale-95 transition-all flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Entrada Extra
                </button>
              </div>
            )}
          </div>
        </header>

      <div className="p-8 space-y-8 flex-1 overflow-auto">
        {activeTab === 'caixa' ? (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-card p-6 bg-slate-900 text-white border-slate-800">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Faturamento Previsto</p>
            <h3 className="text-3xl font-black mt-1">R$ {(resumo?.faturamentoPrevisto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="glass-card p-6 bg-emerald-500 text-white border-emerald-400">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Recebido (Total)</p>
            <h3 className="text-3xl font-black mt-1">R$ {(resumo?.receitaMes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="glass-card p-6 bg-orange-500 text-white border-orange-400">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Pendente (Total)</p>
            <h3 className="text-3xl font-black mt-1">R$ {(resumo?.pendentes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="glass-card p-6 bg-blue-500 text-white border-blue-400">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Fluxo do Mês</p>
            <h3 className="text-3xl font-black mt-1">R$ {(resumo?.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          </div>
        </div>

        {/* Tabela */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-slate-200/50 bg-white/40 flex items-center justify-between">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input type="text" placeholder="Buscar por aluno, referência ou tipo..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/50 border border-slate-200 rounded-xl text-sm" />
            </div>
          </div>

          <table className="w-full text-left">
            <thead className="bg-slate-50/30 border-b border-slate-100/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Aluno / Descrição</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimento</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-slate-400">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-slate-400 font-bold">Nenhum pagamento encontrado.</td></tr>
              ) : filtered.map((p, idx) => (
                <tr key={`${p.id}-${idx}`} className="hover:bg-white/40 transition-all">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{p.aluno_nome || p.descricao || '---'}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{p.referencia_mes_ano || ''}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter">{p.tipo_receita || 'mensalidade'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-black text-slate-900">R$ {Number(p.valor).toFixed(2).replace('.', ',')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {p.data_vencimento ? format(new Date(p.data_vencimento + 'T12:00:00'), 'dd/MM/yyyy') : '---'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {p.status === 'pago' ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100 w-fit">
                        <CheckCircle2 className="w-3 h-3" /> Pago
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-widest border border-orange-100 w-fit">
                        <AlertCircle className="w-3 h-3" /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {p.status !== 'pago' ? (
                      <button onClick={() => setBaixaModal({ id: p.id, open: true })} className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-emerald-600 transition-all">
                        Dar Baixa
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-300">Quitado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-slate-200/50 bg-white/40 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Remuneração Estimada</h2>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50/30 border-b border-slate-100/50">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Professor</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Aulas Dadas (Mês)</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Total a Repassar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {remuneracao.length === 0 ? (
                   <tr>
                     <td colSpan={3} className="px-6 py-8 text-center text-sm font-bold text-slate-400">Nenhuma aula registrada para este mês.</td>
                   </tr>
                ) : (
                  remuneracao.map((r, i) => (
                    <tr key={`prof-${r.professor_id}-${i}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 text-sm">{r.professor_nome}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-600">{r.total_aulas} aulas</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-black text-emerald-600">R$ {r.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Entrada Extra */}
      <AnimatePresence>
        {showExtraModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">Nova Entrada Extra</h2>
                <button onClick={() => setShowExtraModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Aluno (Opcional)</label>
                  <select value={extraForm.aluno_id} onChange={e => setExtraForm(f => ({...f, aluno_id: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Nenhum / Avulso</option>
                    {alunos.map((a, idx) => <option key={`aluno-${a.id}-${idx}`} value={a.id}>{a.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Descrição</label>
                  <input value={extraForm.descricao} onChange={e => setExtraForm(f => ({...f, descricao: e.target.value}))} placeholder="Ex: Ensaio Banda XYZ" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tipo</label>
                  <select value={extraForm.tipo_receita} onChange={e => setExtraForm(f => ({...f, tipo_receita: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {TIPOS_EXTRA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valor (R$)</label>
                    <input type="number" step="0.01" value={extraForm.valor} onChange={e => setExtraForm(f => ({...f, valor: e.target.value}))} placeholder="0,00" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Data</label>
                    <input type="date" value={extraForm.data_vencimento} onChange={e => setExtraForm(f => ({...f, data_vencimento: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowExtraModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">Cancelar</button>
                <button onClick={handleSaveExtra} disabled={saving} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Baixa Financeira */}
      <AnimatePresence>
        {baixaModal.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black text-slate-900">Dar Baixa</h2>
                <button onClick={() => setBaixaModal({ id: null, open: false })} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Método de Pagamento</label>
                  <select 
                    value={baixaMetodo} 
                    onChange={e => setBaixaMetodo(e.target.value)} 
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="transferencia">Transferência Bancária</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setBaixaModal({ id: null, open: false })} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">Cancelar</button>
                <button onClick={handleBaixa} disabled={saving} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {saving ? 'Processando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
