import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Play, Square, Activity, X, Info, Settings, ShieldAlert, Award } from 'lucide-react';

interface MusiclassToolsProps {
  onClose?: () => void;
}

export const MusiclassTools: React.FC<MusiclassToolsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'metronome' | 'tuner' | 'stopwatch'>('metronome');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // ==========================================
  // METRÔNOMO
  // ==========================================
  const [bpm, setBpm] = useState<number>(120);
  const [isPlayingMetronome, setIsPlayingMetronome] = useState<boolean>(false);
  const [timeSignature, setTimeSignature] = useState<number>(4); // 4/4 por padrão
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [ledFlash, setLedFlash] = useState<boolean>(false);

  // Customização Metrônomo
  const [metronomeTimer, setMetronomeTimer] = useState<number>(0); // segundos restantes
  const [metronomeTimerLimit, setMetronomeTimerLimit] = useState<number>(0); // limite total escolhido
  const [metronomeAngle, setMetronomeAngle] = useState<number>(0);
  const metronomeTimerIntervalId = useRef<number | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const schedulerTimerRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef<number>(0.0);
  const beatRef = useRef<number>(0);

  const lookahead = 25.0; // Milissegundos entre as verificações do scheduler
  const scheduleAheadTime = 0.1; // Quão longe agendar o som (segundos)

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const playClick = (time: number, beat: number) => {
    if (!audioContextRef.current) return;
    const osc = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    osc.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    osc.type = 'sine';
    const isFirstBeat = beat === 0;
    osc.frequency.setValueAtTime(isFirstBeat ? 1600 : 1000, time); // Cliques mais encorpados e definidos
    
    gainNode.gain.setValueAtTime(1.5, time); // Volume aumentado para maior visibilidade
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);

    osc.start(time);
    osc.stop(time + 0.04);

    // Dispara animação síncrona com o tempo do som
    const delay = Math.max(0, (time - audioContextRef.current.currentTime) * 1000);
    setTimeout(() => {
      setLedFlash(true);
      setCurrentBeat(beat);
      setMetronomeAngle(beat % 2 === 0 ? 28 : -28); // Alterna o ângulo do pêndulo
      setTimeout(() => setLedFlash(false), 80);
    }, delay);
  };

  const scheduler = () => {
    if (!audioContextRef.current) return;
    while (nextNoteTimeRef.current < audioContextRef.current.currentTime + scheduleAheadTime) {
      playClick(nextNoteTimeRef.current, beatRef.current);
      
      const secondsPerBeat = 60.0 / bpm;
      nextNoteTimeRef.current += secondsPerBeat;
      
      beatRef.current = (beatRef.current + 1) % timeSignature;
    }
  };

  const startMetronome = () => {
    initAudioContext();
    if (isPlayingMetronome) {
      if (schedulerTimerRef.current) {
        window.clearInterval(schedulerTimerRef.current);
      }
      setIsPlayingMetronome(false);
      setCurrentBeat(0);
      setMetronomeAngle(0);
    } else {
      setIsPlayingMetronome(true);
      beatRef.current = 0;
      if (audioContextRef.current) {
        nextNoteTimeRef.current = audioContextRef.current.currentTime + 0.05;
      }
      schedulerTimerRef.current = window.setInterval(scheduler, lookahead);
    }
  };

  const playEndChime = () => {
    initAudioContext();
    if (!audioContextRef.current) return;
    const now = audioContextRef.current.currentTime;
    
    // Toca 3 bips agudos de aviso ao fim do timer
    for (let i = 0; i < 3; i++) {
      const osc = audioContextRef.current.createOscillator();
      const gain = audioContextRef.current.createGain();
      osc.connect(gain);
      gain.connect(audioContextRef.current.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, now + i * 0.15);
      gain.gain.setValueAtTime(1.0, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.15 + 0.1);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.12);
    }
  };

  // Efeito para monitorar o timer do metrônomo
  useEffect(() => {
    if (isPlayingMetronome && metronomeTimerLimit > 0) {
      setMetronomeTimer(metronomeTimerLimit);
      metronomeTimerIntervalId.current = window.setInterval(() => {
        setMetronomeTimer(prev => {
          if (prev <= 1) {
            setIsPlayingMetronome(false);
            if (schedulerTimerRef.current) window.clearInterval(schedulerTimerRef.current);
            if (metronomeTimerIntervalId.current) window.clearInterval(metronomeTimerIntervalId.current);
            playEndChime();
            setMetronomeAngle(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (metronomeTimerIntervalId.current) {
        window.clearInterval(metronomeTimerIntervalId.current);
      }
      setMetronomeTimer(0);
    }
    return () => {
      if (metronomeTimerIntervalId.current) window.clearInterval(metronomeTimerIntervalId.current);
    };
  }, [isPlayingMetronome, metronomeTimerLimit]);

  useEffect(() => {
    if (isPlayingMetronome && schedulerTimerRef.current) {
      // Reinicia o scheduler ao mudar o BPM em execução
      window.clearInterval(schedulerTimerRef.current);
      schedulerTimerRef.current = window.setInterval(scheduler, lookahead);
    }
  }, [bpm, timeSignature]);

  useEffect(() => {
    return () => {
      if (schedulerTimerRef.current) window.clearInterval(schedulerTimerRef.current);
      if (metronomeTimerIntervalId.current) window.clearInterval(metronomeTimerIntervalId.current);
    };
  }, []);

  // ==========================================
  // AFINADOR
  // ==========================================
  const [tunerMode, setTunerMode] = useState<'ear' | 'mic'>('ear');
  const [activeReferenceNote, setActiveReferenceNote] = useState<string | null>(null);
  const [micActive, setMicActive] = useState<boolean>(false);
  const [detectedNote, setDetectedNote] = useState<string>('--');
  const [detectedFrequency, setDetectedFrequency] = useState<number>(0);
  const [centsDeviation, setCentsDeviation] = useState<number>(0);
  const [tunerStatusMessage, setTunerStatusMessage] = useState<string>('🎙️ PRONTO PARA CAPTAR');

  const referenceOscillatorRef = useRef<OscillatorNode | null>(null);
  const referenceGainNodeRef = useRef<GainNode | null>(null);

  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const micAnimationTimerRef = useRef<number | null>(null);

  const guitarStrings = [
    { note: 'E2', name: '6ª E (Mi)', freq: 82.41 },
    { note: 'A2', name: '5ª A (Lá)', freq: 110.00 },
    { note: 'D3', name: '4ª D (Ré)', freq: 146.83 },
    { note: 'G3', name: '5ª G (Sol)', freq: 196.00 },
    { note: 'B3', name: '2ª B (Si)', freq: 246.94 },
    { note: 'E4', name: '1ª e (Mi)', freq: 329.63 },
  ];

  const bassStrings = [
    { note: 'E1', name: '4ª E (Mi)', freq: 41.20 },
    { note: 'A1', name: '3ª A (Lá)', freq: 55.00 },
    { note: 'D2', name: '2ª D (Ré)', freq: 73.42 },
    { note: 'G2', name: '1ª G (Sol)', freq: 98.00 },
  ];

  const stopReferenceTone = () => {
    if (referenceOscillatorRef.current) {
      try {
        referenceOscillatorRef.current.stop();
      } catch (e) {}
      referenceOscillatorRef.current.disconnect();
      referenceOscillatorRef.current = null;
    }
    setActiveReferenceNote(null);
  };

  const playReferenceTone = (note: string, frequency: number) => {
    initAudioContext();
    stopReferenceTone();

    if (activeReferenceNote === note) {
      return;
    }

    if (!audioContextRef.current) return;

    const osc = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
    
    gainNode.gain.setValueAtTime(0.001, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.2, audioContextRef.current.currentTime + 0.05);

    osc.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    osc.start();
    
    referenceOscillatorRef.current = osc;
    referenceGainNodeRef.current = gainNode;
    setActiveReferenceNote(note);
  };

  // Autocorrelação para detector de pitch
  const autoCorrelate = (buffer: Float32Array, sampleRate: number): number => {
    const SIZE = buffer.length;
    
    let sum = 0;
    for (let i = 0; i < SIZE; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / SIZE);
    if (rms < 0.0008) return -1; // Sensibilidade aumentada para captação de voz e agudos sutis
    
    // De 40Hz a 2200Hz
    const maxPeriod = Math.round(sampleRate / 40);
    const minPeriod = Math.round(sampleRate / 2200);
    
    let bestPeriod = -1;
    let bestCorrelation = -1;
    
    for (let period = minPeriod; period <= maxPeriod; period++) {
      let correlation = 0;
      for (let i = 0; i < SIZE - period; i++) {
        correlation += buffer[i] * buffer[i + period];
      }
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestPeriod = period;
      }
    }
    
    if (bestPeriod !== -1 && bestCorrelation > 0.3 * sum) {
      const p = bestPeriod;
      let s0 = 0, s1 = 0, s2 = 0;
      for (let i = 0; i < SIZE - p; i++) {
        s0 += buffer[i] * buffer[i + (p - 1)];
        s1 += buffer[i] * buffer[i + p];
        s2 += buffer[i] * buffer[i + (p + 1)];
      }
      
      const denom = s0 + s2 - 2 * s1;
      let finePeriod = p;
      if (denom !== 0) {
        finePeriod = p - (s2 - s0) / (2 * denom);
      }
      
      return sampleRate / finePeriod;
    }
    
    return -1;
  };

  const getNoteFromFrequency = (frequency: number) => {
    const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    const midi = Math.round(noteNum) + 69;
    const cents = Math.round((noteNum - Math.round(noteNum)) * 100);
    
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const name = noteNames[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    
    return {
      note: `${name}${octave}`,
      cents,
      frequency
    };
  };

  const startMicTuner = async () => {
    initAudioContext();
    stopReferenceTone();

    if (micActive) {
      stopMicTuner();
      return;
    }

    try {
      // Uso direto do microfone simples para evitar falhas de getUserMedia no Safari iOS/Android Chrome
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true
      });
      if (!audioContextRef.current) return;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 2048;
      
      source.connect(analyser);
      
      microphoneStreamRef.current = stream;
      micAnalyserRef.current = analyser;
      setMicActive(true);
      setTunerStatusMessage('🎙️ CAPTANDO ÁUDIO...');

      const buffer = new Float32Array(analyser.fftSize);
      
      const updatePitch = () => {
        if (!micAnalyserRef.current) return;
        micAnalyserRef.current.getFloatTimeDomainData(buffer);
        
        const freq = autoCorrelate(buffer, audioContextRef.current!.sampleRate);
        
        if (freq !== -1 && freq >= 40 && freq <= 2200) {
          const result = getNoteFromFrequency(freq);
          setDetectedNote(result.note);
          setDetectedFrequency(Math.round(freq * 10) / 10);
          setCentsDeviation(result.cents);
          
          if (Math.abs(result.cents) <= 4) {
            setTunerStatusMessage('❇️ AFINADO!');
          } else if (result.cents < 0) {
            setTunerStatusMessage('⬇️ BAIXO (BEMOL)');
          } else {
            setTunerStatusMessage('⬆️ ALTO (SUSTENIDO)');
          }
        }
        
        micAnimationTimerRef.current = requestAnimationFrame(updatePitch);
      };

      updatePitch();

    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      setTunerStatusMessage('❌ PERMISSÃO DE MICROFONE NEGADA');
      setMicActive(false);
    }
  };

  const stopMicTuner = () => {
    if (micAnimationTimerRef.current) {
      cancelAnimationFrame(micAnimationTimerRef.current);
      micAnimationTimerRef.current = null;
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }
    micAnalyserRef.current = null;
    setMicActive(false);
    setDetectedNote('--');
    setDetectedFrequency(0);
    setCentsDeviation(0);
    setTunerStatusMessage('🎙️ PRONTO PARA CAPTAR');
  };

  useEffect(() => {
    return () => {
      stopReferenceTone();
      stopMicTuner();
    };
  }, []);

  // ==========================================
  // CRONÔMETRO
  // ==========================================
  // Estados do Cronômetro / Timer
  const [stopwatchMode, setStopwatchMode] = useState<'stopwatch' | 'timer'>('stopwatch');
  const [stopwatchTime, setStopwatchTime] = useState<number>(0);
  const [timerLimit, setTimerLimit] = useState<number>(60); // 60 segundos por padrão
  const [isStopwatchRunning, setIsStopwatchRunning] = useState<boolean>(false);
  const [preparatoryTimer, setPreparatoryTimer] = useState<number>(-1); // -1 = inativo
  const stopwatchTimerRef = useRef<number | null>(null);
  const prepTimerIntervalId = useRef<number | null>(null);

  const startStopwatch = () => {
    initAudioContext();
    if (isStopwatchRunning) {
      stopAllTimers();
    } else {
      if (stopwatchMode === 'timer') {
        startPreparatoryCountdown();
      } else {
        startRealTimeCounter();
      }
    }
  };

  const startPreparatoryCountdown = () => {
    setIsStopwatchRunning(true);
    setPreparatoryTimer(5);
    playPrepBip(1000); // Bip inicial

    prepTimerIntervalId.current = window.setInterval(() => {
      setPreparatoryTimer(prev => {
        if (prev <= 1) {
          if (prepTimerIntervalId.current) window.clearInterval(prepTimerIntervalId.current);
          setPreparatoryTimer(-1);
          playPrepBip(1600); // Bip agudo de início
          setStopwatchTime(timerLimit * 1000);
          startRealTimeCounter();
          return -1;
        }
        playPrepBip(1000);
        return prev - 1;
      });
    }, 1000);
  };

  const playPrepBip = (freq: number) => {
    initAudioContext();
    if (!audioContextRef.current) return;
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    osc.connect(gain);
    gain.connect(audioContextRef.current.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioContextRef.current.currentTime);
    gain.gain.setValueAtTime(0.6, audioContextRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContextRef.current.currentTime + 0.12);
    osc.start();
    osc.stop(audioContextRef.current.currentTime + 0.15);
  };

  const startRealTimeCounter = () => {
    setIsStopwatchRunning(true);
    if (stopwatchMode === 'stopwatch') {
      const startTime = Date.now() - stopwatchTime;
      stopwatchTimerRef.current = window.setInterval(() => {
        setStopwatchTime(Date.now() - startTime);
      }, 10);
    } else {
      const endTime = Date.now() + (stopwatchTime > 0 ? stopwatchTime : timerLimit * 1000);
      stopwatchTimerRef.current = window.setInterval(() => {
        const remaining = endTime - Date.now();
        if (remaining <= 0) {
          setStopwatchTime(0);
          stopAllTimers();
          playEndChime();
        } else {
          setStopwatchTime(remaining);
        }
      }, 10);
    }
  };

  const stopAllTimers = () => {
    if (stopwatchTimerRef.current) window.clearInterval(stopwatchTimerRef.current);
    if (prepTimerIntervalId.current) window.clearInterval(prepTimerIntervalId.current);
    setIsStopwatchRunning(false);
    setPreparatoryTimer(-1);
  };

  const resetStopwatch = () => {
    stopAllTimers();
    setStopwatchTime(stopwatchMode === 'stopwatch' ? 0 : timerLimit * 1000);
  };

  const formatStopwatch = (timeMs: number) => {
    const min = Math.floor(timeMs / 60000);
    const sec = Math.floor((timeMs % 60000) / 1000);
    const cent = Math.floor((timeMs % 1000) / 10);
    
    const displayMin = min.toString().padStart(2, '0');
    const displaySec = sec.toString().padStart(2, '0');
    const displayCent = cent.toString().padStart(2, '0');
    
    if (stopwatchMode === 'timer') {
      return `${displayMin}:${displaySec}`;
    }
    return `${displayMin}:${displaySec}:${displayCent}`;
  };

  useEffect(() => {
    if (stopwatchMode === 'timer' && !isStopwatchRunning) {
      setStopwatchTime(timerLimit * 1000);
    }
  }, [timerLimit, stopwatchMode]);

  useEffect(() => {
    return () => {
      if (stopwatchTimerRef.current) window.clearInterval(stopwatchTimerRef.current);
      if (prepTimerIntervalId.current) window.clearInterval(prepTimerIntervalId.current);
    };
  }, []);

  const handleTabChange = (tab: 'metronome' | 'tuner' | 'stopwatch') => {
    stopReferenceTone();
    stopMicTuner();
    stopAllTimers();
    setActiveTab(tab);
  };

  return (
    <div className="flex flex-col bg-[#fff8f6] border-4 border-black shadow-[6px_6px_0_#000] w-full max-w-[500px] md:max-w-[560px] mx-auto font-mono text-black overflow-hidden relative z-50 animate-in fade-in zoom-in-95 duration-200">
      
      {/* Cabeçalho do Console Retrô */}
      <div className="bg-[#261812] py-2 px-3 flex justify-between items-center border-b-4 border-black">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ff6b00] animate-pulse border border-black shadow-inner"></span>
          <span className="text-[10px] font-black text-white/50 tracking-wider font-sans">MUSICLASS CONSOLE V1.0</span>
        </div>
        <button 
          onClick={onClose}
          className="text-white hover:text-[#ff6b00] border-2 border-transparent hover:border-[#ff6b00]/30 p-0.5 transition-all active:scale-95"
          title="Fechar"
        >
          <X size={16} strokeWidth={3} />
        </button>
      </div>

      {/* Abas Superiores 8-Bit */}
      <div className="grid grid-cols-3 border-b-4 border-black bg-[#feccba]/10">
        <button
          onClick={() => handleTabChange('metronome')}
          className={`py-2 text-[9px] font-black tracking-tighter uppercase transition-all ${
            activeTab === 'metronome'
              ? 'bg-[#ff6b00] text-white border-r-2 border-black'
              : 'text-black/70 hover:bg-[#feccba]/20 border-r-2 border-black active:translate-y-[1px]'
          }`}
        >
          🥁 Metrônomo
        </button>
        <button
          onClick={() => handleTabChange('tuner')}
          className={`py-2 text-[9px] font-black tracking-tighter uppercase transition-all ${
            activeTab === 'tuner'
              ? 'bg-[#ff6b00] text-white border-r-2 border-black'
              : 'text-black/70 hover:bg-[#feccba]/20 border-r-2 border-black active:translate-y-[1px]'
          }`}
        >
          🎸 Afinador
        </button>
        <button
          onClick={() => handleTabChange('stopwatch')}
          className={`py-2 text-[9px] font-black tracking-tighter uppercase transition-all ${
            activeTab === 'stopwatch'
              ? 'bg-[#ff6b00] text-white'
              : 'text-black/70 hover:bg-[#feccba]/20 active:translate-y-[1px]'
          }`}
        >
          ⏱️ Cronômetro
        </button>
      </div>

      {/* Conteúdo Central */}
      <div className="p-4 bg-[#fff8f6] flex flex-col justify-center min-h-[220px]">
        
        {/* VIEW: METRÔNOMO */}
        {activeTab === 'metronome' && (
          <div className="flex flex-col gap-4">
            
            {/* Visual BPM Display */}
            <div className="bg-[#1a0a05] border-4 border-black p-3 flex justify-between items-center shadow-inner">
              <div className="flex flex-col items-start select-none">
                <span className="text-[7.5px] font-bold text-[#ff6b00]/70 tracking-widest uppercase mb-0.5">TEMPO (BPM)</span>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-3xl font-black text-[#ff6b00] tracking-tight">{bpm}</span>
                  <span className="text-[8px] font-black text-white/50">BPM</span>
                </div>
              </div>

              {/* Botão de Tela Cheia */}
              <button
                onClick={() => setIsFullScreen(true)}
                className="bg-black/40 hover:bg-black/60 border-2 border-black/40 hover:border-black text-[7.5px] font-black text-[#ff6b00] uppercase tracking-widest py-1.5 px-3 shadow-[2px_2px_0_rgba(0,0,0,0.5)] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1"
              >
                💻 MODO FOCO (TELA CHEIA)
              </button>
            </div>

            {/* Novo Metrônomo Físico (Pêndulo Oscilante Retrô) */}
            <div className="relative w-full h-28 bg-[#1a0a05] border-4 border-black flex justify-center overflow-hidden shadow-inner p-2">
              <span className="absolute top-1 text-[7px] font-black text-white/20 uppercase tracking-widest">VISOR DE FREQUÊNCIA</span>
              
              {/* Pêndulo */}
              <div 
                className="absolute origin-bottom w-1 bg-yellow-500 rounded"
                style={{
                  height: '75px',
                  bottom: '8px',
                  transform: `rotate(${isPlayingMetronome ? metronomeAngle : 0}deg)`,
                  transition: isPlayingMetronome ? `transform ${60 / bpm}s cubic-bezier(0.4, 0, 0.2, 1)` : 'transform 0.3s ease-out',
                }}
              >
                {/* Peso do Pêndulo (Bolinha Vermelha) */}
                <div className="absolute -top-2.5 -left-2 w-5 h-5 bg-red-600 rounded-full border-4 border-black shadow flex items-center justify-center">
                  <span className="text-[6.5px] font-black text-white leading-none">{currentBeat + 1}</span>
                </div>
              </div>

              {/* Centro de Batida LED */}
              <div className="absolute bottom-1.5 flex gap-1 items-center">
                <div className={`w-3.5 h-3.5 rounded-full border-2 border-black transition-all ${ledFlash ? 'bg-red-500 shadow-[0_0_10px_#ef4444]' : 'bg-[#261812]'}`}></div>
              </div>
            </div>

            {/* Opções de Timer Integrado ao Metrônomo */}
            <div className="grid grid-cols-2 gap-2 bg-black/5 p-2 border-2 border-black/10">
              <div className="flex flex-col justify-center">
                <span className="text-[8px] font-black text-black/50 uppercase leading-none mb-1">⏱️ TIMER DO TREINO</span>
                <span className="text-[10px] font-black text-[#ff6b00]">
                  {metronomeTimerLimit > 0 
                    ? metronomeTimer > 0 
                      ? `RESTANTE: ${Math.floor(metronomeTimer / 60)}:${(metronomeTimer % 60).toString().padStart(2, '0')}` 
                      : 'ESGOTADO' 
                    : 'SEM LIMITE'}
                </span>
              </div>
              <select
                value={metronomeTimerLimit}
                onChange={(e) => setMetronomeTimerLimit(Number(e.target.value))}
                className="bg-white border-2 border-black font-black text-[9px] uppercase p-1.5 focus:outline-none"
              >
                <option value={0}>DESATIVADO</option>
                <option value={60}>1 MINUTO</option>
                <option value={120}>2 MINUTOS</option>
                <option value={300}>5 MINUTOS</option>
                <option value={600}>10 MINUTOS</option>
              </select>
            </div>

            {/* Controles de BPM */}
            <div className="flex gap-1.5 justify-center">
              <button
                onClick={() => setBpm(Math.max(40, bpm - 5))}
                className="bg-[#261812] text-white border-2 border-black p-1 px-3 shadow-[2px_2px_0_#000] font-black text-xs hover:bg-[#ff6b00] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                -5
              </button>
              <button
                onClick={() => setBpm(Math.max(40, bpm - 1))}
                className="bg-[#261812] text-white border-2 border-black p-1 px-3 shadow-[2px_2px_0_#000] font-black text-xs hover:bg-[#ff6b00] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                -1
              </button>
              <button
                onClick={() => setBpm(Math.min(240, bpm + 1))}
                className="bg-[#261812] text-white border-2 border-black p-1 px-3 shadow-[2px_2px_0_#000] font-black text-xs hover:bg-[#ff6b00] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                +1
              </button>
              <button
                onClick={() => setBpm(Math.min(240, bpm + 5))}
                className="bg-[#261812] text-white border-2 border-black p-1 px-3 shadow-[2px_2px_0_#000] font-black text-xs hover:bg-[#ff6b00] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                +5
              </button>
            </div>

            {/* Compassos e Start */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <select
                value={timeSignature}
                onChange={(e) => setTimeSignature(Number(e.target.value))}
                className="bg-white border-2 border-black font-black text-[9px] uppercase p-2 focus:outline-none"
              >
                <option value={2}>2/4 Compasso</option>
                <option value={3}>3/4 Compasso</option>
                <option value={4}>4/4 Compasso</option>
                <option value={6}>6/8 Compasso</option>
              </select>

              <button
                onClick={startMetronome}
                className={`border-2 border-black p-2 font-black text-[10px] uppercase shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1.5 ${
                  isPlayingMetronome 
                    ? 'bg-red-500 text-white' 
                    : 'bg-[#ff6b00] text-white hover:bg-[#ff8c3a]'
                }`}
              >
                {isPlayingMetronome ? (
                  <>
                    <Square size={10} fill="white" />
                    Parar
                  </>
                ) : (
                  <>
                    <Play size={10} fill="white" />
                    Iniciar
                  </>
                )}
              </button>
            </div>

          </div>
        )}

        {/* VIEW: AFINADOR */}
        {activeTab === 'tuner' && (
          <div className="flex flex-col gap-3">
            
            {/* Seletor de Modo */}
            <div className="grid grid-cols-2 gap-2 bg-[#261812]/5 p-1 border border-black/15">
              <button
                onClick={() => {
                  stopMicTuner();
                  setTunerMode('ear');
                }}
                className={`py-1 text-[8px] font-black uppercase ${
                  tunerMode === 'ear'
                    ? 'bg-[#261812] text-white'
                    : 'text-black/60 hover:bg-[#261812]/10'
                }`}
              >
                👂 SOPRO / REF
              </button>
              <button
                onClick={() => {
                  stopReferenceTone();
                  setTunerMode('mic');
                }}
                className={`py-1 text-[8px] font-black uppercase ${
                  tunerMode === 'mic'
                    ? 'bg-[#261812] text-white'
                    : 'text-black/60 hover:bg-[#261812]/10'
                }`}
              >
                🎙️ MICROFONE AUTO
              </button>
            </div>

            {/* MODO SOPRO */}
            {tunerMode === 'ear' && (
              <div className="flex flex-col gap-3">
                <span className="text-[8px] text-black/50 font-bold uppercase text-center block leading-tight">
                  CLIQUE EM UMA CORDA PARA OUVIR O TOM PURO:
                </span>
                
                {/* Violão/Guitarra */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[7.5px] font-black text-[#ff6b00] tracking-wide uppercase">🎸 GUITARRA / VIOLÃO:</span>
                  <div className="grid grid-cols-6 gap-1">
                    {guitarStrings.map((item) => (
                      <button
                        key={item.note}
                        onClick={() => playReferenceTone(item.note, item.freq)}
                        className={`border-2 border-black py-2.5 font-mono text-[9px] font-black flex flex-col items-center transition-all ${
                          activeReferenceNote === item.note
                            ? 'bg-[#ff6b00] text-white shadow-none translate-x-[1px] translate-y-[1px]'
                            : 'bg-white hover:bg-stone-50 text-black shadow-[1.5px_1.5px_0_#000]'
                        }`}
                      >
                        <span className="text-[11px] leading-tight">{item.note.replace(/\d/, '')}</span>
                        <span className="text-[5.5px] text-black/40 font-black">{item.note}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Baixo */}
                <div className="flex flex-col gap-1.5 mt-1">
                  <span className="text-[7.5px] font-black text-[#ff6b00] tracking-wide uppercase">🎸 CONTRABAIXO (4C):</span>
                  <div className="grid grid-cols-4 gap-1">
                    {bassStrings.map((item) => (
                      <button
                        key={item.note}
                        onClick={() => playReferenceTone(item.note, item.freq)}
                        className={`border-2 border-black py-2 font-mono text-[9px] font-black flex flex-col items-center transition-all ${
                          activeReferenceNote === item.note
                            ? 'bg-[#ff6b00] text-white shadow-none translate-x-[1px] translate-y-[1px]'
                            : 'bg-white hover:bg-stone-50 text-black shadow-[1.5px_1.5px_0_#000]'
                        }`}
                      >
                        <span className="text-[11px] leading-tight">{item.note.replace(/\d/, '')}</span>
                        <span className="text-[5.5px] text-black/40 font-black">{item.note}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {activeReferenceNote && (
                  <button
                    onClick={stopReferenceTone}
                    className="mt-1.5 bg-red-500 text-white border-2 border-black py-1 px-3 shadow-[2px_2px_0_#000] font-black text-[9px] uppercase hover:bg-red-600 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                  >
                    ⏹️ PARAR TOM
                  </button>
                )}
              </div>
            )}

            {/* MODO MICROFONE (PITCH DETECTOR) */}
            {tunerMode === 'mic' && (
              <div className="flex flex-col gap-3">
                
                {/* Agulha Analógica / Ponteiro 8-Bit */}
                <div className="bg-[#1a0a05] border-4 border-black p-3 flex flex-col items-center shadow-inner relative overflow-hidden">
                  
                  {/* Status Banner */}
                  <span className="text-[7px] font-black tracking-widest text-white/40 uppercase mb-2">MICROFONE DETECTOR</span>
                  
                  {/* Visual Note Indicator */}
                  <div className="flex flex-col items-center mb-2">
                    <span className="text-4xl font-black tracking-tighter text-[#ff6b00]">{detectedNote}</span>
                    {detectedFrequency > 0 && (
                      <span className="text-[8px] font-black text-white/50">{detectedFrequency} Hz</span>
                    )}
                  </div>

                  {/* Meter Scale */}
                  <div className="w-full h-4 bg-black border border-white/10 relative mt-1">
                    {/* Linha Central Tuned */}
                    <div className="absolute left-1/2 -translate-x-1/2 w-1.5 h-full bg-[#00ff66] z-10"></div>
                    
                    {/* Marcadores de desvio */}
                    <div className="absolute left-[25%] w-[1px] h-[50%] bg-white/20 top-1/4"></div>
                    <div className="absolute left-[75%] w-[1px] h-[50%] bg-white/20 top-1/4"></div>
                    
                    {/* Ponteiro / Agulha */}
                    {micActive && detectedFrequency > 0 && (
                      <div 
                        className={`absolute w-2 h-full top-0 border border-black shadow transition-all duration-75 ${
                          Math.abs(centsDeviation) <= 4 ? 'bg-[#00ff66]' : 'bg-red-500'
                        }`}
                        style={{ left: `${Math.min(95, Math.max(2, 50 + centsDeviation))}%` }}
                      ></div>
                    )}
                  </div>
                  
                  {/* Cents display */}
                  {micActive && detectedFrequency > 0 && (
                    <span className="text-[7px] font-black text-white/60 mt-1 uppercase">
                      {centsDeviation === 0 ? 'PERFEITO' : `${centsDeviation > 0 ? '+' : ''}${centsDeviation} CENTS`}
                    </span>
                  )}
                </div>

                {/* Status Message */}
                <div className="text-center">
                  <span className={`text-[8.5px] font-black px-2 py-0.5 border-2 border-black inline-block ${
                    tunerStatusMessage.includes('❌') 
                      ? 'bg-red-100 text-red-700' 
                      : tunerStatusMessage.includes('❇️') 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-[#feccba]/20 text-[#ff6b00]'
                  }`}>
                    {tunerStatusMessage}
                  </span>
                </div>

                {/* Botão Liga/Desliga */}
                <button
                  onClick={startMicTuner}
                  className={`border-2 border-black p-2 font-black text-[10px] uppercase shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1.5 ${
                    micActive 
                      ? 'bg-red-500 text-white' 
                      : 'bg-[#ff6b00] text-white hover:bg-[#ff8c3a]'
                  }`}
                >
                  {micActive ? (
                    <>
                      <Square size={10} fill="white" />
                      Desligar Captador
                    </>
                  ) : (
                    <>
                      <Volume2 size={11} className="animate-pulse" />
                      Ligar Captador
                    </>
                  )}
                </button>
              </div>
            )}

          </div>
        )}

        {/* VIEW: CRONÔMETRO */}
        {activeTab === 'stopwatch' && (
          <div className="flex flex-col gap-4">
            
            {/* Seletor de Modo do Cronômetro / Timer */}
            <div className="grid grid-cols-2 gap-2 bg-[#261812]/5 p-1 border border-black/15">
              <button
                onClick={() => {
                  stopAllTimers();
                  setStopwatchMode('stopwatch');
                  setStopwatchTime(0);
                }}
                className={`py-1 text-[8.5px] font-black uppercase ${
                  stopwatchMode === 'stopwatch'
                    ? 'bg-[#261812] text-white'
                    : 'text-black/60 hover:bg-[#261812]/10'
                }`}
              >
                ⏱️ CRONÔMETRO PROGRESSIVO
              </button>
              <button
                onClick={() => {
                  stopAllTimers();
                  setStopwatchMode('timer');
                  setStopwatchTime(timerLimit * 1000);
                }}
                className={`py-1 text-[8.5px] font-black uppercase ${
                  stopwatchMode === 'timer'
                    ? 'bg-[#261812] text-white'
                    : 'text-black/60 hover:bg-[#261812]/10'
                }`}
              >
                ⏳ TIMER REGRESSIVO
              </button>
            </div>

            {stopwatchMode === 'timer' && !isStopwatchRunning && (
              <div className="grid grid-cols-4 gap-1.5 bg-black/5 p-2 border-2 border-black/10">
                {[60, 120, 300, 600].map(s => (
                  <button
                    key={s}
                    onClick={() => setTimerLimit(s)}
                    className={`py-1 border border-black font-black text-[9.5px] ${timerLimit === s ? 'bg-black text-white' : 'bg-white text-black'}`}
                  >
                    {s / 60} MIN
                  </button>
                ))}
              </div>
            )}
            
            {/* Display de Tempo Retro */}
            {preparatoryTimer > 0 ? (
              <div className="bg-[#1a0a05] border-4 border-black p-4 flex flex-col items-center justify-center min-h-[96px] shadow-inner animate-pulse">
                <span className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">PREPARE-SE E RESPIRE...</span>
                <span className="text-4xl font-black text-white">{preparatoryTimer}</span>
              </div>
            ) : (
              <div className="bg-[#1a0a05] border-4 border-black p-4 flex justify-between items-center shadow-inner relative">
                <div className="flex flex-col items-start select-none">
                  <span className="text-[9px] font-bold text-[#ff6b00]/70 tracking-widest uppercase mb-0.5">
                    {stopwatchMode === 'stopwatch' ? 'CRONÔMETRO DE ESTUDO' : 'CONTAGEM REGRESSIVA'}
                  </span>
                  <div className="font-mono text-3xl font-black text-[#ff6b00] tracking-tight">
                    {formatStopwatch(stopwatchTime)}
                  </div>
                </div>
                {/* Botão de Tela Cheia */}
                <button
                  onClick={() => setIsFullScreen(true)}
                  className="bg-black/40 hover:bg-black/60 border-2 border-black/40 hover:border-black text-[7.5px] font-black text-[#ff6b00] uppercase tracking-widest py-1.5 px-3 shadow-[2px_2px_0_rgba(0,0,0,0.5)] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1"
                >
                  💻 TELA CHEIA
                </button>
              </div>
            )}

            {/* Controles de Play, Pause e Reset */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={startStopwatch}
                className={`border-2 border-black p-2 font-black text-[10px] uppercase shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center gap-1.5 ${
                  isStopwatchRunning 
                    ? 'bg-amber-500 text-black hover:bg-amber-600' 
                    : 'bg-[#ff6b00] text-white hover:bg-[#ff8c3a]'
                }`}
              >
                {isStopwatchRunning ? (
                  <>
                    <Square size={10} fill="black" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play size={10} fill="white" />
                    Iniciar
                  </>
                )}
              </button>

              <button
                onClick={resetStopwatch}
                className="bg-stone-500 text-white border-2 border-black p-2 font-black text-[10px] uppercase shadow-[2px_2px_0_#000] hover:bg-stone-600 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
              >
                🔄 Zerar
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Rodapé Dica de Uso */}
      <div className="bg-[#feccba]/10 p-2.5 border-t-2 border-black flex gap-1.5 items-start">
        <Info size={11} className="text-[#ff6b00] shrink-0 mt-0.5" />
        <p className="text-[7.5px] leading-tight text-black/60 font-sans">
          Use o console retro para guiar seus treinos de ritmo e afinar seus instrumentos rapidamente antes de iniciar sua aula diária.
        </p>
      </div>

      {/* TELA CHEIA / MODO FOCO OVERLAY */}
      {isFullScreen && (
        <div className="fixed inset-0 bg-black z-[250] flex flex-col items-center justify-between p-8 font-mono text-white select-none">
          <div className="w-full flex justify-between items-center border-b-2 border-white/20 pb-4">
            <span className="text-xs font-black text-white/50 tracking-wider">⚡ MODO FOCO ATIVO</span>
            <button
              onClick={() => setIsFullScreen(false)}
              className="border-2 border-white text-white font-black text-xs px-4 py-2 hover:bg-white hover:text-black transition-all"
            >
              ← SAIR DO FOCO
            </button>
          </div>

          <div className="flex-1 w-full flex flex-col items-center justify-center gap-10">
            {activeTab === 'metronome' && (
              <div className="w-full max-w-md flex flex-col items-center gap-8 animate-in fade-in duration-300">
                <div className="text-center">
                  <span className="text-7xl font-black text-[#ff6b00] tracking-tight">{bpm}</span>
                  <span className="text-xl font-bold text-white/60 ml-2">BPM</span>
                </div>

                <div className="relative w-full h-44 bg-white/5 border-4 border-white/20 flex justify-center overflow-hidden p-2 rounded-lg">
                  <div 
                    className="absolute origin-bottom w-1.5 bg-yellow-500 rounded"
                    style={{
                      height: '115px',
                      bottom: '10px',
                      transform: `rotate(${isPlayingMetronome ? metronomeAngle : 0}deg)`,
                      transition: isPlayingMetronome ? `transform ${60 / bpm}s cubic-bezier(0.4, 0, 0.2, 1)` : 'transform 0.3s ease-out',
                    }}
                  >
                    <div className="absolute -top-3 -left-2.5 w-8 h-8 bg-red-600 rounded-full border-4 border-black shadow flex items-center justify-center">
                      <span className="text-[9px] font-black text-white leading-none">{currentBeat + 1}</span>
                    </div>
                  </div>
                </div>

                {metronomeTimerLimit > 0 && (
                  <span className="text-xl font-black text-white/80 uppercase">
                    Tempo Restante: {Math.floor(metronomeTimer / 60)}:{(metronomeTimer % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
            )}

            {activeTab === 'stopwatch' && (
              <div className="w-full flex flex-col items-center gap-6 animate-in fade-in duration-300">
                <span className="text-xl font-black text-white/50 tracking-widest uppercase">
                  {stopwatchMode === 'stopwatch' ? 'TEMPO DE EXERCÍCIO' : 'TEMPO RESTANTE'}
                </span>
                
                {preparatoryTimer > 0 ? (
                  <div className="flex flex-col items-center gap-4 animate-pulse">
                    <span className="text-3xl font-black text-red-500 uppercase tracking-widest">RESPIRE...</span>
                    <span className="text-9xl font-black text-white">{preparatoryTimer}</span>
                  </div>
                ) : (
                  <span className="text-8xl md:text-9xl font-black text-[#ff6b00] tracking-tight">
                    {formatStopwatch(stopwatchTime)}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="w-full text-center text-white/40 text-[9px] uppercase tracking-widest border-t-2 border-white/20 pt-4">
            Studio Acorde • Estude Música com Foco
          </div>
        </div>
      )}

    </div>
  );
};
