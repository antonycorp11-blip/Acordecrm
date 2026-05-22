import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Play, Square, Activity, X, Info, Settings, ShieldAlert, Award } from 'lucide-react';

interface MusiclassToolsProps {
  onClose?: () => void;
}

export const MusiclassTools: React.FC<MusiclassToolsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'metronome' | 'tuner' | 'stopwatch'>('metronome');

  // ==========================================
  // METRÔNOMO
  // ==========================================
  const [bpm, setBpm] = useState<number>(120);
  const [isPlayingMetronome, setIsPlayingMetronome] = useState<boolean>(false);
  const [timeSignature, setTimeSignature] = useState<number>(4); // 4/4 por padrão
  const [currentBeat, setCurrentBeat] = useState<number>(0);
  const [ledFlash, setLedFlash] = useState<boolean>(false);

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
    // Primeiro tempo tem tom extremamente agudo (2200Hz vs 1500Hz para bloco de madeira digital)
    const isFirstBeat = beat === 0;
    osc.frequency.setValueAtTime(isFirstBeat ? 2200 : 1500, time);
    
    gainNode.gain.setValueAtTime(0.8, time);
    // Decaimento ultra rápido (20ms) para criar um estalo "click" limpo e agudo
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);

    osc.start(time);
    osc.stop(time + 0.03);

    // Dispara animação síncrona com o tempo do som
    const delay = Math.max(0, (time - audioContextRef.current.currentTime) * 1000);
    setTimeout(() => {
      setLedFlash(true);
      setCurrentBeat(beat);
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
    } else {
      setIsPlayingMetronome(true);
      beatRef.current = 0;
      if (audioContextRef.current) {
        nextNoteTimeRef.current = audioContextRef.current.currentTime + 0.05;
      }
      schedulerTimerRef.current = window.setInterval(scheduler, lookahead);
    }
  };

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
    if (rms < 0.002) return -1; // Sensibilidade cirúrgica para captação silenciosa
    
    // De 50Hz (período ~ sampleRate/50) a 1000Hz (período ~ sampleRate/1000)
    const maxPeriod = Math.round(sampleRate / 50);
    const minPeriod = Math.round(sampleRate / 1000);
    
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
    
    if (bestPeriod !== -1 && bestCorrelation > 0.35 * sum) {
      // Interpolação quadrática para melhorar precisão
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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
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
        
        if (freq !== -1 && freq >= 40 && freq <= 1500) {
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
  const [stopwatchTime, setStopwatchTime] = useState<number>(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState<boolean>(false);
  const stopwatchTimerRef = useRef<number | null>(null);

  const startStopwatch = () => {
    if (isStopwatchRunning) {
      if (stopwatchTimerRef.current) window.clearInterval(stopwatchTimerRef.current);
      setIsStopwatchRunning(false);
    } else {
      setIsStopwatchRunning(true);
      const startTime = Date.now() - stopwatchTime;
      stopwatchTimerRef.current = window.setInterval(() => {
        setStopwatchTime(Date.now() - startTime);
      }, 10);
    }
  };

  const resetStopwatch = () => {
    if (stopwatchTimerRef.current) window.clearInterval(stopwatchTimerRef.current);
    setIsStopwatchRunning(false);
    setStopwatchTime(0);
  };

  const formatStopwatch = (timeMs: number) => {
    const min = Math.floor(timeMs / 60000);
    const sec = Math.floor((timeMs % 60000) / 1000);
    const cent = Math.floor((timeMs % 1000) / 10);
    
    const displayMin = min.toString().padStart(2, '0');
    const displaySec = sec.toString().padStart(2, '0');
    const displayCent = cent.toString().padStart(2, '0');
    
    return `${displayMin}:${displaySec}:${displayCent}`;
  };

  useEffect(() => {
    return () => {
      if (stopwatchTimerRef.current) window.clearInterval(stopwatchTimerRef.current);
    };
  }, []);

  const handleTabChange = (tab: 'metronome' | 'tuner' | 'stopwatch') => {
    // Para sons ao mudar de aba
    stopReferenceTone();
    stopMicTuner();
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
            <div className="bg-[#1a0a05] border-4 border-black p-3 flex flex-col items-center shadow-inner">
              <span className="text-[9px] font-bold text-[#ff6b00]/70 tracking-widest uppercase mb-1">TEMPO (BPM)</span>
              <div className="flex items-baseline gap-1 select-none">
                <span className="text-4xl font-black text-[#ff6b00] tracking-tight">{bpm}</span>
                <span className="text-[10px] font-black text-white/50">BPM</span>
              </div>
            </div>

            {/* LED Flasher */}
            <div className="flex justify-between items-center bg-black/5 p-2.5 border-2 border-black/10 rounded-none">
              <span className="text-[9px] font-black text-black/50 uppercase">BEAT LED</span>
              <div className="flex gap-2">
                {Array.from({ length: timeSignature }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-6 h-6 border-2 border-black shadow-sm flex items-center justify-center transition-all ${
                      idx === currentBeat && isPlayingMetronome
                        ? idx === 0 
                          ? 'bg-red-500 scale-110 shadow-[0_0_10px_#ef4444]' 
                          : 'bg-[#ff6b00] scale-110 shadow-[0_0_10px_#ff6b00]'
                        : 'bg-[#1a0a05]'
                    }`}
                  >
                    <span className={`text-[8px] font-black leading-none ${idx === currentBeat && isPlayingMetronome ? 'text-white' : 'text-white/20'}`}>
                      {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
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
            
            {/* Display de Tempo Retro */}
            <div className="bg-[#1a0a05] border-4 border-black p-4 flex flex-col items-center shadow-inner">
              <span className="text-[9px] font-bold text-[#ff6b00]/70 tracking-widest uppercase mb-1">CRONÔMETRO DE ESTUDO</span>
              <div className="font-mono text-4xl font-black text-[#ff6b00] tracking-tight select-none">
                {formatStopwatch(stopwatchTime)}
              </div>
            </div>

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

    </div>
  );
};
