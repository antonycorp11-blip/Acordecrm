import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Check, ChevronDown, ChevronRight, ClipboardCheck, Clock, RefreshCcw, User, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const fmtData = (d: string) => d.split('-').reverse().join('/');
const diaSemana = (d: string) => DIAS[new Date(d + 'T12:00:00').getDay()];
const authHeaders = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('acorde_token')}` });

// ============================================================
// REVISÃO DE AULAS: aulas já passadas que ficaram sem presença marcada
// ============================================================
function RevisaoAulas({ onCount }: { onCount: (n: number) => void }) {
  const [aulas, setAulas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [professor, setProfessor] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [abertos, setAbertos] = useState<Set<number>>(new Set());
  const [processando, setProcessando] = useState<Set<number>>(new Set());
  const [divergentes, setDivergentes] = useState<any[]>([]);
  const [salvandoAluno, setSalvandoAluno] = useState<number | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/aulas/revisao', { headers: authHeaders() }),
        fetch('/api/agenda/auditoria', { headers: authHeaders() })
      ]);
      if (r1.ok) {
        const data = await r1.json();
        setAulas(Array.isArray(data) ? data : []);
        onCount(Array.isArray(data) ? data.length : 0);
      } else {
        toast.error('Não foi possível carregar as aulas para revisão.');
      }
      if (r2.ok) {
        const d2 = await r2.json();
        setDivergentes(Array.isArray(d2) ? d2 : []);
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro de conexão ao carregar a revisão.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const professores = useMemo(() => Array.from(new Set(aulas.map(a => a.professor_nome).filter(Boolean))).sort() as string[], [aulas]);

  const filtradas = useMemo(() => aulas.filter(a =>
    (!busca || String(a.aluno_nome || '').toLowerCase().includes(busca.toLowerCase())) &&
    (!professor || a.professor_nome === professor) &&
    (!statusFiltro || a.status === statusFiltro)
  ), [aulas, busca, professor, statusFiltro]);

  const grupos = useMemo(() => {
    const m = new Map<number, { aluno_id: number; nome: string; aulas: any[] }>();
    filtradas.forEach(a => {
      const g = m.get(a.aluno_id) || { aluno_id: a.aluno_id, nome: a.aluno_nome || 'Aluno', aulas: [] };
      g.aulas.push(a);
      m.set(a.aluno_id, g);
    });
    return Array.from(m.values());
  }, [filtradas]);

  const remover = (id: number) => {
    setAulas(prev => {
      const novo = prev.filter(a => a.id !== id);
      onCount(novo.length);
      return novo;
    });
  };

  const marcarProcessando = (id: number, on: boolean) =>
    setProcessando(prev => { const n = new Set(prev); on ? n.add(id) : n.delete(id); return n; });

  const decidir = async (aula: any, acao: 'realizada' | 'falta' | 'reposicao') => {
    marcarProcessando(aula.id, true);
    try {
      let res: Response;
      if (acao === 'reposicao') {
        res = await fetch(`/api/aulas/${aula.id}/enviar-reposicao`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({}) });
      } else {
        res = await fetch(`/api/aulas/${aula.id}/status`, {
          method: 'PATCH', headers: authHeaders(),
          body: JSON.stringify({ status: acao === 'realizada' ? 'realizada' : 'falta_aluno' })
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao registrar');
      }
      remover(aula.id);
      const quando = `${fmtData(aula.data)} (${aula.aluno_nome})`;
      if (acao === 'realizada') {
        toast.success(`Aula de ${quando} registrada como realizada.`);
      } else {
        toast.success(acao === 'reposicao' ? `Aula de ${quando} enviada para a fila de reposição.` : `Aula de ${quando} registrada como falta.`, {
          duration: 8000,
          action: {
            label: 'Desfazer',
            onClick: async () => {
              const r = await fetch(`/api/aulas/${aula.id}/restaurar-revisao`, {
                method: 'POST', headers: authHeaders(),
                body: JSON.stringify({ status: aula.status, data: aula.data, horario: aula.horario, data_original: aula.data_original, motivo_cancelamento: aula.motivo_cancelamento })
              });
              if (r.ok) { toast.success('Decisão desfeita.'); carregar(); } else toast.error('Não foi possível desfazer.');
            }
          }
        });
      }
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao registrar');
    } finally {
      marcarProcessando(aula.id, false);
    }
  };

  const sincronizar = async (alunoId: number, modo: 'aulas_para_matricula' | 'matricula_para_aulas') => {
    setSalvandoAluno(alunoId);
    try {
      const res = await fetch(`/api/alunos/${alunoId}/sincronizar-agenda`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ modo }) });
      const resp = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resp.error || 'Erro ao sincronizar');
      toast.success(modo === 'aulas_para_matricula' ? 'Matrícula atualizada.' : `${resp.atualizadas || 0} aula(s) movida(s).`);
      setDivergentes(prev => prev.filter(d => d.aluno_id !== alunoId));
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao sincronizar');
    } finally {
      setSalvandoAluno(null);
    }
  };

  const alternar = (id: number) => setAbertos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (loading) return <p className="text-center font-bold">CARREGANDO AULAS PARA REVISÃO...</p>;

  return (
    <div className="space-y-6 text-black">
      <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_#000]">
        <p className="text-xs font-bold uppercase text-[#8e7164]">
          Aulas que já passaram e ficaram sem presença marcada (somente alunos ativos). Para cada uma, decida: <b>REPOSIÇÃO</b> (vai para a fila de reposições),
          <b> FALTA</b> (aula não elegível para reposição) ou <b>REALIZADA</b> (a aula aconteceu, só faltou marcar).
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar aluno..." className="bg-white border-2 border-black px-3 py-2 text-sm min-w-[200px]" />
          <select value={professor} onChange={e => setProfessor(e.target.value)} className="bg-white border-2 border-black px-3 py-2 text-sm">
            <option value="">Todos os professores</option>
            {professores.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)} className="bg-white border-2 border-black px-3 py-2 text-sm">
            <option value="">Todas as situações</option>
            <option value="pendente">Sem presença marcada</option>
            <option value="confirmada">Confirmada pelo aluno (sem marcação)</option>
            <option value="aguardando_confirmacao">Aguardando confirmação</option>
          </select>
          <button onClick={() => setAbertos(new Set(grupos.map(g => g.aluno_id)))} className="px-3 py-2 border-2 border-black bg-black text-white text-[11px] font-black uppercase">Expandir tudo</button>
          <button onClick={() => setAbertos(new Set())} className="px-3 py-2 border-2 border-black bg-white text-[11px] font-black uppercase">Recolher tudo</button>
          <span className="ml-auto text-sm font-black uppercase">{filtradas.length} aula(s) · {grupos.length} aluno(s)</span>
        </div>
      </div>

      {divergentes.length > 0 && (
        <div className="bg-amber-100 border-4 border-black p-4 shadow-[4px_4px_0_#000] space-y-3">
          <p className="text-sm font-black uppercase">⚠ Horário da matrícula diferente das próximas aulas ({divergentes.length})</p>
          <div className="space-y-2">
            {divergentes.map(d => (
              <div key={d.aluno_id} className="bg-white border-2 border-black p-3 flex flex-wrap items-center gap-3">
                <div className="min-w-[200px]">
                  <p className="font-black uppercase text-sm">{d.nome}</p>
                  <p className="text-[11px] font-bold text-[#8e7164] uppercase">
                    Matrícula: {DIAS[d.matricula.dia_semana] ?? '?'} {d.matricula.horario} · Próxima aula: {d.proximas_aulas[0] ? `${diaSemana(d.proximas_aulas[0].data)} ${d.proximas_aulas[0].horario}` : '-'} ({d.divergentes}/{d.total_futuras} aulas fora do padrão)
                  </p>
                </div>
                <div className="ml-auto flex gap-2">
                  <button disabled={salvandoAluno === d.aluno_id} onClick={() => sincronizar(d.aluno_id, 'aulas_para_matricula')} className="px-3 py-2 border-2 border-black bg-[#22c55e] text-white text-[10px] font-black uppercase disabled:opacity-50">Aulas certas: atualizar matrícula</button>
                  <button disabled={salvandoAluno === d.aluno_id} onClick={() => { if (window.confirm(`Mover as aulas futuras de ${d.nome} para o horário da matrícula?`)) sincronizar(d.aluno_id, 'matricula_para_aulas'); }} className="px-3 py-2 border-2 border-black bg-[#ff6b00] text-white text-[10px] font-black uppercase disabled:opacity-50">Matrícula certa: mover aulas</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {grupos.length === 0 ? (
        <div className="text-center p-12 border-4 border-dashed border-[#8e7164]/30">
          <p className="text-2xl font-black text-[#8e7164] uppercase">NENHUMA AULA PARA REVISAR</p>
        </div>
      ) : grupos.map(g => {
        const aberto = abertos.has(g.aluno_id);
        return (
          <div key={g.aluno_id} className="bg-white border-4 border-black shadow-[6px_6px_0_#000]">
            <button onClick={() => alternar(g.aluno_id)} className="w-full flex items-center gap-3 p-4 text-left">
              {aberto ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              <span className="font-black uppercase text-base flex-1 truncate">{g.nome}</span>
              <span className="bg-[#ff6b00] text-white border-2 border-black px-2 py-0.5 text-xs font-black">{g.aulas.length} aula(s)</span>
            </button>
            {aberto && (
              <div className="border-t-4 border-black divide-y-2 divide-[#e2bfb0]">
                {g.aulas.map(a => (
                  <div key={a.id} className="p-3 flex flex-wrap items-center gap-3">
                    <div className="min-w-[150px]">
                      <p className="font-black text-sm">{fmtData(a.data)} <span className="text-[#8e7164]">{diaSemana(a.data)}</span> · {a.horario}</p>
                      <p className="text-[11px] font-bold uppercase text-[#8e7164]">{a.curso_nome || 'Curso'} · Prof. {a.professor_nome || '?'}</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 border-2 border-black ${a.status === 'pendente' ? 'bg-[#feccba]' : 'bg-amber-200'}`}>
                      {a.status === 'pendente' ? 'Sem presença' : a.status === 'confirmada' ? 'Confirmada pelo aluno' : 'Aguardando confirmação'}
                    </span>
                    {a.tipo && a.tipo !== 'regular' && <span className="text-[10px] font-black uppercase px-2 py-1 border-2 border-black bg-white">{a.tipo}</span>}
                    <div className="ml-auto flex flex-wrap gap-2">
                      <button disabled={processando.has(a.id)} onClick={() => decidir(a, 'realizada')} className="px-3 py-2 border-2 border-black bg-emerald-500 text-white text-[11px] font-black uppercase shadow-[2px_2px_0_#000] disabled:opacity-50 flex items-center gap-1"><Check className="w-3 h-3" /> Realizada</button>
                      <button disabled={processando.has(a.id)} onClick={() => decidir(a, 'reposicao')} className="px-3 py-2 border-2 border-black bg-[#ff6b00] text-white text-[11px] font-black uppercase shadow-[2px_2px_0_#000] disabled:opacity-50 flex items-center gap-1"><RefreshCcw className="w-3 h-3" /> Reposição</button>
                      <button disabled={processando.has(a.id)} onClick={() => decidir(a, 'falta')} className="px-3 py-2 border-2 border-black bg-red-600 text-white text-[11px] font-black uppercase shadow-[2px_2px_0_#000] disabled:opacity-50 flex items-center gap-1"><X className="w-3 h-3" /> Falta</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Reposicoes() {
  const navigate = useNavigate();
  const [aba, setAba] = useState<'fila' | 'revisao'>('fila');
  const [totalRevisao, setTotalRevisao] = useState<number | null>(null);
  const [reposicoes, setReposicoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReposicoes = async () => {
    try {
      const token = localStorage.getItem('acorde_token');
      const res = await fetch('/api/agenda?status=reposicao', { 
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filtrar apenas aulas com status = 'reposicao'
        const apenasReposicoes = data.filter((a: any) => a.status === 'reposicao' || a.status === 'a_repor');
        setReposicoes(apenasReposicoes);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Recarrega a fila ao voltar para ela: aulas enviadas na aba Revisão precisam aparecer na hora
  useEffect(() => {
    if (aba === 'fila') fetchReposicoes();
  }, [aba]);

  useEffect(() => {
    // contador da aba "Revisão de aulas"
    fetch('/api/aulas/revisao', { headers: { 'Authorization': `Bearer ${localStorage.getItem('acorde_token')}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d)) setTotalRevisao(d.length); })
      .catch(() => {});
  }, []);

  return (
    <div className="p-8 font-['Space_Mono'] h-full flex flex-col bg-[#fff8f6]">
      <div className="flex items-center gap-4 mb-8 border-b-4 border-black pb-4">
        <div className="bg-[#ff6b00] p-4 border-4 border-black shadow-[4px_4px_0_#000]">
          <RefreshCcw className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black uppercase text-black">{aba === 'revisao' ? 'Revisão de Aulas' : 'Fila de Reposições'}</h1>
          <p className="text-[#8e7164] font-bold text-sm uppercase">{aba === 'revisao' ? 'Aulas passadas sem presença marcada: reposição, falta ou realizada' : 'Alunos aguardando reagendamento de aulas canceladas'}</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button onClick={() => setAba('fila')} className={`px-5 py-3 border-4 border-black font-black uppercase text-sm shadow-[4px_4px_0_#000] flex items-center gap-2 ${aba === 'fila' ? 'bg-black text-white' : 'bg-white text-black'}`}>
          <RefreshCcw className="w-4 h-4" /> Fila de reposições
        </button>
        <button onClick={() => setAba('revisao')} className={`px-5 py-3 border-4 border-black font-black uppercase text-sm shadow-[4px_4px_0_#000] flex items-center gap-2 ${aba === 'revisao' ? 'bg-black text-white' : 'bg-white text-black'}`}>
          <ClipboardCheck className="w-4 h-4" /> Revisão de aulas{totalRevisao !== null ? ` (${totalRevisao})` : ''}
        </button>
      </div>

      {aba === 'revisao' ? (
        <div className="flex-1 overflow-auto"><RevisaoAulas onCount={setTotalRevisao} /></div>
      ) : (
      <div className="flex-1 overflow-auto">
        {loading ? (
          <p className="text-center font-bold">CARREGANDO FILA...</p>
        ) : reposicoes.length === 0 ? (
          <div className="text-center p-12 border-4 border-dashed border-[#8e7164]/30">
            <p className="text-2xl font-black text-[#8e7164] uppercase">NENHUMA REPOSIÇÃO PENDENTE</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reposicoes.map(aula => (
              <div key={aula.id} className="bg-white border-4 border-black shadow-[8px_8px_0_#000] p-6 flex flex-col gap-4 text-black">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-black text-white font-black flex items-center justify-center text-xl shrink-0">
                    {(aula.aluno_nome || 'A')[0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-lg uppercase truncate text-black">{aula.aluno_nome || 'Aluno'}</h3>
                    <p className="text-xs font-bold text-[#8e7164] uppercase flex items-center gap-1">
                      <User className="w-3 h-3 text-[#8e7164]" /> <span className="text-[#8e7164]">Prof. {aula.professor_nome || '?'}</span>
                    </p>
                  </div>
                </div>

                <div className="bg-[#f4f4f5] p-3 border-2 border-black text-black">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-[#ff6b00]" />
                    <span className="text-xs font-black uppercase text-black">Data Original:</span>
                    <span className="text-xs font-bold text-black">
                      {aula.data_original && aula.data_original !== '2099-12-31'
                        ? aula.data_original.split('-').reverse().join('/') 
                        : (aula.data && aula.data !== '2099-12-31' 
                          ? aula.data.split('-').reverse().join('/') 
                          : 'A agendar')}
                    </span>
                  </div>
                  {aula.motivo_cancelamento && (
                    <div className="pt-2 border-t-2 border-black/10 mt-2">
                      <span className="text-[10px] font-black uppercase text-[#8e7164] block mb-1">Motivo / Observação:</span>
                      <p className="text-xs font-bold text-black italic">"{aula.motivo_cancelamento}"</p>
                    </div>
                  )}
                </div>

                <div className="border-t-4 border-dashed border-[#ff6b00]/20 pt-4 mt-auto">
                  <p className="text-xs font-black uppercase text-[#ff6b00] mb-2">Aguardando reagendamento</p>
                  <button 
                    onClick={() => navigate('/agenda', { state: { rescheduleAula: aula } })}
                    className="w-full py-3 bg-[#ff6b00] text-white font-black uppercase border-4 border-black shadow-[4px_4px_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all"
                  >
                    Agendar Horário
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
