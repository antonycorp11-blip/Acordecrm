import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);
import { Bell, Home, Trophy, BookOpen, Target, ChevronRight, Play, HelpCircle, LogOut, Camera, Upload, Sparkles, Volume2, User, FileText, Printer, Gamepad2, Flame, Video, StopCircle, Award, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChordVisualizer } from '../components/musiclass/ChordVisualizers';
import { MusiclassTools } from '../components/musiclass/MusiclassTools';
import { ChordRush } from '../components/jogos/ChordRush';
import { TriadeNinja } from '../components/jogos/TriadeNinja';
import { DailyMissions } from '../components/alunos/DailyMissions';
import { RitmoPro } from '../components/jogos/ritmo-pro/App';
import { VoiceRush } from '../components/jogos/voice-rush/App';
import { useAuth } from '../contexts/AuthContext';
import { OneSignalService } from '../services/OneSignalService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { PwaModal } from '../components/alunos/PwaModal';
import { AvatarPixel } from '../components/AvatarPixel';
import { AvatarEditor } from '../components/AvatarEditor';
import { AvatarStore } from '../components/AvatarStore';
import { FONTS, TILES } from '../utils/avatarAssets';
import PerfilEstudanteModal, { resolveTrophyImage } from '../components/PerfilEstudanteModal';
import html2canvas from 'html2canvas';
import html2pdf from 'html2pdf.js';
import { jsPDF } from 'jspdf';
import { Download } from 'lucide-react';

// Função para tornar links no texto clicáveis
const linkify = (text: string) => {
  if (!text) return text;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, i) => {
    if (part.match(urlRegex)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline hover:text-blue-700">{part}</a>;
    }
    return part;
  });
};

// Tradução de notas científicas para cifras em português brasileiro
const translateNote = (note: string): string => {
  return note.replace(/\d+$/, '');
};

