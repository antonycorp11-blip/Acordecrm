import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Search, Filter, ArrowUpRight, ArrowDownLeft,
  Calendar, CreditCard, CheckCircle2, AlertCircle, Plus, X, Save, FileUp, Zap, Users, Shield, TrendingUp, Activity, Trash2, ExternalLink, Download, MessageCircle, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isBefore, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Copy, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

const TIPOS_EXTRA = [
  { value: 'ensaio', label: 'Ensaio' },
  { value: 'aluguel_sala', label: 'Aluguel de Sala' },
  { value: 'aluguel_equipamento', label: 'Aluguel de Equipamento' },
  { value: 'multa_rescisao', label: 'Multa de Rescisão' },
  { value: 'outros', label: 'Outros' },
];

const MONTH_NAMES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export default function Financeiro() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()}`;
  });
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [despesas, setDespesas] = useState<any[]>([]);
  const [resumo, setResumo] = useState<any>({ receitaMes: 0, faturamentoPrevisto: 0, pendentes: 0, total: 0, despesasPagas: 0, despesasPendentes: 0, lucroMes: 0, margemLucro: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'recebidos' | 'pendentes' | 'atrasados'>('todos');
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [extraForm, setExtraForm] = useState({ descricao: '', valor: '', tipo_receita: 'ensaio', data_vencimento: new Date().toISOString().split('T')[0], aluno_id: '' });
  const [alunos, setAlunos] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'receitas' | 'despesas' | 'professores'>('receitas');
  const [showDespesaModal, setShowDespesaModal] = useState(false);
  const [despesaForm, setDespesaForm] = useState({ descricao: '', valor: '', data_vencimento: new Date().toISOString().split('T')[0], categoria: 'fixa', tipo_recorrencia: 'unica', total_parcelas: 1 });
  
  const [cobrancaModal, setCobrancaModal] = useState<{ open: boolean, p: any | null }>({ open: false, p: null });
  const [remuneracao, setRemuneracao] = useState<any[]>([]);
  const [baixaModal, setBaixaModal] = useState<{ id: number | null, open: boolean, valorSugerido: number }>({ id: null, open: false, valorSugerido: 0 });
  const [baixaMetodo, setBaixaMetodo] = useState('dinheiro');
  const [valorPago, setValorPago] = useState<string>('');
  const [descontoDia10, setDescontoDia10] = useState(false);
  
  const [whatsappModal, setWhatsappModal] = useState<'recebidos' | 'pendentes' | 'geral' | null>(null);

  // Mural da Vergonha
  const [muralVergonhaOpen, setMuralVergonhaOpen] = useState(false);
  const [muralData, setMuralData] = useState<any[]>([]);
  const [muralInput, setMuralInput] = useState({ nome_cliente: '', valor_divida: '', tipo_divida: '' });
  const [notificacaoPreview, setNotificacaoPreview] = useState<any>(null); 
  const [mensagemDuraPreview, setMensagemDuraPreview] = useState<any>(null);

  const fetchMuralData = async () => {
    try {
      const res = await fetch('/api/mural').then(r => r.ok ? r.json() : []);
      setMuralData(Array.isArray(res) ? res : []);
    } catch (e) { console.error(e); }
  };
  useEffect(() => { if (muralVergonhaOpen) fetchMuralData(); }, [muralVergonhaOpen]);

  const handleAddMural = async () => {
    if (!muralInput.nome_cliente || !muralInput.valor_divida || !muralInput.tipo_divida) return alert('Preencha tudo!');
    try {
      await fetch('/api/mural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...muralInput, valor_divida: Number(muralInput.valor_divida) })
      });
      setMuralInput({ nome_cliente: '', valor_divida: '', tipo_divida: '' });
      fetchMuralData();
    } catch (e) { console.error(e); }
  };

  const handleRemoveMural = async (id: string) => {
    if (!confirm('Deseja retirar essa pessoa do Mural?')) return;
    try {
      await fetch(`/api/mural/${id}`, { method: 'DELETE' });
      fetchMuralData();
    } catch (e) { console.error(e); }
  };

  const gerarPDFNotificacao = async () => {
    const element = document.getElementById('notificacao-pdf-content');
    if (!element) return;
    
    try {
      const dataUrl = await toPng(element, { quality: 1.0, pixelRatio: 2, backgroundColor: '#ffffff' });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297);
      pdf.save(`notificacao_extrajudicial_${notificacaoPreview.nome_cliente.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF', err);
      alert('Erro ao gerar PDF. Tente novamente.');
    }
  };

  // Modal de Folha do Professor
  const [folhaModal, setFolhaModal] = useState<{ profId: number | null, nome: string, open: boolean }>({ profId: null, nome: '', open: false });
  const [aulasFolha, setAulasFolha] = useState<any[]>([]);
  const [loadingFolha, setLoadingFolha] = useState(false);
  const [novaAulaFolha, setNovaAulaFolha] = useState({ aluno_id: '', data: new Date().toISOString().split('T')[0], horario: '10:00' });

  const abrirFolha = async (profId: number, profNome: string) => {
    setFolhaModal({ profId, nome: profNome, open: true });
    carregarAulasFolha(profId);
  };

  const carregarAulasFolha = async (profId: number) => {
    setLoadingFolha(true);
    try {
      const token = localStorage.getItem('acorde_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [mStr, yStr] = currentMonth.split('/');
      let mNum = parseInt(mStr, 10) - 1;
      let yNum = parseInt(yStr, 10);
      if (mNum === 0) {
          mNum = 12;
          yNum -= 1;
      }
      const prevMStr = mNum.toString().padStart(2, '0');
      const startDate = `${yNum}-${prevMStr}-01`;
      const endDate = new Date(yNum, mNum, 0).toISOString().split('T')[0];
      const res = await fetch(`/api/agenda?start=${startDate}&end=${endDate}&professor_id=${profId}`, { headers });
      if (res.ok) {
        let aulas = await res.json();
        if (Array.isArray(aulas)) {
           aulas = aulas.filter(a => a.status === 'realizada' || a.status === 'falta_aluno');
           setAulasFolha(aulas);
        }
      }
    } catch (e) {}
    setLoadingFolha(false);
  };

  const removerAulaFolha = async (aulaId: number) => {
     if(!window.confirm('Deseja excluir permanentemente esta aula da folha?')) return;
     try {
       const token = localStorage.getItem('acorde_token');
       await fetch(`/api/aulas/${aulaId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
       if (folhaModal.profId) carregarAulasFolha(folhaModal.profId);
       fetchData(); // recarrega a remuneração
     } catch(e) {}
  };

  const adicionarAulaFolha = async (e: React.FormEvent) => {
     e.preventDefault();
     try {
       const token = localStorage.getItem('acorde_token');
       await fetch(`/api/aulas`, {
         method: 'POST',
         headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
         body: JSON.stringify({
           professor_id: folhaModal.profId,
           aluno_id: novaAulaFolha.aluno_id ? Number(novaAulaFolha.aluno_id) : null,
           data: novaAulaFolha.data,
           horario: novaAulaFolha.horario,
           status: 'realizada',
           xp_ganho: 0
         })
       });
       if (folhaModal.profId) carregarAulasFolha(folhaModal.profId);
       fetchData(); // recarrega a remuneração
     } catch(e) {}
  };

  const fetchData = async (silent = false) => {
    const token = localStorage.getItem('acorde_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    if (!silent) setLoading(true);
    try {
      const [pagsRes, resumoRes, alunosRes, remunRes, despRes] = await Promise.all([
        fetch(`/api/pagamentos?mes=${currentMonth}&desconto_dia_10=${descontoDia10}`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`/api/financeiro/resumo?mes=${currentMonth}&desconto_dia_10=${descontoDia10}`, { headers }).then(r => r.ok ? r.json() : null),
        fetch('/api/alunos', { headers }).then(r => r.ok ? r.json() : []),
        fetch(`/api/financeiro/remuneracao?mes_ano=${currentMonth}`, { headers }).then(r => r.ok ? r.json() : []),
        fetch(`/api/despesas?mes=${currentMonth}`, { headers }).then(r => r.ok ? r.json() : []),
      ]);
      setPagamentos(Array.isArray(pagsRes) ? pagsRes : []);
      setResumo(resumoRes || { receitaMes: 0, faturamentoPrevisto: 0, pendentes: 0, total: 0, despesasPagas: 0, despesasPendentes: 0, lucroMes: 0, margemLucro: 0 });
      setAlunos(Array.isArray(alunosRes) ? alunosRes : []);
      setRemuneracao(Array.isArray(remunRes) ? remunRes : []);
      setDespesas(Array.isArray(despRes) ? despRes : []);
    } catch (e) { console.error(e); }
    if (!silent) setLoading(false);
  };

  useEffect(() => { fetchData(); }, [currentMonth, descontoDia10]);

  const setMonthByDate = (date: Date) => {
    setCurrentMonth(`${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`);
  };

  const [mStr, yStr] = currentMonth.split('/');
  const mNum = Number(mStr);
  const yNum = Number(yStr);
  const prevMonthDate = new Date(yNum, mNum - 2, 1);
  const currentMonthDate = new Date(yNum, mNum - 1, 1);
  const nextMonthDate = new Date(yNum, mNum, 1);

  const formatMonthBtn = (d: Date) => `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;

  
  const handleSaveDespesa = async () => {
    if (!despesaForm.descricao || !despesaForm.valor) return alert('Preencha descrição e valor.');
    setSaving(true);
    const token = localStorage.getItem('acorde_token');
    await fetch('/api/despesas', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ 
        ...despesaForm, 
        valor: Number(despesaForm.valor),
        total_parcelas: Number(despesaForm.total_parcelas)
      })
    });
    setSaving(false);
    setShowDespesaModal(false);
    setDespesaForm({ descricao: '', valor: '', data_vencimento: new Date().toISOString().split('T')[0], categoria: 'fixa', tipo_recorrencia: 'unica', total_parcelas: 1 });
    fetchData(true);
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
    fetchData(true);
  };

  const handleSaveExtra = async () => {
    if (!extraForm.descricao || !extraForm.valor) return alert('Preencha descrição e valor.');
    setSaving(true);
    const now = new Date();
    const token = localStorage.getItem('acorde_token');
    const [year, month] = extraForm.data_vencimento.split('-');
    const refMes = `${month}/${year}`;
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
        referencia_mes_ano: refMes
      })
    });
    setSaving(false);
    setShowExtraModal(false);
    setExtraForm({ descricao: '', valor: '', tipo_receita: 'ensaio', data_vencimento: new Date().toISOString().split('T')[0], aluno_id: '' });
    fetchData(true);
  };

  const isAtrasado = (p: any) => {
    if (p.status === 'pago') return false;
    if (!p.data_vencimento) return false;
    return isBefore(startOfDay(new Date(p.data_vencimento + 'T12:00:00')), startOfDay(new Date()));
  };

  const pagamentosFiltrados = pagamentos.filter(p => {
    const term = search.toLowerCase();
    const matchesSearch = !term || p.aluno_nome?.toLowerCase().includes(term) || p.referencia_mes_ano?.includes(term) || p.tipo_receita?.toLowerCase().includes(term) || p.descricao?.toLowerCase().includes(term);
    if (!matchesSearch) return false;

    if (statusFilter === 'recebidos') return p.status === 'pago';
    if (statusFilter === 'pendentes') return p.status !== 'pago';
    if (statusFilter === 'atrasados') return isAtrasado(p);
    return true; // 'todos'
  });

  const totalAReceberGeral = pagamentos.filter(p => p.status !== 'pago').reduce((acc, curr) => acc + Number(curr.valor), 0);

  const handleDownloadCSV = () => {
    const headers = ["ID", "Aluno / Descrição", "Tipo Receita", "Referência (Mês/Ano)", "Vencimento", "Valor (R$)", "Status"];
    
    const rows = pagamentosFiltrados.map(p => {
      const nomeOuDesc = p.aluno_nome || p.descricao || '---';
      const vencimento = p.data_vencimento ? format(new Date(p.data_vencimento + 'T12:00:00'), 'dd/MM/yyyy') : '---';
      const valor = Number(p.valor).toFixed(2).replace('.', ',');
      return [
        p.id,
        `"${nomeOuDesc.replace(/"/g, '""')}"`,
        p.tipo_receita || 'mensalidade',
        `"${(p.referencia_mes_ano || '').replace(/"/g, '""')}"`,
        vencimento,
        `"${valor}"`,
        p.status
      ].join(';');
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(';'), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `financeiro_${currentMonth.replace('/', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const gerarListaWhatsApp = (tipo: 'recebidos' | 'pendentes' | 'geral') => {
    let list = pagamentos;
    if (tipo === 'recebidos') list = pagamentos.filter(p => p.status === 'pago');
    if (tipo === 'pendentes') list = pagamentos.filter(p => p.status !== 'pago');
    
    let text = `Lista de Pagamentos - ${currentMonth}\n\n`;
    let total = 0;
  
    if (tipo === 'geral') {
       const recebidos = pagamentos.filter(p => p.status === 'pago');
       const pendentes = pagamentos.filter(p => p.status !== 'pago');
       
       text += '*RECEBIDOS*\n';
       let totRec = 0;
       recebidos.forEach(p => {
         const nome = (p.aluno_nome || p.descricao || '').split(' ').slice(0, 2).join(' ').toUpperCase();
         const val = Number(p.valor_pago != null ? p.valor_pago : p.valor);
         totRec += val;
         text += `${nome} - R$ ${val.toFixed(2).replace('.', ',')}\n`;
       });
       text += `\n*PENDENTES*\n`;
       let totPend = 0;
       pendentes.forEach(p => {
         const nome = (p.aluno_nome || p.descricao || '').split(' ').slice(0, 2).join(' ').toUpperCase();
         const val = Number(p.valor);
         totPend += val;
         text += `${nome} - R$ ${val.toFixed(2).replace('.', ',')}\n`;
       });
       text += `\n----------------------\n*TOTAL RECEBIDO: R$ ${totRec.toFixed(2).replace('.', ',')}*\n*TOTAL PENDENTE: R$ ${totPend.toFixed(2).replace('.', ',')}*`;
    } else {
       list.forEach(p => {
         const nome = (p.aluno_nome || p.descricao || '').split(' ').slice(0, 2).join(' ').toUpperCase();
         const val = Number(p.status === 'pago' ? (p.valor_pago != null ? p.valor_pago : p.valor) : p.valor);
         total += val;
         text += `${nome} - R$ ${val.toFixed(2).replace('.', ',')}\n`;
       });
       text += `\n----------------------\n*TOTAL: R$ ${total.toFixed(2).replace('.', ',')}*`;
    }
    return text;
  };

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
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#FF8A00] border-4 border-white flex items-center justify-center text-xl shadow-hard">💰</div>
            <h1 className="text-3xl font-black uppercase tracking-tighter">Contas a Receber</h1>
          </div>
          <p className="text-[#FF8A00] text-xs font-bold uppercase tracking-[0.2em]">&gt;&gt; FLUXO DE CAIXA E CONTROLE DE PAGAMENTOS</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-[#1A1A1A] border-2 border-white overflow-x-auto max-w-full">
            <button onClick={() => setActiveTab('receitas')} className={`px-4 py-2 text-[10px] font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'receitas' ? 'bg-[#00FF41] text-black' : 'text-white hover:bg-white/10'}`}>Receitas</button>
            <button onClick={() => setActiveTab('despesas')} className={`px-4 py-2 text-[10px] font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'despesas' ? 'bg-[#FF0000] text-white' : 'text-white hover:bg-white/10'}`}>Despesas</button>
          </div>

          <div className="flex bg-[#1A1A1A] border-2 border-white overflow-hidden">
            <button onClick={() => setMonthByDate(prevMonthDate)} className="px-4 py-2 text-[10px] font-bold border-r border-white/20 hover:bg-white hover:text-black transition-colors">{formatMonthBtn(prevMonthDate)}</button>
            <button className="px-4 py-2 text-[10px] font-black bg-white text-black border-r border-white/20">{formatMonthBtn(currentMonthDate)}</button>
            <button onClick={() => setMonthByDate(nextMonthDate)} className="px-4 py-2 text-[10px] font-bold hover:bg-white hover:text-black transition-colors">{formatMonthBtn(nextMonthDate)}</button>
          </div>

          <button onClick={() => setDescontoDia10(!descontoDia10)} className={`p-3 border-4 font-bold uppercase text-[10px] transition-all flex items-center gap-2 ${descontoDia10 ? 'bg-[#00FF41] text-black border-black shadow-hard-black' : 'bg-black text-white border-white/20 shadow-hard'}`}>
            {descontoDia10 ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-4 h-4 border-2 border-current rounded-full" />} Desconto Dia 10
          </button>
        </div>
      </header>

      
      {/* NOVO DASHBOARD DRE FINANCEIRO */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#00FF41] border-4 border-black p-4 shadow-hard-black relative overflow-hidden group text-black flex flex-col justify-between min-h-[140px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 rotate-12 translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform"></div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 z-10">Previsão Receitas</p>
            <div className="z-10">
              <h3 className="text-3xl font-black">R$ {(resumo?.faturamentoPrevisto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              <p className="text-xs font-bold mt-1 opacity-80">Realizado: R$ {(resumo?.receitaMes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Pendente: R$ {(resumo?.pendentes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className="bg-[#FF0000] border-4 border-black p-4 shadow-hard-black relative overflow-hidden group text-white flex flex-col justify-between min-h-[140px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rotate-12 translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform"></div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 z-10">Previsão Despesas</p>
            <div className="z-10">
              <h3 className="text-3xl font-black">R$ {(resumo?.despesasTotalPrevistas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              <p className="text-xs font-bold mt-1 opacity-80">Pagas: R$ {(resumo?.despesasPagas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div onClick={() => setActiveTab('professores')} className="bg-[#FF8A00] border-4 border-black p-4 shadow-hard-black relative overflow-hidden group text-black flex flex-col justify-between min-h-[140px] cursor-pointer hover:bg-[#FF9900] transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rotate-12 translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform"></div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1 z-10">Salários Previstos <span className="opacity-50 ml-1">(Ver Detalhes)</span></p>
            <div className="z-10">
              <h3 className="text-3xl font-black">R$ {(resumo?.salariosPrevistos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              <p className="text-xs font-bold mt-1 opacity-80">
                Representa {(resumo?.faturamentoPrevisto > 0 ? ((resumo.salariosPrevistos / resumo.faturamentoPrevisto) * 100) : 0).toFixed(1)}% das Receitas
              </p>
            </div>
          </div>

          <div className="bg-white border-4 border-black p-4 shadow-hard-black relative overflow-hidden group text-black flex flex-col justify-between min-h-[140px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-black/5 -rotate-12 translate-x-10 -translate-y-10 group-hover:scale-110 transition-transform"></div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 z-10">Saldo Líquido (Previsto)</p>
            <div className="z-10">
              <h3 className="text-3xl font-black">R$ {(resumo?.lucroPrevisto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h3>
              <p className="text-xs font-bold mt-1 text-slate-600">Margem: {(resumo?.margemLucroPrevisto || 0).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* CUSTOS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <div className="border-2 border-white/20 p-3 bg-white/5 relative">
             <p className="text-[9px] font-black uppercase text-[#FF8A00] mb-1">Custo Estrutural</p>
             <p className="text-xs text-white opacity-60">Despesas Fixas</p>
             <h4 className="text-lg font-bold text-white mt-2">R$ {(resumo?.custos?.estrutural || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
          </div>
          <div className="border-2 border-white/20 p-3 bg-white/5 relative">
             <p className="text-[9px] font-black uppercase text-[#FF8A00] mb-1">Custo Variável</p>
             <p className="text-xs text-white opacity-60">Parcelas/Dívidas</p>
             <h4 className="text-lg font-bold text-white mt-2">R$ {(resumo?.custos?.variavel || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
          </div>
          <div className="border-2 border-white/20 p-3 bg-white/5 relative">
             <p className="text-[9px] font-black uppercase text-[#FF8A00] mb-1">Custo Operacional</p>
             <p className="text-xs text-white opacity-60">Salários</p>
             <h4 className="text-lg font-bold text-white mt-2">R$ {(resumo?.custos?.operacional || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
          </div>
          <div className="border-2 border-white/20 p-3 bg-white/5 relative">
             <p className="text-[9px] font-black uppercase text-[#FF8A00] mb-1">Custo Fiscal</p>
             <p className="text-xs text-white opacity-60">Impostos</p>
             <h4 className="text-lg font-bold text-white mt-2">R$ {(resumo?.custos?.fiscal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h4>
          </div>
        </div>
      </div>

      {activeTab === 'receitas' ? (
        <div className="bg-[#1A1A1A] border-4 border-white p-6 shadow-hard flex flex-col gap-6">
{/* Action & Filter Bar Emusys Style */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-black border-2 border-white/20 p-2">
             {/* Emusys Table Top Controls */}
             <div className="flex flex-wrap items-center gap-2">
               <span className="text-[9px] font-black uppercase text-slate-400 mr-1 hidden sm:inline">Situação</span>
               
               <button onClick={() => setStatusFilter('recebidos')} className={`px-3 py-1.5 text-[9px] font-bold uppercase transition-all border-2 ${statusFilter === 'recebidos' ? 'bg-white text-black border-white' : 'border-white/20 text-white hover:border-white'}`}>Recebidos</button>
               <button onClick={() => setStatusFilter('pendentes')} className={`px-3 py-1.5 text-[9px] font-bold uppercase transition-all border-2 ${statusFilter === 'pendentes' ? 'bg-white text-black border-white' : 'border-white/20 text-white hover:border-white'}`}>A Receber</button>
               <button onClick={() => setStatusFilter('atrasados')} className={`px-3 py-1.5 text-[9px] font-bold uppercase transition-all border-2 ${statusFilter === 'atrasados' ? 'bg-white text-black border-white' : 'border-white/20 text-white hover:border-white'}`}>Atrasado</button>
               <button onClick={() => setStatusFilter('todos')} className={`px-3 py-1.5 text-[9px] font-bold uppercase transition-all border-2 ${statusFilter === 'todos' ? 'bg-white text-black border-white' : 'border-white/20 text-white hover:border-white'}`}>Todos</button>
               
               <div className="ml-2 px-3 py-1.5 bg-[#FF0000]/20 border-2 border-[#FF0000]/50 text-[#FF0000] text-[9px] font-black uppercase flex items-center gap-1.5">
                 A Receber <span>R$ {totalAReceberGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
               </div>
               
               <button onClick={() => setMuralVergonhaOpen(true)} className="ml-2 px-3 py-1.5 bg-[#8B0000] border-2 border-[#8B0000] text-white text-[9px] font-black uppercase flex items-center gap-1.5 hover:bg-[#5A0000] transition-colors">
                 <ShieldAlert className="w-3 h-3" /> Mural da Vergonha
               </button>
             </div>

             <div className="flex flex-wrap items-center gap-2">
               <div className="relative group w-32 sm:w-40">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 w-3 h-3" />
                  <input type="text" placeholder="BUSCAR..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-7 pr-2 py-1.5 bg-black border-2 border-white/20 text-white text-[9px] font-bold uppercase focus:border-[#FF8A00] outline-none" />
               </div>

               <div className="relative group">
                 <button className="bg-white text-black border-2 border-black px-2 py-1.5 shadow-hard hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95 flex items-center gap-1.5 text-[9px] font-bold uppercase">
                   <MessageCircle className="w-3 h-3" /> Lista
                 </button>
                 <div className="absolute top-full mt-2 right-0 bg-black border-2 border-white p-1.5 shadow-hard-black hidden group-hover:block z-20 min-w-[120px]">
                   <button onClick={() => setWhatsappModal('recebidos')} className="block w-full text-left px-2 py-1.5 text-[9px] font-black uppercase text-white hover:bg-[#00FF41] hover:text-black transition-colors">Recebidos</button>
                   <button onClick={() => setWhatsappModal('pendentes')} className="block w-full text-left px-2 py-1.5 text-[9px] font-black uppercase text-white hover:bg-[#FF0000] hover:text-black transition-colors">Pendentes</button>
                   <button onClick={() => setWhatsappModal('geral')} className="block w-full text-left px-2 py-1.5 text-[9px] font-black uppercase text-white hover:bg-white hover:text-black transition-colors">Geral</button>
                 </div>
               </div>

               <button onClick={handleDownloadCSV} className="bg-white text-black border-2 border-black p-1.5 shadow-hard hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95">
                 <Download className="w-3 h-3" />
               </button>

               <button onClick={() => setShowExtraModal(true)} className="bg-[#FF8A00] text-black border-2 border-black px-2 py-1.5 shadow-hard-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95 flex items-center gap-1.5 text-[9px] font-bold uppercase">
                 <Plus className="w-3 h-3" /> Lançar Extra
               </button>

               <button onClick={() => alert('Mural da Vergonha em construção!')} className="bg-[#FF0000] text-white border-2 border-black p-1.5 shadow-hard-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95">
                 <Shield className="w-3 h-3" />
               </button>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-4 border-white/20 bg-white/5">
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF8A00]">Vencimento</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF8A00]">Situação</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF8A00]">Dados do Aluno</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF8A00]">Forma / Tipo</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF8A00] text-right">Valor Total</th>
                  <th className="px-4 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={6} className="py-20 text-center text-[10px] font-black uppercase animate-pulse">Carregando Transações...</td></tr>
                ) : pagamentosFiltrados.length === 0 ? (
                  <tr><td colSpan={6} className="py-20 text-center text-[10px] font-black uppercase opacity-50">Nenhuma transação encontrada</td></tr>
                ) : pagamentosFiltrados.map((p, idx) => {
                  const isAtraso = isAtrasado(p);
                  const dtVenc = p.data_vencimento ? new Date(p.data_vencimento + 'T12:00:00') : null;
                  const daysDiff = dtVenc ? Math.ceil((new Date().getTime() - dtVenc.getTime()) / (1000 * 3600 * 24)) : 0;
                  
                  return (
                  <tr key={`${p.id}-${idx}`} className={`${p.is_ultima_parcela ? 'bg-[#FF0000]/20 hover:bg-[#FF0000]/30 border-2 border-[#FF0000]' : 'hover:bg-white/5'} transition-colors group`}>
                    <td className="px-4 py-5 text-[11px] font-black">
                      {dtVenc ? format(dtVenc, 'dd/MM/yyyy') : '---'}
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex flex-col items-start gap-1">
                        {p.is_ultima_parcela && <div className="text-[9px] font-black text-[#FF0000] bg-[#FF0000]/10 px-2 py-0.5 border border-[#FF0000] uppercase inline-block">Última Parcela</div>}
                        {p.status === 'pago' ? (
                          <span className="inline-flex items-center gap-1.5 text-[#00FF41] text-[10px] font-black uppercase">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Recebido
                          </span>
                        ) : isAtraso ? (
                          <span className="inline-flex items-center gap-1.5 text-[#FF0000] text-[10px] font-black uppercase">
                            <AlertCircle className="w-3.5 h-3.5" /> Atrasado ({daysDiff} dias)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[#FF8A00] text-[10px] font-black uppercase">
                            <Clock className="w-3.5 h-3.5" /> Vence em {-daysDiff} dias
                          </span>
                        )}
                        {localStorage.getItem(`cobranca_${p.id}`) && p.status !== 'pago' && (
                          <span className="text-[9px] font-black uppercase text-[#FF8A00] border border-[#FF8A00] px-1 mt-1 opacity-80" title="Cobrança realizada">
                            COBRADO EM {new Date(localStorage.getItem(`cobranca_${p.id}`) as string).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex flex-col">
                        <span 
                          className={`text-[12px] font-black uppercase tracking-tight flex items-center gap-1.5 ${p.aluno_id ? 'cursor-pointer hover:text-[#FF8A00] underline decoration-1 underline-offset-4 transition-colors' : ''}`}
                          onClick={() => { if (p.aluno_id) navigate(`/alunos/${p.aluno_id}`); }}
                        >
                          {p.aluno_nome || p.descricao || '---'}
                          {p.aluno_id && <ExternalLink className="w-3 h-3 text-[#FF8A00]" />}
                        </span>
                        <span className="text-[9px] text-white/50 font-bold uppercase mt-1">
                           Referência: {p.referencia_mes_ano || '---'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <span className="text-[10px] font-black uppercase text-white/80">{p.tipo_receita || 'Mensalidade'}</span>
                    </td>
                    <td className="px-4 py-5 text-right">
                      <span className="text-[13px] font-black">R$ {Number(p.status === 'pago' ? (p.valor_pago != null ? p.valor_pago : p.valor) : p.valor).toFixed(2).replace('.', ',')}</span>
                    </td>
                    <td className="px-4 py-5 text-right flex items-center justify-end gap-2">
                      {p.status !== 'pago' ? (
                        <>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setCobrancaModal({ open: true, p });
                            }}
                            className="bg-transparent border-2 border-[#FF8A00] text-[#FF8A00] px-4 py-2 text-[9px] font-black uppercase shadow-hard hover:bg-[#FF8A00] hover:text-black transition-all active:scale-95"
                          >
                            COBRAR
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setBaixaModal({ id: p.id, open: true, valorSugerido: Number(p.valor) });
                              setValorPago(Number(p.valor).toFixed(2));
                            }}
                            className="bg-white text-black px-4 py-2 text-[9px] font-black uppercase shadow-hard hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95"
                          >
                            DAR BAIXA
                          </button>
                        </>
                      ) : (
                        <span className="text-[9px] font-black uppercase opacity-20">QUITADO</span>
                      )}
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          if(window.confirm('Tem certeza que deseja excluir esta fatura definitivamente?')) {
                            const token = localStorage.getItem('acorde_token');
                            await fetch(`/api/pagamentos/${p.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                            fetchData(true);
                          }
                        }}
                        className="text-[#FF0000] p-2 hover:bg-[#FF0000]/20 transition-all opacity-0 group-hover:opacity-100"
                        title="Excluir Fatura"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'despesas' ? (
        <div className="bg-[#1A1A1A] border-4 border-white p-6 shadow-hard flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-black border-2 border-white/20 p-2">
             <div className="flex flex-wrap items-center gap-2">
               <button onClick={() => setShowDespesaModal(true)} className="bg-[#FF0000] text-white border-2 border-black px-3 py-1.5 shadow-hard-black hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95 flex items-center gap-1.5 text-[9px] font-bold uppercase">
                 <Plus className="w-3 h-3" /> Nova Despesa
               </button>
             </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-4 border-white/20 bg-white/5">
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF0000]">Vencimento</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF0000]">Situação</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF0000]">Descrição</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF0000]">Categoria</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-[#FF0000] text-right">Valor Total</th>
                  <th className="px-4 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={6} className="py-20 text-center text-[10px] font-black uppercase animate-pulse">Carregando Despesas...</td></tr>
                ) : despesas.length === 0 ? (
                  <tr><td colSpan={6} className="py-20 text-center text-[10px] font-black uppercase opacity-50">Nenhuma despesa encontrada neste mês</td></tr>
                ) : despesas.map((d, idx) => {
                  const isAtraso = d.status !== 'pago' && d.data_vencimento && isBefore(startOfDay(new Date(d.data_vencimento + 'T12:00:00')), startOfDay(new Date()));
                  const dtVenc = d.data_vencimento ? new Date(d.data_vencimento + 'T12:00:00') : null;
                  
                  return (
                  <tr key={`desp-${d.id}-${idx}`} className="hover:bg-white/5 transition-colors group">
                    <td className="px-4 py-5 text-[11px] font-black">{dtVenc ? format(dtVenc, 'dd/MM/yyyy') : '---'}</td>
                    <td className="px-4 py-5">
                      {d.status === 'pago' ? (
                        <span className="inline-flex items-center gap-1.5 text-[#00FF41] text-[10px] font-black uppercase"><CheckCircle2 className="w-3.5 h-3.5" /> Pago</span>
                      ) : isAtraso ? (
                        <span className="inline-flex items-center gap-1.5 text-[#FF0000] text-[10px] font-black uppercase"><AlertCircle className="w-3.5 h-3.5" /> Atrasada</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[#FF8A00] text-[10px] font-black uppercase"><Clock className="w-3.5 h-3.5" /> Pendente</span>
                      )}
                    </td>
                    <td className="px-4 py-5 text-[12px] font-black uppercase">{d.descricao} {d.parcela_atual ? `(${d.parcela_atual}/${d.total_parcelas})` : ''}</td>
                    <td className="px-4 py-5 text-[10px] font-black uppercase text-white/80">{d.categoria}</td>
                    <td className="px-4 py-5 text-right"><span className="text-[13px] font-black text-[#FF0000]">R$ {Number(d.valor).toFixed(2).replace('.', ',')}</span></td>
                    <td className="px-4 py-5 text-right flex items-center justify-end gap-2">
                      {d.status !== 'pago' ? (
                        <button onClick={async () => {
                           if(window.confirm('Confirmar pagamento desta despesa?')) {
                             const token = localStorage.getItem('acorde_token');
                             await fetch(`/api/despesas/${d.id}/baixa`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
                             fetchData();
                           }
                        }} className="bg-white text-black px-4 py-2 text-[9px] font-black uppercase shadow-hard hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">PAGAR</button>
                      ) : <span className="text-[9px] font-black uppercase opacity-20">PAGO</span>}
                      <button onClick={async (e) => {
                          e.stopPropagation();
                          if(window.confirm('Excluir esta despesa definitivamente?')) {
                            const token = localStorage.getItem('acorde_token');
                            await fetch(`/api/despesas/${d.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                            fetchData();
                          }
                      }} className="text-[#FF0000] p-2 hover:bg-[#FF0000]/20 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[#1A1A1A] border-4 border-white p-6 shadow-hard">
           {/* ... Folha Professor mantém-se igual ... */}
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
                    <tr 
                      key={`prof-${r.professor_id}-${i}`} 
                      className="hover:bg-white/5 transition-colors cursor-pointer group"
                      onClick={() => abrirFolha(r.professor_id, r.professor_nome)}
                    >
                      <td className="px-4 py-5 font-bold uppercase text-[11px] group-hover:text-[#FF8A00] transition-colors">{r.professor_nome}</td>
                      <td className="px-4 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{r.total_aulas} AULAS</td>
                      <td className="px-4 py-5 text-[12px] font-black text-[#00FF41]">R$ {r.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-5 text-right font-black uppercase text-[9px] text-[#FF8A00] animate-pulse">GERENCIAR <ChevronRight className="inline w-3 h-3"/></td>
                    </tr>
                  ))}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      <AnimatePresence>
        {whatsappModal && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1A1A1A] border-4 border-white p-6 md:p-8 w-full max-w-lg shadow-hard relative">
              <button onClick={() => setWhatsappModal(null)} className="absolute -top-6 -right-6 bg-[#FF0000] border-4 border-black p-2 shadow-hard-black transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                 <X className="w-6 h-6 text-white" />
              </button>
              
              <h2 className="text-xl font-black uppercase mb-6 border-b-4 border-white pb-4 tracking-tighter flex items-center gap-3">
                 <MessageCircle className="w-6 h-6 text-[#FF8A00]" />
                 Exportar para WhatsApp
              </h2>
              <div className="bg-black border-2 border-white/20 p-4 relative group">
                <textarea 
                  readOnly 
                  className="w-full h-64 bg-transparent text-[#00FF41] text-[11px] font-mono outline-none resize-none"
                  value={gerarListaWhatsApp(whatsappModal)}
                  id="whatsapp-text"
                />
                <button 
                  onClick={() => {
                     const el = document.getElementById('whatsapp-text') as HTMLTextAreaElement;
                     el?.select();
                     document.execCommand('copy');
                     alert('Copiado para a área de transferência!');
                  }}
                  className="absolute top-4 right-4 bg-white text-black p-2 border-2 border-black shadow-hard hover:translate-y-1 hover:translate-x-1 hover:shadow-none active:scale-95 transition-all"
                  title="Copiar texto"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Despesa Nova */}
      <AnimatePresence>
        {showDespesaModal && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1A1A1A] border-4 border-white p-8 w-full max-w-md shadow-hard relative">
              <button onClick={() => setShowDespesaModal(false)} className="absolute -top-6 -right-6 bg-[#FF0000] border-4 border-black p-2 shadow-hard-black transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                 <X className="w-6 h-6 text-white" />
              </button>
              
              <h2 className="text-2xl font-black uppercase mb-8 border-b-4 border-white pb-4 tracking-tighter flex items-center gap-3">
                 <Plus className="w-6 h-6 text-[#FF0000]" />
                 Lançar Despesa
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-[#FF0000] uppercase tracking-widest block mb-1">Descrição</label>
                  <input value={despesaForm.descricao} onChange={e => setDespesaForm(f => ({...f, descricao: e.target.value}))} placeholder="Ex: Conta de Luz" className="w-full bg-black border-2 border-white/20 p-2 text-[10px] font-bold uppercase focus:border-[#FF0000] outline-none text-white" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-[#FF0000] uppercase tracking-widest block mb-1">Valor (R$)</label>
                    <input type="number" step="0.01" value={despesaForm.valor} onChange={e => setDespesaForm(f => ({...f, valor: e.target.value}))} placeholder="0,00" className="w-full bg-black border-2 border-white/20 p-2 text-[10px] font-bold uppercase focus:border-[#FF0000] outline-none text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-[#FF0000] uppercase tracking-widest block mb-1">Data Venc.</label>
                    <input type="date" value={despesaForm.data_vencimento} onChange={e => setDespesaForm(f => ({...f, data_vencimento: e.target.value}))} className="w-full bg-black border-2 border-white/20 p-2 text-[10px] font-bold uppercase focus:border-[#FF0000] outline-none text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-[#FF0000] uppercase tracking-widest block mb-1">Categoria</label>
                    <select value={despesaForm.categoria} onChange={e => setDespesaForm(f => ({...f, categoria: e.target.value}))} className="w-full bg-black border-2 border-white/20 p-2 text-[10px] font-bold uppercase focus:border-[#FF0000] outline-none text-white">
                      <option value="fixa">Conta Fixa</option>
                      <option value="parcelada">Parcelada</option>
                      <option value="divida">Dívida / Empréstimo</option>
                      <option value="remuneracao">Remuneração</option>
                      <option value="impostos">Impostos</option>
                      <option value="outros">Outros</option>
                    </select>
                  </div>
                  {despesaForm.categoria === 'parcelada' && (
                    <div>
                      <label className="text-[10px] font-black text-[#FF0000] uppercase tracking-widest block mb-1">Qtd Parcelas</label>
                      <input type="number" min="1" value={despesaForm.total_parcelas} onChange={e => setDespesaForm(f => ({...f, total_parcelas: Number(e.target.value)}))} className="w-full bg-black border-2 border-white/20 p-2 text-[10px] font-bold uppercase focus:border-[#FF0000] outline-none text-white" />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                 <button onClick={() => setShowDespesaModal(false)} className="flex-1 p-3 text-[10px] font-black uppercase hover:underline">VOLTAR</button>
                 <button onClick={handleSaveDespesa} disabled={saving} className="flex-1 bg-[#FF0000] text-white border-4 border-black p-3 shadow-hard-black font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
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

      {/* Modal Cobranca */}
      <AnimatePresence>
        {cobrancaModal.open && cobrancaModal.p && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setCobrancaModal({ open: false, p: null })}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-[#1A1A1A] border-4 border-white p-6 w-full max-w-sm shadow-hard relative">
              <button onClick={() => setCobrancaModal({ open: false, p: null })} className="absolute -top-4 -right-4 bg-[#FF0000] p-1 border-2 border-black shadow-hard-black hover:translate-x-1 hover:translate-y-1 transition-all">
                 <X className="w-5 h-5 text-white" />
              </button>
              <h3 className="text-[#FF8A00] font-black uppercase mb-4 text-lg border-b-4 border-white/20 pb-2 tracking-tighter">Cobrança</h3>
              <p className="text-white font-bold text-[10px] mb-4 uppercase">Envie a mensagem abaixo para o aluno:</p>
              <div className="bg-black border-2 border-white/20 p-4 text-[10px] font-bold text-gray-300 select-all mb-6 uppercase leading-relaxed">
                {(() => {
                  const p = cobrancaModal.p;
                  const isLate = isAtrasado(p);
                  const nome = p.aluno_nome || p.descricao;
                  const valorStr = Number(p.valor).toFixed(2).replace('.', ',');
                  const vencStr = p.data_vencimento ? format(new Date(p.data_vencimento + 'T12:00:00'), 'dd/MM') : 'vencimento';
                  
                  if (isLate) {
                    return `Olá ${nome}, tudo bem? O pagamento da sua mensalidade no valor de R$ ${valorStr} está em atraso. A chave PIX CNPJ é 55.273.720.0001-12. Aguardamos o comprovante para dar baixa no sistema! Obrigado.`;
                  } else {
                    return `Olá ${nome}, tudo bem? Sua mensalidade no valor de R$ ${valorStr} está próxima do vencimento (${vencStr}). Pague até o dia do vencimento para garantir seu desconto. A chave PIX CNPJ é 55.273.720.0001-12. Aguardamos o comprovante para dar baixa no sistema! Obrigado.`;
                  }
                })()}
              </div>
              <button 
                onClick={() => {
                  const p = cobrancaModal.p;
                  const isLate = isAtrasado(p);
                  const nome = p.aluno_nome || p.descricao;
                  const valorStr = Number(p.valor).toFixed(2).replace('.', ',');
                  const vencStr = p.data_vencimento ? format(new Date(p.data_vencimento + 'T12:00:00'), 'dd/MM') : 'vencimento';
                  const msg = isLate 
                    ? `Olá ${nome}, tudo bem? O pagamento da sua mensalidade no valor de R$ ${valorStr} está em atraso. A chave PIX CNPJ é 55.273.720.0001-12. Aguardamos o comprovante para dar baixa no sistema! Obrigado.`
                    : `Olá ${nome}, tudo bem? Sua mensalidade no valor de R$ ${valorStr} está próxima do vencimento (${vencStr}). Pague até o dia do vencimento para garantir seu desconto. A chave PIX CNPJ é 55.273.720.0001-12. Aguardamos o comprovante para dar baixa no sistema! Obrigado.`;
                  
                  navigator.clipboard.writeText(msg);
                  localStorage.setItem(`cobranca_${cobrancaModal.p.id}`, new Date().toISOString());
                  setCobrancaModal({ open: false, p: null });
                  setPagamentos([...pagamentos]); // trigger re-render
                }}
                className="w-full bg-[#00FF41] text-black border-4 border-black p-4 shadow-hard-black font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                <Copy className="w-4 h-4" /> Copiar Mensagem
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
      
      {/* Folha Professor Modal */}
      <AnimatePresence>
        {folhaModal.open && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1A1A1A] border-4 border-white p-6 md:p-8 w-full max-w-2xl shadow-hard relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setFolhaModal({ ...folhaModal, open: false })} className="absolute -top-6 -right-6 bg-[#FF0000] border-4 border-black p-2 shadow-hard-black transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
                 <X className="w-6 h-6 text-white" />
              </button>
              
              <h2 className="text-xl md:text-2xl font-black uppercase mb-6 border-b-4 border-white pb-4 tracking-tighter flex items-center gap-3">
                 <Users className="w-6 h-6 text-[#FF8A00]" />
                 Folha: {folhaModal.nome}
              </h2>

              <div className="mb-8">
                <h3 className="text-[10px] font-black text-[#FF8A00] uppercase tracking-widest mb-3">Aulas Realizadas no Período</h3>
                <div className="bg-black border-2 border-white/20 p-2 max-h-60 overflow-y-auto">
                  {loadingFolha ? (
                    <div className="p-4 text-center text-[10px] uppercase font-bold animate-pulse">Carregando aulas...</div>
                  ) : aulasFolha.length === 0 ? (
                    <div className="p-4 text-center text-[10px] uppercase font-bold text-white/50">Nenhuma aula registrada neste mês.</div>
                  ) : (
                    <table className="w-full text-left">
                      <tbody>
                        {aulasFolha.map(aula => (
                          <tr key={aula.id} className="border-b border-white/10 hover:bg-white/5">
                            <td className="p-2 text-[10px] font-bold uppercase">{aula.data.split('-').reverse().join('/')}</td>
                            <td className="p-2 text-[10px] font-mono text-white/50">{aula.horario?.substring(0,5)}</td>
                            <td className="p-2 text-[10px] font-bold uppercase truncate max-w-[120px]">{aula.alunos?.nome || 'Avulso'}</td>
                            <td className="p-2 text-right">
                              <button onClick={() => removerAulaFolha(aula.id)} className="text-red-500 hover:text-red-400 p-1">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <form onSubmit={adicionarAulaFolha} className="bg-black/50 border-2 border-white/20 p-4">
                <h3 className="text-[10px] font-black text-[#00FF41] uppercase tracking-widest mb-4 flex items-center gap-2"><Plus className="w-3 h-3"/> Incluir Aula Retroativa</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-[9px] font-bold text-white/50 block mb-1">DATA</label>
                    <input type="date" required value={novaAulaFolha.data} onChange={e => setNovaAulaFolha({...novaAulaFolha, data: e.target.value})} className="w-full bg-black border border-white/20 p-2 text-[10px] text-white outline-none focus:border-[#00FF41]" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-white/50 block mb-1">HORÁRIO</label>
                    <input type="time" required value={novaAulaFolha.horario} onChange={e => setNovaAulaFolha({...novaAulaFolha, horario: e.target.value})} className="w-full bg-black border border-white/20 p-2 text-[10px] text-white outline-none focus:border-[#00FF41]" />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-white/50 block mb-1">ALUNO (Opcional)</label>
                    <select value={novaAulaFolha.aluno_id} onChange={e => setNovaAulaFolha({...novaAulaFolha, aluno_id: e.target.value})} className="w-full bg-black border border-white/20 p-2 text-[10px] uppercase text-white outline-none focus:border-[#00FF41]">
                      <option value="">Nenhum / Avulso</option>
                      {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full bg-[#00FF41] text-black font-black uppercase text-[10px] py-3 shadow-hard hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all">
                  Adicionar à Folha
                </button>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MURAL DA VERGONHA MODAL */}
      <AnimatePresence>
        {muralVergonhaOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#1A1A1A] border-4 border-[#8B0000] w-[95vw] h-[95vh] max-w-full max-h-full flex flex-col shadow-[16px_16px_0_#8B0000]">
              <div className="flex items-center justify-between p-6 border-b-4 border-[#8B0000] bg-[#8B0000]">
                <div className="flex items-center gap-4">
                  <ShieldAlert className="w-8 h-8 text-white" />
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Mural da Vergonha</h2>
                    <p className="text-white/80 text-xs font-bold uppercase">Devedores Crônicos e Inadimplentes</p>
                  </div>
                </div>
                <button onClick={() => setMuralVergonhaOpen(false)} className="text-white hover:rotate-90 transition-transform"><X className="w-8 h-8" /></button>
              </div>

              <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
                <div className="bg-white border-4 border-black p-4 text-center">
                   <p className="text-xs font-black uppercase text-slate-500 mb-1">TOTAL NO MURAL</p>
                   <h3 className="text-4xl font-black text-[#8B0000]">
                     R$ {muralData.reduce((acc, curr) => acc + Number(curr.valor_divida), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                   </h3>
                </div>

                <div className="bg-black/50 border-2 border-white/20 p-4">
                  <h4 className="text-[10px] font-black uppercase text-[#FF8A00] mb-3">Adicionar ao Mural Manualmente</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input type="text" placeholder="Nome do Cliente" value={muralInput.nome_cliente} onChange={e => setMuralInput({...muralInput, nome_cliente: e.target.value})} className="flex-1 bg-black border border-white/20 p-2 text-xs text-white uppercase outline-none focus:border-[#FF8A00]" />
                    <input type="number" placeholder="Valor" value={muralInput.valor_divida} onChange={e => setMuralInput({...muralInput, valor_divida: e.target.value})} className="w-full sm:w-32 bg-black border border-white/20 p-2 text-xs text-white uppercase outline-none focus:border-[#FF8A00]" />
                    <input type="text" placeholder="Tipo (Ex: Mensalidade)" value={muralInput.tipo_divida} onChange={e => setMuralInput({...muralInput, tipo_divida: e.target.value})} className="flex-1 bg-black border border-white/20 p-2 text-xs text-white uppercase outline-none focus:border-[#FF8A00]" />
                    <button onClick={handleAddMural} className="bg-[#8B0000] text-white px-4 py-2 font-black text-[10px] uppercase hover:bg-white hover:text-[#8B0000] transition-colors"><Plus className="w-4 h-4"/></button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {muralData.map(item => (
                    <div key={item.id} className="bg-white border-2 border-black p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                         <div>
                           <h4 className="font-black text-black uppercase text-lg">{item.nome_cliente}</h4>
                           <p className="text-[10px] font-bold text-slate-500 uppercase">{item.tipo_divida}</p>
                         </div>
                         <p className="font-black text-[#FF0000] text-xl">R$ {Number(item.valor_divida).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                      </div>
                      
                      <div className="flex gap-2 mt-2 pt-2 border-t-2 border-slate-100">
                        <button onClick={() => setMensagemDuraPreview(item)} className="flex-1 bg-black text-white text-[9px] font-black uppercase py-2 hover:bg-[#FF8A00] transition-colors text-center">Mensagem</button>
                        <button onClick={() => setNotificacaoPreview(item)} className="flex-1 bg-slate-200 text-black text-[9px] font-black uppercase py-2 hover:bg-slate-300 transition-colors text-center">Notificação (PDF)</button>
                        <button onClick={() => handleRemoveMural(item.id)} className="px-3 bg-red-100 text-red-600 hover:bg-red-200 transition-colors flex items-center justify-center"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  ))}
                  {muralData.length === 0 && (
                    <p className="text-white/50 text-xs font-mono col-span-full text-center py-8">Nenhum devedor no mural. (Ainda bem!)</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE MENSAGEM DE COBRANÇA */}
      <AnimatePresence>
        {mensagemDuraPreview && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white border-4 border-black w-full max-w-md p-6 relative">
              <button onClick={() => setMensagemDuraPreview(null)} className="absolute top-4 right-4 text-black hover:scale-110 transition-transform"><X className="w-6 h-6" /></button>
              <h3 className="text-xl font-black uppercase mb-4 text-[#8B0000] border-b-4 border-[#8B0000] inline-block">Cobrança SPC/Serasa</h3>
              
              <div className="bg-slate-100 p-4 text-xs font-mono mb-6 whitespace-pre-wrap border border-slate-300">
                {`Prezado(a) ${mensagemDuraPreview.nome_cliente},\n\nConsta em nosso sistema uma pendência em aberto referente a ${mensagemDuraPreview.tipo_divida} no valor de R$ ${Number(mensagemDuraPreview.valor_divida).toLocaleString('pt-BR', {minimumFractionDigits:2})}.\n\nRessaltamos que, de acordo com o contrato firmado, a manutenção deste débito poderá acarretar na inclusão do seu CPF junto aos órgãos de proteção ao crédito (SPC/Serasa).\n\nEvite restrições em seu nome e o envio desta cobrança para o setor jurídico. Aguardamos o seu retorno com o comprovante de pagamento o mais breve possível.\n\nAtenciosamente,\nStudio Acorde`}
              </div>

              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`Prezado(a) ${mensagemDuraPreview.nome_cliente},\n\nConsta em nosso sistema uma pendência em aberto referente a ${mensagemDuraPreview.tipo_divida} no valor de R$ ${Number(mensagemDuraPreview.valor_divida).toLocaleString('pt-BR', {minimumFractionDigits:2})}.\n\nRessaltamos que, de acordo com o contrato firmado, a manutenção deste débito poderá acarretar na inclusão do seu CPF junto aos órgãos de proteção ao crédito (SPC/Serasa).\n\nEvite restrições em seu nome e o envio desta cobrança para o setor jurídico. Aguardamos o seu retorno com o comprovante de pagamento o mais breve possível.\n\nAtenciosamente,\nStudio Acorde`);
                  setMensagemDuraPreview(null);
                }} 
                className="w-full bg-[#00FF41] text-black font-black uppercase py-4 text-sm flex items-center justify-center gap-2 shadow-hard hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all"
              >
                <Copy className="w-5 h-5"/> Copiar Mensagem
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PREVIEW DA NOTIFICAÇÃO EXTRAJUDICIAL EM PDF */}
      <AnimatePresence>
        {notificacaoPreview && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-3xl max-h-[95vh] flex flex-col gap-4">
              <div className="flex justify-between items-center bg-white p-4">
                <h3 className="text-xl font-black uppercase text-black">Visualização do PDF</h3>
                <div className="flex gap-4">
                  <button onClick={gerarPDFNotificacao} className="bg-[#8B0000] text-white px-6 py-2 font-black uppercase text-xs flex items-center gap-2 hover:bg-black transition-colors"><Download className="w-4 h-4"/> Baixar PDF</button>
                  <button onClick={() => setNotificacaoPreview(null)} className="text-black hover:rotate-90 transition-transform"><X className="w-8 h-8" /></button>
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-slate-200 p-8 flex justify-center">
                {/* O elemento HTML que será convertido em PDF */}
                <div id="notificacao-pdf-content" className="bg-white p-12 w-[210mm] min-h-[297mm] text-black shrink-0 relative" style={{ fontFamily: 'Times New Roman, serif' }}>
                  <div className="text-center mb-12 flex flex-col items-center">
                     <img src="/logo-studio.png" alt="Studio Acorde" className="w-48 mb-4" />
                     <h1 className="text-xl font-bold uppercase">STUDIO ACORDE ESCOLA DE MUSICA LTDA</h1>
                     <p className="text-sm">CNPJ: 55.273.720/0001-12</p>
                  </div>

                  <h2 className="text-center text-2xl font-bold uppercase mb-12 underline tracking-widest">Notificação Extrajudicial</h2>

                  <div className="text-justify text-base leading-relaxed space-y-6">
                    <p>À(ao) Sr(a). <strong>{notificacaoPreview.nome_cliente}</strong>,</p>
                    <p>
                      A <strong>STUDIO ACORDE ESCOLA DE MUSICA LTDA</strong>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 55.273.720/0001-12, vem por meio desta notificá-lo(a) extrajudicialmente sobre a existência de pendências financeiras em seu nome junto à nossa instituição.
                    </p>
                    <p>
                      Conforme consta em nossos registros, encontra-se em aberto o valor de <strong>R$ {Number(notificacaoPreview.valor_divida).toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong> referente a <strong>{notificacaoPreview.tipo_divida}</strong>, cujo vencimento já expirou e até a presente data não acusamos o recebimento.
                    </p>
                    <p>
                      Solicitamos que o pagamento seja regularizado imediatamente. O não atendimento a esta notificação no prazo de 48 horas poderá ensejar a tomada das medidas legais e contratuais cabíveis, incluindo o registro de seu nome e CPF nos órgãos de proteção ao crédito (SPC e SERASA), bem como o encaminhamento do débito para cobrança através de nosso departamento jurídico, o que implicará no acréscimo de custas processuais e honorários advocatícios.
                    </p>
                    <p>
                      Caso o pagamento já tenha sido efetuado, solicitamos a gentileza de desconsiderar esta notificação e nos enviar o comprovante para a devida baixa em nosso sistema.
                    </p>
                  </div>

                  <div className="mt-20 text-center">
                    <p className="font-mono text-sm mb-2 text-slate-500 italic">Documento Assinado Eletronicamente por:</p>
                    <p className="font-bold uppercase mt-2">Studio Acorde Escola de Música</p>
                    <p className="text-sm">Departamento Financeiro / Jurídico</p>
                  </div>

                  <div className="absolute bottom-12 right-12 text-xs text-slate-500">
                    Gerado em: {new Date().toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
