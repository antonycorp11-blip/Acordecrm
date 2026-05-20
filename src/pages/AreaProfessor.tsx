import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Home, 
  Users, 
  Calendar, 
  User, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Plus, 
  Star, 
  Clock, 
  BookOpen, 
  Trophy, 
  PlusCircle, 
  Trash2, 
  Sparkles, 
  FileText, 
  Link2,
  LogOut
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AreaProfessor() {
  const { logout } = useAuth();
  const [professorData, setProfessorData] = useState<any>(null);
  const [aulasHoje, setAulasHoje] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal de registro de aula (Musiclass)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAula, setSelectedAula] = useState<any>(null);
  
  // Estados do formulário de aula
  const [statusAula, setStatusAula] = useState('realizada');
  const [conteudo, setConteudo] = useState('');
  const [tarefaCasa, setTarefaCasa] = useState('');
  const [xpGanho, setXpGanho] = useState(50);
  const [midias, setMidias] = useState<{ titulo: string; url: string }[]>([]);
  const [linkTitulo, setLinkTitulo] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const xp = professorData?.xp || 8450;
  const xpMax = 10000;
  const nivel = 42;
  const xpPct = Math.min(100, (xp / xpMax) * 100);
  const hoje = format(new Date(), "d 'de' MMM", { locale: ptBR }).toUpperCase();
  const todayDay = format(new Date(), 'dd');
  const todayMonth = format(new Date(), 'MMM', { locale: ptBR }).toUpperCase();

  const loadData = () => {
    const token = localStorage.getItem('acorde_token');
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
    
    Promise.all([
      fetch('/api/professores/me', { headers }).then(r => r.ok ? r.json() : null),
      fetch('/api/agenda', { headers }).then(r => r.ok ? r.json() : [])
    ]).then(([me, agenda]) => {
      if (me) {
        setProfessorData(me);
      }
      
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      // Filtra aulas do dia
      const hojeAulas = (Array.isArray(agenda) ? agenda : [])
        .filter((a: any) => a.data === todayStr)
        .sort((a: any, b: any) => (a.horario || '').localeCompare(b.horario || ''));
        
      setAulasHoje(hojeAulas);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const openRegistroModal = (aula: any) => {
    setSelectedAula(aula);
    setStatusAula(aula.status === 'realizada' || aula.status === 'pendente' ? 'realizada' : aula.status);
    setConteudo(aula.conteudo || '');
    setTarefaCasa(aula.tarefa_casa || '');
    setXpGanho(Number(aula.xp_ganho) || 50);
    
    // Processamento seguro de mídias salvas
    try {
      if (typeof aula.midias === 'string') {
        setMidias(JSON.parse(aula.midias));
      } else if (Array.isArray(aula.midias)) {
        setMidias(aula.midias);
      } else {
        setMidias([]);
      }
    } catch {
      setMidias([]);
    }
    
    setIsModalOpen(true);
  };

  const handleAddLink = () => {
    if (!linkTitulo || !linkUrl) return;
    setMidias(prev => [...prev, { titulo: linkTitulo, url: linkUrl }]);
    setLinkTitulo('');
    setLinkUrl('');
  };

  const handleRemoveLink = (idx: number) => {
    setMidias(prev => prev.filter((_, i) => i !== idx));
  };

  const salvarDiarioAula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAula) return;
    
    const token = localStorage.getItem('acorde_token');
    try {
      const res = await fetch(`/api/aulas/${selectedAula.originalId || selectedAula.id}/status`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          status: statusAula,
          conteudo,
          tarefa_casa: tarefaCasa,
          midias: midias,
          xp_ganho: xpGanho
        })
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        loadData();
      } else {
        alert('Erro ao registrar diário de aula.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao salvar diário.');
    }
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#1a0a05] text-[#ff6b00] font-black uppercase tracking-widest animate-pulse font-mono">
      CONECTANDO AO MUSIC_HUB...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#110804] flex items-center justify-center p-0 md:p-8 overflow-hidden font-['Space_Mono']">
      
      {/* MOBILE SIMULATOR WRAPPER */}
      <div className="w-full h-full md:h-[844px] md:max-w-[390px] md:border-[12px] md:border-black md:rounded-[60px] md:shadow-[0_0_0_8px_#3d2d26,0_20px_50px_rgba(0,0,0,0.5)] bg-[#1a0a05] relative overflow-hidden flex flex-col">
        
        {/* Notch simulation */}
        <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-50"></div>

        {/* TOP BAR */}
        <header className="flex items-center justify-between px-6 py-4 pt-10 md:pt-10 shrink-0 bg-[#feccba] border-b-8 border-black z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-none border-4 border-black overflow-hidden bg-[#ff6b00] shadow-[4px_4px_0_#000]">
              <div className="w-full h-full flex items-center justify-center text-white font-black text-lg">
                {(professorData?.nome || user?.nome || 'P').charAt(0).toUpperCase()}
              </div>
            </div>
            <h1 className="text-black font-black text-lg uppercase italic tracking-tighter">MUSIC_HUB</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-black hover:text-[#ff6b00] transition-colors">
              <Bell className="w-6 h-6" />
            </button>
            <button onClick={logout} className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* SCROLL CONTENT */}
        <div className="flex-1 overflow-auto pb-24 scrollbar-hide">
          <div className="px-4 py-5 space-y-5">

            {/* Resumo do Dia Card */}
            <div className="bg-[#fff8f6] border-8 border-black p-6 relative overflow-hidden shadow-[12px_12px_0_#000] transform rotate-1">
              <div className="absolute top-0 right-0 px-3 py-1 bg-[#ff6b00] text-white font-black text-[9px] uppercase border-l-4 border-b-4 border-black">
                MASTER_INSTRUCTOR
              </div>
              
              <p className="text-[#8e7164] text-[8px] font-black uppercase tracking-widest mb-1">&gt;&gt; INSTRUCTOR_STATS</p>
              <h2 className="text-black font-black text-2xl uppercase italic leading-none mb-6 truncate">
                {professorData?.nome || user?.nome || 'INSTRUTOR'}
              </h2>
              
              <div className="space-y-3 mb-5">
                <div className="flex justify-between items-center text-[10px] font-black text-black">
                  <span>LEVEL {nivel}</span>
                  <span>XP: {xp.toLocaleString()} / {xpMax.toLocaleString()}</span>
                </div>
                <div className="h-5 bg-black p-1 border-4 border-black overflow-hidden">
                  <div className="h-full bg-[#ff6b00] transition-all duration-1000 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" style={{ width: `${xpPct}%` }}></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#feccba] border-4 border-black p-3 shadow-[4px_4px_0_#000]">
                  <p className="text-[7px] font-black text-[#8e7164] uppercase mb-1">AULAS HOJE</p>
                  <span className="text-black font-black text-2xl italic leading-none">
                    {String(aulasHoje.length).padStart(2, '0')}
                  </span>
                </div>
                <div className="bg-[#feccba] border-4 border-black p-3 shadow-[4px_4px_0_#000]">
                  <p className="text-[7px] font-black text-[#8e7164] uppercase mb-1">XP ACUMULADO</p>
                  <p className="text-[#ff6b00] font-black text-xl italic leading-none">+{xp} XP</p>
                </div>
              </div>
            </div>

            {/* Widget de Saldo do Mestre */}
            <div className="p-5 bg-[#261812] border-8 border-black shadow-[8px_8px_0_#000] transform -rotate-1">
              <h3 className="text-white font-black text-[9px] uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="text-[#ff6b00]">💳</span> MEU SALDO DE REMUNERAÇÃO
              </h3>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[#ff6b00] font-black text-3xl italic">
                    R$ {Number(professorData?.saldo || 0).toFixed(2)}
                  </p>
                  <p className="text-white/60 font-bold text-[8px] uppercase tracking-widest mt-1">
                    TAXA/AULA DEFINIDA: R$ {Number(professorData?.valor_aula || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-[#ff6b00] text-black font-black text-[8px] px-2 py-1 rounded border border-black animate-pulse">
                  SALDO REAL ⚡
                </div>
              </div>
            </div>

            {/* Agenda do Dia */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-black text-xs uppercase tracking-widest">AGENDA_DE_HOJE</h3>
                <span className="bg-[#feccba] border-2 border-black text-black font-black text-[8px] px-2 py-1 uppercase shadow-[2px_2px_0_#000]">
                  {todayMonth} {todayDay}
                </span>
              </div>

              <div className="space-y-4">
                {aulasHoje.map((aula: any) => {
                  const isConcluida = aula.status === 'realizada';
                  const isFalta = aula.status === 'falta_aluno' || aula.status === 'ausente';
                  const isPendente = !isConcluida && !isFalta;
                  
                  return (
                    <div
                      key={aula.id}
                      className="bg-[#fff8f6] border-4 border-black p-4 shadow-[4px_4px_0_#000] hover:translate-y-[-2px] transition-all relative overflow-hidden"
                    >
                      {/* Status Badges */}
                      {isConcluida && (
                        <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500 text-white font-black text-[7px] uppercase border-l-2 border-b-2 border-black">
                          CONCLUÍDA
                        </div>
                      )}
                      {isFalta && (
                        <div className="absolute top-0 right-0 px-3 py-1 bg-red-500 text-white font-black text-[7px] uppercase border-l-2 border-b-2 border-black">
                          FALTA
                        </div>
                      )}
                      {isPendente && (
                        <div className="absolute top-0 right-0 px-3 py-1 bg-[#ff6b00] text-white font-black text-[7px] uppercase border-l-2 border-b-2 border-black animate-pulse">
                          AGUARDANDO
                        </div>
                      )}

                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#feccba] border-4 border-black text-black flex items-center justify-center shrink-0">
                          <span className="font-black text-xl">♪</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#ff6b00] font-black text-[9px] uppercase tracking-wider flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {aula.horario?.substring(0, 5)}
                          </p>
                          <h4 className="text-black font-black text-base uppercase italic leading-none my-1 truncate">
                            {aula.nome || aula.aluno_nome || 'ALUNO NÃO VINCULADO'}
                          </h4>
                          <p className="text-black/50 font-black text-[8px] uppercase">
                            {aula.curso_nome || 'CURSO REGULAR'}
                          </p>
                        </div>
                      </div>

                      {/* Botão de Registro / Criação de Aula */}
                      <div className="mt-4 border-t-2 border-black/10 pt-3 flex justify-between items-center">
                        <span className="text-[8px] font-black text-black/40 uppercase">
                          XP ALUNO: +{aula.xp_ganho || 50} XP
                        </span>
                        
                        <button
                          onClick={() => openRegistroModal(aula)}
                          className="bg-[#ff6b00] text-white px-3 py-2 border-2 border-black font-black uppercase text-[8px] shadow-[2px_2px_0_#000] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1"
                        >
                          <BookOpen className="w-3 h-3" /> 
                          {isConcluida ? 'VER_DIARIO' : 'REGISTRAR_AULA'}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {aulasHoje.length === 0 && (
                  <div className="p-8 text-center bg-[#261812]/50 border-4 border-dashed border-[#3d2d26] rounded-none">
                    <p className="text-[#8e7164] font-black text-[10px] uppercase italic">
                      &gt;&gt; NENHUMA_AULA_AGENDADA_HOJE
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Banner Decorativo */}
            <div className="bg-[#feccba] border-8 border-black p-6 rounded-none text-center transform -rotate-1 shadow-[8px_8px_0_#000]">
              <div className="w-12 h-12 bg-black text-[#ff6b00] rounded-none border-4 border-black flex items-center justify-center mx-auto mb-3 shadow-[4px_4px_0_#000]">
                <Sparkles className="w-6 h-6 text-[#ff6b00]" />
              </div>
              <h3 className="font-black text-black text-sm uppercase italic">DIÁRIO MUSICLASS ⚡</h3>
              <p className="text-[#8e7164] font-bold text-[9px] uppercase tracking-wider mt-2">
                Envie feedbacks das aulas, crie desafios e anexe mídias na hora. Tudo vai direto para a Área do Aluno!
              </p>
            </div>

          </div>
        </div>

        {/* BOTTOM NAV */}
        <nav className="absolute bottom-0 left-0 right-0 h-20 bg-[#261812] border-t-8 border-black flex items-center justify-around px-2 z-40">
          {[
            { icon: Home, label: 'HOME', active: true },
            { icon: Users, label: 'ALUNOS' },
            { icon: Calendar, label: 'AGENDA' },
            { icon: User, label: 'PERFIL' },
          ].map((item, i) => (
            <button key={i} className={`flex flex-col items-center gap-1 transition-all ${item.active ? 'translate-y-[-4px]' : 'opacity-50'}`}>
              <div className={`p-2 border-4 border-black shadow-[4px_4px_0_#000] ${item.active ? 'bg-[#ff6b00]' : 'bg-white'}`}>
                <item.icon className={`w-5 h-5 ${item.active ? 'text-white' : 'text-black'}`} />
              </div>
              <span className="text-[6px] font-black text-white uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* MUSICLASS: MODAL DE CRIAÇÃO / REGISTRO DE AULA */}
      {isModalOpen && selectedAula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#fff8f6] border-8 border-black p-6 relative shadow-[12px_12px_0_#000] w-full max-w-md max-h-[90vh] overflow-y-auto font-['Space_Mono']">
            
            {/* Fechar botão */}
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-6">
              <span className="font-black bg-[#ff6b00] text-white text-[8px] px-2 py-1 uppercase tracking-widest border-2 border-black shadow-[2px_2px_0_#000]">
                MUSICLASS FEEDBACK
              </span>
              <h2 className="text-xl font-black text-black uppercase italic tracking-tighter mt-3">
                {selectedAula.nome || selectedAula.aluno_nome || 'REGISTRAR AULA'}
              </h2>
              <p className="text-[8px] font-black text-[#8e7164] uppercase tracking-wider">
                {selectedAula.curso_nome || 'CURSO REGULAR'} @ {selectedAula.horario?.substring(0, 5)}
              </p>
            </div>

            <form onSubmit={salvarDiarioAula} className="space-y-4">
              
              {/* Presença/Falta */}
              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-widest block mb-2">STATUS DA AULA</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatusAula('realizada')}
                    className={`py-3 px-4 border-4 border-black font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${
                      statusAula === 'realizada' 
                        ? 'bg-emerald-500 text-white shadow-[4px_4px_0_#000] -translate-y-[2px]' 
                        : 'bg-white text-black/50 hover:text-black'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> PRESENTE
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusAula('falta_aluno')}
                    className={`py-3 px-4 border-4 border-black font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${
                      statusAula === 'falta_aluno' 
                        ? 'bg-red-500 text-white shadow-[4px_4px_0_#000] -translate-y-[2px]' 
                        : 'bg-white text-black/50 hover:text-black'
                    }`}
                  >
                    <XCircle className="w-4 h-4" /> FALTA DO ALUNO
                  </button>
                </div>
              </div>

              {statusAula === 'realizada' && (
                <>
                  {/* Conteúdo Trabalhado */}
                  <div>
                    <label className="text-[10px] font-black text-black uppercase tracking-widest block mb-1">CONTEÚDO TRABALHADO</label>
                    <textarea
                      required
                      placeholder="O que o aluno aprendeu ou revisou nesta aula..."
                      rows={3}
                      className="w-full p-3 bg-white border-4 border-black text-xs font-black uppercase placeholder:text-black/20 focus:outline-none"
                      value={conteudo}
                      onChange={(e) => setConteudo(e.target.value)}
                    />
                  </div>

                  {/* Tarefa de Casa */}
                  <div>
                    <label className="text-[10px] font-black text-black uppercase tracking-widest block mb-1">DESAFIO / TAREFA DE CASA</label>
                    <textarea
                      required
                      placeholder="Exercícios, músicas ou escalas que o aluno deve treinar..."
                      rows={3}
                      className="w-full p-3 bg-white border-4 border-black text-xs font-black uppercase placeholder:text-black/20 focus:outline-none"
                      value={tarefaCasa}
                      onChange={(e) => setTarefaCasa(e.target.value)}
                    />
                  </div>

                  {/* Links e Mídias */}
                  <div>
                    <label className="text-[10px] font-black text-black uppercase tracking-widest block mb-2">MÍDIAS / LINKS DE APOIO</label>
                    
                    {/* Lista de Links Adicionados */}
                    <div className="space-y-2 mb-3">
                      {midias.map((mid, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-[#feccba]/40 border-2 border-black p-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-black uppercase text-black truncate">{mid.titulo}</p>
                            <p className="text-[7px] font-mono text-black/60 truncate">{mid.url}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveLink(idx)}
                            className="text-red-500 hover:text-red-700 shrink-0 ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Formulário de adicionar Link */}
                    <div className="border-2 border-black/10 p-3 bg-black/5 space-y-2">
                      <input
                        type="text"
                        placeholder="NOME DO LINK (EX: PARTITURA)"
                        className="w-full px-2 py-1.5 bg-white border-2 border-black text-[9px] font-black uppercase placeholder:text-black/20 focus:outline-none"
                        value={linkTitulo}
                        onChange={(e) => setLinkTitulo(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <input
                          type="url"
                          placeholder="URL (HTTPS://...)"
                          className="flex-1 px-2 py-1.5 bg-white border-2 border-black text-[9px] font-mono placeholder:text-black/20 focus:outline-none"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleAddLink}
                          className="bg-black text-white px-3 py-1.5 border-2 border-black font-black uppercase text-[9px] shadow-[2px_2px_0_#000] active:translate-y-[1px]"
                        >
                          ADD
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Concessão de XP */}
                  <div>
                    <label className="text-[10px] font-black text-black uppercase tracking-widest block mb-2">CONCEDER XP AO ALUNO</label>
                    <div className="flex justify-between gap-2">
                      {[50, 100, 150, 200].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setXpGanho(val)}
                          className={`flex-1 py-2 border-2 border-black font-black text-xs transition-all ${
                            xpGanho === val
                              ? 'bg-[#ff6b00] text-white shadow-[2px_2px_0_#000] -translate-y-[1px]'
                              : 'bg-white text-black/40 hover:border-black'
                          }`}
                        >
                          +{val} XP
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Botão de Envio */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#ff6b00] text-white py-4 border-4 border-black font-black uppercase shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" /> CONCLUIR E REGISTRAR AULA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