// Subcomponente de visualização inteligente de acordes
function LessonChords({ chords, currentInstrument }: { chords: any[], currentInstrument: string }) {
  if (!chords || chords.length === 0) return null;

  // Agrupa os acordes pelo campo .group || 'GERAL'
  const grouped: Record<string, any[]> = {};
  (chords as any[]).forEach(chord => {
    const groupName = (chord.group || 'GERAL').toUpperCase();
    if (!grouped[groupName]) grouped[groupName] = [];
    grouped[groupName].push(chord);
  });

  return (
    <div className="space-y-6 select-none font-['Space_Mono'] w-full">
      {Object.entries(grouped).map(([groupName, groupChords]) => (
        <div key={groupName} className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_#000] space-y-3">
          {/* Tag preta com o nome da seção/grupo */}
          <div className="bg-black text-[#ff6b00] px-3 py-1 text-[9px] font-black uppercase tracking-widest inline-block shadow-[2px_2px_0_#000]">
            SEÇÃO: {groupName}
          </div>
          
          {/* Grid de acordes daquela seção */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {groupChords.map((ch, idx) => (
              <div key={idx} className="w-full flex flex-col items-center">
                <div className="w-full">
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
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Modal de visualização de diário pedagógico / Impressão PDF
function PrintModal({ aula, alunoNome, onClose }: { aula: any, alunoNome: string, onClose: () => void }) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  let richData: any = null;
  try {
    if (aula.conteudo && (aula.conteudo.startsWith('{') || aula.conteudo.startsWith('['))) {
      richData = JSON.parse(aula.conteudo);
    }
  } catch {}

  const handleDownloadPdf = async () => {
    if (!pdfRef.current || generatingPdf) return;
    setGeneratingPdf(true);
    const toastId = toast.loading('Gerando seu diário em PDF contínuo...');

    try {
      const element = pdfRef.current;
      
      // Temporariamente ajusta a largura para gerar em alta resolução e proporções perfeitas
      const originalStyle = element.style.cssText;
      element.style.width = '768px';
      element.style.maxWidth = '768px';
      element.style.padding = '32px';
      
      const canvas = await html2canvas(element, {
        scale: 2, // Garante alta definição para zoom no celular
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      element.style.cssText = originalStyle;

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // Largura A4 padrão em mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Cria um PDF de folha única contínua baseado no comprimento exato
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [210, imgHeight + 10]
      });

      pdf.addImage(imgData, 'PNG', 0, 5, imgWidth, imgHeight);

      const studentName = alunoNome || 'Aluno';
      const dateStr = aula?.data ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(aula.data)) : '';
      const safeName = studentName.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "_");
      const safeDate = dateStr.replace(/\//g, "-");

      pdf.save(`Diario_${safeName}_${safeDate}.pdf`);
      toast.success('Diário em PDF baixado com sucesso!', { id: toastId });
    } catch (err) {
      console.error('Erro ao gerar PDF local:', err);
      toast.error('Erro ao gerar o PDF. Abrindo janela de impressão alternativa...', { id: toastId });
      window.print();
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Instrumento sugerido
  const isTeclado = /teclado|piano|keyboard/i.test(aula.curso_nome || '');
  const currentInstrument = isTeclado ? 'Teclado' : 'Piano';

  return (
    <div className="fixed inset-0 bg-[#261812]/95 md:bg-black/80 z-[160] flex items-stretch md:items-center justify-center p-0 md:p-4 overflow-y-auto font-['Space_Mono']">
      
      <div className="bg-[#fff8f6] border-0 md:border-8 border-black p-4 md:p-6 w-full max-w-full md:max-w-2xl min-h-screen md:min-h-0 relative shadow-none md:shadow-[12px_12px_0_#000] flex flex-col print:border-none print:shadow-none print:max-w-none print:h-auto print:max-h-none print:overflow-visible">
        <div className="flex justify-between items-center mb-6 print:hidden" data-html2canvas-ignore>
          <h3 className="text-black font-black text-xs md:text-sm uppercase italic tracking-widest flex items-center gap-1.5">
            📄 DIÁRIO PEDAGÓGICO
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-1.5 border-2 border-black font-black text-[10px] md:text-xs uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all flex items-center gap-1.5"
            >
              <span>{generatingPdf ? '⏳' : '⬇️'}</span> {generatingPdf ? 'GERANDO...' : 'BAIXAR PDF'}
            </button>
            <button 
              onClick={onClose} 
              className="bg-black text-[#feccba] border-2 border-black font-black text-xs px-3 py-1.5 shadow-[4px_4px_0_#000] hover:bg-red-500 hover:text-white transition-all active:translate-y-1 active:shadow-none"
            >
              X
            </button>
          </div>
        </div>

        {/* ÁREA DE IMPRESSÃO */}
        <div ref={pdfRef} id="print-section" className="print-area bg-white border-4 border-black p-8 text-black space-y-6">
          {/* Header Pedagógico */}
          <div className="border-b-4 border-black pb-4 flex justify-between items-start">
            <div>
              <h1 className="font-black text-2xl uppercase tracking-tighter">STUDIO MASTER</h1>
              <p className="text-[9px] font-bold uppercase tracking-wider text-black/60">DIÁRIO DE EVOLUÇÃO PEDAGÓGICA</p>
            </div>
            <div className="text-right">
              <p className="font-black text-sm uppercase italic">AULA DE {aula.curso_nome || 'MÚSICA'}</p>
              <p className="text-[10px] font-black">{format(new Date(aula.data + 'T12:00:00Z'), 'dd/MM/yyyy')}</p>
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
            <p className="text-xs text-black/80 leading-relaxed whitespace-pre-wrap uppercase font-bold pl-3">
              {linkify(richData?.isRich ? richData.conteudoText : (aula.conteudo || 'Nenhum conteúdo detalhado'))}
            </p>
          </div>

          {/* Boss Quest / Tarefa */}
          <div className="space-y-2">
            <h4 className="font-black text-sm border-l-4 border-[#ff6b00] pl-2 uppercase tracking-wide text-[#ff6b00]">⚔️ BOSS QUEST / TAREFA DE CASA:</h4>
            <p className="text-xs text-black/80 leading-relaxed whitespace-pre-wrap italic font-bold pl-3">
              {linkify(richData?.isRich ? richData.tarefaCasaText : (aula.tarefa_casa || 'Treinar livre'))}
            </p>
          </div>

          {/* Imagens */}
          {richData?.images && Array.isArray(richData.images) && richData.images.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-black text-sm border-l-4 border-black pl-2 uppercase tracking-wide">📸 ANEXOS:</h4>
              <div className="grid grid-cols-2 gap-2 pl-3">
                {richData.images.map((img: string, idx: number) => (
                  <img key={idx} src={img} alt="Anexo" className="w-full h-auto border-2 border-black shadow-[2px_2px_0_#000]" />
                ))}
              </div>
            </div>
          )}

          {/* Acordes */}
          {richData?.isRich && Array.isArray(richData.chords) && richData.chords.length > 0 && (
            <div className="space-y-3 pt-2 break-inside-avoid">
              <h4 className="font-black text-sm border-l-4 border-black pl-2 uppercase tracking-wide">🎸 ACORDES PRÁTICOS RECOMENDADOS:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 justify-items-center">
                {richData.chords.map((ch: any, idx: number) => {
                  return (
                    <div key={idx} className="flex flex-col items-center p-3 border-4 border-black bg-[#fff8f6] w-full shadow-[4px_4px_0_#000]">
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
            <div className="space-y-2 pt-2 break-inside-avoid">
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
          <div className="pt-12 flex justify-between items-end text-center text-[9px] font-black border-t border-black/10 break-inside-avoid">
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
        <div className="flex gap-4 mt-6 print:hidden">
          <button 
            onClick={handleDownloadPdf}
            disabled={generatingPdf}
            className="flex-1 bg-[#ff6b00] disabled:opacity-50 text-white border-4 border-black font-black text-xs py-3 shadow-[4px_4px_0_#000] hover:translate-y-1 hover:shadow-none transition-all"
          >
            {generatingPdf ? '⏳ GERANDO PDF...' : '⬇️ BAIXAR DIÁRIO EM PDF'}
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
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [showAvatarStore, setShowAvatarStore] = useState(false);
  const profileCardRef = useRef<HTMLDivElement>(null);
  const [avatarInventory, setAvatarInventory] = useState<string[]>([]);
  const VERSAO_CLIENTE = 'SYNC_V4.3.1';
  const [alunoData, setAlunoData] = useState<any>(null);
  const [aulasHoje, setAulasHoje] = useState<any[]>([]);
  const [aulasRealizadas, setAulasRealizadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'ranking' | 'aulas' | 'perfil' | 'jogos' | 'treino'>('home');
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [isAlunoModalOpen, setIsAlunoModalOpen] = useState(false);
  const [selectedAluno, setSelectedAluno] = useState<any | null>(null);
  const [selectedTrophy, setSelectedTrophy] = useState<any | null>(null);
  const [todasConquistas, setTodasConquistas] = useState<any[]>([]);
  const [printAula, setPrintAula] = useState<any | null>(null);
  const [temporada, setTemporada] = useState<{nome: string}>({ nome: 'Temporada 1' });
  const [feed, setFeed] = useState<any[]>([]);
  const [showTools, setShowTools] = useState(false);
  const [selectedFicha, setSelectedFicha] = useState<any | null>(null);

  // Estados EAD Trilha Candy Crush
  const [trilhaModulos, setTrilhaModulos] = useState<any[]>([]);
  const [trilhaAulas, setTrilhaAulas] = useState<any[]>([]);
  const [trilhaProgresso, setTrilhaProgresso] = useState<any[]>([]);
  const [selectedTrilhaAula, setSelectedTrilhaAula] = useState<any | null>(null);
  const [selectedTrilhaModulo, setSelectedTrilhaModulo] = useState<any | null>(null);
  const [questionarioRespostas, setQuestionarioRespostas] = useState<Record<number, number>>({});
  const [questionarioFinalizado, setQuestionarioFinalizado] = useState(false);
  const [questionarioCorreto, setQuestionarioCorreto] = useState<boolean | null>(null);
  const [videoCompleto, setVideoCompleto] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [showQuestionarioModal, setShowQuestionarioModal] = useState(false);
  const [tentativaResultado, setTentativaResultado] = useState<any | null>(null);

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
  const [isPlayingTriadeNinja, setIsPlayingTriadeNinja] = useState(false);
  const [isPlayingRitmoPro, setIsPlayingRitmoPro] = useState(false);
  const [isPlayingVoiceRush, setIsPlayingVoiceRush] = useState(false);
  const [geniusState, setGeniusState] = useState<'idle' | 'playback' | 'playing' | 'gameover'>('idle');
  const [geniusSequence, setGeniusSequence] = useState<number[]>([]);
  const [geniusUserSequence, setGeniusUserSequence] = useState<number[]>([]);
  const [geniusScore, setGeniusScore] = useState(0);
  const [geniusActivePad, setGeniusActivePad] = useState<number | null>(null);
  // Removido gamePoints, agora usamos XP real.
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleOpenFicha = async (aula: any) => {
    setSelectedFicha(aula);
    if (alunoData?.id) {
      try {
        const token = localStorage.getItem('acorde_token');
        const res = await fetch('/api/alunos/abrir-ficha-premio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ aluno_id: alunoData.id })
        });
        const data = await res.json();
        if (data.success && !data.claimed) {
          setAlunoData((prev: any) => ({ ...prev, xp: data.novoXp, acorde_coins: data.novasMoedas }));
          toast.success('🎁 +500 XP & +500 Coins por abrir sua ficha de aula!', { duration: 5000 });
        }
      } catch (err) { console.error(err); }
    }
  };

  const fetchTrilha = async () => {
    const token = localStorage.getItem('acorde_token');
    const h = { Authorization: `Bearer ${token}` };
    try {
      const resMod = await fetch('/api/trilha/modulos', { headers: h });
      const modsData = await resMod.json();
      setTrilhaModulos(Array.isArray(modsData) ? modsData : []);
      const resAul = await fetch('/api/trilha/aulas', { headers: h });
      const aulsData = await resAul.json();
      setTrilhaAulas(Array.isArray(aulsData) ? aulsData : []);
    } catch (err) { console.error(err); }
  };

  const fetchTrilhaProgresso = async (idAluno: any) => {
    const token = localStorage.getItem('acorde_token');
    try {
      const res = await fetch(`/api/trilha/progresso/${idAluno}`, { headers: { Authorization: `Bearer ${token}` } });
      const prog = await res.json();
      setTrilhaProgresso(Array.isArray(prog) ? prog : []);
    } catch (err) { console.error(err); }
  };

  const handleSubmitQuestionario = async (target: 'aula' | 'modulo') => {
    const token = localStorage.getItem('acorde_token');
    const targetId = target === 'aula' ? selectedTrilhaAula.id : selectedTrilhaModulo.id;
    const body = {
      aluno_id: alunoData?.id,
      aula_trilha_id: target === 'aula' ? targetId : null,
      modulo_trilha_id: target === 'modulo' ? targetId : null,
      respostas: questionarioRespostas
    };

    try {
      const res = await fetch('/api/trilha/responder-questionario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error('Erro ao submeter questionário');
      const data = await res.json();
      setTentativaResultado(data);
      setQuestionarioFinalizado(true);
      setQuestionarioCorreto(data.aprovado);

      if (data.aprovado) {
        // Toca som retro de vitória feliz (C5 -> E5 -> G5 -> C6)
        playRetroSound(523, 'sine', 0.15);
        setTimeout(() => playRetroSound(659, 'sine', 0.15), 150);
        setTimeout(() => playRetroSound(784, 'sine', 0.15), 300);
        setTimeout(() => playRetroSound(1047, 'sine', 0.4), 450);
        
        toast.success(`Parabéns! Você passou com ${data.nota}%! +${data.xpGanhos} XP & +${data.moedasGanhas} Moedas!`);
        
        if (alunoData?.id) {
          fetchTrilhaProgresso(alunoData.id);
          const headers = { 'Authorization': `Bearer ${token}` };
          const timestamp = Date.now();
          const r = await fetch(`/api/alunos/me?t=${timestamp}`, { headers });
          if (r.ok) {
            const meData = await r.json();
            if (meData) setAlunoData(meData);
          }
        }
      } else {
        // Som retro triste de falha
        playRetroSound(293, 'sawtooth', 0.2);
        setTimeout(() => playRetroSound(220, 'sawtooth', 0.4), 200);
        
        toast.error(`Você acertou ${data.acertos}/${data.totalPerguntas} (${data.nota}%). É necessário 80% para passar.`);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

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
      updateDailyMissionProgress('Acorde Genius');
      handleAddXp(20, 'Acorde Genius');
      window.dispatchEvent(new CustomEvent('acorde_game_played', { detail: 'Acorde Genius' }));

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


  // Dados dinâmicos do aluno
  const xp = alunoData?.xp || 0;
  const acordeCoins = alunoData?.acorde_coins || 0;
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
        fetch(`/api/alunos/me?t=${timestamp}`, { headers }).then(r => {
          if (r.status === 401) {
            logout();
            return null;
          }
          return r.ok ? r.json() : null;
        }),
        fetch(`/api/agenda?t=${timestamp}`, { headers }).then(r => r.ok ? r.json() : [])
      ]).then(([me, agenda]) => {
        if (me) {
          setAlunoData(me);
          fetchTrilhaProgresso(me.id);
          if (me.avatar_inventory && Array.isArray(me.avatar_inventory)) {
            setAvatarInventory(me.avatar_inventory);
          } else {
            setAvatarInventory([]);
          }
          const now = new Date();
          const allAulas = Array.isArray(agenda) ? agenda : [];
          
          const futureAulas = allAulas
            .filter((a: any) => {
              const aulaDate = new Date(a.data + 'T' + (a.horario || '00:00:00'));
              return aulaDate >= now && a.status !== 'realizada';
            })
            .sort((a: any, b: any) => { const timeA = new Date(a.data + 'T' + (a.horario || '00:00:00')).getTime() || 0; const timeB = new Date(b.data + 'T' + (b.horario || '00:00:00')).getTime() || 0; return timeA - timeB; });

          const pastAulas = allAulas
            .filter((a: any) => a.status === 'realizada')
            .sort((a: any, b: any) => {
               const timeA = new Date(a.data + 'T' + (a.horario || '00:00:00')).getTime() || 0;
               const timeB = new Date(b.data + 'T' + (b.horario || '00:00:00')).getTime() || 0;
               return timeB - timeA;
            });

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
    fetchTrilha();
    
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
              const aulaDate = new Date(a.data + 'T' + (a.horario || '00:00:00'));
              return aulaDate >= now && a.status !== 'realizada';
            })
            .sort((a: any, b: any) => { const timeA = new Date(a.data + 'T' + (a.horario || '00:00:00')).getTime() || 0; const timeB = new Date(b.data + 'T' + (b.horario || '00:00:00')).getTime() || 0; return timeA - timeB; });

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
      
      // Tentativa de upload direto para o Supabase Storage com resiliência (retry de 3 vezes)
      let uploadSuccess = false;
      let uploadAttempts = 3;
      const nomeAlunoSafe = (alunoData?.nome || 'Aluno').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `treinos/${nomeAlunoSafe}_${Date.now()}.${extensao}`;

      for (let attempt = 1; attempt <= uploadAttempts; attempt++) {
          try {
              console.log(`Tentativa ${attempt} de upload direto para o Supabase...`);
              const { error } = await supabase.storage.from('uploads').upload(filename, videoBlob, {
                  contentType: mime,
                  upsert: true
              });
              
              if (!error) {
                  setUploadProgress(80);
                  const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
                  finalVideoUrl = publicUrlData.publicUrl;
                  uploadSuccess = true;
                  break; // Sucesso!
              } else {
                  console.warn(`Tentativa ${attempt} falhou:`, error.message);
                  if (attempt < uploadAttempts) {
                      await new Promise(resolve => setTimeout(resolve, 1500 * attempt)); // Delay progressivo
                  }
              }
          } catch (err: any) {
              console.warn(`Exceção na tentativa ${attempt}:`, err.message || err);
              if (attempt < uploadAttempts) {
                  await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
              }
          }
      }

      if (!uploadSuccess) {
          console.warn('Todas as 3 tentativas de upload direto para o Supabase falharam. Usando fallback do backend.');
          if (videoBlob.size > 4.5 * 1024 * 1024) {
              toast.warning('Conexão oscilou! Como seu vídeo é grande (>4.5MB), o envio pode falhar. Recomendamos usar Wi-Fi estável ou reduzir a duração do vídeo.');
          }
      }

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
      
      const timestamp = Date.now();
      const fetchHeaders = { 'Authorization': `Bearer ${token}` };
      fetch(`/api/alunos/me?t=${timestamp}`, { headers: fetchHeaders })
        .then(r => r.ok ? r.json() : null)
        .then(me => { if (me) setAlunoData(me); });
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
      
      toast.success('Treino registrado! 🔥 +500 XP de estudo diário!');
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

  const updateDailyMissionProgress = (gameName: string) => {
    const today = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const storedStr = localStorage.getItem('acorde_daily_missions');
    if (storedStr) {
      const data = JSON.parse(storedStr);
      if (data.date === today) {
        let updated = false;
        const newM = data.missions.map((m: any) => {
          if (m.gameId === gameName && !m.completed && m.progress < m.target) {
            updated = true;
            return { ...m, progress: m.progress + 1 };
          }
          return m;
        });
        if (updated) {
          localStorage.setItem('acorde_daily_missions', JSON.stringify({ date: today, missions: newM }));
        }
      }
    }
  };

  const handleAddXp = async (pontosGanhos: number, jogo: string) => {
    try {
      const response = await fetch('/api/gamificacao/add-xp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ pontos: pontosGanhos, jogo })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      setAlunoData((prev: any) => ({ ...prev, xp: data.novoXp, acorde_coins: data.novasMoedas }));
      toast.success(`✨ +${data.finalPontos} Acorde Coins e XP (${jogo})!`);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar pontos!');
    }
  };

  const handleSpendXp = async (preco: number, itemId: string) => {
    try {
      const response = await fetch('/api/gamificacao/spend-xp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('acorde_token')}`
        },
        body: JSON.stringify({ preco, item_id: itemId })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      setAlunoData((prev: any) => ({ ...prev, acorde_coins: data.novasMoedas }));
      setAvatarInventory(prev => [...prev, itemId]);
      toast.success('Item comprado com sucesso! Ele já está no seu Armário.');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao comprar item!');
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
    const resTemp = await fetch('/api/temporada-atual', { headers: { Authorization: `Bearer ${token}` } });
    if (resTemp.ok) { const data = await resTemp.json(); setTemporada(data); }
    const resFeed = await fetch('/api/feed', { headers: { Authorization: `Bearer ${token}` } });
    if (resFeed.ok) { const data = await resFeed.json(); setFeed(Array.isArray(data) ? data : []); }
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

  // --------------------------------------------------------------------------------
  // DOWNLOAD PROFILE CARD
  // --------------------------------------------------------------------------------
  const handleDownloadProfileCard = async () => {
    if (!profileCardRef.current) return;
    
    try {
      const toastId = toast.loading('Gerando seu card de perfil...');
      
      const canvas = await html2canvas(profileCardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#000000',
        logging: false
      });
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Acorde_Perfil_${alunoData?.nome?.split(' ')[0] || 'Aluno'}.png`;
      link.click();
      
      toast.success('Card baixado com sucesso!', { id: toastId });
    } catch (error) {
      console.error('Error generating card:', error);
      toast.error('Erro ao gerar o card. Tente novamente.');
    }
  };

  if (loading) return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#1a0a05] text-[#ff6b00] font-['Space_Mono'] select-none">
      <style>{`
        @keyframes splashLoading {
          0% { width: 0%; }
          50% { width: 65%; }
          100% { width: 100%; }
        }
      `}</style>
      <div className="flex flex-col items-center gap-6 max-w-[280px] w-full text-center">
        <img 
          src="/assets/Logo Laranja.png" 
          alt="Studio Acorde" 
          className="w-48 object-contain animate-pulse" 
        />
        <div className="w-full h-5 bg-[#261812] border-4 border-black p-0.5 overflow-hidden shadow-[2px_2px_0_#000]">
          <div 
            className="h-full bg-[#ff6b00]"
            style={{ animation: 'splashLoading 2s infinite ease-in-out' }}
          />
        </div>
        <span className="text-[9px] font-black tracking-widest uppercase text-[#8e7164] animate-pulse">
          Carregando...
        </span>
      </div>
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
            <div className="flex flex-col items-center justify-center -ml-2">
              <img src="/assets/Logo%20Laranja.png" alt="Studio Acorde" className="h-5 object-contain" />
              <span className="text-[7px] text-[#ff6b00] font-black uppercase text-center mt-0.5 tracking-widest">App v1.0.2</span>
            </div>
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
            <button onClick={() => window.location.reload()} className="bg-white text-black p-2 border-2 border-black shadow-[4px_4px_0_#000] hover:bg-[#ff6b00] hover:text-white active:translate-y-1 active:shadow-none transition-all" title="Atualizar App">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={logout} className="bg-black text-white p-2 border-2 border-white shadow-[4px_4px_0_#000] hover:bg-red-600 active:translate-y-1 active:shadow-none transition-all">
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
                <div className="bg-[#ff6b00] border-4 border-black px-3 py-1 shadow-[4px_4px_0_#000] flex flex-col items-center">
                  <h3 className="text-white font-black text-xs uppercase tracking-widest">🏆 HALL DA FAMA</h3>
                  <span className="text-[8px] font-black uppercase tracking-tighter text-black bg-white px-1 leading-none">{temporada.nome || 'TEMPORADA ATUAL'}</span>
                </div>
                <div className="flex-1 border-t-2 border-dashed border-[#3d2d26]"></div>
              </div>
              {rankingData.length === 0 && (
                <div className="text-center py-8 text-[#8e7164] font-black text-[9px] uppercase">Carregando ranking...</div>
              )}
              {/* ===== TOP 3 PODIUM ===== */}
              {rankingData.length > 0 && (
                <div className="flex items-end justify-center gap-2 mb-10 mt-16 h-64 px-2">
                  
                  {/* 2nd Place */}
                  {rankingData[1] && (
                    <div 
                      onClick={() => { setSelectedAluno(rankingData[1]); setIsAlunoModalOpen(true); }}
                      className="w-[30%] h-[80%] flex flex-col items-center justify-end relative cursor-pointer hover:-translate-y-1 transition-transform"
                    >
                      <div className="w-full h-32 relative z-10 flex items-end justify-center pb-0">
                        <AvatarPixel 
                          config={rankingData[1]?.avatar_config?.skinId ? rankingData[1].avatar_config : { skinId: 'skin_m_1', instrumentId: '', backgroundId: 'bg_1' }}
                          isSilhouette={!rankingData[1]?.avatar_config?.skinId} 
                          hideBackground={true}
                        />
                      </div>
                      <div className="w-full bg-[#5a6b7d] border-2 border-[#3d4b5c] shadow-[2px_2px_0_#000] z-20 flex flex-col items-center justify-center p-2 relative rounded-t-sm">
                        <div className="font-black text-white text-xl uppercase drop-shadow-[1px_1px_0_#000]">2ND</div>
                        <div 
                          className="font-black text-[9px] uppercase text-white truncate w-full text-center mt-1 drop-shadow-[1px_1px_0_#000]"
                          style={FONTS.find(f => f.id === rankingData[1]?.avatar_config?.fontId) ? { fontFamily: FONTS.find(f => f.id === rankingData[1]?.avatar_config?.fontId)?.fontFamily } : {}}
                        >{rankingData[1].nome}</div>
                        <div className="text-white/80 text-[7px] font-black uppercase mt-0.5">{rankingData[1].xp} PTS</div>
                      </div>
                    </div>
                  )}

                  {/* 1st Place */}
                  {rankingData[0] && (
                    <div 
                      onClick={() => { setSelectedAluno(rankingData[0]); setIsAlunoModalOpen(true); }}
                      className="w-[38%] h-full flex flex-col items-center justify-end relative cursor-pointer hover:-translate-y-1 transition-transform z-30"
                    >
                      {/* Glow effect for 1st place */}
                      <div className="absolute inset-0 bg-[#ffeb3b] blur-2xl opacity-20 rounded-full"></div>
                      <div className="w-full h-44 relative z-10 flex items-end justify-center pb-0">
                        <AvatarPixel 
                          config={rankingData[0]?.avatar_config?.skinId ? rankingData[0].avatar_config : { skinId: 'skin_m_1', instrumentId: '', backgroundId: 'bg_1' }}
                          isSilhouette={!rankingData[0]?.avatar_config?.skinId} 
                          hideBackground={true}
                        />
                      </div>
                      <div className="w-full bg-[#ffb300] border-2 border-[#ff8f00] shadow-[4px_4px_0_#000] z-20 flex flex-col items-center justify-center p-3 relative rounded-t-sm">
                        <div className="font-black text-black text-3xl uppercase">1ST</div>
                        <div 
                          className="font-black text-[11px] uppercase text-black truncate w-full text-center mt-1"
                          style={FONTS.find(f => f.id === rankingData[0]?.avatar_config?.fontId) ? { fontFamily: FONTS.find(f => f.id === rankingData[0]?.avatar_config?.fontId)?.fontFamily } : {}}
                        >{rankingData[0].nome}</div>
                        <div className="text-black/80 text-[8px] font-black uppercase mt-1">{rankingData[0].xp} PTS</div>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {rankingData[2] && (
                    <div 
                      onClick={() => { setSelectedAluno(rankingData[2]); setIsAlunoModalOpen(true); }}
                      className="w-[30%] h-[70%] flex flex-col items-center justify-end relative cursor-pointer hover:-translate-y-1 transition-transform"
                    >
                      <div className="w-full h-28 relative z-10 flex items-end justify-center pb-0">
                        <AvatarPixel 
                          config={rankingData[2]?.avatar_config?.skinId ? rankingData[2].avatar_config : { skinId: 'skin_m_1', instrumentId: '', backgroundId: 'bg_1' }}
                          isSilhouette={!rankingData[2]?.avatar_config?.skinId} 
                          hideBackground={true}
                        />
                      </div>
                      <div className="w-full bg-[#8d6e63] border-2 border-[#5d4037] shadow-[2px_2px_0_#000] z-20 flex flex-col items-center justify-center p-2 relative rounded-t-sm">
                        <div className="font-black text-white text-lg uppercase drop-shadow-[1px_1px_0_#000]">3RD</div>
                        <div 
                          className="font-black text-[9px] uppercase text-white truncate w-full text-center mt-1 drop-shadow-[1px_1px_0_#000]"
                          style={FONTS.find(f => f.id === rankingData[2]?.avatar_config?.fontId) ? { fontFamily: FONTS.find(f => f.id === rankingData[2]?.avatar_config?.fontId)?.fontFamily } : {}}
                        >{rankingData[2].nome}</div>
                        <div className="text-white/80 text-[7px] font-black uppercase mt-0.5">{rankingData[2].xp} PTS</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== OTHER RANKINGS ===== */}
              {rankingData.length > 3 && (
                <div className="mt-8 bg-[#1a0a05]/80 p-4 rounded-xl border-2 border-[#3d2d26]">
                  <h3 className="text-white font-black text-center mb-4 uppercase tracking-widest text-sm">OUTROS RANKINGS</h3>
                  <div className="space-y-3">
                    {rankingData.slice(3).map((player: any, idx: number) => {
                      const rank = idx + 4; // Porque pulamos os 3 primeiros
                      const isMe = player.id === alunoData?.id;
                      
                      // Extrair estilos customizados da loja
                      const playerFont = FONTS.find(f => f.id === player?.avatar_config?.fontId)?.fontFamily;
                      const playerTileClass = TILES.find(t => t.id === player?.avatar_config?.tileId)?.className || 'border-[#3d2d26]';

                      return (
                        <div 
                          key={player.id} 
                          onClick={() => { setSelectedAluno(player); setIsAlunoModalOpen(true); }}
                          className={`flex items-center gap-3 p-2 border-2 cursor-pointer rounded-lg bg-[#261812] transition-colors ${isMe ? 'bg-[#ff6b00]/20' : 'hover:bg-[#3d2d26]'} ${playerTileClass}`}
                        >
                          {/* Número do Rank */}
                          <div className={`font-black text-sm shrink-0 w-6 text-center ${isMe ? 'text-[#ff6b00]' : 'text-white'}`}>
                            {rank}.
                          </div>

                          {/* Quadrado do Avatar (Apenas o rosto/parte superior) */}
                          <div className="w-12 h-12 rounded bg-[#1a0a05] shrink-0 flex items-end justify-center pb-1 relative">
                            <AvatarPixel 
                              config={player?.avatar_config?.skinId ? player.avatar_config : { skinId: 'skin_m_1', instrumentId: '', backgroundId: 'bg_1' }}
                              isSilhouette={!player?.avatar_config?.skinId}
                              hideBackground={true}
                            />
                          </div>

                          {/* Nome */}
                          <div className="flex-1 min-w-0">
                            <p 
                              className={`font-black text-xs uppercase truncate mb-0 ${isMe ? 'text-[#ff6b00]' : 'text-white'}`}
                              style={playerFont ? { fontFamily: playerFont } : {}}
                             >{player.nome}</p>
                           </div>
 
                           {/* XP */}
                           <div className="text-right shrink-0">
                             <p className={`font-black text-sm uppercase ${isMe ? 'text-[#ff6b00]' : 'text-[#ffb300]'}`}>{player.xp} PTS</p>
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 </div>
               )}
              </div>
            )}

          {/* ===== ABA: TODAS AS AULAS (TRILHA EAD - DESIGN STITCH) ===== */}
          {activeTab === 'aulas' && (() => {
            // Módulos adicionais simulados (Stitch original)
            const modulosCompletos = [...trilhaModulos];
            if (!modulosCompletos.some(m => Number(m.ordem) === 2 || m.id === 'mock-2')) {
              modulosCompletos.push({
                id: 'mock-2',
                nome: 'TÉCNICAS EXPLOSIVAS E SOLOS',
                descricao: 'Vulcão Heavy Metal',
                ordem: 2,
                em_producao: true,
                prova_final: [{ id: 'mock-p2' }]
              });
            }
            if (!modulosCompletos.some(m => Number(m.ordem) === 3 || m.id === 'mock-3')) {
              modulosCompletos.push({
                id: 'mock-3',
                nome: 'HARMONIA & COMPOSIÇÃO CELULAR',
                descricao: 'Céu Clássico',
                ordem: 3,
                em_producao: true,
                prova_final: [{ id: 'mock-p3' }]
              });
            }

            const aulasCompletas = [...trilhaAulas];
            if (!trilhaAulas.some(a => a.modulo_id === 'mock-2')) {
              aulasCompletas.push(
                { id: 'mock-a2-1', modulo_id: 'mock-2', titulo: 'RIFFS DE FOGO', em_producao: true },
                { id: 'mock-a2-2', modulo_id: 'mock-2', titulo: 'SOLO FRÍGIO DOMINANTE', em_producao: true },
                { id: 'mock-a2-3', modulo_id: 'mock-2', titulo: 'TAP COMPONENT', em_producao: true }
              );
            }
            if (!trilhaAulas.some(a => a.modulo_id === 'mock-3')) {
              aulasCompletas.push(
                { id: 'mock-a3-1', modulo_id: 'mock-3', titulo: 'TEORIA DAS ESFERAS', em_producao: true },
                { id: 'mock-a3-2', modulo_id: 'mock-3', titulo: 'HARMONIA CELULAR', em_producao: true },
                { id: 'mock-a3-3', modulo_id: 'mock-3', titulo: 'COMPOSIÇÃO RETRÔ', em_producao: true }
              );
            }

            return (
              <div className="w-full min-h-screen bg-[#1a0a05] text-white font-['Space_Mono'] pb-36 relative overflow-visible">
                {/* Carrega Material Symbols para ícones fiéis do Stitch */}
                <link 
                  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" 
                  rel="stylesheet" 
                />

                {/* Estilos locais para o design do Stitch */}
                <style>{`
                  @keyframes float-stitch {
                      0%, 100% { transform: translateY(0) rotate(0deg); }
                      50% { transform: translateY(-10px) rotate(2deg); }
                  }
                  @keyframes pulse-white-orange-stitch {
                      0%, 100% { background-color: #ffffff; box-shadow: 0 0 20px #ffffff, 4px 4px 0px 0px #261812; }
                      50% { background-color: #ff6b00; box-shadow: 0 0 30px #ff6b00, 4px 4px 0px 0px #261812; }
                  }
                  @keyframes path-glow-stitch {
                      0%, 100% { filter: drop-shadow(0 0 2px #ff6b00); }
                      50% { filter: drop-shadow(0 0 8px #ff6b00); }
                  }
                  .floating-sticker-stitch {
                      animation: float-stitch 4s ease-in-out infinite;
                  }
                  .active-node-stitch {
                      animation: pulse-white-orange-stitch 1.5s infinite;
                  }
                  .sticker-shadow-stitch {
                      filter: drop-shadow(4px 4px 0px #261812);
                  }
                `}</style>

                <div className="flex items-center gap-3 px-4 pt-6 pb-6 bg-[#1a0a05]">
                  <div className="bg-[#ff6b00] border-4 border-black px-4 py-1.5 shadow-[6px_6px_0_#000] -rotate-2">
                    <h3 className="text-white font-black text-xs uppercase tracking-widest font-['Space_Mono']">📚 JORNADA MUSICAL</h3>
                  </div>
                  <div className="flex-1 border-t-2 border-dashed border-[#3d2d26]"></div>
                </div>

                {modulosCompletos.map((modulo, modIdx) => {
                  const modAulas = aulasCompletas.filter(a => String(a.modulo_id) === String(modulo.id));
                  const isEmProducao = modulo.em_producao;

                  // Módulo desbloqueado se o anterior foi concluído
                  const isModuloDesbloqueado = !isEmProducao && (modIdx === 0 || (() => {
                    const modAnterior = modulosCompletos[modIdx - 1];
                    const aulasModAnterior = aulasCompletas.filter(a => String(a.modulo_id) === String(modAnterior.id));
                    const todasConcluidas = aulasModAnterior.length > 0 && aulasModAnterior.every(a => 
                      trilhaProgresso.some(p => Number(p.aula_id) === Number(a.id))
                    );
                    const provaConcluida = !modAnterior.prova_final || (
                      Array.isArray(modAnterior.prova_final) && modAnterior.prova_final.length === 0
                    ) || (alunoData?.conquistas?.some((c: any) => 
                      Number(c.id) === Number(modAnterior.conquista_id) || Number(c.conquista_id) === Number(modAnterior.conquista_id)
                    ));
                    return todasConcluidas && provaConcluida;
                  })());

                  // Lógica de Temas / Biomas do Stitch
                  let biomeBg = 'bg-[#1a0f0a]';
                  let biomeLabelBg = 'bg-[#ff6b00]';
                  let biomeLabelText = 'text-white';
                  let biomeLabelRotate = '-rotate-2';
                  let biomeTitle = modulo.nome;
                  let biomeDecorations = null;

                  const themeIndex = modIdx % 3;
                  if (themeIndex === 0) {
                    // Bioma 1: Floresta Synthwave
                    biomeBg = 'bg-[#1a0f0a]';
                    biomeLabelBg = 'bg-[#ff6b00]';
                    biomeLabelText = 'text-white';
                    biomeLabelRotate = '-rotate-2';
                    biomeTitle = `Floresta Synthwave: ${modulo.nome}`;
                    biomeDecorations = (
                      <>
                        <div className="absolute top-10 left-6 floating-sticker-stitch opacity-40 text-4xl select-none pointer-events-none">
                          <span className="material-symbols-outlined text-[#ff6b00] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>album</span>
                        </div>
                        <div className="absolute bottom-16 right-10 floating-sticker-stitch opacity-30 text-4xl select-none pointer-events-none" style={{ animationDelay: '1.5s' }}>
                          <span className="material-symbols-outlined text-[#feccba] text-3xl">star</span>
                        </div>
                      </>
                    );
                  } else if (themeIndex === 1) {
                    // Bioma 2: Vulcão Heavy Metal
                    biomeBg = 'bg-[#1e0808]';
                    biomeLabelBg = 'bg-[#ba1a1a]';
                    biomeLabelText = 'text-white';
                    biomeLabelRotate = 'rotate-2';
                    biomeTitle = `Vulcão Heavy Metal: ${modulo.nome}`;
                    biomeDecorations = (
                      <>
                        <div 
                          className="absolute -top-10 left-4 w-40 h-40 bg-cover bg-center opacity-30 mix-blend-screen select-none pointer-events-none floating-sticker-stitch" 
                          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDpW0B_1lS2FeRskK9yqBUgOfNaEumNklcIP9yJtyecn1zp3iVkikWUeq83mrYMKzL-rCiQ-3bvw9oEExLWSaVPixN-9RYvzCM1H9JlcBfgaMGOsUj4ozPZ-h_mlg4AnkdvFJTFTBaj4zjycCOnLd7wcIplUfxWsJeC29g8Fn8K4gpNY1tsD5FBIOKr157ypOamRNy3rv0BiWt43R2__EH_pmdacNXPnQQNbBzEAmyb1meBQx6ny74Q9blApT35gWkv4yYkx9TPoV0F')" }}
                        ></div>
                        <div className="absolute bottom-12 left-10 floating-sticker-stitch opacity-25 text-3xl select-none pointer-events-none" style={{ animationDelay: '1s' }}>
                          <span className="material-symbols-outlined text-[#ba1a1a] text-4xl">skull</span>
                        </div>
                        <div className="absolute top-1/3 right-8 floating-sticker-stitch opacity-35 text-3xl select-none pointer-events-none" style={{ animationDelay: '2s' }}>
                          <span className="material-symbols-outlined text-[#ff6b00] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>speaker</span>
                        </div>
                      </>
                    );
                  } else {
                    // Bioma 3: Céu Clássico
                    biomeBg = 'bg-[#111625]';
                    biomeLabelBg = 'bg-[#e2e2e2]';
                    biomeLabelText = 'text-black';
                    biomeLabelRotate = '-rotate-1';
                    biomeTitle = `Céu Clássico: ${modulo.nome}`;
                    biomeDecorations = (
                      <>
                        <div 
                          className="absolute -top-16 -left-10 w-24 h-24 bg-cover bg-center opacity-25 select-none pointer-events-none floating-sticker-stitch" 
                          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAF2igrvFQ1c4a1iaeRiviObNuX2T4iigpFcpIzkA2JVz2jTihK-AnlZf9JMb32tPpT7iLtALjGOhgOD3BMZ70gCw3l2SkCgLMLVFjKB54Sb8fsfaLuWG2i8Utxqy187Kb36S27uN6aPooZXx_WGRAwOjLPLFOK8trS6U7TyMFIXt4lRpHskueUThfadfVQHHj7QX4N71L2EuK6prTdM6yYezZBbptZQwadHt0ChANP0BZNFxVh2D5gn8meawJBmNYSbFwwKx9xc0nc')" }}
                        ></div>
                        <div className="absolute bottom-16 right-10 floating-sticker-stitch opacity-20 text-3xl select-none pointer-events-none" style={{ animationDelay: '0.5s' }}>
                          <span className="material-symbols-outlined text-white text-4xl">cloud</span>
                        </div>
                        <div className="absolute top-1/2 left-10 floating-sticker-stitch opacity-30 text-3xl select-none pointer-events-none" style={{ animationDelay: '2.5s' }}>
                          <span className="material-symbols-outlined text-[#e2e2e2] text-3xl">castle</span>
                        </div>
                      </>
                    );
                  }

                  return (
                    <section key={modulo.id} className={`relative overflow-hidden ${biomeBg} transition-all text-white py-12 ${(!isModuloDesbloqueado && !isEmProducao) ? 'opacity-30 select-none pointer-events-none' : ''} ${isEmProducao ? 'opacity-70' : ''}`}>
                      {/* Cabeçalho do Bioma (Sticker-Skeuomorphism do Stitch) */}
                      <div className="flex justify-center mb-12 mt-2">
                        <div className={`${biomeLabelBg} ${biomeLabelText} px-6 py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(38,24,18,1)] ${biomeLabelRotate} text-center min-w-[220px] relative`}>
                          {isEmProducao && (
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ba1a1a] text-white border border-black text-[7px] px-1.5 py-0.5 font-black uppercase font-['Space_Mono'] tracking-widest whitespace-nowrap">
                              🛠️ EM BREVE
                            </span>
                          )}
                          <h2 className="font-['Space_Mono'] font-bold uppercase tracking-tighter text-xs sm:text-sm">{biomeTitle}</h2>
                        </div>
                      </div>

                      {/* Canvas do Mapa do Bioma */}
                      <div className="flex flex-col items-center gap-24 relative py-16 px-4 overflow-hidden min-h-[380px]">
                        {/* Decorações do Bioma */}
                        {biomeDecorations}

                        {/* Caminho Curvo Candy Crush Dinâmico (Stitch Style) */}
                        <svg 
                          className="absolute top-0 bottom-0 left-0 right-0 w-full h-full pointer-events-none z-0 opacity-70" 
                          preserveAspectRatio="none"
                          viewBox={`0 0 200 ${220 + modAulas.length * 140}`}
                        >
                          <path 
                            d={generateSvgPath(modAulas.length)} 
                            fill="none" 
                            stroke="#5a4136" 
                            strokeWidth="8"
                            strokeLinecap="round"
                          />
                          <path 
                            d={generateSvgPath(modAulas.length)} 
                            fill="none" 
                            stroke="#ff6b00" 
                            strokeWidth="4" 
                            strokeDasharray="6 6"
                            strokeLinecap="round"
                            className="animate-[path-glow-stitch_2s_infinite]"
                          />
                        </svg>
                        
                        {modAulas.map((aula, aulaIdx) => {
                          const isAulaEmProducao = aula.em_producao;
                          const isConcluida = !isAulaEmProducao && trilhaProgresso.some(p => Number(p.aula_id) === Number(aula.id));
                          const isAulaDesbloqueada = !isAulaEmProducao && isModuloDesbloqueado && (aulaIdx === 0 || (() => {
                            const aulaAnterior = modAulas[aulaIdx - 1];
                            return trilhaProgresso.some(p => Number(p.aula_id) === Number(aulaAnterior.id));
                          })());

                          // Lógica de desvio Candy Crush em Zig-Zag
                          const modVal = aulaIdx % 4;
                          const translateVal = modVal === 0 
                            ? 'translate-x-[-45px] sm:translate-x-[-80px]' 
                            : modVal === 1 
                              ? 'translate-x-0' 
                              : modVal === 2 
                                ? 'translate-x-[45px] sm:translate-x-[80px]' 
                                : 'translate-x-0';
                          
                          const titleAlign = modVal === 0 
                            ? 'left-[76px] sm:left-[98px] top-1/2 -translate-y-1/2 text-left rotate-6' 
                            : modVal === 2 
                              ? 'right-[76px] sm:right-[98px] top-1/2 -translate-y-1/2 text-right -rotate-3' 
                              : 'top-[76px] sm:top-[98px] left-1/2 -translate-x-1/2 text-center rotate-1';

                          const isAtiva = isAulaDesbloqueada && !isConcluida;

                          return (
                            <div key={aula.id} className={`relative flex items-center justify-center transition-all ${translateVal} z-10`}>
                              {/* Botão do Círculo da Aula no Estilo Stitch */}
                              {isConcluida ? (
                                <button
                                  disabled={!isAulaDesbloqueada}
                                  onClick={() => {
                                    setSelectedTrilhaAula(aula);
                                    setVideoCompleto(false);
                                    setQuestionarioFinalizado(false);
                                    setQuestionarioCorreto(null);
                                    setQuestionarioRespostas({});
                                    setCurrentQuestionIdx(0);
                                    setTentativaResultado(null);
                                  }}
                                  className="w-16 h-16 bg-[#a04100] rounded-full border-2 border-black flex items-center justify-center hover:scale-115 transition-transform active:translate-y-1 shadow-[4px_4px_0px_0px_#261812] cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    {obterIconeStitch(aula.titulo)}
                                  </span>
                                </button>
                              ) : isAtiva ? (
                                <div 
                                  onClick={() => {
                                    setSelectedTrilhaAula(aula);
                                    setVideoCompleto(false);
                                    setQuestionarioFinalizado(false);
                                    setQuestionarioCorreto(null);
                                    setQuestionarioRespostas({});
                                    setCurrentQuestionIdx(0);
                                    setTentativaResultado(null);
                                  }}
                                  className="active-node-stitch w-20 h-20 rounded-full border-4 border-black flex items-center justify-center cursor-pointer hover:scale-105 transition-all"
                                >
                                  <span className="material-symbols-outlined text-black text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    {obterIconeStitch(aula.titulo)}
                                  </span>
                                </div>
                              ) : isAulaEmProducao ? (
                                <button className="w-16 h-16 bg-[#2d221d] rounded-full border-2 border-[#3d2d26] flex items-center justify-center cursor-not-allowed opacity-60">
                                  <span className="material-symbols-outlined text-[#5a4136] text-3xl">build</span>
                                </button>
                              ) : (
                                <button className="w-16 h-16 bg-[#3d2d26] rounded-full border-2 border-[#5a4136] flex items-center justify-center cursor-not-allowed opacity-60">
                                  <span className="material-symbols-outlined text-[#5a4136] text-3xl">lock</span>
                                </button>
                              )}

                              {/* Título Adesivo da Aula */}
                              {isAtiva ? (
                                <div className={`absolute ${titleAlign} whitespace-nowrap bg-[#ba1a1a] text-white px-3 py-1 border-2 border-black font-['Space_Mono'] text-[9px] uppercase font-bold sticker-shadow-stitch whitespace-nowrap z-20`}>
                                  <span className="text-white animate-ping mr-1.5">●</span>
                                  ATUAL: {aula.titulo}
                                </div>
                              ) : isAulaEmProducao ? (
                                <div className={`absolute ${titleAlign} whitespace-nowrap bg-zinc-800 text-zinc-400 px-2 py-1 border-2 border-black font-['Space_Mono'] text-[8px] uppercase font-bold sticker-shadow-stitch opacity-75`}>
                                  🛠️ EM PRODUÇÃO: {aula.titulo}
                                </div>
                              ) : (
                                <div className={`absolute ${titleAlign} whitespace-nowrap bg-white border-2 border-black text-[8px] font-black uppercase text-black px-2 py-1 shadow-[3px_3px_0_#261812] pointer-events-none font-['Space_Mono'] sticker-shadow-stitch`}>
                                  {aula.titulo}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Prova Geral do Módulo no final da trilha (Boss Level) */}
                        {modulo.prova_final && Array.isArray(modulo.prova_final) && modulo.prova_final.length > 0 && (() => {
                          const todasAulasConcluidas = modAulas.length > 0 && modAulas.every(a => 
                            trilhaProgresso.some(p => Number(p.aula_id) === Number(a.id))
                          );
                          const isProvaConcluida = alunoData?.conquistas?.some((c: any) => 
                            Number(c.id) === Number(modulo.conquista_id) || Number(c.conquista_id) === Number(modulo.conquista_id)
                          );
                          const isProvaDesbloqueada = !isEmProducao && isModuloDesbloqueado && todasAulasConcluidas;

                          return (
                            <div className="relative flex flex-col items-center justify-center mt-8 z-10">
                              <button
                                disabled={!isProvaDesbloqueada}
                                onClick={() => {
                                  setSelectedTrilhaModulo(modulo);
                                  setQuestionarioFinalizado(false);
                                  setQuestionarioCorreto(null);
                                  setQuestionarioRespostas({});
                                  setCurrentQuestionIdx(0);
                                  setTentativaResultado(null);
                                }}
                                className={`w-20 h-20 border-4 border-black flex items-center justify-center font-black text-2xl transition-all active:translate-y-1 shadow-[8px_8px_0px_0px_rgba(38,24,18,0.5)] rounded-xl ${
                                  isProvaConcluida 
                                    ? 'bg-[#ffeb3b] text-black border-yellow-600 hover:scale-105' 
                                    : isProvaDesbloqueada 
                                      ? 'bg-[#ba1a1a] text-white hover:scale-105 animate-bounce' 
                                      : 'bg-[#3d2d26] text-[#5a4136] opacity-60 cursor-not-allowed border-[#5a4136] shadow-none'
                                }`}
                                title="Prova Geral do Módulo (Boss Level)"
                              >
                                <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: isProvaConcluida ? "'FILL' 1" : undefined }}>
                                  {isProvaConcluida ? 'grade' : 'grade'}
                                </span>
                              </button>

                              {/* Placa da Prova */}
                              <div className="absolute top-[88px] whitespace-nowrap bg-black border-2 border-[#ff6b00] text-[8px] font-black uppercase text-[#ff6b00] px-3 py-1 shadow-[3px_3px_0_#261812] text-center font-['Space_Mono'] -rotate-2">
                                FINAL BOSS
                                <span className="block text-[6px] text-white font-bold tracking-widest mt-0.5">
                                  {isEmProducao ? 'EM BREVE 🛠️' : isProvaConcluida ? 'CONCLUÍDO! 👑' : isProvaDesbloqueada ? 'DESBLOQUEADO ⚔️' : 'BLOQUEADO 🔒'}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </section>
                  );
                })}

                {modulosCompletos.length === 0 && (
                  <div className="bg-[#261812] border-4 border-black p-8 text-center shadow-[4px_4px_0_#000]">
                    <p className="text-[#feccba] font-black text-xs uppercase font-['Space_Mono']">Nenhum módulo EAD disponível para o seu curso ainda.</p>
                    <p className="text-[#8e7164] font-black text-[9px] uppercase tracking-wider mt-2">Em breve, nossos professores adicionarão videoaulas exclusivas aqui!</p>
                  </div>
                )}
              </div>
            );
          })()}

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

              {showAvatarStore ? (
                <AvatarStore 
                  xp={acordeCoins}
                  pontos={acordeCoins}
                  unlockedItems={avatarInventory}
                  onClose={() => setShowAvatarStore(false)}
                  onBuy={(itemId, price) => handleSpendXp(price, itemId)}
                  onConvertXp={(amountXp, points) => {
                    // Conversão desativada, pois usamos XP como única moeda.
                    toast.error('A conversão de XP não é mais necessária!');
                  }}
                />
              ) : !isPlayingAcordeGenius && !isPlayingChordRush && !isPlayingTriadeNinja && !isPlayingRitmoPro && !isPlayingVoiceRush ? (
                <>
                  {/* Botão de Acesso à Loja */}
                  <div 
                    onClick={() => setShowAvatarStore(true)}
                    className="bg-[#fff8f6] border-8 border-black p-4 shadow-[8px_8px_0_#000] transition-all relative group overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-[10px_10px_0_#000]"
                  >
                    <div className="absolute top-0 left-0 w-full h-2 bg-[#ff6b00]"></div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#ffeb3b] border-4 border-black flex items-center justify-center text-2xl shadow-[2px_2px_0_#000]">
                          🛒
                        </div>
                        <div>
                          <h3 className="text-black font-black text-sm uppercase tracking-widest">LOJA DE ITENS</h3>
                          <p className="text-[#8e7164] font-black text-[9px] uppercase mt-0.5">Compre cabelos, roupas e acessórios!</p>
                        </div>
                      </div>
                    <div className="flex gap-2">
                      <div 
                        className="bg-[#feccba] border-4 border-black px-2 py-1 flex items-center justify-center font-black text-xs text-[#3d2d26] shadow-[2px_2px_0_#000]"
                      >
                        💰 {acordeCoins} COINS
                      </div>
                    </div>
                    </div>
                  </div>

                  <DailyMissions onClaimReward={(reward) => handleAddXp(reward, 'Missão Diária')} />

                  {/* Grid de Aplicativos (Jogos) */}
                  <div className="pt-2">
                    <div className="flex items-center gap-3 mb-4">
                      <h4 className="text-white font-black text-[10px] uppercase tracking-widest">MINI JOGOS (APPS)</h4>
                      <div className="flex-1 border-t-2 border-dashed border-[#3d2d26]"></div>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
                      
                      {/* App 1: Genius */}
                      <button 
                        onClick={() => {
                          setIsPlayingAcordeGenius(true);
                          playRetroSound(880, 'square', 0.1);
                        }}
                        className="flex flex-col items-center gap-2 group cursor-pointer hover:-translate-y-1 transition-all"
                      >
                        <div className="w-full aspect-square bg-[#ff6b00] border-4 border-black shadow-[4px_4px_0_#000] group-active:translate-y-1 group-active:shadow-none transition-all rounded-xl flex items-center justify-center text-3xl">
                          🕹️
                        </div>
                        <span className="text-white font-black text-[8px] uppercase tracking-widest text-center">Acorde Genius</span>
                      </button>

                      {/* App 2: Chord Rush */}
                      <button 
                        onClick={() => {
                          setIsPlayingChordRush(true);
                          playRetroSound(880, 'square', 0.1);
                        }}
                        className="flex flex-col items-center gap-2 group cursor-pointer hover:-translate-y-1 transition-all"
                      >
                        <div className="w-full aspect-square bg-[#00ff66] border-4 border-black shadow-[4px_4px_0_#000] group-active:translate-y-1 group-active:shadow-none transition-all rounded-xl flex items-center justify-center text-3xl">
                          🎸
                        </div>
                        <span className="text-white font-black text-[8px] uppercase tracking-widest text-center">Chord Rush</span>
                      </button>

                      {/* App 3: Triade Ninja */}
                      <button 
                        onClick={() => {
                          setIsPlayingTriadeNinja(true);
                          playRetroSound(880, 'square', 0.1);
                        }}
                        className="flex flex-col items-center gap-2 group cursor-pointer hover:-translate-y-1 transition-all"
                      >
                        <div className="w-full aspect-square bg-[#a855f7] border-4 border-black shadow-[4px_4px_0_#000] group-active:translate-y-1 group-active:shadow-none transition-all rounded-xl flex items-center justify-center text-3xl">
                          ⚔️
                        </div>
                        <span className="text-white font-black text-[8px] uppercase tracking-widest text-center">Triade Ninja</span>
                      </button>

                      {/* App 4: Rhythm Hero (Locked) */}
                      <div className="flex flex-col items-center gap-2 opacity-50 grayscale cursor-not-allowed">
                        <div className="w-full aspect-square bg-[#8e7164] border-4 border-black shadow-[4px_4px_0_#000] rounded-xl flex items-center justify-center text-3xl">
                          🔒
                        </div>
                        <span className="text-white font-black text-[8px] uppercase tracking-widest text-center">Rhythm Hero</span>
                      </div>

                    </div>
                  </div>
                </>
              ) : isPlayingChordRush ? (
                <ChordRush 
                  onClose={() => setIsPlayingChordRush(false)}
                  onGameOver={(score) => {
                    updateDailyMissionProgress('Chord Rush');
                    window.dispatchEvent(new CustomEvent('acorde_game_played', { detail: 'Chord Rush' }));
                    if (score > 0) handleAddXp(score, 'Chord Rush');
                  }}
                  playRetroSound={playRetroSound}
                />
              ) : isPlayingTriadeNinja ? (
                <TriadeNinja
                  onClose={() => setIsPlayingTriadeNinja(false)}
                  onGameOver={(score) => {
                    updateDailyMissionProgress('Tríade Ninja');
                    window.dispatchEvent(new CustomEvent('acorde_game_played', { detail: 'Tríade Ninja' }));
                    if (score > 0) handleAddXp(score, 'Tríade Ninja');
                  }}
                  playRetroSound={playRetroSound}
                />
              ) : isPlayingRitmoPro ? (
                <div className="bg-black border-8 border-[#3d2d26] shadow-[8px_8px_0_#000] w-full min-h-[500px]">
                  <RitmoPro 
                    onClose={() => setIsPlayingRitmoPro(false)} 
                    onGameOver={(score) => {
                      updateDailyMissionProgress('Ritmo Pro');
                      if (score > 0) handleAddXp(score, 'Ritmo Pro');
                    }} 
                  />
                </div>
              ) : isPlayingVoiceRush ? (
                <div className="bg-black border-8 border-[#3d2d26] shadow-[8px_8px_0_#000] w-full min-h-[500px]">
                  <VoiceRush 
                    onClose={() => setIsPlayingVoiceRush(false)} 
                    onGameOver={(score) => {
                      updateDailyMissionProgress('Voice Rush');
                      if (score > 0) handleAddXp(score, 'Voice Rush');
                    }} 
                  />
                </div>
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
                    🔥 CHECK-IN DE HOJE REALIZADO! (+500 XP CREDITADOS)
                  </div>
                ) : (
                  <button
                    onClick={handleMarcarTreino}
                    className="w-full bg-[#ff6b00] hover:bg-black text-white font-black text-xs py-4 uppercase border-4 border-black shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    🔥 MARCAR TREINO HOJE (+500 XP)
                  </button>
                )}

                {/* Upload / Gravação de Vídeo */}
                <div className="border-t-4 border-dashed border-black pt-4 space-y-4">
                  <h3 className="text-black font-black text-[10px] uppercase tracking-wider flex items-center justify-between gap-2">
                    <span>📹 COMPROVAR COM VÍDEO (MAX 45 SEGUNDOS)</span>
                    <span className="bg-[#ff6b00] text-white px-2 py-0.5 border-2 border-black rotate-3 shadow-[2px_2px_0_#000] animate-pulse">+500 XP</span>
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
                      <label className="bg-[#feccba] hover:bg-[#ff6b00] hover:text-white text-black font-black text-[9px] uppercase py-3 border-4 border-black shadow-[4px_4px_0_#000] active:translate-y-0.5 cursor-pointer flex flex-col items-center justify-center gap-1 text-center">
                        🎥 GRAVAR VÍDEO AGORA
                        <input
                          type="file"
                          accept="video/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 150 * 1024 * 1024) {
                                toast.error('O arquivo excedeu o limite de 150MB.');
                                return;
                              }
                              setVideoBlob(file);
                              setVideoPreviewUrl(URL.createObjectURL(file));
                              toast.success('Câmera do celular ativada com sucesso! Vídeo pronto para enviar. 📹🔥');
                            }
                          }}
                        />
                      </label>
                      
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
                    </div>
                  )}
                </div>
              </div>



            </div>
          )}


          {/* ===== MODAL GLOBAL DE FICHA DE AULA (abre de qualquer aba) ===== */}
          {selectedFicha && (() => {
            const aula = selectedFicha;
            let midiasList: any[] = [];
            try {
              if (typeof aula.midias === 'string') midiasList = JSON.parse(aula.midias);
              else if (Array.isArray(aula.midias)) midiasList = aula.midias;
            } catch {}
            let isRich = false;
            let richData: any = null;
            try {
              if (aula.conteudo && (aula.conteudo.startsWith('{') || aula.conteudo.startsWith('['))) {
                const parsed = JSON.parse(aula.conteudo);
                if (parsed && parsed.isRich) { isRich = true; richData = parsed; }
              }
            } catch {}
            const cursoNomeAula = alunoData?.matriculas?.[0]?.cursos?.nome || alunoData?.curso_ativo || aula.cursos?.nome || aula.curso_nome || '';
            const isCursoTeclado = /teclado|piano|keyboard/i.test(cursoNomeAula);
            const currentInstrument = isCursoTeclado ? 'Teclado' : (cursoNomeAula || 'Piano');
            return (
              <div className="fixed inset-0 bg-[#261812]/95 md:bg-black/80 z-[150] flex items-stretch md:items-center justify-center p-0 md:p-4 overflow-y-auto">
                <div className="bg-[#fff8f6] border-0 md:border-8 border-black pt-16 pb-6 px-4 md:p-5 shadow-none md:shadow-[8px_8px_0_#000] w-full max-w-full md:max-w-[600px] min-h-screen md:min-h-0 flex flex-col space-y-4 relative font-['Space_Mono'] text-black select-none">
                  <div className="flex justify-between items-start border-b-4 border-black pb-3">
                    <div>
                      <p className="text-[#ff6b00] font-black text-[9px] uppercase tracking-wider">
                        {format(new Date(aula.data + 'T12:00:00Z'), "dd 'de' MMMM", { locale: ptBR }).toUpperCase()}
                      </p>
                      <h3 className="text-black font-black text-sm md:text-base uppercase italic">
                        FICHA DE AULA: {aula.curso_nome || 'MUSICA'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setPrintAula(aula)}
                        className="bg-[#4ade80] text-black border-2 border-black font-black text-[9px] px-3 py-1.5 shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none hover:bg-[#22c55e] transition-all flex items-center gap-1"
                      >
                        📥 PDF
                      </button>
                      <button
                        onClick={() => setSelectedFicha(null)}
                        className="bg-red-600 text-white border-2 border-black font-black text-[11px] px-3.5 py-1.5 shadow-[2px_2px_0_#000] active:translate-y-0.5 active:shadow-none hover:bg-black hover:text-[#feccba] transition-all"
                      >
                        X FECHAR
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                    {!isRich ? (
                      <>
                        <div className="bg-[#feccba]/20 border-2 border-black/10 p-2.5">
                          <span className="text-[8px] font-black text-[#8e7164] uppercase block mb-1">CONTEUDO TRABALHADO:</span>
                          <p className="text-black text-[10px] font-bold uppercase whitespace-pre-wrap">{linkify(aula.conteudo || 'Nenhum conteudo registrado')}</p>
                        </div>
                        <div className="bg-black/5 border-2 border-black/10 p-2.5">
                          <span className="text-[8px] font-black text-[#ff6b00] uppercase block mb-1">⚔️ BOSS QUEST / DESAFIO:</span>
                          <p className="text-black text-[10px] font-bold uppercase italic whitespace-pre-wrap">{linkify(aula.tarefa_casa || 'Treinar repertorio livre')}</p>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-[#feccba]/20 border-2 border-black/20 p-2.5">
                          <span className="text-[8px] font-black text-[#8e7164] uppercase block mb-1">CONTEUDO TRABALHADO:</span>
                          <p className="text-black text-[10px] font-bold uppercase whitespace-pre-wrap">{linkify(richData.conteudoText || 'AULA INTERATIVA DE MUSICA')}</p>
                        </div>
                        {richData.tarefaCasaText && (
                          <div className="bg-black/5 border-2 border-black/20 p-2.5">
                            <span className="text-[8px] font-black text-[#ff6b00] uppercase block mb-1">⚔️ TAREFA DE CASA:</span>
                            <p className="text-black text-[10px] font-bold uppercase italic whitespace-pre-wrap">{linkify(richData.tarefaCasaText)}</p>
                          </div>
                        )}
                        {richData.acordes && richData.acordes.length > 0 && (
                          <LessonChords chords={richData.acordes} currentInstrument={currentInstrument} />
                        )}
                        {Array.isArray(richData.exercises) && richData.exercises.length > 0 && (
                          <div className="space-y-2">
                            <div className="bg-[#ff6b00] border-2 border-black px-2 py-0.5 shadow-[2px_2px_0_#000] inline-block">
                              <span className="text-[8px] font-black text-white uppercase">⚔️ BOSS QUEST</span>
                            </div>
                            {richData.exercises.map((ex: any, idx: number) => (
                              <div key={idx} className="bg-[#261812] border-4 border-[#ff6b00] p-3 shadow-[4px_4px_0_#ff6b00]">
                                <p className="text-[#feccba] font-black text-[10px] uppercase">{ex.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {Array.isArray(richData.images) && richData.images.length > 0 && (
                          <div className="pt-2 border-t-2 border-black/10">
                            <span className="text-[8px] font-black text-[#ff6b00] uppercase block mb-2">📸 ANEXOS E CIFRAS:</span>
                            <div className="grid grid-cols-2 gap-2">
                              {richData.images.map((img: string, i: number) => (
                                <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="block border-4 border-black hover:scale-[1.02] transition-transform shadow-[4px_4px_0_#000]">
                                  <img src={img} alt="Anexo" className="w-full h-24 object-cover" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {midiasList.length > 0 && (
                      <div>
                        <span className="text-[8px] font-black text-black/50 uppercase block mb-1 font-mono">LINKS &amp; ANEXOS:</span>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {midiasList.map((mid, mIdx) => (
                            <a key={mIdx} href={mid.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-white border-2 border-black text-[8px] font-black uppercase shadow-[2px_2px_0_#000] hover:translate-y-[1px] hover:shadow-none transition-all">
                              🔗 {mid.titulo}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end items-center border-t-4 border-black pt-3">
                    <button
                      onClick={() => setSelectedFicha(null)}
                      className="bg-[#ff6b00] text-white border-2 border-black font-black text-[10px] px-6 py-2 shadow-[2px_2px_0_#000] hover:bg-black transition-colors"
                    >
                      ✅ CONCLUIDO
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ===== MODAL DE MISSÃO PWA ===== */}
          <PwaModal 
             alunoData={alunoData} 
             onRewardClaimed={(xp) => setAlunoData((prev: any) => ({ ...prev, xp: (prev.xp || 0) + xp, push_recompensado: true }))} 
          />

          {/* ===== ABA: HOME (HUB INTEGRADO DO JOGADOR) ===== */}
          {activeTab === 'home' && (
            <div className="px-4 py-5 space-y-6">
              
              {/* Diário de Evolução (Últimas Aulas Recentes no Topo) */}
              <div className="bg-[#261812] border-8 border-black p-4 shadow-[8px_8px_0_#000] space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-white font-black text-[9px] uppercase tracking-widest">Aulas Recentes &amp; Evolução</p>
                  <span className="text-[#ff6b00] font-black text-[8px] uppercase">
                    ⚡ Clique para ver detalhes
                  </span>
                </div>
                
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide select-none">
                  {aulasRealizadas.map((aula: any) => {
                    const dataFormatada = format(new Date(aula.data + 'T12:00:00Z'), "dd/MMM", { locale: ptBR }).toUpperCase();
                    let temaCurto = '';
                    try {
                      if (aula.conteudo && (aula.conteudo.startsWith('{') || aula.conteudo.startsWith('['))) {
                        const parsed = JSON.parse(aula.conteudo);
                        temaCurto = parsed.conteudoText || '';
                      } else {
                        temaCurto = aula.conteudo || '';
                      }
                    } catch {
                      temaCurto = aula.conteudo || '';
                    }
                    if (temaCurto.length > 28) {
                      temaCurto = temaCurto.substring(0, 25) + '...';
                    }

                    return (
                      <div
                        key={aula.id}
                        onClick={() => handleOpenFicha(aula)}
                        className="flex-shrink-0 bg-[#261812] border-4 border-black p-3 flex flex-col justify-between shadow-[4px_4px_0_#000] cursor-pointer hover:translate-y-[-2px] hover:shadow-[6px_6px_0_#000] active:translate-y-0 active:shadow-none transition-all w-36"
                      >
                        <div className="space-y-1">
                          <span className="text-[#ff6b00] font-black text-[8px] uppercase tracking-wider block border-b border-[#ff6b00]/30 pb-1">
                            📚 {dataFormatada}
                          </span>
                          <p className="text-[#feccba] font-black text-[8px] uppercase leading-tight line-clamp-3">
                            {temaCurto || 'AULA REGULAR'}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[#4ade80] text-[7px] font-black uppercase bg-black px-1.5 py-0.5 border border-[#4ade80]/40">+500 XP</span>
                          <span className="text-[7px] font-black text-[#ff6b00] uppercase">ABRIR →</span>
                        </div>
                      </div>
                    );
                  })}

                  {aulasRealizadas.length === 0 && (
                    <div className="w-full py-4 text-center">
                      <p className="text-[#8e7164] font-black text-[8px] uppercase tracking-tighter">Nenhum diário de aula registrado.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Painel do Jogador Retrô 8-Bit */}
              <div className="bg-[#fff8f6] border-8 border-black p-5 shadow-[12px_12px_0_#000] flex flex-col items-center text-center relative overflow-visible gap-4">
                <div className="absolute top-0 left-0 w-full h-2 bg-[#ff6b00]"></div>
                
                {/* Nome do Estudante */}
                <div className="space-y-0.5">
                  <h2 className="text-black font-black text-xl uppercase italic leading-tight">{alunoData?.nome || user?.nome}</h2>
                  <p className="text-[#8e7164] font-black text-[9px] uppercase tracking-widest">{alunoData?.email}</p>
                </div>

                {/* Avatar Interativo Grande */}
                <div className="relative group cursor-pointer w-full max-w-[220px] aspect-[3/4]" onClick={() => document.getElementById('photo-input-home')?.click()}>
                  <div className="w-full h-full shadow-[6px_6px_0_#000] relative">
                    {alunoData?.avatar_config ? (
                      <AvatarPixel config={alunoData.avatar_config} />
                    ) : alunoData?.foto_url ? (
                      <img src={alunoData.foto_url} alt="Avatar" className="w-full h-full object-cover border-4 border-black" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#ff6b00] border-4 border-black text-black font-black text-5xl uppercase">
                        {(alunoData?.nome || user?.nome || 'A').charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 bg-black border-4 border-white text-white p-1.5 rounded-none hover:scale-105 transition-transform">
                    <Camera className="w-4 h-4" />
                  </div>
                  <input 
                    id="photo-input-home" 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handlePhotoUpload} 
                  />
                </div>

                {/* Nível do Estudante */}
                <span className="text-[9px] font-black uppercase px-3 py-1 bg-black text-white border-2 border-black tracking-widest">
                  NÍVEL_0{Math.floor((alunoData?.xp || 0) / 1000) + 1} • {alunoData?.curso_ativo || 'MÚSICA'}
                </span>

                {/* Barra de Progresso de XP */}
                <div className="w-full space-y-1">
                  <div className="flex justify-between items-center text-[7.5px] font-black text-black tracking-wider">
                    <span>XP PARA PRÓXIMO LVL</span>
                    <span>{(alunoData?.xp || 0) % 1000} / 1000 XP</span>
                  </div>
                  <div className="h-5 bg-black p-0.5 border-4 border-black overflow-hidden w-full">
                    <div 
                      className="h-full bg-[#ff6b00] transition-all duration-500" 
                      style={{ width: `${((alunoData?.xp || 0) % 1000) / 10}%` }}
                    ></div>
                  </div>
                </div>

                {/* Ações Rápidas (Editor & Loja) */}
                <div className="w-full flex flex-col gap-2.5 border-t-4 border-black pt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setShowAvatarEditor(!showAvatarEditor)}
                      className="bg-[#ff6b00] text-white border-4 border-black py-2.5 font-black text-[9px] uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none hover:bg-black transition-all"
                    >
                      {showAvatarEditor ? 'FECHAR EDITOR' : '👕 CUSTOMIZAR'}
                    </button>
                    
                    <button 
                      onClick={() => setShowAvatarStore(true)}
                      className="bg-[#ffeb3b] text-black border-4 border-black py-2.5 font-black text-[9px] uppercase shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none hover:bg-black hover:text-white transition-all"
                    >
                      🛒 LOJA DE SKINS
                    </button>
                  </div>

                  <button 
                    onClick={handleDownloadProfileCard}
                    className="w-full bg-[#4ade80] text-black border-4 border-black py-2 font-black text-[9px] uppercase shadow-[4px_4px_0_#000] hover:translate-y-0.5 transition-all flex items-center justify-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    SALVAR CARD DO JOGADOR
                  </button>
                </div>

                {/* Editor Inline se showAvatarEditor for true */}
                {showAvatarEditor && (
                  <div className="w-full border-t-4 border-dashed border-black pt-4 mt-2">
                    <AvatarEditor 
                      alunoId={alunoData?.id} 
                      currentConfig={alunoData?.avatar_config}
                      unlockedItems={avatarInventory}
                      onSave={async (newConfig) => {
                         setAlunoData((prev: any) => ({ ...prev, avatar_config: newConfig }));
                         setShowAvatarEditor(false);
                         const token = localStorage.getItem('acorde_token');
                         if (alunoData?.id) {
                           await fetch(`/api/alunos/${alunoData.id}/avatar`, {
                             method: 'PUT',
                             headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                             body: JSON.stringify({ avatar_config: newConfig })
                           });
                         }
                      }}
                    />
                  </div>
                )}

                {/* Stats do Player */}
                <div className="grid grid-cols-3 gap-2 w-full mt-2 pt-4 border-t-4 border-dashed border-black/20">
                  <div className="bg-[#feccba]/40 border-2 border-black p-1.5 text-center shadow-[2px_2px_0_#000]">
                    <p className="text-black font-black text-[6.5px] uppercase tracking-widest leading-none">XP TOTAL</p>
                    <p className="text-[#ff6b00] font-black text-sm italic mt-1 leading-none">{alunoData?.xp || 0}</p>
                  </div>
                  <div className="bg-[#feccba]/40 border-2 border-black p-1.5 text-center shadow-[2px_2px_0_#000]">
                    <p className="text-black font-black text-[6.5px] uppercase tracking-widest leading-none">MOEDAS</p>
                    <p className="text-black font-black text-sm italic mt-1 leading-none">{acordeCoins}</p>
                  </div>
                  <div className="bg-[#feccba]/40 border-2 border-black p-1.5 text-center shadow-[2px_2px_0_#000]">
                    <p className="text-black font-black text-[6.5px] uppercase tracking-widest leading-none">CONQUISTAS</p>
                    <p className="text-[#ff6b00] font-black text-sm italic mt-1 leading-none">{alunoData?.conquistas?.length || 0}</p>
                  </div>
                </div>
              </div>

              {/* Loja de Skins Overlay Modal */}
              {showAvatarStore && (
                <div className="fixed inset-0 bg-black/85 z-[200] flex items-center justify-center p-4 overflow-y-auto">
                  <div className="w-full max-w-[500px] my-6">
                    <AvatarStore 
                      xp={acordeCoins}
                      pontos={acordeCoins}
                      unlockedItems={avatarInventory}
                      onClose={() => setShowAvatarStore(false)}
                      onBuy={(itemId, price) => handleSpendXp(price, itemId)}
                      onConvertXp={(amountXp, points) => {
                        toast.error('A conversão de XP não é mais necessária!');
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Zepp Gallery - Galeria de Troféus (Integrada à Home) */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-white font-black text-xs uppercase tracking-widest">🏆 MEUS TROFÉUS — ZEPP GALLERY</h3>
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
                      <div className="bg-[#261812] border-4 border-black p-6 text-center shadow-[4px_4px_0_#000]">
                        <p className="text-[#8e7164] font-black text-[9px] uppercase">Nenhum troféu cadastrado na galeria ainda.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-6">
                      {[
                        { key: 'Supremo', label: '👑 SUPREMO', border: 'border-[#d4af37]' },
                        { key: 'Lendario', label: '🔥 LENDÁRIO', border: 'border-[#f97316]' },
                        { key: 'Epico', label: '🔮 ÉPICO', border: 'border-[#a855f7]' },
                        { key: 'Raro', label: '⭐ RARO', border: 'border-[#3b82f6]' },
                        { key: 'Especial', label: '⚡ ESPECIAL', border: 'border-[#22c55e]' }
                      ].map((categoria) => {
                        const conquistasDaCategoria = filteredConquistas.filter(
                          (c: any) => (c.classe || 'Especial').toLowerCase() === categoria.key.toLowerCase()
                        );

                        if (conquistasDaCategoria.length === 0) return null;

                        return (
                          <div key={categoria.key} className="space-y-3 bg-[#261812] p-4 border-4 border-black shadow-[4px_4px_0_#000]">
                            <h4 className="text-xs font-black text-white uppercase tracking-widest border-b-2 border-white/20 pb-2 flex items-center justify-between">
                              <span>{categoria.label}</span>
                            </h4>

                            <div className="grid grid-cols-3 gap-3">
                              {conquistasDaCategoria.map((conquista: any) => {
                                const conquistadoInstancias = alunoData?.conquistas?.filter(
                                  (c: any) => Number(c.id) === Number(conquista.id) || Number(c.conquista_id) === Number(conquista.id)
                                ) || [];
                                const conquistadoCount = conquistadoInstancias.length;
                                const conquistado = conquistadoCount > 0;
                                const solicitacaoPendente = alunoData?.solicitacoes?.find(
                                  (s: any) => Number(s.conquista_id) === Number(conquista.id) && s.status === 'pendente'
                                );

                                return (
                                  <div 
                                    key={conquista.id} 
                                    onClick={() => setSelectedTrophy({ ...conquista, conquistado, solicitacaoPendente, conquistadoCount })}
                                    className={`flex flex-col items-center cursor-pointer group hover:scale-[1.03] transition-transform relative ${!conquistado && !solicitacaoPendente ? 'opacity-40 grayscale hover:grayscale-0' : ''}`}
                                  >
                                    {solicitacaoPendente && (
                                      <div className="absolute -top-1 -right-1 z-20 bg-yellow-500 text-black border border-black font-black text-[6px] px-1 py-0.5 uppercase shadow-[1px_1px_0_#000] animate-pulse">
                                        ⏳ PENDENTE
                                      </div>
                                    )}

                                    <div className={`w-14 h-14 flex items-center justify-center mb-1.5 transition-all ${conquistado ? 'drop-shadow-[0_0_10px_rgba(255,107,0,0.4)]' : ''}`}>
                                      {conquista.icone_url || resolveTrophyImage(conquista.instrumento, conquista.classe) ? (
                                        <img src={conquista.icone_url || resolveTrophyImage(conquista.instrumento, conquista.classe)} alt={conquista.nome} className="w-full h-full object-contain hover:scale-105 transition-transform" />
                                      ) : (
                                        <Trophy className={`w-8 h-8 ${conquistado ? 'text-[#ff6b00]' : 'text-gray-500'}`} />
                                      )}
                                    </div>
                                    <h5 className="font-bold text-white text-[8px] uppercase text-center leading-tight line-clamp-1 w-full">{conquista.nome}</h5>
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

              {/* Feed de Atividades / CRM */}
              <div className="bg-[#fff8f6] border-4 border-black p-4 shadow-[4px_4px_0_#000]">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-black font-black text-lg">🌍</span>
                  <h3 className="text-black font-black text-[11px] uppercase tracking-widest">Feed de Atividades</h3>
                </div>
                
                <div className="max-h-64 overflow-y-auto custom-scrollbar">
                  {feed.length > 0 ? (
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[#3d2d26] before:to-transparent">
                      {feed.map((atividade: any, i: number) => (
                        <div key={atividade.id || i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-10 h-10 rounded-none border-4 border-black bg-white shadow-[2px_2px_0_#000] text-black shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            <span className="text-xl leading-none">{atividade.icone || '🌟'}</span>
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-none border-4 border-black bg-white shadow-[4px_4px_0_#000] transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_#000]">
                            <div className="flex items-center justify-between mb-1">
                              <span className={`font-black text-[9px] uppercase px-2 py-0.5 border-2 border-black ${atividade.tipo === 'nova_aula' ? 'bg-[#ffeb3b] text-black' : atividade.tipo === 'novo_trofeu' ? 'bg-[#4ade80] text-black' : 'bg-black text-white'}`}>
                                {atividade.tipo.replace('_', ' ')}
                              </span>
                              <time className="text-[9px] font-bold text-gray-500 uppercase">
                                {new Date(atividade.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                              </time>
                            </div>
                            <p className="text-[10px] font-black text-black leading-snug uppercase">
                              {atividade.mensagem}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] font-black uppercase text-center text-gray-500">Nenhuma atividade recente.</p>
                  )}
                </div>
              </div>

            </div>
          )} {/* end activeTab === home */}

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

      {/* ---------------------------------------------------------------------- */}
      {/* HIDDEN PROFILE CARD FOR HTML2CANVAS */}
      {/* ---------------------------------------------------------------------- */}
      <div className="absolute left-[-9999px] top-[-9999px] pointer-events-none z-[-100]">
        <div 
          ref={profileCardRef} 
          className="w-[400px] h-[600px] bg-black border-[12px] border-[#3d2d26] relative flex flex-col font-['Space_Mono'] overflow-hidden"
        >
          {/* Top Banner */}
          <div className="w-full h-16 bg-[#ff6b00] border-b-8 border-black flex items-center justify-center relative shrink-0">
            <h1 className="text-white font-black text-3xl uppercase tracking-widest drop-shadow-[2px_2px_0_#000]">
              ACORDE CRM
            </h1>
            <div className="absolute bottom-[-16px] bg-black text-[#ffeb3b] px-4 py-1 text-[10px] font-black uppercase tracking-widest border-2 border-[#ffeb3b] shadow-[4px_4px_0_rgba(0,0,0,0.5)] z-30">
              Temporada 1 - Fundação
            </div>
          </div>

          {/* Character Area */}
          <div className="flex-1 w-full relative bg-gray-800">
             {alunoData?.avatar_config && (
                <AvatarPixel config={alunoData.avatar_config} />
             )}
          </div>

          {/* Bottom Info Area */}
          <div className="h-32 bg-[#1a0a05] border-t-8 border-black p-4 flex flex-col justify-center relative shrink-0 z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.8)]">
            <div className="flex justify-between items-end">
               <div className="max-w-[70%]">
                  <h2 className="text-[#ffeb3b] font-black text-4xl tracking-tighter uppercase drop-shadow-[2px_2px_0_#000] truncate">
                    {alunoData?.nome?.split(' ')[0] || 'ALUNO'}
                  </h2>
                  <p className="text-[#8e7164] font-black text-xs uppercase tracking-widest mt-1">
                    {alunoData?.curso_ativo || 'MÚSICA'} TRAINEE
                  </p>
               </div>
               <div className="text-right shrink-0">
                  <p className="text-[#4ade80] font-black text-sm uppercase">NÍVEL {Math.floor((alunoData?.xp || 0) / 100) + 1}</p>
                  <h3 className="text-white font-black text-3xl drop-shadow-[2px_2px_0_#000]">
                    #{alunoData?.ranking || '?'}
                  </h3>
               </div>
            </div>
          </div>

          {/* Trophies Column (Vertical Right Side Overlay) */}
          <div className="absolute top-24 right-4 flex flex-col gap-2 flex-wrap justify-start items-end z-30">
            {alunoData?.conquistas?.slice(0, 6).map((c: any, idx: number) => {
              // Find the conquest in todasConquistas to get the class/instrument if needed
              const conquistaCompleta = todasConquistas.find((tc: any) => Number(tc.id) === Number(c.id) || Number(tc.id) === Number(c.conquista_id));
              
              const iconeToUse = c.icone_url || conquistaCompleta?.icone_url || resolveTrophyImage(conquistaCompleta?.instrumento, conquistaCompleta?.classe);
              
              return (
                <div key={idx} className="w-12 h-12 bg-black/90 border-2 border-[#ffeb3b] flex items-center justify-center p-1.5 shadow-[4px_4px_0_#000]">
                  {iconeToUse ? (
                     <img src={iconeToUse} alt="Trophy" className="w-full h-full object-contain" />
                  ) : (
                     <span className="text-xl">{conquistaCompleta?.icone || '🏆'}</span>
                  )}
                </div>
              );
            })}
            {(alunoData?.conquistas?.length > 6) && (
              <div className="w-12 h-12 bg-black/90 border-2 border-[#ffeb3b] flex items-center justify-center shadow-[4px_4px_0_#000]">
                <span className="text-white font-black text-xs text-center leading-none">+{alunoData.conquistas.length - 6}</span>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* BOTTOM NAV — Mobile Flutuante 8-Bit */}
        <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center md:hidden">
          <nav className="bg-[#261812] border-8 border-black flex items-center justify-around px-2 py-1 shadow-[8px_8px_0_#000] w-full max-w-[450px]">
            {[
              { icon: Home, label: 'INÍCIO', tab: 'home' as const },
              { icon: Flame, label: 'TREINO', tab: 'treino' as const },
              { icon: Trophy, label: 'RANKING', tab: 'ranking' as const },
              { icon: BookOpen, label: 'AULAS', tab: 'aulas' as const },
              { icon: Gamepad2, label: 'JOGOS', tab: 'jogos' as const },
            ].map((item) => (
              <button 
                key={item.tab} 
                onClick={() => { 
                  setActiveTab(item.tab); 
                  if (item.tab === 'ranking') fetchRanking(); 
                  else if (item.tab === 'treino') fetchTreinos(); 
                }} 
                className={`flex flex-col items-center gap-1 transition-all ${
                  activeTab === item.tab 
                    ? 'translate-y-[-4px] scale-105' 
                    : 'opacity-50 hover:opacity-80 active:scale-95'
                }`}
              >
                <div className={`p-1.5 border-4 border-black shadow-[3px_3px_0_#000] ${
                  activeTab === item.tab 
                    ? 'bg-[#ff6b00] text-white shadow-none translate-x-[1px] translate-y-[1px]' 
                    : 'bg-white text-black'
                }`}>
                  <item.icon className="w-4.5 h-4.5" />
                </div>
                <span className="text-[6.5px] font-black text-white uppercase tracking-tighter">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* BOTTOM NAV — Desktop / Tablet Lateral Fixada */}
        <nav className="hidden md:flex fixed left-4 top-24 bottom-24 w-24 bg-[#261812] border-8 border-black flex-col items-center justify-center gap-6 py-4 shadow-[8px_8px_0_#000] z-50">
          {[
            { icon: Home, label: 'INÍCIO', tab: 'home' as const },
            { icon: Flame, label: 'TREINO', tab: 'treino' as const },
            { icon: Trophy, label: 'RANKING', tab: 'ranking' as const },
            { icon: BookOpen, label: 'AULAS', tab: 'aulas' as const },
            { icon: Gamepad2, label: 'JOGOS', tab: 'jogos' as const },
          ].map((item) => (
            <button 
              key={item.tab} 
              onClick={() => { 
                setActiveTab(item.tab); 
                if (item.tab === 'ranking') fetchRanking(); 
                else if (item.tab === 'treino') fetchTreinos(); 
              }} 
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === item.tab 
                  ? 'scale-105' 
                  : 'opacity-50 hover:opacity-80 active:scale-95'
              }`}
            >
              <div className={`p-2 border-4 border-black shadow-[4px_4px_0_#000] ${
                activeTab === item.tab 
                  ? 'bg-[#ff6b00] text-white shadow-none translate-x-[1.5px] translate-y-[1.5px]' 
                  : 'bg-white text-black'
              }`}>
                <item.icon className="w-5 h-5" />
              </div>
              <span className="text-[6.5px] font-black text-white uppercase tracking-tighter">{item.label}</span>
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

      {/* ================= MODAL ASSISTIR VIDEOAULA EAD ================= */}
      {selectedTrilhaAula && !showQuestionarioModal && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex items-center justify-center p-2 sm:p-4 overflow-y-auto font-['Space_Mono']">
          <div className="bg-[#fff8f6] border-4 sm:border-8 border-black p-3 sm:p-6 w-full max-w-4xl relative shadow-[6px_6px_0_#000] sm:shadow-[12px_12px_0_#000] space-y-4">
            <div className="flex justify-between items-center border-b-4 border-black pb-3">
              <div>
                <span className="bg-[#ff6b00] text-white font-black text-[9px] px-2 py-0.5 border border-black uppercase">
                  Assistindo Aula
                </span>
                <h3 className="font-black text-xs sm:text-sm uppercase text-black mt-1">
                  🎥 {selectedTrilhaAula.titulo}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTrilhaAula(null)}
                className="bg-black text-[#feccba] border-2 border-black font-black text-xs px-2 py-1 shadow-[4px_4px_0_#000] hover:bg-red-500 hover:text-white transition-all active:translate-y-0.5"
              >
                X
              </button>
            </div>

            {/* Player do YouTube em proporção otimizada */}
            <YoutubePlayer 
              videoUrl={selectedTrilhaAula.youtube_url} 
              onVideoComplete={() => {
                setVideoCompleto(true);
                toast.success('🎉 Aula assistida! Questionário desbloqueado!');
              }} 
            />

            {/* Rodapé e Ações do Vídeo */}
            <div className="pt-2 flex flex-col items-center gap-3">
              {videoCompleto ? (
                <button
                  onClick={() => setShowQuestionarioModal(true)}
                  className="w-full bg-[#ff6b00] text-white border-4 border-black py-3 font-black text-xs sm:text-sm uppercase shadow-[4px_4px_0_#000] hover:translate-y-0.5 active:translate-y-1 transition-all flex items-center justify-center gap-2"
                >
                  📝 INICIAR QUESTIONÁRIO DA AULA
                </button>
              ) : (
                <div className="w-full bg-stone-200 border-4 border-black p-3 text-center flex flex-col items-center justify-center gap-1 opacity-80">
                  <p className="text-[10px] font-black text-stone-500 uppercase">🍿 ASSISTA AO VÍDEO COMPLETO PARA LIBERAR O QUESTIONÁRIO</p>
                  <p className="text-[8px] font-black text-stone-400 uppercase">Não é permitido pular partes do vídeo para garantir o seu aprendizado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL QUESTIONÁRIO / PROVA GERAL ================= */}
      {(showQuestionarioModal || selectedTrilhaModulo) && (() => {
        const isProva = !!selectedTrilhaModulo;
        const questions = isProva 
          ? selectedTrilhaModulo.prova_final 
          : (selectedTrilhaAula?.questionario || []);
        
        const currentQ = questions[currentQuestionIdx];
        const conqId = isProva ? selectedTrilhaModulo.conquista_id : selectedTrilhaAula?.conquista_id;
        const correspondenteConquista = conquistas.find((c: any) => Number(c.id) === Number(conqId));

        return (
          <div className="fixed inset-0 bg-black/95 z-[250] flex items-center justify-center p-4 overflow-y-auto font-['Space_Mono']">
            <div className="bg-[#fff8f6] border-8 border-black p-6 w-full max-w-lg relative shadow-[12px_12px_0_#000] space-y-4">
              <div className="flex justify-between items-center border-b-4 border-black pb-3">
                <div>
                  <span className={`text-white font-black text-[9px] px-2 py-0.5 border border-black uppercase ${isProva ? 'bg-black' : 'bg-[#ff6b00]'}`}>
                    {isProva ? '👑 Prova Geral do Módulo' : '📝 Questionário de Aula'}
                  </span>
                  <h3 className="font-black text-xs uppercase text-black mt-1">
                    {isProva ? selectedTrilhaModulo.nome : selectedTrilhaAula?.titulo}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setShowQuestionarioModal(false);
                    setSelectedTrilhaModulo(null);
                  }}
                  className="bg-black text-[#feccba] border-2 border-black font-black text-xs px-2 py-1 shadow-[4px_4px_0_#000] hover:bg-red-500 hover:text-white transition-all active:translate-y-0.5"
                >
                  X
                </button>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs font-black uppercase text-stone-500">Nenhuma pergunta cadastrada.</p>
                </div>
              ) : !questionarioFinalizado ? (
                <div className="space-y-4">
                  {/* Pergunta Atual */}
                  <div className="bg-white border-4 border-black p-4 space-y-2">
                    <span className="bg-black text-white font-black text-[8px] px-1.5 py-0.5">PERGUNTA {currentQuestionIdx + 1} de {questions.length}</span>
                    <h4 className="font-black text-xs uppercase leading-relaxed text-black mt-1">{currentQ?.pergunta}</h4>
                  </div>

                  {/* Alternativas */}
                  <div className="space-y-2">
                    {currentQ?.opcoes.map((opt: string, optIdx: number) => {
                      const isSelected = questionarioRespostas[currentQuestionIdx] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          onClick={() => setQuestionarioRespostas(prev => ({ ...prev, [currentQuestionIdx]: optIdx }))}
                          className={`w-full text-left p-3 border-4 border-black transition-all font-black text-xs uppercase flex items-center justify-between ${
                            isSelected 
                              ? 'bg-[#ff6b00] text-white shadow-none translate-x-[2px] translate-y-[2px]' 
                              : 'bg-white text-black hover:bg-stone-50 shadow-[3px_3px_0_#000]'
                          }`}
                        >
                          <span>{String.fromCharCode(65 + optIdx)}) {opt}</span>
                          {isSelected && <span>✔️</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Navegação entre questões */}
                  <div className="flex justify-between items-center pt-4 border-t-2 border-stone-200">
                    <button
                      type="button"
                      disabled={currentQuestionIdx === 0}
                      onClick={() => setCurrentQuestionIdx(prev => prev - 1)}
                      className={`border-2 border-black px-3 py-1 text-[10px] font-black uppercase transition-all ${currentQuestionIdx === 0 ? 'opacity-30 cursor-not-allowed' : 'bg-white hover:bg-stone-50 active:translate-y-0.5'}`}
                    >
                      ⬅️ ANTERIOR
                    </button>

                    {currentQuestionIdx < questions.length - 1 ? (
                      <button
                        type="button"
                        disabled={questionarioRespostas[currentQuestionIdx] === undefined}
                        onClick={() => setCurrentQuestionIdx(prev => prev + 1)}
                        className={`border-2 border-black px-3 py-1 text-[10px] font-black uppercase transition-all ${questionarioRespostas[currentQuestionIdx] === undefined ? 'opacity-30 cursor-not-allowed' : 'bg-black text-white hover:bg-stone-900 active:translate-y-0.5'}`}
                      >
                        PRÓXIMA ➡️
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={questionarioRespostas[currentQuestionIdx] === undefined}
                        onClick={() => handleSubmitQuestionario(isProva ? 'modulo' : 'aula')}
                        className={`border-2 border-black px-4 py-1.5 text-[10px] font-black uppercase transition-all bg-emerald-500 text-white shadow-[2px_2px_0_#000] active:translate-y-0.5 ${questionarioRespostas[currentQuestionIdx] === undefined ? 'opacity-30 cursor-not-allowed' : 'hover:bg-emerald-600'}`}
                      >
                        ENVIAR PROVA 🚀
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Resultado da tentativa */
                <div className="text-center p-4 bg-white border-4 border-black space-y-4">
                  {questionarioCorreto ? (
                    <div className="space-y-3">
                      <span className="text-4xl block animate-bounce">🏆</span>
                      <h4 className="font-black text-lg text-emerald-600 uppercase">PARABÉNS! VOCÊ PASSOU!</h4>
                      <p className="text-xs font-black text-stone-500 uppercase">Sua nota: <span className="text-black text-sm">{tentativaResultado?.nota}%</span> ({tentativaResultado?.acertos}/{tentativaResultado?.totalPerguntas} acertos)</p>
                      
                      {tentativaResultado?.conquistouMedalha && correspondenteConquista && (
                        <div className="border-4 border-[#ff6b00] p-4 bg-[#fff8f6] max-w-xs mx-auto space-y-2">
                          <span className="text-[8px] font-black uppercase tracking-wider text-[#ff6b00] block">🏆 NOVO TROFÉU CONQUISTADO!</span>
                          <div className="w-16 h-16 mx-auto">
                            {correspondenteConquista.icone_url || resolveTrophyImage(correspondenteConquista.instrumento, correspondenteConquista.classe) ? (
                              <img src={correspondenteConquista.icone_url || resolveTrophyImage(correspondenteConquista.instrumento, correspondenteConquista.classe)} alt="Medalha" className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-3xl">🏅</span>
                            )}
                          </div>
                          <h5 className="font-black text-[10px] uppercase text-black">{correspondenteConquista.nome}</h5>
                          <p className="text-[7.5px] font-bold uppercase text-stone-400 leading-tight">{correspondenteConquista.descricao}</p>
                        </div>
                      )}
                      
                      <div className="bg-emerald-50 border border-emerald-300 p-2 text-[9px] font-black text-emerald-700 uppercase">
                        🎁 +{tentativaResultado?.xpGanhos} XP &amp; +{tentativaResultado?.moedasGanhas} ACORDE COINS CREDITADOS!
                      </div>

                      <button
                        onClick={() => {
                          setShowQuestionarioModal(false);
                          setSelectedTrilhaModulo(null);
                          setSelectedTrilhaAula(null);
                        }}
                        className="w-full bg-black text-white border-2 border-black py-2.5 font-black text-xs uppercase shadow-[3px_3px_0_#ff6b00]"
                      >
                        CONCLUIR E CONTINUAR
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <span className="text-4xl block">😢</span>
                      <h4 className="font-black text-lg text-red-500 uppercase">NÃO FOI DESTA VEZ...</h4>
                      <p className="text-xs font-black text-stone-500 uppercase">Sua nota: <span className="text-black text-sm">{tentativaResultado?.nota}%</span> ({tentativaResultado?.acertos}/{tentativaResultado?.totalPerguntas} acertos)</p>
                      <p className="text-[9px] font-black text-stone-400 uppercase">É necessário acertar no mínimo 80% das questões para avançar.</p>

                      <button
                        onClick={() => {
                          setQuestionarioFinalizado(false);
                          setQuestionarioCorreto(null);
                          setQuestionarioRespostas({});
                          setCurrentQuestionIdx(0);
                          setTentativaResultado(null);
                        }}
                        className="w-full bg-red-500 text-white border-2 border-black py-2.5 font-black text-xs uppercase shadow-[3px_3px_0_#000] hover:bg-red-600 transition-colors"
                      >
                        TENTAR NOVAMENTE
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ================= COMPONENTE PLAYER DE VÍDEO DO YOUTUBE =================
function YoutubePlayer({ videoUrl, onVideoComplete }: { videoUrl: string, onVideoComplete: () => void }) {
  const playerRef = React.useRef<HTMLDivElement>(null);
  const [completed, setCompleted] = React.useState(false);
  const playerInstance = React.useRef<any>(null);
  const lastTime = React.useRef(0);

  const getVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getVideoId(videoUrl);

  React.useEffect(() => {
    if (!videoId) return;

    let interval: any;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) return;
      
      playerInstance.current = new window.YT.Player(playerRef.current, {
        videoId: videoId,
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          disablekb: 1
        },
        events: {
          onStateChange: (event: any) => {
            // Tocando (Playing = 1)
            if (event.data === 1) {
              interval = setInterval(() => {
                if (playerInstance.current && playerInstance.current.getCurrentTime) {
                  const currentTime = playerInstance.current.getCurrentTime();
                  const duration = playerInstance.current.getDuration();
                  
                  // Trava de Avanço Rápido: se pulou mais de 3 segundos
                  if (currentTime > lastTime.current + 3) {
                    playerInstance.current.seekTo(lastTime.current, true);
                    toast.warning("Assista ao conteúdo sem pular partes! 🍿");
                  } else {
                    lastTime.current = currentTime;
                  }

                  // Habilita com 90% assistido
                  if (duration > 0 && currentTime >= duration * 0.9 && !completed) {
                    setCompleted(true);
                    onVideoComplete();
                  }
                }
              }, 1000);
            } else {
              clearInterval(interval);
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // Carrega o script globalmente
      if (!document.getElementById('youtube-iframe-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api-script';
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }
      
      const prevOnReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevOnReady) prevOnReady();
        initPlayer();
      };
    }

    return () => {
      clearInterval(interval);
      if (playerInstance.current && playerInstance.current.destroy) {
        playerInstance.current.destroy();
      }
    };
  }, [videoId]);

  if (!videoId) {
    return <div className="text-center p-4 text-xs font-bold text-red-500 bg-red-100 border border-red-300">Link do YouTube inválido.</div>;
  }

  return (
    <div className="w-full aspect-video border-4 border-black bg-black">
      <div ref={playerRef} className="w-full h-full"></div>
    </div>
  );
}

// Helper para gerar o caminho curvo da trilha Candy Crush
function generateSvgPath(numAulas: number) {
  if (numAulas === 0) return '';
  let path = 'M 100 40'; 
  for (let i = 0; i < numAulas; i++) {
    const y = 100 + i * 140;
    const modVal = i % 4;
    const targetX = modVal === 0 ? 55 : modVal === 2 ? 145 : 100;
    path += ` C 100 ${y - 70}, ${targetX} ${y - 70}, ${targetX} ${y}`;
  }
  const yFinal = 100 + numAulas * 140;
  path += ` C 100 ${yFinal - 70}, 100 ${yFinal - 70}, 100 ${yFinal}`;
  return path;
}

// Helper para selecionar os ícones 8-bit fiéis ao Stitch com base no título
function obterIconeStitch(titulo: string) {
  const t = (titulo || '').toLowerCase();
  if (t.includes('piano') || t.includes('teclado') || t.includes('sintetizador') || t.includes('notas')) return 'piano';
  if (t.includes('ritmo') || t.includes('bateria') || t.includes('tempo') || t.includes('síntese') || t.includes('som')) return 'graphic_eq';
  if (t.includes('violão') || t.includes('guitarra') || t.includes('baixo') || t.includes('acorde')) return 'music_note';
  if (t.includes('teoria') || t.includes('partitura') || t.includes('leitura') || t.includes('escrever')) return 'menu_book';
  return 'music_note';
}

