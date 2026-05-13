import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, 
  Calendar, 
  FileText, 
  CreditCard, 
  BookOpen, 
  ArrowLeft, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Clock,
  MoreVertical,
  Edit,
  AlertCircle,
  DollarSign,
  Edit3,
  X,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import GeradorContrato from '../components/GeradorContrato';

function ProgressTracker({ aulas, total }: { aulas: any[], total: number }) {
  const totalSquares = total || 24;

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'realizada' || s === 'presente') return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
    if (s === 'falta_aluno' || s === 'ausente' || s === 'falta') return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]';
    if (s === 'a_repor' || s === 'reposição') return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]';
    if (s === 'pendente') return 'bg-slate-200';
    return 'bg-slate-100';
  };

  const sortedAulas = [...aulas].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  return (
    <div className="glass-card p-8 mb-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10 group-hover:bg-primary/10 transition-all"></div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
            Progresso do Contrato
          </h3>
          <p className="text-lg font-black text-slate-900">
            {aulas.filter(a => a.status?.toLowerCase() === 'realizada' || a.status?.toLowerCase() === 'presente').length} de {totalSquares} Aulas Realizadas
          </p>
        </div>
        <div className="flex gap-1.5">
           {['realizada', 'falta_aluno', 'a_repor', 'pendente'].map(s => (
             <div key={s} className={`w-3 h-3 rounded-full ${getStatusColor(s)}`}></div>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3">
        {Array.from({ length: totalSquares }).map((_, idx) => {
          const aula = sortedAulas[idx];
          const status = aula?.status;
          
          return (
            <div key={idx} className="relative group/square">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.01 }}
                className={`aspect-square rounded-lg transition-all hover:scale-110 cursor-pointer border border-slate-200/50 flex items-center justify-center ${getStatusColor(status)}`}
              >
                {aula && (status === 'realizada' || status === 'presente') && <Check className="w-3 h-3 text-white" />}
                {aula && (status === 'falta_aluno' || status === 'ausente') && <X className="w-3 h-3 text-white" />}
                {aula && status === 'a_repor' && <Clock className="w-3 h-3 text-white" />}
              </motion.div>

              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover/square:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap shadow-xl">
                {aula ? (
                  <div className="space-y-1">
                    <p className="font-black">{format(new Date(aula.data), 'dd/MM/yyyy')}</p>
                    <p className="opacity-70 uppercase tracking-widest text-[8px] font-bold">{status?.replace('_', ' ')}</p>
                  </div>
                ) : (
                  "Aula ainda não agendada"
                )}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-6 mt-8 pt-6 border-t border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Realizada</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Falta Aluno</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> A Repor</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div> Pendente</div>
      </div>
    </div>
  );
}

function FinanceiroTracker({ financeiro, total }: { financeiro: any[], total: number }) {
  const totalSquares = total || 12;

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'pago') return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
    if (s === 'atrasado') return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]';
    if (s === 'pendente') return 'bg-slate-200';
    return 'bg-slate-100';
  };

  const sortedFinanceiro = [...financeiro].sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());

  return (
    <div className="glass-card p-8 mb-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10 group-hover:bg-primary/10 transition-all"></div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
            Status Financeiro
          </h3>
          <p className="text-lg font-black text-slate-900">
            {financeiro.filter(f => f.status?.toLowerCase() === 'pago').length} de {totalSquares} Parcelas Pagas
          </p>
        </div>
        <div className="flex gap-1.5">
           {['pago', 'atrasado', 'pendente'].map(s => (
             <div key={s} className={`w-3 h-3 rounded-full ${getStatusColor(s)}`}></div>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3">
        {Array.from({ length: totalSquares }).map((_, idx) => {
          const fatura = sortedFinanceiro[idx];
          const status = fatura?.status;
          
          return (
            <div key={idx} className="relative group/square">
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.01 }}
                className={`aspect-square rounded-lg transition-all hover:scale-110 cursor-pointer border border-slate-200/50 flex items-center justify-center ${getStatusColor(status)}`}
              >
                {fatura && status === 'pago' && <Check className="w-3 h-3 text-white" />}
                {fatura && status === 'atrasado' && <XCircle className="w-3 h-3 text-white" />}
              </motion.div>
              
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover/square:opacity-100 pointer-events-none transition-all z-50 whitespace-nowrap shadow-xl">
                {fatura ? (
                  <div className="space-y-1">
                    <p className="font-black">{fatura.referencia_mes_ano || format(new Date(fatura.data_vencimento), 'MM/yyyy')}</p>
                    <p className="opacity-70">Vencimento: {format(new Date(fatura.data_vencimento), 'dd/MM/yyyy')}</p>
                    <p className="font-bold text-emerald-400 uppercase tracking-widest">{status}</p>
                    {fatura.data_pagamento && <p className="opacity-70 italic text-[8px]">Pago em: {format(new Date(fatura.data_pagamento), 'dd/MM/yyyy')}</p>}
                  </div>
                ) : (
                  "Parcela não gerada"
                )}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-6 mt-8 pt-6 border-t border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Pago</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Atrasado</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div> Pendente</div>
      </div>
    </div>
  );
}


function FinanceiroTab({ financeiro, alunoId, onRefresh }: { financeiro: any[], alunoId: string, onRefresh: () => void }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [baixaModal, setBaixaModal] = useState<{ id: number | null, open: boolean }>({ id: null, open: false });
  const [baixaMetodo, setBaixaMetodo] = useState('dinheiro');

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
    onRefresh();
  };

  const handleEditDate = async (id: number) => {
    if (!editDate) return;
    setSaving(true);
    await fetch(`/api/pagamentos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data_vencimento: editDate }) });
    setSaving(false);
    setEditingId(null);
    onRefresh();
  };

  const pendentes = financeiro.filter(f => f.status !== 'pago').sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
  const pagos = financeiro.filter(f => f.status === 'pago').sort((a, b) => new Date(b.data_vencimento).getTime() - new Date(a.data_vencimento).getTime());
  const sorted = [...pendentes, ...pagos];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      <FinanceiroTracker financeiro={financeiro} total={financeiro.length} />
      
      <div className="glass-card overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-white flex items-center justify-between">
        <h3 className="font-black text-slate-900">Mensalidades e Cobranças</h3>
        <span className="text-xs font-bold text-slate-400">{pendentes.length} pendente(s)</span>
      </div>
      {sorted.length === 0 ? (
        <div className="p-20 text-center space-y-4">
          <CreditCard className="w-12 h-12 text-slate-200 mx-auto" />
          <p className="text-slate-500 font-bold">Nenhuma fatura encontrada.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-left tracking-widest">Descrição / Ref</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-left tracking-widest">Vencimento</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-left tracking-widest">Valor</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-left tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right tracking-widest">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.map(fat => (
                <tr key={fat.id} className={`hover:bg-slate-50/50 transition-all ${fat.status !== 'pago' ? 'bg-red-50/20' : ''}`}>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-700 text-sm">{fat.tipo_receita === 'mensalidade' ? 'Mensalidade' : (fat.descricao || fat.tipo_receita)}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{fat.referencia_mes_ano}</p>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-600">
                    {editingId === fat.id ? (
                      <div className="flex items-center gap-2">
                        <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        <button onClick={() => handleEditDate(fat.id)} disabled={saving} className="p-1 bg-emerald-500 text-white rounded-lg"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 bg-slate-200 text-slate-600 rounded-lg"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <span className="flex items-center gap-2">
                        {format(new Date(fat.data_vencimento + 'T12:00:00'), 'dd/MM/yyyy')}
                        {fat.status !== 'pago' && (
                          <button onClick={() => { setEditingId(fat.id); setEditDate(fat.data_vencimento); }} className="text-slate-300 hover:text-primary transition-colors"><Edit3 className="w-3 h-3" /></button>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-black text-slate-900">R$ {Number(fat.valor).toFixed(2).replace('.', ',')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${fat.status === 'pago' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>{fat.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {fat.status !== 'pago' ? (
                      <button onClick={() => setBaixaModal({ id: fat.id, open: true })} disabled={saving} className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black hover:bg-emerald-600 transition-all flex items-center gap-1.5 ml-auto">
                        <DollarSign className="w-3 h-3" /> Dar Baixa
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400">Quitado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* Modal Baixa Financeira no Perfil do Aluno */}
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
    </motion.div>
  );
}


export default function AlunoPerfil() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [aluno, setAluno] = useState<any>(null);
  const [agenda, setAgenda] = useState<any[]>([]);
  const [financeiro, setFinanceiro] = useState<any[]>([]);
  const [frequencia, setFrequencia] = useState<any[]>([]);
  const [materiais, setMateriais] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('geral');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [contratoModal, setContratoModal] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Estados para reagendamento
  const [rescheduleModal, setRescheduleModal] = useState<{ open: boolean, aulaId: string | null, type: 'emergencial' | 'permanente', data: string, horario: string }>({ open: false, aulaId: null, type: 'emergencial', data: '', horario: '' });
  const [rescheduling, setRescheduling] = useState(false);

  // Estados para Materiais
  const [materialModal, setMaterialModal] = useState(false);
  const [novoMaterial, setNovoMaterial] = useState({ titulo: '', url: '', tipo: 'link' });
  const [savingMaterial, setSavingMaterial] = useState(false);

  const fetchAgenda = async () => {
    const res = await fetch(`/api/alunos/${id}/agenda`).then(r => r.json());
    setAgenda(res);
    setFrequencia(res.filter((a: any) => new Date(a.data + 'T23:59:59') < new Date() || a.status !== 'pendente'));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('icon', file);

    setUploadingAvatar(true);
    try {
      const res = await fetch('/api/gamificacao/upload', { method: 'POST', body: data });
      if (res.ok) {
        const json = await res.json();
        const updateRes = await fetch(`/api/alunos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar_url: json.url })
        });
        if (updateRes.ok) {
          setAluno({ ...aluno, avatar_url: json.url });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`/api/alunos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        setAluno({ ...aluno, ...editFormData });
        setIsEditModalOpen(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [alunoData, agendaData, financeiroData, materiaisData] = await Promise.all([
          fetch(`/api/alunos/${id}`).then(res => res.json()),
          fetch(`/api/alunos/${id}/agenda`).then(res => res.json()),
          fetch(`/api/alunos/${id}/financeiro`).then(res => res.json()),
          fetch(`/api/alunos/${id}/materiais`).then(res => res.json())
        ]);
        
        setAluno(alunoData);
        setAgenda(agendaData);
        setFinanceiro(financeiroData);
        setMateriais(materiaisData);
        // Filtrar frequência (aulas passadas)
        const past = agendaData.filter((a: any) => new Date(a.data + 'T23:59:59') < new Date() || a.status !== 'pendente');
        setFrequencia(past);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const updateAttendance = async (aulaId: number, status: string) => {
    try {
      const res = await fetch(`/api/aulas/${aulaId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        // Refresh agenda
        fetchAgenda();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReschedule = async () => {
    setRescheduling(true);
    try {
      if (rescheduleModal.type === 'emergencial' && rescheduleModal.aulaId) {
        // Mudar apenas 1 aula
        await fetch(`/api/aulas/${rescheduleModal.aulaId.replace('reg-', '').replace('exp-', '')}/reschedule`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: rescheduleModal.data, horario: rescheduleModal.horario })
        });
      } else {
        // Mudar permanente (todas as aulas futuras)
        // Precisamos atualizar todas as aulas do aluno que estão pendentes e com data >= hoje
        const today = new Date().toISOString().split('T')[0];
        const futuras = agenda.filter(a => a.status === 'pendente' && a.data >= today);
        
        for (const aula of futuras) {
           await fetch(`/api/aulas/${aula.id}/reschedule`, {
             method: 'PATCH',
             headers: { 'Content-Type': 'application/json' },
             // Mantemos a data daquela aula, mudamos apenas o horário
             body: JSON.stringify({ data: aula.data, horario: rescheduleModal.horario })
           });
        }
        
        // E também atualizamos a matrícula do aluno para o novo horário
        await fetch(`/api/alunos/${id}`, {
           method: 'PATCH',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ horario: rescheduleModal.horario })
        });
      }
      fetchAgenda();
      setRescheduleModal({ ...rescheduleModal, open: false });
    } catch (err) {
      console.error(err);
    }
    setRescheduling(false);
  };

  const handleAddMaterial = async () => {
    if (!novoMaterial.titulo || !novoMaterial.url) return;
    setSavingMaterial(true);
    const res = await fetch(`/api/alunos/${id}/materiais`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoMaterial)
    });
    if (res.ok) {
      const data = await res.json();
      setMateriais([data, ...materiais]);
      setMaterialModal(false);
      setNovoMaterial({ titulo: '', url: '', tipo: 'link' });
    }
    setSavingMaterial(false);
  };

  const handleDeleteMaterial = async (matId: number) => {
    if (!confirm('Deseja remover este material?')) return;
    await fetch(`/api/materiais/${matId}`, { method: 'DELETE' });
    setMateriais(materiais.filter(m => m.id !== matId));
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-400 animate-pulse">Carregando Perfil...</div>;
  if (!aluno) return <div className="p-20 text-center font-black text-red-500">Aluno não encontrado.</div>;

  const isMinor = () => {
    if (!aluno.data_nascimento) return false;
    const age = new Date().getFullYear() - new Date(aluno.data_nascimento).getFullYear();
    return age < 18;
  };

  const tabs = [
    { id: 'geral', label: 'Informações', icon: User },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'frequencia', label: 'Frequência', icon: CheckCircle2 },
    { id: 'financeiro', label: 'Financeiro', icon: CreditCard },
    { id: 'materiais', label: 'Materiais', icon: BookOpen },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-50/50">
      <header className="bg-white border-b border-slate-200 p-8 shadow-sm">
        <button 
          onClick={() => navigate('/alunos')}
          className="flex items-center gap-2 text-slate-400 hover:text-primary transition-all font-bold text-xs uppercase tracking-widest mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para lista
        </button>

        <div className="flex items-center gap-8">
          <label className="w-24 h-24 rounded-3xl bg-orange-100 border-4 border-white shadow-xl flex items-center justify-center text-orange-600 text-4xl font-black relative overflow-hidden group cursor-pointer">
            {uploadingAvatar && <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center text-white text-[10px] font-bold">Enviando...</div>}
            {aluno.avatar_url ? (
               <img src={aluno.avatar_url} alt="Avatar" className="w-full h-full object-cover z-10" />
            ) : (
               (aluno.nome || '?').charAt(0)
            )}
            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-[10px] font-bold z-20">
              ALTERAR FOTO
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </label>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{aluno.nome}</h1>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                aluno.status === 'ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {aluno.status}
              </span>
            </div>
            <div className="flex items-center gap-6 text-slate-500 text-sm font-medium">
               <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {aluno.email || 'Sem e-mail'}</span>
               <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {aluno.telefone || 'Sem telefone'}</span>
               <span className="flex items-center gap-1.5 bg-orange-100 text-orange-700 px-3 py-1 rounded-lg text-xs font-black border border-orange-200">
                  <Calendar className="w-3.5 h-3.5" /> Saldo: {agenda.filter(a => a.status?.toLowerCase() === 'pendente').length} Aulas
               </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
             <div className="flex gap-2">
               <button 
                 onClick={() => setContratoModal(true)}
                 className="bg-slate-900 text-white border border-transparent px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-2"
               >
                 <FileText className="w-4 h-4" /> Gerar Contrato
               </button>
               <button 
                 onClick={() => {
                   setEditFormData({ 
                     nome: aluno.nome, 
                     email: aluno.email, 
                     telefone: aluno.telefone, 
                     cpf: aluno.cpf, 
                     endereco: aluno.endereco,
                     responsavel_nome: aluno.responsavel_nome,
                     responsavel_telefone: aluno.responsavel_telefone
                   });
                   setIsEditModalOpen(true);
                 }}
                 className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-2"
               >
                 <Edit className="w-4 h-4" /> Editar Perfil
               </button>
             </div>
          </div>
        </div>
      </header>

      <div className="px-8 mt-[-1px]">
        <div className="flex gap-8 border-b border-slate-200 bg-white shadow-sm rounded-b-3xl px-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-6 px-4 flex items-center gap-2 text-sm font-black transition-all relative ${
                activeTab === tab.id ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="p-8 flex-1 overflow-auto custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'geral' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              <div className="lg:col-span-2 space-y-8">
                <div className="glass-card p-8 space-y-6">
                   <h3 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-4">Dados Cadastrais</h3>
                   <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CPF do Aluno</p>
                        <p className="font-bold text-slate-700">{aluno.cpf || 'Não informado'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data de Nascimento</p>
                        <p className="font-bold text-slate-700">{aluno.data_nascimento ? format(new Date(aluno.data_nascimento), 'dd/MM/yyyy') : 'Não informada'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Endereço Completo</p>
                        <p className="font-bold text-slate-700 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {aluno.endereco || 'Não informado'}</p>
                      </div>
                   </div>
                </div>

                {isMinor() && (
                  <div className="bg-orange-50 border border-orange-200 p-8 rounded-3xl space-y-6">
                     <h3 className="text-lg font-black text-orange-900 border-b border-orange-200/50 pb-4 flex items-center gap-2">
                       <AlertCircle className="w-5 h-5 text-orange-500" /> Responsável Legal
                     </h3>
                     <div className="grid grid-cols-2 gap-8">
                        <div>
                          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Nome do Responsável</p>
                          <p className="font-bold text-orange-900">{aluno.responsavel_nome}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">CPF do Responsável</p>
                          <p className="font-bold text-orange-900">{aluno.responsavel_cpf || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">WhatsApp do Responsável</p>
                          <p className="font-bold text-orange-900 flex items-center gap-2"><Phone className="w-4 h-4 text-orange-500" /> {aluno.responsavel_telefone}</p>
                        </div>
                     </div>
                  </div>
                )}
              </div>

              <div className="space-y-8">
                 <div className="glass-card p-6 bg-primary text-white space-y-4 shadow-xl shadow-primary/20">
                    <h3 className="text-sm font-black uppercase tracking-widest opacity-80">Próxima Aula</h3>
                    {agenda.filter(a => new Date(a.data) >= new Date()).length > 0 ? (
                      <div>
                        <p className="text-2xl font-black">{format(new Date(agenda.find(a => new Date(a.data) >= new Date()).data), "dd 'de' MMMM", { locale: ptBR })}</p>
                        <p className="font-bold opacity-90 mt-1 flex items-center gap-2"><Clock className="w-4 h-4" /> {agenda.find(a => new Date(a.data) >= new Date()).horario.substring(0, 5)}</p>
                      </div>
                    ) : (
                      <p className="font-bold">Nenhuma aula agendada</p>
                    )}
                 </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'agenda' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                 <h3 className="font-black text-slate-900">Cronograma de Aulas</h3>
                 <div className="flex gap-2">
                    <button onClick={() => setRescheduleModal({ open: true, aulaId: null, type: 'permanente', data: '', horario: '' })} className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-primary/20 transition-all active:scale-95">Mudar Horário Permanente</button>
                 </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-left tracking-widest">Data</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-left tracking-widest">Horário</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-left tracking-widest">Professor</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-left tracking-widest">Tipo</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-left tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-right tracking-widest">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {agenda.map(aula => (
                      <tr key={aula.id} className="hover:bg-slate-50 transition-all">
                        <td className="px-6 py-4 font-bold text-slate-700">{format(new Date(aula.data), 'dd/MM/yyyy')}</td>
                        <td className="px-6 py-4 font-bold text-slate-600">{aula.horario.substring(0, 5)}</td>
                        <td className="px-6 py-4 font-bold text-slate-600">{aula.professor_nome}</td>
                        <td className="px-6 py-4">
                           <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter">{aula.tipo}</span>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                             (aula.status === 'realizada' || aula.status === 'presente') ? 'bg-emerald-100 text-emerald-600' : 
                             (aula.status === 'falta_aluno' || aula.status === 'ausente') ? 'bg-red-100 text-red-600' : 
                             aula.status === 'a_repor' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                           }`}>{aula.status?.replace('_', ' ')}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button onClick={() => setRescheduleModal({ open: true, aulaId: aula.id, type: 'emergencial', data: aula.data, horario: aula.horario })} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black hover:bg-slate-200 transition-all">
                             Remarcar
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'frequencia' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className=""
            >
               <ProgressTracker aulas={frequencia} total={agenda.length} />
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {frequencia.map(aula => (
                 <div key={aula.id} className="glass-card p-6 border-l-4 border-l-primary flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(new Date(aula.data), 'dd/MM/yyyy')}</p>
                          <p className="text-sm font-black text-slate-900 mt-1">{aula.curso_nome}</p>
                       </div>
                       <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                          (aula.status === 'realizada' || aula.status === 'presente') ? 'bg-emerald-500 text-white' : 
                          (aula.status === 'falta_aluno' || aula.status === 'ausente') ? 'bg-red-500 text-white' : 
                          aula.status === 'a_repor' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'
                       }`}>
                          {aula.status?.replace('_', ' ')}
                       </div>
                    </div>
                    
                    <div className="space-y-4">
                       <p className="text-xs text-slate-500 font-medium italic">"{aula.nota_aula || 'Nenhuma observação registrada para esta aula.'}"</p>
                       
                       <div className="flex gap-2 pt-4 border-t border-slate-100">
                          <button 
                            onClick={() => updateAttendance(aula.id, 'realizada')}
                            className="flex-1 bg-emerald-500 text-white py-2 rounded-xl text-[10px] font-black shadow-lg shadow-emerald-200 active:scale-95 transition-all"
                          >
                            PRESENÇA
                          </button>
                          <button 
                            onClick={() => updateAttendance(aula.id, 'falta_aluno')}
                            className="flex-1 bg-red-500 text-white py-2 rounded-xl text-[10px] font-black shadow-lg shadow-red-200 active:scale-95 transition-all"
                          >
                            FALTA
                          </button>
                       </div>
                    </div>
                 </div>
               ))}
                {frequencia.length === 0 && (
                  <div className="col-span-full p-20 text-center glass-card">
                     <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                     <p className="text-slate-500 font-bold">Nenhuma aula passada registrada para este aluno.</p>
                  </div>
                )}
               </div>
            </motion.div>
          )}

          {activeTab === 'financeiro' && (
            <FinanceiroTab financeiro={financeiro} alunoId={id!} onRefresh={() => {
              fetch(`/api/alunos/${id}/financeiro`).then(r => r.json()).then(setFinanceiro);
            }} />
          )}

          {activeTab === 'materiais' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
               <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                 <div>
                   <h3 className="font-black text-slate-900 text-lg">Materiais do Aluno</h3>
                   <p className="text-sm text-slate-500 font-bold">Gerencie links, partituras e vídeos.</p>
                 </div>
                 <button onClick={() => setMaterialModal(true)} className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2">
                   <Plus className="w-4 h-4" /> Novo Material
                 </button>
               </div>

               {materiais.length === 0 ? (
                 <div className="glass-card p-20 text-center border-2 border-dashed border-slate-200">
                    <BookOpen className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold">Nenhum material adicionado.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {materiais.map(mat => (
                     <div key={mat.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-blue-50 text-blue-500 rounded-xl">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <button onClick={() => handleDeleteMaterial(mat.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          <h4 className="font-black text-slate-800 mb-1 line-clamp-2">{mat.titulo}</h4>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{mat.tipo}</span>
                        </div>
                        <a href={mat.url} target="_blank" rel="noreferrer" className="mt-6 block w-full text-center bg-slate-50 hover:bg-slate-100 text-slate-600 py-2.5 rounded-xl text-xs font-black transition-colors">
                          Acessar Material
                        </a>
                     </div>
                   ))}
                 </div>
               )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-900">Editar Perfil</h2>
                <button onClick={() => setIsEditModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nome Completo</label>
                  <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl" value={editFormData.nome || ''} onChange={e => setEditFormData({...editFormData, nome: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">E-mail</label>
                  <input type="email" className="w-full px-4 py-3 border border-slate-200 rounded-xl" value={editFormData.email || ''} onChange={e => setEditFormData({...editFormData, email: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">WhatsApp</label>
                  <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl" value={editFormData.telefone || ''} onChange={e => setEditFormData({...editFormData, telefone: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Endereço</label>
                  <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl" value={editFormData.endereco || ''} onChange={e => setEditFormData({...editFormData, endereco: e.target.value})} />
                </div>
                {isMinor() && (
                  <>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Responsável</label>
                      <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl" value={editFormData.responsavel_nome || ''} onChange={e => setEditFormData({...editFormData, responsavel_nome: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">WhatsApp Responsável</label>
                      <input type="text" className="w-full px-4 py-3 border border-slate-200 rounded-xl" value={editFormData.responsavel_telefone || ''} onChange={e => setEditFormData({...editFormData, responsavel_telefone: e.target.value})} />
                    </div>
                  </>
                )}
                <button onClick={handleSaveEdit} className="w-full bg-primary text-white py-3 rounded-xl font-black shadow-lg shadow-primary/30 mt-4">
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL MUDANÇA HORÁRIO */}
      <AnimatePresence>
        {rescheduleModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-900">
                  {rescheduleModal.type === 'emergencial' ? 'Mudança Emergencial' : 'Mudança Permanente'}
                </h2>
                <button onClick={() => setRescheduleModal({ ...rescheduleModal, open: false })}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-slate-500 mb-4">
                  {rescheduleModal.type === 'emergencial' 
                    ? 'Altere a data e/ou horário apenas desta aula específica.'
                    : 'Esta ação mudará o horário de todas as aulas futuras agendadas. A data de cada aula será mantida.'}
                </p>

                {rescheduleModal.type === 'emergencial' && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Nova Data</label>
                    <input type="date" className="w-full px-4 py-3 border border-slate-200 rounded-xl" value={rescheduleModal.data} onChange={e => setRescheduleModal({...rescheduleModal, data: e.target.value})} />
                  </div>
                )}
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Novo Horário</label>
                  <input type="time" className="w-full px-4 py-3 border border-slate-200 rounded-xl" value={rescheduleModal.horario} onChange={e => setRescheduleModal({...rescheduleModal, horario: e.target.value})} />
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setRescheduleModal({ ...rescheduleModal, open: false })} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">Cancelar</button>
                  <button onClick={handleReschedule} disabled={rescheduling} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {rescheduling ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL MATERIAIS */}
      <AnimatePresence>
        {materialModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-900">Novo Material</h2>
                <button onClick={() => setMaterialModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Título</label>
                  <input type="text" placeholder="Ex: Partitura Für Elise" className="w-full px-4 py-3 border border-slate-200 rounded-xl" value={novoMaterial.titulo} onChange={e => setNovoMaterial({...novoMaterial, titulo: e.target.value})} />
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Link (URL)</label>
                  <input type="url" placeholder="https://..." className="w-full px-4 py-3 border border-slate-200 rounded-xl" value={novoMaterial.url} onChange={e => setNovoMaterial({...novoMaterial, url: e.target.value})} />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tipo</label>
                  <select className="w-full px-4 py-3 border border-slate-200 rounded-xl" value={novoMaterial.tipo} onChange={e => setNovoMaterial({...novoMaterial, tipo: e.target.value})}>
                    <option value="link">Link</option>
                    <option value="partitura">Partitura (PDF)</option>
                    <option value="video">Vídeo</option>
                  </select>
                </div>

                <div className="flex gap-3 mt-6">
                  <button onClick={() => setMaterialModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">Cancelar</button>
                  <button onClick={handleAddMaterial} disabled={savingMaterial || !novoMaterial.titulo || !novoMaterial.url} className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50">
                    <CheckCircle2 className="w-4 h-4" /> {savingMaterial ? 'Salvando...' : 'Adicionar'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contratoModal && aluno && (
          <GeradorContrato aluno={aluno} onClose={() => setContratoModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
