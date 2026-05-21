import React, { useState, useEffect } from 'react';
import { Bell, Home, Trophy, BookOpen, Target, ChevronRight, Play, HelpCircle, LogOut, Camera, Upload, Sparkles, Volume2, User, FileText, Printer } from 'lucide-react';
import { ChordVisualizer } from '../components/musiclass/ChordVisualizers';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// Tradução de notas científicas para cifras em português brasileiro
const translateNote = (note: string): string => {
  const map: Record<string, string> = {
    'C': 'Dó', 'C#': 'Dó#', 'Db': 'Réb',
    'D': 'Ré', 'D#': 'Ré#', 'Eb': 'Mib',
    'E': 'Mi',
    'F': 'Fá', 'F#': 'Fá#', 'Gb': 'Solb',
    'G': 'Sol', 'G#': 'Sol#', 'Ab': 'Láb',
    'A': 'Lá', 'A#': 'Lá#', 'Bb': 'Sib',
    'B': 'Si'
  };
  const baseNote = note.replace(/\d+$/, '');
  return map[baseNote] || baseNote;
};

// Subcomponente de visualização inteligente de acordes
function LessonChords({ chords, currentInstrument }: { chords: any[], currentInstrument: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  if (!chords || chords.length === 0) return null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? chords.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === chords.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="bg-white border-4 border-black p-3 shadow-[4px_4px_0_#000] font-['Space_Mono'] select-none">
      <div className="flex justify-between items-center mb-3 pb-2 border-b-2 border-dashed border-[#e2bfb0]">
        <span className="text-[9px] font-black text-black uppercase tracking-wider flex items-center gap-1">
          🎸 ACORDES SUGERIDOS ({chords.length})
        </span>
        <button 
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} 
          className="bg-black text-[#feccba] border-2 border-black font-black text-[8px] px-2 py-1 uppercase hover:bg-[#ff6b00] hover:text-white transition-colors"
        >
          {expanded ? '▲ CARROSSEL' : '🔍 VER TODOS'}
        </button>
      </div>

      {expanded ? (
        <div className="flex flex-col gap-6 items-center py-2 max-h-[380px] overflow-y-auto scrollbar-thin">
          {chords.map((ch, idx) => {
            const isTeclado = ch.instrument?.toLowerCase().includes('teclado') || ch.instrument?.toLowerCase().includes('piano');
            return (
              <div key={idx} className="w-full flex flex-col items-center border-2 border-dashed border-[#e2bfb0] p-2 bg-[#fff8f6]">
                <span className="text-[8px] font-black text-[#8e7164] uppercase mb-2">
                  ACORDE {idx + 1} DE {chords.length} • {ch.root}{ch.typeId || ''}
                </span>
                <div className={`overflow-x-auto w-full flex justify-center ${isTeclado ? 'max-w-full' : 'max-w-[180px]'}`}>
                  <ChordVisualizer
                    instrument={ch.instrument || currentInstrument}
                    chordNotes={ch.notes || []}
                    root={ch.root}
                    type={ch.typeId}
                    ext={ch.extId}
                    bass={ch.bass}
                    notesWithIndices={ch.notesWithIndices}
                    isCustom={ch.isCustom}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center relative py-1">
          <div className="w-full flex items-center justify-between gap-2">
            <button 
              onClick={handlePrev} 
              className="bg-[#feccba] border-2 border-black font-black text-xs px-2 py-1 shrink-0 hover:bg-[#ff6b00] hover:text-white transition-all shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none"
            >
              ◀
            </button>
            <div className="flex-1 flex flex-col items-center min-w-0">
              <span className="text-[8px] font-black text-[#8e7164] uppercase mb-1">
                ACORDE {currentIndex + 1} DE {chords.length} • {chords[currentIndex].root}{chords[currentIndex].typeId || ''}
              </span>
              <div className="flex justify-center w-full overflow-hidden">
                <ChordVisualizer
                  instrument={chords[currentIndex].instrument || currentInstrument}
                  chordNotes={chords[currentIndex].notes || []}
                  root={chords[currentIndex].root}
                  type={chords[currentIndex].typeId}
                  ext={chords[currentIndex].extId}
                  bass={chords[currentIndex].bass}
                  notesWithIndices={chords[currentIndex].notesWithIndices}
                  isCustom={chords[currentIndex].isCustom}
                />
              </div>
            </div>
            <button 
              onClick={handleNext} 
              className="bg-[#feccba] border-2 border-black font-black text-xs px-2 py-1 shrink-0 hover:bg-[#ff6b00] hover:text-white transition-all shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none"
            >
              ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal de visualização de diário pedagógico / Impressão PDF
function PrintModal({ aula, alunoNome, onClose }: { aula: any, alunoNome: string, onClose: () => void }) {
  let richData: any = null;
  try {
    if (aula.conteudo && (aula.conteudo.startsWith('{') || aula.conteudo.startsWith('['))) {
      richData = JSON.parse(aula.conteudo);
    }
  } catch {}

  const handlePrint = () => {
    window.print();
  };

  // Instrumento sugerido
  const isTeclado = /teclado|piano|keyboard/i.test(aula.curso_nome || '');
  const currentInstrument = isTeclado ? 'Teclado' : 'Piano';

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 overflow-y-auto font-['Space_Mono']">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      
      <div className="bg-[#fff8f6] border-8 border-black p-6 w-full max-w-2xl relative shadow-[12px_12px_0_#000] no-print max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 bg-black text-[#feccba] border-4 border-black font-black text-xs px-3 py-1 shadow-[4px_4px_0_#000] hover:bg-red-500 hover:text-white transition-all active:translate-y-1 active:shadow-none"
        >
          X
        </button>

        <h3 className="text-black font-black text-sm uppercase italic tracking-widest mb-6">
          📄 VISUALIZAR DIÁRIO PEDAGÓGICO
        </h3>

        {/* ÁREA DE IMPRESSÃO */}
        <div id="print-section" className="bg-white border-4 border-black p-8 text-black space-y-6">
          {/* Header Pedagógico */}
          <div className="border-b-4 border-black pb-4 flex justify-between items-start">
            <div>
              <h1 className="font-black text-2xl uppercase tracking-tighter">STUDIO MASTER</h1>
              <p className="text-[9px] font-bold uppercase tracking-wider text-black/60">DIÁRIO DE EVOLUÇÃO PEDAGÓGICA</p>
            </div>
            <div className="text-right">
              <p className="font-black text-sm uppercase italic">AULA DE {aula.curso_nome || 'MÚSICA'}</p>
              <p className="text-[10px] font-black">{format(new Date(aula.data + 'T12:00:00'), 'dd/MM/yyyy')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-b-2 border-black pb-4 text-xs font-bold uppercase">
            <div>
              <p className="text-[8px] text-black/60">ALUNO(A):</p>
              <p className="text-sm font-black">{alunoNome}</p>
            </div>
            <div>
              <p className="text-[8px] text-black/60">PROFESSOR(A):</p>
              <p className="text-sm font-black">{aula.professor_nome}</p>
            </div>
          </div>

          {/* Conteúdo Trabalhado */}
          <div className="space-y-2">
            <h4 className="font-black text-sm border-l-4 border-black pl-2 uppercase tracking-wide">CONTEÚDO TRABALHADO:</h4>
            <p className="text-xs text-black/80 leading-relaxed whitespace-pre-line uppercase font-bold pl-3">
              {richData?.isRich ? richData.conteudoText : (aula.conteudo || 'Nenhum conteúdo detalhado')}
            </p>
          </div>

          {/* Boss Quest / Tarefa */}
          <div className="space-y-2">
            <h4 className="font-black text-sm border-l-4 border-[#ff6b00] pl-2 uppercase tracking-wide text-[#ff6b00]">⚔️ BOSS QUEST / TAREFA DE CASA:</h4>
            <p className="text-xs text-black/80 leading-relaxed whitespace-pre-line italic font-bold pl-3">
              {richData?.isRich ? richData.tarefaCasaText : (aula.tarefa_casa || 'Treinar livre')}
            </p>
          </div>

          {/* Acordes */}
          {richData?.isRich && Array.isArray(richData.chords) && richData.chords.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="font-black text-sm border-l-4 border-black pl-2 uppercase tracking-wide">🎸 ACORDES PRÁTICOS RECOMENDADOS:</h4>
              <div className="grid grid-cols-2 gap-4 justify-items-center">
                {richData.chords.map((ch: any, idx: number) => {
                  const isChTeclado = ch.instrument?.toLowerCase().includes('teclado') || ch.instrument?.toLowerCase().includes('piano');
                  return (
                    <div key={idx} className="flex flex-col items-center p-2 border border-black/20 bg-black/5 w-full max-w-[240px]">
                      <span className="text-[8px] font-black text-black/60 uppercase mb-1">{ch.root}{ch.typeId || ''}</span>
                      <ChordVisualizer
                        instrument={ch.instrument || currentInstrument}
                        chordNotes={ch.notes || []}
                        root={ch.root}
                        type={ch.typeId}
                        ext={ch.extId}
                        bass={ch.bass}
                        notesWithIndices={ch.notesWithIndices}
                        isCustom={ch.isCustom}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Escalas */}
          {richData?.isRich && Array.isArray(richData.scales) && richData.scales.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="font-black text-sm border-l-4 border-black pl-2 uppercase tracking-wide">🎼 ESCALAS &amp; CAMPOS HARMÔNICOS:</h4>
              <div className="grid grid-cols-2 gap-2 pl-3">
                {richData.scales.map((sc: any, idx: number) => (
                  <div key={idx} className="bg-black/5 border border-black p-2">
                    <p className="text-[10px] font-black uppercase">{sc.root} {sc.scaleName}</p>
                    <p className="text-[9px] font-mono tracking-tighter text-black/70 uppercase mt-0.5">{sc.notes.join(' - ')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assinatura Pedagógica */}
          <div className="pt-12 flex justify-between items-end text-center text-[9px] font-black border-t border-black/10">
            <div className="w-[180px] border-t-2 border-black pt-2">
              <p>{aula.professor_nome}</p>
              <p className="text-[7px] text-black/60">PROFESSOR(A)</p>
            </div>
            <div className="w-[180px] border-t-2 border-black pt-2">
              <p>{alunoNome}</p>
              <p className="text-[7px] text-black/60">ALUNO(A)</p>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-4 mt-6">
          <button 
            onClick={handlePrint}
            className="flex-1 bg-[#ff6b00] text-white border-4 border-black font-black text-xs py-3 shadow-[4px_4px_0_#000] hover:translate-y-1 hover:shadow-none transition-all"
          >
            🖨️ IMPRIMIR / PDF
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-black text-[#feccba] border-4 border-black font-black text-xs py-3 shadow-[4px_4px_0_#000] hover:translate-y-1 hover:shadow-none transition-all"
          >
            FECHAR
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AreaAluno() {
  const { user, logout } = useAuth();
  const [alunoData, setAlunoData] = useState<any>(null);
  const [aulasHoje, setAulasHoje] = useState<any[]>([]);
  const [aulasRealizadas, setAulasRealizadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'ranking' | 'aulas' | 'perfil'>('home');
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [printAula, setPrintAula] = useState<any | null>(null);

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

  const fetchRanking = async () => {
    const token = localStorage.getItem('acorde_token');
    const res = await fetch('/api/gamificacao/ranking', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { const data = await res.json(); setRankingData(data); }
  };

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
        toast.success('Foto de perfil atualizada com sucesso!');

        if (updated.xpBonusAdded) {
          toast.success('BÔNUS DESBLOQUEADO: +150 XP pela sua primeira foto de perfil! 📸🔥', {
            duration: 6000
          });
          // Recarregar os dados do aluno para atualizar o XP na tela
          const timestamp = Date.now();
          fetch(`/api/alunos/me?t=${timestamp}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .then(me => { if (me) setAlunoData(me); });
        }
      } else {
        toast.error('Erro ao fazer upload da foto.');
      }
    } catch (err) {
      console.error('Erro ao subir foto:', err);
      toast.error('Erro ao fazer upload da foto.');
    }
  };

  const missoes = [
    { id: 1, titulo: 'PRATICAR ESCALAS', descricao: '30 minutos de piano clássico', xp: 250, progresso: 60, tipo: 'play' },
    { id: 2, titulo: '8-BIT THEORY QUIZ', descricao: 'Acertar 10 questões de teoria', xp: 150, status: 'READY', tipo: 'quiz' },
  ];

  const menus = [
    { icon: Trophy, label: 'HALL DA FAMA', path: '/ranking' },
    { icon: BookOpen, label: 'MINHAS AULAS', path: '/agenda' },
    { icon: User, label: 'PERFIL JOGADOR', path: '/perfil' },
    { icon: Target, label: 'MISSÕES', path: '#' },
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

          {/* ===== ABA: RANKING ===== */}
          {activeTab === 'ranking' && (
            <div className="px-4 py-5 space-y-3">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#ff6b00] border-4 border-black px-3 py-1 shadow-[4px_4px_0_#000]">
                  <h3 className="text-white font-black text-xs uppercase tracking-widest">🏆 HALL DA FAMA</h3>
                </div>
                <div className="flex-1 border-t-2 border-dashed border-[#3d2d26]"></div>
              </div>
              {rankingData.length === 0 && (
                <div className="text-center py-8 text-[#8e7164] font-black text-[9px] uppercase">Carregando ranking...</div>
              )}
              {rankingData.map((player: any, idx: number) => {
                const isMe = player.id === alunoData?.id;
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                return (
                  <div key={player.id} className={`flex items-center gap-3 p-3 border-4 border-black shadow-[4px_4px_0_#000] ${isMe ? 'bg-[#ff6b00]' : 'bg-[#fff8f6]'}`}>
                    <div className={`w-10 h-10 border-4 border-black flex items-center justify-center font-black text-sm shrink-0 ${isMe ? 'bg-white text-[#ff6b00]' : 'bg-[#feccba] text-black'}`}>
                      {medal}
                    </div>
                    <div className="w-10 h-10 border-2 border-black overflow-hidden bg-[#261812] shrink-0">
                      {player.foto_url ? (
                        <img src={player.foto_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center font-black text-base ${isMe ? 'text-white' : 'text-[#ff6b00]'}`}>
                          {(player.nome || 'A').charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-black text-[10px] uppercase truncate ${isMe ? 'text-white' : 'text-black'}`}>{player.nome}</p>
                      <p className={`text-[7px] font-black uppercase ${isMe ? 'text-white/80' : 'text-[#8e7164]'}`}>{player.curso || 'STUDENT'}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-black text-sm italic ${isMe ? 'text-white' : 'text-[#ff6b00]'}`}>{player.xp} XP</p>
                      {player.conquistas?.length > 0 && (
                        <p className={`text-[6px] font-black ${isMe ? 'text-white/70' : 'text-[#8e7164]'}`}>{player.conquistas.length} conquistas</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ===== ABA: TODAS AS AULAS ===== */}
          {activeTab === 'aulas' && (
            <div className="px-4 py-5 space-y-3">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#261812] border-4 border-black px-3 py-1 shadow-[4px_4px_0_#000]">
                  <h3 className="text-[#feccba] font-black text-xs uppercase tracking-widest">📚 MINHAS AULAS</h3>
                </div>
                <div className="flex-1 border-t-2 border-dashed border-[#3d2d26]"></div>
              </div>
              {[...aulasRealizadas].concat(aulasHoje).sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()).map((aula: any) => (
                <div key={aula.id} className={`flex items-center gap-3 p-3 border-4 border-black shadow-[4px_4px_0_#000] ${aula.status === 'realizada' ? 'bg-[#fff8f6]' : aula.status === 'falta_aluno' ? 'bg-red-50' : 'bg-[#261812]'}`}>
                  <div className={`w-10 h-10 border-4 border-black flex flex-col items-center justify-center font-black shrink-0 ${aula.status === 'realizada' ? 'bg-[#ff6b00] text-white' : aula.status === 'falta_aluno' ? 'bg-red-500 text-white' : 'bg-[#feccba] text-black'}`}>
                    <span className="text-[10px] leading-none">{new Date(aula.data + 'T12:00:00').getDate().toString().padStart(2,'0')}</span>
                    <span className="text-[7px] leading-none uppercase">{new Date(aula.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-black text-[10px] uppercase ${aula.status !== 'pendente' ? 'text-black' : 'text-[#feccba]'}`}>{aula.curso_nome || 'AULA DE MÚSICA'}</p>
                    <p className={`text-[7px] font-black uppercase ${aula.status !== 'pendente' ? 'text-[#8e7164]' : 'text-[#feccba]/70'}`}>{aula.horario?.substring(0,5)} • {aula.professor_nome || 'PROFESSOR'}</p>
                  </div>
                  <span className={`text-[7px] font-black uppercase px-2 py-0.5 border-2 border-black ${aula.status === 'realizada' ? 'bg-[#ff6b00] text-white' : aula.status === 'falta_aluno' ? 'bg-red-500 text-white' : 'bg-[#ffd700] text-black'}`}>
                    {aula.status === 'realizada' ? 'FEITA' : aula.status === 'falta_aluno' ? 'FALTA' : 'AGENDADA'}
                  </span>
                </div>
              ))}
              {aulasRealizadas.length === 0 && aulasHoje.length === 0 && (
                <div className="text-center py-8 text-[#8e7164] font-black text-[9px] uppercase">Nenhuma aula registrada</div>
              )}
            </div>
          )}

          {/* ===== ABA: HOME (conteúdo existente) ===== */}
          {activeTab === 'home' && (
          <div className="px-4 py-5 space-y-4">

            <div className="bg-[#fff8f6] border-8 border-black p-6 relative overflow-hidden shadow-[12px_12px_0_#000] flex flex-col gap-4">
              <p className="text-[#8e7164] text-[8px] font-black uppercase tracking-widest">&gt;&gt; BEM_VINDO_PLAYER_ONE • SYNC_{new Date().toLocaleTimeString()}</p>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-none border-4 border-black bg-[#ff6b00] shrink-0 shadow-[4px_4px_0_#000] overflow-hidden">
                  {alunoData?.foto_url ? (
                    <img src={alunoData.foto_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-black text-2xl uppercase">
                      {(alunoData?.nome || user?.nome || 'A').charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-black font-black text-xl uppercase italic leading-tight break-words">
                    {alunoData?.nome || user?.nome || 'CARREGANDO...'}
                  </h2>
                  <span className="text-[7px] font-black text-white bg-black px-1.5 py-0.5 border border-black uppercase tracking-widest inline-block mt-1">
                    LVL {nivel} • {classe}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mt-1">
                 <div className="bg-[#feccba] border-4 border-black p-2.5 shadow-[4px_4px_0_#000] flex flex-col justify-center">
                   <p className="text-[7px] font-black text-[#8e7164] uppercase mb-0.5">INSTRUMENTO</p>
                    <span className="text-black font-black italic uppercase text-[10px] truncate">
                      {alunoData?.curso_ativo || 'STUDENT'}
                    </span>
                 </div>
                 <div className="bg-[#feccba] border-4 border-black p-2.5 shadow-[4px_4px_0_#000] flex flex-col justify-center">
                   <p className="text-[7px] font-black text-[#8e7164] uppercase mb-0.5">RANKING</p>
                   <p className="text-[#ff6b00] font-black text-lg italic">#{String(alunoData?.ranking || 0).padStart(2, '0')}</p>
                 </div>
              </div>

              {aulasRealizadas[0] && (
                <button 
                  onClick={() => setPrintAula(aulasRealizadas[0])}
                  className="w-full bg-[#ff6b00] text-white border-4 border-black font-black text-[10px] py-2 uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none hover:bg-black transition-all flex items-center justify-center gap-2"
                >
                  📄 IMPRIMIR ÚLTIMO DIÁRIO (PDF)
                </button>
              )}
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

                  // Detecta o instrumento pelo curso do aluno para renderizar o diagrama correto
                  const cursoNomeAula = alunoData?.matriculas?.[0]?.cursos?.nome || alunoData?.curso_ativo || aula.cursos?.nome || aula.curso_nome || '';
                  const isCursoTeclado = /teclado|piano|keyboard/i.test(cursoNomeAula);
                  const currentInstrument = isCursoTeclado ? 'Teclado' : (cursoNomeAula || 'Piano');

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
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="bg-[#ffd700] text-black border-2 border-black font-black text-[8px] px-2 py-0.5 shadow-[2px_2px_0_#000]">
                            +{aula.xp_ganho || 50} XP ⚡
                          </span>
                          <button 
                            onClick={() => setPrintAula(aula)}
                            className="bg-black text-[#feccba] border-2 border-black font-black text-[7px] px-2 py-0.5 shadow-[2px_2px_0_#000] active:translate-y-[1px] active:shadow-none hover:bg-[#ff6b00] hover:text-white transition-colors"
                          >
                            📄 DIÁRIO (PDF)
                          </button>
                        </div>
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
                            <LessonChords chords={richData.chords} currentInstrument={currentInstrument} />
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

                          {/* BOSS QUEST / QUESTS DO PROFESSOR */}
                          {Array.isArray(richData.exercises) && richData.exercises.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="bg-[#ff6b00] border-2 border-black px-2 py-0.5 shadow-[2px_2px_0_#000]">
                                  <span className="text-[8px] font-black text-white uppercase tracking-widest">⚔️ BOSS QUEST — MISSÃO DO PROFESSOR</span>
                                </div>
                                <div className="flex-1 border-t-2 border-dashed border-[#ff6b00]/40"></div>
                              </div>
                              {richData.exercises.map((ex: any, idx: number) => (
                                <div key={idx} className="bg-[#261812] border-4 border-[#ff6b00] p-3 relative overflow-hidden shadow-[4px_4px_0_#ff6b00]">
                                  {/* Badge de XP */}
                                  <div className="absolute top-2 right-2 bg-[#ffd700] border-2 border-black px-1.5 py-0.5 shadow-[2px_2px_0_#000]">
                                    <span className="text-[7px] font-black text-black uppercase">+{ex.points} XP ⚡</span>
                                  </div>
                                  {/* Ícone + Título */}
                                  <div className="flex items-center gap-2 pr-12">
                                    <span className="text-[#ff6b00] text-base leading-none">⚔️</span>
                                    <p className="text-[10px] font-black uppercase text-[#feccba] leading-tight">{ex.title}</p>
                                  </div>
                                  {ex.description && (
                                    <p className="text-[7px] font-black text-[#ff6b00]/70 uppercase mt-1.5 leading-snug">{ex.description}</p>
                                  )}
                                  {/* Barra de progresso decorativa */}
                                  <div className="mt-2 bg-black/50 border border-[#ff6b00]/30 h-1">
                                    <div className="h-full bg-[#ff6b00] w-1/2 animate-pulse"></div>
                                  </div>
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

                          {/* TABLATURAS RENDERIZADAS */}
                          {Array.isArray(richData.tablatures) && richData.tablatures.length > 0 && (
                            <div className="bg-white border-2 border-black p-2 space-y-3">
                              <span className="text-[7px] font-black text-[#8e7164] uppercase block tracking-widest">
                                📝 TABLATURAS RECOMENDADAS ({richData.tablatures.length}):
                              </span>
                              {richData.tablatures.map((tab: any, idx: number) => (
                                <div key={idx} className="bg-[#feccba]/20 border-2 border-black p-2">
                                  <p className="text-[8px] font-black uppercase mb-1">{tab.name}</p>
                                  <div className="overflow-x-auto scrollbar-thin">
                                    <div className="grid gap-px" style={{ gridTemplateColumns: 'auto repeat(16, 1fr)', minWidth: '340px' }}>
                                      {['e','B','G','D','A','E'].map((str, strIdx) => (
                                        <React.Fragment key={strIdx}>
                                          <div className="flex items-center justify-center bg-[#261812] text-[#ff6b00] font-black text-[7px] border border-black px-0.5 min-w-[14px]">{str}</div>
                                          {Array.from({ length: 16 }).map((_, beat) => (
                                            <div key={beat} className="h-5 flex items-center justify-center bg-white border border-black/20 text-[8px] font-black">
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
                          )}

                          {/* BATERIAS RENDERIZADAS */}
                          {Array.isArray(richData.drums) && richData.drums.length > 0 && (
                            <div className="bg-white border-2 border-black p-2 space-y-3">
                              <span className="text-[7px] font-black text-[#8e7164] uppercase block tracking-widest">
                                🥁 SEQUÊNCIAS DE BATERIA ({richData.drums.length}):
                              </span>
                              {richData.drums.map((drum: any, idx: number) => (
                                <div key={idx} className="bg-[#feccba]/20 border-2 border-black p-2">
                                  <p className="text-[8px] font-black uppercase mb-1">{drum.name} {drum.bpm ? `• ${drum.bpm} BPM` : ''}</p>
                                  <div className="overflow-x-auto scrollbar-thin">
                                    <div className="grid gap-px" style={{ gridTemplateColumns: 'auto repeat(16, 1fr)', minWidth: '340px' }}>
                                      {['Chimbal', 'Caixa', 'Bumbo'].map((inst, instIdx) => (
                                        <React.Fragment key={instIdx}>
                                          <div className="flex items-center justify-start bg-[#261812] text-[#ff6b00] font-black text-[6px] border border-black px-1 min-w-[40px] truncate uppercase">{inst}</div>
                                          {Array.from({ length: 16 }).map((_, beat) => {
                                            const active = drum.matrix?.[instIdx]?.[beat];
                                            return (
                                              <div key={beat} className={`h-5 flex items-center justify-center border border-black/20 text-[8px] font-black ${active ? 'bg-[#ff6b00] text-white' : 'bg-white text-black/20'}`}>
                                                {active ? 'X' : '-'}
                                              </div>
                                            );
                                          })}
                                        </React.Fragment>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* MELODIAS RENDERIZADAS — com suporte a blocos de frases */}
                          {Array.isArray(richData.melody) && richData.melody.length > 0 && (
                            <div className="bg-white border-2 border-black p-2 space-y-3">
                              <span className="text-[7px] font-black text-[#8e7164] uppercase block tracking-widest">
                                🎹 MELODIAS DE TREINO ({richData.melody.length}):
                              </span>
                              {richData.melody.map((mel: any, idx: number) => (
                                <div key={idx} className="bg-[#feccba]/20 border-2 border-black p-2 space-y-2">
                                  <p className="text-[8px] font-black uppercase mb-1">{mel.name}</p>
                                  {Array.isArray(mel.phrases) && mel.phrases.length > 1 ? (
                                    <div className="space-y-2">
                                      {mel.phrases.map((phrase: string[], pIdx: number) => (
                                        <div key={pIdx} className="space-y-1">
                                          <div className="flex items-center gap-1">
                                            <span className="bg-[#ff6b00] text-white font-black text-[6px] px-1 border border-black">FRASE {pIdx + 1}</span>
                                            <div className="flex-1 border-t border-dashed border-[#ff6b00]/30"></div>
                                          </div>
                                          <div className="flex flex-wrap gap-1">
                                            {phrase.map((note: string, nIdx: number) => (
                                              <div key={nIdx} className="bg-[#261812] text-[#feccba] border border-black px-1.5 py-0.5 text-[8px] font-black uppercase">
                                                {translateNote(note)}
                                              </div>
                                            ))}
                                          </div>
                                          {pIdx < mel.phrases.length - 1 && (
                                            <div className="flex items-center gap-1 py-0.5">
                                              <div className="flex-1 border-t-2 border-dotted border-black/20"></div>
                                              <span className="text-[6px] font-black text-black/30 uppercase px-1">✂ PAUSA</span>
                                              <div className="flex-1 border-t-2 border-dotted border-black/20"></div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap gap-1">
                                      {Array.isArray(mel.notes) && mel.notes.map((note: string, nIdx: number) => (
                                        <div key={nIdx} className="bg-[#261812] text-[#feccba] border border-black px-1.5 py-0.5 text-[8px] font-black uppercase">
                                          {translateNote(note)}
                                        </div>
                                      ))}
                                    </div>
                                  )}
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
                <div key={i} onClick={() => { if (item.path === '/ranking') { setActiveTab('ranking'); fetchRanking(); } else if (item.path === '/agenda') { setActiveTab('aulas'); } else if (item.path === '/perfil') { setActiveTab('perfil'); } }} className="bg-[#fff8f6] border-4 border-black p-4 text-center shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer">
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
          )} {/* end activeTab === home */}

          {/* ===== ABA: PERFIL ===== */}
          {activeTab === 'perfil' && (
            <div className="px-4 py-5 space-y-6">
              {/* Cabeçalho do Perfil */}
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-[#ff6b00] border-4 border-black px-3 py-1 shadow-[4px_4px_0_#000]">
                  <h3 className="text-white font-black text-xs uppercase tracking-widest">👤 MEU PERFIL</h3>
                </div>
                <div className="flex-1 border-t-2 border-dashed border-[#3d2d26]"></div>
              </div>

              {/* Card do Jogador */}
              <div className="bg-[#fff8f6] border-8 border-black p-6 shadow-[12px_12px_0_#000] flex flex-col items-center text-center relative overflow-hidden gap-4">
                {/* Efeitos de Fundo 8-Bit */}
                <div className="absolute top-0 left-0 w-full h-2 bg-[#ff6b00]"></div>
                
                {/* Avatar Interativo Grande */}
                <div className="relative group cursor-pointer mt-4" onClick={() => document.getElementById('photo-input-profile')?.click()}>
                  <div className="w-28 h-28 border-8 border-black overflow-hidden bg-[#ff6b00] shadow-[8px_8px_0_#000] relative">
                    {alunoData?.foto_url ? (
                      <img src={alunoData.foto_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-black text-5xl">
                        {(alunoData?.nome || user?.nome || 'A').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* Overlay Hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity border-8 border-transparent">
                    <Camera className="w-8 h-8 text-white" />
                    <span className="text-[8px] text-white font-black mt-1 uppercase">Alterar Foto</span>
                  </div>
                  {/* Input de arquivo */}
                  <input 
                    id="photo-input-profile" 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handlePhotoUpload} 
                  />
                </div>

                {/* Nome e Nível */}
                <div className="space-y-1">
                  <h2 className="text-black font-black text-lg uppercase tracking-tight leading-none mt-2">{alunoData?.nome || user?.nome}</h2>
                  <p className="text-[#8e7164] font-black text-[9px] uppercase tracking-widest">{alunoData?.email}</p>
                  <span className="inline-block mt-2 text-[8px] font-black uppercase px-2 py-1 bg-black text-white border-2 border-black">
                    NÍVEL_0{Math.floor(xp / 1000) + 1} • {cursoNome}
                  </span>
                </div>

                {/* Grid de Stats (XP / Ranking / Conquistas) */}
                <div className="grid grid-cols-3 gap-2 w-full mt-4 pt-4 border-t-4 border-black">
                  <div className="bg-[#feccba] border-4 border-black p-2 text-center shadow-[4px_4px_0_#000]">
                    <p className="text-black font-black text-[7px] uppercase tracking-widest leading-none">XP TOTAL</p>
                    <p className="text-[#ff6b00] font-black text-base italic mt-1 leading-none">{xp}</p>
                  </div>
                  <div className="bg-[#feccba] border-4 border-black p-2 text-center shadow-[4px_4px_0_#000]">
                    <p className="text-black font-black text-[7px] uppercase tracking-widest leading-none">RANKING</p>
                    <p className="text-black font-black text-base italic mt-1 leading-none">#{alunoData?.ranking || '?'}</p>
                  </div>
                  <div className="bg-[#feccba] border-4 border-black p-2 text-center shadow-[4px_4px_0_#000]">
                    <p className="text-black font-black text-[7px] uppercase tracking-widest leading-none">CONQUISTAS</p>
                    <p className="text-[#ff6b00] font-black text-base italic mt-1 leading-none">{alunoData?.conquistas?.length || 0}</p>
                  </div>
                </div>

                {/* Barra de XP */}
                <div className="w-full mt-2">
                  <div className="flex justify-between text-[7px] font-black uppercase mb-1">
                    <span>PROGRESSO_DE_NÍVEL</span>
                    <span>{xp % 1000} / 1000 XP</span>
                  </div>
                  <div className="w-full h-4 bg-black border-2 border-black p-0.5">
                    <div 
                      className="h-full bg-[#ff6b00] transition-all duration-500" 
                      style={{ width: `${(xp % 1000) / 10}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Seção de Conquistas e Troféus */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-white font-black text-xs uppercase tracking-widest">🏆 TROFÉUS E CONQUISTAS</h3>
                  <div className="flex-1 border-t-2 border-dashed border-[#3d2d26]"></div>
                </div>
                
                {alunoData?.conquistas && alunoData.conquistas.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {alunoData.conquistas.map((c: any, i: number) => (
                      <div key={i} className="bg-[#261812] border-4 border-black p-4 flex items-center gap-4 hover:border-[#ff6b00] transition-all">
                        <div className="w-12 h-12 bg-[#3d2d26] border-2 border-black flex items-center justify-center text-2xl shrink-0">
                          {c.icone || '🏆'}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-[#feccba] font-black text-[10px] uppercase leading-none">{c.titulo}</h4>
                          <p className="text-white/60 font-black text-[8px] uppercase mt-1 leading-tight">{c.descricao}</p>
                          {c.data_conquista && (
                            <p className="text-[#ff6b00] font-black text-[6px] uppercase mt-1">
                              DESBLOQUEADO EM {new Date(c.data_conquista).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <span className="text-[#ff6b00] font-black text-[8px] bg-black border border-black px-1.5 py-0.5 shrink-0">
                          +{c.pontos || 100} XP
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#261812] border-4 border-black p-6 text-center">
                    <p className="text-[#8e7164] font-black text-[9px] uppercase">Nenhum troféu desbloqueado ainda.</p>
                    <p className="text-white/40 font-black text-[7px] uppercase mt-1">Complete missões ou envie sua foto de perfil para ganhar pontos!</p>
                  </div>
                )}
              </div>

              {/* Histórico de Aulas Passadas */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-white font-black text-xs uppercase tracking-widest">⏳ HISTÓRICO DE AULAS</h3>
                  <div className="flex-1 border-t-2 border-dashed border-[#3d2d26]"></div>
                </div>

                <div className="space-y-3">
                  {aulasRealizadas.length > 0 ? (
                    aulasRealizadas.map((aula: any) => (
                      <div key={aula.id} className="flex items-center justify-between p-4 bg-[#fff8f6] border-4 border-black shadow-[4px_4px_0_#000] hover:translate-y-[-2px] transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 border-4 border-black flex flex-col items-center justify-center font-black bg-[#ff6b00] text-white shrink-0">
                            <span className="text-[10px] leading-none">{new Date(aula.data + 'T12:00:00').getDate().toString().padStart(2,'0')}</span>
                            <span className="text-[7px] leading-none uppercase">{new Date(aula.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' })}</span>
                          </div>
                          <div>
                            <p className="font-black text-[10px] uppercase text-black">{aula.curso_nome || 'AULA DE MÚSICA'}</p>
                            <p className="text-[7px] font-black uppercase text-[#8e7164]">{aula.horario?.substring(0,5)} • {aula.professor_nome || 'PROFESSOR'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setPrintAula(aula)}
                          className="bg-black hover:bg-[#ff6b00] text-white font-black text-[8px] uppercase tracking-widest px-3 py-2 border-2 border-black active:translate-y-1 active:shadow-none transition-all flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5" /> DIÁRIO (PDF)
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="bg-[#261812] border-4 border-black p-6 text-center">
                      <p className="text-[#8e7164] font-black text-[9px] uppercase">Nenhuma aula realizada registrada.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM NAV — Mobile */}
        <nav className="fixed md:absolute bottom-0 left-0 right-0 md:left-auto md:right-auto md:w-full h-20 bg-[#261812] border-t-8 border-black flex items-center justify-around px-2 z-50">
          {[
            { icon: Home, label: 'HOME', tab: 'home' as const },
            { icon: Trophy, label: 'RANK', tab: 'ranking' as const },
            { icon: BookOpen, label: 'AULAS', tab: 'aulas' as const },
            { icon: User, label: 'PERFIL', tab: 'perfil' as const },
          ].map((item) => (
            <button key={item.tab} onClick={() => { setActiveTab(item.tab); if (item.tab === 'ranking') fetchRanking(); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.tab ? 'translate-y-[-4px]' : 'opacity-50'}`}>
              <div className={`p-2 border-4 border-black shadow-[4px_4px_0_#000] ${activeTab === item.tab ? 'bg-[#ff6b00]' : 'bg-white'}`}>
                <item.icon className={`w-5 h-5 ${activeTab === item.tab ? 'text-white' : 'text-black'}`} />
              </div>
              <span className="text-[6px] font-black text-white uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
      {printAula && (
        <PrintModal 
          aula={printAula} 
          alunoNome={alunoData?.nome || user?.nome} 
          onClose={() => setPrintAula(null)} 
        />
      )}
    </div>
  );
}
