import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { 
  Bell, 
  Home, 
  Users, 
  Calendar, 
  User, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  ChevronLeft,
  Save,
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
  LogOut,
  Music,
  Settings2,
  Mic,
  Volume2,
  Square,
  PenTool,
  CheckCircle,
  Flame,
  Video,
  Gamepad2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { OneSignalService } from '../services/OneSignalService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MusicEngine, ROOTS, CHORD_TYPES, EXTENSIONS, SCALES } from '../lib/musicEngine';
import { ChordVisualizer, DrumsVisualizer } from '../components/musiclass/ChordVisualizers';
import { MusiclassTools } from '../components/musiclass/MusiclassTools';
import { ChordRush } from '../components/jogos/ChordRush';
import { TriadeNinja } from '../components/jogos/TriadeNinja';
import { getPedagogicalSuggestion } from '../lib/pedagogicalAI';
import PerfilEstudanteModal, { resolveTrophyImage } from '../components/PerfilEstudanteModal';
import { AvatarPixel } from '../components/AvatarPixel';
import { FONTS, TILES } from '../utils/avatarAssets';

class MelodySynth {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playNote(frequency: number, duration = 0.4) {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playNoteByName(noteName: string) {
    const note = noteName.slice(0, -1);
    const octave = parseInt(noteName.slice(-1), 10) || 4;
    
    const baseFreqs: Record<string, number> = {
      'C': 261.63, 'C#': 277.18, 'Db': 277.18, 'D': 293.66, 'D#': 311.13, 'Eb': 311.13, 
      'E': 329.63, 'F': 349.23, 'F#': 369.99, 'Gb': 369.99, 'G': 392.00, 'G#': 415.30, 
      'Ab': 415.30, 'A': 440.00, 'A#': 466.16, 'Bb': 466.16, 'B': 493.88
    };
    
    const baseFreq = baseFreqs[note.toUpperCase()];
    if (!baseFreq) return;
    
    const factor = Math.pow(2, octave - 4);
    this.playNote(baseFreq * factor, 0.4);
  }
}

const melodySynth = new MelodySynth();

class DrumSynth {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playKick(time: number) {
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);
    
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
    
    osc.start(time);
    osc.stop(time + 0.3);
  }

  playSnare(time: number) {
    this.init();
    if (!this.ctx) return;
    
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.7, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);
    
    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    
    noise.start(time);
    noise.stop(time + 0.2);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  playHihat(time: number) {
    this.init();
    if (!this.ctx) return;
    
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start(time);
    noise.stop(time + 0.05);
  }

  playRimshot(time: number) {
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, time);
    osc.frequency.exponentialRampToValueAtTime(500, time + 0.08);
    
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
    
    osc.start(time);
    osc.stop(time + 0.08);
  }
}

const synth = new DrumSynth();

const translateNote = (note: string): string => {
  return note.replace(/[\d*]+$/, '');
};

// Helper para pegar os dias da semana atual (Segunda a Domingo)
const getWeekDays = (weekOffset = 0) => {
  const today = new Date();
  today.setDate(today.getDate() + (weekOffset * 7));
  const currentDay = today.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  // Ajusta para que Segunda-feira seja o primeiro dia da semana (índice 0)
  const distance = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + distance);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }
  return days;
};

// Helper para obter a data local de uma aula no formato yyyy-MM-dd de forma robusta
const getAulaLocalDateStr = (aula: any) => {
  if (!aula || !aula.data) return '';
  if (typeof aula.data === 'string') {
    return aula.data.substring(0, 10);
  }
  try {
    const d = new Date(aula.data);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    return '';
  }
};

