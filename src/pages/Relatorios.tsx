import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RefreshCw, TrendingUp, Users, AlertTriangle, Wallet, CalendarClock, UserX, Clock, Smartphone, Settings2, Target } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '../services/apiClient';

const brl = (v: number) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dataBR = (d?: string | null) => (d ? String(d).substring(0, 10).split('-').reverse().join('/') : '-');
const mesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const mesLabel = (mm: string) => { const [m, y] = mm.split('/'); return `${mesNomes[Number(m) - 1]}/${y.slice(2)}`; };

const mesAtual = () => {
  const [y, m] = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Cuiaba' }).split('/').reverse();
  return `${m}/${y}`;
};
const somarMes = (mm: string, delta: number) => {
  const [m, y] = mm.split('/').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const whatsapp = (tel: string | null | undefined, texto: string) => {
  const dig = String(tel || '').replace(/\D/g, '');
  if (!dig) return null;
  return `https://wa.me/${dig.startsWith('55') ? dig : `55${dig}`}?text=${encodeURIComponent(texto)}`;
};

const STATUS_LABEL: Record<string, string> = {
  realizada: 'Realizadas', falta_aluno: 'Falta do aluno', pendente: 'Agendadas', confirmada: 'Confirmadas',
  aguardando_confirmacao: 'Aguardando confirmação', reposicao: 'Reposição', a_repor: 'A repor', falta: 'Canceladas'
};

const AUTOMACOES_LABEL: Record<string, { titulo: string; desc: string }> = {
  AUTO_EMAIL_DIARIO_DONO: { titulo: 'Relatório diário para a direção', desc: 'Todo dia às 7h: presenças e faltas de ontem, vencimentos dos próximos 5 dias e atrasos (santiagoaquilles11@gmail.com).' },
  AUTO_AVISO_CONFIRMACAO: { titulo: 'Aviso de confirmação de aula', desc: 'E-mail na hora para a direção quando um aluno confirma a aula.' },
  AUTO_LEMBRETE_PRESENCA: { titulo: 'Lembrete de presença aos professores', desc: 'Todo dia, e-mail/push ao professor com aulas passadas sem presença ou falta.' },
  AUTO_RESUMO_SEMANAL: { titulo: 'Resumo semanal', desc: 'Segundas-feiras: inadimplência, planos terminando e alunos em risco.' },
  AUTO_BACKUP_SEMANAL: { titulo: 'Backup semanal no Google Drive', desc: 'Domingos: cópia do banco (sem senhas), mantém as 8 últimas.' },
  AUTO_COBRANCA_ALUNOS: { titulo: 'Cobrança automática por e-mail aos alunos', desc: '3 dias antes, 1 e 7 dias depois do vencimento. Revise a chave PIX em Financeiro antes de ligar.' }
};

function Card({ title, icon: Icon, color = '#261812', children, extra }: any) {
  return (
    <section className="rounded-lg overflow-hidden flex flex-col" style={{ background: '#fff8f6', border: '3px solid #261812', boxShadow: '4px 4px 0 #261812' }}>
      <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ background: color, borderBottom: '3px solid #261812' }}>
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className="w-4 h-4 text-white shrink-0" />}
          <h2 className="text-white text-[11px] font-black uppercase tracking-widest truncate">{title}</h2>
        </div>
        {extra}
      </div>
      <div className="p-4 flex-1">{children}</div>
    </section>
  );
}

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'bad' | 'good' }) {
  return (
    <div className="bg-white border-2 border-black rounded p-3 shadow-[2px_2px_0_#000]">
      <p className="text-[9px] font-black uppercase tracking-widest text-[#8e7164]">{label}</p>
      <p className={`font-black text-xl leading-tight mt-1 ${tone === 'bad' ? 'text-red-700' : tone === 'good' ? 'text-emerald-700' : 'text-[#261812]'}`}>{value}</p>
      {sub && <p className="text-[9px] font-bold text-[#8e7164] uppercase mt-0.5">{sub}</p>}
    </div>
  );
}

