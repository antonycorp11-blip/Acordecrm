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
  Check,
  Plus,
  Trash2,
  ExternalLink,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import GeradorContrato from '../components/GeradorContrato';
import { toast } from 'sonner';

// --- STITCH COMPONENTS ---

const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-[#fff8f6] border-4 border-black shadow-[4px_4px_0_#000] p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false }: any) => {
  const variants: any = {
    primary: "bg-[#ff6b00] text-white",
    secondary: "bg-white text-black",
    dark: "bg-black text-white",
    outline: "bg-transparent border-2 border-black text-black shadow-none hover:bg-black hover:text-white"
  };
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`${variants[variant]} font-black uppercase text-[10px] tracking-widest px-4 py-2 border-2 border-black shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, color = "orange" }: any) => {
  const colors: any = {
    orange: "bg-[#ff6b00] text-white",
    bege: "bg-[#feccba] text-[#261812]",
    black: "bg-black text-white",
    green: "bg-emerald-500 text-white",
    red: "bg-red-500 text-white"
  };
  return (
    <span className={`${colors[color]} px-2 py-0.5 border border-black font-black text-[8px] uppercase tracking-tighter`}>
      {children}
    </span>
  );
};

// --- TRACKERS ---

function ProgressTracker({ aulas, total }: { aulas: any[], total: number }) {
  const totalSquares = total || 24;
  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'realizada' || s === 'presente') return 'bg-emerald-500';
    if (s === 'falta_aluno' || s === 'ausente' || s === 'falta') return 'bg-red-500';
    if (s === 'a_repor' || s === 'reposição') return 'bg-amber-500';
    if (s === 'pendente') return 'bg-[#feccba]';
    return 'bg-[#e2bfb0]';
  };

  const sortedAulas = [...aulas].sort((a, b) => new Date((a.data || '2099-12-31') + 'T12:00:00').getTime() - new Date((b.data || '2099-12-31') + 'T12:00:00').getTime());

  return (
    <Card className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[10px] font-black text-[#8e7164] uppercase tracking-[0.2em] mb-1">PROG_CONTRATO</h3>
          <p className="text-xl font-black text-black uppercase italic italic">
            {aulas.filter(a => a.status?.toLowerCase() === 'realizada' || a.status?.toLowerCase() === 'presente').length}/{totalSquares} AULAS OK
          </p>
        </div>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-24 gap-2">
        {Array.from({ length: totalSquares }).map((_, idx) => {
          const aula = sortedAulas[idx];
          const status = aula?.status;
          return (
            <div key={idx} className="group relative">
              <div className={`aspect-square border-2 border-black shadow-[1px_1px_0_#000] flex items-center justify-center transition-transform hover:scale-110 cursor-help ${getStatusColor(status)}`}>
                {aula && (status === 'realizada' || status === 'presente') && <Check className="w-3 h-3 text-white" />}
                {aula && (status === 'falta_aluno' || status === 'ausente') && <X className="w-3 h-3 text-white" />}
                {aula && status === 'a_repor' && <Clock className="w-3 h-3 text-white" />}
              </div>
              {aula && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[8px] font-black uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 z-50 pointer-events-none">
                  {format(new Date((aula.data || '2099-12-31') + 'T12:00:00'), 'dd/MM/yyyy')} - {status}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t-2 border-[#e2bfb0] text-[8px] font-black uppercase tracking-widest">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 border border-black bg-emerald-500"></div> REALIZADA</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 border border-black bg-red-500"></div> FALTA</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 border border-black bg-amber-500"></div> A REPOR</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 border border-black bg-[#feccba]"></div> PENDENTE</div>
      </div>
    </Card>
  );
}

function FinanceiroTracker({ financeiro, total }: { financeiro: any[], total: number }) {
  const totalSquares = total || 12;
  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'pago') return 'bg-emerald-500';
    if (s === 'atrasado') return 'bg-red-500';
    if (s === 'pendente') return 'bg-[#feccba]';
    return 'bg-[#e2bfb0]';
  };

  const sortedFinanceiro = [...financeiro].sort((a, b) => new Date((a.data_vencimento || '2099-12-31') + 'T12:00:00').getTime() - new Date((b.data_vencimento || '2099-12-31') + 'T12:00:00').getTime());

  return (
    <Card className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[10px] font-black text-[#8e7164] uppercase tracking-[0.2em] mb-1">STATUS_FINANCEIRO</h3>
          <p className="text-xl font-black text-black uppercase italic">
            {financeiro.filter(f => f.status?.toLowerCase() === 'pago').length}/{totalSquares} PARCELAS PAGAS
          </p>
        </div>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
        {Array.from({ length: totalSquares }).map((_, idx) => {
          const fatura = sortedFinanceiro[idx];
          const status = fatura?.status;
          return (
            <div key={idx} className="group relative">
              <div className={`aspect-square border-2 border-black shadow-[1px_1px_0_#000] flex items-center justify-center transition-transform hover:scale-110 cursor-help ${getStatusColor(status)}`}>
                {fatura && status === 'pago' && <Check className="w-3 h-3 text-white" />}
                {fatura && status === 'atrasado' && <XCircle className="w-3 h-3 text-white" />}
              </div>
              {fatura && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[8px] font-black uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 z-50 pointer-events-none">
                  {fatura.referencia_mes_ano || format(new Date((fatura.data_vencimento || '2099-12-31') + 'T12:00:00'), 'MM/yyyy')} - {status}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// --- TABS ---

function FinanceiroTab({ financeiro, alunoId, onRefresh }: { financeiro: any[], alunoId: string, onRefresh: () => void }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [baixaModal, setBaixaModal] = useState<{ id: number | null, open: boolean, valor: number, valor_desconto?: number, vencimento: string }>({ id: null, open: false, valor: 0, vencimento: '' });
  const [baixaMetodo, setBaixaMetodo] = useState('pix');
  const [valorFinal, setValorFinal] = useState(0);

  const isEligibleForDiscount = (vencimento: string) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const venc = new Date(vencimento + 'T12:00:00');
    venc.setHours(0,0,0,0);
    return today <= venc;
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
      body: JSON.stringify({ metodo_pagamento: baixaMetodo, valor_pago: valorFinal }) 
    });
    setSaving(false);
    setBaixaModal({ id: null, open: false });
    onRefresh();
    toast.success('Baixa realizada com sucesso!');
  };

  const handleEditDate = async (id: number) => {
    if (!editDate) return;
    setSaving(true);
    const token = localStorage.getItem('acorde_token');
    await fetch(`/api/pagamentos/${id}`, { 
      method: 'PATCH', 
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }, 
      body: JSON.stringify({ data_vencimento: editDate }) 
    });
    setSaving(false);
    setEditingId(null);
    onRefresh();
    toast.success('Data de vencimento atualizada!');
  };

  const pendentes = financeiro.filter(f => f.status !== 'pago').sort((a, b) => new Date((a.data_vencimento || '2099-12-31') + 'T12:00:00').getTime() - new Date((b.data_vencimento || '2099-12-31') + 'T12:00:00').getTime());
  const pagos = financeiro.filter(f => f.status === 'pago').sort((a, b) => new Date((b.data_vencimento || '2099-12-31') + 'T12:00:00').getTime() - new Date((a.data_vencimento || '2099-12-31') + 'T12:00:00').getTime());
  const sorted = [...pendentes, ...pagos];

  return (
    <div className="space-y-6">
      <FinanceiroTracker financeiro={financeiro} total={financeiro.length} />
      
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b-4 border-black bg-black flex items-center justify-between">
          <h3 className="font-black text-white uppercase text-[10px] tracking-widest">Extrato de Faturas</h3>
          <Badge color="bege">{pendentes.length} PENDENTES</Badge>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#feccba] border-b-2 border-black">
              <tr>
                <th className="px-6 py-4 text-[9px] font-black text-black uppercase text-left tracking-widest">DESCRIÇÃO</th>
                <th className="px-6 py-4 text-[9px] font-black text-black uppercase text-left tracking-widest">VENCIMENTO</th>
                <th className="px-6 py-4 text-[9px] font-black text-black uppercase text-left tracking-widest">VALOR</th>
                <th className="px-6 py-4 text-[9px] font-black text-black uppercase text-left tracking-widest">STATUS</th>
                <th className="px-6 py-4 text-[9px] font-black text-black uppercase text-right tracking-widest">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#e2bfb0]">
              {sorted.map(fat => (
                <tr key={fat.id} className="hover:bg-[#ffeae1] transition-all">
                  <td className="px-6 py-4">
                    <p className="font-black text-black text-sm uppercase">{fat.tipo_receita === 'mensalidade' ? 'Mensalidade' : (fat.descricao || fat.tipo_receita)}</p>
                    <p className="text-[9px] text-[#8e7164] font-black uppercase tracking-tighter">{fat.referencia_mes_ano}</p>
                  </td>
                  <td className="px-6 py-4">
                    {editingId === fat.id ? (
                      <div className="flex items-center gap-2">
                        <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="bg-white border-2 border-black p-1 text-[10px] font-black outline-none" />
                        <button onClick={() => handleEditDate(fat.id)} className="bg-black text-white p-1 border border-black"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setEditingId(null)} className="bg-white text-black p-1 border border-black"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-black text-[#261812] text-sm">{format(new Date(fat.data_vencimento + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                        {fat.status !== 'pago' && (
                          <button onClick={() => { setEditingId(fat.id); setEditDate(fat.data_vencimento); }} className="text-[#8e7164] hover:text-black"><Edit3 className="w-3 h-3" /></button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-black text-black text-lg italic">R$ {Number(fat.valor).toFixed(2).replace('.', ',')}</td>
                  <td className="px-6 py-4">
                    <Badge color={fat.status === 'pago' ? 'green' : 'red'}>{fat.status}</Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {fat.status !== 'pago' ? (
                      <Button onClick={() => {
                        const eligible = isEligibleForDiscount(fat.data_vencimento);
                        const suggested = (eligible && fat.valor_com_desconto) ? Number(fat.valor_com_desconto) : Number(fat.valor);
                        setBaixaModal({ id: fat.id, open: true, valor: Number(fat.valor), valor_desconto: fat.valor_com_desconto, vencimento: fat.data_vencimento });
                        setValorFinal(suggested);
                      }}>DAR BAIXA</Button>
                    ) : (
                      <Badge color="bege">QUITADO</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Baixa */}
      <AnimatePresence>
        {baixaModal.open && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm p-8 space-y-6">
              <div className="flex items-center justify-between border-b-2 border-black pb-4">
                <h2 className="text-xl font-black text-black uppercase italic">DAR BAIXA</h2>
                <button onClick={() => setBaixaModal({ id: null, open: false })}><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 border-2 border-black">
                   <p className="text-[8px] font-black uppercase text-[#8e7164]">Valor Original: R$ {baixaModal.valor.toFixed(2)}</p>
                   {baixaModal.valor_desconto && (
                       <p className={`text-[8px] font-black uppercase ${isEligibleForDiscount(baixaModal.vencimento) ? 'text-green-600' : 'text-red-600'}`}>
                           Valor c/ Desconto: R$ {Number(baixaModal.valor_desconto).toFixed(2)}
                           {isEligibleForDiscount(baixaModal.vencimento) ? ' (DISPONÍVEL)' : ' (VENCIDO)'}
                       </p>
                   )}
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] font-black text-black uppercase block tracking-widest">Valor Recebido (R$)</label>
                    <input 
                        type="number"
                        className="w-full bg-white border-4 border-black p-3 font-black text-lg text-black outline-none"
                        value={valorFinal}
                        onChange={e => setValorFinal(Number(e.target.value))}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[9px] font-black text-black uppercase block tracking-widest">Método de Pagamento</label>
                    <select 
                    value={baixaMetodo} 
                    onChange={e => setBaixaMetodo(e.target.value)} 
                    className="w-full bg-white border-4 border-black p-3 font-black text-sm text-black outline-none"
                    >
                    <option value="pix">PIX</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="transferencia">Transferência</option>
                    </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="secondary" className="flex-1" onClick={() => setBaixaModal({ ...baixaModal, open: false })}>CANCELAR</Button>
                <Button className="flex-1" onClick={handleBaixa} disabled={saving}>CONFIRMAR</Button>
              </div>
            </Card>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- MAIN PAGE ---

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
  const [cursos, setCursos] = useState<any[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Reagendamento
  const [rescheduleModal, setRescheduleModal] = useState<{ open: boolean, aulaId: string | null, type: 'emergencial' | 'permanente', data: string, horario: string }>({ open: false, aulaId: null, type: 'emergencial', data: '', horario: '' });
  const [rescheduling, setRescheduling] = useState(false);

  // Materiais
  const [materialModal, setMaterialModal] = useState(false);
  const [novoMaterial, setNovoMaterial] = useState({ titulo: '', url: '', tipo: 'link' });
  const [savingMaterial, setSavingMaterial] = useState(false);

  const fetchAgenda = async () => {
    const token = localStorage.getItem('acorde_token');
    const res = await fetch(`/api/alunos/${id}/agenda`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json());
    setAgenda(res);
    setFrequencia(res.filter((a: any) => new Date(a.data + 'T23:59:59') < new Date() || a.status !== 'pendente'));
  };

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('acorde_token');
      const headers = { 'Authorization': `Bearer ${token}` };
      setLoading(true);
      try {
        const [alunoData, aData, fData, mData, cData] = await Promise.all([
          fetch(`/api/alunos/${id}`, { headers }).then(res => res.ok ? res.json() : null),
          fetch(`/api/alunos/${id}/agenda`, { headers }).then(res => res.ok ? res.json() : []),
          fetch(`/api/alunos/${id}/financeiro`, { headers }).then(res => res.ok ? res.json() : []),
          fetch(`/api/alunos/${id}/materiais`, { headers }).then(res => res.ok ? res.json() : []),
          fetch(`/api/cursos`, { headers }).then(res => res.ok ? res.json() : [])
        ]);
        
        setAluno(alunoData);
        setAgenda(Array.isArray(aData) ? aData : []);
        setFinanceiro(Array.isArray(fData) ? fData : []);
        setMateriais(Array.isArray(mData) ? mData : []);
        setCursos(Array.isArray(cData) ? cData : []);
        setFrequencia((Array.isArray(aData) ? aData : []).filter((a: any) => new Date(a.data + 'T23:59:59') < new Date() || a.status !== 'pendente'));
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('icon', file);
    const token = localStorage.getItem('acorde_token');

    setUploadingAvatar(true);
    try {
      const res = await fetch('/api/gamificacao/upload', { 
        method: 'POST', 
        headers: { 'Authorization': `Bearer ${token}` },
        body: data 
      });
      if (res.ok) {
        const json = await res.json();
        const updateRes = await fetch(`/api/alunos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ foto_url: json.url })
        });
        if (updateRes.ok) {
          setAluno({ ...aluno, foto_url: json.url });
          toast.success('Foto atualizada!');
        }
      }
    } catch (err) { console.error(err); } 
    finally { setUploadingAvatar(false); }
  };

  const handleSaveEdit = async () => {
    const token = localStorage.getItem('acorde_token');
    try {
      // 1. Atualizar Matrícula (valores financeiros)
      const { valor_parcela, valor_com_desconto, dia_vencimento, ...alunoData } = editFormData;
      
      const { error: errM } = await supabase.from('matriculas')
        .update({ 
          valor_parcela: valor_parcela ? Number(valor_parcela) : undefined,
          valor_com_desconto: valor_com_desconto ? Number(valor_com_desconto) : undefined,
          dia_vencimento: dia_vencimento ? Number(dia_vencimento) : undefined
        })
        .eq('aluno_id', aluno.id)
        .eq('status', 'ativa');

      if (errM) throw errM;

      // 2. Atualizar Aluno
      const res = await fetch(`/api/alunos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(alunoData)
      });

      if (res.ok) {
        setAluno({ ...aluno, ...editFormData, matriculas: [{ ...aluno.matriculas?.[0], valor_parcela, valor_com_desconto, dia_vencimento }] });
        setIsEditModalOpen(false);
        toast.success('Perfil atualizado!');
      }
    } catch (err) { console.error(err); }
  };

  const handleReschedule = async () => {
    setRescheduling(true);
    const token = localStorage.getItem('acorde_token');
    try {
      if (rescheduleModal.type === 'emergencial' && rescheduleModal.aulaId) {
        await fetch(`/api/agenda/${rescheduleModal.aulaId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ data: rescheduleModal.data, horario: rescheduleModal.horario })
        });
      } else {
        const today = new Date().toISOString().split('T')[0];
        const futuras = agenda.filter(a => a.status === 'pendente' && a.data >= today);
        for (const aula of futuras) {
           await fetch(`/api/agenda/${aula.id}`, {
             method: 'PATCH',
             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
             body: JSON.stringify({ data: aula.data, horario: rescheduleModal.horario })
           });
        }
        await fetch(`/api/alunos/${id}`, {
           method: 'PATCH',
           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
           body: JSON.stringify({ horario: rescheduleModal.horario })
        });
      }
      fetchAgenda();
      setRescheduleModal({ ...rescheduleModal, open: false });
      toast.success('Aulas remarcadas!');
    } catch (err) { console.error(err); }
    setRescheduling(false);
  };

  const handleAddMaterial = async () => {
    if (!novoMaterial.titulo || !novoMaterial.url) return;
    setSavingMaterial(true);
    const token = localStorage.getItem('acorde_token');
    const res = await fetch(`/api/alunos/${id}/materiais`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(novoMaterial)
    });
    if (res.ok) {
      const data = await res.json();
      setMateriais([data, ...materiais]);
      setMaterialModal(false);
      setNovoMaterial({ titulo: '', url: '', tipo: 'link' });
      toast.success('Material adicionado!');
    }
    setSavingMaterial(false);
  };

  const handleDeleteMaterial = async (matId: number) => {
    if (!confirm('Deseja remover este material?')) return;
    const token = localStorage.getItem('acorde_token');
    await fetch(`/api/materiais/${matId}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setMateriais(materiais.filter(m => m.id !== matId));
    toast.success('Material removido!');
  };

  const updateAttendance = async (aulaId: string, status: string) => {
    const token = localStorage.getItem('acorde_token');
    await fetch(`/api/agenda/${aulaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ status })
    });
    fetchAgenda();
    toast.success('Status atualizado!');
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-[#1a0f0a] font-black uppercase tracking-widest text-[#ff6b00] animate-pulse">
      CONECTANDO AO_PERFIL...
    </div>
  );

  const isMinor = () => {
    if (!aluno?.data_nascimento) return false;
    const age = new Date().getFullYear() - new Date(aluno.data_nascimento).getFullYear();
    return age < 18;
  };

  const tabs = [
    { id: 'geral', label: 'INFO', icon: User },
    { id: 'agenda', label: 'AGENDA', icon: Calendar },
    { id: 'frequencia', label: 'HISTORY', icon: CheckCircle2 },
    { id: 'financeiro', label: 'MONEY', icon: CreditCard },
    { id: 'materiais', label: 'FILES', icon: BookOpen },
  ];

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden bg-[#1a0f0a]" style={{ fontFamily: "'Space Mono', monospace" }}>
      
      {/* HEADER SECTION */}
      <header className="bg-[#fff8f6] border-b-4 border-black p-8 shadow-[0_4px_0_rgba(0,0,0,0.1)] relative z-10 shrink-0">
        <button 
          onClick={() => navigate('/alunos')}
          className="flex items-center gap-2 text-[#8e7164] hover:text-black transition-all font-black text-[10px] uppercase tracking-widest mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> VOLTAR_LISTA
        </button>

        <div className="flex flex-col md:flex-row md:items-center gap-8">
          <label className="w-32 h-32 bg-[#feccba] border-4 border-black shadow-[4px_4px_0_#000] flex items-center justify-center text-black text-5xl font-black relative overflow-hidden group cursor-pointer shrink-0">
            {uploadingAvatar && <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center text-white text-[10px] font-bold">...</div>}
            {aluno.foto_url ? (
               <img src={aluno.foto_url} alt="Avatar" className="w-full h-full object-cover z-10" />
            ) : (
               (aluno.nome || '?').charAt(0).toUpperCase()
            )}
            <div className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center text-white text-[8px] font-black z-20 text-center px-2 uppercase">
              UPLOAD_FOTO
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </label>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-4xl font-black text-black tracking-tighter uppercase italic">{aluno.nome}</h1>
              <Badge color={aluno.status === 'ativo' ? 'green' : 'black'}>{aluno.status}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-[#8e7164] text-[10px] font-black uppercase tracking-widest">
               <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-black" /> {aluno.email || 'NO_MAIL'}</span>
               <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-black" /> {aluno.telefone || 'NO_PHONE'}</span>
               <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-black" /> {aluno.matriculas?.[0]?.cursos?.nome || 'SEM_CURSO'}</span>
               <div className="bg-black text-white px-3 py-1 border border-black flex items-center gap-2">
                  SALDO: {agenda.filter(a => a.status?.toLowerCase() === 'pendente').length} AULAS
               </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="dark" onClick={() => setContratoModal(true)}>
              <FileText className="w-4 h-4 mr-2" /> GERAR_CONTRATO
            </Button>
            <Button variant="secondary" onClick={() => {
              const m = aluno.matriculas?.[0];
              setEditFormData({ 
                ...aluno, 
                curso_id: m?.curso_id,
                valor_parcela: m?.valor_parcela || '',
                valor_com_desconto: m?.valor_com_desconto || '',
                dia_vencimento: m?.dia_vencimento || ''
              });
              setIsEditModalOpen(true);
            }}>
              <Edit className="w-4 h-4 mr-2" /> EDITAR_PERFIL
            </Button>
          </div>
        </div>
      </header>

      {/* TABS NAVIGATION */}
      <div className="bg-[#feccba] border-b-4 border-black flex overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-4 px-8 flex items-center gap-3 text-[11px] font-black transition-all relative whitespace-nowrap border-r-2 border-black/20 ${
              activeTab === tab.id ? 'bg-[#ff6b00] text-white shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)]' : 'text-[#8e7164] hover:bg-white/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <main className="flex-1 overflow-auto p-8 custom-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'geral' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <Card>
                   <h3 className="text-xs font-black text-[#8e7164] uppercase tracking-widest border-b-2 border-[#e2bfb0] pb-4 mb-6">DADOS_CADASTRAIS</h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-[#8e7164] uppercase tracking-widest">ALUNO_CPF</p>
                        <p className="font-black text-black text-sm">{aluno.cpf || 'NÃO_INF'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-[#8e7164] uppercase tracking-widest">NASCIMENTO</p>
                        <p className="font-black text-black text-sm">{aluno.data_nascimento ? format(new Date(aluno.data_nascimento + 'T12:00:00'), 'dd/MM/yyyy') : 'NÃO_INF'}</p>
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <p className="text-[9px] font-black text-[#8e7164] uppercase tracking-widest">ENDEREÇO_COMPLETO</p>
                        <p className="font-black text-black text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-[#ff6b00]" /> {aluno.endereco || 'NÃO_INF'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-[#8e7164] uppercase tracking-widest">VALOR_MENSALIDADE</p>
                        <p className="font-black text-black text-sm italic">R$ {aluno.matriculas?.[0]?.valor_parcela || '0,00'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-[#ff6b00] uppercase tracking-widest">VALOR_PONTUALIDADE (C/ DESCONTO)</p>
                        <p className="font-black text-black text-sm italic">R$ {aluno.matriculas?.[0]?.valor_com_desconto || '---'}</p>
                      </div>
                   </div>
                </Card>

                {isMinor() && (
                  <Card className="bg-[#feccba]/30">
                     <h3 className="text-xs font-black text-[#8e7164] uppercase tracking-widest border-b-2 border-[#e2bfb0] pb-4 mb-6 flex items-center gap-2">
                       <AlertCircle className="w-5 h-5 text-[#ff6b00]" /> RESPONSÁVEL_LEGAL
                     </h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-[#8e7164] uppercase tracking-widest">NOME_RESP</p>
                          <p className="font-black text-black text-sm">{aluno.responsavel_nome || '---'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-[#8e7164] uppercase tracking-widest">CPF_RESP</p>
                          <p className="font-black text-black text-sm">{aluno.responsavel_cpf || '---'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] font-black text-[#8e7164] uppercase tracking-widest">TEL_RESP</p>
                          <p className="font-black text-black text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-[#ff6b00]" /> {aluno.responsavel_telefone || '---'}</p>
                        </div>
                     </div>
                  </Card>
                )}
              </div>

              <div className="space-y-8">
                 <Card className="bg-black text-white border-white">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-[#ff6b00] mb-4">PRÓXIMA_AULA</h3>
                    {(() => {
                      const todayStr = new Date().toLocaleDateString('en-CA');
                      const futuras = agenda.filter(a => (a.data || '') >= todayStr && !a.data?.includes('2099'));
                      if (futuras.length > 0) {
                        const prox = futuras[0];
                        return (
                          <div>
                            <p className="text-3xl font-black italic tracking-tighter uppercase">
                              {format(new Date(prox.data + 'T12:00:00'), "dd/MM")}
                            </p>
                            <p className="font-black text-[#feccba] mt-1 flex items-center gap-2">
                              <Clock className="w-4 h-4" /> {prox.horario?.substring(0, 5)}
                            </p>
                          </div>
                        );
                      }
                      return <p className="font-black text-white/40 uppercase text-xs">SEM_AGENDAMENTO</p>;
                    })()}
                 </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'agenda' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="p-0 overflow-hidden">
                <div className="p-4 bg-black flex flex-wrap items-center justify-between gap-4">
                   <h3 className="font-black text-white text-[10px] uppercase tracking-widest">Cronograma de Aulas</h3>
                   <Button variant="primary" onClick={() => setRescheduleModal({ open: true, aulaId: null, type: 'permanente', data: '', horario: '' })}>
                     MUDAR_HORÁRIO_PERMANENTE
                   </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#feccba] border-b-2 border-black">
                      <tr>
                        <th className="px-6 py-4 text-[9px] font-black text-black uppercase text-left tracking-widest">DATA</th>
                        <th className="px-6 py-4 text-[9px] font-black text-black uppercase text-left tracking-widest">TIPO</th>
                        <th className="px-6 py-4 text-[9px] font-black text-black uppercase text-left tracking-widest">HORA</th>
                        <th className="px-6 py-4 text-[9px] font-black text-black uppercase text-left tracking-widest">PROFESSOR</th>
                        <th className="px-6 py-4 text-[9px] font-black text-black uppercase text-left tracking-widest">STATUS</th>
                        <th className="px-6 py-4 text-[9px] font-black text-black uppercase text-right tracking-widest">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-[#e2bfb0]">
                      {agenda.map(aula => (
                        <tr key={aula.id} className={`hover:bg-[#ffeae1] ${aula.tipo === 'reposicao' ? 'bg-orange-50/50' : ''}`}>
                          <td className="px-6 py-4 font-black text-black uppercase text-sm">
                            {aula.data?.includes('2099') ? 'A DEFINIR' : format(new Date(aula.data + 'T12:00:00'), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[8px] font-black uppercase px-2 py-1 border-2 ${aula.tipo === 'reposicao' ? 'bg-orange-500 text-white border-black' : 'bg-black text-white border-black'}`}>
                              {aula.tipo || 'regular'}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-black text-[#8e7164]">{aula.horario?.includes('00:00') && aula.data?.includes('2099') ? '--:--' : aula.horario?.substring(0, 5)}</td>
                          <td className="px-6 py-4 font-black text-black uppercase text-[10px]">{aula.professor_nome}</td>
                          <td className="px-6 py-4">
                             <Badge color={
                               (aula.status === 'realizada' || aula.status === 'presente') ? 'green' : 
                               (aula.status === 'falta_aluno' || aula.status === 'ausente') ? 'red' : 
                               aula.status === 'a_repor' ? 'orange' : 'bege'
                             }>{aula.status?.replace('_', ' ')}</Badge>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <Button variant="outline" onClick={() => setRescheduleModal({ open: true, aulaId: aula.id, type: 'emergencial', data: aula.data, horario: aula.horario })}>
                               REMARCAR
                             </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === 'frequencia' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
               <ProgressTracker aulas={frequencia} total={agenda.length} />
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                 {frequencia.slice().reverse().map(aula => (
                   <Card key={aula.id} className="group hover:border-[#ff6b00] transition-colors relative overflow-hidden">
                     <div className="flex justify-between items-start mb-4">
                       <div>
                         <p className="text-[8px] font-black text-[#8e7164] uppercase mb-1">{format(new Date(aula.data + 'T12:00:00'), 'EEEE, dd/MM', { locale: ptBR })}</p>
                         <p className="font-black text-black uppercase italic">{aula.horario?.substring(0,5)} • {aula.professor_nome?.split(' ')[0]}</p>
                       </div>
                       <Badge color={
                         (aula.status === 'realizada' || aula.status === 'presente') ? 'green' : 
                         (aula.status === 'falta_aluno' || aula.status === 'ausente') ? 'red' : 'orange'
                       }>{aula.status?.replace('_', ' ')}</Badge>
                     </div>
                     
                     <div className="flex gap-2 mt-4 pt-4 border-t-2 border-[#e2bfb0]">
                        <Button variant="dark" className="flex-1" onClick={() => updateAttendance(aula.id, 'realizada')}>PRESENÇA</Button>
                        <Button variant="outline" className="flex-1" onClick={() => updateAttendance(aula.id, 'falta_aluno')}>FALTA</Button>
                     </div>
                   </Card>
                 ))}
               </div>
            </motion.div>
          )}

          {activeTab === 'financeiro' && <FinanceiroTab financeiro={financeiro} alunoId={id!} onRefresh={() => {
              fetch(`/api/alunos/${id}/financeiro`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('acorde_token')}` } })
                .then(r => r.json()).then(setFinanceiro);
          }} />}

          {activeTab === 'materiais' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-center bg-black p-4 border-4 border-black shadow-[4px_4px_0_#000]">
                 <h2 className="text-white font-black uppercase text-[10px] tracking-widest italic">Materiais de Estudo</h2>
                 <Button onClick={() => setMaterialModal(true)}>ADD_MATERIAL</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {materiais.map(mat => (
                   <Card key={mat.id} className="flex flex-col h-full">
                     <div className="flex-1">
                        <div className="w-12 h-12 bg-[#feccba] border-2 border-black flex items-center justify-center mb-4 shadow-[2px_2px_0_#000]">
                          {mat.tipo === 'pdf' ? <FileText className="w-6 h-6" /> : <ExternalLink className="w-6 h-6" />}
                        </div>
                        <h4 className="font-black text-black uppercase text-sm mb-1 leading-tight">{mat.titulo}</h4>
                        <p className="text-[8px] font-black text-[#8e7164] uppercase mb-4 italic italic">{format(new Date(mat.created_at), 'dd/MM/yyyy')}</p>
                     </div>
                     <div className="flex gap-2">
                        <a href={mat.url} target="_blank" rel="noreferrer" className="flex-1 bg-black text-white font-black text-[9px] uppercase py-2 border-2 border-black text-center active:translate-y-0.5">ABRIR</a>
                        <button onClick={() => handleDeleteMaterial(mat.id)} className="bg-white border-2 border-black p-2 hover:bg-red-500 hover:text-white transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                   </Card>
                 ))}
                 {materiais.length === 0 && (
                   <div className="col-span-full py-20 text-center opacity-20 flex flex-col items-center">
                      <BookOpen className="w-16 h-16 mb-4" />
                      <p className="font-black uppercase italic italic">Nenhum material compartilhado</p>
                   </div>
                 )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* MODALS */}
      
      {/* Editar Perfil */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
             <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
                <div className="flex items-center justify-between border-b-4 border-black pb-4 mb-6">
                   <h2 className="text-xl font-black text-black uppercase italic italic">EDITAR_PERFIL</h2>
                   <button onClick={() => setIsEditModalOpen(false)}><X className="w-6 h-6" /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {[
                     { label: 'NOME_COMPLETO', key: 'nome' },
                     { label: 'E-MAIL', key: 'email' },
                     { label: 'TELEFONE', key: 'telefone' },
                     { label: 'CPF', key: 'cpf' },
                     { label: 'ENDEREÇO', key: 'endereco', colSpan: true },
                     { label: 'NOME_RESPONSÁVEL', key: 'responsavel_nome' },
                     { label: 'CPF_RESPONSÁVEL', key: 'responsavel_cpf' },
                     { label: 'TEL_RESPONSÁVEL', key: 'responsavel_telefone' },
                     { label: 'VALOR_MENSALIDADE', key: 'valor_parcela' },
                     { label: 'VALOR_PONTUALIDADE', key: 'valor_com_desconto' },
                     { label: 'DIA_VENCIMENTO', key: 'dia_vencimento' },
                   ].map(field => (
                     <div key={field.key} className={field.colSpan ? 'md:col-span-2' : ''}>
                        <label className="text-[9px] font-black text-black uppercase block mb-1 tracking-widest">{field.label}</label>
                        <input 
                          className="w-full bg-white border-4 border-black p-3 font-black text-sm text-black focus:bg-[#ffeae1] outline-none" 
                          value={editFormData[field.key] || ''}
                          onChange={e => setEditFormData({ ...editFormData, [field.key]: e.target.value })}
                        />
                     </div>
                   ))}
                   
                   <div className="md:col-span-2">
                      <label className="text-[9px] font-black text-black uppercase block mb-1 tracking-widest">CURSO_MATRICULADO</label>
                      <select 
                        className="w-full bg-white border-4 border-black p-3 font-black text-sm text-black focus:bg-[#ffeae1] outline-none"
                        value={editFormData.curso_id || ''}
                        onChange={e => setEditFormData({ ...editFormData, curso_id: e.target.value })}
                      >
                        <option value="">SELECIONE UM CURSO</option>
                        {cursos.map(curso => (
                          <option key={curso.id} value={curso.id}>{curso.nome.toUpperCase()}</option>
                        ))}
                      </select>
                   </div>
                </div>
                <div className="flex gap-4 mt-8">
                   <Button variant="secondary" className="flex-1" onClick={() => setIsEditModalOpen(false)}>CANCELAR</Button>
                   <Button className="flex-1" onClick={handleSaveEdit}>SALVAR_ALTERAÇÕES</Button>
                </div>
             </Card>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Reagendamento */}
      <AnimatePresence>
        {rescheduleModal.open && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <div className="flex items-center justify-between border-b-4 border-black pb-4 mb-6">
                <h2 className="text-xl font-black text-black uppercase italic italic">REMARCAR_AULA</h2>
                <button onClick={() => setRescheduleModal({ ...rescheduleModal, open: false })}><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-6">
                <div>
                   <label className="text-[9px] font-black text-black uppercase block mb-1">DATA_AULA</label>
                   <input type="date" className="w-full bg-white border-4 border-black p-3 font-black text-sm outline-none" value={rescheduleModal.data} onChange={e => setRescheduleModal({ ...rescheduleModal, data: e.target.value })} />
                </div>
                <div>
                   <label className="text-[9px] font-black text-black uppercase block mb-1">HORÁRIO_AULA</label>
                   <select className="w-full bg-white border-4 border-black p-3 font-black text-sm outline-none" value={rescheduleModal.horario} onChange={e => setRescheduleModal({ ...rescheduleModal, horario: e.target.value })}>
                     {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'].map(h => (
                       <option key={h} value={h}>{h}</option>
                     ))}
                   </select>
                </div>
                {rescheduleModal.type === 'permanente' && (
                  <div className="bg-[#feccba] border-2 border-black p-3 text-[9px] font-black text-black uppercase">
                    Atenção: Isso alterará todas as aulas futuras deste aluno.
                  </div>
                )}
              </div>
              <div className="flex gap-4 mt-8">
                <Button variant="secondary" className="flex-1" onClick={() => setRescheduleModal({ ...rescheduleModal, open: false })}>CANCELAR</Button>
                <Button className="flex-1" onClick={handleReschedule} disabled={rescheduling}>REMARCAR</Button>
              </div>
            </Card>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Adicionar Material */}
      <AnimatePresence>
        {materialModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
               <div className="flex items-center justify-between border-b-4 border-black pb-4 mb-6">
                 <h2 className="text-xl font-black text-black uppercase italic italic">ADD_MATERIAL</h2>
                 <button onClick={() => setMaterialModal(false)}><X className="w-6 h-6" /></button>
               </div>
               <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-black uppercase block mb-1">TÍTULO</label>
                    <input className="w-full bg-white border-4 border-black p-3 font-black text-sm outline-none" value={novoMaterial.titulo} onChange={e => setNovoMaterial({ ...novoMaterial, titulo: e.target.value })} placeholder="EX: PARTITURA_PIANO" />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-black uppercase block mb-1">URL / LINK</label>
                    <input className="w-full bg-white border-4 border-black p-3 font-black text-sm outline-none" value={novoMaterial.url} onChange={e => setNovoMaterial({ ...novoMaterial, url: e.target.value })} placeholder="HTTPS://..." />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-black uppercase block mb-1">TIPO</label>
                    <select className="w-full bg-white border-4 border-black p-3 font-black text-sm outline-none" value={novoMaterial.tipo} onChange={e => setNovoMaterial({ ...novoMaterial, tipo: e.target.value })}>
                      <option value="link">LINK_EXTERNO</option>
                      <option value="pdf">PDF_DOCUMENTO</option>
                      <option value="video">VÍDEO_AULA</option>
                    </select>
                  </div>
               </div>
               <div className="flex gap-4 mt-8">
                 <Button variant="secondary" className="flex-1" onClick={() => setMaterialModal(false)}>CANCELAR</Button>
                 <Button className="flex-1" onClick={handleAddMaterial} disabled={savingMaterial}>ADICIONAR</Button>
               </div>
            </Card>
          </div>
        )}
      </AnimatePresence>

      {/* Gerador de Contrato */}
      <GeradorContrato isOpen={contratoModal} onClose={() => setContratoModal(false)} aluno={aluno} />

    </div>
  );
}
