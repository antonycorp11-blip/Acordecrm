import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Bell, Home, Trophy, BookOpen, Target, ChevronRight, Play, HelpCircle, LogOut, Camera, Upload, Sparkles, Volume2, User, FileText, Printer, Gamepad2, Flame, Video, StopCircle } from 'lucide-react';
import { ChordVisualizer } from '../components/musiclass/ChordVisualizers';
import { MusiclassTools } from '../components/musiclass/MusiclassTools';
import { ChordRush } from '../components/jogos/ChordRush';
import { useAuth } from '../contexts/AuthContext';
import { OneSignalService } from '../services/OneSignalService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { PwaModal } from '../components/alunos/PwaModal';
import PerfilEstudanteModal, { resolveTrophyImage } from '../components/PerfilEstudanteModal';

// Tradução de notas científicas para cifras em português brasileiro
const translateNote = (note: string): string => {
  return note.replace(/\d+$/, '');
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
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [serverVersion, setServerVersion] = useState('');
  const VERSAO_CLIENTE = 'SYNC_V4.3.1';
  const [alunoData, setAlunoData] = useState<any>(null);
  const [aulasHoje, setAulasHoje] = useState<any[]>([]);
  const [aulasRealizadas, setAulasRealizadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'ranking' | 'aulas' | 'perfil' | 'jogos' | 'treino'>('home');
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [isAlunoModalOpen, setIsAlunoModalOpen] = useState(false);
  const [selectedAluno, setSelectedAluno] = useState<any | null>(null);
  const [todasConquistas, setTodasConquistas] = useState<any[]>([]);
  const [printAula, setPrintAula] = useState<any | null>(null);
  const [showTools, setShowTools] = useState(false);

  // Estados para o Sistema de Treino Diário
  const [treinos, setTreinos] = useState<any[]>([]);
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [recordingIntervalId, setRecordingIntervalId] = useState<any>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Estados para o Jogo "Acorde Genius" e "Chord Rush"
  const [isPlayingAcordeGenius, setIsPlayingAcordeGenius] = useState(false);
  const [isPlayingChordRush, setIsPlayingChordRush] = useState(false);
  const [geniusState, setGeniusState] = useState<'idle' | 'playback' | 'playing' | 'gameover'>('idle');
  const [geniusSequence, setGeniusSequence] = useState<number[]>([]);
  const [geniusUserSequence, setGeniusUserSequence] = useState<number[]>([]);
  const [geniusScore, setGeniusScore] = useState(0);
  const [geniusActivePad, setGeniusActivePad] = useState<number | null>(null);
  const [gamePoints, setGamePoints] = useState(0); // Pontos acumulados na sessão do aluno
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Web Audio API Retro Sound Generator
  const playRetroSound = (frequency: number, type: 'sine' | 'triangle' | 'square' | 'sawtooth' = 'triangle', duration: number = 0.25) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (err) {
      console.error('AudioContext error:', err);
    }
  };

  const padFrequencies = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

  const playPadSoundAndLight = (padIndex: number) => {
    setGeniusActivePad(padIndex);
    playRetroSound(padFrequencies[padIndex], 'triangle', 0.35);
    setTimeout(() => {
      setGeniusActivePad(null);
    }, 300);
  };

  // Toca toda a sequência gerada
  const playGeniusSequence = (sequenceToPlay: number[]) => {
    setGeniusState('playback');
    let idx = 0;
    
    const interval = setInterval(() => {
      if (idx >= sequenceToPlay.length) {
        clearInterval(interval);
        setGeniusState('playing');
        setGeniusUserSequence([]);
        return;
      }
      playPadSoundAndLight(sequenceToPlay[idx]);
      idx++;
    }, 650);
  };

  // Inicia o Simon Game
  const startGeniusGame = () => {
    setGeniusScore(0);
    const firstNote = Math.floor(Math.random() * 4);
    const newSeq = [firstNote];
    setGeniusSequence(newSeq);
    setGeniusUserSequence([]);
    setGeniusState('playback');
    
    // Pequeno atraso para começar
    setTimeout(() => {
      playGeniusSequence(newSeq);
    }, 500);
  };

  // Clique do usuário no Pad
  const handleGeniusPadClick = (padIndex: number) => {
    if (geniusState !== 'playing') return;

    // Toca e acende
    playPadSoundAndLight(padIndex);

    // Registra clique do usuário
    const nextUserSeq = [...geniusUserSequence, padIndex];
    setGeniusUserSequence(nextUserSeq);

    // Valida com a sequência original
    const currentIndex = nextUserSeq.length - 1;
    if (padIndex !== geniusSequence[currentIndex]) {
      // Errou! Game Over!
      setGeniusState('gameover');
      // Som retro triste de derrota
      playRetroSound(180, 'sawtooth', 0.55);
      return;
    }

    // Se acertou a nota e completou a sequência
    if (nextUserSeq.length === geniusSequence.length) {
      // Avança para o próximo round
      setGeniusScore(prev => prev + 1);
      setGamePoints(prev => prev + 20); // Acumula pontos!

      // Efeito sonoro de nível passado
      setTimeout(() => {
        playRetroSound(523.25, 'sine', 0.1);
        setTimeout(() => playRetroSound(659.25, 'sine', 0.1), 80);
        setTimeout(() => playRetroSound(783.99, 'sine', 0.15), 160);
      }, 350);

      // Adiciona uma nova nota aleatória
      const nextNote = Math.floor(Math.random() * 4);
      const nextSeq = [...geniusSequence, nextNote];
      setGeniusSequence(nextSeq);
      
      // Agenda a reprodução da nova sequência
      setTimeout(() => {
        playGeniusSequence(nextSeq);
      }, 1200);
    }
  };

  // Função de câmbio/resgate de XP
  const handleRedeemXp = async () => {
    if (gamePoints < 10) {
      toast.error('Você precisa de pelo menos 10 pontos para resgatar XP!');
      return;
    }

    setIsRedeeming(true);
    const token = localStorage.getItem('acorde_token');

    try {
      const res = await fetch('/api/gamificacao/resgatar-pontos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pontos: gamePoints,
          jogo: 'Acorde Genius'
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Efeito sonoro triunfal chiptune
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          setTimeout(() => playRetroSound(freq, 'sine', 0.15), idx * 100);
        });

        toast.success(`💥 RESGATE RETRÔ DE SUCESSO! +${data.xpGanhos} XP de verdade creditados no CRM! 🔥`, {
          duration: 6000
        });

        setGamePoints(0);
        
        // Atualiza dinamicamente o XP do aluno na tela
        setAlunoData((prev: any) => prev ? { ...prev, xp: data.novoXp } : null);
        
        // Atualiza a lista do ranking para sincronizar na hora
        fetchRanking();
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Erro no resgate de pontos.');
      }
    } catch (err) {
      console.error('Erro ao resgatar pontos:', err);
      toast.error('Falha de conexão com o servidor.');
    } finally {
      setIsRedeeming(false);
    }
  };


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

    const fetchTodasConquistas = () => {
      fetch('/api/gamificacao/conquistas', { headers })
        .then(r => r.ok ? r.json() : [])
        .then(data => setTodasConquistas(Array.isArray(data) ? data : []))
        .catch(console.error);
    };

    fetchAll();
    fetchTodasConquistas();
    
    // Buscar treinos do aluno na inicializacao
    const fetchTreinosInit = () => {
      const timestamp = Date.now();
      fetch(`/api/treinos/me?t=${timestamp}`, { headers })
        .then(r => r.ok ? r.json() : [])
        .then(data => setTreinos(Array.isArray(data) ? data : []))
        .catch(console.error);
    };
    fetchTreinosInit();

    // Verificar versão do sistema contra cache do navegador
    fetch(`/api/sistema/versao?t=${Date.now()}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.versao && data.versao !== VERSAO_CLIENTE) {
          console.warn(`[VERSION_CHECK] Mismatch detectado! Cliente: ${VERSAO_CLIENTE}, Servidor: ${data.versao}`);
          setServerVersion(data.versao);
          setNeedsUpdate(true);
        }
      })
      .catch(console.error);
  }, []);

  const fetchTreinos = () => {
    const token = localStorage.getItem('acorde_token');
    if (!token) return;
    const headers = { 'Authorization': `Bearer ${token}` };
    fetch('/api/treinos/me', { headers })
      .then(r => r.ok ? r.json() : [])
      .then(data => setTreinos(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const handleConfirmarPresenca = async (aulaId: number) => {
    try {
      const token = localStorage.getItem('acorde_token');
      if (!token) return;
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const res = await fetch(`/api/agenda/${aulaId}/confirmar`, {
        method: 'POST',
        headers
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao confirmar presença.');
      }

      toast.success('Presença confirmada! 🎸');
      playRetroSound(880, 'sine', 0.15);
      setTimeout(() => playRetroSound(1320, 'sine', 0.25), 150);
      
      // Recarrega dados
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

          setAulasHoje(futureAulas);
        }
      });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao confirmar.');
    }
  };

  // Gravação de Vídeo de Treino
  const startRecording = async () => {
    // Desvio Síncrono Imediato para qualquer dispositivo móvel (Android E iOS) ou se o MediaRecorder não existir.
    // Isso é feito no mesmo tick de execução do clique do botão para burlar a restrição
    // de 'User Gesture Requirement' no Android/iOS, abrindo a câmera nativa de forma robusta e síncrona.
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1);
    const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    if (isMobile || !hasMediaRecorder) {
      console.log('[startRecording] Usuário em dispositivo móvel ou MediaRecorder ausente. Acionando desvio síncrono para a câmera nativa.');
      const fallbackInput = document.getElementById('camera-capture-fallback');
      if (fallbackInput) {
        fallbackInput.click();
        return;
      }
    }

    let interval: any = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 480, height: 480, facingMode: 'user' }, 
        audio: true 
      });
      
      const safeIsTypeSupported = (mime: string) => {
        try {
          return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime);
        } catch (e) {
          return false;
        }
      };

      const tiposParaTestar = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4',
        'video/quicktime'
      ];

      let options: any = null;
      for (const tipo of tiposParaTestar) {
        if (safeIsTypeSupported(tipo)) {
          options = { mimeType: tipo };
          break;
        }
      }

      let recorder: MediaRecorder;
      try {
        recorder = options 
          ? new MediaRecorder(stream, options) 
          : new MediaRecorder(stream);
      } catch (err) {
        console.warn('Falha ao instanciar MediaRecorder com opções, tentando sem opções:', err);
        try {
          recorder = new MediaRecorder(stream);
        } catch (fatalErr: any) {
          throw new Error('Seu navegador não oferece suporte para gravação de vídeo: ' + fatalErr.message);
        }
      }
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onerror = (e: any) => {
        console.error('Erro assíncrono detectado no MediaRecorder. Acionando fallback da câmera nativa:', e);
        try {
          recorder.stop();
        } catch (stopErr) {}
        stream.getTracks().forEach(track => track.stop());
        setRecording(false);
        if (interval) {
          clearInterval(interval);
        }
        setRecordingIntervalId((prevId: any) => {
          if (prevId) clearInterval(prevId);
          return null;
        });
        playRetroSound(220, 'sawtooth', 0.35);
        toast.info('Redirecionando para gravação nativa do aparelho...');
        
        const fallbackInput = document.getElementById('camera-capture-fallback');
        if (fallbackInput) {
          fallbackInput.click();
        }
      };

      recorder.onstop = () => {
        // Solução robusta universal: detecta o mimeType a partir do primeiro chunk se disponível, 
        // ou do recorder.mimeType, ou do fallback dinâmico seguro de options
        const tipoDetectado = (chunks.length > 0 && chunks[0].type) || 
                              recorder.mimeType || 
                              (options && options.mimeType) || 
                              'video/mp4';
        const blob = new Blob(chunks, { type: tipoDetectado });
        setVideoBlob(blob);
        const url = URL.createObjectURL(blob);
        setVideoPreviewUrl(url);
        
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setRecordingTimer(0);
      
      interval = setInterval(() => {
        setRecordingTimer(prev => {
          if (prev >= 45) {
            recorder.stop();
            clearInterval(interval);
            setRecording(false);
            return 45;
          }
          return prev + 1;
        });
      }, 1000);
      
      setRecordingIntervalId(interval);
      playRetroSound(600, 'sine', 0.1);
    } catch (err: any) {
      console.warn('Falha na gravação em tempo real no browser. Ativando câmera nativa do aparelho...', err);
      // Fallback: Disparar clique no input de arquivo com capture="user"
      const fallbackInput = document.getElementById('camera-capture-fallback');
      if (fallbackInput) {
        fallbackInput.click();
      } else {
        toast.error('Erro ao acessar câmera do aparelho: ' + (err.message || ''));
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      try {
        mediaRecorder.stop();
      } catch (e) {}
      if (recordingIntervalId) {
        clearInterval(recordingIntervalId);
      }
      setRecording(false);
      playRetroSound(400, 'sine', 0.15);
    }
  };

  const uploadVideo = async () => {
    if (!videoBlob) return;
    
      const MAX_SIZE = 2000 * 1024 * 1024; // 2GB
    if (videoBlob.size > MAX_SIZE) {
      toast.error('O vídeo ficou muito pesado (acima de 2GB)! Grave mais curto.');
      setVideoBlob(null);
      setVideoPreviewUrl('');
      return;
    }

    setUploadingVideo(true);
    setUploadProgress(10);
    
    try {
      const token = localStorage.getItem('acorde_token');
      
      const mime = videoBlob.type || 'video/webm';
      let extensao = 'webm';
      if (mime.includes('mp4')) {
        extensao = 'mp4';
      } else if (mime.includes('quicktime') || mime.includes('mov')) {
        extensao = 'mp4'; // force mp4 for ios
      }
      
      let finalVideoUrl = '';
      setUploadProgress(20);
      
      // 1. Pede URL de Upload do Google Drive pro backend
      const nomeAlunoSafe = (alunoData?.nome || 'Aluno').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Treino_${nomeAlunoSafe}_${Date.now()}.${extensao}`;
      const urlRes = await fetch('/api/drive/upload-url', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename, mimeType: mime })
      });
      
      if (!urlRes.ok) throw new Error('Falha ao gerar link seguro de upload no Google Drive.');
      const { uploadUrl } = await urlRes.json();
      
      setUploadProgress(40);
      
      // 2. Faz o PUT direto no Google Drive
      const driveRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: videoBlob,
          headers: { 'Content-Type': mime }
      });
      
      if (!driveRes.ok) throw new Error('Falha ao enviar arquivo para a nuvem.');
      
      setUploadProgress(80);
      
      const driveData = await driveRes.json();
      const fileId = driveData.id;
      
      // 3. Finaliza no backend para dar permissão pública e pegar o webViewLink
      const finishRes = await fetch('/api/drive/finish-upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId })
      });
      
      if (!finishRes.ok) throw new Error('Falha ao gerar link público do vídeo.');
      const finishData = await finishRes.json();
      finalVideoUrl = finishData.url;

      setUploadProgress(85);
      
      // Envia a URL pro backend para registrar o check-in (ou envia formData se falhar e precisar de fallback)
      let reqBody, reqHeaders;
      if (finalVideoUrl) {
         reqBody = JSON.stringify({ video_url: finalVideoUrl });
         reqHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      } else {
         const formData = new FormData();
         formData.append('video', videoBlob, `treino_video.${extensao}`);
         reqBody = formData;
         reqHeaders = { 'Authorization': `Bearer ${token}` };
      }

      const res = await fetch('/api/treinos/upload-video', {
        method: 'POST',
        headers: reqHeaders,
        body: reqBody
      });
      
      setUploadProgress(95);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao registrar vídeo no sistema.');
      }
      
      const data = await res.json();
      setUploadProgress(100);
      toast.success('Vídeo de treino enviado com sucesso! 📹🔥');
      playRetroSound(880, 'sine', 0.15);
      setTimeout(() => playRetroSound(1320, 'sine', 0.25), 150);
      
      setVideoBlob(null);
      setVideoPreviewUrl('');
      fetchTreinos();
    } catch (err: any) {
      toast.error(err.message || 'Falha no envio do vídeo.');
    } finally {
      setUploadingVideo(false);
      setUploadProgress(0);
    }
  };

  const handleMarcarTreino = async () => {
    // REGRA: Dia sim, Dia não (se o último não teve vídeo, hoje é obrigatório ter vídeo)
    const sortedTreinos = [...treinos].sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    const lastTreino = sortedTreinos[0];
    const precisaDeVideo = (!lastTreino || !lastTreino.video_url);

    if (precisaDeVideo) {
      toast.error('Hoje é obrigatório o envio do VÍDEO para este check-in! (Regra: Dia sim, Dia não). Use o botão abaixo de Gravar Treino.');
      playRetroSound(150, 'sawtooth', 0.3);
      return;
    }

    try {
      const token = localStorage.getItem('acorde_token');
      const res = await fetch('/api/treinos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao marcar treino.');
      }
      
      toast.success('Treino registrado! 🔥 +20 XP de estudo diário!');
      playRetroSound(880, 'sine', 0.15);
      setTimeout(() => playRetroSound(1200, 'sine', 0.2), 100);
      
      const timestamp = Date.now();
      const headers = { 'Authorization': `Bearer ${token}` };
      fetch(`/api/alunos/me?t=${timestamp}`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(me => { if (me) setAlunoData(me); });

      fetchTreinos();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao marcar treino.');
    }
  };

  const handleSolicitarTrofeu = async (conquistaId: number) => {
    const token = localStorage.getItem('acorde_token');
    if (!token || !alunoData?.id) return;

    try {
      const res = await fetch('/api/gamificacao/solicitar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ aluno_id: alunoData.id, conquista_id: conquistaId })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('SOLICITAÇÃO ENVIADA COM SUCESSO! 📨');
        playRetroSound(880, 'sine', 0.15);
        setTimeout(() => playRetroSound(1320, 'sine', 0.25), 150);
        // Recarregar dados do aluno
        const timestamp = Date.now();
        const headers = { 'Authorization': `Bearer ${token}` };
        fetch(`/api/alunos/me?t=${timestamp}`, { headers })
          .then(r => r.ok ? r.json() : null)
          .then(me => { if (me) setAlunoData(me); });
      } else {
        toast.error(typeof data.error === 'string' ? data.error : 'Erro ao solicitar troféu');
        playRetroSound(220, 'sawtooth', 0.3);
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao conectar com o servidor.');
      playRetroSound(220, 'sawtooth', 0.3);
    }
  };

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

  // Streak tracker dos ultimos 7 dias
  const ultimosSeteDias = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dataStr = d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
    const label = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
    const diaNum = d.getDate();
    return { dataStr, label, diaNum };
  });

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
        
        {needsUpdate && (
          <div className="bg-red-600 text-white border-b-8 border-black p-4 text-center font-black text-[9px] uppercase animate-pulse flex flex-col gap-2 z-[100] relative">
            <p>🚨 NOVA ATUALIZAÇÃO CRÍTICA ({serverVersion})!</p>
            <p className="text-[7px] text-white/90">Corrigido gravador de vídeo em navegadores móveis (Opera, Chrome, Safari iOS).</p>
            <button
              onClick={() => {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then((registrations) => {
                    for (const reg of registrations) reg.unregister();
                  });
                }
                if ('caches' in window) {
                  caches.keys().then((names) => {
                    for (const name of names) caches.delete(name);
                  });
                }
                // Reload rígido forçando bypass de cache
                window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
              }}
              className="bg-white text-black border-2 border-black font-black px-3 py-1 hover:bg-black hover:text-white transition-all cursor-pointer text-[8px] uppercase shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none"
            >
              ⚡ ATUALIZAR E CORRIGIR AGORA
            </button>
          </div>
        )}
        
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
            <button 
              onClick={() => {
                OneSignalService.forcePrompt();
                toast.success('Permissão de notificações ativada! Verifique no painel.');
              }}
              className="text-black hover:text-[#ff6b00] transition-colors relative group"
              title="Ativar Notificações"
            >
              <Bell className="w-6 h-6" />
              <span className="absolute -bottom-8 right-0 bg-black text-white text-[8px] font-black p-1 uppercase hidden group-hover:block whitespace-nowrap">
                ATIVAR PUSH
              </span>
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
                  <div 
                    key={player.id} 
                    onClick={() => {
                      setSelectedAluno(player);
                      setIsAlunoModalOpen(true);
                    }}
                    className={`flex items-center gap-3 p-3 border-4 border-black shadow-[4px_4px_0_#000] cursor-pointer hover:-translate-y-0.5 transition-all ${isMe ? 'bg-[#ff6b00]' : 'bg-[#fff8f6]'}`}
                  >
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
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`font-black text-[10px] uppercase truncate mb-0 ${isMe ? 'text-white' : 'text-black'}`}>{player.nome}</p>
                        {/* Ícones de Conquistas */}
                        {player.conquistas && player.conquistas.length > 0 && (
                          <div className="flex items-center gap-1 shrink-0">
                            {player.conquistas.slice(0, 4).map((c: any, cIdx: number) => (
                              <div 
                                key={cIdx} 
                                className="w-5 h-5 border-2 border-black bg-white flex items-center justify-center shadow-[1px_1px_0_#000] shrink-0" 
                                title={c.nome}
                              >
                                {c.icone_url ? (
                                  <img src={c.icone_url} alt={c.nome} className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-[8px]">🏆</span>
                                )}
                              </div>
                            ))}
                            {player.conquistas.length > 4 && (
                              <span className={`text-[6px] font-black uppercase leading-none ${isMe ? 'text-white/80' : 'text-[#8e7164]'}`}>
                                +{player.conquistas.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <p className={`text-[7px] font-black uppercase mt-0.5 mb-0 ${isMe ? 'text-white/80' : 'text-[#8e7164]'}`}>{player.curso || 'STUDENT'}</p>
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
              <div className="text-center py-8 bg-[#261812] border-4 border-black shadow-[4px_4px_0_#000]">
                <p className="text-[#8e7164] font-black text-[10px] uppercase">🚧 AGUARDE: EM DESENVOLVIMENTO 🚧</p>
                <p className="text-[#8e7164]/60 font-black text-[8px] uppercase mt-2">EM BREVE SUAS VIDEOAULAS E MATERIAIS DE APOIO ESTARÃO AQUI!</p>
              </div>
            </div>
          )}

          {/* ===== ABA: JOGOS ===== */}
          {activeTab === 'jogos' && (
            <div className="px-4 py-5 space-y-6">
              {/* Cabeçalho da Galeria */}
              <div className="flex items-center gap-3">
                <div className="bg-[#ff6b00] border-4 border-black px-3 py-1 shadow-[4px_4px_0_#000]">
                  <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-1.5">
                    🕹️ FLIPERAMA ACORDE
                  </h3>
                </div>
                <div className="flex-1 border-t-2 border-dashed border-[#3d2d26]"></div>
              </div>

              {!isPlayingAcordeGenius && !isPlayingChordRush ? (
                <>
                  {/* Banner Retro de Boas-vindas */}
                  <div className="bg-[#261812] border-4 border-black p-4 text-center relative overflow-hidden shadow-[4px_4px_0_#000]">
                    <p className="text-[#feccba] font-black text-[9px] uppercase tracking-widest animate-pulse">
                      ⚡ INSIRA UMA FICHA & DESTRUA NO RITMO! ⚡
                    </p>
                    <p className="text-white/50 font-black text-[7px] uppercase mt-1">
                      Divirta-se nos minijogos e troque seus pontos por XP de verdade no CRM!
                    </p>
                  </div>

                  {/* Banco de Pontos e Câmbio */}
                  <div className="bg-[#fff8f6] border-8 border-black p-5 shadow-[8px_8px_0_#000] space-y-4">
                    <div className="text-center flex flex-col items-center justify-center">
                      <p className="text-black font-black text-[8px] uppercase tracking-widest mb-2">
                        💰 SEUS PONTOS ACUMULADOS
                      </p>
                      <div className="inline-block bg-black border-4 border-black px-6 py-2 text-center shadow-[4px_4px_0_#000]">
                        <span className="font-mono text-3xl text-emerald-400 font-bold tracking-widest block">
                          {String(gamePoints).padStart(4, '0')}
                        </span>
                        <span className="text-emerald-400 font-black text-[8px] block mt-0.5 uppercase tracking-wider">
                          PONTOS GALLERY
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#feccba] border-4 border-black p-3 text-center text-black font-black text-[8px] uppercase tracking-widest space-y-1">
                      <p>💵 TAXA DE CÂMBIO: 10 PONTOS = 1 XP NO CRM</p>
                      <p className="text-[#ff6b00] text-[9px]">
                        VALOR DE RESGATE ESTIMADO: +{Math.round(gamePoints / 10)} XP
                      </p>
                    </div>

                    <button
                      onClick={handleRedeemXp}
                      disabled={gamePoints < 10 || isRedeeming}
                      className={`w-full border-4 border-black font-black text-[10px] py-3 uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        gamePoints >= 10 && !isRedeeming
                          ? 'bg-[#00ff66] text-black hover:bg-[#00cc52]'
                          : 'bg-[#8e7164]/30 text-[#8e7164] opacity-50 cursor-not-allowed shadow-none active:translate-y-0'
                      }`}
                    >
                      {isRedeeming ? (
                        'PROCESSANDO RESGATE...'
                      ) : gamePoints >= 10 ? (
                        <>🔄 RESGATAR +{Math.round(gamePoints / 10)} XP REAL NO CRM</>
                      ) : (
                        'JOGUE PARA JUNTAR PONTOS (MÍN. 10)'
                      )}
                    </button>
                  </div>

                  {/* Grid de Fliperamas */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-3">
                      <h4 className="text-white font-black text-[10px] uppercase tracking-widest">
                        SELECIONE O GABINETE
                      </h4>
                      <div className="flex-1 border-t-2 border-dashed border-[#3d2d26]"></div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      {/* Jogo 1: Genius */}
                      <div className="bg-[#fff8f6] border-8 border-black p-4 shadow-[8px_8px_0_#000] flex flex-col gap-3 hover:translate-y-[-2px] transition-all">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="bg-[#ff6b00] text-white text-[7px] font-black uppercase px-2 py-0.5 border-2 border-black inline-block mb-1">
                              DISPONÍVEL 🎮
                            </span>
                            <h3 className="text-black font-black text-xs uppercase tracking-tight">
                              ACORDE GENIUS (8-BIT)
                            </h3>
                          </div>
                          <span className="text-[#ff6b00] font-black text-[8px] bg-black border border-black px-1.5 py-0.5 shrink-0">
                            +20 PONTOS / LVL
                          </span>
                        </div>
                        <p className="text-[#8e7164] font-black text-[8px] uppercase leading-relaxed">
                          Treine seu ouvido musical e sua memória repetindo as sequências de acordes e bips senoidais!
                        </p>
                        <button
                          onClick={() => {
                            setIsPlayingAcordeGenius(true);
                            // Toca um som retro de moeda inserida (Insert Coin)
                            playRetroSound(880, 'square', 0.1);
                            setTimeout(() => playRetroSound(1760, 'square', 0.25), 100);
                          }}
                          className="w-full bg-[#ff6b00] text-white hover:bg-black font-black text-[8px] py-2.5 border-4 border-black uppercase tracking-widest shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer text-center"
                        >
                          🕹️ INICIAR PARTIDA
                        </button>
                      </div>

                      {/* Jogo 2: Chord Rush */}
                      <div className="bg-[#fff8f6] border-8 border-black p-4 shadow-[8px_8px_0_#000] flex flex-col gap-3 hover:translate-y-[-2px] transition-all">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="bg-[#00ff66] text-black text-[7px] font-black uppercase px-2 py-0.5 border-2 border-black inline-block mb-1">
                              NOVO! 🎸
                            </span>
                            <h3 className="text-black font-black text-xs uppercase tracking-tight">
                              CHORD RUSH
                            </h3>
                          </div>
                          <span className="text-[#00ff66] font-black text-[8px] bg-black border border-black px-1.5 py-0.5 shrink-0">
                            +10 PONTOS / ACERTO
                          </span>
                        </div>
                        <p className="text-[#8e7164] font-black text-[8px] uppercase leading-relaxed">
                          Identifique as notas corretas de cada acorde antes que o tempo acabe. Pense rápido!
                        </p>
                        <button
                          onClick={() => {
                            setIsPlayingChordRush(true);
                            playRetroSound(880, 'square', 0.1);
                          }}
                          className="w-full bg-[#00ff66] text-black hover:bg-black hover:text-[#00ff66] font-black text-[8px] py-2.5 border-4 border-black uppercase tracking-widest shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer text-center"
                        >
                          🕹️ INICIAR PARTIDA
                        </button>
                      </div>

                      {/* Jogo 3: Rhythm Hero (Em Breve) */}
                      <div className="bg-[#261812] border-4 border-black p-4 flex flex-col gap-2 opacity-50 relative group">
                        <div className="flex justify-between items-center">
                          <h3 className="text-white/60 font-black text-xs uppercase">
                            RHYTHM HERO
                          </h3>
                          <span className="bg-[#3d2d26] text-white/50 text-[6px] font-black uppercase px-1.5 py-0.5 border border-black">
                            EM BREVE 🔒
                          </span>
                        </div>
                        <p className="text-white/40 font-black text-[8px] uppercase">
                          Um jogo de ritmo pixelado no qual você precisa acertar as batidas na hora certa para solar seu instrumento!
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : isPlayingChordRush ? (
                <ChordRush 
                  onClose={() => setIsPlayingChordRush(false)}
                  onGameOver={(score) => {
                    if (score > 0) {
                      setGamePoints(prev => prev + score);
                    }
                  }}
                  playRetroSound={playRetroSound}
                />
              ) : (
                /* ÁREA DO MINIJOGO: ACORDE GENIUS */
                <div className="bg-black border-8 border-[#3d2d26] p-4 shadow-[8px_8px_0_#000] flex flex-col gap-4 relative">
                  {/* Linha Decorativa Superior do Gabinete */}
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => {
                        setIsPlayingAcordeGenius(false);
                        setGeniusState('idle');
                        setGeniusSequence([]);
                        setGeniusUserSequence([]);
                        setGeniusScore(0);
                        setGeniusActivePad(null);
                      }}
                      className="bg-[#261812] text-[#feccba] border-2 border-[#feccba] font-black text-[7px] uppercase px-2.5 py-1 hover:bg-black active:translate-y-[1px] transition-all cursor-pointer"
                    >
                      ← SAIR DO FLIPERAMA
                    </button>
                    <span className="text-[#ff6b00] font-black text-[8px] uppercase tracking-widest animate-pulse">
                      GENIUS_GABINETE_v1.0
                    </span>
                  </div>

                  {/* Tela de Status do Jogo */}
                  <div className="bg-[#1a0a05] border-4 border-[#3d2d26] p-3 font-mono text-center space-y-1">
                    <div className="flex justify-between text-[7px] text-[#feccba] font-black uppercase">
                      <span>NÍVEL: {geniusScore + 1}</span>
                      <span>SCORE: {geniusScore}</span>
                    </div>
                    <div className="h-6 flex items-center justify-center">
                      {geniusState === 'idle' && (
                        <p className="text-amber-500 font-black text-[8px] uppercase tracking-widest animate-pulse">
                          🎮 PRESS START TO PLAY! 🎮
                        </p>
                      )}
                      {geniusState === 'playback' && (
                        <p className="text-cyan-400 font-black text-[8px] uppercase tracking-widest animate-bounce">
                          🔊 PRESTE ATENÇÃO NA SEQUÊNCIA...
                        </p>
                      )}
                      {geniusState === 'playing' && (
                        <p className="text-green-400 font-black text-[8px] uppercase tracking-widest animate-pulse">
                          👉 REPRODUZA A SEQUÊNCIA DE NOTAS!
                        </p>
                      )}
                      {geniusState === 'gameover' && (
                        <p className="text-red-500 font-black text-[8px] uppercase tracking-widest animate-pulse">
                          🚨 GAME OVER! PONTOS SALVOS! 🚨
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Painel do Genius (4 Pads Quadrados Bem Retrô) */}
                  <div className="grid grid-cols-2 gap-3 max-w-[200px] mx-auto w-full mt-2">
                    {/* Pad 0: Verde (C4 - Dó) */}
                    <button
                      onClick={() => handleGeniusPadClick(0)}
                      disabled={geniusState !== 'playing'}
                      className={`h-20 border-4 border-black rounded-lg transition-all active:scale-95 shadow-[4px_4px_0_#000] relative ${
                        geniusActivePad === 0
                          ? 'bg-[#00ff66] shadow-[0_0_15px_#00ff66] border-white scale-[1.03] z-10'
                          : 'bg-[#006622] hover:bg-[#00802b] cursor-pointer'
                      } ${geniusState !== 'playing' ? 'cursor-default opacity-85' : ''}`}
                    >
                      <span className="absolute bottom-2 right-2 text-white/40 font-black text-[9px]">
                        C
                      </span>
                    </button>

                    {/* Pad 1: Laranja (E4 - Mi) */}
                    <button
                      onClick={() => handleGeniusPadClick(1)}
                      disabled={geniusState !== 'playing'}
                      className={`h-20 border-4 border-black rounded-lg transition-all active:scale-95 shadow-[4px_4px_0_#000] relative ${
                        geniusActivePad === 1
                          ? 'bg-[#ff9900] shadow-[0_0_15px_#ff9900] border-white scale-[1.03] z-10'
                          : 'bg-[#995c00] hover:bg-[#b36b00] cursor-pointer'
                      } ${geniusState !== 'playing' ? 'cursor-default opacity-85' : ''}`}
                    >
                      <span className="absolute bottom-2 right-2 text-white/40 font-black text-[9px]">
                        E
                      </span>
                    </button>

                    {/* Pad 2: Vermelho (G4 - Sol) */}
                    <button
                      onClick={() => handleGeniusPadClick(2)}
                      disabled={geniusState !== 'playing'}
                      className={`h-20 border-4 border-black rounded-lg transition-all active:scale-95 shadow-[4px_4px_0_#000] relative ${
                        geniusActivePad === 2
                          ? 'bg-[#ff3333] shadow-[0_0_15px_#ff3333] border-white scale-[1.03] z-10'
                          : 'bg-[#990000] hover:bg-[#cc0000] cursor-pointer'
                      } ${geniusState !== 'playing' ? 'cursor-default opacity-85' : ''}`}
                    >
                      <span className="absolute bottom-2 right-2 text-white/40 font-black text-[9px]">
                        G
                      </span>
                    </button>

                    {/* Pad 3: Azul (C5 - Dó oitavado) */}
                    <button
                      onClick={() => handleGeniusPadClick(3)}
                      disabled={geniusState !== 'playing'}
                      className={`h-20 border-4 border-black rounded-lg transition-all active:scale-95 shadow-[4px_4px_0_#000] relative ${
                        geniusActivePad === 3
                          ? 'bg-[#3399ff] shadow-[0_0_15px_#3399ff] border-white scale-[1.03] z-10'
                          : 'bg-[#004d99] hover:bg-[#0066cc] cursor-pointer'
                      } ${geniusState !== 'playing' ? 'cursor-default opacity-85' : ''}`}
                    >
                      <span className="absolute bottom-2 right-2 text-white/40 font-black text-[9px]">
                        C'
                      </span>
                    </button>
                  </div>

                  {/* Painel de Controles */}
                  <div className="flex gap-3 justify-center mt-2">
                    {(geniusState === 'idle' || geniusState === 'gameover') && (
                      <button
                        onClick={startGeniusGame}
                        className="bg-[#00ff66] hover:bg-[#00cc52] text-black border-4 border-black font-black text-[9px] px-6 py-2.5 uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        🎮 {geniusState === 'gameover' ? 'RECOMEÇAR PARTIDA' : 'INICIAR PARTIDA (START)'}
                      </button>
                    )}
                  </div>

                  {/* Instruções Curtas */}
                  <div className="text-[#8e7164] font-black text-[6px] uppercase text-center mt-2 leading-relaxed">
                    Memorize a sequência em que as notas acendem e tocam, depois clique nos pads na mesma ordem. Cada fase vencida dá +20 pontos de jogo!
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== ABA: TREINO (SISTEMA DE TREINO DIÁRIO) ===== */}
          {activeTab === 'treino' && (
            <div className="px-4 py-5 space-y-6">
              {/* Header Retro */}
              <div className="bg-[#fff8f6] border-8 border-black p-5 shadow-[8px_8px_0_#000] relative overflow-hidden flex flex-col gap-2">
                <p className="text-[#8e7164] text-[8px] font-black uppercase tracking-widest">&gt;&gt; DIARY_STREAK_ACTIVE • SYNC_ON</p>
                <h2 className="text-black font-black text-xl uppercase italic leading-tight">
                  MEU DIÁRIO DE TREINO
                </h2>
                <p className="text-[10px] text-[#261812] font-black uppercase">
                  Marque sua presença de estudo diária e envie um vídeo opcional estudando (expira em 24h) para avisar seu professor!
                </p>
              </div>

              {/* Streak Tracker 8-bit */}
              <div className="bg-[#261812] border-8 border-black p-5 shadow-[8px_8px_0_#000] space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-white font-black text-[9px] uppercase tracking-widest">STREAK ÚLTIMOS 7 DIAS</p>
                  <span className="text-[#ff6b00] font-black text-[9px] uppercase tracking-widest">
                    🔥 {treinos.length} CHECK-INS TOTAIS
                  </span>
                </div>
                
                <div className="grid grid-cols-7 gap-2">
                  {ultimosSeteDias.map((dia) => {
                    const treinou = treinos.some((t: any) => t.data === dia.dataStr);
                    const temVideo = treinos.some((t: any) => t.data === dia.dataStr && t.video_url);
                    
                    return (
                      <div 
                        key={dia.dataStr} 
                        className={`border-4 border-black p-2 flex flex-col items-center justify-center gap-1.5 shadow-[2px_2px_0_#000] ${
                          treinou 
                            ? temVideo 
                              ? 'bg-[#00ffcc] text-black' 
                              : 'bg-[#ff6b00] text-white' 
                            : 'bg-[#1a0a05] text-[#8e7164]'
                        }`}
                      >
                        <span className="text-[7px] font-black">{dia.label}</span>
                        <span className="text-sm font-black italic leading-none">{dia.diaNum}</span>
                        <span className="text-[8px] font-black leading-none">
                          {treinou ? (temVideo ? '📹' : '🔥') : '❌'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ações de Treino */}
              <div className="bg-[#fff8f6] border-8 border-black p-5 shadow-[8px_8px_0_#000] flex flex-col gap-4">
                {/* Botão de Check-in */}
                {treinos.some((t: any) => t.data === new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-')) ? (
                  <div className="bg-[#00ffcc] text-black border-4 border-black p-4 text-center font-black text-xs uppercase shadow-[4px_4px_0_#000]">
                    🔥 CHECK-IN DE HOJE REALIZADO! (+200 XP CREDITADOS)
                  </div>
                ) : (
                  <button
                    onClick={handleMarcarTreino}
                    className="w-full bg-[#ff6b00] hover:bg-black text-white font-black text-xs py-4 uppercase border-4 border-black shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    🔥 MARCAR TREINO HOJE (+200 XP)
                  </button>
                )}

                {/* Upload / Gravação de Vídeo */}
                <div className="border-t-4 border-dashed border-black pt-4 space-y-4">
                  <h3 className="text-black font-black text-[10px] uppercase tracking-wider flex items-center justify-between gap-2">
                    <span>📹 COMPROVAR COM VÍDEO (MAX 45 SEGUNDOS)</span>
                    <span className="bg-[#ff6b00] text-white px-2 py-0.5 border-2 border-black rotate-3 shadow-[2px_2px_0_#000] animate-pulse">+400 XP</span>
                  </h3>

                  {recording ? (
                    <div className="bg-[#261812] border-4 border-black p-6 text-center space-y-4 shadow-[4px_4px_0_#000]">
                      <div className="w-4 h-4 bg-red-600 rounded-full animate-ping mx-auto" />
                      <p className="text-white font-black text-xs uppercase tracking-widest">
                        GRAVANDO TREINO: {recordingTimer}s / 45s
                      </p>
                      <button
                        onClick={stopRecording}
                        className="bg-red-600 hover:bg-red-700 text-white font-black text-[9px] uppercase px-4 py-2 border-2 border-black shadow-[2px_2px_0_#000]"
                      >
                        ⏹ PARAR GRAVAÇÃO
                      </button>
                    </div>
                  ) : videoPreviewUrl ? (
                    <div className="bg-[#261812] border-4 border-black p-4 space-y-4 shadow-[4px_4px_0_#000]">
                      <video src={videoPreviewUrl} className="w-full max-h-[300px] border-4 border-black bg-black" controls />
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setVideoBlob(null);
                            setVideoPreviewUrl('');
                          }}
                          className="flex-1 bg-black text-[#feccba] font-black text-[9px] uppercase py-2.5 border-2 border-black"
                        >
                          EXCLUIR & GRAVAR OUTRO
                        </button>
                        <button
                          onClick={uploadVideo}
                          disabled={uploadingVideo}
                          className="flex-1 bg-[#00ffcc] text-black font-black text-[9px] uppercase py-2.5 border-2 border-black shadow-[2px_2px_0_#000] hover:bg-white active:translate-y-0.5"
                        >
                          {uploadingVideo ? `ENVIANDO... ${uploadProgress}%` : '📹 ENVIAR PARA O PROFESSOR'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={startRecording}
                        className="bg-[#feccba] hover:bg-[#ff6b00] hover:text-white text-black font-black text-[9px] uppercase py-3 border-4 border-black shadow-[4px_4px_0_#000] active:translate-y-0.5 cursor-pointer flex flex-col items-center justify-center gap-1"
                      >
                        🎥 GRAVAR VÍDEO AGORA
                      </button>
                      
                      <label className="bg-[#feccba] hover:bg-[#ff6b00] hover:text-white text-black font-black text-[9px] uppercase py-3 border-4 border-black shadow-[4px_4px_0_#000] active:translate-y-0.5 cursor-pointer flex flex-col items-center justify-center gap-1 text-center">
                        📁 SELECIONAR ARQUIVO
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setVideoBlob(file);
                              setVideoPreviewUrl(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </label>

                      {/* Input oculto para captura de câmera nativa do sistema em caso de falha no MediaRecorder do navegador */}
                      <input
                        type="file"
                        accept="video/*"
                        capture="user"
                        id="camera-capture-fallback"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Limite aumentado para 100MB
                            if (file.size > 100 * 1024 * 1024) {
                              toast.error('O arquivo da câmera excedeu o limite de 100MB.');
                              return;
                            }
                            setVideoBlob(file);
                            setVideoPreviewUrl(URL.createObjectURL(file));
                            toast.success('Câmera do celular ativada com sucesso! Vídeo pronto para enviar. 📹🔥');
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== MODAL DE MISSÃO PWA ===== */}
          <PwaModal 
             alunoData={alunoData} 
             onRewardClaimed={(xp) => setAlunoData((prev: any) => ({ ...prev, xp: (prev.xp || 0) + xp, push_recompensado: true }))} 
          />

          {/* ===== ABA: HOME (conteúdo existente) ===== */}
          {activeTab === 'home' && (
          <div className="px-4 py-5 space-y-4">

            <div className="bg-[#fff8f6] border-8 border-black p-6 relative overflow-hidden shadow-[12px_12px_0_#000] flex flex-col gap-4">
              <p className="text-[#8e7164] text-[8px] font-black uppercase tracking-widest">&gt;&gt; BEM_VINDO_PLAYER_ONE • SYNC_V4.3.1 • UPDATE_22MAY_2300</p>
              
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

            {/* Próxima Sessão foi removida a pedido do admin para ceder espaço a futuras features */}

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
                            <div className="bg-[#f8f9fa] border-4 border-black p-4 space-y-4 shadow-[6px_6px_0_#000] rounded-xl font-['Inter']">
                              <div className="flex flex-col sm:flex-row gap-6">
                                {/* Lado Esquerdo: Notas */}
                                <div className="flex-1 space-y-5">
                                  <h4 className="text-sm font-black text-black uppercase tracking-widest border-b-2 border-black/10 pb-2">
                                    🎹 SOLOS E MELODIAS (BIMANUAL)
                                  </h4>
                                  {richData.melody.map((mel: any, idx: number) => (
                                    <div key={idx} className="space-y-4">
                                      {mel.name && mel.name !== 'NOVA MELODIA / GUIA' && (
                                        <p className="text-xs font-black uppercase text-gray-500">{mel.name}</p>
                                      )}
                                      {Array.isArray(mel.phrases) && mel.phrases.length > 1 ? (
                                        <div className="space-y-4">
                                          {mel.phrases.map((phrase: string[], pIdx: number) => (
                                            <div key={pIdx} className="space-y-3">
                                              <div className="flex items-center gap-2">
                                                <span className="text-[#ff6b00] font-black text-xs sm:text-sm uppercase tracking-wider">PARTE {pIdx + 1}</span>
                                                <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                                              </div>
                                              <div className="flex flex-wrap gap-2">
                                                {phrase.map((note: string, nIdx: number) => (
                                                  <div key={nIdx} className="bg-[#1e40af] text-white shadow-[0_4px_0_#1e3a8a] active:shadow-[0_0_0_#1e3a8a] active:translate-y-1 transition-all rounded-lg px-4 py-2 text-sm sm:text-base font-black uppercase flex items-center justify-center min-w-[40px]">
                                                    {translateNote(note)}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="space-y-3">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[#ff6b00] font-black text-xs sm:text-sm uppercase tracking-wider">MELODIA</span>
                                            <div className="flex-1 border-t-2 border-dashed border-gray-300"></div>
                                          </div>
                                          <div className="flex flex-wrap gap-2">
                                            {Array.isArray(mel.notes) && mel.notes.map((note: string, nIdx: number) => (
                                              <div key={nIdx} className="bg-[#1e40af] text-white shadow-[0_4px_0_#1e3a8a] active:shadow-[0_0_0_#1e3a8a] active:translate-y-1 transition-all rounded-lg px-4 py-2 text-sm sm:text-base font-black uppercase flex items-center justify-center min-w-[40px]">
                                                {translateNote(note)}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Lado Direito: Checklist de Prática */}
                                <div className="w-full sm:w-64 bg-white border-2 border-black rounded-lg p-4 shadow-[4px_4px_0_#000] shrink-0">
                                  <h5 className="text-xs font-black text-black uppercase tracking-wider mb-4 text-center border-b-2 border-black/10 pb-2">
                                    ✅ CHECKLIST DE PRÁTICA
                                  </h5>
                                  <div className="space-y-3">
                                    {[
                                      'Cantar as notas e bater palmas',
                                      'Tocar só mão direita',
                                      'Tocar só mão esquerda',
                                      'Juntar as mãos lentamente',
                                      'Tocar no andamento original'
                                    ].map((step, sIdx) => (
                                      <label key={sIdx} className="flex items-start gap-3 cursor-pointer group">
                                        <div className="w-5 h-5 border-2 border-gray-400 rounded group-hover:border-[#ff6b00] flex items-center justify-center shrink-0 mt-0.5 bg-gray-50">
                                          <div className="w-3 h-3 bg-[#ff6b00] rounded-sm opacity-0 active:opacity-100 transition-opacity"></div>
                                        </div>
                                        <span className="text-xs font-bold text-gray-700 group-hover:text-black">{step}</span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              </div>
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
                    {c.icone_url || resolveTrophyImage(c.instrumento, c.classe) ? (
                      <img src={c.icone_url || resolveTrophyImage(c.instrumento, c.classe)} alt={c.nome} className="w-full h-full object-contain p-1" />
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
                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center text-[8px] font-black text-black">
                    <span>XP DO PRÓXIMO NÍVEL</span>
                    <span>{xp % 1000} / 1000 XP</span>
                  </div>
                  <div className="h-6 bg-black p-1 border-4 border-black overflow-hidden w-full">
                    <div 
                      className="h-full bg-[#ff6b00] transition-all duration-500" 
                      style={{ width: `${(xp % 1000) / 10}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Seção de Conquistas e Troféus - Galeria Dinâmica */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-white font-black text-xs uppercase tracking-widest">🏆 GALERIA DE TROFÉUS E CONQUISTAS</h3>
                  <div className="flex-1 border-t-2 border-dashed border-[#3d2d26]"></div>
                </div>
                
                {(() => {
                  const studentCourses = alunoData?.matriculas?.map((m: any) => m.cursos?.nome?.toLowerCase() || '') || [];
                  const isCordas = studentCourses.some((c: string) => c.includes('violão') || c.includes('guitarra') || c.includes('baixo') || c.includes('ukulele'));
                  const isTeclado = studentCourses.some((c: string) => c.includes('teclado') || c.includes('piano'));
                  const isBateria = studentCourses.some((c: string) => c.includes('bateria'));
                  const isVocal = studentCourses.some((c: string) => c.includes('vocal') || c.includes('canto'));

                  const filteredConquistas = todasConquistas?.filter((c: any) => {
                     const inst = c.instrumento || 'Teoria Musical';
                     if (inst === 'Teoria Musical' || inst === 'Geral') return true;
                     if (inst === 'Cordas (Violão/Guitarra/Baixo)' && isCordas) return true;
                     if (inst === 'Teclado / Piano' && isTeclado) return true;
                     if (inst === 'Bateria' && isBateria) return true;
                     if (inst === 'Técnica Vocal' && isVocal) return true;
                     return false;
                  }) || [];

                  if (filteredConquistas.length === 0) {
                    return (
                      <div className="bg-[#261812] border-4 border-black p-6 text-center">
                        <p className="text-[#8e7164] font-black text-[9px] uppercase">Nenhum troféu cadastrado na galeria ainda.</p>
                      </div>
                    );
                  }

                  return (
                  <div className="space-y-6">
                    {[
                      { key: 'Supremo', label: '👑 SUPREMO (2.000 XP)', border: 'border-[#d4af37]', text: 'text-[#d4af37]', bgGrad: 'from-[#d4af37]/20 via-[#261812] to-[#261812]', glow: 'rgba(212, 175, 55, 0.4)' },
                      { key: 'Lendario', label: '🔥 LENDÁRIO (1.200 XP)', border: 'border-[#f97316]', text: 'text-[#f97316]', bgGrad: 'from-[#f97316]/20 via-[#261812] to-[#261812]', glow: 'rgba(249, 115, 22, 0.4)' },
                      { key: 'Epico', label: '🔮 ÉPICO (750 XP)', border: 'border-[#a855f7]', text: 'text-[#a855f7]', bgGrad: 'from-[#a855f7]/20 via-[#261812] to-[#261812]', glow: 'rgba(168, 85, 247, 0.4)' },
                      { key: 'Raro', label: '⭐ RARO (500 XP)', border: 'border-[#3b82f6]', text: 'text-[#3b82f6]', bgGrad: 'from-[#3b82f6]/20 via-[#261812] to-[#261812]', glow: 'rgba(59, 130, 246, 0.4)' },
                      { key: 'Especial', label: '⚡ ESPECIAL (250 XP - CUMULATIVO)', border: 'border-[#22c55e]', text: 'text-[#22c55e]', bgGrad: 'from-[#22c55e]/20 via-[#261812] to-[#261812]', glow: 'rgba(34, 197, 94, 0.4)' }
                    ].map((categoria) => {
                      const conquistasDaCategoria = filteredConquistas.filter(
                        (c: any) => (c.classe || 'Especial').toLowerCase() === categoria.key.toLowerCase()
                      );

                      if (conquistasDaCategoria.length === 0) return null;

                      return (
                        <div key={categoria.key} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 bg-black border-2 ${categoria.border} ${categoria.text}`}>
                              {categoria.label}
                            </span>
                            <div className={`flex-1 border-t border-dashed border-[#3d2d26]`}></div>
                          </div>

                          <div className="flex gap-3 overflow-x-auto pb-4 snap-x scrollbar-hide">
                            {conquistasDaCategoria.map((conquista: any) => {
                              const conquistadoInstancias = alunoData?.conquistas?.filter(
                                (c: any) => Number(c.id) === Number(conquista.id) || Number(c.conquista_id) === Number(conquista.id)
                              ) || [];
                              const conquistadoCount = conquistadoInstancias.length;
                              const conquistado = conquistadoCount > 0;
                              const solicitacaoPendente = alunoData?.solicitacoes?.find(
                                (s: any) => Number(s.conquista_id) === Number(conquista.id) && s.status === 'pendente'
                              );

                              const classeEfetiva = conquista.classe || 'Especial';
                              
                              let cardStyle = "";
                              let badgeIconStyle = "";
                              let customStyle: React.CSSProperties = {};

                              if (conquistado) {
                                cardStyle = `bg-gradient-to-r ${categoria.bgGrad} border-4 ${categoria.border} p-2 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 transition-all min-w-[200px] sm:min-w-[240px] shrink-0 snap-center relative`;
                                badgeIconStyle = `w-10 h-10 bg-[#2d211b] border-2 ${categoria.border} flex items-center justify-center text-xl shrink-0`;
                                customStyle = { boxShadow: `0 0 12px ${categoria.glow}` };
                              } else if (solicitacaoPendente) {
                                cardStyle = "bg-[#1f1510] border-4 border-dashed border-[#8e7164] opacity-80 p-2 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 transition-all min-w-[200px] sm:min-w-[240px] shrink-0 snap-center relative";
                                badgeIconStyle = "w-10 h-10 bg-[#2d211b] border-2 border-[#8e7164] flex items-center justify-center text-xl shrink-0 grayscale opacity-60";
                              } else {
                                cardStyle = "bg-[#1f1510] border-4 border-black/80 opacity-90 p-2 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 hover:border-white/20 transition-all min-w-[200px] sm:min-w-[240px] shrink-0 snap-center relative";
                                badgeIconStyle = "w-10 h-10 bg-[#2d211b] border-2 border-black flex items-center justify-center text-xl shrink-0 grayscale opacity-40";
                              }

                              return (
                                <div key={conquista.id} className={cardStyle} style={customStyle}>
                                  <div className={badgeIconStyle}>
                                    {conquista.icone_url || resolveTrophyImage(conquista.instrumento, conquista.classe) ? (
                                      <img src={conquista.icone_url || resolveTrophyImage(conquista.instrumento, conquista.classe)} alt="" className="w-full h-full object-cover p-2" />
                                    ) : (
                                      <span>{conquista.icone || '🏆'}</span>
                                    )}
                                  </div>

                                  <div className="flex-1 w-full min-w-0 flex flex-col justify-between h-full">
                                    <div>
                                      <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                                        <h4 className={`font-black text-[10px] uppercase leading-tight ${conquistado ? categoria.text : 'text-[#feccba]'}`}>
                                          {conquista.nome}
                                        </h4>
                                        {classeEfetiva === 'Especial' && (
                                          <span className="text-[5px] font-black uppercase text-[#22c55e] bg-black border border-[#22c55e] px-1 py-0.5 rounded-none leading-none">
                                            CUMULATIVO 🔄
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-white/60 font-black text-[8px] uppercase mt-1.5 leading-snug line-clamp-2">
                                        {conquista.descricao || 'Nenhuma descrição fornecida.'}
                                      </p>
                                    </div>

                                      {conquistado ? (
                                        <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-2 flex-wrap">
                                          <span className="text-[6px] font-black uppercase text-green-400 bg-black/40 border border-green-400 px-1 py-0.5 rounded-none leading-none">
                                            DESBLOQUEADO ✅ {conquistadoCount > 1 && `(${conquistadoCount}X)`}
                                          </span>
                                          {conquistadoInstancias[0]?.data_conquista && (
                                            <span className="text-white/40 font-mono text-[5px] uppercase">
                                              {conquistadoCount > 1 ? 'ÚLTIMO EM ' : 'EM '}
                                              {new Date(conquistadoInstancias[0].data_conquista).toLocaleDateString('pt-BR')}
                                            </span>
                                          )}
                                        </div>
                                      ) : solicitacaoPendente ? (
                                        <div className="mt-2">
                                          <span className="text-[6px] font-black uppercase text-yellow-400 bg-black/40 border border-yellow-400 px-1 py-0.5 rounded-none leading-none animate-pulse inline-block">
                                            PENDENTE ⏳ AGUARDANDO APROVAÇÃO
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="mt-2">
                                          <span className="text-[6px] font-black uppercase text-white/40 bg-black/40 border border-white/20 px-1 py-0.5 rounded-none leading-none inline-block">
                                            BLOQUEADO 🔒
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                  <div className="sm:absolute sm:bottom-3 sm:right-3 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-end gap-1.5 w-full sm:w-auto mt-2 sm:mt-0">
                                    <span className={`font-black text-[8px] bg-black border ${conquistado ? `${categoria.border} ${categoria.text}` : 'border-black text-[#ff6b00]'} px-1.5 py-0.5 leading-none`}>
                                      +{conquista.pontos || 100} XP
                                    </span>

                                    {/* Se for Especial (cumulativa), permite solicitar novamente, contanto que não haja solicitação pendente para esse troféu */}
                                    {((!conquistado || classeEfetiva === 'Especial') && !solicitacaoPendente) && (
                                      <button
                                        onClick={() => handleSolicitarTrofeu(conquista.id)}
                                        className="bg-[#4ade80] hover:bg-[#22c55e] text-black px-1.5 py-1 border-2 border-black font-black uppercase text-[7px] shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none transition-all"
                                      >
                                        🚀 SOLICITAR
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  );
                })()}
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


        {/* Botão Flutuante Musiclass Tools */}
        <button
          onClick={() => setShowTools(true)}
          className="fixed md:absolute bottom-24 right-4 z-40 bg-[#ff6b00] text-white border-4 border-black p-2.5 shadow-[4px_4px_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none font-black text-[8px] uppercase tracking-wider hover:bg-[#ff8c3a] flex items-center gap-1 cursor-pointer"
        >
          🎸 FERRAMENTAS
        </button>

        {/* Modal de Ferramentas */}
        {showTools && (
          <div className="fixed md:absolute inset-0 bg-black/90 flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
            <div className="w-full max-w-[500px] md:max-w-[560px]">
              <MusiclassTools onClose={() => setShowTools(false)} />
            </div>
          </div>
        )}

        {/* BOTTOM NAV — Mobile */}
        <nav className="fixed md:absolute bottom-0 left-0 right-0 md:left-auto md:right-auto md:w-full h-20 bg-[#261812] border-t-8 border-black flex items-center justify-around px-2 z-50">
          {[
            { icon: Home, label: 'HOME', tab: 'home' as const },
            { icon: Flame, label: 'TREINO', tab: 'treino' as const },
            { icon: Trophy, label: 'RANK', tab: 'ranking' as const },
            { icon: BookOpen, label: 'AULAS', tab: 'aulas' as const },
            { icon: Gamepad2, label: 'JOGOS', tab: 'jogos' as const },
            { icon: User, label: 'PERFIL', tab: 'perfil' as const },
          ].map((item) => (
            <button key={item.tab} onClick={() => { setActiveTab(item.tab); if (item.tab === 'ranking') fetchRanking(); else if (item.tab === 'treino') fetchTreinos(); }} className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.tab ? 'translate-y-[-4px]' : 'opacity-50'}`}>
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

      {/* Aluno Profile Modal */}
      {isAlunoModalOpen && selectedAluno && (
        <PerfilEstudanteModal 
          selectedAluno={selectedAluno} 
          user={user} 
          onClose={() => setIsAlunoModalOpen(false)} 
        />
      )}
    </div>
  );
}