// Barras agrupadas previsto x recebido (paleta validada para daltonismo; tooltip ao passar o mouse)
function EvolucaoChart({ dados }: { dados: { mes: string; previsto: number; recebido: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...dados.map((d) => Math.max(d.previsto, d.recebido)));
  const W = 560, H = 200, padL = 8, padB = 22, grupo = (W - padL) / Math.max(1, dados.length), barW = Math.min(28, grupo / 3);
  const cores = { previsto: '#2563eb', recebido: '#c2410c' };
  const y = (v: number) => (H - padB) - (v / max) * (H - padB - 10);
  const barra = (x: number, v: number, cor: string) => {
    const top = y(v), h = (H - padB) - top;
    if (h <= 0) return null;
    const r = Math.min(4, h);
    return <path d={`M${x},${H - padB} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${H - padB} Z`} fill={cor} />;
  };
  return (
    <div className="relative">
      <div className="flex gap-4 mb-2 text-[10px] font-black uppercase text-[#261812]">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: cores.previsto }} /> Previsto</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ background: cores.recebido }} /> Recebido</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Receita prevista e recebida por mês">
        {[0.5, 1].map((f) => <line key={f} x1={padL} x2={W} y1={y(max * f)} y2={y(max * f)} stroke="#e7e1dc" strokeWidth={1} />)}
        <line x1={padL} x2={W} y1={H - padB} y2={H - padB} stroke="#8e7164" strokeWidth={1} />
        {dados.map((d, i) => {
          const x0 = padL + i * grupo + (grupo - (barW * 2 + 2)) / 2;
          return (
            <g key={d.mes} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={padL + i * grupo} y={0} width={grupo} height={H} fill={hover === i ? '#fdebe3' : 'transparent'} />
              {barra(x0, d.previsto, cores.previsto)}
              {barra(x0 + barW + 2, d.recebido, cores.recebido)}
              <text x={padL + i * grupo + grupo / 2} y={H - 6} textAnchor="middle" fontSize="10" fontWeight="700" fill="#8e7164">{mesLabel(d.mes)}</text>
            </g>
          );
        })}
      </svg>
      {hover !== null && dados[hover] && (
        <div className="absolute top-8 right-2 bg-[#261812] text-white text-[10px] font-bold px-3 py-2 rounded pointer-events-none">
          <p className="font-black uppercase">{mesLabel(dados[hover].mes)}</p>
          <p>Previsto: {brl(dados[hover].previsto)}</p>
          <p>Recebido: {brl(dados[hover].recebido)}</p>
          <p>{dados[hover].previsto > 0 ? Math.round((dados[hover].recebido / dados[hover].previsto) * 100) : 0}% recebido</p>
        </div>
      )}
    </div>
  );
}

