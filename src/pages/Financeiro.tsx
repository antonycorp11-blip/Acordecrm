import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Search, Filter, ArrowUpRight, ArrowDownLeft,
  Calendar, CreditCard, CheckCircle2, AlertCircle, Plus, X, Save, FileUp, Zap, Users, Shield, TrendingUp, Activity, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TIPOS_EXTRA = [
  { value: 'ensaio', label: 'Ensaio' },
  { value: 'aluguel_sala', label: 'Aluguel de Sala' },
  { value: 'aluguel_equipamento', label: 'Aluguel de Equipamento' },
  { value: 'multa_rescisao', label: 'Multa de Rescisão' },
  { value: 'outros', label: 'Outros' },
];

export default function Financeiro() {
  const navigate = useNavigate();
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
  const [baixaModal, setBaixaModal] = useState<{ id: number | null, open: boolean, valorSugerido: number }>({ id: null, open: false, valorSugerido: 0 });
  const [baixaMetodo, setBaixaMetodo] = useState('dinheiro');
  const [valorPago, setValorPago] = useState<string>('');
  const [descontoDia10, setDescontoDia10] = useState(false);

  const fetchData = async () => {
    const token = localStorage.getItem('acorde_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    setLoading(true);
    try {
      const [pagsRes, resumoRes, alunosRes, remunRes] = await Promise.all([
        fetch(`/api/pagamentos?mes=${currentMonth}&desconto_dia_10=${descontoDia10}`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`/api/financeiro/resumo?mes=${currentMonth}&desconto_dia_10=${descontoDia10}`, { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/alunos', { headers }).then(r => r.ok ? r.json() : []),
        fetch(`/api/financeiro/remuneracao?mes_ano=${currentMonth}`, { headers }).then(r => r.ok ? r.json() : []),
      ]);
      setPagamentos(Array.isArray(pagsRes) ? pagsRes : []);
      setResumo(resumoRes || { receitaMes: 0, faturamentoPrevisto: 0, pendentes: 0, total: 0 });
      setAlunos(Array.isArray(alunosRes) ? alunosRes : []);
      setRemuneracao(Array.isArray(remunRes) ? remunRes : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentMonth, descontoDia10]);

  const handleMonthChange = (offset: number) => {
    const [m, y] = currentMonth.split('/').map(Number);
    const date = new Date(y, m - 1 + offset, 1);
    setCurrentMonth(`${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`);
  };

  const handleBaixa = async () => {
    if (!baixaModal.id) return;
    setSaving(true);
    const token = localStorage.getItem('acorde_token');
    await fetch(`/api/pagamentos/${baixaModal.id}/baixa`, { 
      method: 'PATCH', 
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }, 
      body: JSON.stringify({ metodo_pagamento: baixaMetodo, valor_pago: Number(valorPago) }) 
    });
    setSaving(false);
    setBaixaModal({ id: null, open: false, valorSugerido: 0 });
    fetchData();
  };

  const handleSaveExtra = async () => {
    if (!extraForm.descricao || !extraForm.valor) return alert('Preencha descrição e valor.');
    setSaving(true);
    const now = new Date();
    const token = localStorage.getItem('acorde_token');
    await fetch('/api/pagamentos/entrada-extra', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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
    <div className="flex flex-col flex-1 p-6 md:p-10 bg-[#0A0A0A] retro-font text-white overflow-y-auto">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
        .retro-font { font-family: 'Space Mono', monospace; }
        .shadow-hard { box-shadow: 4px 4px 0px 0px rgba(255, 255, 255, 0.2); }
        .shadow-hard-black { box-shadow: 6px 6px 0px 0px rgba(0, 0, 0, 1); }
        .pixel-card { border: 4px solid white; border-radius: 0; }
        .sticker-card { border: 3px solid black; box-shadow: 6px 6px 0px 0px rgba(0,0,0,1); }
      `}</style>

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#FF8A00] border-4 border-white flex items-center justify-center text-xl shadow-hard">💰</div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Financeiro Global</h1>
          </div>
          <p className="text-[#FF8A00] text-xs font-bold uppercase tracking-[0.2em]">&gt;&gt; FLUXO DE CAIXA E CONTROLE DE PAGAMENTOS</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Tabs */}
          <div className="flex bg-[#1A1A1A] p-1 border-2 border-white">
            <button 
              onClick={() => setActiveTab('caixa')}
              className={`px-4 py-2 text-[10px] font-bold uppercase transition-all ${activeTab === 'caixa' ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}
            >
              Caixa Geral
            </button>
            <button 
              onClick={() => setActiveTab('professores')}
              className={`px-4 py-2 text-[10px] font-bold uppercase transition-all ${activeTab === 'professores' ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}
            >
              Remuneração
            </button>
          </div>

          {/* Month Selector */}
          <div className="flex items-center bg-[#1A1A1A] border-2 border-white overflow-hidden">
            <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-white hover:text-black border-r-2 border-white"><ChevronLeft className="w-4 h-4" /></button>
            <div className="px-4 text-[10px] font-black uppercase tracking-widest min-w-[100px] text-center">{currentMonth}</div>
            <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-white hover:text-black border-l-2 border-white"><ChevronRight className="w-4 h-4" /></button>
          </div>

          <button 
            onClick={() => setDescontoDia10(!descontoDia10)} 
            className={`p-3 border-4 font-bold uppercase text-[10px] transition-all flex items-center gap-2 ${descontoDia10 ? 'bg-[#00FF41] text-black border-black shadow-hard-black' : 'bg-black text-white border-white/20 shadow-hard'}`}
          >
            {descontoDia10 ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 border-2 border-current rounded-full" />}
            Desconto Dia 10
          </button>

          <div className="flex items-center gap-3">
             <label className="cursor-pointer bg-[#1A1A1A] border-4 border-white p-3 shadow-hard hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95 flex items-center gap-2 text-[10px] font-bold uppercase">
               <FileUp className="w-4 h-4" />
               {importing ? '...' : 'PDF'}
               <input type="file" accept=".pdf" className="hidden" onChange={handleImportPDF} disabled={importing} />
             </label>
             <button onClick={() => setShowExtraModal(true)} className="bg-[#FF8A00] text-black border-4 border-black p-3 shadow-hard-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95 flex items-center gap-2 text-[10px] font-bold uppercase">
               <Plus className="w-4 h-4" /> Entrada Extra
             </button>
             <button onClick={() => alert('Mural da Vergonha em construção! Aqui aparecerão os devedores de multas.')} className="bg-[#FF0000] text-white border-4 border-black p-3 shadow-hard-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95 flex items-center gap-2 text-[10px] font-bold uppercase">
               <Shield className="w-4 h-4" /> Mural da Vergonha
             </button>
          </div>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-[#1A1A1A] border-4 border-white p-6 shadow-hard relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 -rotate-12 translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Faturamento Previsto</p>
          <h3 className="text-3xl font-black text-white">R$ {(resumo?.faturamentoPrevisto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-[#FF8A00]">
            <TrendingUp className="w-3 h-3" />
            <span>ESTIMATIVA MENSAL</span>
          </div>
        </div>
        <div className="bg-[#00FF41] border-4 border-black p-6 shadow-hard-black relative overflow-hidden group text-black">
          <div className="absolute top-0 right-0 w-24 h-24 bg-black/5 rotate-12 translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform"></div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 text-black">Recebido Real</p>
          <h3 className="text-3xl font-black">R$ {(resumo?.receitaMes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
            <CheckCircle2 className="w-3 h-3" />
            <span>EM CAIXA AGORA</span>
          </div>
        </div>
        <div className="bg-[#FF0000] border-4 border-black p-6 shadow-hard-black relative overflow-hidden group text-white">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rotate-12 translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform"></div>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Pendente / Atrasado</p>
          <h3 className="text-3xl font-black">R$ {(resumo?.pendentes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
            <AlertCircle className="w-3 h-3 text-white" />
            <span>CRITICAL STATE</span>
          </div>
        </div>
      </div>

      {activeTab === 'caixa' ? (
        <div className="bg-[#1A1A1A] border-4 border-white p-6 shadow-hard">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
             <div className="relative w-full md:w-96 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="BUSCAR TRANSAÇÃO..." 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-black border-2 border-white/20 text-white text-[10px] font-bold uppercase tracking-widest focus:border-[#FF8A00] outline-none" 
                />
             </div>
             <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-[#00FF41] border border-black shadow-sm"></div>
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">PAGO</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 bg-[#FF0000] border border-black shadow-sm"></div>
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">PENDENTE</span>
                </div>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-white/10">
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF8A00]">Aluno / Descrição</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF8A00]">Tipo</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF8A00]">Valor</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF8A00]">Vencimento</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF8A00]">Status</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF8A00] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={6} className="py-20 text-center text-[10px] font-black uppercase animate-pulse">Sincronizando Banco de Dados...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-20 text-center text-[10px] font-black uppercase opacity-50">Nenhuma transação registrada</td></tr>
                ) : filtered.map((p, idx) => (
                  <tr key={`${p.id}-${idx}`} className="hover:bg-white/5 transition-colors group">
                    <td className="px-4 py-5">
                      <p 
                        className={`text-[11px] font-bold uppercase tracking-tight ${p.aluno_id ? 'cursor-pointer hover:text-[#FF8A00] transition-colors' : ''}`}
                        onClick={() => {
                          if (p.aluno_id) {
                            navigate(`/alunos/${p.aluno_id}`);
                          }
                        }}
                      >
                        {p.aluno_nome || p.descricao || '---'}
                      </p>
                      <p className="text-[9px] text-[#FF8A00] font-black uppercase tracking-widest mt-1 opacity-70">{p.referencia_mes_ano || ''}</p>
                    </td>
                    <td className="px-4 py-5">
                      <span className="text-[9px] font-black uppercase bg-[#333] px-2 py-1 border border-white/10">{p.tipo_receita || 'mensalidade'}</span>
                    </td>
                    <td className="px-4 py-5">
                      <span className="text-[12px] font-black">R$ {Number(p.valor).toFixed(2).replace('.', ',')}</span>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {p.data_vencimento ? format(new Date(p.data_vencimento + 'T12:00:00'), 'dd/MM/yyyy') : '---'}
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      {p.status === 'pago' ? (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#00FF41]/10 text-[#00FF41] text-[9px] font-black uppercase border border-[#00FF41]/30">
                          <CheckCircle2 className="w-3 h-3" /> PAGO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF0000]/10 text-[#FF0000] text-[9px] font-black uppercase border border-[#FF0000]/30">
                          <AlertCircle className="w-3 h-3" /> PENDENTE
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-5 text-right flex items-center justify-end gap-2">
                      {p.status !== 'pago' ? (
                        <button 
                          onClick={() => {
                            setBaixaModal({ id: p.id, open: true, valorSugerido: Number(p.valor) });
                            setValorPago(Number(p.valor).toFixed(2));
                          }}
                          className="bg-white text-black px-4 py-2 text-[9px] font-black uppercase shadow-hard hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95"
                        >
                          DAR BAIXA
                        </button>
                      ) : (
                        <span className="text-[9px] font-black uppercase opacity-20">QUITADO</span>
                      )}
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          if(window.confirm('Tem certeza que deseja excluir esta fatura definitivamente?')) {
                            const token = localStorage.getItem('acorde_token');
                            await fetch(`/api/pagamentos/${p.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                            fetchData();
                          }
                        }}
                        className="bg-[#FF0000] text-white p-2 border-2 border-[#FF0000]/50 hover:bg-[#FF0000] hover:border-white transition-all shadow-hard-black active:translate-y-1 active:translate-x-1 active:shadow-none"
                        title="Excluir Fatura"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[#1A1A1A] border-4 border-white p-6 shadow-hard">
           <div className="mb-8">
              <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                 <Users className="w-6 h-6 text-[#FF8A00]" />
                 Folha de Repasse (Estimada)
              </h2>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="border-b-2 border-white/10">
                   <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF8A00]">Professor</th>
                   <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF8A00]">Aulas Ministradas</th>
                   <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF8A00]">Valor Repasse</th>
                   <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF8A00] text-right">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {remuneracao.length === 0 ? (
                    <tr><td colSpan={4} className="py-20 text-center text-[10px] font-black uppercase opacity-50">Sem registros para o período</td></tr>
                  ) : remuneracao.map((r, i) => (
                    <tr key={`prof-${r.professor_id}-${i}`} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-5 font-bold uppercase text-[11px]">{r.professor_nome}</td>
                      <td className="px-4 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.total_aulas} AULAS</td>
                      <td className="px-4 py-5 text-[12px] font-black text-[#00FF41]">R$ {r.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-5 text-right font-black uppercase text-[9px] text-[#FF8A00] animate-pulse">PENDENTE</td>
                    </tr>
                  ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* Modal Entrada Extra */}
      <AnimatePresence>
        {showExtraModal && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1A1A1A] border-4 border-white p-8 w-full max-w-md shadow-hard relative">
              <button onClick={() => setShowExtraModal(false)} className="absolute -top-6 -right-6 bg-[#FF0000] border-4 border-black p-2 shadow-hard-black transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                 <X className="w-6 h-6 text-white" />
              </button>
              
              <h2 className="text-2xl font-black uppercase mb-8 border-b-4 border-white pb-4 tracking-tighter flex items-center gap-3">
                 <Plus className="w-6 h-6 text-[#FF8A00]" />
                 Lançamento Extra
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-[#FF8A00] uppercase tracking-widest block mb-2">Aluno Associado (Opcional)</label>
                  <select value={extraForm.aluno_id} onChange={e => setExtraForm(f => ({...f, aluno_id: e.target.value}))} className="w-full bg-black border-2 border-white/20 p-3 text-[10px] font-bold uppercase focus:border-[#FF8A00] outline-none text-white">
                    <option value="">NENHUM / AVULSO</option>
                    {alunos.map((a, idx) => <option key={`aluno-${a.id}-${idx}`} value={a.id}>{a.nome.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-[#FF8A00] uppercase tracking-widest block mb-2">Descrição / Motivo</label>
                  <input value={extraForm.descricao} onChange={e => setExtraForm(f => ({...f, descricao: e.target.value}))} placeholder="EX: ALUGUEL ESTÚDIO" className="w-full bg-black border-2 border-white/20 p-3 text-[10px] font-bold uppercase focus:border-[#FF8A00] outline-none text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-[#FF8A00] uppercase tracking-widest block mb-2">Valor (R$)</label>
                    <input type="number" step="0.01" value={extraForm.valor} onChange={e => setExtraForm(f => ({...f, valor: e.target.value}))} placeholder="0,00" className="w-full bg-black border-2 border-white/20 p-3 text-[10px] font-bold uppercase focus:border-[#FF8A00] outline-none text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#FF8A00] uppercase tracking-widest block mb-2">Data Venc.</label>
                    <input type="date" value={extraForm.data_vencimento} onChange={e => setExtraForm(f => ({...f, data_vencimento: e.target.value}))} className="w-full bg-black border-2 border-white/20 p-3 text-[10px] font-bold uppercase focus:border-[#FF8A00] outline-none text-white" />
                  </div>
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                 <button onClick={() => setShowExtraModal(false)} className="flex-1 p-4 text-[10px] font-black uppercase hover:underline">VOLTAR</button>
                 <button onClick={handleSaveExtra} disabled={saving} className="flex-1 bg-[#00FF41] text-black border-4 border-black p-4 shadow-hard-black font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                    <Save className="w-4 h-4" /> {saving ? 'SALVANDO...' : 'CONFIRMAR'}
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Baixa */}
      <AnimatePresence>
        {baixaModal.open && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1A1A1A] border-4 border-white p-8 w-full max-w-sm shadow-hard">
               <h2 className="text-xl font-black uppercase mb-8 border-b-4 border-white pb-4 tracking-tighter">Baixa de Pagamento</h2>
               <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-[#FF8A00] uppercase tracking-widest block mb-3">Valor Recebido (R$)</label>
                    <input type="number" step="0.01" value={valorPago} onChange={e => setValorPago(e.target.value)} className="w-full bg-black border-2 border-white/20 p-3 text-[10px] font-bold uppercase focus:border-[#FF8A00] outline-none text-white mb-6" />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-[#FF8A00] uppercase tracking-widest block mb-3">Método de Entrada</label>
                    <div className="grid grid-cols-1 gap-2">
                      {['pix', 'dinheiro', 'cartao_credito', 'cartao_debito', 'transferencia'].map(m => (
                        <button 
                          key={m}
                          onClick={() => setBaixaMetodo(m)}
                          className={`p-3 border-4 text-[9px] font-black uppercase transition-all ${baixaMetodo === m ? 'bg-white text-black border-black translate-x-1 translate-y-1' : 'bg-transparent text-white border-white/20 hover:border-white'}`}
                        >
                          {m.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                 </div>
               </div>
               <div className="mt-10 flex gap-4">
                  <button onClick={() => setBaixaModal({ id: null, open: false, valorSugerido: 0 })} className="flex-1 p-4 text-[10px] font-black uppercase hover:underline">CANCELAR</button>
                  <button onClick={handleBaixa} disabled={saving} className="flex-1 bg-[#00FF41] text-black border-4 border-black p-4 shadow-hard-black font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                     <CheckCircle2 className="w-4 h-4" /> {saving ? '...' : 'DAR BAIXA'}
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
