// @ts-nocheck
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
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
  Download,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import GeradorContrato from '../components/GeradorContrato';
import { toast } from 'sonner';
import { ChordVisualizer } from '../components/musiclass/ChordVisualizers';

// --- STITCH COMPONENTS ---

const Card = ({ children, className = "", ...props }: { children: React.ReactNode, className?: string } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`bg-[#fff8f6] border-4 border-black shadow-[4px_4px_0_#000] p-6 ${className}`} {...props}>
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

  const sortedAulas = [...aulas].sort((a, b) => (a.data || '2099-12-31').localeCompare(b.data || '2099-12-31'));

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
}function FinanceiroTracker({ financeiro, total }: { financeiro: any[], total: number }) {
  const totalSquares = total || 12;
  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'pago') return 'bg-emerald-500';
    if (s === 'atrasado') return 'bg-red-500';
    if (s === 'pendente') return 'bg-[#feccba]';
    return 'bg-[#e2bfb0]';
  };

  // Se o número de faturas reais no banco for menor do que o total contratado,
  // significa que a diferença foi paga no sistema antigo (legado Emusys)
  const legacyPaidCount = Math.max(0, totalSquares - financeiro.length);
  
  const displayFaturas: any[] = [];
  
  // 1. Adiciona as parcelas legadas como PAGAS
  for (let i = 0; i < legacyPaidCount; i++) {
    displayFaturas.push({
      id: `legacy-${i}`,
      status: 'pago',
      tipo_receita: 'mensalidade',
      referencia_mes_ano: 'Histórico Emusys',
      data_vencimento: null
    });
  }
  
  // 2. Ordena as faturas reais do banco e adiciona na lista
  const sortedReal = [...financeiro].sort((a, b) => new Date((a.data_vencimento || '2099-12-31') + 'T12:00:00').getTime() - new Date((b.data_vencimento || '2099-12-31') + 'T12:00:00').getTime());
  displayFaturas.push(...sortedReal);

  // Garante que o array tenha exatamente totalSquares elementos para renderizar todos os quadradinhos
  while (displayFaturas.length < totalSquares) {
    displayFaturas.push({
      id: `dummy-${displayFaturas.length}`,
      status: 'pendente',
      tipo_receita: 'mensalidade',
      referencia_mes_ano: 'Não Gerada',
      data_vencimento: null
    });
  }

  const pagasCount = displayFaturas.filter(f => f.status === 'pago').length;

  return (
    <Card className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-[10px] font-black text-[#8e7164] uppercase tracking-[0.2em] mb-1">STATUS_FINANCEIRO</h3>
          <p className="text-xl font-black text-black uppercase italic">
            {pagasCount}/{totalSquares} PARCELAS PAGAS
          </p>
        </div>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2">
        {displayFaturas.slice(0, totalSquares).map((fatura, idx) => {
          const status = fatura?.status;
          return (
            <div key={idx} className="group relative">
              <div className={`aspect-square border-2 border-black shadow-[1px_1px_0_#000] flex items-center justify-center transition-transform hover:scale-110 cursor-help ${getStatusColor(status)}`}>
                {status === 'pago' && <Check className="w-3 h-3 text-white" />}
                {status === 'atrasado' && <XCircle className="w-3 h-3 text-white" />}
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-[8px] font-black uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 z-50 pointer-events-none">
                {fatura.referencia_mes_ano || (fatura.data_vencimento ? format(new Date(fatura.data_vencimento + 'T12:00:00'), 'MM/yyyy') : '')} - {status}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// --- CALENDAR COMPONENTS ---
function MonthlyCalendar({ monthStr, aulas, onUpdateAttendance }: { monthStr: string, aulas: any[], onUpdateAttendance: (id: string, status: string) => Promise<void> | void, key?: string | number }) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  
  const [yearStr, mStr] = monthStr.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(mStr) - 1;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay(); 
  
  const monthName = format(firstDay, 'MMMM yyyy', { locale: ptBR });
  
  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const reposicoesPendentes = aulas.filter(a => a.status === 'a_repor' || a.status === 'reposicao' || a.tipo === 'reposicao');

  const getDayClasses = (d: number) => {
    const dateStr = `${yearStr}-${mStr}-${d.toString().padStart(2, '0')}`;
    return aulas.filter(a => a.data === dateStr);
  };

  return (
    <Card className="p-4 flex flex-col gap-4">
      <h3 className="font-black text-black uppercase text-sm border-b-2 border-black pb-2">{monthName}</h3>
      <div className="grid grid-cols-7 gap-1 text-[8px] font-black text-center text-[#8e7164]">
        <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (!d) return <div key={i} className="aspect-square" />;
          
          const dayAulas = getDayClasses(d);
          const hasAula = dayAulas.length > 0;
          
          let bgClass = "bg-[#fff8f6] border border-[#e2bfb0] text-black";
          if (hasAula) {
            const a = dayAulas[0];
            if (a.status === 'realizada' || a.status === 'presente') bgClass = "bg-emerald-500 text-white border-black";
            else if (a.status === 'falta_aluno' || a.status === 'ausente') bgClass = "bg-red-500 text-white border-black";
            else if (a.status === 'a_repor' || a.tipo === 'reposicao') bgClass = "bg-amber-500 text-white border-black";
            else bgClass = "bg-[#ff6b00] text-white border-black";
          }
          
          return (
            <div key={i} className="relative group">
              <div 
                className={`aspect-square flex items-center justify-center font-black text-[10px] cursor-pointer hover:scale-110 transition-transform ${bgClass}`}
                onClick={() => hasAula && setSelectedDay(selectedDay === d ? null : d)}
              >
                {d}
              </div>
              {hasAula && selectedDay !== d && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-32 p-2 bg-black text-white text-[8px] text-left opacity-0 group-hover:opacity-100 z-10 pointer-events-none transition-opacity shadow-[2px_2px_0_#ff6b00]">
                  {dayAulas.map((da: any, idx: number) => (
                    <div key={idx} className="mb-1 border-b border-white/20 pb-1 last:border-0 last:mb-0 last:pb-0">
                      <p className="text-[#ff6b00]">{da.horario?.substring(0,5)} • {da.professor_nome?.split(' ')[0]}</p>
                      <p>{da.tipo === 'reposicao' ? 'Reposição' : 'Regular'} - {da.status?.replace('_', ' ')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {selectedDay && getDayClasses(selectedDay).length > 0 && (
        <div className="mt-2 p-2 bg-[#ffeae1] border-2 border-black flex flex-col gap-2 animate-in fade-in zoom-in duration-200">
          <p className="text-[10px] font-black uppercase text-black border-b-2 border-[#e2bfb0] pb-1 flex justify-between items-center">
            DIA {selectedDay.toString().padStart(2, '0')}
            <button onClick={() => setSelectedDay(null)}><X className="w-3 h-3" /></button>
          </p>
          {getDayClasses(selectedDay).map((da: any, idx: number) => (
             <div key={idx} className="flex flex-col gap-2 border-b border-[#e2bfb0] pb-2 last:border-0 last:pb-0">
               <div className="flex justify-between items-center text-[9px] font-black">
                 <span className="text-[#ff6b00]">{da.horario?.substring(0,5)} • {da.professor_nome?.split(' ')[0]}</span>
                 <span>{da.tipo === 'reposicao' ? 'REPOSIÇÃO' : 'REGULAR'}</span>
               </div>
               <div className="flex gap-2">
                 <Button variant="dark" className="flex-1 py-1 px-1 text-[7px]" onClick={(e: any) => { e.stopPropagation(); onUpdateAttendance(da.id, 'realizada'); setSelectedDay(null); }}>PRESENÇA</Button>
                 <Button variant="outline" className="flex-1 py-1 px-1 text-[7px]" onClick={(e: any) => { e.stopPropagation(); onUpdateAttendance(da.id, 'falta_aluno'); setSelectedDay(null); }}>FALTA</Button>
                 {(da.status === 'falta_aluno' || da.status === 'ausente' || da.status === 'falta') && (
                   <Button variant="primary" className="flex-1 py-1 px-1 text-[7px]" onClick={(e: any) => { e.stopPropagation(); onUpdateAttendance(da.id, 'reposicao'); setSelectedDay(null); }}>LIBERAR REPOSIÇÃO</Button>
                 )}
               </div>
             </div>
          ))}
        </div>
      )}
      
      {reposicoesPendentes.length > 0 && (
        <div className="mt-2 pt-2 border-t-2 border-dashed border-[#e2bfb0]">
          <p className="text-[9px] font-black text-black uppercase mb-1 flex items-center gap-1">
             <Clock className="w-3 h-3 text-amber-500" /> REPOSIÇÕES DO MÊS
          </p>
          <div className="flex flex-col gap-1 text-[8px] font-black uppercase text-[#8e7164]">
            {reposicoesPendentes.map((r, i) => (
              <div key={i} className="flex justify-between items-center bg-[#fff8f6] p-1.5 border border-[#e2bfb0]">
                <span>{r.data ? format(new Date(r.data + 'T12:00:00Z'), 'dd/MM') : 'S/ DATA'} • {r.horario?.substring(0,5)}</span>
                <span className="text-amber-600">{r.status?.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// --- TABS ---

function FinanceiroTab({ financeiro, alunoId, aluno, onRefresh, total_parcelas, onOpenRemanejar }: { financeiro: any[], alunoId: string, aluno: any, onRefresh: () => void, total_parcelas?: number, onOpenRemanejar: () => void }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDate, setEditDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [baixaModal, setBaixaModal] = useState<{ id: number | null, open: boolean, valor: number, valor_desconto?: number, vencimento: string }>({ id: null, open: false, valor: 0, vencimento: '' });
  const [baixaMetodo, setBaixaMetodo] = useState('pix');
  const [valorFinal, setValorFinal] = useState(0);

  // Mural da Vergonha
  const [muralModalOpen, setMuralModalOpen] = useState(false);
  const [muralInput, setMuralInput] = useState({ valor_divida: '', tipo_divida: '' });

  const handleEnviarMural = async () => {
    if (!muralInput.valor_divida || !muralInput.tipo_divida) return toast.error('Preencha o valor e o tipo!');
    try {
      await fetch('/api/mural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          aluno_id: alunoId, 
          nome_cliente: aluno?.nome, 
          valor_divida: Number(muralInput.valor_divida), 
          tipo_divida: muralInput.tipo_divida 
        })
      });
      setMuralModalOpen(false);
      setMuralInput({ valor_divida: '', tipo_divida: '' });
      toast.success('Aluno enviado para o Mural da Vergonha!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao enviar.');
    }
  };

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
    setBaixaModal({ id: null, open: false, valor: 0, vencimento: '' });
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
      <FinanceiroTracker financeiro={financeiro} total={total_parcelas || financeiro.length} />
      
      <Card className="overflow-hidden p-0">
        <div className="p-4 border-b-4 border-black bg-black flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h3 className="font-black text-white uppercase text-[10px] tracking-widest">Extrato de Faturas</h3>
            <Badge color="bege">{pendentes.length} PENDENTES</Badge>
          </div>
          <button 
            onClick={() => onOpenRemanejar()}
            className="bg-[#ff6b00] text-white px-4 py-2 text-[10px] font-black uppercase border-2 border-white shadow-[2px_2px_0_#fff] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
          >
            Remanejar Pagamentos Pendentes
          </button>
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
                  <td className="px-6 py-4 font-black text-black text-lg italic">R$ {Number(fat.status === 'pago' ? (fat.valor_pago != null ? fat.valor_pago : fat.valor) : fat.valor).toFixed(2).replace('.', ',')}</td>
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
                <button onClick={() => setBaixaModal({ id: null, open: false, valor: 0, vencimento: '' })}><X className="w-6 h-6" /></button>
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

      {/* MURAL DA VERGONHA MODAL NO PERFIL */}
      <AnimatePresence>
        {muralModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#1A1A1A] border-4 border-[#8B0000] w-full max-w-md p-6 relative shadow-[16px_16px_0_#8B0000]">
              <button onClick={() => setMuralModalOpen(false)} className="absolute top-4 right-4 text-white hover:scale-110 transition-transform"><X className="w-6 h-6" /></button>
              
              <div className="flex items-center gap-3 mb-6">
                <ShieldAlert className="w-6 h-6 text-white" />
                <h3 className="text-xl font-black uppercase text-white tracking-tighter">Mural da Vergonha</h3>
              </div>

              <div className="space-y-4">
                <div>
                   <label className="text-[10px] font-bold text-white/50 block mb-1 uppercase">Aluno</label>
                   <input type="text" disabled value={aluno.nome} className="w-full bg-white/10 border border-white/20 p-3 text-xs text-white uppercase outline-none" />
                </div>
                <div>
                   <label className="text-[10px] font-bold text-white/50 block mb-1 uppercase">Valor da Dívida (R$)</label>
                   <input type="number" value={muralInput.valor_divida} onChange={e => setMuralInput({...muralInput, valor_divida: e.target.value})} placeholder="Ex: 250.00" className="w-full bg-black border border-white/20 p-3 text-xs text-white uppercase outline-none focus:border-[#FF8A00]" />
                </div>
                <div>
                   <label className="text-[10px] font-bold text-white/50 block mb-1 uppercase">Tipo da Dívida</label>
                   <input type="text" value={muralInput.tipo_divida} onChange={e => setMuralInput({...muralInput, tipo_divida: e.target.value})} placeholder="Ex: Mensalidade, Taxa de Matrícula..." className="w-full bg-black border border-white/20 p-3 text-xs text-white uppercase outline-none focus:border-[#FF8A00]" />
                </div>
              </div>

              <div className="mt-8">
                 <button onClick={handleEnviarMural} className="w-full bg-[#8B0000] text-white font-black uppercase py-4 text-sm hover:bg-white hover:text-[#8B0000] transition-colors border-2 border-[#8B0000]">
                   Enviar para o Mural
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
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
  const [professores, setProfessores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('geral');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [contratoModal, setContratoModal] = useState(false);
  const [verContratoAssinadoModal, setVerContratoAssinadoModal] = useState(false);
  const [contratoAssinadoAtivo, setContratoAssinadoAtivo] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [cursos, setCursos] = useState<any[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAgendaList, setShowAgendaList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [remanejarModal, setRemanejarModal] = useState(false);
  const [novaDataInicio, setNovaDataInicio] = useState('');
  
  const handleRemanejarPagamentos = async () => {
    if (!novaDataInicio) return;
    setSaving(true);
    try {
        const token = localStorage.getItem('acorde_token');
        await fetch(`/api/alunos/${id}/remanejar-pagamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ nova_data_inicio: novaDataInicio })
        });
        setRemanejarModal(false);
        fetchData();
        toast.success('Pagamentos remanejados com sucesso!');
    } catch (e) {
        toast.error('Erro ao remanejar');
    } finally {
        setSaving(false);
    }
  };
  const [remanejarAulasModal, setRemanejarAulasModal] = useState(false);
  const [novaDataAulas, setNovaDataAulas] = useState('');
  
  const handleRemanejarAulas = async () => {
    if (!novaDataAulas) return;
    setSaving(true);
    try {
        const token = localStorage.getItem('acorde_token');
        await fetch(`/api/alunos/${id}/remanejar-aulas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ nova_data_inicio: novaDataAulas })
        });
        setRemanejarAulasModal(false);
        fetchData();
        toast.success('Aulas remanejadas com sucesso!');
    } catch (e) {
        toast.error('Erro ao remanejar');
    } finally {
        setSaving(false);
    }
  };

  // Reagendamento
  const [rescheduleModal, setRescheduleModal] = useState<{ open: boolean, aulaId: string | null, type: 'emergencial' | 'permanente', data: string, horario: string }>({ open: false, aulaId: null, type: 'emergencial', data: '', horario: '' });
  const [rescheduling, setRescheduling] = useState(false);

  // Materiais
  const [materialModal, setMaterialModal] = useState(false);
  const [novoMaterial, setNovoMaterial] = useState({ titulo: '', url: '', tipo: 'link' });
  const [savingMaterial, setSavingMaterial] = useState(false);

  // Impressão de Fichas
  const [printAula, setPrintAula] = useState<any>(null);



  const fetchAgenda = async () => {
    const token = localStorage.getItem('acorde_token');
    const res = await fetch(`/api/alunos/${id}/agenda?start=2020-01-01&end=2030-01-01`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json());
    setAgenda(res);
    setFrequencia(res.filter((a: any) => (a.data || '2099-12-31') < new Date().toISOString().substring(0, 10) || a.status !== 'pendente'));
  };

  const fetchData = async () => {
    const token = localStorage.getItem('acorde_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    setLoading(true);
    try {
      const [alunoData, aData, fData, mData, cData, pData] = await Promise.all([
        fetch(`/api/alunos/${id}`, { headers }).then(res => res.ok ? res.json() : null),
        fetch(`/api/alunos/${id}/agenda?start=2020-01-01&end=2030-01-01`, { headers }).then(res => res.ok ? res.json() : []),
        fetch(`/api/alunos/${id}/financeiro`, { headers }).then(res => res.ok ? res.json() : []),
        fetch(`/api/alunos/${id}/materiais`, { headers }).then(res => res.ok ? res.json() : []),
        fetch(`/api/cursos`, { headers }).then(res => res.ok ? res.json() : []),
        fetch(`/api/professores`, { headers }).then(res => res.ok ? res.json() : [])
      ]);
      
      setAluno(alunoData);
      setAgenda(Array.isArray(aData) ? aData : []);
      setFinanceiro(Array.isArray(fData) ? fData : []);
      setMateriais(Array.isArray(mData) ? mData : []);
      setCursos(Array.isArray(cData) ? cData : []);
      setProfessores(Array.isArray(pData) ? pData : []);
      setFrequencia((Array.isArray(aData) ? aData : []).filter((a: any) => (a.data || '2099-12-31') < new Date().toISOString().substring(0, 10) || a.status !== 'pendente'));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
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
      const res = await fetch(`/api/alunos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(editFormData)
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        toast.success('Perfil atualizado! Recarregando dados...');
        // Recarregar todos os dados (aluno + agenda) imediatamente após salvar
        await fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(`Erro ao salvar: ${errData.error || 'Tente novamente.'}`);
      }
    } catch (err) { console.error(err); }
  };

  const handleReschedule = async () => {
    setRescheduling(true);
    const token = localStorage.getItem('acorde_token');
    try {
      if (rescheduleModal.aulaId) {
        const res = await fetch(`/api/agenda/${rescheduleModal.aulaId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ data: rescheduleModal.data, horario: rescheduleModal.horario })
        });
        if (res.ok) {
          toast.success('Aula remarcada com sucesso!');
        } else {
          toast.error('Erro ao remarcar aula.');
        }
      }
      fetchAgenda();
      setRescheduleModal({ ...rescheduleModal, open: false });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remarcar aula.');
    }
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
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#1a0a05] text-[#ff6b00] font-['Space_Mono'] select-none">
      <style>{`
        @keyframes splashLoading {
          0% { width: 0%; }
          50% { width: 65%; }
          100% { width: 100%; }
        }
      `}</style>
      <div className="flex flex-col items-center gap-6 max-w-[280px] w-full text-center">
        <img 
          src="/assets/Logo Laranja.png" 
          alt="Studio Acorde" 
          className="w-48 object-contain animate-pulse" 
        />
        <div className="w-full h-5 bg-[#261812] border-4 border-black p-0.5 overflow-hidden shadow-[2px_2px_0_#000]">
          <div 
            className="h-full bg-[#ff6b00]"
            style={{ animation: 'splashLoading 2s infinite ease-in-out' }}
          />
        </div>
        <span className="text-[9px] font-black tracking-widest uppercase text-[#8e7164] animate-pulse">
          Carregando...
        </span>
      </div>
    </div>
  );

  if (!aluno) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#1a0a05] text-[#ff6b00] font-['Space_Mono'] p-6 text-center">
        <AlertCircle className="w-12 h-12 mb-4 text-[#ff6b00]" />
        <h2 className="text-xl font-black uppercase text-white mb-2">Aluno não encontrado</h2>
        <p className="text-xs text-[#8e7164] mb-6">O perfil solicitado não foi carregado ou não existe.</p>
        <button 
          onClick={() => navigate('/alunos')}
          className="bg-[#ff6b00] text-white font-black uppercase px-6 py-3 border-2 border-black shadow-[3px_3px_0_#000] text-xs"
        >
          Voltar para Lista de Alunos
        </button>
      </div>
    );
  }

  const isMinor = () => {
    if (!aluno?.data_nascimento) return false;
    const age = new Date().getFullYear() - new Date(aluno.data_nascimento).getFullYear();
    return age < 18;
  };

  const tabs = [
    { id: 'geral', label: 'INFO', icon: User },
    { id: 'agenda', label: 'AGENDA', icon: Calendar },
    { id: 'financeiro', label: 'MONEY', icon: CreditCard },
    { id: 'materiais', label: 'FILES', icon: BookOpen },
  ];

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden bg-[#1a0f0a]" style={{ fontFamily: "'Space Mono', monospace" }}>
      
      {/* HEADER SECTION */}
      <header className="bg-[#fff8f6] border-b-4 border-black p-4 sm:p-6 shadow-[0_4px_0_rgba(0,0,0,0.1)] relative z-10 shrink-0">
        <button 
          onClick={() => navigate('/alunos')}
          className="flex items-center gap-2 text-[#8e7164] hover:text-black transition-all font-black text-[10px] uppercase tracking-widest mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> VOLTAR_LISTA
        </button>

        <div className="flex flex-col lg:flex-row lg:items-center gap-4 sm:gap-6">
          <label className="w-20 h-20 sm:w-24 sm:h-24 bg-[#feccba] border-4 border-black shadow-[4px_4px_0_#000] flex items-center justify-center text-black text-3xl sm:text-4xl font-black relative overflow-hidden group cursor-pointer shrink-0">
            {uploadingAvatar && <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center text-white text-[10px] font-bold">...</div>}
            {aluno.foto_url ? (
               <img src={aluno.foto_url} alt="Avatar" className="w-full h-full object-cover z-10" />
            ) : (
               (aluno.nome || '?').charAt(0).toUpperCase()
            )}
            <div className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center text-white text-[8px] font-black z-20 text-center px-2 uppercase">
              UPLOAD
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </label>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-black tracking-tighter uppercase italic truncate">{aluno.nome}</h1>
              <Badge color={aluno.status === 'ativo' ? 'green' : 'black'}>{aluno.status}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[#8e7164] text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
               <span className="flex items-center gap-1.5 whitespace-nowrap"><Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-black" /> <span className="truncate max-w-[150px] sm:max-w-none">{aluno.email || 'NO_MAIL'}</span></span>
               <span className="flex items-center gap-1.5 whitespace-nowrap"><Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-black" /> {aluno.telefone || 'NO_PHONE'}</span>
               <span className="flex items-center gap-1.5 whitespace-nowrap"><BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-black" /> {aluno.matriculas?.[0]?.cursos?.nome || 'SEM_CURSO'}</span>
               <div className="bg-black text-white px-2 py-1 border border-black flex items-center gap-2 whitespace-nowrap">
                  SALDO: {agenda.filter(a => a.status?.toLowerCase() === 'pendente').length} AULAS
               </div>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col gap-2 shrink-0 overflow-x-auto pb-1 no-scrollbar">
            <Button variant="dark" onClick={() => setContratoModal(true)} className="whitespace-nowrap flex-1">
              <FileText className="w-4 h-4 mr-2" /> CONTRATO
            </Button>
            <Button variant="secondary" onClick={() => {
              const m = aluno.matriculas?.[0];
              setEditFormData({ 
                ...aluno, 
                curso_id: m?.curso_id,
                professor_id: m?.professor_id,
                valor_parcela: m?.valor_parcela || '',
                valor_com_desconto: m?.valor_com_desconto || '',
                dia_vencimento: m?.dia_vencimento || '',
                total_parcelas: m?.total_parcelas || 6,
                dia_semana: m?.dia_semana !== undefined && m?.dia_semana !== null ? m.dia_semana : '',
                horario: m?.horario || ''
              });
              setIsEditModalOpen(true);
            }} className="whitespace-nowrap flex-1">
              <Edit className="w-4 h-4 mr-2" /> EDITAR
            </Button>
            <button onClick={() => setMuralModalOpen(true)} className="bg-[#8B0000] text-white px-4 py-2 font-black uppercase text-[10px] tracking-widest border-2 border-[#8B0000] shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 flex-1 whitespace-nowrap">
              <ShieldAlert className="w-4 h-4" /> ENVIAR P/ MURAL
            </button>
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
                      const todayStr = format(new Date(), 'yyyy-MM-dd');
                      const futuras = agenda.filter(a => (a.data || '') >= todayStr && !a.data?.includes('2099'));
                      if (futuras.length > 0) {
                        const prox = futuras[0];
                        return (
                          <div>
                            <p className="text-3xl font-black italic tracking-tighter uppercase">
                              {format(new Date(prox.data + 'T12:00:00Z'), "dd/MM")}
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

                  {/* CARD DE STATUS CONTRATUAL */}
                  {(() => {
                    const contratoAssinado = aluno?.contratos?.find((c: any) => c.status === 'assinado');
                    return contratoAssinado ? (
                      <div className="bg-[#4ade80]/10 border-4 border-[#4ade80] p-4 text-left shadow-[4px_4px_0_#000] space-y-2">
                        <div className="flex justify-between items-center border-b border-[#4ade80]/20 pb-2">
                          <span className="text-[10px] font-black text-[#4ade80] uppercase tracking-widest">📝 CONTRATO_ASSINADO</span>
                          <span className="text-[8px] font-bold text-black uppercase">EM {new Date(contratoAssinado.data_assinatura).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <p className="text-[10px] font-bold text-black uppercase leading-tight">O aluno assinou eletronicamente o contrato de prestação de serviços.</p>
                        <button 
                          onClick={() => {
                            setContratoAssinadoAtivo(contratoAssinado);
                            setVerContratoAssinadoModal(true);
                          }} 
                          className="w-full text-[9px] py-2 px-3 mt-2 bg-black text-white hover:bg-stone-800 uppercase font-black border-2 border-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none"
                        >
                          👁️ VISUALIZAR CONTRATO
                        </button>
                      </div>
                    ) : (
                      <div className="bg-[#ffeb3b]/10 border-4 border-[#ffeb3b] p-4 text-left shadow-[4px_4px_0_#000] space-y-2">
                        <span className="text-[10px] font-black text-[#b49e00] uppercase tracking-widest block border-b border-[#ffeb3b]/30 pb-2">⚠️ CONTRATO_PENDENTE</span>
                        <p className="text-[10px] font-bold text-black uppercase leading-tight">O aluno ainda não assinou o contrato eletrônico pelo portal.</p>
                      </div>
                    );
                  })()}
              </div>
            </motion.div>
          )}

          {activeTab === 'agenda' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-center border-b-4 border-black pb-4 mb-4">
                <h2 className="text-xl font-black text-black uppercase italic">Aulas do Aluno</h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setRemanejarAulasModal(true)}
                    className="bg-[#ff6b00] text-white px-4 py-2 text-[10px] font-black uppercase border-2 border-white shadow-[2px_2px_0_#fff] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                  >
                    Remanejar Aulas
                  </button>
                  <Button onClick={() => setShowAgendaList(!showAgendaList)} variant="dark">
                    {showAgendaList ? 'VER CALENDÁRIOS' : 'VER LISTA TRADICIONAL'}
                  </Button>
                </div>
              </div>

              {!showAgendaList ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                   <ProgressTracker aulas={frequencia} total={agenda.length} />
                   
                   {(() => {
                     const aulasPorMes = agenda.reduce((acc: any, aula) => {
                       if (!aula.data || aula.data.includes('2099')) return acc;
                       const monthStr = aula.data.substring(0, 7); // yyyy-MM
                       if (!acc[monthStr]) acc[monthStr] = [];
                       acc[monthStr].push(aula);
                       return acc;
                     }, {});
                     const sortedMonths = Object.keys(aulasPorMes).sort();
                     
                     if (sortedMonths.length === 0) {
                       return (
                         <div className="text-center py-10 opacity-50">
                           <p className="font-black text-black uppercase italic">Nenhuma aula registrada</p>
                         </div>
                       );
                     }
                     
                     return (
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                         {sortedMonths.map(monthStr => (
                           <MonthlyCalendar 
                             key={monthStr} 
                             monthStr={monthStr} 
                             aulas={aulasPorMes[monthStr]} 
                             onUpdateAttendance={updateAttendance} 
                           />
                         ))}
                       </div>
                     );
                   })()}
                </div>
              ) : (
                <div className="animate-in fade-in duration-300">
                  <Card className="p-0 overflow-hidden">
                    <div className="p-4 bg-black flex flex-wrap items-center justify-between gap-4">
                       <h3 className="font-black text-white text-[10px] uppercase tracking-widest">Cronograma de Aulas</h3>
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
                                {(!aula.data || aula.data.includes('2099')) ? 'A DEFINIR' : format(new Date(aula.data + 'T12:00:00Z'), 'dd/MM/yyyy')}
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
                                   (aula.status === 'falta_aluno' || aula.status === 'ausente' || aula.status === 'falta') ? 'red' : 
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
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'financeiro' && <FinanceiroTab financeiro={financeiro} alunoId={id!} aluno={aluno} total_parcelas={aluno?.matriculas?.[0]?.total_parcelas} onOpenRemanejar={() => setRemanejarModal(true)} onRefresh={() => {
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
              <div className="flex justify-between items-center bg-black p-4 border-4 border-black shadow-[4px_4px_0_#000] mt-8">
                 <h2 className="text-white font-black uppercase text-[10px] tracking-widest italic">Fichas de Treino (Aulas)</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {frequencia.filter((a: any) => a.status === 'realizada').length > 0 ? frequencia.filter((a: any) => a.status === 'realizada').map((aula: any) => (
                   <Card key={aula.id} className="flex flex-col h-full bg-orange-50/50">
                     <div className="flex-1">
                        <div className="w-12 h-12 bg-[#ff6b00] text-white border-2 border-black flex items-center justify-center mb-4 shadow-[2px_2px_0_#000]">
                          <FileText className="w-6 h-6" />
                        </div>
                        <h4 className="font-black text-black uppercase text-sm mb-1 leading-tight">Ficha de {aula.curso_nome || 'Música'}</h4>
                        <p className="text-[8px] font-black text-[#8e7164] uppercase mb-4 italic italic">{format(new Date((aula.data || '2099-12-31') + 'T12:00:00'), 'dd/MM/yyyy')} • Prof. {aula.professor_nome}</p>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => setPrintAula(aula)} className="flex-1 bg-emerald-500 text-white font-black text-[9px] uppercase py-2 border-2 border-black text-center active:translate-y-0.5 flex justify-center items-center gap-2 hover:bg-emerald-600 transition-colors">
                          <FileText className="w-3.5 h-3.5" /> IMPRIMIR FICHA
                        </button>
                     </div>
                   </Card>
                 )) : (
                   <div className="col-span-full py-20 text-center opacity-20 flex flex-col items-center">
                      <BookOpen className="w-16 h-16 mb-4" />
                      <p className="font-black uppercase italic italic">Nenhuma ficha de aula encontrada</p>
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
                     { label: 'QTD_PARCELAS_CONTRATO', key: 'total_parcelas' },
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
                      <label className="text-[9px] font-black text-black uppercase block mb-1 tracking-widest">PROFESSOR</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {professores.map(prof => (
                          <button
                            key={prof.id}
                            type="button"
                            onClick={() => setEditFormData({ ...editFormData, professor_id: prof.id.toString() })}
                            className={`p-3 border-4 font-black uppercase text-[10px] text-center transition-all ${
                              editFormData.professor_id?.toString() === prof.id.toString()
                                ? 'border-[#ff6b00] bg-[#ff6b00] text-white shadow-[2px_2px_0_#000] scale-105 z-10' 
                                : 'border-black bg-white text-black hover:bg-[#ffeae1] shadow-[2px_2px_0_#000]'
                            }`}
                          >
                            {prof.nome.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                   </div>
                   
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

                    <div>
                       <label className="text-[9px] font-black text-black uppercase block mb-1 tracking-widest">DIA_AULA_FIXO</label>
                       <select 
                         className="w-full bg-white border-4 border-black p-3 font-black text-sm text-black focus:bg-[#ffeae1] outline-none"
                         value={editFormData.dia_semana !== undefined && editFormData.dia_semana !== null ? editFormData.dia_semana : ''}
                         onChange={e => setEditFormData({ ...editFormData, dia_semana: e.target.value !== '' ? parseInt(e.target.value, 10) : '' })}
                       >
                         <option value="">SELECIONE UM DIA</option>
                         <option value="0">DOMINGO</option>
                         <option value="1">SEGUNDA-FEIRA</option>
                         <option value="2">TERÇA-FEIRA</option>
                         <option value="3">QUARTA-FEIRA</option>
                         <option value="4">QUINTA-FEIRA</option>
                         <option value="5">SEXTA-FEIRA</option>
                         <option value="6">SÁBADO</option>
                       </select>
                    </div>

                    <div>
                       <label className="text-[9px] font-black text-black uppercase block mb-1 tracking-widest">HORÁRIO_FIXO</label>
                       <input 
                         type="time"
                         className="w-full bg-white border-4 border-black p-3 font-black text-sm text-black focus:bg-[#ffeae1] outline-none" 
                         value={editFormData.horario || ''}
                         onChange={e => setEditFormData({ ...editFormData, horario: e.target.value })}
                       />
                    </div>
                </div>

                <div className="mt-8 p-4 border-4 border-black bg-[#ff6b00]">
                   <h3 className="text-white font-black uppercase text-lg italic mb-2 tracking-widest">REMANEJAMENTO DE DATAS</h3>
                   <p className="text-white text-[10px] font-bold uppercase mb-4">Use os botões abaixo se precisar alterar o dia de início das cobranças ou aulas pendentes.</p>
                   <div className="flex flex-col sm:flex-row gap-4">
                     <button 
                       onClick={(e) => { e.preventDefault(); setIsEditModalOpen(false); setActiveTab('financeiro'); setRemanejarModal(true); }}
                       className="flex-1 bg-black text-white p-3 font-black uppercase text-xs border-2 border-white shadow-[4px_4px_0_#fff] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                     >
                       REMANEJAR PAGAMENTOS PENDENTES
                     </button>
                     <button 
                       onClick={(e) => { e.preventDefault(); setIsEditModalOpen(false); setActiveTab('agenda'); setRemanejarAulasModal(true); }}
                       className="flex-1 bg-white text-black p-3 font-black uppercase text-xs border-2 border-black shadow-[4px_4px_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                     >
                       REMANEJAR AULAS PENDENTES
                     </button>
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

      {/* Modal Remanejar Pagamentos */}
      <AnimatePresence>
        {remanejarModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm p-8 space-y-6">
              <div className="flex items-center justify-between border-b-2 border-black pb-4">
                <h2 className="text-xl font-black text-black uppercase italic">REMANEJAR PAGAMENTOS</h2>
                <button onClick={() => setRemanejarModal(false)}><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-[#8e7164] uppercase">Esta ação excluirá as faturas pendentes e recriará todas a partir da nova data.</p>
                <div>
                  <label className="text-[9px] font-black text-black uppercase block mb-1">Nova Data de Início</label>
                  <input type="date" value={novaDataInicio} onChange={e => setNovaDataInicio(e.target.value)} className="w-full bg-white border-4 border-black p-3 font-black text-sm outline-none" />
                </div>
              </div>
              <Button onClick={handleRemanejarPagamentos} disabled={saving} className="w-full">
                {saving ? 'REMANEJANDO...' : 'CONFIRMAR E REGERAR'}
              </Button>
            </Card>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Remanejar Aulas */}
      <AnimatePresence>
        {remanejarAulasModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <Card className="w-full max-w-sm p-8 space-y-6">
              <div className="flex items-center justify-between border-b-2 border-black pb-4">
                <h2 className="text-xl font-black text-black uppercase italic">REMANEJAR AULAS</h2>
                <button onClick={() => setRemanejarAulasModal(false)}><X className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-[#8e7164] uppercase">Esta ação excluirá as aulas pendentes atuais e recriará todas a partir da nova data escolhida, respeitando os intervalos de 7 dias e mudando o dia da semana atual se necessário.</p>
                <div>
                  <label className="text-[9px] font-black text-black uppercase block mb-1">Nova Data de Início</label>
                  <input type="date" value={novaDataAulas} onChange={e => setNovaDataAulas(e.target.value)} className="w-full bg-white border-4 border-black p-3 font-black text-sm outline-none" />
                </div>
              </div>
              <Button onClick={handleRemanejarAulas} disabled={saving} className="w-full">
                {saving ? 'REMANEJANDO...' : 'CONFIRMAR E REGERAR'}
              </Button>
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

      {/* Visualizador de Contrato Assinado */}
      <AnimatePresence>
        {verContratoAssinadoModal && contratoAssinadoAtivo && (
          <div className="fixed inset-0 z-[150] bg-black/80 flex items-center justify-center p-4">
            <Card className="w-full max-w-3xl h-[85vh] flex flex-col p-6 bg-[#fff8f6] border-8 border-black shadow-[12px_12px_0_#000] relative rounded-none">
              <div className="flex items-center justify-between border-b-4 border-black pb-4 shrink-0">
                <div>
                  <h2 className="text-xl font-black text-black uppercase italic">Contrato Assinado</h2>
                  <p className="text-[#8e7164] font-black text-[9px] uppercase tracking-widest">Visualização do documento com assinatura manuscrita</p>
                </div>
                <button 
                  onClick={() => {
                    setVerContratoAssinadoModal(false);
                    setContratoAssinadoAtivo(null);
                  }}
                  className="bg-black text-white p-2 border-2 border-black hover:bg-red-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Corpo do Contrato com Scroll */}
              <div className="flex-1 overflow-y-auto border-4 border-black bg-white p-6 my-4 font-serif text-sm text-stone-850 leading-relaxed custom-scrollbar uppercase">
                <div 
                  className="space-y-4 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: contratoAssinadoAtivo.conteudo_html || contratoAssinadoAtivo.texto_contrato }}
                />
                
                {/* Rodapé do contrato com a assinatura manuscrita */}
                <div className="mt-12 pt-6 border-t-4 border-black flex flex-col md:flex-row justify-between items-center gap-6 bg-stone-50 p-4 border-dashed">
                  <div className="space-y-1 text-center md:text-left">
                    <p className="font-sans font-black text-[10px] text-[#8e7164] uppercase tracking-wider">ASSINATURA DO ALUNO / RESPONSÁVEL</p>
                    <p className="font-sans font-black text-sm text-black">{aluno?.nome}</p>
                    <p className="font-sans font-medium text-[9px] text-stone-500">
                      ASSINADO EM: {new Date(contratoAssinadoAtivo.data_assinatura).toLocaleDateString('pt-BR')} ÀS {new Date(contratoAssinadoAtivo.data_assinatura).toLocaleTimeString('pt-BR')}
                    </p>
                    <p className="font-sans font-medium text-[8px] text-stone-400 font-mono tracking-tighter">HASH: {contratoAssinadoAtivo.id?.substring(0, 18).toUpperCase()}</p>
                  </div>
                  <div className="bg-white border-4 border-black p-2 shadow-[4px_4px_0_#000] shrink-0">
                    <img 
                      src={contratoAssinadoAtivo.assinatura_base64} 
                      alt="Assinatura Digital Manuscrita" 
                      className="max-h-24 object-contain max-w-[200px] bg-white filter contrast-125" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 shrink-0">
                <Button 
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Contrato - ${aluno?.nome}</title>
                            <style>
                              body { font-family: Georgia, serif; padding: 40px; color: #111; line-height: 1.6; }
                              h1, h2, h3 { font-family: Arial, sans-serif; text-transform: uppercase; text-align: center; }
                              .contract-text { font-size: 13px; text-transform: uppercase; white-space: pre-wrap; }
                              .footer { margin-top: 50px; border-top: 2px solid #000; padding-top: 20px; display: flex; justify-between: space-between; align-items: center; }
                              .footer-left { font-family: Arial, sans-serif; font-size: 11px; }
                              .signature-box { border: 1px solid #000; padding: 10px; background: #fff; }
                              .signature-img { max-height: 90px; }
                            </style>
                          </head>
                          <body>
                            <h2>CONTRATO DE MATRÍCULA E PRESTAÇÃO DE SERVIÇOS</h2>
                            <div class="contract-text">${contratoAssinadoAtivo.conteudo_html || contratoAssinadoAtivo.texto_contrato}</div>
                            <div class="footer" style="display: flex; justify-content: space-between; margin-top: 60px; border-top: 2px solid #000; padding-top: 20px;">
                              <div class="footer-left">
                                <p><strong>CONTRATANTE:</strong> ${aluno?.nome}</p>
                                <p>DATA DA ASSINATURA: ${new Date(contratoAssinadoAtivo.data_assinatura).toLocaleDateString('pt-BR')}</p>
                                <p style="font-size: 8px; color: #777;">ID: ${contratoAssinadoAtivo.id}</p>
                              </div>
                              <div class="signature-box">
                                <img src="${contratoAssinadoAtivo.assinatura_base64}" class="signature-img" />
                              </div>
                            </div>
                            <script>
                              window.onload = function() {
                                window.print();
                              }
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }
                  }}
                  className="bg-black text-[#feccba] uppercase font-black px-6 py-2 shadow-[4px_4px_0_#000] border-2 border-black hover:bg-stone-800 transition-colors"
                >
                  🖨️ IMPRIMIR / SALVAR PDF
                </Button>
              </div>
            </Card>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Impressão de Ficha */}
      {printAula && (
        <PrintModal 
          aula={printAula} 
          alunoNome={aluno?.nome || ''} 
          onClose={() => setPrintAula(null)} 
        />
      )}

    </div>
  );
}
// Modal de visualização de diário pedagógico / Impressão PDF
function PrintModal({ aula, alunoNome, onClose }: { aula: any, alunoNome: string, onClose: () => void }) {
  const pdfRef = useRef<HTMLDivElement>(null);
  let richData: any = null;
  try {
    if (aula.conteudo && (aula.conteudo.startsWith('{') || aula.conteudo.startsWith('['))) {
      richData = JSON.parse(aula.conteudo);
    }
  } catch {}

  const handleDownloadPdf = async () => {
    if (!pdfRef.current) return;
    try {
      const toastId = toast.loading('Gerando PDF do Diário...');
      const opt = {
        margin: [0.1, 0, 0.1, 0] as [number, number, number, number], // reduzido margens
        filename: `Diario_Aula_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#fff8f6' },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(pdfRef.current).save();
      toast.success('PDF baixado com sucesso!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar o PDF.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 overflow-y-auto font-['Space_Mono']">
      
      <div className="bg-[#fff8f6] border-8 border-black p-6 w-full max-w-2xl relative shadow-[12px_12px_0_#000] max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6" data-html2canvas-ignore>
          <h3 className="text-black font-black text-sm uppercase italic tracking-widest">
            📄 VISUALIZAR DIÁRIO PEDAGÓGICO
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPdf}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 border-2 border-black font-black text-xs uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center gap-1.5"
            >
              <span>⬇️</span> BAIXAR PDF
            </button>
            <button 
              onClick={onClose} 
              className="bg-black text-[#feccba] border-2 border-black font-black text-xs px-3 py-1.5 shadow-[4px_4px_0_#000] hover:bg-red-500 hover:text-white transition-all active:translate-y-1 active:shadow-none"
            >
              X
            </button>
          </div>
        </div>

        {/* ÁREA DE IMPRESSÃO */}
        <div ref={pdfRef} id="print-section" className="bg-white border-4 border-black p-8 text-black space-y-6">
          {/* Header Pedagógico */}
          <div className="border-b-4 border-black pb-4 flex justify-between items-start">
            <div>
              <h1 className="font-black text-2xl uppercase tracking-tighter">STUDIO MASTER</h1>
              <p className="text-[9px] font-bold uppercase tracking-wider text-black/60">DIÁRIO DE EVOLUÇÃO PEDAGÓGICA</p>
            </div>
            <div className="text-right">
              <p className="font-black text-sm uppercase italic">AULA DE {aula.curso_nome || 'MÚSICA'}</p>
              <p className="text-[10px] font-black">{format(new Date((aula.data || '2099-12-31') + 'T12:00:00'), 'dd/MM/yyyy')}</p>
            </div>
          </div>

          {/* Dados do Aluno */}
          <div className="grid grid-cols-2 gap-4 border-b-2 border-black/10 pb-4 text-[10px] uppercase font-black tracking-wider">
            <div>
              <span className="text-black/50 block text-[8px]">ALUNO(A)</span>
              {alunoNome}
            </div>
            <div className="text-right">
              <span className="text-black/50 block text-[8px]">PROFESSOR(A)</span>
              {aula.professor_nome}
            </div>
          </div>

          {/* Conteúdo Rico ou Texto Simples */}
          {richData && richData.isRich ? (
            <div className="space-y-6">
              {/* Resumo */}
              <div>
                <h4 className="text-[10px] font-black uppercase text-black/50 tracking-widest mb-2 flex items-center gap-2">
                  <span className="w-4 h-4 bg-[#ff6b00] rounded-full inline-block border border-black"></span>
                  Conteúdo Trabalhado
                </h4>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{richData.conteudoText || 'Nenhum resumo adicionado.'}</div>
              </div>
              
              {/* Repertório/Harmonia */}
              {(richData.chords?.length > 0 || richData.scales?.length > 0) && (
                <div className="p-4 bg-[#fff8f6] border-2 border-black shadow-[2px_2px_0_#000] space-y-4">
                   <h4 className="font-black text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                     <span className="text-lg">🎸</span> Estudo de Harmonia / Acordes
                   </h4>
                   
                   {richData.chords?.length > 0 && (
                     <div className="grid grid-cols-2 gap-4 items-start">
                       {richData.chords.map((c: any, i: number) => (
                         <div key={i} className="border-2 border-black p-1 bg-white w-full break-inside-avoid">
                           <ChordVisualizer
                             instrument={c.instrument || aula.curso_nome || 'Violão'}
                             chordNotes={c.notes || []}
                             root={c.root}
                             type={c.typeId || c.type}
                             ext={c.extId || c.extension}
                             bass={c.bass}
                             notesWithIndices={c.notesWithIndices}
                             isCustom={c.isCustom}
                           />
                         </div>
                       ))}
                     </div>
                   )}

                   {richData.scales?.length > 0 && (
                     <div className="flex flex-wrap gap-2 pt-2 border-t border-black/10">
                       {richData.scales.map((s: any, i: number) => (
                         <span key={i} className="px-2 py-1 bg-black text-white border border-black text-xs font-bold">{s.root} {s.type}</span>
                       ))}
                     </div>
                   )}
                </div>
              )}

              {/* Melodia */}
              {richData.melody?.length > 0 && (
                <div className="p-4 bg-yellow-50 border-2 border-black shadow-[2px_2px_0_#000] space-y-3">
                   <h4 className="font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                     <span className="text-lg">🎵</span> Melodias Estudadas
                   </h4>
                   <div className="flex flex-col gap-2">
                     {richData.melody.map((m: any, i: number) => (
                       <div key={i} className="bg-white border-2 border-black p-2 shadow-[2px_2px_0_#000]">
                         <p className="text-black font-black text-[10px] uppercase mb-1">{m.title || m.titulo || 'Melodia'}</p>
                         <div className="text-[9px] font-bold text-black/70 flex flex-wrap gap-1">
                           {(m.phrases || []).map((phrase: any[], pIdx: number) => (
                             <span key={pIdx} className="bg-black/5 px-1 py-0.5 border border-black/20">{phrase.join(' - ')}</span>
                           ))}
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              )}

              {/* Tablatura */}
              {richData.tablatures?.length > 0 && (
                <div className="p-4 bg-white border-2 border-black shadow-[2px_2px_0_#000] space-y-3">
                   <h4 className="font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                     <span className="text-lg">📝</span> Tablaturas
                   </h4>
                   <div className="flex flex-col gap-4">
                     {richData.tablatures.map((tab: any, idx: number) => (
                       <div key={idx} className="border-2 border-black p-3 bg-[#fff8f6]">
                         <p className="text-[10px] font-black uppercase text-[#ff6b00] mb-2">{tab.name}</p>
                         <div className="overflow-x-auto">
                           <div className="grid gap-px" style={{ gridTemplateColumns: 'auto repeat(16, 1fr)', minWidth: '340px' }}>
                             {['e','B','G','D','A','E'].map((str, strIdx) => (
                               <React.Fragment key={strIdx}>
                                 <div className="flex items-center justify-center bg-[#261812] text-[#ff6b00] font-black text-[7px] border border-black px-1 min-w-[16px]">{str}</div>
                                 {Array.from({ length: 16 }).map((_, beat) => (
                                   <div key={beat} className="h-6 flex items-center justify-center bg-white border border-black/20 text-[10px] font-black">
                                     {tab.matrix?.[strIdx]?.[beat] || '-'}
                                   </div>
                                 ))}
                               </React.Fragment>
                             ))}
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              )}

              {/* Bateria/Ritmo */}
              {richData.drums?.length > 0 && (
                <div className="p-4 bg-stone-100 border-2 border-black shadow-[2px_2px_0_#000]">
                   <h4 className="font-black text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                     <span className="text-lg">🥁</span> Grooves e Rudimentos
                   </h4>
                   <ul className="list-disc pl-4 text-xs space-y-1">
                      {richData.drums.map((d: any, i: number) => (
                        <li key={i}><strong>{d.pattern}</strong> a {d.bpm} BPM</li>
                      ))}
                   </ul>
                </div>
              )}

              {/* Estúdio / Mídia */}
              {richData.recordings?.length > 0 && (
                <div className="p-4 bg-[#ffeae1] border-2 border-black shadow-[2px_2px_0_#000]">
                   <h4 className="font-black text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
                     <span className="text-lg">🎙️</span> Registros de Estúdio
                   </h4>
                   <ul className="list-disc pl-4 text-xs space-y-1">
                      {richData.recordings.map((r: any, i: number) => (
                        <li key={i}>{r.name}</li>
                      ))}
                   </ul>
                </div>
              )}

              {/* Tarefa de Casa */}
              <div>
                <h4 className="text-[10px] font-black uppercase text-black/50 tracking-widest mb-2 flex items-center gap-2">
                  <span className="w-4 h-4 bg-[#4ade80] rounded-full inline-block border border-black"></span>
                  Missão para Casa
                </h4>
                <div className="text-sm leading-relaxed p-4 bg-black text-white whitespace-pre-wrap shadow-[4px_4px_0_#4ade80]">
                  {richData.tarefaCasaText || 'Nenhuma tarefa de casa atribuída.'}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-black uppercase text-black/50 tracking-widest mb-2">Conteúdo Trabalhado</h4>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{aula.conteudo || 'Nenhum conteúdo registrado.'}</div>
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase text-black/50 tracking-widest mb-2">Tarefa de Casa</h4>
                <div className="text-sm leading-relaxed whitespace-pre-wrap p-4 bg-black text-white shadow-[4px_4px_0_#4ade80]">
                  {aula.tarefa_casa || 'Sem tarefas para casa.'}
                </div>
              </div>
            </div>
          )}

          {/* Footer Assinatura */}
          <div className="pt-12 pb-4 flex justify-between items-end border-t-2 border-black/10 mt-8">
            <div className="w-48 border-t-2 border-black text-center pt-2">
              <span className="text-[8px] font-black uppercase block">Assinatura Professor</span>
              <span className="text-xs uppercase italic">{aula.professor_nome}</span>
            </div>
            <div className="w-48 border-t-2 border-black text-center pt-2">
              <span className="text-[8px] font-black uppercase block">Visto Responsável/Aluno</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