export default function Relatorios() {
  const navigate = useNavigate();
  const [mes, setMes] = useState(mesAtual());
  const [dados, setDados] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [automacoes, setAutomacoes] = useState<Record<string, boolean> | null>(null);
  const [showAuto, setShowAuto] = useState(false);

  const carregar = async (m = mes) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/relatorios?mes=${encodeURIComponent(m)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar relatórios');
      setDados(data);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(mes); }, [mes]);
  useEffect(() => {
    apiFetch('/api/automacoes').then((r) => (r.ok ? r.json() : null)).then(setAutomacoes).catch(() => {});
  }, []);

  const toggleAutomacao = async (chave: string, valor: boolean) => {
    try {
      const res = await apiFetch('/api/automacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [chave]: valor })
      });
      if (!res.ok) throw new Error('Não foi possível salvar');
      setAutomacoes(await res.json());
      toast.success(valor ? 'Automação ligada' : 'Automação desligada');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const f = dados?.financeiro;
  const folha = dados?.folha;
  const statusAulas = useMemo(() => Object.entries(dados?.aulas?.por_status || {}).sort((a: any, b: any) => b[1] - a[1]), [dados]);

  return (
    <div className="flex-1 flex flex-col min-h-full" style={{ background: '#1a110d' }}>
      <header className="flex flex-wrap items-center gap-3 px-6 py-4" style={{ background: '#261812', borderBottom: '3px solid #ff6b00' }}>
        <h1 className="text-white font-black text-lg tracking-widest uppercase flex-1" style={{ fontFamily: "'Space Mono', monospace" }}>Relatórios</h1>
        <div className="flex items-center gap-1 bg-[#fff8f6] border-2 border-black rounded">
          <button onClick={() => setMes(somarMes(mes, -1))} className="p-2" title="Mês anterior"><ChevronLeft className="w-4 h-4" /></button>
          <span className="font-black text-xs uppercase px-2 min-w-[70px] text-center">{mesLabel(mes)}</span>
          <button onClick={() => setMes(somarMes(mes, 1))} className="p-2" title="Próximo mês"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <button onClick={() => carregar()} className="flex items-center gap-1 px-3 py-2 bg-[#ff6b00] text-white border-2 border-black font-black text-xs uppercase">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
        <button onClick={() => setShowAuto(!showAuto)} className="flex items-center gap-1 px-3 py-2 bg-white text-black border-2 border-black font-black text-xs uppercase">
          <Settings2 className="w-3.5 h-3.5" /> Automações
        </button>
      </header>

      <div className="flex-1 overflow-auto p-4 md:p-6 space-y-5">
        {showAuto && automacoes && (
          <Card title="Automações (e-mails e rotinas diárias)" icon={Settings2} color="#261812">
            <div className="space-y-2">
              {Object.entries(AUTOMACOES_LABEL).map(([k, info]) => (
                <label key={k} className="flex items-start gap-3 bg-white border-2 border-black p-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 accent-[#ff6b00]" checked={Boolean(automacoes[k])} onChange={(e) => toggleAutomacao(k, e.target.checked)} />
                  <span>
                    <span className="block font-black text-xs uppercase">{info.titulo}</span>
                    <span className="block text-[10px] font-bold text-[#8e7164]">{info.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </Card>
        )}

        {loading && !dados ? (
          <div className="text-white font-black text-xs uppercase animate-pulse">Carregando relatórios...</div>
        ) : dados && (
          <>
            {/* FINANCEIRO */}
            <Card title={`Financeiro de ${mesLabel(dados.mes)}`} icon={Wallet} color="#ff6b00">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi label="Faturamento previsto" value={brl(f.previsto)} />
                <Kpi label="Recebido" value={brl(f.recebido)} tone="good" sub={f.previsto > 0 ? `${Math.round((f.recebido / f.previsto) * 100)}% do previsto` : undefined} />
                <Kpi label="A receber" value={brl(f.pendente)} />
                <Kpi label="Ticket médio" value={brl(f.ticket_medio)} sub={`${f.alunos_pagantes} alunos pagantes`} />
                <Kpi label="Despesas do mês" value={brl(f.despesas)} sub={`${brl(f.despesas_pagas)} pagas`} />
                <Kpi label="Salários (pagos no mês seguinte)" value={brl(f.salarios_previstos_mes_seguinte)} />
                <Kpi label="Resultado previsto" value={brl(f.resultado_previsto)} tone={f.resultado_previsto < 0 ? 'bad' : 'good'} />
                <Kpi label="Inadimplência (hoje)" value={brl(f.inadimplencia_total)} tone="bad" sub={`${f.inadimplentes} aluno(s)`} />
              </div>
            </Card>

            {/* FOLHA DOS PROFESSORES */}
            <Card title={`Salário previsto dos professores - aulas de ${mesLabel(folha.mes_aulas)}`} icon={Users} color="#7c3aed"
              extra={<span className="text-white font-black text-sm">{brl(folha.total_previsto)}</span>}>
              <p className="text-[10px] font-bold text-[#8e7164] mb-3">
                Considera que todas as aulas agendadas do mês acontecem (inclui reposições já remarcadas). Recalculado a cada mudança na agenda.
                Valor da aula: R$ 35 com menos de 10 alunos no mês, R$ 30 com 10 ou mais. Pago no mês seguinte.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#261812] text-white text-[9px] uppercase">
                      <th className="text-left p-2">Professor</th>
                      <th className="text-right p-2">Alunos</th>
                      <th className="text-right p-2">R$/aula</th>
                      <th className="text-right p-2">Dadas</th>
                      <th className="text-right p-2">A dar</th>
                      <th className="text-right p-2">Reposições</th>
                      <th className="text-right p-2">Já garantido</th>
                      <th className="text-right p-2">Previsto total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {folha.professores.map((p: any) => (
                      <tr key={p.professor_id} className="border-b border-black/10 bg-white">
                        <td className="p-2 font-black uppercase">{p.professor_nome}</td>
                        <td className="p-2 text-right">{p.alunos_no_mes}</td>
                        <td className="p-2 text-right">{brl(p.valor_aula)}</td>
                        <td className="p-2 text-right">{p.aulas_realizadas}</td>
                        <td className="p-2 text-right">{p.aulas_previstas}</td>
                        <td className="p-2 text-right">{p.reposicoes_realizadas + p.reposicoes_previstas}</td>
                        <td className="p-2 text-right">{brl(p.valor_realizado)}</td>
                        <td className="p-2 text-right font-black">{brl(p.valor_previsto_total)}</td>
                      </tr>
                    ))}
                    {folha.professores.length === 0 && (
                      <tr><td colSpan={8} className="p-4 text-center text-[#8e7164] font-black uppercase text-[10px]">Nenhuma aula neste mês.</td></tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#feccba] font-black">
                      <td className="p-2 uppercase" colSpan={6}>Total</td>
                      <td className="p-2 text-right">{brl(folha.total_realizado)}</td>
                      <td className="p-2 text-right">{brl(folha.total_previsto)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* EVOLUÇÃO */}
              <Card title="Receita dos últimos 6 meses" icon={TrendingUp} color="#261812">
                <EvolucaoChart dados={dados.evolucao} />
                <table className="w-full text-[10px] mt-3">
                  <thead><tr className="text-[#8e7164] uppercase"><th className="text-left">Mês</th><th className="text-right">Previsto</th><th className="text-right">Recebido</th></tr></thead>
                  <tbody>
                    {dados.evolucao.map((e: any) => (
                      <tr key={e.mes} className="border-t border-black/10"><td>{mesLabel(e.mes)}</td><td className="text-right">{brl(e.previsto)}</td><td className="text-right">{brl(e.recebido)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* AULAS */}
              <Card title={`Aulas de ${mesLabel(dados.mes)}`} icon={CalendarClock} color="#0f766e">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Kpi label="Taxa de presença" value={dados.aulas.taxa_presenca === null ? '-' : `${dados.aulas.taxa_presenca}%`} sub={`${dados.aulas.realizadas} presenças / ${dados.aulas.faltas_aluno} faltas`} />
                  <Kpi label="Sem presença registrada" value={String(dados.aulas.sem_registro_no_mes)} tone={dados.aulas.sem_registro_no_mes > 0 ? 'bad' : 'good'} sub="aulas já passadas" />
                  <Kpi label="Reposições sem data" value={String(dados.aulas.reposicoes_sem_data)} sub="aguardando agendamento" />
                  <Kpi label="Alunos ativos" value={String(dados.alunos.ativos)} sub={`${dados.alunos.novos_no_mes} novos no mês • ${dados.alunos.com_app} com app`} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {statusAulas.map(([st, n]: any) => (
                    <span key={st} className="bg-white border-2 border-black px-2 py-1 text-[10px] font-black uppercase">{STATUS_LABEL[st] || st}: {n}</span>
                  ))}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* FUNIL DE LEADS */}
              <Card title={`Funil de leads - ${mesLabel(dados.mes)}`} icon={Target} color="#ca8a04">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <Kpi label="Leads" value={String(dados.leads.total)} />
                  <Kpi label="Experimentais" value={String(dados.leads.experimentais_no_mes)} sub={`${dados.leads.experimentais_realizadas} realizadas`} />
                  <Kpi label="Matriculados" value={String(dados.leads.matriculados)} sub={dados.leads.taxa_conversao === null ? '' : `${dados.leads.taxa_conversao}% de conversão`} />
                </div>
                <p className="text-[9px] font-black uppercase text-[#8e7164] mb-1">Origem dos leads</p>
                <div className="space-y-1">
                  {Object.entries(dados.leads.por_origem).sort((a: any, b: any) => b[1] - a[1]).map(([o, n]: any) => (
                    <div key={o} className="flex items-center gap-2 text-[10px] font-bold">
                      <span className="w-28 truncate uppercase">{o}</span>
                      <div className="flex-1 h-3 bg-stone-200 rounded"><div className="h-3 rounded" style={{ width: `${(n / Math.max(1, dados.leads.total)) * 100}%`, background: '#ca8a04' }} /></div>
                      <span className="w-6 text-right">{n}</span>
                    </div>
                  ))}
                  {Object.keys(dados.leads.por_origem).length === 0 && <p className="text-[10px] font-bold text-[#8e7164]">Nenhum lead no mês.</p>}
                </div>
              </Card>

              {/* RENOVAÇÕES */}
              <Card title={`Planos terminando em 30 dias (${dados.renovacoes.length})`} icon={Clock} color="#2563eb">
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {dados.renovacoes.map((r: any) => {
                    const link = whatsapp(r.telefone, `Olá ${String(r.nome).split(' ')[0]}! Seu plano no Studio Acorde termina em ${dataBR(r.ultima_mensalidade)}. Vamos renovar para continuar as aulas? 🎵`);
                    return (
                      <div key={r.aluno_id} className="flex items-center justify-between gap-2 bg-white border-2 border-black p-2">
                        <button onClick={() => navigate(`/alunos/${r.aluno_id}`)} className="text-left min-w-0">
                          <p className="font-black text-xs uppercase truncate">{r.nome}</p>
                          <p className="text-[9px] font-bold text-[#8e7164] uppercase">Última parcela {dataBR(r.ultima_mensalidade)} • {r.dias_restantes} dias</p>
                        </button>
                        {link && <a href={link} target="_blank" rel="noreferrer" className="shrink-0 bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-1 border-2 border-black">WhatsApp</a>}
                      </div>
                    );
                  })}
                  {dados.renovacoes.length === 0 && <p className="text-[10px] font-bold text-[#8e7164]">Nenhum plano terminando nos próximos 30 dias.</p>}
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* RISCO DE EVASÃO */}
              <Card title={`Alunos em risco de cancelar (${dados.risco_evasao.length})`} icon={UserX} color="#dc2626">
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {dados.risco_evasao.map((r: any) => {
                    const link = whatsapp(r.telefone, `Olá ${String(r.nome).split(' ')[0]}! Tudo bem? Sentimos sua falta no Studio Acorde. Podemos ajudar em algo com as aulas? 🎸`);
                    return (
                      <div key={r.aluno_id} className="flex items-start justify-between gap-2 bg-white border-2 border-black p-2">
                        <button onClick={() => navigate(`/alunos/${r.aluno_id}`)} className="text-left min-w-0">
                          <p className="font-black text-xs uppercase truncate">{r.nome}</p>
                          <p className="text-[9px] font-bold text-red-700">{r.motivos.join(' • ')}</p>
                        </button>
                        {link && <a href={link} target="_blank" rel="noreferrer" className="shrink-0 bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-1 border-2 border-black">WhatsApp</a>}
                      </div>
                    );
                  })}
                  {dados.risco_evasao.length === 0 && <p className="text-[10px] font-bold text-[#8e7164]">Nenhum aluno em risco. 🎉</p>}
                </div>
              </Card>

              {/* HORÁRIOS VAGOS */}
              <Card title="Horários livres nos próximos 7 dias" icon={CalendarClock} color="#0f766e">
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {dados.horarios_vagos.map((p: any) => (
                    <div key={p.professor_id}>
                      <p className="font-black text-xs uppercase">{p.professor_nome} <span className="text-[#8e7164]">({p.total_livres} livres)</span></p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.livres.slice(0, 30).map((l: any) => (
                          <span key={`${l.data}-${l.horario}`} className="bg-white border border-black px-1.5 py-0.5 text-[9px] font-bold">{dataBR(l.data).slice(0, 5)} {l.horario}</span>
                        ))}
                        {p.livres.length === 0 && <span className="text-[9px] font-bold text-[#8e7164]">Agenda cheia ou sem disponibilidade cadastrada.</span>}
                      </div>
                    </div>
                  ))}
                  {dados.horarios_vagos.length === 0 && <p className="text-[10px] font-bold text-[#8e7164]">Cadastre a disponibilidade dos professores para ver os horários livres.</p>}
                </div>
              </Card>
            </div>

            {/* ALUNOS SEM APP */}
            <Card title={`Alunos sem o app ativado (${dados.sem_app.length} de ${dados.alunos.ativos})`} icon={Smartphone} color="#261812">
              <p className="text-[10px] font-bold text-[#8e7164] mb-2">Sem o app, o aluno não recebe avisos de aula nem de cobrança. Envie o convite pelo WhatsApp.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                {dados.sem_app.map((a: any) => {
                  const link = whatsapp(a.telefone, `Olá ${String(a.nome).split(' ')[0]}! Ative o app do Studio Acorde: acesse https://acordecrm.vercel.app, entre com seu e-mail, adicione à tela inicial e ative as notificações. Você ganha 500 XP! 🎵`);
                  return (
                    <div key={a.aluno_id} className="flex items-center justify-between gap-2 bg-white border-2 border-black p-2">
                      <span className="font-black text-[10px] uppercase truncate">{a.nome}</span>
                      {link ? <a href={link} target="_blank" rel="noreferrer" className="shrink-0 bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-1 border-2 border-black">Convidar</a>
                        : <span className="text-[9px] font-bold text-[#8e7164]">sem telefone</span>}
                    </div>
                  );
                })}
              </div>
            </Card>

            {f.inadimplentes > 0 && (
              <button onClick={() => navigate('/')} className="w-full flex items-center justify-center gap-2 bg-red-600 text-white border-4 border-black py-3 font-black text-xs uppercase shadow-[4px_4px_0_#000]">
                <AlertTriangle className="w-4 h-4" /> Ver os {f.inadimplentes} alunos em atraso no Início
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
