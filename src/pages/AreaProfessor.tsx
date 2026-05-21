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
  LogOut,
  Music,
  Settings2,
  Mic,
  Volume2,
  Square,
  PenTool,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MusicEngine, ROOTS, CHORD_TYPES, EXTENSIONS, SCALES } from '../lib/musicEngine';
import { ChordVisualizer, DrumsVisualizer } from '../components/musiclass/ChordVisualizers';
import { getPedagogicalSuggestion } from '../lib/pedagogicalAI';

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

// Helper para pegar os dias da semana atual (Segunda a Domingo)
const getWeekDays = () => {
  const today = new Date();
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
  const { logout } = useAuth();
  const [professorData, setProfessorData] = useState<any>(null);
  const [aulasHoje, setAulasHoje] = useState<any[]>([]);
  const [alunosList, setAlunosList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
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
  const [activeProfessorTab, setActiveProfessorTab] = useState<'home' | 'alunos' | 'agenda' | 'perfil' | 'playground'>('home');
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [agendaCompleta, setAgendaCompleta] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAgendaStatus, setFilterAgendaStatus] = useState<'todas' | 'pendente' | 'realizada' | 'falta_aluno'>('todas');
  const [selectedWeekDay, setSelectedWeekDay] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Estados Ricos do Musiclass compartilhados
  const [mcChords, setMcChords] = useState<any[]>([]);
  const [mcScales, setMcScales] = useState<any[]>([]);
  const [mcExercises, setMcExercises] = useState<any[]>([]);
  const [mcRecordings, setMcRecordings] = useState<any[]>([]);
  const [mcTablatures, setMcTablatures] = useState<any[]>([]);
  const [mcDrums, setMcDrums] = useState<any[]>([]);
  const [mcMelody, setMcMelody] = useState<any[]>([]);
  const [melodyPhrases, setMelodyPhrases] = useState<string[][]>([]); // frases da melodia atual
  const [showMelodyPhrases, setShowMelodyPhrases] = useState<boolean>(false);
  const [mcActiveTab, setMcActiveTab] = useState<'geral' | 'acordes' | 'escalas' | 'tablatura' | 'bateria' | 'exercicios' | 'studio' | 'melodia'>('geral');

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
  const [newTabMatrix, setNewTabMatrix] = useState<string[][]>(Array(6).fill(null).map(() => Array(16).fill('')));

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
      fetch('/api/agenda', { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/alunos', { headers }).then(r => r.ok ? r.json() : [])
    ]).then(([me, agenda, alunos]) => {
      if (me) {
        setProfessorData(me);
      }
      if (alunos) {
        // Filtra e ordena alunos arquivados ou ativos
        const sortedAlunos = Array.isArray(alunos) 
          ? alunos.filter((a: any) => a.status !== 'arquivado').sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || '')) 
          : [];
        setAlunosList(sortedAlunos);
      }
      
      if (agenda) {
        const sortedAgenda = (Array.isArray(agenda) ? agenda : [])
          .sort((a: any, b: any) => {
            const dateCompare = (a.data || '').localeCompare(b.data || '');
            if (dateCompare !== 0) return dateCompare;
            return (a.horario || '').localeCompare(b.horario || '');
          });
        setAgendaCompleta(sortedAgenda);
      }
      
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      // Filtra aulas do dia
      const hojeAulas = (Array.isArray(agenda) ? agenda : [])
        .filter((a: any) => getAulaLocalDateStr(a) === todayStr)
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

  // Funções de Música e Estúdio do Musiclass
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
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        options = { mimeType: 'audio/ogg' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
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
      melody: mcMelody
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
      melody: mcMelody
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
                {['INTRO', 'VERSO', 'REFRÃO', 'PONTE', 'SOLO', 'OUTRO'].map(grp => {
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

                    <div className="relative flex h-36 border-4 border-black bg-black p-1 select-none shadow-[6px_6px_0_#000] w-full max-w-[480px] mx-auto overflow-hidden">
                      <div className="relative flex w-full h-full">
                        {/* Teclas Brancas */}
                        {[
                          { absIdx: 0, label: 'Dó' },
                          { absIdx: 2, label: 'Ré' },
                          { absIdx: 4, label: 'Mi' },
                          { absIdx: 5, label: 'Fá' },
                          { absIdx: 7, label: 'Sol' },
                          { absIdx: 9, label: 'Lá' },
                          { absIdx: 11, label: 'Si' },
                          { absIdx: 12, label: 'Dó' },
                          { absIdx: 14, label: 'Ré' },
                          { absIdx: 16, label: 'Mi' }
                        ].map((k, i) => {
                          const isActive = customTecladoActiveKeys.includes(k.absIdx);
                          const keyWidth = 10;
                          const left = i * keyWidth;
                          return (
                            <button
                              key={k.absIdx}
                              type="button"
                              onClick={() => {
                                const noteMap: Record<number, string> = { 0: 'C4', 2: 'D4', 4: 'E4', 5: 'F4', 7: 'G4', 9: 'A4', 11: 'B4', 12: 'C5', 14: 'D5', 16: 'E5' };
                                melodySynth.playNoteByName(noteMap[k.absIdx]);
                                if (isActive) {
                                  setCustomTecladoActiveKeys(prev => prev.filter(x => x !== k.absIdx));
                                } else {
                                  setCustomTecladoActiveKeys(prev => [...prev, k.absIdx]);
                                }
                              }}
                              style={{ left: `${left}%`, width: `${keyWidth}%` }}
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
                        {[
                          { absIdx: 1, label: 'Dó#', left: 1 * 10 - 3 },
                          { absIdx: 3, label: 'Ré#', left: 2 * 10 - 3 },
                          { absIdx: 6, label: 'Fá#', left: 4 * 10 - 3 },
                          { absIdx: 8, label: 'Sol#', left: 5 * 10 - 3 },
                          { absIdx: 10, label: 'Lá#', left: 6 * 10 - 3 },
                          { absIdx: 13, label: 'Dó#', left: 8 * 10 - 3 },
                          { absIdx: 15, label: 'Ré#', left: 9 * 10 - 3 }
                        ].map((k) => {
                          const isActive = customTecladoActiveKeys.includes(k.absIdx);
                          return (
                            <button
                              key={k.absIdx}
                              type="button"
                              onClick={() => {
                                const noteMap: Record<number, string> = { 1: 'C#4', 3: 'D#4', 6: 'F#4', 8: 'G#4', 10: 'A#4', 13: 'C#5', 15: 'D#5' };
                                melodySynth.playNoteByName(noteMap[k.absIdx]);
                                if (isActive) {
                                  setCustomTecladoActiveKeys(prev => prev.filter(x => x !== k.absIdx));
                                } else {
                                  setCustomTecladoActiveKeys(prev => [...prev, k.absIdx]);
                                }
                              }}
                              style={{ left: `${k.left}%`, width: '6%' }}
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
                      CLIQUE NO TRASTE PARA PRESSIONAR E CIRCULE OS DEDOS (1 A 4), OU USE SOLTA/ABAFADA
                    </span>

                    <div className="border-4 border-black bg-[#261812] p-3 space-y-2.5 shadow-[4px_4px_0_#000]">
                      {[
                        { idx: 5, label: 'e (Mi agudo)' },
                        { idx: 4, label: 'B (Si)' },
                        { idx: 3, label: 'G (Sol)' },
                        { idx: 2, label: 'D (Ré)' },
                        { idx: 1, label: 'A (Lá)' },
                        { idx: 0, label: 'E (Mi grave)' }
                      ].map((str) => {
                        const state = customGuitarStrings[str.idx] || { fret: 0, finger: null };
                        return (
                          <div key={str.idx} className="flex items-center gap-2 bg-[#fff8f6] border-2 border-black p-2 shadow-[2px_2px_0_#000]">
                            <span className="w-16 font-black text-[9px] text-[#261812] uppercase tracking-wider shrink-0">{str.label}</span>
                            
                            <div className="flex gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...customGuitarStrings];
                                  updated[str.idx] = { fret: 0, finger: null };
                                  setCustomGuitarStrings(updated);
                                }}
                                className={`px-1.5 py-0.5 border-2 text-[8px] font-black transition-all ${
                                  state.fret === 0
                                    ? 'bg-emerald-500 text-white border-black'
                                    : 'bg-white text-black/50 border-black/30'
                                }`}
                              >
                                SOLTA
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...customGuitarStrings];
                                  updated[str.idx] = { fret: null, finger: null };
                                  setCustomGuitarStrings(updated);
                                }}
                                className={`px-1.5 py-0.5 border-2 text-[8px] font-black transition-all ${
                                  state.fret === null
                                    ? 'bg-red-500 text-white border-black'
                                    : 'bg-white text-black/50 border-black/30'
                                }`}
                              >
                                ABAFADA
                              </button>
                            </div>

                            <div className="flex items-center gap-1 flex-1 justify-around">
                              {[1, 2, 3, 4, 5].map((f) => {
                                const isSelected = state.fret === f;
                                return (
                                  <button
                                    key={f}
                                    type="button"
                                    onClick={() => {
                                      const updated = [...customGuitarStrings];
                                      if (isSelected) {
                                        const curFinger = state.finger || 1;
                                        if (curFinger < 4) {
                                          updated[str.idx] = { fret: f, finger: curFinger + 1 };
                                        } else {
                                          updated[str.idx] = { fret: null, finger: null };
                                        }
                                      } else {
                                        updated[str.idx] = { fret: f, finger: 1 };
                                      }
                                      setCustomGuitarStrings(updated);
                                    }}
                                    className={`w-7 h-7 rounded-none border-2 text-[9px] font-black flex items-center justify-center transition-all ${
                                      isSelected
                                        ? 'bg-[#ff6b00] text-white border-black shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]'
                                        : 'bg-stone-100 text-black/40 border-black/20 hover:border-black/50'
                                    }`}
                                  >
                                    {isSelected ? `D${state.finger || 1}` : `T${f}`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
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
              <div className="overflow-x-auto">
                <span className="text-[7px] font-black text-black/50 uppercase tracking-widest block mb-1">GRADE DE 6 CORDAS × 16 COMPASSOS (CLIQUE NA CÉLULA E SELECIONE O TRASTE ABAIXO)</span>
                <div className="grid gap-px" style={{ gridTemplateColumns: 'auto repeat(16, 1fr)', minWidth: '420px' }}>
                  {['e', 'B', 'G', 'D', 'A', 'E'].map((str, strIdx) => (
                    <React.Fragment key={strIdx}>
                      <div className="flex items-center justify-center bg-[#261812] text-[#ff6b00] font-black text-[8px] border border-black px-1 min-w-[18px]">{str}</div>
                      {Array.from({ length: 16 }).map((_, beat) => {
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
                        beat: (beat - 1 + 16) % 16
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
                        beat: (beat + 1) % 16
                      });
                    }}
                    className="flex-1 py-1.5 bg-black text-white border border-black font-black text-[9px] uppercase shadow-[2px_2px_0_#000] active:translate-y-[1px]"
                  >
                    AVANÇAR PASSO ▶
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewTabMatrix(Array(6).fill(null).map(() => Array(16).fill('')));
                    }}
                    className="flex-1 py-1.5 bg-red-600 text-white border border-black font-black text-[9px] uppercase shadow-[2px_2px_0_#000] active:translate-y-[1px]"
                  >
                    🗑️ LIMPAR GRADE
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddTablature}
                className="w-full py-2 bg-[#ff6b00] text-white border-4 border-black font-black text-[10px] uppercase shadow-[4px_4px_0_#000] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1"
              >
                <PlusCircle className="w-4 h-4" /> SALVAR TABLATURA NA AULA
              </button>
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

                {/* Criar Aula Avulsa - Musiclass Fiel */}
                <div className="p-1">
                  <button
                    onClick={openCreateModal}
                    className="w-full bg-[#ff6b00] text-white py-3 border-4 border-black font-black uppercase text-xs shadow-[8px_8px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2 hover:bg-[#ff8c3a]"
                  >
                    ⚔️ REGISTRAR NOVA AULA MUSICLASS
                  </button>
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
                              <h4 className="text-black font-black text-base uppercase italic leading-none my-1 truncate text-ellipsis overflow-hidden">
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

            {activeProfessorTab === 'alunos' && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-[#feccba] border-4 border-black p-4 shadow-[4px_4px_0_#000]">
                  <h3 className="text-black font-black text-xs uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span>🔍</span> BUSCAR ALUNO
                  </h3>
                  <input
                    type="text"
                    placeholder="DIGITE O NOME DO ALUNO..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 bg-white border-4 border-black text-xs font-black uppercase placeholder:text-black/35 focus:outline-none"
                  />
                </div>
                
                <div className="space-y-4">
                  {alunosList
                    .filter(aluno => (aluno.nome || '').toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(aluno => (
                      <div key={aluno.id} className="bg-[#fff8f6] border-4 border-black p-4 shadow-[4px_4px_0_#000] relative overflow-hidden">
                        <div className="absolute top-0 right-0 px-2 py-0.5 bg-black text-[#feccba] font-black text-[7px] border-l-2 border-b-2 border-black uppercase">
                          {aluno.curso_ativo || 'MÚSICA'}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 border-4 border-black bg-[#ff6b00] text-white font-black text-lg flex items-center justify-center shadow-[2px_2px_0_#000]">
                            {aluno.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-black font-black text-sm uppercase italic">{aluno.nome}</h4>
                            <p className="text-[#8e7164] font-bold text-[7px] uppercase mt-0.5">
                              XP: {aluno.xp || 0} • LEVEL {aluno.nivel || 1}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t-2 border-black/10 flex justify-between items-center">
                          <span className="text-[7px] font-mono text-[#8e7164] uppercase truncate max-w-[150px]">
                            {aluno.email}
                          </span>
                          <button
                            onClick={() => {
                              setNewAulaAlunoId(aluno.id);
                              setNewAulaCurso(aluno.curso_ativo || 'Piano');
                              openCreateModal();
                            }}
                            className="bg-[#ff6b00] text-white px-2 py-1.5 border-2 border-black font-black uppercase text-[7px] shadow-[2px_2px_0_#000] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> AULA AVULSA
                          </button>
                        </div>
                      </div>
                    ))
                  }
                  {alunosList.filter(aluno => (aluno.nome || '').toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <div className="p-8 text-center bg-[#261812]/50 border-4 border-dashed border-[#3d2d26]">
                      <p className="text-[#8e7164] font-black text-[10px] uppercase italic">
                        &gt;&gt; NENHUM ALUNO ENCONTRADO
                      </p>
                    </div>
                  )}
                </div>
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
                    <span className="text-[#ff6b00] font-black text-[8px] uppercase">
                      Semana Atual
                    </span>
                  </div>
                  
                  {/* Grid de 7 dias */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {getWeekDays().map((day) => {
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
                      const isPendente = !isConcluida && !isFalta;
                      
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
                              <h4 className="text-black font-black text-sm uppercase italic leading-none my-1 truncate">
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
                        {(professorData?.nome || 'P').charAt(0).toUpperCase()}
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
                  <h3 className="font-black text-[9px] uppercase tracking-widest text-[#ff6b00] mb-4 flex items-center gap-2">
                    <span>⚡</span> MINHAS INFORMAÇÕES FINANCEIRAS
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

                {/* Botão Logout Vermelho Gigante */}
                <button
                  onClick={logout}
                  className="w-full bg-[#ff3333] hover:bg-red-700 text-white py-4 border-8 border-black font-black uppercase text-sm shadow-[8px_8px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3"
                >
                  <LogOut className="w-5 h-5" /> SAIR DA MINHA CONTA
                </button>
              </div>
            )}

          </div>
        </div>

        {/* BOTTOM NAV */}
        <nav className="fixed md:absolute bottom-0 left-0 right-0 md:left-auto md:right-auto md:w-full h-20 bg-[#261812] border-t-8 border-black flex items-center justify-around px-2 z-50">
          {[
            { id: 'home', icon: Home, label: 'HOME' },
            { id: 'alunos', icon: Users, label: 'ALUNOS' },
            { id: 'agenda', icon: Calendar, label: 'AGENDA' },
            { id: 'perfil', icon: User, label: 'PERFIL' },
          ].map((item, i) => {
            const isActive = activeProfessorTab === item.id;
            return (
              <button 
                key={i} 
                onClick={() => setActiveProfessorTab(item.id as any)}
                className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'translate-y-[-4px]' : 'opacity-50 hover:opacity-80'}`}
              >
                <div className={`p-2 border-4 border-black shadow-[4px_4px_0_#000] ${isActive ? 'bg-[#ff6b00]' : 'bg-white'}`}>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-black'}`} />
                </div>
                <span className="text-[6px] font-black text-white uppercase tracking-tighter">{item.label}</span>
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
          <div className="bg-[#fff8f6] border-8 border-black p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto font-['Space_Mono'] relative shadow-[12px_12px_0_#000] print-area">
            <style>{`
              @media print {
                body * {
                  visibility: hidden !important;
                }
                .print-area, .print-area * {
                  visibility: visible !important;
                }
                .print-area {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  overflow: visible !important;
                  max-height: none !important;
                  border: none !important;
                  box-shadow: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  background: white !important;
                }
                @page {
                  size: auto;
                  margin: 10mm;
                }
              }
            `}</style>

            {/* Controles do modal (ocultos na impressão) */}
            <div className="absolute top-4 right-4 flex gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-emerald-500 text-white px-3 py-2 border-2 border-black font-black text-xs uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center gap-1.5"
              >
                <span>⬇️</span> IMPRIMIR / PDF
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
            <div className="space-y-6 pt-4">
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
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase bg-[#261812] text-white px-2 py-1 inline-block">
                  📝 CONTEÚDO TRABALHADO
                </h3>
                <div className="border-4 border-black p-4 bg-white text-xs whitespace-pre-wrap font-bold uppercase text-black">
                  {isCreateModalOpen ? newAulaConteudo : conteudo}
                </div>
              </div>

              {/* Tarefa de Casa */}
              <div className="space-y-2">
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
                      <div className="flex flex-wrap gap-4">
                        {(chords as any[]).map((ch, idx) => {
                          const isTeclado = ch.instrument?.toLowerCase().includes('teclado') || ch.instrument?.toLowerCase().includes('piano');
                          return (
                            <div key={idx} className={`border-2 border-black p-1 bg-white ${isTeclado ? 'w-[320px] sm:w-[340px]' : 'w-[160px]'}`}>
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
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase bg-[#261812] text-white px-2 py-1 inline-block">
                    🎹 SEQUÊNCIA MELÓDICA
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {mcMelody.map((mel, idx) => (
                      <div key={idx} className="border-4 border-black p-4 bg-white space-y-1">
                        <p className="text-[10px] font-black uppercase text-[#ff6b00]">{mel.name}</p>
                        <p className="text-xs font-mono font-black text-black tracking-widest uppercase">{mel.notes?.map(translateNote).join(' ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