export default function AreaProfessor() {
  const { user, logout } = useAuth();
  const pdfRef = useRef<HTMLDivElement>(null);
  const [professorData, setProfessorData] = useState<any>(null);
  const [disponibilidade, setDisponibilidade] = useState<string[]>([]);
  const [salvandoDisponibilidade, setSalvandoDisponibilidade] = useState(false);
  const [diaOffset, setDiaOffset] = useState(0);
  const [aulasHoje, setAulasHoje] = useState<any[]>([]);
  const [alunosList, setAlunosList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTools, setShowTools] = useState(false);
  
  // Modal de registro de aula existente (Musiclass)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAula, setSelectedAula] = useState<any>(null);
  
  // Estados do formulário de aula existente
  const [statusAula, setStatusAula] = useState('realizada');
  const [conteudo, setConteudo] = useState('');
  const [tarefaCasa, setTarefaCasa] = useState('');
  const [xpGanho, setXpGanho] = useState(50);
  const [midias, setMidias] = useState<{ titulo: string; url: string }[]>([]);
  const [linkTitulo, setLinkTitulo] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  // Modal de criação de aula avulsa (Musiclass)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newAulaAlunoId, setNewAulaAlunoId] = useState('');
  const [newAulaData, setNewAulaData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newAulaHorario, setNewAulaHorario] = useState(format(new Date(), 'HH:mm'));
  const [newAulaCurso, setNewAulaCurso] = useState('Piano');
  const [newAulaStatus, setNewAulaStatus] = useState('realizada');
  const [newAulaConteudo, setNewAulaConteudo] = useState('');
  const [newAulaTarefa, setNewAulaTarefa] = useState('');
  const [newAulaXp, setNewAulaXp] = useState(50);
  const [newAulaMidias, setNewAulaMidias] = useState<{ titulo: string; url: string }[]>([]);
  const [newLinkTitulo, setNewLinkTitulo] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Estados de navegação e Modo Apresentação do Professor
  const [activeProfessorTab, setActiveProfessorTab] = useState<'home' | 'jogos' | 'agenda' | 'perfil' | 'playground' | 'ranking' | 'treinos'>('home');
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);

  const [doublePointsGame, setDoublePointsGame] = useState<string | null>(null);

  // Estados dos Jogos
  const [isPlayingAcordeGenius, setIsPlayingAcordeGenius] = useState(false);
  const [isPlayingChordRush, setIsPlayingChordRush] = useState(false);
  const [isPlayingTriadeNinja, setIsPlayingTriadeNinja] = useState(false);
  const [geniusState, setGeniusState] = useState<'idle' | 'playback' | 'playing' | 'gameover'>('idle');
  const [geniusSequence, setGeniusSequence] = useState<number[]>([]);
  const [geniusUserSequence, setGeniusUserSequence] = useState<number[]>([]);
  const [geniusScore, setGeniusScore] = useState(0);
  const [geniusActivePad, setGeniusActivePad] = useState<number | null>(null);

  // Histórico Financeiro
  const [isFinanceiroModalOpen, setIsFinanceiroModalOpen] = useState(false);

  // Estados do God Mode (Anthony)
  const [godModeActive, setGodModeActive] = useState(false);
  const [godModeJogosXp, setGodModeJogosXp] = useState(false);
  const [godModeSelectedAluno, setGodModeSelectedAluno] = useState('');
  const [godModeAmount, setGodModeAmount] = useState('');
  const [godModeLoading, setGodModeLoading] = useState(false);

  // Estados do Ranking e Conquistas
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [conquistasList, setConquistasList] = useState<any[]>([]);
  const [solicitacoesList, setSolicitacoesList] = useState<any[]>([]);
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignData, setAssignData] = useState({ aluno_id: '', conquista_id: '' });
  const [agendaCompleta, setAgendaCompleta] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAgendaStatus, setFilterAgendaStatus] = useState<'todas' | 'pendente' | 'realizada' | 'falta_aluno'>('todas');
  const [selectedWeekDay, setSelectedWeekDay] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [agendaWeekOffset, setAgendaWeekOffset] = useState<number>(0);

  const handleMudarSemana = (offsetDiff: number) => {
    setAgendaWeekOffset(prevOffset => {
      const newOffset = prevOffset + offsetDiff;
      const newDays = getWeekDays(newOffset);
      try {
        const oldDays = getWeekDays(prevOffset);
        const oldIndex = oldDays.findIndex(d => format(d, 'yyyy-MM-dd') === selectedWeekDay);
        if (oldIndex >= 0 && oldIndex < 7) {
          setSelectedWeekDay(format(newDays[oldIndex], 'yyyy-MM-dd'));
        } else {
          setSelectedWeekDay(format(newDays[0], 'yyyy-MM-dd'));
        }
      } catch (e) {
        setSelectedWeekDay(format(newDays[0], 'yyyy-MM-dd'));
      }
      return newOffset;
    });
  };

  // NOVOS ESTADOS ADICIONADOS PARA NOTIFICAÇÕES E TREINOS E HISTÓRICO
  const [selectedAlunoHistorico, setSelectedAlunoHistorico] = useState<{ id: string; nome: string } | null>(null);
  const [historicoAulas, setHistoricoAulas] = useState<any[]>([]);
  const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  // Perfil Estudante Modal
  const [isAlunoModalOpen, setIsAlunoModalOpen] = useState(false);
  const [selectedAluno, setSelectedAluno] = useState<any | null>(null);

  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);

  const [treinosAlunos, setTreinosAlunos] = useState<any[]>([]);
  const [loadingTreinos, setLoadingTreinos] = useState(false);
  const [selectedTreinoVideo, setSelectedTreinoVideo] = useState<string | null>(null);
  const [isTreinoVideoModalOpen, setIsTreinoVideoModalOpen] = useState(false);
  const [searchTreino, setSearchTreino] = useState('');
  const [isCheckinConfirmModalOpen, setIsCheckinConfirmModalOpen] = useState(false);
  const [checkinConfirmData, setCheckinConfirmData] = useState<any>(null);
  // Estados Ricos do Musiclass compartilhados
  const [mcChords, setMcChords] = useState<any[]>([]);
  const [mcScales, setMcScales] = useState<any[]>([]);
  const [mcExercises, setMcExercises] = useState<any[]>([]);
  const [mcRecordings, setMcRecordings] = useState<any[]>([]);
  const [mcTablatures, setMcTablatures] = useState<any[]>([]);
  const [mcDrums, setMcDrums] = useState<any[]>([]);
  const [mcMelody, setMcMelody] = useState<any[]>([]);
  const [mcImages, setMcImages] = useState<string[]>([]);
  const [mcChecklist, setMcChecklist] = useState<string[]>([]);
  const [mcChecklistInput, setMcChecklistInput] = useState('');
  const [melodyPhrases, setMelodyPhrases] = useState<string[][]>([]); // frases da melodia atual
  const [showMelodyPhrases, setShowMelodyPhrases] = useState<boolean>(false);
  const [mcActiveTab, setMcActiveTab] = useState<'geral' | 'acordes' | 'escalas' | 'tablatura' | 'bateria' | 'exercicios' | 'studio' | 'melodia'>('geral');
  const [showFichaChoice, setShowFichaChoice] = useState(false);
  const [loadingUltimaAula, setLoadingUltimaAula] = useState(false);

  // Novos estados do Musiclass v2
  const [currentGroupName, setCurrentGroupName] = useState('INTRO');
  const [newMelodyName, setNewMelodyName] = useState('SOLO PRINCIPAL');
  const [newMelodyNotes, setNewMelodyNotes] = useState<string[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedBeatTablatura, setSelectedBeatTablatura] = useState<{ strIdx: number, beat: number } | null>(null);

  // Estados para montadores de acordes personalizados v2
  const [isKeyboardCustomModalOpen, setIsKeyboardCustomModalOpen] = useState(false);
  const [customTecladoName, setCustomTecladoName] = useState('C');
  const [customTecladoActiveKeys, setCustomTecladoActiveKeys] = useState<number[]>([]);

  // Biblioteca de Materiais Salvos
  const [materiaisSalvos, setMateriaisSalvos] = useState<any[]>([]);
  const [showBibliotecaModal, setShowBibliotecaModal] = useState<'tablatura' | 'melodia' | null>(null);

  const fetchMateriaisSalvos = async (tipo: string) => {
    try {
      const token = localStorage.getItem('acorde_token');
      const res = await fetch(`/api/materiais-salvos?tipo=${tipo}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setMateriaisSalvos(await res.json());
    } catch(e) { console.error(e); }
  };

  const deleteMaterialSalvo = async (id: number) => {
    if (!confirm('Deseja realmente deletar este material salvo da sua biblioteca?')) return;
    try {
      const token = localStorage.getItem('acorde_token');
      const res = await fetch(`/api/materiais-salvos/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setMateriaisSalvos(prev => prev.filter(m => m.id !== id));
        toast.success('Deletado da biblioteca.');
      }
    } catch(e) {}
  };

  const [isGuitarCustomModalOpen, setIsGuitarCustomModalOpen] = useState(false);
  const [customGuitarName, setCustomGuitarName] = useState('C');
  const [customGuitarStrings, setCustomGuitarStrings] = useState<{ fret: number | null, finger: number | null }[]>(
    Array(6).fill(null).map(() => ({ fret: 0, finger: null }))
  );
  
  // Estados para seleção de acorde
  const [selRoot, setSelRoot] = useState('C');
  const [selType, setSelType] = useState('maj');
  const [selExt, setSelExt] = useState('none');
  const [selBass, setSelBass] = useState('none');
  const [mcPlaygroundInstrument, setMcPlaygroundInstrument] = useState<string>('Teclado');
  
  // Estados para seleção de escala
  const [selScaleRoot, setSelScaleRoot] = useState('C');
  const [selScaleId, setSelScaleId] = useState('major');

  // Estados de Tablatura Interativa
  const [newTabName, setNewTabName] = useState('RIFF PRINCIPAL');
  const [newTabMatrix, setNewTabMatrix] = useState<string[][]>(Array(6).fill(null).map(() => Array(32).fill('')));

  // Estados de Bateria Sequenciador
  const [newDrumName, setNewDrumName] = useState('BATIDA ANOS 80');
  const [newDrumBpm, setNewDrumBpm] = useState(120);
  const [newDrumMatrix, setNewDrumMatrix] = useState<boolean[][]>(Array(4).fill(null).map(() => Array(16).fill(false)));
  const [isPlayingDrum, setIsPlayingDrum] = useState(false);
  const [drumIntervalId, setDrumIntervalId] = useState<any>(null);
  const [drumCurrentStep, setDrumCurrentStep] = useState(0);
  // Cursor de passo ativo no sequenciador (0-15) — ao clicar num pad MPC, grava no cursor e avança
  const [selectedBeatStep, setSelectedBeatStep] = useState(0);

  // Estados para adicionar exercícios
  const [exTitle, setExTitle] = useState('');
  const [exDesc, setExDesc] = useState('');
  const [exPoints, setExPoints] = useState(50);

  // Estados de gravação de áudio e IA
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [studioLoading, setStudioLoading] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);


  const xp = Number(professorData?.xp) || 8450;
  const xpMax = 10000;
  const nivel = Math.floor(xp / 1000) + 1;
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
      fetch(`/api/agenda?start=2020-01-01&end=2030-01-01`, { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/alunos', { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/gamificacao/config-dobro', { headers }).then(r => r.ok ? r.json() : { success: false })
    ]).then(([me, agenda, alunos, configDobro]) => {
      if (me) {
        setProfessorData(me);
        if (me.disponibilidade && typeof me.disponibilidade === 'object' && !Array.isArray(me.disponibilidade)) {
          const dispArray: string[] = [];
          Object.entries(me.disponibilidade).forEach(([dia, horas]: [string, any]) => {
             if (Array.isArray(horas)) {
                horas.forEach((h: string) => dispArray.push(`${dia}-${h}`));
             }
          });
          setDisponibilidade(dispArray);
        } else if (Array.isArray(me.disponibilidade)) {
          setDisponibilidade(me.disponibilidade);
        }
      }
      if (alunos) {
        // Filtra alunos arquivados ou ativos, e verifica se o aluno tem vínculo com o professor logado
        const profId = me ? me.id : (professorData ? professorData.id : null);
        const sortedAlunos = Array.isArray(alunos) 
          ? alunos.filter((a: any) => {
              if (a.status === 'arquivado') return false;
              if (user?.role === 'admin') return true;
              if (!profId) return false;
              
              const ehMeuAluno = a.matriculas?.some((m: any) => Number(m.professor_id) === Number(profId));
              const naAgenda = agenda ? (Array.isArray(agenda) ? agenda : []).some((ag: any) => Number(ag.aluno_id) === Number(a.id) && Number(ag.professor_id) === Number(profId)) : false;
              
              return ehMeuAluno || naAgenda;
            }).sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || '')) 
          : [];
        setAlunosList(sortedAlunos);
      }
      
      if (agenda) {
        const profIdParaFiltro = me ? me.id : (professorData ? professorData.id : null);
        const sortedAgenda = (Array.isArray(agenda) ? agenda : [])
          .filter((ag: any) => !profIdParaFiltro || Number(ag.professor_id) === Number(profIdParaFiltro))
          .sort((a: any, b: any) => {
            const dateCompare = (a.data || '').localeCompare(b.data || '');
            if (dateCompare !== 0) return dateCompare;
            return (a.horario || '').localeCompare(b.horario || '');
          });
        setAgendaCompleta(sortedAgenda);
      }
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (agendaCompleta) {
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + diaOffset);
      const todayStr = format(baseDate, 'yyyy-MM-dd');
      
      const hojeAulas = agendaCompleta
        .filter((a: any) => getAulaLocalDateStr(a) === todayStr)
        .sort((a: any, b: any) => (a.horario || '').localeCompare(b.horario || ''));
        
      setAulasHoje(hojeAulas);
    }
  }, [agendaCompleta, diaOffset]);

  useEffect(() => {
    loadData();
    fetchSolicitacoes();
    fetchNotificacoes();
    fetchTreinos();

    // Fetch config dobro
    const token = localStorage.getItem('acorde_token');
    if (token) {
      fetch('/api/gamificacao/config-dobro', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (data.success) setDoublePointsGame(data.doublePointsGame);
        }).catch(console.error);

      // Fetch God Mode status (Anthony apenas)
      fetch('/api/godmode/status', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data) {
            setGodModeActive(true);
            setGodModeJogosXp(data.jogos_dao_xp);
          }
        }).catch(() => console.log('God Mode inativo para este perfil (esperado).'));
    }
    
    // Atualização em background de notificações de 30 em 30 segundos
    const timer = setInterval(() => {
      fetchNotificacoes();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchNotificacoes = async () => {
    try {
      const token = localStorage.getItem('acorde_token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch('/api/notificacoes', { headers });
      if (res.ok) {
        const data = await res.json();
        setNotificacoes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
    }
  };

  const marcarNotificacaoLida = async (notifId: number) => {
    try {
      const token = localStorage.getItem('acorde_token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`/api/notificacoes/${notifId}/lida`, {
        method: 'POST',
        headers
      });
      if (res.ok) {
        setNotificacoes(prev => prev.map(n => n.id === notifId ? { ...n, lida: true } : n));
        playRetroSound(880, 'triangle', 0.05); // som retrô de marcar como lido
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  const limparNotificacoes = async () => {
    try {
      const token = localStorage.getItem('acorde_token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch('/api/notificacoes/limpar', {
        method: 'POST',
        headers
      });
      if (res.ok) {
        setNotificacoes([]);
        toast.success('Notificações limpas!');
        playSuccessSound();
      }
    } catch (error) {
      console.error('Erro ao limpar notificações:', error);
      toast.error('Erro ao limpar notificações.');
    }
  };

  const fetchTreinos = async () => {
    setLoadingTreinos(true);
    try {
      const token = localStorage.getItem('acorde_token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch('/api/treinos/prof', { headers });
      if (res.ok) {
        const data = await res.json();
        setTreinosAlunos(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Erro ao buscar treinos dos alunos:', error);
    } finally {
      setLoadingTreinos(false);
    }
  };

  const handleAbrirHistoricoAluno = async (alunoId: string | number, nomeAluno: string) => {
    setSelectedAlunoHistorico({ id: String(alunoId), nome: nomeAluno });
    setIsHistoricoModalOpen(true);
    setLoadingHistorico(true);
    playRetroSound(523.25, 'triangle', 0.1); // som chiptune de clique de abertura
    try {
      const token = localStorage.getItem('acorde_token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`/api/alunos/${alunoId}/historico-aulas`, { headers });
      if (res.ok) {
        const data = await res.json();
        setHistoricoAulas(Array.isArray(data) ? data : []);
      } else {
        setHistoricoAulas([]);
      }
    } catch (error) {
      console.error('Erro ao buscar histórico de aulas:', error);
      setHistoricoAulas([]);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const fetchRanking = async () => {
    setLoadingRanking(true);
    try {
      const token = localStorage.getItem('acorde_token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch('/api/gamificacao/ranking', { headers });
      if (res.ok) {
        const data = await res.json();
        setRankingData(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Erro ao buscar ranking:', e);
    } finally {
      setLoadingRanking(false);
    }
  };

  const fetchConquistas = async () => {
    try {
      const token = localStorage.getItem('acorde_token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch('/api/gamificacao/conquistas', { headers });
      if (res.ok) {
        const data = await res.json();
        setConquistasList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Erro ao buscar conquistas:', e);
    }
  };

  const playRetroSound = (frequency: number, type: 'sine' | 'triangle' | 'square' | 'sawtooth' = 'triangle', duration: number = 0.25) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.log('Audio not supported or disabled');
    }
  };

  const handleGeniusPadClick = (index: number) => {
    if (geniusState !== 'playing') return;
    
    // Play sound and light up
    const freqs = [329.63, 261.63, 220.00, 164.81]; // E4, C4, A3, E3
    playRetroSound(freqs[index], 'square', 0.2);
    setGeniusActivePad(index);
    setTimeout(() => setGeniusActivePad(null), 200);

    const newUserSeq = [...geniusUserSequence, index];
    setGeniusUserSequence(newUserSeq);

    // Check if wrong
    if (newUserSeq[newUserSeq.length - 1] !== geniusSequence[newUserSeq.length - 1]) {
      setGeniusState('gameover');
      playRetroSound(100, 'sawtooth', 0.5); // erro
      return;
    }

    // Check if sequence completed
    if (newUserSeq.length === geniusSequence.length) {
      setGeniusScore(s => s + 1);
      setGeniusState('playback');
      setTimeout(() => {
        const nextSeq = [...geniusSequence, Math.floor(Math.random() * 4)];
        setGeniusSequence(nextSeq);
        setGeniusUserSequence([]);
        playGeniusSequence(nextSeq);
      }, 1000);
    }
  };

  const playGeniusSequence = async (seq: number[]) => {
    setGeniusState('playback');
    const freqs = [329.63, 261.63, 220.00, 164.81];
    for (let i = 0; i < seq.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 400));
      const padIndex = seq[i];
      setGeniusActivePad(padIndex);
      playRetroSound(freqs[padIndex], 'square', 0.25);
      await new Promise(resolve => setTimeout(resolve, 300));
      setGeniusActivePad(null);
    }
    setGeniusState('playing');
  };

  const startGeniusGame = () => {
    setGeniusScore(0);
    setGeniusUserSequence([]);
    const firstSeq = [Math.floor(Math.random() * 4)];
    setGeniusSequence(firstSeq);
    playGeniusSequence(firstSeq);
  };

  const playSuccessSound = () => {
    playRetroSound(523.25, 'square', 0.15); // C5
    setTimeout(() => {
      playRetroSound(659.25, 'square', 0.25); // E5
    }, 120);
  };

  const playFailSound = () => {
    playRetroSound(220, 'sawtooth', 0.15); // A3
    setTimeout(() => {
      playRetroSound(146.83, 'sawtooth', 0.3); // D3
    }, 120);
  };

  const fetchSolicitacoes = async () => {
    try {
      const token = localStorage.getItem('acorde_token');
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch('/api/gamificacao/solicitacoes', { headers });
      if (res.ok) {
        const data = await res.json();
        setSolicitacoesList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Erro ao buscar solicitações:', e);
    }
  };

  const handleRevisarSolicitacao = async (id: number, status: 'aprovada' | 'rejeitada') => {
    try {
      const token = localStorage.getItem('acorde_token');
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const res = await fetch(`/api/gamificacao/solicitacoes/${id}/revisar`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ status })
      });
      
      if (res.ok) {
        if (status === 'aprovada') {
          playSuccessSound();
          toast.success('🏆 SOLICITAÇÃO APROVADA COM SUCESSO!');
        } else {
          playFailSound();
          toast.success('❌ Solicitação rejeitada.');
        }
        fetchSolicitacoes();
        fetchRanking(); // Atualiza o ranking, caso mude o XP
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Erro ao processar solicitação');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão');
    }
  };

  const handleAssignConquista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignData.aluno_id || !assignData.conquista_id) {
      toast.error('Preencha todos os campos!');
      return;
    }
    
    try {
      const token = localStorage.getItem('acorde_token');
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const res = await fetch('/api/gamificacao/atribuir', {
        method: 'POST',
        headers,
        body: JSON.stringify(assignData)
      });
      
      if (res.ok) {
        toast.success('CONQUISTA ATRIBUÍDA COM SUCESSO! 🏆');
        setIsAssignModalOpen(false);
        setAssignData({ aluno_id: '', conquista_id: '' });
        fetchRanking(); // recarrega o ranking
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Erro ao atribuir conquista ❌');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão com o servidor ❌');
    }
  };

  const copiarUltimaAula = async (alunoId: string) => {
    if (!alunoId) return;
    setLoadingUltimaAula(true);
    try {
      const token = localStorage.getItem('acorde_token');
      const res = await fetch(`/api/alunos/${alunoId}/ultima-aula`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const ultimaAula = await res.json();
        if (ultimaAula) {
          let conteudoText = ultimaAula.conteudo || '';
          let tarefaCasaText = ultimaAula.tarefa_casa || '';
          let chords: any[] = [];
          let scales: any[] = [];
          let exercises: any[] = [];
          let recordings: any[] = [];
          let tablatures: any[] = [];
          let drums: any[] = [];
          let melody: any[] = [];
          let images: any[] = [];

          try {
            if (ultimaAula.conteudo && ultimaAula.conteudo.trim().startsWith('{') && ultimaAula.conteudo.trim().endsWith('}')) {
              const richData = JSON.parse(ultimaAula.conteudo);
              if (richData.isRich) {
                conteudoText = richData.conteudoText || '';
                tarefaCasaText = richData.tarefaCasaText || '';
                chords = richData.chords || [];
                scales = richData.scales || [];
                exercises = richData.exercises || [];
                recordings = richData.recordings || [];
                tablatures = richData.tablatures || [];
                drums = richData.drums || [];
                melody = richData.melody || [];
                images = richData.images || [];
              }
            }
          } catch (e) {
            console.error('Erro ao ler JSON rico da aula anterior:', e);
          }

          setConteudo(conteudoText);
          setTarefaCasa(tarefaCasaText);
          setMcChords(chords);
          setMcScales(scales);
          setMcExercises(exercises);
          setMcRecordings(recordings);
          setMcTablatures(tablatures);
          setMcDrums(drums);
          setMcMelody(melody);
          setMcImages(images);

          try {
            if (typeof ultimaAula.midias === 'string') {
              setMidias(JSON.parse(ultimaAula.midias));
            } else if (Array.isArray(ultimaAula.midias)) {
              setMidias(ultimaAula.midias);
            } else {
              setMidias([]);
            }
          } catch {
            setMidias([]);
          }

          toast.success('DADOS DA AULA ANTERIOR COPIADOS COM SUCESSO! 🔄');
        } else {
          toast.info('ESTE ALUNO NÃO POSSUI NENHUMA AULA ANTERIOR REALIZADA.');
        }
      } else {
        toast.error('ERRO AO BUSCAR AULA ANTERIOR.');
      }
    } catch (err) {
      console.error(err);
      toast.error('ERRO DE CONEXÃO.');
    } finally {
      setLoadingUltimaAula(false);
      setShowFichaChoice(false);
    }
  };

  const openRegistroModal = (aula: any) => {
    setSelectedAula(aula);
    setStatusAula(aula.status === 'realizada' || aula.status === 'pendente' ? 'realizada' : aula.status);
    setXpGanho(Number(aula.xp_ganho) || 50);
    
    // Tenta decodificar dados ricos do Musiclass de dentro de conteudo
    let conteudoText = aula.conteudo || '';
    let tarefaCasaText = aula.tarefa_casa || '';
    let chords: any[] = [];
    let scales: any[] = [];
    let exercises: any[] = [];
    let recordings: any[] = [];
    let tablatures: any[] = [];
    let drums: any[] = [];
    let melody: any[] = [];
    let images: any[] = [];
    let checklist: string[] = [];

    try {
      if (aula.conteudo && aula.conteudo.trim().startsWith('{') && aula.conteudo.trim().endsWith('}')) {
        const richData = JSON.parse(aula.conteudo);
        if (richData.isRich) {
          conteudoText = richData.conteudoText || '';
          tarefaCasaText = richData.tarefaCasaText || '';
          chords = richData.chords || [];
          scales = richData.scales || [];
          exercises = richData.exercises || [];
          recordings = richData.recordings || [];
          tablatures = richData.tablatures || [];
          drums = richData.drums || [];
          melody = richData.melody || [];
          images = richData.images || [];
          checklist = richData.checklist || [];
        }
      }
    } catch (e) {
      console.error('Erro ao ler JSON rico:', e);
    }

    setConteudo(conteudoText);
    setTarefaCasa(tarefaCasaText);
    setMcChords(chords);
    setMcScales(scales);
    setMcExercises(exercises);
    setMcRecordings(recordings);
    setMcTablatures(tablatures);
    setMcDrums(drums);
    setMcMelody(melody);
    setMcImages(images);
    setMcChecklist(checklist);
    setMcActiveTab('geral');
    
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
    
    // Se a aula for pendente e não tiver conteúdo, oferece a escolha de cópia
    if (aula.status === 'pendente' && !conteudoText) {
      setShowFichaChoice(true);
    } else {
      setShowFichaChoice(false);
    }
    
    setIsModalOpen(true);
  };

  const openPreviewModal = (aula: any) => {
    setSelectedAula(aula);
    
    let conteudoText = aula.conteudo || '';
    let tarefaCasaText = aula.tarefa_casa || '';
    let chords: any[] = [];
    let scales: any[] = [];
    let exercises: any[] = [];
    let recordings: any[] = [];
    let tablatures: any[] = [];
    let drums: any[] = [];
    let melody: any[] = [];
    let images: any[] = [];
    let checklist: string[] = [];

    try {
      if (aula.conteudo && aula.conteudo.trim().startsWith('{') && aula.conteudo.trim().endsWith('}')) {
        const richData = JSON.parse(aula.conteudo);
        if (richData.isRich) {
          conteudoText = richData.conteudoText || '';
          tarefaCasaText = richData.tarefaCasaText || '';
          chords = richData.chords || [];
          scales = richData.scales || [];
          exercises = richData.exercises || [];
          recordings = richData.recordings || [];
          tablatures = richData.tablatures || [];
          drums = richData.drums || [];
          melody = richData.melody || [];
          images = richData.images || [];
          checklist = richData.checklist || [];
        }
      }
    } catch (e) {
      console.error('Erro ao ler JSON rico:', e);
    }

    setConteudo(conteudoText);
    setTarefaCasa(tarefaCasaText);
    setMcChords(chords);
    setMcScales(scales);
    setMcExercises(exercises);
    setMcRecordings(recordings);
    setMcTablatures(tablatures);
    setMcDrums(drums);
    setMcMelody(melody);
    setMcImages(images);
    setMcChecklist(checklist);

    setIsPreviewOpen(true);
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

  // Funções de Música e Estúdio do Musiclass
  const handleSetDoublePoints = async (jogo: string | null) => {
    const token = localStorage.getItem('acorde_token');
    try {
      const res = await fetch('/api/gamificacao/config-dobro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jogo })
      });
      const data = await res.json();
      if (data.success) {
        setDoublePointsGame(data.doublePointsGame);
        toast.success(jogo ? `Pontos em dobro ativados para ${jogo}!` : 'Pontos em dobro desativados.');
      } else {
        toast.error(data.error || 'Erro ao configurar pontos em dobro.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao configurar pontos em dobro.');
    }
  };

  const handleAddChord = () => {
    const chordData = MusicEngine.generateChord(selRoot, selType, selExt);
    if (chordData) {
      const notes = chordData.notes;
      const notesWithBass = selBass !== 'none' ? [selBass, ...notes.filter(n => n !== selBass)] : notes;
      setMcChords(prev => [...prev, {
        root: selRoot,
        typeId: selType,
        extId: selExt,
        bass: selBass,
        notes: notesWithBass,
        isCustom: false,
        // Salva o instrumento de criação para renderizar o diagrama correto no preview/PDF
        instrument: mcPlaygroundInstrument,
        group: currentGroupName
      }]);
    }
  };

  const handleAddScale = () => {
    const scaleNotes = MusicEngine.generateScale(selScaleRoot, selScaleId);
    const scaleName = SCALES.find(s => s.id === selScaleId)?.name || 'Escala';
    if (scaleNotes) {
      setMcScales(prev => [...prev, {
        root: selScaleRoot,
        scaleId: selScaleId,
        scaleName,
        notes: scaleNotes
      }]);
    }
  };

  const handleAddExercise = () => {
    if (!exTitle.trim()) return;
    setMcExercises(prev => [...prev, {
      title: exTitle.toUpperCase(),
      description: exDesc.toUpperCase(),
      points: exPoints
    }]);
    setExTitle('');
    setExDesc('');
  };

  // Funções da Bateria Eletrônica Musiclass
  const togglePlayDrum = () => {
    if (isPlayingDrum) {
      if (drumIntervalId) {
        clearInterval(drumIntervalId);
      }
      setIsPlayingDrum(false);
      setDrumIntervalId(null);
      setDrumCurrentStep(0);
    } else {
      setIsPlayingDrum(true);
      let step = drumCurrentStep;
      
      const intervalTime = (60 / newDrumBpm) / 4 * 1000;
      
      const id = setInterval(() => {
        // Toca as peças
        // newDrumMatrix[0] -> Kick
        // newDrumMatrix[1] -> Snare
        // newDrumMatrix[2] -> Hihat
        // newDrumMatrix[3] -> Rimshot
        // Nota: as matrizes reativas usam cópias atuais, logo lemos o estado atualizado
        setNewDrumMatrix(current => {
          if (current[0][step]) synth.playKick(0);
          if (current[1][step]) synth.playSnare(0);
          if (current[2][step]) synth.playHihat(0);
          if (current[3][step]) synth.playRimshot(0);
          return current;
        });
        
        setDrumCurrentStep(step);
        step = (step + 1) % 16;
      }, intervalTime);
      
      setDrumIntervalId(id);
    }
  };

  useEffect(() => {
    return () => {
      if (drumIntervalId) clearInterval(drumIntervalId);
    };
  }, [drumIntervalId]);

  const handleAddDrum = () => {
    if (!newDrumName.trim()) return;
    setMcDrums(prev => [...prev, {
      name: newDrumName.toUpperCase(),
      bpm: newDrumBpm,
      matrix: JSON.parse(JSON.stringify(newDrumMatrix))
    }]);
    setNewDrumMatrix(Array(4).fill(null).map(() => Array(16).fill(false)));
    setNewDrumName('BATIDA DO RITMO');
    alert('Bateria gravada com sucesso na aula!');
  };

  // Funções de Tablatura Musiclass
  const handleAddTablature = () => {
    if (!newTabName.trim()) return;
    setMcTablatures(prev => [...prev, {
      name: newTabName.toUpperCase(),
      matrix: JSON.parse(JSON.stringify(newTabMatrix))
    }]);
    setNewTabMatrix(Array(6).fill(null).map(() => Array(16).fill('')));
    setNewTabName('NOVO SOLO/RIFF');
    alert('Tablatura registrada com sucesso na aula!');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let options = {};
      const safeIsTypeSupported = (mime: string) => {
        try {
          return typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime);
        } catch (e) {
          return false;
        }
      };

      if (safeIsTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (safeIsTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (safeIsTypeSupported('audio/ogg')) {
        options = { mimeType: 'audio/ogg' };
      } else if (safeIsTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }

      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        const mime = recorder.mimeType || 'audio/webm';
        const ext = mime.includes('mp4') ? 'm4a' : 'webm';
        const audioBlob = new Blob(chunks, { type: mime });
        const file = new File([audioBlob], `gravacao_${Date.now()}.${ext}`, { type: mime });
        await uploadStudioFile(file);
      };
      
      setMediaRecorder(recorder);
      // start(1000): chunks são emitidos a cada 1s para garantir integridade do Blob no macOS/Safari
      recorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      alert('Não foi possível acessar o microfone. Verifique se concedeu permissões de áudio no seu navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
  };

  const uploadStudioFile = async (file: File) => {
    setStudioLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const token = localStorage.getItem('acorde_token');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      
      if (res.ok) {
        const data = await res.json();
        setMcRecordings(prev => [...prev, {
          name: file.name.toUpperCase(),
          url: data.url
        }]);
      } else {
        alert('Erro ao enviar arquivo do estúdio.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao enviar arquivo.');
    } finally {
      setStudioLoading(false);
    }
  };

  const handleGenerateAISuggestion = async (isAvulsa: boolean) => {
    const currentObjective = isAvulsa ? newAulaConteudo : conteudo;
    if (!currentObjective.trim()) {
      alert('Por favor, descreva um breve tema/objetivo no conteúdo trabalhado antes de usar a IA.');
      return;
    }
    
    setIsAILoading(true);
    try {
      const selectedStudentObj = alunosList.find(a => a.id === (isAvulsa ? newAulaAlunoId : selectedAula?.aluno_id));
      const instrument = selectedStudentObj?.curso_ativo || selectedAula?.curso_nome || 'Instrumento';
      const level = selectedStudentObj?.nivel || 'Iniciante';
      
      const suggestion = await getPedagogicalSuggestion(instrument, level, currentObjective);
      if (isAvulsa) {
        setNewAulaConteudo(prev => prev + '\n\n' + suggestion);
      } else {
        setConteudo(prev => prev + '\n\n' + suggestion);
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao gerar sugestão com IA.');
    } finally {
      setIsAILoading(false);
    }
  };

  const handleDownloadPdf = useReactToPrint({
    contentRef: pdfRef,
    documentTitle: () => {
      const studentName = isCreateModalOpen 
        ? (alunosList.find(a => a.id === newAulaAlunoId)?.nome || 'Aluno')
        : (selectedAula?.nome || selectedAula?.aluno_nome || 'Aluno');
        
      const dateStr = isCreateModalOpen 
        ? (newAulaData ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(newAulaData)) : '')
        : (selectedAula?.data ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(selectedAula.data)) : '');

      const safeName = studentName.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "_");
      const safeDate = dateStr.replace(/\//g, "-");
      return `Ficha_${safeName}_${safeDate}`;
    },
  });

  const salvarDiarioAula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAula) return;
    
    const richContent = JSON.stringify({
      isRich: true,
      conteudoText: conteudo,
      tarefaCasaText: tarefaCasa,
      chords: mcChords,
      scales: mcScales,
      exercises: mcExercises,
      recordings: mcRecordings,
      tablatures: mcTablatures,
      drums: mcDrums,
      melody: mcMelody,
      images: mcImages
    });

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
          conteudo: richContent,
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


  // Funções para criar nova aula avulsa do zero
  const handleAddNewLink = () => {
    if (!newLinkTitulo || !newLinkUrl) return;
    setNewAulaMidias(prev => [...prev, { titulo: newLinkTitulo, url: newLinkUrl }]);
    setNewLinkTitulo('');
    setNewLinkUrl('');
  };

  const handleRemoveNewLink = (idx: number) => {
    setNewAulaMidias(prev => prev.filter((_, i) => i !== idx));
  };

  const openCreateModal = () => {
    setNewAulaAlunoId('');
    setNewAulaConteudo('');
    setNewAulaTarefa('');
    setNewAulaMidias([]);
    setNewAulaXp(50);
    setNewAulaStatus('realizada');
    
    // Limpar estados ricos
    setMcChords([]);
    setMcScales([]);
    setMcExercises([]);
    setMcRecordings([]);
    setMcTablatures([]);
    setMcDrums([]);
    setMcMelody([]);
    setMcImages([]);
    setMcChecklist([]);
    setMcActiveTab('geral');
    
    setIsCreateModalOpen(true);
  };

  const criarNovaAulaAvulsa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAulaAlunoId) {
      alert('Por favor, selecione um aluno.');
      return;
    }
    
    const richContent = JSON.stringify({
      isRich: true,
      conteudoText: newAulaConteudo,
      tarefaCasaText: newAulaTarefa,
      chords: mcChords,
      scales: mcScales,
      exercises: mcExercises,
      recordings: mcRecordings,
      tablatures: mcTablatures,
      drums: mcDrums,
      melody: mcMelody,
      images: mcImages,
      checklist: mcChecklist
    });

    const token = localStorage.getItem('acorde_token');
    try {
      const res = await fetch('/api/aulas', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          aluno_id: newAulaAlunoId,
          data: newAulaData,
          horario: newAulaHorario,
          curso_nome: newAulaCurso,
          status: newAulaStatus,
          conteudo: richContent,
          tarefa_casa: newAulaTarefa,
          midias: newAulaMidias,
          xp_ganho: newAulaXp
        })
      });
      
      if (res.ok) {
        setIsCreateModalOpen(false);
        // Limpar os campos do formulário
        setNewAulaAlunoId('');
        setNewAulaConteudo('');
        setNewAulaTarefa('');
        setNewAulaMidias([]);
        loadData();
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || errData.message || 'Erro desconhecido no servidor.';
        alert(`❌ Erro ao registrar aula:\n${errMsg}`);
      }
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao criar aula.');
    }
  };

  const renderMusiclassTabs = (isAvulsa: boolean) => {
    const valConteudo = isAvulsa ? newAulaConteudo : conteudo;
    const setValConteudo = isAvulsa ? setNewAulaConteudo : setConteudo;
    const valTarefa = isAvulsa ? newAulaTarefa : tarefaCasa;
    const setValTarefa = isAvulsa ? setNewAulaTarefa : setTarefaCasa;
    const valXp = isAvulsa ? newAulaXp : xpGanho;
    const setValXp = isAvulsa ? setNewAulaXp : setXpGanho;
    const valMidias = isAvulsa ? newAulaMidias : midias;
    const setValMidias = isAvulsa ? setNewAulaMidias : setMidias;
    const valLinkTitulo = isAvulsa ? newLinkTitulo : linkTitulo;
    const setValLinkTitulo = isAvulsa ? setNewLinkTitulo : setLinkTitulo;
    const valLinkUrl = isAvulsa ? newLinkUrl : linkUrl;
    const setValLinkUrl = isAvulsa ? setNewLinkUrl : setLinkUrl;
    
    const handleAddLinkLocal = () => {
      if (!valLinkTitulo || !valLinkUrl) return;
      setValMidias(prev => [...prev, { titulo: valLinkTitulo, url: valLinkUrl }]);
      setValLinkTitulo('');
      setValLinkUrl('');
    };

    const handleRemoveLinkLocal = (idx: number) => {
      setValMidias(prev => prev.filter((_, i) => i !== idx));
    };

    const selectedStudentObj = alunosList.find(a => a.id === (isAvulsa ? newAulaAlunoId : selectedAula?.aluno_id));
    const currentInstrument = selectedStudentObj?.curso_ativo || selectedAula?.curso_nome || newAulaCurso || 'Piano';

    return (
      <div className="space-y-4">
        {/* Navegação de Abas */}
        <div className="flex border-4 border-black bg-black p-1 gap-1 mb-4 overflow-x-auto scrollbar-hide">
          {(['geral', 'acordes', 'escalas', 'tablatura', 'bateria', 'melodia', 'exercicios', 'studio'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMcActiveTab(tab)}
              className={`flex-1 py-1.5 px-2.5 font-black text-[8px] uppercase tracking-wider text-center transition-all shrink-0 ${
                mcActiveTab === tab
                  ? 'bg-[#ff6b00] text-white'
                  : 'bg-[#261812] text-[#feccba] hover:bg-stone-800'
              }`}
            >
              {tab === 'geral' && '📌 GERAL'}
              {tab === 'acordes' && '🎸 ACORDES'}
              {tab === 'escalas' && '🎼 ESCALAS'}
              {tab === 'tablatura' && '📝 TABLATURA'}
              {tab === 'bateria' && '🥁 BATERIA'}
              {tab === 'melodia' && '🎹 MELODIA'}
              {tab === 'exercicios' && '⚔️ DESAFIOS'}
              {tab === 'studio' && '🎙️ STUDIO'}
            </button>
          ))}
        </div>

        {/* Conteúdo da Aba Geral */}
        {mcActiveTab === 'geral' && (
          <div className="space-y-4 animate-fade-in">
            {/* Ações Rápidas */}
            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={() => handleGenerateAISuggestion(isAvulsa)}
                disabled={isAILoading}
                className="flex-1 bg-[#261812] text-white border-2 border-black py-1.5 text-[8px] font-black uppercase flex items-center justify-center gap-1 active:translate-y-[1px] disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#ff6b00] animate-pulse" /> {isAILoading ? 'GERANDO...' : '💡 IA PEDAGÓGICA'}
              </button>
              
              {!isAvulsa && (
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(true)}
                  className="flex-1 bg-[#ff6b00] text-white border-2 border-black py-1.5 text-[8px] font-black uppercase flex items-center justify-center gap-1 active:translate-y-[1px]"
                >
                  <span>👁️</span> VISUALIZAR AULA (PDF)
                </button>
              )}
            </div>

            {/* Tema da Aula */}
            <div>
              <label className="text-[10px] font-black text-black uppercase tracking-widest block mb-1">CONTEÚDO TRABALHADO</label>
              <textarea
                required
                placeholder="O que o aluno aprendeu ou revisou nesta aula..."
                rows={3}
                className="w-full p-3 bg-white border-4 border-black text-xs font-black uppercase placeholder:text-black/20 focus:outline-none"
                value={valConteudo}
                onChange={(e) => setValConteudo(e.target.value)}
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
                value={valTarefa}
                onChange={(e) => setValTarefa(e.target.value)}
              />
            </div>

            {/* Links e Mídias */}
            <div>
              <label className="text-[10px] font-black text-black uppercase tracking-widest block mb-2">MÍDIAS / LINKS DE APOIO</label>
              
              <div className="space-y-2 mb-3 max-h-[120px] overflow-y-auto">
                {valMidias.map((mid, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#feccba]/40 border-2 border-black p-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase text-black truncate">{mid.titulo}</p>
                      <p className="text-[7px] font-mono text-black/60 truncate">{mid.url}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveLinkLocal(idx)}
                      className="text-red-500 hover:text-red-700 shrink-0 ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-2 border-black/10 p-3 bg-black/5 space-y-2">
                <input
                  type="text"
                  placeholder="NOME DO LINK (EX: PARTITURA)"
                  className="w-full px-2 py-1.5 bg-white border-2 border-black text-[9px] font-black uppercase placeholder:text-black/20 focus:outline-none"
                  value={valLinkTitulo}
                  onChange={(e) => setValLinkTitulo(e.target.value)}
                />
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="URL (HTTPS://...)"
                    className="flex-1 px-2 py-1.5 bg-white border-2 border-black text-[9px] font-mono placeholder:text-black/20 focus:outline-none"
                    value={valLinkUrl}
                    onChange={(e) => setValLinkUrl(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAddLinkLocal}
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
                    onClick={() => setValXp(val)}
                    className={`flex-1 py-2 border-2 border-black font-black text-xs transition-all ${
                      valXp === val
                        ? 'bg-[#ff6b00] text-white shadow-[2px_2px_0_#000] -translate-y-[1px]'
                        : 'bg-white text-black/40 hover:border-black'
                    }`}
                  >
                    +{val} XP
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo da Aba Acordes */}
        {mcActiveTab === 'acordes' && (
          <div className="space-y-4 animate-fade-in font-mono text-xs">
            <div className="bg-[#261812] text-white p-3 border-4 border-black shadow-[4px_4px_0_#000] mb-2 text-center uppercase font-black text-[9px]">
              🎸 HARMÔNICOS E ACORDES PARA {currentInstrument.toUpperCase()}
            </div>

            {/* Seletor de Grupo/Seção de Acorde com Destaque Premium */}
            <div className="bg-[#feccba]/20 border-4 border-black p-3.5 space-y-2.5 shadow-[4px_4px_0_#000]">
              <span className="text-[8px] font-black text-black uppercase tracking-widest block">SEÇÃO OU GRUPO DO ACORDE (ATIVO: {currentGroupName || 'GERAL'})</span>
              <div className="flex flex-wrap gap-1.5">
                {['INTRO', 'VERSO', 'PRÉ-REFRÃO', 'REFRÃO', 'PONTE', 'SOLO', 'OUTRO'].map(grp => {
                  const isActive = currentGroupName === grp;
                  return (
                    <button
                      key={grp}
                      type="button"
                      onClick={() => setCurrentGroupName(grp)}
                      className={`px-3 py-1.5 border-2 border-black font-black text-[8px] uppercase tracking-wider transition-all ${
                        isActive
                          ? 'bg-[#ff6b00] text-white shadow-[2px_2px_0_#000] -translate-y-[1px]'
                          : 'bg-white text-black hover:bg-stone-100'
                      }`}
                    >
                      {grp}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    const g = prompt("Digite o nome da nova seção/grupo (ex: REFRÃO 2, PONTE B):");
                    if (g) setCurrentGroupName(g.toUpperCase());
                  }}
                  className="px-3 py-1.5 bg-black text-white border-2 border-black font-black text-[8px] uppercase tracking-wider hover:bg-stone-800 shadow-[2px_2px_0_#000] active:translate-y-[1px]"
                >
                  + PERSONALIZADA
                </button>
              </div>
            </div>

            {/* Nova Interface com Cards de 12 Notas */}
            <div className="border-4 border-black bg-white p-4 space-y-4 shadow-[4px_4px_0_#000]">
              <div>
                <label className="text-[8px] font-black text-black uppercase tracking-widest block mb-2">1. SELECIONE A TÔNICA (TOM FUNDAMENTAL)</label>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5">
                  {[
                    { cifra: 'C', nome: 'Dó' },
                    { cifra: 'C#', nome: 'Dó#' },
                    { cifra: 'D', nome: 'Ré' },
                    { cifra: 'D#', nome: 'Ré#' },
                    { cifra: 'E', nome: 'Mi' },
                    { cifra: 'F', nome: 'Fá' },
                    { cifra: 'F#', nome: 'Fá#' },
                    { cifra: 'G', nome: 'Sol' },
                    { cifra: 'G#', nome: 'Sol#' },
                    { cifra: 'A', nome: 'Lá' },
                    { cifra: 'A#', nome: 'Lá#' },
                    { cifra: 'B', nome: 'Si' }
                  ].map(t => {
                    const isActive = selRoot === t.cifra;
                    return (
                      <button
                        key={t.cifra}
                        type="button"
                        onClick={() => setSelRoot(t.cifra)}
                        className={`p-2.5 border-2 border-black flex flex-col items-center justify-center transition-all ${
                          isActive
                            ? 'bg-[#ff6b00] text-white shadow-[2px_2px_0_#000] -translate-y-[1px] border-4'
                            : 'bg-[#fff8f6] text-black hover:border-black/70'
                        }`}
                      >
                        <span className="text-sm font-black tracking-tighter">{t.cifra}</span>
                        <span className="text-[7px] font-bold opacity-80 uppercase">{t.nome}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Qualidade do Acorde (Tríades) */}
              <div>
                <label className="text-[8px] font-black text-black uppercase tracking-widest block mb-2">2. SELECIONE A QUALIDADE (TRÍADE)</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'maj', name: 'Maior' },
                    { id: 'min', name: 'Menor' },
                    { id: 'dim', name: 'Diminuto' },
                    { id: 'aug', name: 'Aumentado' },
                    { id: 'sus2', name: 'Sus2' },
                    { id: 'sus4', name: 'Sus4' },
                    { id: 'm7b5', name: 'm7(b5)' }
                  ].map(t => {
                    const isActive = selType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelType(t.id)}
                        className={`px-3 py-2 border-2 border-black font-black text-[9px] uppercase tracking-wider transition-all ${
                          isActive
                            ? 'bg-[#ff6b00] text-white shadow-[2px_2px_0_#000] -translate-y-[1px]'
                            : 'bg-stone-50 text-black hover:bg-stone-100'
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Extensão / Tensão */}
              <div>
                <label className="text-[8px] font-black text-black uppercase tracking-widest block mb-2">3. ADICIONE UMA TENSÃO (EXTENSÃO)</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'none', name: 'Nenhuma' },
                    { id: '7', name: '7ª' },
                    { id: 'maj7', name: 'maj7 (7M)' },
                    { id: '9', name: '9ª' },
                    { id: 'add9', name: 'add9' },
                    { id: '6', name: '6ª' }
                  ].map(e => {
                    const isActive = selExt === e.id;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setSelExt(e.id)}
                        className={`px-3 py-2 border-2 border-black font-black text-[9px] uppercase tracking-wider transition-all ${
                          isActive
                            ? 'bg-[#ff6b00] text-white shadow-[2px_2px_0_#000] -translate-y-[1px]'
                            : 'bg-stone-50 text-black hover:bg-stone-100'
                        }`}
                      >
                        {e.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tipo de Instrumento de Visualização */}
            <div className="bg-black/5 border-2 border-black p-3 space-y-2">
              <span className="text-[7px] font-black text-black/50 uppercase tracking-widest block text-center">MUDAR INSTRUMENTO DE PREVIEW EM TELA</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMcPlaygroundInstrument('Violão')}
                  className={`flex-1 py-2 border border-black font-black text-[9px] uppercase tracking-wider transition-all ${
                    mcPlaygroundInstrument === 'Violão' || mcPlaygroundInstrument === 'Guitarra'
                      ? 'bg-[#ff6b00] text-white shadow-[2px_2px_0_#000] -translate-y-[1px]'
                      : 'bg-white text-black/50 hover:bg-stone-100'
                  }`}
                >
                  🎸 Violão / Guitarra
                </button>
                <button
                  type="button"
                  onClick={() => setMcPlaygroundInstrument('Teclado')}
                  className={`flex-1 py-2 border border-black font-black text-[9px] uppercase tracking-wider transition-all ${
                    mcPlaygroundInstrument === 'Teclado' || mcPlaygroundInstrument === 'Piano'
                      ? 'bg-[#ff6b00] text-white shadow-[2px_2px_0_#000] -translate-y-[1px]'
                      : 'bg-white text-black/50 hover:bg-stone-100'
                  }`}
                >
                  🎹 Teclado / Piano
                </button>
              </div>
            </div>

            {/* Ações: Adicionar Acorde Regular & Abrir Montadores Customizados */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  const chordData = MusicEngine.generateChord(selRoot, selType, selExt);
                  if (chordData) {
                    const notes = chordData.notes;
                    const notesWithBass = selBass !== 'none' ? [selBass, ...notes.filter(n => n !== selBass)] : notes;
                    setMcChords(prev => [...prev, {
                      root: selRoot,
                      typeId: selType,
                      extId: selExt,
                      bass: selBass,
                      notes: notesWithBass,
                      group: currentGroupName || 'GERAL',
                      isCustom: false
                    }]);
                  }
                }}
                className="py-3 bg-black text-[#ff6b00] border-4 border-black font-black text-xs uppercase shadow-[4px_4px_0_#ff6b00] hover:text-white active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" /> ADICIONAR ACORDE RÁPIDO
              </button>

              <button
                type="button"
                onClick={() => setIsKeyboardCustomModalOpen(true)}
                className="py-3 bg-[#261812] text-[#feccba] border-4 border-black font-black text-xs uppercase shadow-[4px_4px_0_#000] hover:bg-black active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5"
              >
                🎹 MONTAR NO TECLADO
              </button>

              <button
                type="button"
                onClick={() => setIsGuitarCustomModalOpen(true)}
                className="py-3 bg-[#261812] text-[#feccba] border-4 border-black font-black text-xs uppercase shadow-[4px_4px_0_#000] hover:bg-black active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5"
              >
                🎸 MONTAR NO VIOLÃO
              </button>
            </div>

            {/* Listagem de acordes da aula agrupados por seção */}
            {mcChords.length > 0 && (
              <div className="space-y-5 pt-4">
                <label className="text-[9px] font-black text-black uppercase tracking-widest block">ACORDES ADICIONADOS NA AULA ({mcChords.length})</label>
                {Object.entries(
                  mcChords.reduce((groups: Record<string, any[]>, chord) => {
                    const groupName = chord.group || 'GERAL';
                    if (!groups[groupName]) groups[groupName] = [];
                    groups[groupName].push(chord);
                    return groups;
                  }, {})
                ).map(([groupName, chords]) => (
                  <div key={groupName} className="border-4 border-black bg-black/5 p-4.5 space-y-3 relative shadow-[4px_4px_0_#000]">
                    <div className="bg-[#261812] text-white px-3 py-1 border-2 border-black text-[9px] font-black uppercase tracking-widest inline-block absolute -top-3.5 left-3 shadow-[2px_2px_0_#000]">
                      🎸 SEÇÃO: {groupName}
                    </div>
                    <div className="flex gap-3.5 overflow-x-auto py-2.5 scrollbar-thin">
                      {(chords as any[]).map((ch, idx) => {
                        const globalIdx = mcChords.findIndex(c => c === ch);
                        const isTeclado = (ch.isCustom ? (ch.instrument || mcPlaygroundInstrument) : mcPlaygroundInstrument)?.toLowerCase().includes('teclado') || (ch.isCustom ? (ch.instrument || mcPlaygroundInstrument) : mcPlaygroundInstrument)?.toLowerCase().includes('piano');
                        return (
                          <div key={idx} className={`relative group shrink-0 mt-2.5 origin-top-left ${isTeclado ? 'w-[320px]' : 'w-[160px]'}`}>
                            <ChordVisualizer
                              instrument={ch.isCustom ? (ch.instrument || mcPlaygroundInstrument) : mcPlaygroundInstrument}
                              chordNotes={ch.notes || []}
                              root={ch.root}
                              type={ch.typeId}
                              ext={ch.extId}
                              bass={ch.bass}
                              notesWithIndices={ch.notesWithIndices}
                              isCustom={ch.isCustom}
                            />
                            <button
                              type="button"
                              onClick={() => setMcChords(prev => prev.filter((_, i) => i !== globalIdx))}
                              className="absolute top-1 right-1 bg-black text-white p-1 rounded-none border border-white hover:bg-red-500 transition-colors shadow-[2px_2px_0_rgba(0,0,0,0.5)] z-45"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal do Teclado Customizado */}
            {isKeyboardCustomModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
                <div className="bg-[#fff8f6] border-8 border-black p-6 relative shadow-[12px_12px_0_#000] w-full max-w-xl font-['Space_Mono'] text-black transition-all">
                  <button
                    type="button"
                    onClick={() => setIsKeyboardCustomModalOpen(false)}
                    className="absolute top-4 right-4 bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all font-black text-xs"
                  >
                    ✖
                  </button>

                  <h3 className="text-lg font-black uppercase italic tracking-tighter mb-4 text-[#ff6b00] border-b-4 border-black pb-2 flex items-center gap-1.5">
                    <span>🎹</span> MONTAR NO TECLADO PERSONALIZADO
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest block mb-1">NOME DO ACORDE PERSONALIZADO</label>
                      <input
                        type="text"
                        placeholder="Ex: C7M(9), G7M(sus4), etc."
                        className="w-full p-2.5 bg-white border-4 border-black text-xs font-black uppercase placeholder:text-black/30 focus:outline-none focus:bg-[#fff8f6]"
                        value={customTecladoName}
                        onChange={(e) => setCustomTecladoName(e.target.value)}
                      />
                    </div>

                    <span className="text-[7px] font-black text-black/50 uppercase tracking-widest block text-center">
                      CLIQUE NAS TECLAS ABAIXO PARA MARCAR AS NOTAS E OUVIR O SINTETIZADOR RETRÔ
                    </span>

                    <div className="overflow-x-auto w-full max-w-[90vw] mx-auto custom-scrollbar pb-2">
                      <div className="relative flex h-36 border-4 border-black bg-black p-1 select-none shadow-[6px_6px_0_#000]" style={{ minWidth: '800px', width: 'max-content' }}>
                        <div className="relative flex h-full">
                          {(() => {
                            const OCTAVES = 3;
                            const START_OCTAVE = 3;
                            const wKeys = [];
                            const bKeys = [];
                            let absIdx = 0;
                            let wIndex = 0;
                            const KEY_WIDTH = 44; // px

                            for (let octave = 0; octave < OCTAVES; octave++) {
                              const curr = START_OCTAVE + octave;
                              wKeys.push({ absIdx: absIdx++, label: 'Dó', note: `C${curr}`, wIndex: wIndex++ });
                              bKeys.push({ absIdx: absIdx++, label: 'Dó#', note: `C#${curr}`, wIndex: wIndex - 1 });
                              wKeys.push({ absIdx: absIdx++, label: 'Ré', note: `D${curr}`, wIndex: wIndex++ });
                              bKeys.push({ absIdx: absIdx++, label: 'Ré#', note: `D#${curr}`, wIndex: wIndex - 1 });
                              wKeys.push({ absIdx: absIdx++, label: 'Mi', note: `E${curr}`, wIndex: wIndex++ });
                              wKeys.push({ absIdx: absIdx++, label: 'Fá', note: `F${curr}`, wIndex: wIndex++ });
                              bKeys.push({ absIdx: absIdx++, label: 'Fá#', note: `F#${curr}`, wIndex: wIndex - 1 });
                              wKeys.push({ absIdx: absIdx++, label: 'Sol', note: `G${curr}`, wIndex: wIndex++ });
                              bKeys.push({ absIdx: absIdx++, label: 'Sol#', note: `G#${curr}`, wIndex: wIndex - 1 });
                              wKeys.push({ absIdx: absIdx++, label: 'Lá', note: `A${curr}`, wIndex: wIndex++ });
                              bKeys.push({ absIdx: absIdx++, label: 'Lá#', note: `A#${curr}`, wIndex: wIndex - 1 });
                              wKeys.push({ absIdx: absIdx++, label: 'Si', note: `B${curr}`, wIndex: wIndex++ });
                            }
                            
                            // add 1 last C
                            wKeys.push({ absIdx: absIdx++, label: 'Dó', note: `C${START_OCTAVE + OCTAVES}`, wIndex: wIndex++ });

                            return (
                              <div className="relative flex" style={{ width: `${wKeys.length * KEY_WIDTH}px` }}>
                                {/* Teclas Brancas */}
                                {wKeys.map((k) => {
                                  const isActive = customTecladoActiveKeys.includes(k.absIdx);
                                  return (
                                    <button
                                      key={k.absIdx}
                                      type="button"
                                      onClick={() => {
                                        melodySynth.playNoteByName(k.note);
                                        setCustomTecladoActiveKeys(prev => 
                                          isActive ? prev.filter(x => x !== k.absIdx) : [...prev, k.absIdx]
                                        );
                                      }}
                                      style={{ left: `${k.wIndex * KEY_WIDTH}px`, width: `${KEY_WIDTH}px` }}
                                      className={`absolute bottom-0 h-full border border-black flex flex-col justify-end pb-3 items-center font-black text-[8px] text-black transition-all ${
                                        isActive
                                          ? 'bg-[#ff6b00] text-white shadow-[inset_0_3px_6px_rgba(0,0,0,0.5)] border-b-4'
                                          : 'bg-white hover:bg-stone-100'
                                      }`}
                                    >
                                      {k.label}
                                    </button>
                                  );
                                })}

                                {/* Teclas Pretas */}
                                {bKeys.map((k) => {
                                  const isActive = customTecladoActiveKeys.includes(k.absIdx);
                                  // As teclas pretas ficam entre as brancas (offset de 50% + ajuste da borda)
                                  const leftPos = (k.wIndex * KEY_WIDTH) + (KEY_WIDTH / 2) + 2; 
                                  return (
                                    <button
                                      key={k.absIdx}
                                      type="button"
                                      onClick={() => {
                                        melodySynth.playNoteByName(k.note);
                                        setCustomTecladoActiveKeys(prev => 
                                          isActive ? prev.filter(x => x !== k.absIdx) : [...prev, k.absIdx]
                                        );
                                      }}
                                      style={{ left: `${leftPos}px`, width: `${KEY_WIDTH * 0.7}px` }}
                                      className={`absolute top-0 h-[60%] border border-white flex flex-col justify-end pb-2 items-center font-black text-[7px] text-white z-10 transition-all ${
                                        isActive
                                          ? 'bg-[#ff6b00] shadow-[inset_0_3px_6px_rgba(0,0,0,0.5)] border-b-2'
                                          : 'bg-black hover:bg-stone-900'
                                      }`}
                                    >
                                      {k.label.replace('#', '♯')}
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!customTecladoName.trim()) {
                            alert('Por favor, dê um nome para o acorde.');
                            return;
                          }
                          if (customTecladoActiveKeys.length === 0) {
                            alert('Por favor, selecione ao menos uma nota no teclado.');
                            return;
                          }

                          const chromaticScale = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                          const chordNotes = customTecladoActiveKeys.map(idx => {
                            const normalized = ((idx % 12) + 12) % 12;
                            return chromaticScale[normalized];
                          });

                          setMcChords(prev => [...prev, {
                            root: customTecladoName.toUpperCase(),
                            typeId: 'custom',
                            extId: 'none',
                            bass: 'none',
                            notes: chordNotes,
                            notesWithIndices: [...customTecladoActiveKeys],
                            group: currentGroupName || 'GERAL',
                            isCustom: true,
                            instrument: 'Teclado'
                          }]);

                          setIsKeyboardCustomModalOpen(false);
                          setCustomTecladoActiveKeys([]);
                          setCustomTecladoName('C');
                        }}
                        className="flex-1 py-3 bg-[#ff6b00] text-white border-4 border-black font-black uppercase text-xs shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-1"
                      >
                        💾 SALVAR ACORDE TECLADO
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomTecladoActiveKeys([])}
                        className="py-3 px-4 bg-red-600 text-white border-4 border-black font-black uppercase text-xs shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all"
                      >
                        RESET
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal do Violão Customizado */}
            {isGuitarCustomModalOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
                <div className="bg-[#fff8f6] border-8 border-black p-6 relative shadow-[12px_12px_0_#000] w-full max-w-xl font-['Space_Mono'] text-black transition-all">
                  <button
                    type="button"
                    onClick={() => setIsGuitarCustomModalOpen(false)}
                    className="absolute top-4 right-4 bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all font-black text-xs"
                  >
                    ✖
                  </button>

                  <h3 className="text-lg font-black uppercase italic tracking-tighter mb-4 text-[#ff6b00] border-b-4 border-black pb-2 flex items-center gap-1.5">
                    <span>🎸</span> MONTAR NO VIOLÃO PERSONALIZADO
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest block mb-1">NOME DO ACORDE PERSONALIZADO</label>
                      <input
                        type="text"
                        placeholder="Ex: D/F#, G7(9), C9, etc."
                        className="w-full p-2.5 bg-white border-4 border-black text-xs font-black uppercase placeholder:text-black/30 focus:outline-none focus:bg-[#fff8f6]"
                        value={customGuitarName}
                        onChange={(e) => setCustomGuitarName(e.target.value)}
                      />
                    </div>

                    <span className="text-[7px] font-black text-black/50 uppercase tracking-widest block text-center">
                      CLIQUE NO TRASTE DA CORDA PARA MARCAR O DEDO. (X = ABAFADA, O = SOLTA)
                    </span>

                    <div className="flex overflow-x-auto pb-4">
                      <div className="bg-[#feccba] border-4 border-black p-4 inline-flex items-start shadow-[6px_6px_0_#000]">
                        
                        {/* Controles de Corda Solta/Abafada */}
                        <div className="flex flex-col justify-between mr-4 py-2 space-y-3">
                          {[5,4,3,2,1,0].map(sIdx => {
                             const state = customGuitarStrings[sIdx] || { fret: 0, finger: null };
                             const stringNames = ['E', 'A', 'D', 'G', 'B', 'e'];
                             return (
                               <div key={`ctrl-${sIdx}`} className="flex items-center gap-1 h-6">
                                 <span className="w-4 font-black text-[10px] uppercase text-[#261812]">{stringNames[sIdx]}</span>
                                 <button
                                   type="button"
                                   onClick={() => {
                                      const updated = [...customGuitarStrings];
                                      updated[sIdx] = { fret: null, finger: null };
                                      setCustomGuitarStrings(updated);
                                   }}
                                   className={`w-6 h-6 border-2 font-black text-[10px] active:translate-y-[1px] transition-all ${state.fret === null ? 'bg-red-500 text-white border-black' : 'bg-white border-black/30'}`}
                                 >X</button>
                                 <button
                                   type="button"
                                   onClick={() => {
                                      const updated = [...customGuitarStrings];
                                      updated[sIdx] = { fret: 0, finger: null };
                                      setCustomGuitarStrings(updated);
                                   }}
                                   className={`w-6 h-6 border-2 font-black text-[10px] active:translate-y-[1px] transition-all ${state.fret === 0 ? 'bg-emerald-500 text-white border-black' : 'bg-white border-black/30'}`}
                                 >O</button>
                               </div>
                             );
                          })}
                        </div>

                        {/* Braço do Violão Gráfico */}
                        <div className="relative bg-[#3e2723] border-4 border-[#1e110b] flex shadow-[inset_0_0_15px_rgba(0,0,0,0.5)]">
                          {/* Nut (Pestana) */}
                          <div className="w-3 bg-stone-200 border-r-2 border-black z-10 shadow-[2px_0_4px_rgba(0,0,0,0.3)]"></div>
                          
                          {/* Trastes (Frets) */}
                          {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(fret => (
                            <div key={`fret-${fret}`} className="relative w-16 sm:w-20 border-r-4 border-zinc-400 flex flex-col justify-between py-2 space-y-3 shrink-0">
                              <span className="absolute -top-6 w-full text-center text-[10px] font-black text-[#261812]">{fret}ª</span>
                              
                              {/* Marcadores do braço (Bolinhas) */}
                              {([3, 5, 7, 9, 12, 15].includes(fret)) && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-stone-300 opacity-60 z-0 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.4)]"></div>
                              )}

                              {[5,4,3,2,1,0].map(sIdx => {
                                const state = customGuitarStrings[sIdx] || { fret: 0, finger: null };
                                const isSelected = state.fret === fret;
                                // Grossura da corda (5 = fininha, 0 = grossa)
                                const stringThickness = ((6 - sIdx) / 2) + 0.5;
                                
                                return (
                                  <div key={`pos-${sIdx}-${fret}`} className="relative h-6 flex items-center justify-center">
                                    {/* Linha da corda visual */}
                                    <div className="absolute w-full bg-[#fce0b0] shadow-[0_1px_2px_rgba(0,0,0,0.6)] z-0" style={{ height: `${stringThickness}px` }}></div>
                                    
                                    {/* Área Clicável */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...customGuitarStrings];
                                        if (isSelected) {
                                          const curFinger = state.finger || 1;
                                          if (curFinger < 4) {
                                            updated[sIdx] = { fret, finger: curFinger + 1 };
                                          } else {
                                            updated[sIdx] = { fret: null, finger: null };
                                          }
                                        } else {
                                          updated[sIdx] = { fret, finger: 1 };
                                        }
                                        setCustomGuitarStrings(updated);
                                      }}
                                      className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 text-[10px] font-black transition-all ${
                                        isSelected 
                                          ? 'bg-[#ff6b00] text-white border-white shadow-[0_0_8px_#ff6b00]' 
                                          : 'bg-transparent border-transparent hover:bg-white/20'
                                      }`}
                                    >
                                      {isSelected ? state.finger || 1 : ''}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!customGuitarName.trim()) {
                            alert('Por favor, dê um nome para o acorde.');
                            return;
                          }

                          const tripletos: number[] = [];
                          for (let s = 0; s < 6; s++) {
                            const state = customGuitarStrings[s];
                            if (state && state.fret !== null) {
                              tripletos.push(s + 1, state.fret, state.finger || 0);
                            }
                          }

                          setMcChords(prev => [...prev, {
                            root: customGuitarName.toUpperCase(),
                            typeId: 'custom',
                            extId: 'none',
                            bass: 'none',
                            notes: [],
                            notesWithIndices: tripletos,
                            group: currentGroupName || 'GERAL',
                            isCustom: true,
                            instrument: 'Violão'
                          }]);

                          setIsGuitarCustomModalOpen(false);
                          setCustomGuitarStrings(Array(6).fill(null).map(() => ({ fret: 0, finger: null })));
                          setCustomGuitarName('C');
                        }}
                        className="flex-1 py-3 bg-[#ff6b00] text-white border-4 border-black font-black uppercase text-xs shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-1"
                      >
                        💾 SALVAR ACORDE VIOLÃO
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomGuitarStrings(Array(6).fill(null).map(() => ({ fret: 0, finger: null })))}
                        className="py-3 px-4 bg-red-600 text-white border-4 border-black font-black uppercase text-xs shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all"
                      >
                        RESET
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Conteúdo da Aba Escalas */}
        {mcActiveTab === 'escalas' && (
          <div className="space-y-4 animate-fade-in font-mono text-xs">
            <div className="bg-[#261812] text-white p-3 border-4 border-black shadow-[4px_4px_0_#000] mb-2 text-center uppercase font-black text-[9px]">
              🎼 CAMPOS HARMÔNICOS E ESCALAS DE ESTUDO
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] font-black text-black uppercase tracking-widest">ESCALA BASE</label>
                <select
                  value={selScaleRoot}
                  onChange={(e) => setSelScaleRoot(e.target.value)}
                  className="w-full p-2 bg-white border-2 border-black font-black text-xs"
                >
                  {ROOTS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[8px] font-black text-black uppercase tracking-widest">TIPO DE ESCALA</label>
                <select
                  value={selScaleId}
                  onChange={(e) => setSelScaleId(e.target.value)}
                  className="w-full p-2 bg-white border-2 border-black font-black text-xs"
                >
                  {SCALES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddScale}
              className="w-full py-2.5 bg-[#ff6b00] text-white border-4 border-black font-black text-xs uppercase shadow-[4px_4px_0_#000] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1"
            >
              <PlusCircle className="w-4 h-4" /> REGISTRAR ESCALA NA AULA
            </button>

            {mcScales.length > 0 && (
              <div className="space-y-2">
                <label className="text-[8px] font-black text-black uppercase tracking-widest">ESCALAS REGISTRADAS</label>
                {mcScales.map((sc, idx) => (
                  <div key={idx} className="bg-[#feccba]/20 border-2 border-black p-2 flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black uppercase">{sc.root} {sc.scaleName}</p>
                      <p className="text-[7px] font-mono text-black/60 truncate uppercase">{sc.notes.join(' - ')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMcScales(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 font-mono"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conteúdo da Aba Tablatura */}
        {mcActiveTab === 'tablatura' && (
          <div className="space-y-4 animate-fade-in font-mono text-xs">
            <div className="bg-[#261812] text-white p-3 border-4 border-black shadow-[4px_4px_0_#000] mb-2 text-center uppercase font-black text-[9px]">
              📝 EDITOR DE TABLATURA INTERATIVA (DIGITAÇÃO RÁPIDA)
            </div>

            <div className="border-2 border-black/10 p-3 bg-black/5 space-y-4">
              <div>
                <label className="text-[8px] font-black text-black uppercase tracking-widest block mb-1">NOME DO RIFF / MÚSICA</label>
                <input
                  type="text"
                  placeholder="EX: RIFF PRINCIPAL"
                  className="w-full px-2 py-1.5 bg-white border-2 border-black text-[10px] font-black uppercase placeholder:text-black/20 focus:outline-none"
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                />
              </div>

              {/* GRADE INTERATIVA DE TABLATURA */}
              <div className="overflow-x-auto custom-scrollbar pb-2">
                <span className="text-[7px] font-black text-black/50 uppercase tracking-widest block mb-1">GRADE DE 6 CORDAS × 32 COMPASSOS (ROLE PARA O LADO)</span>
                <div className="grid gap-px" style={{ gridTemplateColumns: 'auto repeat(32, 1fr)', minWidth: '960px' }}>
                  {['e', 'B', 'G', 'D', 'A', 'E'].map((str, strIdx) => (
                    <React.Fragment key={strIdx}>
                      <div className="flex items-center justify-center bg-[#261812] text-[#ff6b00] font-black text-[8px] border border-black px-1 min-w-[18px]">{str}</div>
                      {Array.from({ length: 32 }).map((_, beat) => {
                        const isSelected = selectedBeatTablatura?.strIdx === strIdx && selectedBeatTablatura?.beat === beat;
                        return (
                          <div
                            key={beat}
                            onClick={() => setSelectedBeatTablatura({ strIdx, beat })}
                            className={`h-7 w-full flex items-center justify-center cursor-pointer font-black text-[9px] border transition-all ${
                              isSelected
                                ? 'bg-[#ff6b00] text-white border-2 border-black animate-pulse shadow-[0_0_8px_rgba(255,107,0,0.6)]'
                                : 'bg-white text-black border-black/30 hover:bg-[#fff8f6]'
                            }`}
                          >
                            {newTabMatrix[strIdx]?.[beat] || '-'}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* PAINEL DE DIGITAÇÃO RÁPIDA */}
              <div className="border-2 border-black p-3 bg-[#feccba]/20 space-y-2">
                <span className="text-[7px] font-black text-black/60 uppercase tracking-widest block text-center">
                  PAINEL DE DIGITAÇÃO RÁPIDA (CELL: {selectedBeatTablatura ? `CORDA ${['e agudo', 'B', 'G', 'D', 'A', 'E grave'][selectedBeatTablatura.strIdx].toUpperCase()} | COMPASSO ${selectedBeatTablatura.beat + 1}` : 'NENHUMA SELECIONADA'})
                </span>
                
                <div className="flex justify-center gap-1 flex-wrap">
                  {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'X', '-'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        if (!selectedBeatTablatura) {
                          alert('Selecione uma célula na grade clicando nela primeiro.');
                          return;
                        }
                        const { strIdx, beat } = selectedBeatTablatura;
                        const updated = newTabMatrix.map(row => [...row]);
                        updated[strIdx][beat] = val === '-' ? '' : val;
                        setNewTabMatrix(updated);
                        
                        // Avança o beat automaticamente para a direita
                        setSelectedBeatTablatura({
                          strIdx,
                          beat: (beat + 1) % 16
                        });
                      }}
                      className="px-3.5 py-2 bg-[#261812] text-white border-2 border-black font-black text-xs hover:bg-[#ff6b00] active:translate-y-[1px] flex-shrink-0"
                    >
                      {val}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedBeatTablatura) return;
                      const { strIdx, beat } = selectedBeatTablatura;
                      setSelectedBeatTablatura({
                        strIdx,
                        beat: (beat - 1 + 32) % 32
                      });
                    }}
                    className="flex-1 py-1.5 bg-black text-white border border-black font-black text-[9px] uppercase shadow-[2px_2px_0_#000] active:translate-y-[1px]"
                  >
                    ◀ VOLTAR PASSO
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedBeatTablatura) return;
                      const { strIdx, beat } = selectedBeatTablatura;
                      setSelectedBeatTablatura({
                        strIdx,
                        beat: (beat + 1) % 32
                      });
                    }}
                    className="flex-1 py-1.5 bg-black text-white border border-black font-black text-[9px] uppercase shadow-[2px_2px_0_#000] active:translate-y-[1px]"
                  >
                    AVANÇAR PASSO ▶
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTabMatrix(Array(6).fill(null).map(() => Array(32).fill('')));
                    }}
                    className="flex-1 py-1.5 bg-red-600 text-white border border-black font-black text-[9px] uppercase shadow-[2px_2px_0_#000] active:translate-y-[1px]"
                  >
                    🗑️ LIMPAR GRADE
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddTablature}
                  className="flex-1 py-2 bg-[#ff6b00] text-white border-4 border-black font-black text-[10px] uppercase shadow-[4px_4px_0_#000] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1"
                >
                  <PlusCircle className="w-4 h-4" /> SALVAR NA AULA
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newTabName.trim()) { alert('Digite um nome para a tablatura antes de salvar na biblioteca.'); return; }
                    try {
                      const token = localStorage.getItem('acorde_token');
                      const res = await fetch('/api/materiais-salvos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ tipo: 'tablatura', titulo: newTabName, conteudo: { matrix: newTabMatrix } })
                      });
                      if (res.ok) { toast.success('Tablatura salva na biblioteca! 📚'); }
                      else { toast.error('Erro ao salvar na biblioteca.'); }
                    } catch(e) { toast.error('Erro ao salvar na biblioteca.'); }
                  }}
                  className="py-2 px-3 bg-[#261812] text-white border-4 border-black font-black text-[9px] uppercase shadow-[4px_4px_0_#000] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1"
                >
                  💾 BIBLIOTECA
                </button>
                <button
                  type="button"
                  onClick={async () => { await fetchMateriaisSalvos('tablatura'); setShowBibliotecaModal('tablatura'); }}
                  className="py-2 px-3 bg-[#3d2d26] text-[#feccba] border-4 border-black font-black text-[9px] uppercase shadow-[4px_4px_0_#000] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1"
                >
                  📂 CARREGAR
                </button>
              </div>
            </div>

            {mcTablatures.length > 0 && (
              <div className="space-y-3">
                <label className="text-[8px] font-black text-black uppercase tracking-widest">TABLATURAS DA AULA ({mcTablatures.length})</label>
                {mcTablatures.map((tab, idx) => (
                  <div key={idx} className="bg-[#feccba]/20 border-2 border-black p-2 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[9px] font-black uppercase">{tab.name}</p>
                      <button
                        type="button"
                        onClick={() => setMcTablatures(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="overflow-x-auto">
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
          </div>
        )}

        {/* Conteúdo da Aba Bateria */}
        {mcActiveTab === 'bateria' && (
          <div className="space-y-4 animate-fade-in font-mono text-xs">
            <div className="bg-[#261812] text-white p-3 border-4 border-black shadow-[4px_4px_0_#000] mb-2 text-center uppercase font-black text-[9px]">
              🥁 SEQUENCIADOR DE BATERIA RÍTMICA
            </div>

            {/* BATERIA VIRTUAL RETRO 8-BIT */}
            <div className="border-4 border-black p-4 bg-[#261812] text-white shadow-[4px_4px_0_#000] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-widest text-[#feccba]">🔊 PAD DE BATERIA RETRO (TOQUE PARA GRAVAR)</span>
                <div className="flex items-center gap-2">
                  <span className="text-[7px] text-[#facc15] font-black">CURSOR: PASSO {selectedBeatStep + 1}/16</span>
                  <span className="text-[7px] text-[#ff6b00] font-black animate-pulse">8-BIT SYNTH ACTIVE</span>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'BUMBO (KICK)', emoji: '🔊', color: 'bg-red-600 hover:bg-red-500 shadow-red-950', action: () => synth.playKick(0), row: 0 },
                  { label: 'CAIXA (SNARE)', emoji: '🥁', color: 'bg-blue-600 hover:bg-blue-500 shadow-blue-950', action: () => synth.playSnare(0), row: 1 },
                  { label: 'CHIMBAL (HI-HAT)', emoji: '🔔', color: 'bg-yellow-500 hover:bg-yellow-400 shadow-yellow-900', action: () => synth.playHihat(0), row: 2 },
                  { label: 'RIMSHOT (RIM)', emoji: '🔈', color: 'bg-green-600 hover:bg-green-500 shadow-green-950', action: () => synth.playRimshot(0), row: 3 }
                ].map((pad) => {
                  const activeStepsCount = newDrumMatrix[pad.row]?.filter(Boolean).length || 0;
                  return (
                    <button
                      key={pad.label}
                      type="button"
                      onClick={() => {
                        // 1. Tocar o som sintetizado
                        pad.action();
                        // 2. Gravar reativamente no passo do cursor
                        const updated = newDrumMatrix.map(r => [...r]);
                        updated[pad.row][selectedBeatStep] = true;
                        setNewDrumMatrix(updated);
                        // 3. Avançar o cursor para o próximo passo automaticamente
                        setSelectedBeatStep(prev => (prev + 1) % 16);
                      }}
                      className={`relative flex flex-col items-center justify-center p-3 border-4 border-black text-white font-black uppercase transition-all transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_#000] cursor-pointer ${pad.color} shadow-[3px_3px_0_#000] rounded-none`}
                    >
                      <span className="text-xl mb-1 filter drop-shadow-[0_2px_0_rgba(0,0,0,1)]">{pad.emoji}</span>
                      <span className="text-[8px] tracking-wider text-center leading-tight mb-1">{pad.label}</span>
                      <div className="flex gap-1 items-center mt-1 bg-black/40 px-1 py-0.5 border border-black/30">
                        <span className="text-[6px] font-black text-[#feccba]">{activeStepsCount} ATIVOS</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] font-black text-black uppercase tracking-widest block mb-1">NOME DA BATIDA</label>
                <input
                  type="text"
                  placeholder="EX: BAIÃO NORDESTINO"
                  className="w-full px-2 py-1.5 bg-white border-2 border-black text-[9px] font-black uppercase placeholder:text-black/20 focus:outline-none"
                  value={newDrumName}
                  onChange={(e) => setNewDrumName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-black uppercase tracking-widest block mb-1">BPM (VELOCIDADE)</label>
                <input
                  type="number"
                  min={40} max={240}
                  className="w-full px-2 py-1.5 bg-white border-2 border-black text-[9px] font-black focus:outline-none"
                  value={newDrumBpm}
                  onChange={(e) => setNewDrumBpm(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[7px] font-black text-black/50 uppercase tracking-widest">GRADE DE BATERIA — 4 INSTRUMENTOS × 16 PASSOS</span>
                <button
                  type="button"
                  onClick={() => setSelectedBeatStep(0)}
                  className="text-[6px] font-black text-[#ff6b00] border border-[#ff6b00] px-1.5 py-0.5 hover:bg-[#ff6b00] hover:text-white transition-colors"
                >
                  RESETAR CURSOR
                </button>
              </div>
              <div className="grid gap-px" style={{ gridTemplateColumns: 'auto repeat(16, 1fr)', minWidth: '380px' }}>
                {[
                  { label: '🔊 Bumbo', row: 0, color: 'border-red-500' },
                  { label: '🥁 Caixa', row: 1, color: 'border-blue-500' },
                  { label: '🔔 Chimbal', row: 2, color: 'border-yellow-500' },
                  { label: '🔈 Rimshot', row: 3, color: 'border-green-500' }
                ].map(({ label, row, color }) => (
                  <React.Fragment key={row}>
                    <div className="flex items-center bg-[#261812] text-white font-black text-[7px] border border-black px-1.5 whitespace-nowrap min-w-[70px]">{label}</div>
                    {Array.from({ length: 16 }).map((_, beat) => {
                      const isActiveStep = drumCurrentStep === beat && isPlayingDrum;
                      const isCursorStep = selectedBeatStep === beat && !isPlayingDrum;
                      return (
                        <button
                          key={beat}
                          type="button"
                          onClick={() => {
                            // Clicar na grade: move cursor + toggle a batida
                            setSelectedBeatStep(beat);
                            const updated = newDrumMatrix.map(r => [...r]);
                            updated[row][beat] = !updated[row][beat];
                            setNewDrumMatrix(updated);
                          }}
                          className={`h-7 border transition-all active:scale-95 ${
                            newDrumMatrix[row]?.[beat]
                              ? 'bg-[#ff6b00] border-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]'
                              : 'bg-[#1a0a05] hover:bg-[#261812] border-black/35'
                          } ${beat % 4 === 0 ? 'border-l-2 border-l-[#ff6b00]/50' : ''} ${
                            isActiveStep ? 'border-2 border-white' : ''
                          } ${
                            isCursorStep ? 'ring-2 ring-yellow-400 ring-inset shadow-[0_0_6px_#facc15] scale-105' : ''
                          }`}
                        >
                          {newDrumMatrix[row]?.[beat] && <span className="text-white font-black text-[9px]">X</span>}
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const intervalTime = (60 / newDrumBpm) / 4 * 1000;
                  if (isPlayingDrum) {
                    if (drumIntervalId) clearInterval(drumIntervalId);
                    setIsPlayingDrum(false);
                    setDrumIntervalId(null);
                    setDrumCurrentStep(0);
                  } else {
                    setIsPlayingDrum(true);
                    let step = 0;
                    const id = setInterval(() => {
                      setNewDrumMatrix(current => {
                        if (current[0][step]) synth.playKick(0);
                        if (current[1][step]) synth.playSnare(0);
                        if (current[2][step]) synth.playHihat(0);
                        if (current[3][step]) synth.playRimshot(0);
                        return current;
                      });
                      setDrumCurrentStep(step);
                      step = (step + 1) % 16;
                    }, intervalTime);
                    setDrumIntervalId(id);
                  }
                }}
                className={`flex-1 py-2.5 border-4 border-black font-black text-[10px] uppercase shadow-[4px_4px_0_#000] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1 ${
                  isPlayingDrum ? 'bg-red-600 text-white' : 'bg-[#261812] text-[#ff6b00]'
                }`}
              >
                {isPlayingDrum ? '⏹ PARAR' : '▶ PREVIEW'}
              </button>
              <button
                type="button"
                onClick={handleAddDrum}
                className="flex-1 py-2.5 bg-[#ff6b00] text-white border-4 border-black font-black text-[10px] uppercase shadow-[4px_4px_0_#000] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1"
              >
                <PlusCircle className="w-4 h-4" /> SALVAR BATIDA
              </button>
            </div>

            {mcDrums.length > 0 && (
              <div className="space-y-2">
                <label className="text-[8px] font-black text-black uppercase tracking-widest">BATIDAS NA AULA ({mcDrums.length})</label>
                {mcDrums.map((drum, idx) => (
                  <div key={idx} className="bg-[#feccba]/20 border-2 border-black p-2 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <p className="text-[9px] font-black uppercase">{drum.name}</p>
                        <span className="text-[7px] font-mono text-[#ff6b00] font-black">{drum.bpm} BPM</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMcDrums(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <DrumsVisualizer rhythmName={drum.name} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conteúdo da Aba Melodia */}
        {mcActiveTab === 'melodia' && (
          <div className="space-y-4 animate-fade-in font-mono text-xs">
            <div className="bg-[#261812] text-white p-3 border-4 border-black shadow-[4px_4px_0_#000] mb-2 text-center uppercase font-black text-[9px]">
              🎹 MINI TECLADO VIRTUAL E CRIADOR DE MELODIAS (RETRO 8-BIT)
            </div>

            <div className="border-2 border-black p-3 bg-black/5 space-y-4">
              <div>
                <label className="text-[8px] font-black text-black uppercase tracking-widest block mb-1">NOME DA MELODIA</label>
                <input
                  type="text"
                  placeholder="EX: SOLO PRINCIPAL"
                  className="w-full px-2 py-1.5 bg-white border-2 border-black text-[10px] font-black uppercase placeholder:text-black/20 focus:outline-none"
                  value={newMelodyName}
                  onChange={(e) => setNewMelodyName(e.target.value)}
                />
              </div>

              {/* MINI TECLADO VIRTUAL DE 2 OITAVAS */}
              <div className="relative">
                <span className="text-[7px] font-black text-black/50 uppercase tracking-widest block mb-2 text-center">PIANO RETRO (TOQUE PARA OUVIR E DIGITAR)</span>
                
                <div className="relative flex h-36 border-4 border-black bg-black p-1 overflow-x-auto select-none rounded-none shadow-[4px_4px_0_#000]">
                  <div className="relative flex" style={{ width: '560px' }}>
                    {/* Teclas Brancas */}
                    {['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5'].map((note) => {
                      const isActive = newMelodyNotes[newMelodyNotes.length - 1] === note;
                      return (
                        <button
                          key={note}
                          type="button"
                          onClick={() => {
                            melodySynth.playNoteByName(note);
                            setNewMelodyNotes(prev => [...prev, note]);
                          }}
                          className={`w-10 h-32 border border-black flex-shrink-0 flex flex-col justify-end pb-2 items-center font-black text-[8px] text-black transition-all ${
                            isActive 
                              ? 'bg-[#ff6b00] text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]' 
                              : 'bg-white hover:bg-stone-100'
                          }`}
                        >
                          {translateNote(note)}
                        </button>
                      );
                    })}

                    {/* Teclas Pretas */}
                    {[
                      { note: 'C#4', left: 28 },
                      { note: 'D#4', left: 68 },
                      { note: 'F#4', left: 148 },
                      { note: 'G#4', left: 188 },
                      { note: 'A#4', left: 228 },
                      { note: 'C#5', left: 308 },
                      { note: 'D#5', left: 348 },
                      { note: 'F#5', left: 428 },
                      { note: 'G#5', left: 468 },
                      { note: 'A#5', left: 508 }
                    ].map(({ note, left }) => {
                      const isActive = newMelodyNotes[newMelodyNotes.length - 1] === note;
                      return (
                        <button
                          key={note}
                          type="button"
                          onClick={() => {
                            melodySynth.playNoteByName(note);
                            setNewMelodyNotes(prev => [...prev, note]);
                          }}
                          style={{ left: `${left}px` }}
                          className={`absolute top-0 w-6 h-20 border border-white flex-shrink-0 flex flex-col justify-end pb-1.5 items-center font-black text-[7px] text-white z-10 transition-all ${
                            isActive 
                              ? 'bg-[#ff6b00] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]' 
                              : 'bg-black hover:bg-stone-900'
                          }`}
                        >
                          {translateNote(note)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Notas sequenciadas */}
              <div className="bg-[#261812] text-white p-3 border-2 border-black space-y-2">
                <span className="text-[7px] font-black text-[#feccba] uppercase tracking-widest block">MELODIA ATUAL ({newMelodyNotes.length} NOTAS)</span>
                
                <div className="bg-black/40 p-2.5 min-h-[40px] flex flex-wrap gap-1.5 border border-black font-black text-[10px] uppercase text-[#ff6b00] tracking-wider">
                  {newMelodyNotes.length > 0 ? (
                    newMelodyNotes.map((note, i) => (
                      <span key={i} className="bg-[#ff6b00] text-white px-1.5 py-0.5 border border-black text-[8px]">{translateNote(note)}</span>
                    ))
                  ) : (
                    <span className="text-[#feccba]/40 italic text-[8px] uppercase">Nenhuma nota digitada. Toque nas teclas do piano acima...</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={newMelodyNotes.length === 0}
                    onClick={() => {
                      let time = 0;
                      newMelodyNotes.forEach((note) => {
                        setTimeout(() => {
                          melodySynth.playNoteByName(note);
                        }, time);
                        time += 300;
                      });
                    }}
                    className="flex-1 py-1.5 bg-emerald-500 text-white border-2 border-black font-black text-[9px] uppercase tracking-wider disabled:opacity-50 shadow-[2px_2px_0_#000] active:translate-y-[1px]"
                  >
                    🔊 PLAY PREVIEW
                  </button>
                  <button
                    type="button"
                    disabled={newMelodyNotes.length === 0}
                    onClick={() => setNewMelodyNotes(prev => prev.slice(0, -1))}
                    className="flex-1 py-1.5 bg-black text-white border-2 border-black font-black text-[9px] uppercase tracking-wider disabled:opacity-50 shadow-[2px_2px_0_#000] active:translate-y-[1px]"
                  >
                    ◀ APAGAR NOTA
                  </button>
                  <button
                    type="button"
                    disabled={newMelodyNotes.length === 0}
                    onClick={() => setNewMelodyNotes([])}
                    className="flex-1 py-1.5 bg-red-600 text-white border-2 border-black font-black text-[9px] uppercase tracking-wider disabled:opacity-50 shadow-[2px_2px_0_#000] active:translate-y-[1px]"
                  >
                    🗑️ LIMPAR TUDO
                  </button>
                </div>

                {/* Botão de separar frases */}
                <button
                  type="button"
                  disabled={newMelodyNotes.length === 0}
                  onClick={() => {
                    if (newMelodyNotes.length === 0) return;
                    setMelodyPhrases(prev => [...prev, [...newMelodyNotes]]);
                    setNewMelodyNotes([]);
                  }}
                  className="w-full py-1.5 bg-[#261812] text-[#feccba] border-2 border-[#ff6b00] font-black text-[9px] uppercase tracking-wider disabled:opacity-50 shadow-[2px_2px_0_#ff6b00] active:translate-y-[1px] flex items-center justify-center gap-1"
                >
                  ✂️ NOVA FRASE / PAUSA (SALVAR BLOCO ATUAL)
                </button>

                {/* Preview das frases separadas */}
                {melodyPhrases.length > 0 && (
                  <div className="bg-black/20 border border-[#ff6b00]/40 p-2 space-y-1">
                    <p className="text-[7px] font-black text-[#ff6b00] uppercase tracking-widest">FRASES SALVAS ({melodyPhrases.length}):</p>
                    {melodyPhrases.map((phrase, pi) => (
                      <div key={pi} className="flex items-center gap-2">
                        <span className="bg-[#ff6b00] text-white font-black text-[6px] px-1 border border-black shrink-0">F{pi+1}</span>
                        <p className="text-[7px] font-mono text-[#feccba]/80 uppercase truncate">{phrase.map(translateNote).join(' ')}</p>
                        <button type="button" onClick={() => setMelodyPhrases(prev => prev.filter((_, i) => i !== pi))} className="text-red-400 text-[8px] shrink-0">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  // Combina frases separadas + notas atuais em andamento
                  const allPhrases = [...melodyPhrases, ...(newMelodyNotes.length > 0 ? [newMelodyNotes] : [])];
                  if (!newMelodyName.trim() || allPhrases.length === 0) {
                    alert('Por favor, dê um nome e adicione pelo menos uma nota ou frase.');
                    return;
                  }
                  const allNotes = allPhrases.flat();
                  setMcMelody(prev => [...prev, {
                    name: newMelodyName.toUpperCase(),
                    notes: allNotes,
                    phrases: allPhrases.length > 1 ? allPhrases : undefined // só salva frases se há múltiplas
                  }]);
                  setNewMelodyNotes([]);
                  setMelodyPhrases([]);
                  setNewMelodyName('NOVA MELODIA / GUIA');
                  alert('Melodia salva com sucesso na aula!');
                }}
                className="w-full py-2 bg-[#ff6b00] text-white border-4 border-black font-black text-[10px] uppercase shadow-[4px_4px_0_#000] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1"
              >
                <PlusCircle className="w-4 h-4" /> REGISTRAR MELODIA NA AULA
              </button>
            </div>

            {/* Listagem de Melodias Salvas */}
            {mcMelody.length > 0 && (
              <div className="space-y-3">
                <label className="text-[8px] font-black text-black uppercase tracking-widest">MELODIAS DA AULA ({mcMelody.length})</label>
                {mcMelody.map((mel, idx) => (
                  <div key={idx} className="bg-[#feccba]/20 border-2 border-black p-3 relative overflow-hidden flex justify-between items-center">
                    <div>
                      <p className="text-[9px] font-black uppercase">{mel.name}</p>
                      <p className="text-[7px] font-mono text-black/60 uppercase tracking-widest mt-1">
                        {mel.notes?.map(translateNote).join(' ')}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          let time = 0;
                          mel.notes?.forEach((note: string) => {
                            setTimeout(() => {
                              melodySynth.playNoteByName(note);
                            }, time);
                            time += 300;
                          });
                        }}
                        className="bg-black text-[#ff6b00] border-2 border-black text-[8px] font-black px-2 py-1 uppercase"
                      >
                        PLAY 🔊
                      </button>
                      <button
                        type="button"
                        onClick={() => setMcMelody(prev => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conteúdo da Aba Exercícios / Desafios */}
        {mcActiveTab === 'exercicios' && (
          <div className="space-y-4 animate-fade-in font-mono text-xs">
            <div className="bg-[#261812] text-white p-3 border-4 border-black shadow-[4px_4px_0_#000] mb-2 text-center uppercase font-black text-[9px]">
              ⚔️ BOSS QUESTS E DESAFIOS SEMANAIS
            </div>

            <div className="border-2 border-black/20 p-3 bg-black/5 space-y-2">
              <div>
                <label className="text-[8px] font-black text-black uppercase tracking-widest block mb-1">TÍTULO DA QUEST</label>
                <input
                  type="text"
                  placeholder="EX: LIGADOS EM SOL MENOR"
                  className="w-full px-2 py-1.5 bg-white border-2 border-black text-[10px] font-black uppercase placeholder:text-black/20 focus:outline-none"
                  value={exTitle}
                  onChange={(e) => setExTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-black uppercase tracking-widest block mb-1">DESCRIÇÃO DA TAREFA</label>
                <textarea
                  placeholder="Instruções para o aluno concluir a missão..."
                  rows={2}
                  className="w-full px-2 py-1.5 bg-white border-2 border-black text-[10px] font-black uppercase placeholder:text-black/20 focus:outline-none"
                  value={exDesc}
                  onChange={(e) => setExDesc(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-black uppercase tracking-widest block mb-1">BÔNUS DE RECOMPENSA (XP)</label>
                <select
                  value={exPoints}
                  onChange={(e) => setExPoints(Number(e.target.value))}
                  className="w-full p-1.5 bg-white border-2 border-black font-black text-[10px]"
                >
                  <option value={50}>+50 XP BÔNUS</option>
                  <option value={100}>+100 XP BÔNUS (MÉDIO)</option>
                  <option value={200}>+200 XP BÔNUS (DIFÍCIL / BOSS)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddExercise}
                className="w-full py-2 bg-black text-white border-2 border-black font-black text-[10px] uppercase shadow-[2px_2px_0_#000] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" /> ADICIONAR BOSS QUEST À AULA
              </button>
            </div>

            {mcExercises.length > 0 && (
              <div className="space-y-2">
                <label className="text-[8px] font-black text-black uppercase tracking-widest">QUESTS DA AULA ({mcExercises.length})</label>
                {mcExercises.map((ex, idx) => (
                  <div key={idx} className="bg-[#feccba]/20 border-2 border-black p-2 flex justify-between items-center relative overflow-hidden">
                    <div className="pr-8">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#ff6b00] text-white font-black text-[7px] px-1 border border-black uppercase shrink-0">⚔️ QUEST</span>
                        <p className="text-[9px] font-black uppercase truncate">{ex.title}</p>
                      </div>
                      <p className="text-[7px] font-black text-black/60 truncate uppercase mt-0.5">{ex.description}</p>
                      <span className="text-[7px] font-mono text-[#ff6b00] font-black block mt-0.5">RECOMPENSA: +{ex.points} XP 🏆</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMcExercises(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Conteúdo da Aba Studio */}
        {mcActiveTab === 'studio' && (
          <div className="space-y-4 animate-fade-in font-mono text-xs">
            <div className="bg-[#261812] text-white p-3 border-4 border-black shadow-[4px_4px_0_#000] mb-2 text-center uppercase font-black text-[9px]">
              🎙️ MUSICLASS STUDIO: GRAVAÇÃO E ÁUDIOS
            </div>

            <div className="border-4 border-black p-4 bg-[#261812] text-white space-y-4 text-center">
              <span className="text-[8px] font-black text-[#ff6b00] uppercase tracking-widest block">GRAVADOR DE MICROFONE DO PROFESSOR</span>
              
              <div className="flex justify-center items-center gap-4 py-2">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="w-12 h-12 bg-red-600 hover:bg-red-700 border-4 border-black shadow-[4px_4px_0_#000] active:translate-y-[2px] active:shadow-none flex items-center justify-center text-white transition-all"
                  >
                    <Mic className="w-6 h-6 animate-pulse" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="w-12 h-12 bg-[#ff6b00] border-4 border-black shadow-[4px_4px_0_#000] active:translate-y-[2px] active:shadow-none flex items-center justify-center text-black transition-all"
                  >
                    <Square className="w-6 h-6 animate-spin" />
                  </button>
                )}
              </div>
              <p className="text-[7px] text-[#feccba]/60 uppercase tracking-wider">
                {!isRecording ? 'CLIQUE NO MICROFONE VERMELHO PARA GRAVAR GUIA DE ESTUDOS' : 'GRAVANDO ÁUDIO... CLIQUE NO QUADRADO PARA PARAR E SALVAR'}
              </p>
            </div>

            <div className="border-2 border-black p-3 bg-black/5">
              <label className="text-[8px] font-black text-black uppercase tracking-widest block mb-1">OU ENVIAR ARQUIVO DE ÁUDIO (.MP3, .WAV, .PNG)</label>
              <input
                type="file"
                accept="audio/*,image/*"
                disabled={studioLoading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await uploadStudioFile(file);
                  }
                }}
                className="w-full text-[9px] font-black text-black focus:outline-none file:mr-4 file:py-1.5 file:px-3 file:border-2 file:border-black file:text-[9px] file:font-black file:bg-[#ff6b00] file:text-white file:cursor-pointer"
              />
              {studioLoading && (
                <span className="text-[7px] font-black text-[#ff6b00] uppercase tracking-widest mt-1 block animate-pulse">
                  ENVIANDO ARQUIVO DE TREINO...
                </span>
              )}
            </div>

            {mcRecordings.length > 0 && (
              <div className="space-y-2">
                <label className="text-[8px] font-black text-black uppercase tracking-widest">GUIAS DE ÁUDIO E TREINO NA AULA</label>
                {mcRecordings.map((rec, idx) => (
                  <div key={idx} className="bg-[#feccba]/20 border-2 border-black p-2 flex justify-between items-center relative overflow-hidden">
                    <div className="pr-8 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4 text-[#ff6b00] shrink-0" />
                        <p className="text-[9px] font-black uppercase truncate">{rec.name}</p>
                      </div>
                      <audio src={rec.url} controls className="h-6 w-full mt-1 border border-black/20" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setMcRecordings(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const filteredSolicitacoes = user?.role === 'admin' ? solicitacoesList : solicitacoesList.filter(s => alunosList.some((a: any) => a.id === s.aluno_id));
  const filteredTreinos = user?.role === 'admin' ? treinosAlunos : treinosAlunos.filter(t => alunosList.some((a: any) => a.id === t.aluno_id));

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
                {(professorData?.nome || 'P').charAt(0).toUpperCase()}
              </div>
            </div>
            <h1 className="text-black font-black text-lg uppercase italic tracking-tighter">MUSIC_HUB</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                OneSignalService.forcePrompt();
                setIsNotifDrawerOpen(true);
                playRetroSound(587.33, 'square', 0.08); // som de chiptune de clique de notificação D5
                setTimeout(() => {
                  playRetroSound(880, 'square', 0.15); // A5
                }, 70);
                toast.success('Permissões de notificação verificadas!');
              }}
              className="text-black hover:text-[#ff6b00] transition-colors relative cursor-pointer"
            >
              <Bell className="w-6 h-6" />
              {notificacoes.filter(n => !n.lida).length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white font-black text-[7px] w-4.5 h-4.5 rounded-full border-2 border-black flex items-center justify-center animate-bounce leading-none shadow-[1px_1px_0_#000]">
                  {notificacoes.filter(n => !n.lida).length}
                </span>
              )}
            </button>
            <button onClick={logout} className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* SCROLL CONTENT */}
        <div className="flex-1 overflow-auto pb-24 scrollbar-hide">
          <div className="px-4 py-5 space-y-5">
            {activeProfessorTab === 'home' && (
              <>
                {/* Resumo do Dia Card */}
                <div className="bg-[#fff8f6] border-8 border-black p-6 relative overflow-hidden shadow-[12px_12px_0_#000] transform rotate-1">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-[#ff6b00] text-white font-black text-[9px] uppercase border-l-4 border-b-4 border-black">
                    MASTER_INSTRUCTOR
                  </div>
                  
                  <p className="text-[#8e7164] text-[8px] font-black uppercase tracking-widest mb-1">&gt;&gt; INSTRUCTOR_STATS</p>
                  <h2 className="text-black font-black text-2xl uppercase italic leading-none mb-6 truncate text-ellipsis overflow-hidden">
                    {professorData?.nome || 'INSTRUTOR'}
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

                {/* Botão de Ferramentas Inline no Fluxo */}
                <div className="p-1">
                  <button
                    onClick={() => setShowTools(true)}
                    className="w-full bg-[#ff6b00] text-white py-3.5 border-4 border-black font-black uppercase text-xs shadow-[8px_8px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2.5 hover:bg-[#ff8c3a] cursor-pointer"
                  >
                    🎸 ABRIR MUSICLASS TOOLS (METRÔNOMO & AFINADOR)
                  </button>
                </div>


                {/* Criar Aula Avulsa - Musiclass Fiel */}
                {localStorage.getItem('acorde_role') === 'admin' && (
                  <div className="p-1">
                    <button
                      onClick={openCreateModal}
                      className="w-full bg-[#ff6b00] text-white py-3 border-4 border-black font-black uppercase text-xs shadow-[8px_8px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 hover:bg-[#ff8c3a]"
                    >
                      ⚔️ REGISTRAR NOVA AULA MUSICLASS
                    </button>
                  </div>
                )}

                {/* Agenda do Dia */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-2">
                      <button onClick={() => setDiaOffset(o => o - 1)} className="p-1.5 bg-[#ff6b00] text-white rounded hover:bg-[#ff8c3a] transition-all"><ChevronLeft className="w-4 h-4" /></button>
                      MINHA_AGENDA
                      <button onClick={() => setDiaOffset(o => o + 1)} className="p-1.5 bg-[#ff6b00] text-white rounded hover:bg-[#ff8c3a] transition-all"><ChevronRight className="w-4 h-4" /></button>
                    </h3>
                    <div className="flex items-center gap-2">
                      {diaOffset !== 0 && (
                        <button onClick={() => setDiaOffset(0)} className="bg-[#1a0a05] border-2 border-white text-white font-black text-[8px] px-2 py-1 uppercase shadow-[2px_2px_0_#fff] active:translate-y-1 active:shadow-none hover:bg-black transition-all">HOJE</button>
                      )}
                      <span className="bg-[#feccba] border-2 border-black text-black font-black text-[8px] px-2 py-1 uppercase shadow-[2px_2px_0_#000]">
                        {format(new Date(Date.now() + diaOffset * 24 * 60 * 60 * 1000), 'MMM dd', { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {aulasHoje.map((aula: any) => {
                      const isConcluida = aula.status === 'realizada';
                      const isFalta = aula.status === 'falta_aluno' || aula.status === 'ausente';
                      const isConfirmada = aula.status === 'confirmada';
                      const isPendente = !isConcluida && !isFalta && !isConfirmada;
                      
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
                          {isConfirmada && (
                            <div className="absolute top-0 right-0 px-3 py-1 bg-blue-500 text-white font-black text-[7px] uppercase border-l-2 border-b-2 border-black">
                              CONFIRMADA
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
                              <h4 
                                onClick={() => {
                                  if (aula.aluno_id) {
                                    handleAbrirHistoricoAluno(aula.aluno_id, aula.nome || aula.aluno_nome);
                                  } else {
                                    toast.error('Aluno não vinculado a esta aula.');
                                  }
                                }}
                                className="text-black font-black text-base uppercase italic leading-none my-1 truncate text-ellipsis overflow-hidden cursor-pointer hover:text-[#ff6b00] underline decoration-dashed decoration-2 hover:decoration-solid transition-colors"
                                title="Clique para ver o histórico do aluno"
                              >
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
              </>
            )}

            {activeProfessorTab === 'jogos' && (
              <div className="px-4 py-5 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="bg-[#ff6b00] border-4 border-black px-3 py-1 shadow-[4px_4px_0_#000]">
                    <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-1.5">
                      🕹️ FLIPERAMA ACORDE (MODO PROFESSOR)
                    </h3>
                  </div>
                  <div className="flex-1 border-t-2 border-dashed border-[#3d2d26]"></div>
                </div>

                {!isPlayingAcordeGenius && !isPlayingChordRush && !isPlayingTriadeNinja ? (
                  <>
                    <div className="bg-[#261812] border-4 border-black p-4 text-center relative overflow-hidden shadow-[4px_4px_0_#000]">
                      <p className="text-[#feccba] font-black text-[9px] uppercase tracking-widest">
                        ÁREA DE TESTES 
                      </p>
                      <p className="text-white/50 font-black text-[7px] uppercase mt-1">
                        Jogue à vontade! Os pontos não são acumulados no modo professor. Use para testar e recomendar aos alunos!
                      </p>
                    </div>

                    <div className="bg-[#261812] border-4 border-black p-4 text-center relative overflow-hidden shadow-[4px_4px_0_#000]">
                      <p className="text-[#feccba] font-black text-[9px] uppercase tracking-widest mb-3">
                        🎁 EVENTO DE PONTOS EM DOBRO
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <button 
                          onClick={() => handleSetDoublePoints(null)}
                          className={`px-3 py-1 border-2 border-black font-black text-[8px] uppercase ${doublePointsGame === null ? 'bg-[#ff6b00] text-white shadow-[2px_2px_0_#000]' : 'bg-white text-black'}`}
                        >
                          DESATIVAR
                        </button>
                        {['Acorde Genius', 'Chord Rush', 'Tríade Ninja', 'Ritmo Pro', 'Voice Rush'].map(jogo => (
                          <button
                            key={jogo}
                            onClick={() => handleSetDoublePoints(jogo)}
                            className={`px-3 py-1 border-2 border-black font-black text-[8px] uppercase ${doublePointsGame === jogo ? 'bg-[#ff6b00] text-white shadow-[2px_2px_0_#000]' : 'bg-white text-black hover:bg-gray-200'}`}
                          >
                            {jogo}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
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
                          </div>
                          <p className="text-[#8e7164] font-black text-[8px] uppercase leading-relaxed">
                            Treine seu ouvido musical repetindo as sequências.
                          </p>
                          <button
                            onClick={() => {
                              setIsPlayingAcordeGenius(true);
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
                          </div>
                          <p className="text-[#8e7164] font-black text-[8px] uppercase leading-relaxed">
                            Identifique as notas corretas de cada acorde antes que o tempo acabe.
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

                        {/* Jogo 3: Triade Ninja */}
                        <div className="bg-[#fff8f6] border-8 border-black p-4 shadow-[8px_8px_0_#000] flex flex-col gap-3 hover:translate-y-[-2px] transition-all">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="bg-[#a855f7] text-white text-[7px] font-black uppercase px-2 py-0.5 border-2 border-black inline-block mb-1">
                                NOVO 🎮
                              </span>
                              <h4 className="text-black font-black text-sm uppercase italic leading-none mt-1">
                                TRÍADE NINJA
                              </h4>
                            </div>
                            <div className="w-8 h-8 bg-[#a855f7] border-4 border-black flex items-center justify-center shrink-0">
                              <span className="text-white text-xs">⚔️</span>
                            </div>
                          </div>
                          <p className="text-[#8e7164] font-black text-[8px] uppercase leading-relaxed">
                            Identifique os acordes apenas por suas 3 notas. Treino de percepção teórica.
                          </p>
                          <button
                            onClick={() => {
                              setIsPlayingTriadeNinja(true);
                              playRetroSound(880, 'square', 0.1);
                            }}
                            className="w-full bg-[#a855f7] text-white hover:bg-black hover:text-[#a855f7] font-black text-[8px] py-2.5 border-4 border-black uppercase tracking-widest shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer text-center"
                          >
                            🕹️ INICIAR PARTIDA
                          </button>
                        </div>

                      </div>
                    </div>
                  </>
                ) : isPlayingChordRush ? (
                  <ChordRush 
                    onClose={() => setIsPlayingChordRush(false)}
                    onGameOver={(score) => {
                      toast.info(`Fim de jogo! Pontuação: ${score}. (Modo Professor)`);
                    }}
                    playRetroSound={playRetroSound}
                  />
                ) : isPlayingTriadeNinja ? (
                  <TriadeNinja
                    onClose={() => setIsPlayingTriadeNinja(false)}
                    onGameOver={(score) => {
                      toast.info(`Fim de jogo! Pontuação: ${score}. (Modo Professor)`);
                    }}
                    playRetroSound={playRetroSound}
                  />
                ) : (
                  <div className="bg-black border-8 border-[#3d2d26] p-4 shadow-[8px_8px_0_#000] flex flex-col gap-4 relative">
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

                    <div className="bg-[#1a0a05] border-4 border-[#3d2d26] p-3 font-mono text-center space-y-1">
                      <div className="flex justify-between text-[7px] text-[#feccba] font-black uppercase">
                        <span>NÍVEL: {geniusScore + 1}</span>
                        <span>SCORE: {geniusScore}</span>
                      </div>
                      <div className="h-6 flex items-center justify-center">
                        {geniusState === 'idle' && <p className="text-amber-500 font-black text-[8px] uppercase tracking-widest animate-pulse">🎮 PRESS START TO PLAY! 🎮</p>}
                        {geniusState === 'playback' && <p className="text-cyan-400 font-black text-[8px] uppercase tracking-widest animate-bounce">🔊 PRESTE ATENÇÃO NA SEQUÊNCIA...</p>}
                        {geniusState === 'playing' && <p className="text-green-400 font-black text-[8px] uppercase tracking-widest animate-pulse">👉 REPRODUZA A SEQUÊNCIA DE NOTAS!</p>}
                        {geniusState === 'gameover' && <p className="text-red-500 font-black text-[8px] uppercase tracking-widest animate-pulse">🚨 GAME OVER! 🚨</p>}
                      </div>
                    </div>

                    {/* Pad area simplificada para o replace não ficar imenso, o professor não precisa do pad gigante no plano de agora se quisermos economizar linhas no patch. Vou colocar os pads. */}
                    <div className="grid grid-cols-2 gap-3 max-w-[200px] mx-auto w-full mt-2">
                      <button onClick={() => handleGeniusPadClick(0)} disabled={geniusState !== 'playing'} className={`h-20 border-4 border-black rounded-lg ${geniusActivePad === 0 ? 'bg-[#00ff66]' : 'bg-[#006622]'}`} />
                      <button onClick={() => handleGeniusPadClick(1)} disabled={geniusState !== 'playing'} className={`h-20 border-4 border-black rounded-lg ${geniusActivePad === 1 ? 'bg-[#ff9900]' : 'bg-[#995c00]'}`} />
                      <button onClick={() => handleGeniusPadClick(2)} disabled={geniusState !== 'playing'} className={`h-20 border-4 border-black rounded-lg ${geniusActivePad === 2 ? 'bg-[#ff0000]' : 'bg-[#990000]'}`} />
                      <button onClick={() => handleGeniusPadClick(3)} disabled={geniusState !== 'playing'} className={`h-20 border-4 border-black rounded-lg ${geniusActivePad === 3 ? 'bg-[#00ccff]' : 'bg-[#007a99]'}`} />
                    </div>

                    <div className="mt-4 flex justify-center gap-4">
                      <button onClick={startGeniusGame} disabled={geniusState === 'playback' || geniusState === 'playing'} className="bg-[#ff6b00] text-black border-4 border-black px-6 py-3 font-black text-[10px] uppercase shadow-[4px_4px_0_#000] active:translate-y-1 hover:bg-white transition-all disabled:opacity-50">🕹️ INICIAR</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeProfessorTab === 'agenda' && (
              <div className="space-y-4 animate-fade-in">
                {/* Calendário Semanal 8-Bit */}
                <div className="bg-[#261812] border-4 border-black p-3 shadow-[6px_6px_0_#000]">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-white font-black text-[9px] uppercase tracking-widest flex items-center gap-1">
                      📅 PLANEJAMENTO SEMANAL
                    </h4>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => handleMudarSemana(-1)} className="px-2 py-1 bg-stone-800 text-white text-[8px] font-black uppercase hover:bg-stone-700 transition-all border border-black shadow-[2px_2px_0_#000] active:translate-y-[1px] active:shadow-none">&lt; ANT</button>
                      
                      <span className="text-[#ff6b00] font-black text-[8px] uppercase px-1 hidden sm:inline">
                        {agendaWeekOffset === 0 ? 'Semana Atual' : agendaWeekOffset < 0 ? `${Math.abs(agendaWeekOffset)} Sem. Atrás` : `${agendaWeekOffset} Sem. Frente`}
                      </span>
                      
                      <button type="button" onClick={() => handleMudarSemana(1)} className="px-2 py-1 bg-stone-800 text-white text-[8px] font-black uppercase hover:bg-stone-700 transition-all border border-black shadow-[2px_2px_0_#000] active:translate-y-[1px] active:shadow-none">PRÓX &gt;</button>
                      
                      {agendaWeekOffset !== 0 && (
                         <button type="button" onClick={() => { setAgendaWeekOffset(0); setSelectedWeekDay(format(new Date(), 'yyyy-MM-dd')); }} className="px-2 py-1 ml-1 bg-[#ff6b00] text-white text-[8px] font-black uppercase hover:bg-orange-500 transition-all border border-black shadow-[2px_2px_0_#000] active:translate-y-[1px] active:shadow-none">HOJE</button>
                      )}
                    </div>
                  </div>
                  
                  {/* Grid de 7 dias */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {getWeekDays(agendaWeekOffset).map((day) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const isSelected = selectedWeekDay === dayStr;
                      const isToday = format(new Date(), 'yyyy-MM-dd') === dayStr;
                      
                      const labelDia = format(day, 'EEE', { locale: ptBR }).toUpperCase().substring(0, 3);
                      const numDia = format(day, 'dd');
                      
                      // Contagem de aulas para este dia específico
                      const numAulas = agendaCompleta.filter(
                        (aula: any) => getAulaLocalDateStr(aula) === dayStr
                      ).length;
                      
                      return (
                        <button
                          key={dayStr}
                          type="button"
                          onClick={() => setSelectedWeekDay(dayStr)}
                          className={`flex flex-col items-center justify-between p-1.5 border-2 transition-all active:translate-y-[1px] relative ${
                            isSelected
                              ? 'bg-[#ff6b00] border-white text-white shadow-[2px_2px_0_#000] z-10'
                              : isToday
                              ? 'bg-[#402a20] border-[#ff6b00] text-[#feccba]'
                              : 'bg-[#1a0f0a] border-black text-stone-400 hover:bg-[#261812]'
                          }`}
                        >
                          {/* Badge de quantidade de aulas */}
                          {numAulas > 0 && (
                            <span className={`absolute -top-1.5 -right-1 px-1 min-w-[12px] h-3 text-[7px] font-black rounded-full border border-black flex items-center justify-center leading-none ${
                              isSelected ? 'bg-white text-black' : 'bg-[#ff6b00] text-white'
                            }`}>
                              {numAulas}
                            </span>
                          )}
                          
                          <span className="text-[7px] font-black tracking-tighter uppercase leading-none">
                            {labelDia}
                          </span>
                          <span className="text-xs font-black italic mt-1 leading-none">
                            {numDia}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Filtros de Status */}
                <div className="flex border-4 border-black bg-black p-1 gap-1 overflow-x-auto scrollbar-hide">
                  {([
                    { id: 'todas', label: '🗂️ TODAS' },
                    { id: 'pendente', label: '⏳ PENDENTES' },
                    { id: 'realizada', label: '✅ REALIZADAS' },
                    { id: 'falta_aluno', label: '❌ FALTAS' }
                  ] as const).map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setFilterAgendaStatus(filter.id)}
                      className={`flex-1 py-1.5 px-2 font-black text-[8px] uppercase tracking-wider text-center transition-all shrink-0 ${
                        filterAgendaStatus === filter.id
                          ? 'bg-[#ff6b00] text-white'
                          : 'bg-[#261812] text-[#feccba] hover:bg-stone-800'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {/* Lista de Aulas do Dia Selecionado */}
                <div className="space-y-3">
                  {(() => {
                    const aulasDoDia = agendaCompleta.filter((aula: any) => {
                      const bateDia = getAulaLocalDateStr(aula) === selectedWeekDay;
                      if (!bateDia) return false;
                      
                      if (filterAgendaStatus === 'todas') return true;
                      if (filterAgendaStatus === 'pendente') return aula.status !== 'realizada' && aula.status !== 'falta_aluno' && aula.status !== 'ausente';
                      if (filterAgendaStatus === 'realizada') return aula.status === 'realizada';
                      if (filterAgendaStatus === 'falta_aluno') return aula.status === 'falta_aluno' || aula.status === 'ausente';
                      return true;
                    });

                    if (aulasDoDia.length === 0) {
                      return (
                        <div className="p-8 text-center bg-[#261812]/50 border-4 border-dashed border-[#3d2d26] rounded-none">
                          <p className="text-[#8e7164] font-black text-[9px] uppercase italic">
                            &gt;&gt; NENHUMA AULA PARA ESTE DIA OU FILTRO
                          </p>
                        </div>
                      );
                    }

                    return aulasDoDia.map((aula: any) => {
                      const isConcluida = aula.status === 'realizada';
                      const isFalta = aula.status === 'falta_aluno' || aula.status === 'ausente';
                      const isConfirmada = aula.status === 'confirmada';
                      const isPendente = !isConcluida && !isFalta && !isConfirmada;
                      
                      // Formatar data bonitinha
                      let formattedDate = aula.data;
                      try {
                        const dateParts = aula.data.split('-');
                        const d = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
                        formattedDate = format(d, "dd/MM (EEE)", { locale: ptBR }).toUpperCase();
                      } catch (e) {}

                      return (
                        <div
                          key={aula.id}
                          className="bg-[#fff8f6] border-4 border-black p-4 shadow-[4px_4px_0_#000] relative overflow-hidden"
                        >
                          {/* Status Badges */}
                          {isConcluida && (
                            <div className="absolute top-0 right-0 px-2 py-0.5 bg-emerald-500 text-white font-black text-[6px] uppercase border-l-2 border-b-2 border-black">
                              REALIZADA
                            </div>
                          )}
                          {isFalta && (
                            <div className="absolute top-0 right-0 px-2 py-0.5 bg-red-500 text-white font-black text-[6px] uppercase border-l-2 border-b-2 border-black">
                              FALTA
                            </div>
                          )}
                          {isConfirmada && (
                            <div className="absolute top-0 right-0 px-2 py-0.5 bg-blue-500 text-white font-black text-[6px] uppercase border-l-2 border-b-2 border-black">
                              CONFIRMADA
                            </div>
                          )}
                          {isPendente && (
                            <div className="absolute top-0 right-0 px-2 py-0.5 bg-[#ff6b00] text-white font-black text-[6px] uppercase border-l-2 border-b-2 border-black animate-pulse">
                              AGUARDANDO
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#feccba] border-4 border-black text-black flex items-center justify-center shrink-0">
                              <span className="font-black text-lg">♪</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[#ff6b00] font-black text-[8px] uppercase tracking-wider flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> {formattedDate} @ {aula.horario?.substring(0, 5)}
                              </p>
                               <h4 
                                onClick={() => {
                                  if (aula.aluno_id) {
                                    handleAbrirHistoricoAluno(aula.aluno_id, aula.nome || aula.aluno_nome);
                                  } else {
                                    toast.error('Aluno não vinculado a esta aula.');
                                  }
                                }}
                                className="text-black font-black text-sm uppercase italic leading-none my-1 truncate cursor-pointer hover:text-[#ff6b00] underline decoration-dashed decoration-2 hover:decoration-solid transition-colors"
                                title="Clique para ver o histórico do aluno"
                              >
                                {aula.nome || aula.aluno_nome || 'ALUNO'}
                              </h4>
                              <p className="text-black/50 font-black text-[7px] uppercase">
                                {aula.curso_nome || 'INSTRUMENTO'}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t-2 border-black/10 flex justify-between items-center">
                            <span className="text-[7px] font-black text-black/40 uppercase">
                              XP: +{aula.xp_ganho || 50} XP
                            </span>
                            
                            <button
                              onClick={() => openRegistroModal(aula)}
                              className="bg-[#ff6b00] text-white px-2.5 py-1.5 border-2 border-black font-black uppercase text-[7px] shadow-[2px_2px_0_#000] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1"
                            >
                              <BookOpen className="w-3 h-3" /> 
                              {isConcluida ? 'VER_DIARIO' : 'REGISTRAR_AULA'}
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {activeProfessorTab === 'perfil' && (
              <div className="space-y-5 animate-fade-in">
                {/* Card Principal de Cadastro */}
                <div className="bg-[#fff8f6] border-8 border-black p-6 relative shadow-[12px_12px_0_#000]">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-[#ff6b00] text-white font-black text-[8px] uppercase border-l-4 border-b-4 border-black">
                    PERFIL DO MEBRO
                  </div>
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-none border-4 border-black overflow-hidden bg-[#ff6b00] shadow-[4px_4px_0_#000] flex-shrink-0">
                      <div className="w-full h-full flex items-center justify-center text-white font-black text-2xl">
                        {String(professorData?.nome || 'P').charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-black font-black text-xl uppercase italic leading-none truncate">
                        {professorData?.nome || 'INSTRUTOR'}
                      </h2>
                      <p className="text-[#8e7164] font-mono text-[8px] mt-1 truncate">
                        {professorData?.email}
                      </p>
                    </div>
                  </div>

                  {/* Estatísticas e XP do Professor */}
                  <div className="space-y-3 border-t-4 border-black pt-4">
                    <div className="flex justify-between items-center text-[10px] font-black text-black">
                      <span>MEU PROGRESSO - LEVEL {nivel}</span>
                      <span>{xp.toLocaleString()} / {xpMax.toLocaleString()} XP</span>
                    </div>
                    <div className="h-5 bg-black p-1 border-4 border-black overflow-hidden">
                      <div className="h-full bg-[#ff6b00] transition-all duration-1000 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]" style={{ width: `${xpPct}%` }}></div>
                    </div>
                  </div>
                </div>

                {/* Bloco de Informações Financeiras */}
                <div className="p-6 bg-[#261812] border-8 border-black shadow-[8px_8px_0_#000] text-white">
                  <h3 className="font-black text-[9px] uppercase tracking-widest text-[#ff6b00] mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2"><span>⚡</span> MINHAS INFORMAÇÕES FINANCEIRAS</span>
                    <button onClick={() => setIsFinanceiroModalOpen(true)} className="bg-[#ff6b00] text-white font-black text-[7px] px-2 py-1 border-2 border-black active:translate-y-1 active:shadow-none shadow-[2px_2px_0_#000] cursor-pointer">HISTÓRICO COMPLETO</button>
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-white/60 font-black text-[7px] uppercase tracking-widest block">VALOR POR AULA MINISTRADA</span>
                      <p className="font-black text-xl text-white">
                        R$ {Number(professorData?.valor_aula || 0).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span className="text-white/60 font-black text-[7px] uppercase tracking-widest block">SALDO ACUMULADO DISPONÍVEL</span>
                      <p className="font-black text-3xl text-[#ff6b00] italic">
                        R$ {Number(professorData?.saldo || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* DISPONIBILIDADE */}
                <div className="bg-[#fff8f6] border-8 border-black p-6 relative shadow-[12px_12px_0_#000] mt-5">
                  <div className="flex items-center justify-between border-b-4 border-black pb-3 mb-4">
                    <h3 className="text-black font-black text-xs uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#ff6b00]" /> MINHA DISPONIBILIDADE
                    </h3>
                  </div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 mb-4 leading-relaxed">
                    Marque os horários que você tem disponibilidade para dar aulas. <br/>Seus horários já ocupados por alunos fixos estão bloqueados em cinza.
                  </p>
                  
                  <div className="overflow-x-auto pb-2">
                    <table className="w-full text-center border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 border-4 border-black bg-[#ff6b00] text-white text-[9px] font-black uppercase min-w-[60px]">HORA</th>
                          {['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].map(dia => (
                            <th key={dia} className="p-2 border-4 border-black bg-[#ff6b00] text-white text-[9px] font-black uppercase min-w-[70px]">{dia.substring(0,3)}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'].map(h => (
                          <tr key={h}>
                            <td className="p-1 border-4 border-black bg-[#261812] text-white text-[9px] font-black uppercase">{h}</td>
                            {['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'].map(dia => {
                               const key = `${dia}-${h}`;
                               // Determine if occupied
                               let occupied = false;
                               alunosList.forEach(a => {
                                  a.matriculas?.forEach((m: any) => {
                                     if (m.status === 'ativa' && Number(m.professor_id) === Number(professorData?.id)) {
                                        if (m.dia_semana && m.horario) {
                                           const nDay = String(m.dia_semana || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace('ç', 'c');
                                           if (nDay === dia && String(m.horario || '').substring(0,5) === h) occupied = true;
                                        }
                                     }
                                  });
                               });
                               
                               const isSelected = disponibilidade.includes(key);

                               return (
                                  <td 
                                    key={dia} 
                                    className={`p-0 border-4 border-black cursor-pointer transition-colors ${occupied ? 'bg-slate-300' : isSelected ? 'bg-[#00FF41]' : 'bg-white hover:bg-slate-100'}`}
                                    onClick={() => {
                                      if (occupied) return;
                                      setDisponibilidade(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
                                    }}
                                  >
                                    <div className="w-full h-8 flex items-center justify-center">
                                      {occupied ? (
                                        <XCircle className="w-3 h-3 text-slate-500 opacity-50" />
                                      ) : isSelected ? (
                                        <CheckCircle2 className="w-4 h-4 text-black" />
                                      ) : null}
                                    </div>
                                  </td>
                               );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button 
                      disabled={salvandoDisponibilidade}
                      onClick={async () => {
                         setSalvandoDisponibilidade(true);
                         const token = localStorage.getItem('acorde_token');
                         const dbFormat: Record<string, string[]> = { segunda: [], terca: [], quarta: [], quinta: [], sexta: [], sabado: [] };
                         disponibilidade.forEach(item => {
                            const [d, h] = item.split('-');
                            if (dbFormat[d]) dbFormat[d].push(h);
                         });
                         const res = await fetch(`/api/professores/${professorData?.id}/disponibilidade`, {
                           method: 'PATCH',
                           headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                           body: JSON.stringify({ disponibilidade: dbFormat })
                         });
                         if(res.ok) toast.success('Disponibilidade salva!');
                         else toast.error('Erro ao salvar');
                         setSalvandoDisponibilidade(false);
                      }}
                      className="bg-[#00FF41] text-black px-4 py-2 font-black uppercase text-[10px] border-4 border-black shadow-[4px_4px_0_#000] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all active:scale-95 flex items-center gap-2"
                    >
                      <Save className="w-3 h-3" /> {salvandoDisponibilidade ? 'SALVANDO...' : 'SALVAR GRADE'}
                    </button>
                  </div>
                </div>



                {/* ADMIN GOD MODE PANEL (EXCLUSIVO ANTHONY) */}
                {godModeActive && (
                  <div className="bg-black border-8 border-yellow-500 p-6 shadow-[12px_12px_0_#ff6b00] text-white space-y-6 mt-5">
                    <div className="flex items-center justify-between border-b-4 border-yellow-500 pb-3">
                      <h3 className="text-yellow-500 font-black text-lg uppercase tracking-widest flex items-center gap-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        ⚡ ADMIN GOD MODE
                      </h3>
                      <span className="bg-yellow-500 text-black font-black text-[8px] px-2 py-0.5 uppercase">SYSTEM OVERLORD</span>
                    </div>

                    {/* Ligar/Desligar XP nos Jogos */}
                    <div className="flex items-center justify-between bg-[#111] p-4 border-2 border-yellow-500/30">
                      <div className="space-y-1">
                        <span className="font-black text-[10px] text-yellow-500 block uppercase">JOGOS GANHAM XP NO RANKING</span>
                        <p className="text-[8px] text-slate-400 font-mono">
                          {godModeJogosXp 
                            ? 'Ativado: Jogar dá moedas e pontua no ranking geral.' 
                            : 'Desativado: Jogos acumulam apenas moedas (coins).'}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          const token = localStorage.getItem('acorde_token');
                          const newVal = !godModeJogosXp;
                          try {
                            const res = await fetch('/api/godmode/config-xp', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({ enabled: newVal })
                            });
                            if (res.ok) {
                              setGodModeJogosXp(newVal);
                              toast.success(newVal ? 'XP nos jogos ativado!' : 'XP nos jogos desativado! Apenas moedas.');
                            } else {
                              toast.error('Erro ao alterar config de XP.');
                            }
                          } catch (e) {
                            toast.error('Falha de rede.');
                          }
                        }}
                        className={`px-4 py-2 border-2 border-black font-black text-[9px] uppercase shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none transition-all ${
                          godModeJogosXp ? 'bg-[#00FF41] text-black' : 'bg-red-600 text-white'
                        }`}
                      >
                        {godModeJogosXp ? 'LIGADO' : 'DESLIGADO'}
                      </button>
                    </div>

                    {/* Creditar Moedas ou XP para Aluno */}
                    <div className="bg-[#111] p-4 border-2 border-yellow-500/30 space-y-4">
                      <span className="font-black text-[10px] text-yellow-500 block uppercase">⚡ INJETAR RECURSOS EM ALUNO</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[7px] text-slate-400 font-mono uppercase">SELECIONE O ALUNO</label>
                          <select
                            value={godModeSelectedAluno}
                            onChange={(e) => setGodModeSelectedAluno(e.target.value)}
                            className="w-full bg-black border-2 border-yellow-500/30 p-2 text-[10px] font-black uppercase text-white outline-none focus:border-yellow-500"
                          >
                            <option value="">-- SELECIONE --</option>
                            {alunosList.map(aluno => (
                              <option key={aluno.id} value={aluno.id}>{aluno.nome}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[7px] text-slate-400 font-mono uppercase">QUANTIDADE</label>
                          <input
                            type="number"
                            placeholder="EX: 1000"
                            value={godModeAmount}
                            onChange={(e) => setGodModeAmount(e.target.value)}
                            className="w-full bg-black border-2 border-yellow-500/30 p-2 text-[10px] font-black uppercase text-white outline-none focus:border-yellow-500"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          disabled={godModeLoading}
                          onClick={async () => {
                            if (!godModeSelectedAluno || !godModeAmount) return toast.error('Selecione o aluno e o valor!');
                            setGodModeLoading(true);
                            const token = localStorage.getItem('acorde_token');
                            try {
                              const res = await fetch('/api/godmode/creditar', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({ aluno_id: godModeSelectedAluno, tipo: 'moedas', valor: godModeAmount })
                              });
                              if (res.ok) {
                                toast.success(`Creditado +${godModeAmount} Moedas com sucesso!`);
                                setGodModeAmount('');
                              } else {
                                const err = await res.json();
                                toast.error(err.error || 'Erro ao creditar moedas.');
                              }
                            } catch (e) { toast.error('Erro de rede.'); }
                            setGodModeLoading(false);
                          }}
                          className="flex-1 bg-yellow-500 text-black font-black text-[9px] py-3 border-2 border-black shadow-[3px_3px_0_#ff6b00] active:translate-y-0.5 active:shadow-none hover:bg-yellow-400 transition-all uppercase"
                        >
                          💰 CREDITAR MOEDAS
                        </button>
                        <button
                          disabled={godModeLoading}
                          onClick={async () => {
                            if (!godModeSelectedAluno || !godModeAmount) return toast.error('Selecione o aluno e o valor!');
                            setGodModeLoading(true);
                            const token = localStorage.getItem('acorde_token');
                            try {
                              const res = await fetch('/api/godmode/creditar', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                body: JSON.stringify({ aluno_id: godModeSelectedAluno, tipo: 'xp', valor: godModeAmount })
                              });
                              if (res.ok) {
                                toast.success(`Creditado +${godModeAmount} XP com sucesso!`);
                                setGodModeAmount('');
                              } else {
                                const err = await res.json();
                                toast.error(err.error || 'Erro ao creditar XP.');
                              }
                            } catch (e) { toast.error('Erro de rede.'); }
                            setGodModeLoading(false);
                          }}
                          className="flex-1 bg-[#00FF41] text-black font-black text-[9px] py-3 border-2 border-black shadow-[3px_3px_0_#000] active:translate-y-0.5 active:shadow-none hover:bg-[#39ff68] transition-all uppercase"
                        >
                          ✨ CREDITAR XP
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botão Logout Vermelho Gigante */}
                <button
                  onClick={logout}
                  className="w-full bg-[#ff3333] hover:bg-red-700 text-white py-4 border-8 border-black font-black uppercase text-sm shadow-[8px_8px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3 mt-5"
                >
                  <LogOut className="w-5 h-5" /> SAIR DA MINHA CONTA
                </button>
              </div>
            )}

            {activeProfessorTab === 'treinos' && (
              <div className="space-y-4 animate-fade-in pb-10">
                {/* Cabeçalho da aba Treinos */}
                <div className="bg-[#fff8f6] border-8 border-black p-5 relative shadow-[8px_8px_0_#000]">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-[#ff6b00] text-white font-black text-[8px] uppercase border-l-4 border-b-4 border-black">
                    PRACTICE HUB
                  </div>
                  <h3 className="text-black font-black text-lg uppercase italic tracking-tighter mt-1 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-[#ff6b00] animate-pulse" /> TREINOS DOS ALUNOS
                  </h3>
                  <p className="text-[8px] font-black text-[#8e7164] uppercase tracking-wider mt-1">
                    Acompanhe os check-ins diários e assista às gravações de 24h dos alunos!
                  </p>
                </div>

                {/* Pesquisa e Fichas de Aulas Passadas */}
                <div className="bg-[#fff8f6] border-4 border-black p-4 shadow-[4px_4px_0_#000]">
                  <h4 className="font-black text-black uppercase text-xs mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" /> FICHAS DE AULAS ANTERIORES
                  </h4>
                  <div className="flex gap-2 mb-4">
                    <input 
                      type="text" 
                      placeholder="PESQUISAR POR NOME DO ALUNO..." 
                      className="flex-1 bg-white border-2 border-black p-2 font-black text-xs uppercase outline-none focus:bg-[#ffeae1]"
                      value={searchTreino}
                      onChange={(e) => setSearchTreino(e.target.value)}
                    />
                  </div>
                  {searchTreino.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
                      {agendaCompleta.filter(a => a.status === 'realizada' && a.aluno_nome?.toLowerCase().includes(searchTreino.toLowerCase())).map(aula => (
                        <div key={aula.id} className="bg-white border-2 border-black p-3 flex justify-between items-center shadow-[2px_2px_0_#000]">
                          <div className="min-w-0 flex-1 pr-2">
                            <h5 className="font-black text-[10px] uppercase truncate">{aula.aluno_nome}</h5>
                            <p className="text-[8px] font-bold text-black/60 uppercase">{format(new Date((aula.data || '2099-12-31') + 'T12:00:00'), 'dd/MM/yyyy')} - {aula.curso_nome || 'Música'}</p>
                          </div>
                          <button
                            onClick={() => openPreviewModal(aula)}
                            className="bg-black text-white px-3 py-1.5 border-2 border-black font-black text-[9px] uppercase shadow-[2px_2px_0_#000] active:translate-y-[1px] active:shadow-none flex items-center gap-1 shrink-0"
                          >
                            <FileText className="w-3 h-3" /> ABRIR FICHA
                          </button>
                        </div>
                      ))}
                      {agendaCompleta.filter(a => a.status === 'realizada' && a.aluno_nome?.toLowerCase().includes(searchTreino.toLowerCase())).length === 0 && (
                        <div className="col-span-full py-4 text-center opacity-50 font-black text-[10px] uppercase">
                          NENHUMA FICHA ENCONTRADA.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Lista de Treinos */}
                <div className="space-y-3">
                  {loadingTreinos ? (
                    <div className="p-8 text-center bg-[#261812]/50 border-4 border-dashed border-[#3d2d26] rounded-none">
                      <p className="text-[#8e7164] font-black text-[9px] uppercase tracking-widest animate-pulse">
                        &gt;&gt; CARREGANDO TREINOS DIÁRIOS...
                      </p>
                    </div>
                  ) : filteredTreinos.length === 0 ? (
                    <div className="p-8 text-center bg-[#261812]/50 border-4 border-dashed border-[#3d2d26] rounded-none">
                      <p className="text-[#8e7164] font-black text-[9px] uppercase italic">
                        &gt;&gt; NENHUM TREINO REGISTRADO ATÉ O MOMENTO
                      </p>
                    </div>
                  ) : (
                    filteredTreinos.map((treino: any) => {
                      const dataFormatada = new Date(treino.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      // Calcula horas restantes para expirar o vídeo
                      let tempoRestanteStr = '';
                      let isExpirado = true;
                      if (treino.video_url && treino.video_created_at) {
                        const videoTime = new Date(treino.video_created_at).getTime();
                        const now = Date.now();
                        const diffMs = videoTime + 24 * 60 * 60 * 1000 - now;
                        if (diffMs > 0) {
                          isExpirado = false;
                          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
                          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                          tempoRestanteStr = `${diffHrs}h ${diffMins}m restantes`;
                        }
                      }

                      return (
                        <div
                          key={treino.id}
                          className="bg-[#fff8f6] border-4 border-black p-4 shadow-[4px_4px_0_#000] relative overflow-hidden"
                        >
                          <div className="flex items-center gap-3">
                            {/* Foto ou Inicial */}
                            <div className="w-12 h-12 bg-[#feccba] border-4 border-black text-black overflow-hidden flex items-center justify-center shrink-0 shadow-[2px_2px_0_#000]">
                              {(treino.alunos || treino.aluno)?.foto_url ? (
                                <img src={(treino.alunos || treino.aluno).foto_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-black text-lg text-black">
                                  {((treino.alunos || treino.aluno)?.nome || 'A').charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="text-[#ff6b00] font-black text-[8px] uppercase tracking-wider leading-none">
                                {dataFormatada}
                              </p>
                              <h4 
                                onClick={() => {
                                  if (treino.aluno_id) {
                                    handleAbrirHistoricoAluno(treino.aluno_id, (treino.alunos || treino.aluno)?.nome || 'ALUNO');
                                  }
                                }}
                                className="text-black font-black text-sm uppercase italic leading-none my-1.5 truncate cursor-pointer hover:text-[#ff6b00] underline decoration-dashed decoration-1 hover:decoration-solid transition-colors"
                              >
                                {(treino.alunos || treino.aluno)?.nome || 'ALUNO DESCONHECIDO'}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="bg-[#402a20] text-[#feccba] border border-black px-1 font-black text-[6.5px] uppercase leading-none">
                                  🔥 STREAK: {treino.streak_count || 1} DIAS
                                </span>
                                <span className="bg-emerald-500 text-white border border-black px-1 font-black text-[6.5px] uppercase leading-none">
                                  {treino.xp_adicionado || 10} XP
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Seção do Vídeo demonstrativo curto */}
                          {treino.video_url && !isExpirado ? (
                            <div className="mt-3 border-t-2 border-black/10 pt-3 flex justify-between items-center bg-[#261812]/5 p-2.5 border-2 border-black">
                              <div className="min-w-0">
                                <span className="text-[7.5px] font-black text-[#ff6b00] uppercase tracking-widest block leading-none">
                                  📹 VÍDEO DO TREINO
                                </span>
                                <span className="text-[6.5px] font-black text-black/55 uppercase tracking-wider block mt-1">
                                  ⏳ {tempoRestanteStr}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedTreinoVideo(treino.video_url);
                                  setIsTreinoVideoModalOpen(true);
                                  playRetroSound(880, 'triangle', 0.08);
                                }}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 border-2 border-black font-black uppercase text-[7.5px] shadow-[2px_2px_0_#000] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1 cursor-pointer animate-pulse"
                              >
                                <Video className="w-3 h-3 text-white" /> ASSISTIR GRAVAÇÃO
                              </button>
                            </div>
                          ) : (
                            <div className="mt-3 border-t-2 border-black/10 pt-3 flex items-center justify-between">
                              <span className="text-[7px] font-black text-black/40 uppercase">
                                check-in simples de treino
                              </span>
                              <span className="text-[6.5px] font-black text-[#8e7164] uppercase tracking-wider">
                                sem vídeo enviado
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeProfessorTab === 'ranking' && (
              <div className="space-y-5 animate-fade-in pb-10">
                {/* PENDÊNCIAS DE GAMIFICAÇÃO */}
                {filteredSolicitacoes.filter((s: any) => s.status === 'pendente').length > 0 && (
                  <div className="border-8 border-black bg-[#261812] text-white p-4 shadow-[8px_8px_0_#000] space-y-4">
                    <div className="flex items-center gap-2 border-b-4 border-black pb-2">
                      <div className="w-3.5 h-3.5 bg-yellow-400 border-2 border-black animate-pulse rounded-full shrink-0" />
                      <h4 className="font-black text-[10px] tracking-widest uppercase text-yellow-400">
                        🔔 SOLICITAÇÕES PENDENTES DE TROFÉUS ({filteredSolicitacoes.filter((s: any) => s.status === 'pendente').length})
                      </h4>
                    </div>

                    <div className="space-y-3">
                      {filteredSolicitacoes
                        .filter((s: any) => s.status === 'pendente')
                        .map((sol: any) => {
                          const alunoCompleto = alunosList.find((a: any) => a.id === sol.aluno_id);
                          const fotoUrl = alunoCompleto?.foto_url;
                          const curso = alunoCompleto?.curso || 'MÚSICA';
                          
                          return (
                            <div key={sol.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border-4 border-black bg-white text-black shadow-[4px_4px_0_#000] hover:translate-x-1 transition-all">
                              <div className="flex items-center gap-3">
                                {/* Avatar do Aluno */}
                                <div className="w-10 h-10 border-2 border-black overflow-hidden bg-[#261812] shrink-0">
                                  {fotoUrl ? (
                                    <img src={fotoUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center font-black text-sm text-[#ff6b00]">
                                      {(sol.aluno?.nome || 'A').charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>

                                {/* Info do Aluno */}
                                <div className="min-w-0">
                                  <p className="font-black text-[10px] uppercase truncate text-black mb-0">
                                    {sol.aluno?.nome}
                                  </p>
                                  <p className="text-[7px] font-black uppercase text-[#8e7164] truncate mt-0.5 mb-0">
                                    {curso}
                                  </p>
                                </div>
                              </div>

                              {/* Troféu Solicitado */}
                              <div className="flex items-center gap-2 border-2 border-black bg-[#fff8f6] p-2 flex-1 sm:max-w-xs">
                                <div className="w-8 h-8 border-2 border-black bg-white flex items-center justify-center shrink-0 shadow-[2px_2px_0_#000]">
                                  {sol.conquista?.icone_url ? (
                                    <img src={sol.conquista?.icone_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-xs">🏆</span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-black text-[8px] uppercase truncate text-[#ff6b00] mb-0 leading-none">
                                    {sol.conquista?.nome}
                                  </p>
                                  <p className="text-[6px] text-black font-semibold mt-0.5 mb-0 leading-tight line-clamp-1">
                                    {sol.conquista?.descricao}
                                  </p>
                                </div>
                                <div className="shrink-0 text-right">
                                  <span className="bg-[#ff6b00] text-white border-2 border-black px-1 py-0.5 font-black text-[7px] uppercase tracking-tighter shadow-[1px_1px_0_#000]">
                                    +{sol.conquista?.pontos} XP
                                  </span>
                                </div>
                              </div>

                              {/* Ações de Decisão */}
                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                <button
                                  onClick={() => handleRevisarSolicitacao(sol.id, 'aprovada')}
                                  className="bg-[#2ecc71] hover:bg-[#27ae60] text-white px-2 py-1.5 border-2 border-black font-black uppercase text-[8px] shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1"
                                >
                                  CONCEDER ✅
                                </button>
                                <button
                                  onClick={() => handleRevisarSolicitacao(sol.id, 'rejeitada')}
                                  className="bg-[#ff3333] hover:bg-red-700 text-white px-2 py-1.5 border-2 border-black font-black uppercase text-[8px] shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1"
                                >
                                  NEGAR ❌
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="bg-[#ff6b00] border-4 border-black px-3 py-1.5 shadow-[4px_4px_0_#000]">
                    <h3 className="text-white font-black text-xs uppercase tracking-widest flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-white" /> HALL DA FAMA
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setAssignData({ aluno_id: '', conquista_id: '' });
                      setIsAssignModalOpen(true);
                      fetchConquistas();
                    }}
                    className="bg-[#261812] hover:bg-black text-white px-3 py-1.5 border-4 border-black font-black uppercase text-[9px] shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> ATRIBUIR TROFÉU
                  </button>
                </div>

                {loadingRanking ? (
                  <div className="text-center py-12 text-[#8e7164] font-black text-[10px] uppercase animate-pulse">
                    Carregando ranking geral...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rankingData.length === 0 ? (
                      <div className="text-center py-12 text-[#8e7164] font-black text-[9px] uppercase border-4 border-dashed border-black bg-[#fff8f6] p-6">
                        Nenhum aluno cadastrado ou com pontuação.
                      </div>
                    ) : (
                      <>
                        {/* TOP 3 PODIUM (mobile-optimized) */}
                        {rankingData.length > 0 && (
                          <div className="flex items-end justify-center gap-2 mb-6 mt-12 h-56 px-2">
                            {/* 2ND */}
                            {rankingData[1] && (
                              <div
                                onClick={() => { setSelectedAluno(rankingData[1]); setIsAlunoModalOpen(true); }}
                                className="w-[28%] h-[80%] flex flex-col items-center justify-end cursor-pointer hover:-translate-y-1 transition-transform"
                              >
                                <div className="w-full h-24 relative z-10 flex items-end justify-center pb-0 border-x-2 border-t-2 border-[#261812] bg-[#1a0a05]">
                                  <AvatarPixel
                                    config={rankingData[1]?.avatar_config?.skinId ? rankingData[1].avatar_config : { skinId: 'skin_m_1', instrumentId: '', backgroundId: 'bg_1' }}
                                    isSilhouette={!rankingData[1]?.avatar_config?.skinId}
                                    hideBackground={true}
                                  />
                                </div>
                                <div className={`w-full bg-[#5a6b7d] border-2 border-[#3d4b5c] shadow-[2px_2px_0_#000] z-20 flex flex-col items-center justify-center p-1.5 relative ${
                                  TILES.find(t => t.id === rankingData[1]?.avatar_config?.tileId)?.className || ''
                                }`}>
                                  <div className="font-black text-white text-base uppercase drop-shadow-[1px_1px_0_#000]">2ND</div>
                                  <div
                                    className="font-black text-[8px] uppercase text-white truncate w-full text-center mt-0.5"
                                    style={FONTS.find(f => f.id === rankingData[1]?.avatar_config?.fontId) ? { fontFamily: FONTS.find(f => f.id === rankingData[1]?.avatar_config?.fontId)?.fontFamily } : {}}
                                  >{rankingData[1].nome}</div>
                                  <div className="text-white/80 text-[7px] font-black uppercase">{rankingData[1].xp} PTS</div>
                                </div>
                              </div>
                            )}
                            {/* 1ST */}
                            {rankingData[0] && (
                              <div
                                onClick={() => { setSelectedAluno(rankingData[0]); setIsAlunoModalOpen(true); }}
                                className="w-[36%] h-full flex flex-col items-center justify-end cursor-pointer hover:-translate-y-1 transition-transform z-30"
                              >
                                <div className="absolute inset-0 bg-[#ffeb3b] blur-2xl opacity-10 rounded-full pointer-events-none" />
                                <div className="w-full h-36 relative z-10 flex items-end justify-center pb-0 border-x-2 border-t-2 border-[#261812] bg-[#1a0a05]">
                                  <AvatarPixel
                                    config={rankingData[0]?.avatar_config?.skinId ? rankingData[0].avatar_config : { skinId: 'skin_m_1', instrumentId: '', backgroundId: 'bg_1' }}
                                    isSilhouette={!rankingData[0]?.avatar_config?.skinId}
                                    hideBackground={true}
                                  />
                                </div>
                                <div className={`w-full bg-[#ffb300] border-2 border-[#ff8f00] shadow-[4px_4px_0_#000] z-20 flex flex-col items-center justify-center p-2 relative ${
                                  TILES.find(t => t.id === rankingData[0]?.avatar_config?.tileId)?.className || ''
                                }`}>
                                  <div className="font-black text-black text-2xl uppercase">1ST</div>
                                  <div
                                    className="font-black text-[9px] uppercase text-black truncate w-full text-center mt-0.5"
                                    style={FONTS.find(f => f.id === rankingData[0]?.avatar_config?.fontId) ? { fontFamily: FONTS.find(f => f.id === rankingData[0]?.avatar_config?.fontId)?.fontFamily } : {}}
                                  >{rankingData[0].nome}</div>
                                  <div className="text-black/80 text-[7px] font-black uppercase mt-0.5">{rankingData[0].xp} PTS</div>
                                </div>
                              </div>
                            )}
                            {/* 3RD */}
                            {rankingData[2] && (
                              <div
                                onClick={() => { setSelectedAluno(rankingData[2]); setIsAlunoModalOpen(true); }}
                                className="w-[28%] h-[70%] flex flex-col items-center justify-end cursor-pointer hover:-translate-y-1 transition-transform"
                              >
                                <div className="w-full h-20 relative z-10 flex items-end justify-center pb-0 border-x-2 border-t-2 border-[#261812] bg-[#1a0a05]">
                                  <AvatarPixel
                                    config={rankingData[2]?.avatar_config?.skinId ? rankingData[2].avatar_config : { skinId: 'skin_m_1', instrumentId: '', backgroundId: 'bg_1' }}
                                    isSilhouette={!rankingData[2]?.avatar_config?.skinId}
                                    hideBackground={true}
                                  />
                                </div>
                                <div className={`w-full bg-[#8d6e63] border-2 border-[#5d4037] shadow-[2px_2px_0_#000] z-20 flex flex-col items-center justify-center p-1.5 relative ${
                                  TILES.find(t => t.id === rankingData[2]?.avatar_config?.tileId)?.className || ''
                                }`}>
                                  <div className="font-black text-white text-sm uppercase">3RD</div>
                                  <div
                                    className="font-black text-[8px] uppercase text-white truncate w-full text-center"
                                    style={FONTS.find(f => f.id === rankingData[2]?.avatar_config?.fontId) ? { fontFamily: FONTS.find(f => f.id === rankingData[2]?.avatar_config?.fontId)?.fontFamily } : {}}
                                  >{rankingData[2].nome}</div>
                                  <div className="text-white/70 text-[6px] font-black uppercase">{rankingData[2].xp} PTS</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* LISTA: posições 4+ */}
                        {rankingData.slice(rankingData.length > 3 ? 3 : 0).map((player: any, idx: number) => {
                          const rank = (rankingData.length > 3 ? idx + 4 : idx + 1);
                          const playerFont = FONTS.find(f => f.id === player?.avatar_config?.fontId)?.fontFamily;
                          const playerTileClass = TILES.find(t => t.id === player?.avatar_config?.tileId)?.className || 'border-[#3d2d26]';
                          return (
                            <div
                              key={player.id}
                              onClick={() => { setSelectedAluno(player); setIsAlunoModalOpen(true); }}
                              className={`flex items-center gap-3 p-2 border-2 cursor-pointer bg-[#261812] transition-colors hover:bg-[#3d2d26] ${playerTileClass}`}
                            >
                              <div className="font-black text-sm shrink-0 w-6 text-center text-white">{rank}.</div>
                              <div className="w-12 h-12 rounded bg-[#1a0a05] shrink-0 flex items-end justify-center pb-0 relative overflow-hidden border border-[#3d2d26]">
                                <AvatarPixel
                                  config={player?.avatar_config?.skinId ? player.avatar_config : { skinId: 'skin_m_1', instrumentId: '', backgroundId: 'bg_1' }}
                                  isSilhouette={!player?.avatar_config?.skinId}
                                  hideBackground={true}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-[10px] uppercase text-white truncate mb-0" style={playerFont ? { fontFamily: playerFont } : {}}>{player.nome}</p>
                                <div className="flex flex-wrap gap-1 mt-0.5">
                                  {(player.conquistas || []).slice(0, 3).map((c: any, cIdx: number) => (
                                    <div key={cIdx} className="w-4 h-4 border border-black bg-white flex items-center justify-center" title={c.nome}>
                                      {c.icone_url || resolveTrophyImage(c.instrumento, c.classe) ? (
                                        <img src={c.icone_url || resolveTrophyImage(c.instrumento, c.classe)} alt={c.nome} className="w-full h-full object-contain" />
                                      ) : <span className="text-[6px]">🏆</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                <p className="font-black text-xs italic text-[#ff6b00] leading-none">{player.xp} XP</p>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setAssignData({ aluno_id: String(player.id), conquista_id: '' }); setIsAssignModalOpen(true); fetchConquistas(); }}
                                  className="bg-[#ff6b00] text-white px-2 py-0.5 border-2 border-black font-black text-[7px] shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-0.5"
                                >
                                  <Plus className="w-2.5 h-2.5" /> CREDITAR
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* BOTTOM NAV */}
        <nav className="fixed md:absolute bottom-0 left-0 right-0 md:left-auto md:right-auto md:w-full h-20 bg-[#261812] border-t-8 border-black flex items-center justify-around px-2 z-50">
          {[
            { id: 'home', icon: Home, label: 'HOME' },
            { id: 'jogos', icon: Gamepad2, label: 'JOGOS' },
            { id: 'agenda', icon: Calendar, label: 'AGENDA' },
            { id: 'treinos', icon: Flame, label: 'TREINOS' },
            { id: 'ranking', icon: Trophy, label: 'RANKING' },
            { id: 'perfil', icon: User, label: 'PERFIL' },
          ].map((item, i) => {
            const isActive = activeProfessorTab === item.id;
            return (
              <button 
                key={i} 
                onClick={() => {
                  setActiveProfessorTab(item.id as any);
                  if (item.id === 'ranking') {
                    fetchRanking();
                    fetchConquistas();
                    fetchSolicitacoes();
                  }
                  if (item.id === 'treinos') {
                    fetchTreinos();
                  }
                  playRetroSound(440, 'triangle', 0.04); // som de clique retrô sutil ao navegar
                }}
                className={`flex flex-col items-center gap-0.5 transition-all ${isActive ? 'translate-y-[-4px]' : 'opacity-50 hover:opacity-80'}`}
              >
                <div className={`p-1.5 border-4 border-black shadow-[4px_4px_0_#000] ${isActive ? 'bg-[#ff6b00]' : 'bg-white'}`}>
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-black'}`} />
                </div>
                <span className="text-[5.5px] font-black text-white uppercase tracking-tighter">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* MUSICLASS: MODAL DE CRIAÇÃO DE NOVA AULA AVULSA */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto font-['Space_Mono']">
          <div className={`bg-[#fff8f6] border-8 border-black p-6 relative shadow-[12px_12px_0_#000] w-full max-h-[90vh] overflow-y-auto font-['Space_Mono'] transition-all duration-300 ${mcActiveTab === 'geral' ? 'max-w-md' : 'max-w-4xl'}`}>
            
            {/* Fechar botão */}
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => setIsCreateModalOpen(false)} 
                className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-6">
              <span className="font-black bg-[#ff6b00] text-white text-[8px] px-2 py-1 uppercase tracking-widest border-2 border-black shadow-[2px_2px_0_#000]">
                MUSICLASS CREATOR
              </span>
              <h2 className="text-xl font-black text-black uppercase italic tracking-tighter mt-3">
                REGISTRAR NOVA AULA
              </h2>
              <p className="text-[8px] font-black text-[#8e7164] uppercase tracking-wider">
                Crie e registre um novo diário de aula do zero
              </p>
            </div>

            <form onSubmit={criarNovaAulaAvulsa} className="space-y-4">
              
              {/* Seleção de Aluno */}
              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-widest block mb-1">ALUNO</label>
                <select
                  required
                  className="w-full p-3 bg-white border-4 border-black text-xs font-black uppercase focus:outline-none"
                  value={newAulaAlunoId}
                  onChange={(e) => {
                    const aid = e.target.value;
                    setNewAulaAlunoId(aid);
                    const sel = alunosList.find(a => a.id === aid);
                    if (sel && sel.curso_ativo) {
                      setNewAulaCurso(sel.curso_ativo);
                    }
                  }}
                >
                  <option value="">-- SELECIONE O ALUNO --</option>
                  {alunosList.map((al: any) => (
                    <option key={al.id} value={al.id}>
                      {al.nome} {al.curso_ativo ? `(${al.curso_ativo.toUpperCase()})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data e Horário */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-black uppercase tracking-widest block mb-1">DATA</label>
                  <input
                    type="date"
                    required
                    className="w-full p-2.5 bg-white border-4 border-black text-xs font-black focus:outline-none"
                    value={newAulaData}
                    onChange={(e) => setNewAulaData(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-black uppercase tracking-widest block mb-1">HORÁRIO</label>
                  <input
                    type="time"
                    required
                    className="w-full p-2.5 bg-white border-4 border-black text-xs font-black focus:outline-none"
                    value={newAulaHorario}
                    onChange={(e) => setNewAulaHorario(e.target.value)}
                  />
                </div>
              </div>

              {/* Curso/Instrumento */}
              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-widest block mb-1">CURSO / INSTRUMENTO</label>
                <input
                  type="text"
                  required
                  placeholder="EX: PIANO, TECLADO, VIOLÃO"
                  className="w-full p-3 bg-white border-4 border-black text-xs font-black uppercase placeholder:text-black/20 focus:outline-none"
                  value={newAulaCurso}
                  onChange={(e) => setNewAulaCurso(e.target.value)}
                />
              </div>

              {/* Presença/Falta */}
              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-widest block mb-2">STATUS DA AULA</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewAulaStatus('realizada')}
                    className={`py-3 px-4 border-4 border-black font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${
                      newAulaStatus === 'realizada' 
                        ? 'bg-emerald-500 text-white shadow-[4px_4px_0_#000] -translate-y-[2px]' 
                        : 'bg-white text-black/50 hover:text-black'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> PRESENTE
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAulaStatus('falta_aluno')}
                    className={`py-3 px-4 border-4 border-black font-black text-xs uppercase transition-all flex items-center justify-center gap-2 ${
                      newAulaStatus === 'falta_aluno' 
                        ? 'bg-red-500 text-white shadow-[4px_4px_0_#000] -translate-y-[2px]' 
                        : 'bg-white text-black/50 hover:text-black'
                    }`}
                  >
                    <XCircle className="w-4 h-4" /> FALTA DO ALUNO
                  </button>
                </div>
              </div>

              {newAulaStatus === 'realizada' && renderMusiclassTabs(true)}

              {/* Botão de Envio */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#ff6b00] text-white py-4 border-4 border-black font-black uppercase shadow-[6px_6px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" /> ENVIAR E SALVAR AULA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MUSICLASS: MODAL DE REGISTRO DE AULA EXISTENTE */}
      {isModalOpen && selectedAula && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto font-['Space_Mono']">
          <div className={`bg-[#fff8f6] border-8 border-black p-6 relative shadow-[12px_12px_0_#000] w-full max-h-[90vh] overflow-y-auto font-['Space_Mono'] transition-all duration-300 ${mcActiveTab === 'geral' ? 'max-w-md' : 'max-w-4xl'}`}>
            
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
              <h2 className="text-xl font-black text-black uppercase italic tracking-tighter mt-3 text-ellipsis overflow-hidden">
                {selectedAula.nome || selectedAula.aluno_nome || 'REGISTRAR AULA'}
              </h2>
              <p className="text-[8px] font-black text-[#8e7164] uppercase tracking-wider">
                {selectedAula.curso_nome || 'CURSO REGULAR'} @ {selectedAula.horario?.substring(0, 5)}
              </p>
            </div>

            <form onSubmit={salvarDiarioAula} className="space-y-4">
              
              {showFichaChoice && (
                <div className="border-4 border-dashed border-[#ff6b00] bg-[#feccba]/10 p-4 space-y-3.5 mb-4 shadow-[4px_4px_0_rgba(0,0,0,0.05)] rounded-none font-mono">
                  <div className="flex items-center gap-2 text-[#ff6b00] font-black text-[10px] uppercase tracking-widest">
                    <span>🔄</span> DETECTAMOS UMA NOVA FICHA DE AULA
                  </div>
                  <p className="text-[9px] text-[#8e7164] uppercase leading-relaxed font-black">
                    Deseja iniciar esta ficha totalmente do zero ou copiar os dados da aula anterior realizada deste aluno para reaproveitar?
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFichaChoice(false)}
                      className="py-2.5 bg-black text-white hover:bg-stone-900 border-2 border-black text-[9px] font-black uppercase tracking-wider shadow-[2px_2px_0_rgba(0,0,0,0.2)] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5"
                    >
                      ✨ FICHA DO ZERO
                    </button>
                    <button
                      type="button"
                      disabled={loadingUltimaAula}
                      onClick={() => copiarUltimaAula(selectedAula.aluno_id)}
                      className="py-2.5 bg-[#ff6b00] text-white hover:bg-[#e05e00] border-2 border-black text-[9px] font-black uppercase tracking-wider shadow-[2px_2px_0_rgba(0,0,0,0.2)] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {loadingUltimaAula ? '⏳ CARREGANDO...' : '🔄 COPIAR ANTERIOR'}
                    </button>
                  </div>
                </div>
              )}

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

              {statusAula === 'realizada' && renderMusiclassTabs(false)}

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

      {/* MODAL DE PRE-VISUALIZACAO E IMPRESSÃO (PDF) */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#fff8f6] border-8 border-black w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-[12px_12px_0_#000]">
            {/* Controles do modal (ocultos na impressão via CSS print:hidden) */}
            <div className="sticky top-0 z-10 flex justify-end gap-2 p-4 bg-[#fff8f6] border-b-4 border-black print:hidden" data-html2canvas-ignore>
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="bg-emerald-500 text-white px-3 py-2 border-2 border-black font-black text-xs uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center gap-1.5"
              >
                <span>⬇️</span> BAIXAR PDF
              </button>
              <button 
                type="button"
                onClick={() => setIsPreviewOpen(false)} 
                className="bg-black text-white p-2 border-2 border-black shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            {/* CONTEÚDO PEDAGÓGICO */}
            <div ref={pdfRef} className="print-area p-8 space-y-6 font-['Space_Mono'] bg-[#fff8f6]">
              {/* Cabeçalho */}
              <div className="border-b-4 border-black pb-4 text-center">
                <span className="font-black bg-[#ff6b00] text-white text-[10px] px-3 py-1 uppercase tracking-widest border-2 border-black shadow-[2px_2px_0_#000]">
                  STUDIO ACORDE
                </span>
                <h1 className="text-2xl font-black text-black uppercase italic mt-4">
                  DIÁRIO PEDAGÓGICO DE AULA
                </h1>
                <p className="text-xs font-black text-[#ff6b00] uppercase tracking-wider mt-1">
                  Musiclass v2
                </p>
              </div>

              {/* Informações Gerais */}
              <div className="grid grid-cols-2 gap-4 border-4 border-black p-4 bg-white">
                <div>
                  <p className="text-[10px] font-black text-[#8e7164] uppercase">Aluno</p>
                  <p className="text-sm font-black text-black uppercase">
                    {isCreateModalOpen 
                      ? (alunosList.find(a => a.id === newAulaAlunoId)?.nome || 'Não Selecionado')
                      : (selectedAula?.nome || selectedAula?.aluno_nome || 'N/A')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#8e7164] uppercase">Curso / Instrumento</p>
                  <p className="text-sm font-black text-black uppercase">
                    {isCreateModalOpen ? newAulaCurso : (selectedAula?.curso_nome || 'Regular')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#8e7164] uppercase">Data</p>
                  <p className="text-sm font-black text-black">
                    {isCreateModalOpen 
                      ? (newAulaData ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(newAulaData)) : '')
                      : (selectedAula?.data ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(selectedAula.data)) : '')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-[#8e7164] uppercase">Horário</p>
                  <p className="text-sm font-black text-black">
                    {isCreateModalOpen ? newAulaHorario : (selectedAula?.horario?.substring(0, 5) || '')}
                  </p>
                </div>
              </div>

              {/* Conteúdo Trabalhado */}
              <div className="space-y-2 break-inside-avoid">
                <h3 className="text-xs font-black uppercase bg-[#261812] text-white px-2 py-1 inline-block">
                  📝 CONTEÚDO TRABALHADO
                </h3>
                <div className="border-4 border-black p-4 bg-white text-xs whitespace-pre-wrap font-bold uppercase text-black">
                  {isCreateModalOpen ? newAulaConteudo : conteudo}
                </div>
              </div>

              {/* Tarefa de Casa */}
              <div className="space-y-2 break-inside-avoid">
                <h3 className="text-xs font-black uppercase bg-[#261812] text-white px-2 py-1 inline-block">
                  🎯 DESAFIO / TAREFA DE CASA
                </h3>
                <div className="border-4 border-black p-4 bg-white text-xs whitespace-pre-wrap font-bold uppercase text-[#ff6b00]">
                  {isCreateModalOpen ? newAulaTarefa : tarefaCasa}
                </div>
              </div>

              {/* Acordes */}
              {mcChords.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase bg-[#261812] text-white px-2 py-1 inline-block">
                    🎸 ACORDES TRABALHADOS
                  </h3>
                  {Object.entries(
                    mcChords.reduce((groups: Record<string, any[]>, chord) => {
                      const groupName = chord.group || 'GERAL';
                      if (!groups[groupName]) groups[groupName] = [];
                      groups[groupName].push(chord);
                      return groups;
                    }, {})
                  ).map(([groupName, chords]) => (
                    <div key={groupName} className="border-4 border-black bg-white p-4 space-y-4">
                      <div className="bg-black text-[#ff6b00] px-2 py-0.5 text-[8px] font-black uppercase tracking-widest inline-block">
                        GRUPO: {groupName}
                      </div>
                      <div className="grid grid-cols-2 gap-4 items-start">
                        {(chords as any[]).map((ch, idx) => {
                          const isTeclado = ch.instrument?.toLowerCase().includes('teclado') || ch.instrument?.toLowerCase().includes('piano');
                          return (
                            <div key={idx} className="border-2 border-black p-1 bg-white w-full break-inside-avoid">
                              <ChordVisualizer
                                instrument={ch.instrument || mcPlaygroundInstrument}
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
                  ))}
                </div>
              )}

              {/* Escalas */}
              {mcScales.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase bg-[#261812] text-white px-2 py-1 inline-block">
                    🎼 ESCALAS E DIGITAÇÃO
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {mcScales.map((sc, idx) => (
                      <div key={idx} className="border-4 border-black p-4 bg-white space-y-1">
                        <p className="text-[10px] font-black uppercase text-[#ff6b00]">{sc.name}</p>
                        <p className="text-xs font-black text-black tracking-widest">{sc.notes?.join(' - ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tablatura */}
              {mcTablatures.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase bg-[#261812] text-white px-2 py-1 inline-block">
                    📝 TABLATURA
                  </h3>
                  {mcTablatures.map((tab, idx) => (
                    <div key={idx} className="border-4 border-black p-4 bg-white space-y-2">
                      <p className="text-[10px] font-black uppercase text-[#ff6b00]">{tab.name}</p>
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
              )}

              {/* Bateria */}
              {mcDrums.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase bg-[#261812] text-white px-2 py-1 inline-block">
                    🥁 RITMOS E BATERIA
                  </h3>
                  {mcDrums.map((drum, idx) => (
                    <div key={idx} className="border-4 border-black p-4 bg-white space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] font-black uppercase text-[#ff6b00]">{drum.name}</p>
                        <span className="text-[9px] font-mono text-black font-black">{drum.bpm} BPM</span>
                      </div>
                      <DrumsVisualizer rhythmName={drum.name} />
                    </div>
                  ))}
                </div>
              )}

              {/* Melodia */}
              {mcMelody.length > 0 && (
                <div className="bg-[#f8f9fa] border-4 border-black p-4 space-y-4 shadow-[6px_6px_0_#000] rounded-xl font-['Inter']">
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex-1 space-y-5">
                      <h4 className="text-sm font-black text-black uppercase tracking-widest border-b-2 border-black/10 pb-2">
                        🎹 SOLOS E MELODIAS (BIMANUAL)
                      </h4>
                      {mcMelody.map((mel, idx) => (
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
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ferramentas */}
      {showTools && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="w-full max-w-[500px] md:max-w-[560px]">
            <MusiclassTools onClose={() => setShowTools(false)} />
          </div>
        </div>
      )}

      {/* ===== MODAL: BIBLIOTECA DE MATERIAIS SALVOS ===== */}
      {showBibliotecaModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm font-['Space_Mono']">
          <div className="bg-[#fff8f6] border-8 border-black w-full max-w-lg shadow-[12px_12px_0_#000] flex flex-col max-h-[80vh]">
            <header className="p-4 border-b-4 border-black flex items-center justify-between bg-[#feccba] shrink-0">
              <div>
                <h2 className="font-black text-sm uppercase italic tracking-tighter text-black">
                  📚 BIBLIOTECA — {showBibliotecaModal === 'tablatura' ? 'TABLATURAS SALVAS' : 'MELODIAS SALVAS'}
                </h2>
                <p className="text-[8px] font-black text-[#8e7164] uppercase tracking-widest">Clique para carregar na grade atual</p>
              </div>
              <button onClick={() => setShowBibliotecaModal(null)} className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all">
                ✕
              </button>
            </header>
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {materiaisSalvos.length === 0 ? (
                <div className="text-center py-10 text-[#8e7164] font-black text-[9px] uppercase border-4 border-dashed border-black">
                  Nenhum material salvo na biblioteca ainda.
                </div>
              ) : (
                materiaisSalvos.map((mat: any) => (
                  <div key={mat.id} className="border-4 border-black bg-white p-3 space-y-2 shadow-[4px_4px_0_#000]">
                    <div className="flex items-center justify-between">
                      <p className="font-black text-[10px] uppercase text-black">{mat.titulo}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (showBibliotecaModal === 'tablatura') {
                              setNewTabName(mat.titulo);
                              setNewTabMatrix(mat.conteudo?.matrix || Array(6).fill(null).map(() => Array(32).fill('')));
                              toast.success(`Tablatura "${mat.titulo}" carregada!`);
                            }
                            setShowBibliotecaModal(null);
                          }}
                          className="bg-[#ff6b00] text-white px-3 py-1 border-2 border-black font-black text-[8px] uppercase shadow-[2px_2px_0_#000] active:translate-y-[1px] active:shadow-none"
                        >
                          📥 CARREGAR
                        </button>
                        <button
                          onClick={() => deleteMaterialSalvo(mat.id)}
                          className="bg-red-600 text-white px-2 py-1 border-2 border-black font-black text-[8px] uppercase shadow-[2px_2px_0_#000] active:translate-y-[1px] active:shadow-none"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    {showBibliotecaModal === 'tablatura' && mat.conteudo?.matrix && (
                      <div className="overflow-x-auto">
                        <div className="grid gap-px" style={{ gridTemplateColumns: 'auto repeat(16, 1fr)', minWidth: '280px' }}>
                          {['e','B','G','D','A','E'].map((str, strIdx) => (
                            <React.Fragment key={strIdx}>
                              <div className="flex items-center justify-center bg-[#261812] text-[#ff6b00] font-black text-[7px] border border-black px-0.5 min-w-[12px]">{str}</div>
                              {Array.from({ length: 16 }).map((_, beat) => (
                                <div key={beat} className="h-4 flex items-center justify-center bg-white border border-black/20 text-[7px] font-black">
                                  {mat.conteudo.matrix?.[strIdx]?.[beat] || '-'}
                                </div>
                              ))}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Atribuição de Conquista para Aluno */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto font-['Space_Mono']">
          <div className="bg-[#fff8f6] border-8 border-black p-6 relative shadow-[12px_12px_0_#000] w-full max-w-md">
            
            {/* Fechar botão */}
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => setIsAssignModalOpen(false)} 
                className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-6">
              <span className="font-black bg-[#ff6b00] text-white text-[8px] px-2 py-1 uppercase tracking-widest border-2 border-black shadow-[2px_2px_0_#000]">
                GAMIFICATION SYSTEM
              </span>
              <h2 className="text-xl font-black text-black uppercase italic tracking-tighter mt-3">
                CREDITAR TROFÉU
              </h2>
              <p className="text-[8px] font-black text-[#8e7164] uppercase tracking-wider">
                Atribua uma conquista e adicione XP à ficha do aluno
              </p>
            </div>

            <form onSubmit={handleAssignConquista} className="space-y-4">
              
              {/* Seleção de Aluno */}
              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-widest block mb-1">ALUNO</label>
                <select
                  required
                  className="w-full p-3 bg-white border-4 border-black text-xs font-black uppercase focus:outline-none text-black"
                  value={assignData.aluno_id}
                  onChange={(e) => setAssignData(prev => ({ ...prev, aluno_id: e.target.value }))}
                >
                  <option value="">-- SELECIONE O ALUNO --</option>
                  {alunosList.map((al: any) => (
                    <option key={al.id} value={al.id}>
                      {al.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seleção de Conquista */}
              <div>
                <label className="text-[10px] font-black text-black uppercase tracking-widest block mb-1">CONQUISTA / MEDALHA</label>
                <select
                  required
                  className="w-full p-3 bg-white border-4 border-black text-xs font-black uppercase focus:outline-none text-black"
                  value={assignData.conquista_id}
                  onChange={(e) => setAssignData(prev => ({ ...prev, conquista_id: e.target.value }))}
                >
                  <option value="">-- SELECIONE A MEDALHA --</option>
                  {conquistasList.map((co: any) => (
                    <option key={co.id} value={co.id}>
                      🏆 {co.nome} (+{co.pontos} XP)
                    </option>
                  ))}
                </select>
              </div>

              {/* Ações */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-[#ff6b00] hover:bg-[#e05e00] text-white py-3 border-4 border-black font-black uppercase text-xs shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  🏆 CREDITAR AGORA
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: HISTÓRICO DE AULAS CONCLUÍDAS DO ALUNO */}
      {isHistoricoModalOpen && selectedAlunoHistorico && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto font-['Space_Mono']">
          <div className="bg-[#fff8f6] border-8 border-black p-6 relative shadow-[12px_12px_0_#000] w-full max-w-lg max-h-[85vh] overflow-y-auto">
            
            {/* Fechar botão */}
            <div className="absolute top-4 right-4">
              <button 
                onClick={() => {
                  setIsHistoricoModalOpen(false);
                  playRetroSound(146.83, 'sawtooth', 0.15); // som retrô de fechar
                }} 
                className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-6">
              <span className="font-black bg-[#ff6b00] text-white text-[8px] px-2 py-1 uppercase tracking-widest border-2 border-black shadow-[2px_2px_0_#000]">
                STUDENT HISTORY
              </span>
              <h2 className="text-xl font-black text-black uppercase italic tracking-tighter mt-3">
                {selectedAlunoHistorico.nome}
              </h2>
              <p className="text-[8px] font-black text-[#8e7164] uppercase tracking-wider">
                Evolução cronológica de aulas concluídas e tarefas passadas
              </p>
            </div>

            {loadingHistorico ? (
              <div className="py-12 text-center">
                <p className="text-black font-black text-xs uppercase tracking-widest animate-pulse">
                  &gt;&gt; REQUISITANDO DADOS HISTÓRICOS...
                </p>
              </div>
            ) : historicoAulas.length === 0 ? (
              <div className="py-8 text-center border-4 border-dashed border-black/20 bg-white">
                <p className="text-[#8e7164] font-black text-[9px] uppercase italic">
                  &gt;&gt; NENHUMA AULA ANTERIOR ENCONTRADA PARA ESTE ALUNO
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {historicoAulas.map((aula: any) => {
                  let dataFormatada = aula.data;
                  try {
                    const dateParts = aula.data.split('-');
                    const d = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
                    dataFormatada = format(d, "dd/MM/yyyy (EEEE)", { locale: ptBR }).toUpperCase();
                  } catch (e) {}

                  return (
                    <div key={aula.id} className="border-4 border-black p-4 bg-white shadow-[4px_4px_0_#000] space-y-3 relative overflow-hidden">
                      <div className="flex justify-between items-start border-b-2 border-black/10 pb-2">
                        <div>
                          <span className="text-[#ff6b00] font-black text-[9px] uppercase tracking-wider block">
                            📅 {dataFormatada} @ {aula.horario?.substring(0, 5)}
                          </span>
                          <span className="bg-[#402a20] text-[#feccba] border border-black px-1 font-black text-[7px] uppercase tracking-tighter mt-1 inline-block">
                            {aula.cursos?.nome || 'CURSO'}
                          </span>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-500 px-1.5 py-0.5 font-black text-[7px] uppercase tracking-widest">
                          +{aula.xp_ganho || 50} XP
                        </span>
                      </div>

                      {/* Conteúdo Pedagógico */}
                      <div>
                        <span className="text-[7.5px] font-black text-black/55 uppercase tracking-widest block mb-0.5">
                          💡 CONTEÚDO PRATICADO:
                        </span>
                        <p className="text-[10px] text-black font-semibold bg-stone-50 p-2 border-2 border-black whitespace-pre-line leading-relaxed">
                          {aula.conteudo || 'Nenhum diário registrado.'}
                        </p>
                      </div>

                      {/* Tarefa de Casa */}
                      {aula.tarefa_casa && (
                        <div>
                          <span className="text-[7.5px] font-black text-[#ff6b00] uppercase tracking-widest block mb-0.5">
                            📝 TAREFA DE CASA / MISSÃO:
                          </span>
                          <p className="text-[10px] text-black font-semibold bg-[#fff8f6] p-2 border-2 border-[#ff6b00] whitespace-pre-line leading-relaxed">
                            {aula.tarefa_casa}
                          </p>
                        </div>
                      )}

                      {/* Professor */}
                      <div className="flex justify-end text-[7px] font-black text-black/30 uppercase">
                        Instrutor: {aula.professores?.nome || 'HUB'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: GAVETA DE NOTIFICAÇÕES (DRAWER RETRO) */}
      {isNotifDrawerOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center p-0 md:p-4 bg-black/85 backdrop-blur-sm font-['Space_Mono']">
          <div className="bg-[#fff8f6] border-t-8 md:border-8 border-black p-6 relative shadow-[0_-8px_0_#000,12px_12px_0_#000] w-full max-w-md h-[80vh] md:h-[600px] flex flex-col justify-between overflow-hidden">
            
            {/* Fechar botão */}
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={() => {
                  setIsNotifDrawerOpen(false);
                  playRetroSound(146.83, 'sawtooth', 0.15); // som retrô de fechar
                }} 
                className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4 shrink-0">
              <span className="font-black bg-[#ff6b00] text-white text-[8px] px-2 py-1 uppercase tracking-widest border-2 border-black shadow-[2px_2px_0_#000]">
                NOTIFICATIONS ENGINE
              </span>
              <div className="flex justify-between items-center mt-3">
                <h2 className="text-xl font-black text-black uppercase italic tracking-tighter">
                  🔔 NOTIFICAÇÕES
                </h2>
                {notificacoes.length > 0 && (
                  <button
                    onClick={limparNotificacoes}
                    className="bg-[#ff3333] hover:bg-red-700 text-white border-2 border-black font-black uppercase text-[7.5px] px-2 py-1.5 shadow-[2px_2px_0_#000] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  >
                    LIMPAR TODAS
                  </button>
                )}
              </div>
              <p className="text-[8px] font-black text-[#8e7164] uppercase tracking-wider mt-1">
                Feed de atividades recentes enviadas pelos alunos em tempo real
              </p>
            </div>

            {/* Lista das Notificações */}
            <div className="flex-1 overflow-auto space-y-3 pr-1 pb-4">
              {notificacoes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center border-4 border-dashed border-black/25 bg-white p-8">
                  <span className="text-3xl animate-bounce">🔈</span>
                  <p className="text-[#8e7164] font-black text-[9px] uppercase italic text-center mt-4">
                    &gt;&gt; NADA DE NOVO POR AQUI. SILÊNCIO TOTAL DE 8 BITS...
                  </p>
                </div>
              ) : (
                notificacoes.map((notif: any) => {
                  let NotifIcon = Bell;
                  let iconBg = 'bg-[#feccba]';
                  if (notif.tipo === 'treino') {
                    NotifIcon = Flame;
                    iconBg = 'bg-orange-500 text-white';
                  } else if (notif.tipo === 'trofeu' || notif.tipo === 'conquista') {
                    NotifIcon = Trophy;
                    iconBg = 'bg-yellow-400 text-black';
                  } else if (notif.tipo === 'confirmacao') {
                    NotifIcon = CheckCircle;
                    iconBg = 'bg-emerald-500 text-white';
                  }

                  const formatTime = (timeStr: string) => {
                    try {
                      return new Date(timeStr).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                    } catch (e) {
                      return '';
                    }
                  };

                  return (
                    <div 
                      key={notif.id}
                      onClick={() => !notif.lida && marcarNotificacaoLida(notif.id)}
                      className={`border-4 border-black p-3 bg-white shadow-[4px_4px_0_#000] relative overflow-hidden transition-all flex gap-3 ${
                        !notif.lida ? 'border-l-[12px] border-l-[#ff6b00] cursor-pointer hover:bg-stone-50' : 'opacity-70'
                      }`}
                    >
                      {/* Ícone */}
                      <div className={`w-8 h-8 border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_#000] ${iconBg}`}>
                        <NotifIcon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-center gap-1.5">
                          <h4 className="font-black text-[9.5px] uppercase truncate text-black mb-0 leading-tight">
                            {notif.titulo}
                          </h4>
                          <span className="text-[6.5px] font-black text-black/30 shrink-0">
                            {formatTime(notif.created_at)}
                          </span>
                        </div>
                        <p className="text-[8.5px] font-semibold text-black mt-1 leading-normal">
                          {notif.mensagem}
                        </p>
                      </div>

                      {/* Dot pixelado indicando não lida */}
                      {!notif.lida && (
                        <div className="absolute top-1 right-1 w-2 h-2 bg-[#ff6b00] border border-black animate-pulse" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PLAYER DE VÍDEO RETRO (TREINOS CURTOS 24H) */}
      {isTreinoVideoModalOpen && selectedTreinoVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm overflow-y-auto font-['Space_Mono']">
          <div className="bg-[#fff8f6] border-[8px] border-black p-5 relative shadow-[12px_12px_0_#000] w-full max-w-md">
            
            {/* Fechar botão */}
            <div className="absolute top-4 right-4 z-10">
              <button 
                onClick={() => {
                  setIsTreinoVideoModalOpen(false);
                  setSelectedTreinoVideo(null);
                  playRetroSound(146.83, 'sawtooth', 0.15); // som retrô de fechar
                }} 
                className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <span className="font-black bg-[#ff6b00] text-white text-[8px] px-2 py-1 uppercase tracking-widest border-2 border-black shadow-[2px_2px_0_#000]">
                VIDEO MONITOR
              </span>
              <h2 className="text-base font-black text-black uppercase italic tracking-tighter mt-2">
                📺 PERFORMANCE DO TREINO
              </h2>
            </div>

            {/* Container do Player Brutalista com visual pixel art */}
            <div className="border-4 border-black bg-black shadow-[6px_6px_0_#000] overflow-hidden relative group aspect-video">
              <video 
                src={selectedTreinoVideo} 
                controls 
                autoPlay 
                className="w-full h-full object-contain"
                playsInline
              />
            </div>
            
            <div className="mt-4 bg-[#261812] text-white p-3 border-4 border-black text-[7.5px] font-black uppercase text-center tracking-widest">
              ⏳ ESTE VÍDEO SERÁ EXCLUÍDO APÓS 24 HORAS PARA ECONOMIA DE ARMAZENAMENTO SUPABASE
            </div>
          </div>
        </div>
      )}

      {/* Aluno Profile Modal */}
      {isAlunoModalOpen && selectedAluno && (
        <PerfilEstudanteModal 
          selectedAluno={selectedAluno} 
          user={user} 
          onClose={() => setIsAlunoModalOpen(false)} 
          onConquistaRemoved={() => fetchRanking()} 
        />
      )}

      {/* MODAL HISTÓRICO FINANCEIRO */}
      {isFinanceiroModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 font-['Space_Mono']">
          <div className="bg-[#261812] border-8 border-black p-6 w-full max-w-sm relative shadow-[8px_8px_0_#000]">
            <button 
              onClick={() => setIsFinanceiroModalOpen(false)}
              className="absolute -top-4 -right-4 bg-[#ff6b00] text-black w-8 h-8 rounded-full border-4 border-black font-black flex items-center justify-center active:translate-y-1 shadow-[2px_2px_0_#000]"
            >
              X
            </button>
            
            <h2 className="text-[#ff6b00] font-black text-xl uppercase italic mb-4 border-b-4 border-black pb-2 flex items-center gap-2">
              <span>💰</span> HISTÓRICO DE SALÁRIO
            </h2>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {professorData?.historico_financeiro?.length > 0 ? (
                professorData.historico_financeiro.map((mesData: any, idx: number) => (
                  <div key={idx} className="bg-[#1a0a05] border-4 border-black p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[#8e7164] font-black text-[10px] uppercase mb-1">{mesData.mes_ano}</p>
                      <p className="text-[#feccba] text-[8px] uppercase font-bold tracking-widest">
                        {mesData.aulas} aulas registradas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-black text-xl italic">
                        R$ {Number(mesData.valor).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-[#1a0a05] border-4 border-black p-4 text-center">
                  <p className="text-[#8e7164] font-black text-[10px] uppercase mb-1">MÊS ANTERIOR</p>
                  <p className="text-white font-black text-2xl italic">
                    R$ {Number(professorData?.saldo_mes_passado || 0).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
