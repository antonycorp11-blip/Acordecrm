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
import { ChordVisualizer } from '../components/musiclass/ChordVisualizers';
import { getPedagogicalSuggestion } from '../lib/pedagogicalAI';


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

  // Estados Ricos do Musiclass compartilhados
  const [mcChords, setMcChords] = useState<any[]>([]);
  const [mcScales, setMcScales] = useState<any[]>([]);
  const [mcExercises, setMcExercises] = useState<any[]>([]);
  const [mcRecordings, setMcRecordings] = useState<any[]>([]);
  const [mcActiveTab, setMcActiveTab] = useState<'geral' | 'acordes' | 'escalas' | 'exercicios' | 'studio'>('geral');
  
  // Estados para seleção de acorde
  const [selRoot, setSelRoot] = useState('C');
  const [selType, setSelType] = useState('maj');
  const [selExt, setSelExt] = useState('none');
  const [selBass, setSelBass] = useState('none');
  
  // Estados para seleção de escala
  const [selScaleRoot, setSelScaleRoot] = useState('C');
  const [selScaleId, setSelScaleId] = useState('major');

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
    setXpGanho(Number(aula.xp_ganho) || 50);
    
    // Tenta decodificar dados ricos do Musiclass de dentro de conteudo
    let conteudoText = aula.conteudo || '';
    let tarefaCasaText = aula.tarefa_casa || '';
    let chords: any[] = [];
    let scales: any[] = [];
    let exercises: any[] = [];
    let recordings: any[] = [];

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
        isCustom: false
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/mp3' });
        const file = new File([audioBlob], `gravacao_${Date.now()}.mp3`, { type: 'audio/mp3' });
        await uploadStudioFile(file);
      };
      
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      alert('Não foi possível acessar o microfone.');
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
      recordings: mcRecordings
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
      recordings: mcRecordings
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
        alert('Erro ao registrar aula avulsa.');
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
          {(['geral', 'acordes', 'escalas', 'exercicios', 'studio'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMcActiveTab(tab)}
              className={`flex-1 py-1.5 px-2 font-black text-[9px] uppercase tracking-wider text-center transition-all ${
                mcActiveTab === tab
                  ? 'bg-[#ff6b00] text-white'
                  : 'bg-[#261812] text-[#feccba] hover:bg-stone-800'
              }`}
            >
              {tab === 'geral' && '📌 GERAL'}
              {tab === 'acordes' && '🎸 ACORDES'}
              {tab === 'escalas' && '🎼 ESCALAS'}
              {tab === 'exercicios' && '⚔️ DESAFIOS'}
              {tab === 'studio' && '🎙️ STUDIO'}
            </button>
          ))}
        </div>

        {/* Conteúdo da Aba Geral */}
        {mcActiveTab === 'geral' && (
          <div className="space-y-4 animate-fade-in">
            {/* Tema da Aula */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black text-black uppercase tracking-widest">CONTEÚDO TRABALHADO</label>
                <button
                  type="button"
                  onClick={() => handleGenerateAISuggestion(isAvulsa)}
                  disabled={isAILoading}
                  className="bg-[#261812] text-white border-2 border-black px-2 py-0.5 text-[8px] font-black uppercase flex items-center gap-1 active:translate-y-[1px] disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3 text-[#ff6b00] animate-pulse" /> {isAILoading ? 'GERANDO...' : '💡 IA PEDAGÓGICA'}
                </button>
              </div>
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] font-black text-black uppercase tracking-widest">TOM / TÔNICA</label>
                <select
                  value={selRoot}
                  onChange={(e) => setSelRoot(e.target.value)}
                  className="w-full p-2 bg-white border-2 border-black font-black text-xs"
                >
                  {ROOTS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[8px] font-black text-black uppercase tracking-widest">TIPO / TRÍADE</label>
                <select
                  value={selType}
                  onChange={(e) => setSelType(e.target.value)}
                  className="w-full p-2 bg-white border-2 border-black font-black text-xs"
                >
                  {CHORD_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] font-black text-black uppercase tracking-widest">TENSÃO / EXTENSÃO</label>
                <select
                  value={selExt}
                  onChange={(e) => setSelExt(e.target.value)}
                  className="w-full p-2 bg-white border-2 border-black font-black text-xs"
                >
                  {EXTENSIONS.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[8px] font-black text-black uppercase tracking-widest">BAIXO ALTERADO</label>
                <select
                  value={selBass}
                  onChange={(e) => setSelBass(e.target.value)}
                  className="w-full p-2 bg-white border-2 border-black font-black text-xs"
                >
                  <option value="none">PADRÃO</option>
                  {ROOTS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="p-3 bg-black/5 border-2 border-black flex flex-col items-center">
              <span className="text-[7px] font-black text-black/50 uppercase tracking-widest mb-2">PRÉ-VISUALIZAÇÃO DE ACORDE</span>
              <ChordVisualizer
                instrument={currentInstrument}
                chordNotes={MusicEngine.generateChord(selRoot, selType, selExt)?.notes || []}
                root={selRoot}
                type={selType}
                ext={selExt}
                bass={selBass}
              />
            </div>

            <button
              type="button"
              onClick={handleAddChord}
              className="w-full py-2.5 bg-[#ff6b00] text-white border-4 border-black font-black text-xs uppercase shadow-[4px_4px_0_#000] active:translate-y-[1px] active:shadow-none transition-all flex items-center justify-center gap-1"
            >
              <PlusCircle className="w-4 h-4" /> ADICIONAR ACORDE AO ALUNO
            </button>

            {mcChords.length > 0 && (
              <div>
                <label className="text-[8px] font-black text-black uppercase tracking-widest block mb-2">ACORDES NA AULA ({mcChords.length})</label>
                <div className="flex gap-2 overflow-x-auto py-2 scrollbar-thin">
                  {mcChords.map((ch, idx) => (
                    <div key={idx} className="relative group shrink-0">
                      <ChordVisualizer
                        instrument={currentInstrument}
                        chordNotes={ch.notes}
                        root={ch.root}
                        type={ch.typeId}
                        ext={ch.extId}
                        bass={ch.bass}
                      />
                      <button
                        type="button"
                        onClick={() => setMcChords(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 bg-black text-white p-1 rounded-none border border-white hover:bg-red-500"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
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

            <div className="p-3 bg-black/5 border-2 border-black">
              <span className="text-[7px] font-black text-black/50 uppercase tracking-widest block text-center mb-2">NOTAS DA ESCALA</span>
              <div className="flex justify-center gap-1.5 flex-wrap">
                {(MusicEngine.generateScale(selScaleRoot, selScaleId) || []).map((note, idx) => (
                  <span key={idx} className="bg-[#261812] text-[#feccba] border border-black font-black text-[10px] px-2 py-1 uppercase">
                    {note}
                  </span>
                ))}
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

      {/* MUSICLASS: MODAL DE CRIAÇÃO DE NOVA AULA AVULSA */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#fff8f6] border-8 border-black p-6 relative shadow-[12px_12px_0_#000] w-full max-w-md max-h-[90vh] overflow-y-auto font-['Space_Mono']">
            
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
    </div>
  );
}
