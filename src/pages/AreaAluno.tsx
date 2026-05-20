import React, { useState, useEffect } from 'react';
import { Bell, Home, Trophy, BookOpen, Target, ChevronRight, Play, HelpCircle, LogOut, Camera, Upload, Sparkles, Volume2 } from 'lucide-react';
import { ChordVisualizer } from '../components/musiclass/ChordVisualizers';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AreaAluno() {
  const { user, logout } = useAuth();
  const [alunoData, setAlunoData] = useState<any>(null);
  const [aulasHoje, setAulasHoje] = useState<any[]>([]);
  const [aulasRealizadas, setAulasRealizadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dados dinâmicos do aluno
  const xp = alunoData?.xp || 0;
  const xpMax = 1000; // Exemplo de escala de nível
  const nivel = Math.floor(xp / 100) + 1;
  const cursoNome = alunoData?.curso_ativo || 'STUDENT';
  const classe = `${cursoNome.toUpperCase()}_TRAINEE`;
  const xpPct = Math.min(100, ((xp % 100) / 100) * 100);

  useEffect(() => {
    const token = localStorage.getItem('acorde_token');
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };

    const fetchAll = () => {
      const timestamp = Date.now();
      Promise.all([
        fetch(`/api/alunos/me?t=${timestamp}`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`/api/agenda?t=${timestamp}`, { headers }).then(r => r.ok ? r.json() : [])
      ]).then(([me, agenda]) => {
        if (me) {
          setAlunoData(me);
          const now = new Date();
          const allAulas = Array.isArray(agenda) ? agenda : [];
          
          const futureAulas = allAulas
            .filter((a: any) => {
              const aulaDate = new Date(`${a.data}T${a.horario || '00:00:00'}`);
              return aulaDate >= now && a.status !== 'realizada';
            })
            .sort((a: any, b: any) => new Date(`${a.data}T${a.horario}`).getTime() - new Date(`${b.data}T${b.horario}`).getTime());

          const pastAulas = allAulas
            .filter((a: any) => a.status === 'realizada')
            .sort((a: any, b: any) => new Date(`${b.data}T${b.horario}`).getTime() - new Date(`${a.data}T${a.horario}`).getTime());

          setAulasHoje(futureAulas);
          setAulasRealizadas(pastAulas);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    };

    fetchAll();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    const token = localStorage.getItem('acorde_token');
    try {
      const res = await fetch('/api/alunos/me/photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (res.ok) {
        const updated = await res.json();
        // Adicionar timestamp para forçar recarregamento da imagem
        const newPhotoUrl = `${updated.foto_url}?t=${new Date().getTime()}`;
        setAlunoData(prev => ({ ...prev, foto_url: newPhotoUrl }));
      }
    } catch (err) {
      console.error('Erro ao subir foto:', err);
    }
  };

  const missoes = [
    { id: 1, titulo: 'PRATICAR ESCALAS', descricao: '30 minutos de piano clássico', xp: 250, progresso: 60, tipo: 'play' },
    { id: 2, titulo: '8-BIT THEORY QUIZ', descricao: 'Acertar 10 questões de teoria', xp: 150, status: 'READY', tipo: 'quiz' },
  ];

  const menus = [
    { icon: Trophy, label: 'HALL DA FAMA', path: '/ranking' },
    { icon: BookOpen, label: 'MINHAS AULAS', path: '/agenda' },
    { icon: Target, label: 'MISSÕES', path: '#' },
    { icon: HelpCircle, label: 'GEAR SHOP', path: '#' },
  ];

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-[#1a0a05] text-[#ff6b00] font-black uppercase tracking-widest animate-pulse">
      CONECTANDO AO MUSIC_HUB...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#110804] flex items-center justify-center p-0 md:p-8 overflow-hidden font-['Space_Mono']">
      
      {/* MOBILE SIMULATOR WRAPPER */}
      <div className="w-full h-full md:h-[844px] md:max-w-[390px] md:border-[12px] md:border-black md:rounded-[60px] md:shadow-[0_0_0_8px_#3d2d26,0_20px_50px_rgba(0,0,0,0.5)] bg-[#1a0a05] relative overflow-hidden flex flex-col">
        
        {/* Notch simulation */}
        <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-50"></div>

        {/* TOP BAR — Stitch style */}
        <header className="flex items-center justify-between px-6 py-4 pt-10 md:pt-10 shrink-0 bg-[#feccba] border-b-8 border-black">
          <div className="flex items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => document.getElementById('photo-input')?.click()}>
              <div className="w-12 h-12 rounded-none border-4 border-black overflow-hidden bg-[#ff6b00] shadow-[4px_4px_0_#000]">
                {alunoData?.foto_url ? (
                  <img src={alunoData.foto_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-black text-xl">
                    {(alunoData?.nome || user?.nome || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                <Camera className="w-4 h-4 text-white" />
                <span className="text-[6px] text-white font-black mt-1">FOTO</span>
              </div>
              <input 
                id="photo-input" 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
              />
            </div>
            <h1 className="text-black font-black text-lg uppercase italic tracking-tighter">MUSIC_HUB <span className="text-[8px] text-[#ff6b00]">v1.0.2</span></h1>
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
          <div className="px-4 py-5 space-y-4">

            <div className="bg-[#fff8f6] border-8 border-black p-6 relative overflow-hidden shadow-[12px_12px_0_#000]">
              <p className="text-[#8e7164] text-[8px] font-black uppercase tracking-widest mb-2">&gt;&gt; BEM_VINDO_PLAYER_ONE • SYNC_{new Date().toLocaleTimeString()}</p>
              <h2 className="text-black font-black text-2xl uppercase italic leading-none mb-6 break-words">
                {alunoData?.nome || user?.nome || 'CARREGANDO...'}
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-[#feccba] border-4 border-black p-3 shadow-[4px_4px_0_#000]">
                   <p className="text-[7px] font-black text-[#8e7164] uppercase mb-1">INSTRUMENTO</p>
                    <span className="text-black font-black italic uppercase text-xs">
                      {alunoData?.curso_ativo || 'STUDENT'}
                    </span>
                 </div>
                 <div className="bg-[#feccba] border-4 border-black p-3 shadow-[4px_4px_0_#000]">
                   <p className="text-[7px] font-black text-[#8e7164] uppercase mb-1">RANKING</p>
                   <p className="text-[#ff6b00] font-black text-xl italic">#{String(alunoData?.ranking || 0).padStart(2, '0')}</p>
                 </div>
              </div>
            </div>

            {/* XP Bar Section */}
            <div className="p-5 bg-[#261812] border-8 border-black shadow-[8px_8px_0_#000]">
              <div className="flex justify-between items-center mb-3">
                <p className="text-white font-black text-[8px] uppercase tracking-widest">LVL {nivel} • {classe}</p>
                <span className="text-[#ff6b00] font-black text-[8px]">{xp} XP</span>
              </div>
              <div className="h-5 bg-[#1a0a05] border-4 border-black overflow-hidden p-1">
                 <div className="h-full bg-[#ff6b00] transition-all duration-1000 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" style={{ width: `${xpPct}%` }}></div>
              </div>
            </div>

            {/* Próxima Sessão */}
            {aulasHoje[0] ? (
              <div className="p-5 flex items-center gap-4 bg-[#ff6b00] border-8 border-black shadow-[10px_10px_0_#000]">
                <div className="w-14 h-14 bg-[#261812] border-4 border-black text-[#ff6b00] flex items-center justify-center shrink-0 shadow-[4px_4px_0_#000]">
                  <span className="font-black text-2xl">♪</span>
                </div>
                <div className="flex-1">
                  <p className="text-white/80 font-black text-[8px] uppercase tracking-widest mb-1">&gt;&gt; PRÓXIMA_AULA</p>
                  <p className="text-white font-black text-lg uppercase italic leading-none mb-1">
                    {new Date(aulasHoje[0].data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} @ {aulasHoje[0].horario?.substring(0,5)}
                  </p>
                </div>
                <button className="bg-white border-4 border-black p-2 shadow-[4px_4px_0_#000] shrink-0">
                  <ChevronRight className="w-6 h-6 text-black" />
                </button>
              </div>
            ) : (
              <div className="p-6 text-center bg-[#261812] border-8 border-black shadow-[8px_8px_0_#000]">
                <p className="text-[#8e7164] font-black text-[10px] uppercase italic">&gt;&gt; NENHUMA_AULA_AGENDADA</p>
              </div>
            )}

            {/* Diário de Evolução (Musiclass feedbacks) */}
            <div className="pt-2">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-white font-black text-xs uppercase tracking-widest">DIÁRIO_DE_EVOLUÇÃO</h3>
                <div className="flex-1 border-t-2 border-dashed border-[#3d2d26]"></div>
              </div>
              
              <div className="space-y-4">
                {aulasRealizadas.map((aula: any) => {
                  let midiasList: any[] = [];
                  try {
                    if (typeof aula.midias === 'string') {
                      midiasList = JSON.parse(aula.midias);
                    } else if (Array.isArray(aula.midias)) {
                      midiasList = aula.midias;
                    }
                  } catch {}

                  let isRich = false;
                  let richData: any = null;
                  try {
                    if (aula.conteudo && (aula.conteudo.startsWith('{') || aula.conteudo.startsWith('['))) {
                      const parsed = JSON.parse(aula.conteudo);
                      if (parsed && parsed.isRich) {
                        isRich = true;
                        richData = parsed;
                      }
                    }
                  } catch {}

                  const currentInstrument = alunoData?.curso_ativo || aula.curso_nome || 'Piano';

                  return (
                    <div key={aula.id} className="bg-[#fff8f6] border-4 border-black p-4 shadow-[4px_4px_0_#000] space-y-3 font-['Space_Mono']">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[#ff6b00] font-black text-[9px] uppercase tracking-wider">
                            {format(new Date(aula.data + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR }).toUpperCase()}
                          </p>
                          <h4 className="text-black font-black text-sm uppercase italic">
                            AULA DE {aula.curso_nome || 'MÚSICA'}
                          </h4>
                        </div>
                        <span className="bg-[#ffd700] text-black border-2 border-black font-black text-[8px] px-2 py-0.5 shadow-[2px_2px_0_#000]">
                          +{aula.xp_ganho || 50} XP ⚡
                        </span>
                      </div>

                      {!isRich ? (
                        <>
                          {/* Conteúdo Trabalhado */}
                          <div className="bg-[#feccba]/20 border-2 border-black/10 p-2.5">
                            <span className="text-[8px] font-black text-[#8e7164] uppercase block mb-1">CONTEÚDO TRABALHADO:</span>
                            <p className="text-black text-[10px] font-bold uppercase">{aula.conteudo || 'Nenhum conteúdo registrado'}</p>
                          </div>

                          {/* Tarefa de casa / Desafio */}
                          <div className="bg-black/5 border-2 border-black/10 p-2.5">
                            <span className="text-[8px] font-black text-[#ff6b00] uppercase block mb-1 flex items-center gap-1">
                              ⚔️ BOSS QUEST / DESAFIO:
                            </span>
                            <p className="text-black text-[10px] font-bold uppercase italic">{aula.tarefa_casa || 'Treinar repertório livre'}</p>
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3">
                          {/* FICHA PEDAGÓGICA MUSICLASS */}
                          <div className="bg-[#feccba]/20 border-2 border-black/20 p-2.5 relative overflow-hidden">
                            <div className="absolute top-1 right-2 flex items-center gap-1">
                              <span className="bg-black text-[#ff6b00] text-[6px] font-black px-1 border border-black uppercase">
                                💡 MUSICLASS ROTEIRO
                              </span>
                            </div>
                            <span className="text-[8px] font-black text-[#8e7164] uppercase block mb-1">CONTEÚDO TRABALHADO:</span>
                            <p className="text-black text-[10px] font-bold uppercase whitespace-pre-line">{richData.conteudoText || 'AULA INTERATIVA DE MÚSICA'}</p>
                          </div>

                          {/* TAREFA DE CASA / DESAFIO */}
                          {richData.tarefaCasaText && (
                            <div className="bg-black/5 border-2 border-black/20 p-2.5">
                              <span className="text-[8px] font-black text-[#ff6b00] uppercase block mb-1">
                                ⚔️ TAREFA DE CASA / DESAFIO DA SEMANA:
                              </span>
                              <p className="text-black text-[10px] font-bold uppercase italic whitespace-pre-line">{richData.tarefaCasaText}</p>
                            </div>
                          )}

                          {/* ACORDES RENDERIZADOS */}
                          {Array.isArray(richData.chords) && richData.chords.length > 0 && (
                            <div className="bg-white border-2 border-black p-2">
                              <span className="text-[7px] font-black text-[#8e7164] uppercase block mb-2 tracking-widest">
                                🎸 ACORDES PRÁTICOS SUGERIDOS ({richData.chords.length}):
                              </span>
                              <div className="flex gap-2 overflow-x-auto py-1 scrollbar-thin">
                                {richData.chords.map((ch: any, idx: number) => (
                                  <div key={idx} className="shrink-0 scale-95 origin-top-left">
                                    <ChordVisualizer
                                      instrument={currentInstrument}
                                      chordNotes={ch.notes}
                                      root={ch.root}
                                      type={ch.typeId}
                                      ext={ch.extId}
                                      bass={ch.bass}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ESCALAS RENDERIZADAS */}
                          {Array.isArray(richData.scales) && richData.scales.length > 0 && (
                            <div className="bg-white border-2 border-black p-2 space-y-1.5">
                              <span className="text-[7px] font-black text-[#ff6b00] uppercase block tracking-widest">
                                🎼 CAMPOS HARMÔNICOS &amp; ESCALAS DE ESTUDO:
                              </span>
                              {richData.scales.map((sc: any, idx: number) => (
                                <div key={idx} className="bg-[#261812] text-[#feccba] border border-black p-1.5">
                                  <p className="text-[8px] font-black uppercase tracking-wider">{sc.root} {sc.scaleName}</p>
                                  <p className="text-[7px] font-mono uppercase tracking-tighter mt-0.5 text-white/80">{sc.notes.join(' - ')}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* QUESTS INDIVIDUAIS DO ALUNO */}
                          {Array.isArray(richData.exercises) && richData.exercises.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[7px] font-black text-black uppercase block tracking-widest">
                                🏆 MISSÕES DE TREINO ADICIONAIS:
                              </span>
                              {richData.exercises.map((ex: any, idx: number) => (
                                <div key={idx} className="bg-emerald-50 text-black border-2 border-emerald-500 p-2 relative overflow-hidden">
                                  <span className="absolute right-2 top-2 bg-emerald-500 text-white font-black text-[6px] px-1">
                                    +{ex.points} XP
                                  </span>
                                  <p className="text-[9px] font-black uppercase text-emerald-800">⚔️ {ex.title}</p>
                                  <p className="text-[7px] font-black text-stone-600 uppercase mt-0.5">{ex.description}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* GRAVAÇÕES DE ÁUDIO DO ESTÚDIO */}
                          {Array.isArray(richData.recordings) && richData.recordings.length > 0 && (
                            <div className="bg-[#261812] text-white p-2 border-2 border-black space-y-2">
                              <span className="text-[7px] font-black text-[#ff6b00] uppercase block tracking-widest flex items-center gap-1">
                                🎙️ GUIAS DE ÁUDIO DO PROFESSOR:
                              </span>
                              {richData.recordings.map((rec: any, idx: number) => (
                                <div key={idx} className="bg-black/30 border border-white/10 p-1.5">
                                  <p className="text-[7px] font-black uppercase truncate text-white">{rec.name}</p>
                                  <audio src={rec.url} controls className="h-6 w-full mt-1 border border-white/20" />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Links e mídias de apoio */}
                      {midiasList.length > 0 && (
                        <div>
                          <span className="text-[8px] font-black text-black/50 uppercase block mb-1 font-mono">LINKS &amp; ANEXOS DE APOIO:</span>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {midiasList.map((mid, mIdx) => (
                              <a
                                key={mIdx}
                                href={mid.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 bg-white border-2 border-black text-[8px] font-black uppercase shadow-[2px_2px_0_#000] hover:translate-y-[1px] hover:shadow-none transition-all"
                              >
                                🔗 {mid.titulo}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {aulasRealizadas.length === 0 && (
                  <div className="p-6 text-center bg-[#261812]/50 border-4 border-dashed border-[#3d2d26]">
                    <p className="text-[#8e7164] font-black text-[8px] uppercase tracking-tighter">
                      NENHUM REGISTRO DE AULA CONCLUÍDO AINDA.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Conquistas (Badges) */}
            <div className="pt-2">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-white font-black text-xs uppercase tracking-widest">CONQUISTAS_PLAYER</h3>
                <div className="flex-1 border-t-2 border-dashed border-[#3d2d26]"></div>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {alunoData?.conquistas?.map((c: any, i: number) => (
                  <div key={i} className="flex-shrink-0 w-16 h-16 bg-[#261812] border-4 border-black relative group shadow-[4px_4px_0_#000]">
                    {c.icone_url ? (
                      <img src={c.icone_url} alt={c.nome} className="w-full h-full object-contain p-1" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#ff6b00]">
                         <Trophy className="w-6 h-6" />
                      </div>
                    )}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#ff6b00] border-2 border-black rounded-full"></div>
                  </div>
                ))}
                {(!alunoData?.conquistas || alunoData.conquistas.length === 0) && (
                  <div className="flex-1 text-center py-4 bg-[#261812]/50 border-4 border-dashed border-[#3d2d26]">
                    <p className="text-[#8e7164] font-black text-[8px] uppercase tracking-tighter">Nenhuma conquista desbloqueada</p>
                  </div>
                )}
              </div>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-2 gap-3">
              {menus.map((item, i) => (
                <div key={i} className="bg-[#fff8f6] border-4 border-black p-4 text-center shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer">
                  <div className="w-10 h-10 bg-[#feccba] border-2 border-black flex items-center justify-center mx-auto mb-2">
                    <item.icon className="w-5 h-5 text-[#ff6b00]" />
                  </div>
                  <p className="text-black font-black text-[8px] uppercase tracking-widest">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Missões Ativas */}
            <div className="pt-2">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-white font-black text-xs uppercase tracking-widest">MISSÕES_ATIVAS</h3>
                <div className="flex-1 border-t-2 border-dashed border-[#3d2d26]"></div>
              </div>
              <div className="space-y-3">
                {missoes.map(missao => (
                  <div key={missao.id} className="p-4 flex items-center gap-4 bg-[#261812] border-4 border-black">
                    <div className="w-10 h-10 bg-[#3d2d26] border-2 border-black flex items-center justify-center shrink-0">
                      {missao.tipo === 'play' ? <Play className="w-4 h-4 text-[#ff6b00]" /> : <HelpCircle className="w-4 h-4 text-[#8e7164]" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-black text-[10px] uppercase">{missao.titulo}</p>
                      <div className="w-full h-1 bg-black mt-1">
                         <div className="h-full bg-[#ff6b00]" style={{ width: `${missao.progresso || 0}%` }}></div>
                      </div>
                    </div>
                    <span className="text-[#ff6b00] font-black text-[9px] bg-black border border-black px-1">+{missao.xp}XP</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM NAV — Mobile */}
        <nav className="absolute bottom-0 left-0 right-0 h-20 bg-[#261812] border-t-8 border-black flex items-center justify-around px-2 z-40">
          {[
            { icon: Home, label: 'HOME', active: true },
            { icon: Trophy, label: 'RANK' },
            { icon: BookOpen, label: 'AULAS' },
            { icon: Target, label: 'QUESTS' },
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
    </div>
  );
}
