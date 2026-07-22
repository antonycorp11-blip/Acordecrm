import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, HelpCircle, Search, AlertTriangle, Megaphone, Sparkles, Clock, Plus, TrendingUp, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { FeedAtividades } from '../components/FeedAtividades';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);

  const [aulasSemStatus, setAulasSemStatus] = useState<any[]>([]);
  const [leadsDoMes, setLeadsDoMes] = useState<any[]>([]);
  const [faturasPendentes, setFaturasPendentes] = useState<any[]>([]);
  const [temporada, setTemporada] = useState<{nome: string}>({ nome: 'Temporada 2' });
  const [feed, setFeed] = useState<any[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [showModalAulas, setShowModalAulas] = useState(false);
  const [showModalFaturas, setShowModalFaturas] = useState(false);
  const [cancelModalAula, setCancelModalAula] = useState<any>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  const getQuintoDiaUtil = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth();
    let count = 0;
    let day = 1;
    while (count < 5) {
      const temp = new Date(year, month, day);
      const w = temp.getDay();
      if (w !== 0 && w !== 6) count++;
      if (count < 5) day++;
    }
    return new Date(year, month, day);
  };

  const loadAlerts = () => {
    const token = localStorage.getItem('acorde_token');
    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch('/api/agenda/pendentes-passado', { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/dashboard/faturas-pendentes', { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/feed', { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/temporada-atual', { headers }).then(r => r.ok ? r.json() : {nome: 'Temporada 2'}),
      fetch('/api/leads', { headers }).then(r => r.ok ? r.json() : [])
    ]).then(([aulas, faturas, feedData, temp, leadsList]) => {
      setAulasSemStatus(aulas);
      setFaturasPendentes(faturas);
      setFeed(Array.isArray(feedData) ? feedData : []);
      setTemporada(temp || {nome: 'Temporada 2'});

      if (Array.isArray(leadsList)) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const doMes = leadsList.filter((lead: any) => {
          const dateStr = lead.created_at || lead.data_atualizacao;
          if (!dateStr) return false;
          const leadDate = new Date(dateStr);
          return leadDate.getFullYear() === currentYear && leadDate.getMonth() === currentMonth;
        });
        setLeadsDoMes(doMes);
      }
      
      const quintoDia = getQuintoDiaUtil();
      const hoje = new Date();
      hoje.setHours(0,0,0,0);
      quintoDia.setHours(0,0,0,0);

      // Regra dos modais: Apenas se for maior que zero
      if (aulas.length > 0) setShowModalAulas(true);
      // Faturas apenas a partir do quinto dia útil
      if (faturas.length > 0 && hoje >= quintoDia) setShowModalFaturas(true);
    }).catch(console.error);
  };

  useEffect(() => {
    loadAlerts();
    if (window.innerWidth < 768) {
      navigate('/agenda', { replace: true });
      return;
    }

    fetch('/api/dashboard/stats', {
      headers: { Authorization: `Bearer ${localStorage.getItem('acorde_token')}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => setStats(data))
      .catch(() => setStats({ totalAlunos: 0, aulasHoje: 0, receitaMensal: 0, proximasAulas: [] }));
  }, []);

  const faturamento = stats?.receitaMensal ?? 0;
  const proximasAulas = stats?.proximasAulas ?? [];
  const alunosApp = stats?.alunosAppStatus ?? [];
  const matriculasPorCurso = stats?.matriculasPorCurso ?? [];
  const maxQtd = matriculasPorCurso.length > 0 ? Math.max(...matriculasPorCurso.map((m: any) => m.qtd)) : 10;

  const dotColors = ['bg-green-500', 'bg-orange-500', 'bg-red-500'];

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden" style={{ background: '#000', fontFamily: "'Space Mono', monospace" }}>

      {/* TOP BAR */}
      <header className="flex items-center gap-4 px-6 py-4 border-b-4 border-[#3d2d26] shrink-0" style={{ background: '#1a0f0a' }}>
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-white font-black text-lg tracking-widest uppercase" style={{ fontFamily: "'Space Mono', monospace" }}>
            STUDIO CRM
          </h1>
          <span className="bg-[#ff6b00] text-white text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase">{temporada.nome || 'V2.0_BETA'}</span>
        </div>
        <div className="flex items-center gap-2 bg-[#261812] border-2 border-[#5a4136] rounded px-3 py-2 flex-1 max-w-sm">
          <Search className="w-4 h-4 text-[#8e7164]" />
          <input placeholder="Buscar aluno ou aula..." className="bg-transparent text-sm text-[#fff8f6] placeholder:text-[#8e7164] outline-none flex-1" style={{ fontFamily: "'Space Mono', monospace" }} />
        </div>
        <div className="flex items-center gap-3">
          <button className="text-[#8e7164] hover:text-white"><Bell className="w-5 h-5" /></button>
          <button className="text-[#8e7164] hover:text-white"><HelpCircle className="w-5 h-5" /></button>
          <div className="w-9 h-9 rounded-full border-2 border-[#ff6b00] bg-[#ff6b00] flex items-center justify-center text-white font-black text-sm">
            {(user?.nome || 'A').charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-auto p-6 space-y-5">

        {/* TOP ROW */}
        <div className="grid grid-cols-3 gap-5">
          {/* Total Alunos & Aulas */}
          <div className="col-span-2 grid grid-cols-2 gap-5">
            <div className="sticker-card rounded-lg p-5 flex flex-col justify-center" style={{ background: '#fff8f6' }}>
              <p className="text-[#ff6b00] text-[10px] font-black uppercase tracking-widest mb-3">TOTAL DE ALUNOS ATIVOS</p>
              <div className="text-[#261812] font-black text-6xl leading-none">
                {stats?.totalAlunos || 0}
              </div>
            </div>
            <div className="sticker-card rounded-lg p-5 flex flex-col justify-center" style={{ background: '#fff8f6' }}>
              <p className="text-[#ff6b00] text-[10px] font-black uppercase tracking-widest mb-3">AULAS AGENDADAS (HOJE)</p>
              <div className="text-[#261812] font-black text-6xl leading-none">
                {stats?.aulasHoje || 0}
              </div>
            </div>
          </div>

          {/* Alunos PWA Ativos */}
          <div className="rounded-lg p-5 relative flex flex-col" style={{ background: '#ff6b00', border: '3px solid #261812', boxShadow: '4px 4px 0 #261812' }}>
            <div className="flex items-center justify-between mb-4 shrink-0">
              <p className="text-white text-[11px] font-black uppercase tracking-widest">STATUS DE INSTALAÇÃO DO APP</p>
              <span className="text-white font-black text-xl">📱</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 max-h-48 custom-scrollbar">
              {alunosApp.length > 0 ? alunosApp.map((aluno: any, idx: number) => (
                <div key={idx} className={`bg-white rounded px-3 py-2 flex items-center justify-between gap-2 border-2 ${aluno.ativo ? 'border-emerald-500' : 'border-red-500'}`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs shrink-0">{aluno.ativo ? '🟢' : '🔴'}</span>
                    <span className="text-[#261812] text-xs font-black truncate" title={aluno.nome}>{aluno.nome}</span>
                  </div>
                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${aluno.ativo ? 'bg-emerald-100 text-emerald-800 border border-emerald-400' : 'bg-red-100 text-red-800 border border-red-400'}`}>
                    {aluno.ativo ? 'ATIVO' : 'COBRAR'}
                  </span>
                </div>
              )) : (
                <div className="text-white/80 text-xs font-black uppercase text-center mt-5">Sem alunos cadastrados</div>
              )}
            </div>
          </div>
        </div>

        {/* MIDDLE ROW: ALERTAS, FATURAS E FEED */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* LEADS RECEBIDOS WIDGET */}
          <div className="sticker-card rounded-lg flex flex-col overflow-hidden" style={{ background: '#fff8f6', border: '3px solid #261812', maxHeight: '350px' }}>
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: '#ffeb3b', borderBottom: '3px solid #261812' }}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-black" />
                <p className="text-black text-[11px] font-black uppercase tracking-widest">Leads Recebidos (Mês)</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col custom-scrollbar">
              <div className="flex flex-col items-center justify-center border-b-2 border-black/10 pb-4 mb-4 shrink-0">
                <span className="text-[10px] font-black text-[#8e7164] uppercase tracking-widest mb-1">Total do Mês</span>
                <div className="text-5xl font-black text-[#ff6b00] italic leading-none">{leadsDoMes.length}</div>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {leadsDoMes.slice(0, 15).map((lead) => {
                  const dateStr = lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '';
                  return (
                    <div key={lead.id} className="bg-white p-2.5 border-2 border-black rounded flex items-center justify-between shadow-[1px_1px_0_#000]">
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-black text-[10px] uppercase truncate">{lead.nome || 'Sem Nome'}</p>
                        <p className="text-[7px] text-[#8e7164] font-black uppercase">{dateStr} • {lead.telefone}</p>
                      </div>
                      <span className={`text-[7px] px-1.5 py-0.5 border border-black font-black uppercase rounded shrink-0 ml-2 ${
                        lead.status === 'finalizado' ? 'bg-black text-white' : 'bg-[#feccba] text-black'
                      }`}>
                        {lead.status === 'finalizado' ? 'Encerrado' : 'Ativo'}
                      </span>
                    </div>
                  );
                })}
                {leadsDoMes.length === 0 && (
                  <div className="h-full flex items-center justify-center text-[#8e7164] text-xs font-black uppercase text-center mt-6">
                    Nenhum lead recebido este mês
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FATURAS WIDGET */}
          <div className="sticker-card rounded-lg flex flex-col overflow-hidden" style={{ background: '#fff8f6', border: '3px solid #261812', maxHeight: '350px' }}>
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: '#ff6b00', borderBottom: '3px solid #261812' }}>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-sm">💰</span>
                <p className="text-white text-[11px] font-black uppercase tracking-widest">Cobranças do Mês ({faturasPendentes.length})</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {faturasPendentes.length > 0 ? faturasPendentes.map(fat => (
                <div key={fat.id} className="flex items-center justify-between bg-white p-3 border-2 border-black rounded shadow-[2px_2px_0_#000]">
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-black uppercase text-xs truncate">{fat.alunos?.nome}</p>
                    <p className="text-[9px] font-bold text-[#8e7164] uppercase">Vence: {fat.data_vencimento.split('-').reverse().join('/')}</p>
                  </div>
                  <div className="shrink-0 text-right ml-2">
                    <p className="font-black text-red-600 text-sm">R$ {fat.valor}</p>
                    <p className="text-[8px] font-black uppercase bg-red-100 text-red-800 px-1 rounded border border-red-300 inline-block">{fat.status}</p>
                  </div>
                </div>
              )) : (
                <div className="h-full flex items-center justify-center text-[#8e7164] text-xs font-black uppercase text-center">Nenhuma cobrança pendente.</div>
              )}
            </div>
          </div>
          
          {/* FEED DE ATIVIDADES WIDGET */}
          <div className="sticker-card rounded-lg flex flex-col overflow-hidden" style={{ background: '#fff8f6', border: '3px solid #261812', maxHeight: '350px' }}>
            <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ background: '#00cc66', borderBottom: '3px solid #261812' }}>
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-sm">🌍</span>
                <p className="text-white text-[11px] font-black uppercase tracking-widest">Feed do CRM</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <FeedAtividades atividades={feed} loading={loadingFeed} />
            </div>
          </div>
        </div>

        {/* BOTTOM ROW */}
        <div className="grid grid-cols-3 gap-5">

          {/* Matrículas por Curso Chart */}
          <div className="col-span-2 sticker-card rounded-lg overflow-hidden flex flex-col" style={{ background: '#fff8f6', minHeight: '280px' }}>
            <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: '#ff6b00', borderBottom: '3px solid #261812' }}>
              <div className="w-3 h-3 rounded-sm border border-white bg-white/20"></div>
              <p className="text-white text-[11px] font-black uppercase tracking-widest flex-1">MATRÍCULAS POR CURSO / INSTRUMENTO</p>
              <div className="flex gap-2">
                <div className="w-4 h-4 border border-white rounded-sm bg-white/20"></div>
                <div className="w-4 h-4 border border-white rounded-sm bg-white/20"></div>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-end">
              <div className="flex items-end gap-4 h-40 mb-3 border-b-4 border-[#261812] pb-1">
                {matriculasPorCurso.length > 0 ? matriculasPorCurso.map((m: any, i: number) => {
                  const heightPct = Math.max(5, (m.qtd / maxQtd) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-black text-white text-[10px] font-black px-2 py-1 rounded transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        {m.qtd} Aluno{m.qtd !== 1 ? 's' : ''}
                      </div>
                      <div
                        className="w-full rounded-t transition-all cursor-pointer hover:brightness-90 relative"
                        style={{ height: `${heightPct}%`, background: '#ff6b00', border: '3px solid #261812', borderBottom: 'none' }}
                      >
                         <div className="absolute inset-0 bg-white/10 w-1/3"></div>
                      </div>
                    </div>
                  );
                }) : (
                   <div className="w-full flex items-center justify-center text-[#8e7164] font-black uppercase text-xs">Sem dados de cursos</div>
                )}
              </div>
              <div className="flex gap-4">
                {matriculasPorCurso.map((m: any, i: number) => (
                  <div key={i} className="flex-1 text-center shrink-0 min-w-0">
                    <span className="text-[9px] font-black text-[#8e7164] uppercase truncate block">{m.curso.substring(0, 8)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Próximas Aulas */}
          <div className="sticker-card rounded-lg overflow-hidden" style={{ background: '#fff8f6' }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b-2 border-[#7b5647]">
              <Clock className="w-4 h-4 text-[#7b5647]" />
              <p className="text-[#261812] text-[11px] font-black uppercase tracking-widest">PRÓXIMAS AULAS</p>
            </div>
            <div className="divide-y-2 divide-[#f8ddd2] min-h-[150px] flex flex-col">
              {proximasAulas.length > 0 ? proximasAulas.slice(0, 3).map((aula: any, i: number) => (
                <div key={aula.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded border-2 border-[#7b5647] bg-[#feccba] flex items-center justify-center text-[#261812] font-black text-xs shrink-0">
                    {(aula.nome || aula.aluno_nome || '?').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#261812] text-xs font-black truncate">{aula.nome || aula.aluno_nome} – {aula.instrumento || aula.curso_nome || 'Aula'}</p>
                    <p className="text-[#ff6b00] text-[10px] font-black">{aula.horario} • {aula.sala || 'Sala'}</p>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColors[i % 3]}`}></div>
                </div>
              )) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center opacity-40">
                  <p className="text-[10px] font-black text-[#261812] uppercase tracking-widest">Sem aulas<br />agendadas hoje</p>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate('/agenda')}
              className="w-full py-3 border-t-2 border-[#7b5647] text-[#261812] text-[10px] font-black uppercase tracking-widest hover:bg-[#ff6b00] hover:text-white transition-all"
            >
              VER AGENDA COMPLETA
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-t-4 border-[#3d2d26]" style={{ background: '#1a0f0a' }}>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded border-2 border-[#5a4136] text-[#fff8f6] text-xs font-black uppercase tracking-widest hover:border-[#ff6b00] hover:text-[#ff6b00] transition-all">
          <Plus className="w-4 h-4" /> Registrar Pagamento
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded text-white text-xs font-black uppercase tracking-widest pressable-btn" style={{ background: '#ff6b00', border: '2px solid #261812' }}>
          <Megaphone className="w-4 h-4" /> Enviar Comunicado
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded border-2 border-[#5a4136] text-[#fff8f6] text-xs font-black uppercase tracking-widest hover:border-[#ff6b00] hover:text-[#ff6b00] transition-all">
          Estoque: Instrum...
        </button>
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-xl shrink-0" style={{ background: '#ff6b00', border: '3px solid #261812', boxShadow: '3px 3px 0 #261812' }}>
          +
        </button>
      </div>
{/* POPUPS DE AVISO (STARTUP) */}
      {showModalAulas && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-[#ffeb3b] border-4 border-black p-6 w-full max-w-sm font-['Space_Mono'] shadow-[8px_8px_0_#000] relative">
            <div className="w-12 h-12 bg-black text-[#ffeb3b] rounded-full flex items-center justify-center absolute -top-6 -left-6 border-4 border-black shadow-[4px_4px_0_#000]">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase text-black mb-4 mt-2">Atenção!</h3>
            <p className="text-sm font-bold text-black mb-6 uppercase">
              Existem {aulasSemStatus.length} aulas no passado que não tiveram presença ou falta registradas. Por favor, resolva no painel da tela inicial.
            </p>
            <button 
              onClick={() => setShowModalAulas(false)}
              className="w-full px-4 py-3 bg-black text-[#ffeb3b] border-4 border-black font-black uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none hover:bg-[#333]"
            >
              Ciente
            </button>
          </div>
        </div>
      )}

      {!showModalAulas && showModalFaturas && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-[#ff6b00] border-4 border-black p-6 w-full max-w-sm font-['Space_Mono'] shadow-[8px_8px_0_#000] relative">
            <div className="w-12 h-12 bg-black text-[#ff6b00] rounded-full flex items-center justify-center absolute -top-6 -left-6 border-4 border-black shadow-[4px_4px_0_#000]">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black uppercase text-white mb-4 mt-2">Cobranças Pendentes</h3>
            <p className="text-sm font-bold text-white mb-6 uppercase">
              Lembrete: Hoje já é do quinto dia útil em diante! Existem {faturasPendentes.length} alunos com mensalidade pendente ou próxima. Não se esqueça de cobrar!
            </p>
            <button 
              onClick={() => setShowModalFaturas(false)}
              className="w-full px-4 py-3 bg-white text-black border-4 border-black font-black uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none hover:bg-gray-200"
            >
              Ciente
            </button>
          </div>
        </div>
      )}

      {/* CANCEL/REPOSICAO MODAL (REUSED FROM AGENDA) */}
      {cancelModalAula && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-black p-6 w-full max-w-sm font-['Space_Mono'] shadow-[8px_8px_0_#000]">
            <h3 className="text-xl font-black uppercase text-black mb-4">Reposição?</h3>
            <p className="text-xs font-bold text-black mb-4 uppercase">
              Deseja enviar esta aula para a fila de reposições do aluno?
            </p>
            <div className="mb-6">
              <label className="block text-[10px] font-black text-black uppercase mb-2">Motivo / Observação:</label>
              <textarea 
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex: Professor faltou, Atestado Médico..."
                className="w-full bg-[#f4f4f5] border-2 border-black p-3 text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-[#ff6b00]"
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  if (!motivoCancelamento.trim()) {
                    toast.error('Informe o motivo!');
                    return;
                  }
                  fetch(`/api/agenda/${cancelModalAula.id}/cancelar`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('acorde_token')}` },
                    body: JSON.stringify({ reposicao: true, motivo_cancelamento: motivoCancelamento })
                  }).then(() => {
                    toast.success('Enviada para reposição!');
                    loadAlerts();
                    setCancelModalAula(null);
                    setMotivoCancelamento('');
                  });
                }}
                className="w-full px-4 py-3 bg-green-500 text-black border-4 border-black font-black uppercase shadow-[4px_4px_0_#000] active:translate-y-1 hover:bg-green-400"
              >
                SIM (Reposição)
              </button>
              <button 
                onClick={() => { setCancelModalAula(null); setMotivoCancelamento(''); }}
                className="w-full mt-4 text-[#8e7164] font-bold text-sm uppercase hover:text-black"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
