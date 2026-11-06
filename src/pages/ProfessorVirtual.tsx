import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, ChevronDown, ChevronUp, Mic, Pencil, Play, Plus, RotateCcw, Square, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../services/apiClient';
import ViolaoPixel from '../components/ViolaoPixel';
import TecladoPixel from '../components/TecladoPixel';
import { gerarEscalaTeclado, gerarHanon, nomeTonicaTeclado, TIPOS_ESCALA_TECLADO, type TipoEscalaTeclado, type MaoTeclado } from '../lib/professorVirtual/teclado';
import { createMotorEscuta, createSeguidor } from '../lib/professorVirtual';
import { contextoAudioTreino } from '../lib/professorVirtual/motor';
import { SaidaClique, COMBINACOES_CLIQUE, aplicarSessaoAudio, codigoClique, lerSaidaClique, salvarSaidaClique, type CombinacaoClique } from '../lib/professorVirtual/saidaClique';
import { estimarPosicao, gerarEscala, midiNaPosicao, otimizarSequencia, posicoesDaSequencia, posicoesDoPasso, type EstimativaPosicao, type PosicaoViolao } from '../lib/professorVirtual/violao';
import { adicionarAmostra, chavePosicao, lerMapaEscolhido, lerMapas, lerModeloEscolhido, lembrarModeloEscolhido, novaCalibracao, posicoesCalibracao, salvarMapas, type ModeloViolao } from '../lib/professorVirtual/calibracao';
import type { ExercicioVirtual, Instrumento, LeituraAudio, MotorEscuta, PassoExercicio, ResultadoPasso } from '../lib/professorVirtual/types';

const NOTAS = ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si'];
const INSTRUMENTOS: { valor: Instrumento; nome: string }[] = [
  { valor: 'violao', nome: 'Violão' },
  { valor: 'teclado', nome: 'Teclado' },
];

const MAIOR = [0, 4, 7];
const MENOR = [0, 3, 7];
const DOMINANTE = [0, 4, 7, 10];

// No violão vale a digitação aberta (o que soa de verdade); no teclado, a tríade a partir do Dó central.
const ACORDES: Record<string, { raiz: number; intervalos: number[]; violao: number[] }> = {
  C: { raiz: 0, intervalos: MAIOR, violao: [48, 52, 55, 60, 64] },
  C7: { raiz: 0, intervalos: DOMINANTE, violao: [48, 52, 58, 60, 64] },
  D: { raiz: 2, intervalos: MAIOR, violao: [50, 57, 62, 66] },
  Dm: { raiz: 2, intervalos: MENOR, violao: [50, 57, 62, 65] },
  D7: { raiz: 2, intervalos: DOMINANTE, violao: [50, 57, 60, 66] },
  E: { raiz: 4, intervalos: MAIOR, violao: [40, 47, 52, 56, 59, 64] },
  Em: { raiz: 4, intervalos: MENOR, violao: [40, 47, 52, 55, 59, 64] },
  E7: { raiz: 4, intervalos: DOMINANTE, violao: [40, 47, 50, 56, 59, 64] },
  F: { raiz: 5, intervalos: MAIOR, violao: [41, 48, 53, 57, 60, 65] },
  G: { raiz: 7, intervalos: MAIOR, violao: [43, 47, 50, 55, 59, 67] },
  G7: { raiz: 7, intervalos: DOMINANTE, violao: [43, 47, 50, 55, 59, 65] },
  A: { raiz: 9, intervalos: MAIOR, violao: [45, 52, 57, 61, 64] },
  Am: { raiz: 9, intervalos: MENOR, violao: [45, 52, 57, 60, 64] },
  A7: { raiz: 9, intervalos: DOMINANTE, violao: [45, 52, 55, 61, 64] },
  Bm: { raiz: 11, intervalos: MENOR, violao: [47, 54, 59, 62, 66] },
  B7: { raiz: 11, intervalos: DOMINANTE, violao: [47, 51, 57, 59, 66] },
};

const midisDoAcorde = (nome: string, instrumento: Instrumento) => {
  const acorde = ACORDES[nome];
  return instrumento === 'violao' ? acorde.violao : acorde.intervalos.map((i) => 60 + acorde.raiz + i);
};
const notasDoAcorde = (nome: string) => ACORDES[nome].intervalos.map((i) => NOTAS[(ACORDES[nome].raiz + i) % 12]).join(' ');

const nomeMidi = (midi: number) => `${NOTAS[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
const rotuloPasso = (passo: PassoExercicio) => passo.rotulo || passo.midis.map(nomeMidi).join(' ');
const nomeInstrumento = (instrumento: Instrumento) => INSTRUMENTOS.find((i) => i.valor === instrumento)?.nome || instrumento;

const EXEMPLOS: ExercicioVirtual[] = [
  {
    titulo: 'Technique 1-2-3-4',
    instrumento: 'violao',
    bpm: 100,
    descricao: 'Toque quatro casas por corda, avance e volte até a região inicial, descendo com os dedos 4-3-2-1.',
    passos: Array.from({ length: 16 }, (_, trecho) => {
      const volta = trecho >= 8;
      const passagem = volta ? 15 - trecho : trecho;
      const cordas = trecho % 2 === 0 ? [1, 2, 3, 4, 5, 6] : [6, 5, 4, 3, 2, 1];
      return cordas.flatMap(corda => (volta ? [4, 3, 2, 1] : [1, 2, 3, 4])
        .map(dedo => ({ corda, casa: passagem + dedo, dedo })));
    })
      .flat().map(({ corda, casa, dedo }) => ({
      midis: [midiNaPosicao(corda, casa)!], posicoes: [{ corda, casa, dedo }],
      rotulo: `${corda}ª corda · casa ${casa}`,
    })),
  },
  {
    titulo: 'Cordas soltas e acordes Em e G',
    instrumento: 'violao',
    descricao: 'Exemplo de teste: toque cada corda solta, da mais grave à mais aguda, e depois os acordes.',
    passos: [
      { midis: [40], rotulo: 'Mi', dica: '6ª corda solta (a mais grossa)' },
      { midis: [45], rotulo: 'Lá', dica: '5ª corda solta' },
      { midis: [50], rotulo: 'Ré', dica: '4ª corda solta' },
      { midis: [55], rotulo: 'Sol', dica: '3ª corda solta' },
      { midis: [59], rotulo: 'Si', dica: '2ª corda solta' },
      { midis: [64], rotulo: 'Mi', dica: '1ª corda solta (a mais fina)' },
      { midis: midisDoAcorde('Em', 'violao'), rotulo: 'Em', dica: 'Toque todas as cordas' },
      { midis: midisDoAcorde('G', 'violao'), rotulo: 'G', dica: 'Toque todas as cordas' },
    ],
  },
  {
    titulo: 'Escala de Dó maior',
    instrumento: 'teclado',
    descricao: 'Exemplo de teste: suba a escala a partir do Dó central, uma nota de cada vez.',
    passos: [60, 62, 64, 65, 67, 69, 71, 72].map((midi) => ({ midis: [midi], rotulo: NOTAS[midi % 12] })),
  },
];

const mensagemErroMicrofone = (erro: any) => erro?.message || 'Não foi possível ligar o microfone.';

type Escuta = ReturnType<typeof useEscuta>;

function useEscuta(aoInterromper?: () => void) {
  const motorRef = useRef<MotorEscuta | null>(null);
  const cancelarRef = useRef<(() => void) | null>(null);
  const ouvinteRef = useRef<((l: LeituraAudio) => void) | null>(null);
  const ultimaPinturaRef = useRef(0);
  const aoInterromperRef = useRef(aoInterromper);
  aoInterromperRef.current = aoInterromper;
  const [leitura, setLeitura] = useState<LeituraAudio | null>(null);

  const encerrar = useCallback(() => {
    cancelarRef.current?.();
    cancelarRef.current = null;
    ouvinteRef.current = null;
    motorRef.current?.parar();
    motorRef.current = null;
  }, []);

  const desligar = useCallback(() => {
    encerrar();
    setLeitura(null);
  }, [encerrar]);

  // Sem await antes de motor.iniciar(): no iOS o pedido do microfone precisa nascer do toque.
  const ligar = useCallback(async (instrumento: Instrumento) => {
    desligar();
    try {
      aplicarSessaoAudio(lerSaidaClique().sessao);
    } catch { /* Safari antigo pode recusar a configuração. */ }
    const motor = createMotorEscuta();
    motorRef.current = motor;
    try {
      await motor.iniciar(instrumento);
    } catch (erro) {
      if (motorRef.current === motor) desligar();
      throw erro;
    }
    if (motorRef.current !== motor) {
      motor.parar();
      return;
    }
    cancelarRef.current = motor.aoLer((l) => {
      ouvinteRef.current?.(l);
      if (motorRef.current !== motor) return;
      // O motor lê bem mais rápido do que vale a pena redesenhar a tela.
      const agora = performance.now();
      if (agora - ultimaPinturaRef.current >= 125) {
        ultimaPinturaRef.current = agora;
        setLeitura(l);
      }
    });
  }, [desligar]);

  const calibrar = useCallback(async (duracaoMs: number) => {
    if (!motorRef.current) throw new Error('Microfone desligado.');
    return motorRef.current.calibrar(duracaoMs);
  }, []);

  const ouvir = useCallback((ouvinte: ((l: LeituraAudio) => void) | null) => {
    ouvinteRef.current = ouvinte;
  }, []);
  const definirAlvo = useCallback((midi: number | null) => motorRef.current?.definirAlvo(midi), []);
  const sampleRate = useCallback(() => motorRef.current?.sampleRate() ?? null, []);

  useEffect(() => {
    const interromper = () => {
      if (!motorRef.current) return;
      desligar();
      aoInterromperRef.current?.();
    };
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'hidden') interromper();
    };
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    window.addEventListener('pagehide', interromper);
    return () => {
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      window.removeEventListener('pagehide', interromper);
      encerrar();
    };
  }, [desligar, encerrar]);

  return useMemo(() => ({ leitura, ligar, desligar, calibrar, ouvir, definirAlvo, sampleRate }), [leitura, ligar, desligar, calibrar, ouvir, definirAlvo, sampleRate]);
}

// Com as mãos no instrumento ninguém toca na tela, e a tela apagada derruba o microfone.
function useTelaLigada(ativa: boolean) {
  useEffect(() => {
    if (!ativa) return;
    let montado = true;
    let trava: WakeLockSentinel | null = null;
    navigator.wakeLock?.request('screen')
      .then((t) => {
        if (montado) trava = t;
        else t.release().catch(() => {});
      })
      .catch(() => {});
    return () => {
      montado = false;
      trava?.release().catch(() => {});
    };
  }, [ativa]);
}

const CONFIANCA_MINIMA_GRAVACAO = 0.6;
const NOTA_ESTAVEL_MS = 160;
const SILENCIO_REARMA_MS = 120;

// Devolve a nota (MIDI inteiro) uma única vez, quando ela se sustenta. Repetir a mesma nota exige novo ataque ou silêncio.
function criarCapturaNotas() {
  let candidata: number | null = null;
  let candidataDesde = 0;
  let ultimaNota: number | null = null;
  let rearmada = true;
  let silencioDesde: number | null = null;

  return (l: LeituraAudio): number | null => {
    if (l.ataque) rearmada = true;

    if (!l.temSom) {
      silencioDesde ??= l.tempoMs;
      if (l.tempoMs - silencioDesde >= SILENCIO_REARMA_MS) rearmada = true;
    } else {
      silencioDesde = null;
    }

    const nota = l.temSom && l.midi !== null && l.confianca >= CONFIANCA_MINIMA_GRAVACAO ? Math.round(l.midi) : null;
    if (nota === null) {
      candidata = null;
      return null;
    }
    if (nota !== candidata) {
      candidata = nota;
      candidataDesde = l.tempoMs;
    }
    if (l.tempoMs - candidataDesde < NOTA_ESTAVEL_MS) return null;
    if (nota === ultimaNota && !rearmada) return null;
    ultimaNota = nota;
    rearmada = false;
    return nota;
  };
}

const textoOuvido = (l: LeituraAudio | null, acorde: boolean) => {
  if (!l?.temSom) return '—';
  if (acorde) {
    const fortes = l.croma
      .map((energia, classe) => ({ energia, classe }))
      .filter((c) => c.energia >= 0.5)
      .sort((a, b) => b.energia - a.energia)
      .slice(0, 4)
      .map((c) => NOTAS[c.classe]);
    if (fortes.length) return fortes.join(' ');
  }
  return l.midi !== null && l.confianca >= 0.4 ? nomeMidi(Math.round(l.midi)) : '…';
};

const midiAoVivo = (l: LeituraAudio | null) => l?.temSom && l.midi !== null && l.confianca >= 0.4 ? Math.round(l.midi) : null;

function Tablatura({ passos, indice }: { passos: PassoExercicio[]; indice: number }) {
  const inicio = Math.max(0, Math.min(indice - 2, passos.length - 8));
  const visiveis = passos.slice(inicio, inicio + 8);
  const posicoes = useMemo(() => posicoesDaSequencia(passos), [passos]);
  return (
    <div className={`${CARTAO} overflow-x-auto`}>
      <h3 className="font-black uppercase mb-2">Tablatura</h3>
      <div className="min-w-max font-mono text-sm font-bold" aria-label={`Tablatura, passo atual ${indice + 1}`}>
        {[1, 2, 3, 4, 5, 6].map((corda) => (
          <div key={corda} className="flex h-8 items-center border-b border-[#b69b83]">
            <span className="w-8 shrink-0 text-[#7b5647]">{['e', 'B', 'G', 'D', 'A', 'E'][corda - 1]}|</span>
            {visiveis.map((_, i) => {
              const casas = posicoes[inicio + i].filter((p) => p.corda === corda).map((p) => p.casa).join(',') || '—';
              return <span key={inicio + i} className={`w-11 shrink-0 text-center py-1 ${inicio + i === indice ? 'bg-[#ffcc22] text-black border-2 border-black' : 'text-[#554235]'}`}>{casas}</span>;
            })}
          </div>
        ))}
        <div className="flex"><span className="w-8 shrink-0" />{visiveis.map((_, i) => <span key={i} className="w-11 text-center text-xs">{inicio + i + 1}</span>)}</div>
      </div>
    </div>
  );
}

const BOTAO = 'inline-flex items-center justify-center gap-2 min-h-12 px-4 py-2 border-4 border-black font-black uppercase text-sm tracking-wide shadow-[4px_4px_0_#000] active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:shadow-none';
const BOTAO_CLARO = `${BOTAO} bg-white text-[#261812]`;
const BOTAO_LARANJA = `${BOTAO} bg-[#ff6b00] text-white`;
const BOTAO_ICONE = 'inline-flex items-center justify-center w-11 h-11 shrink-0 border-2 border-black bg-white text-[#261812] active:translate-y-0.5 disabled:opacity-30';
const CARTAO = 'bg-white text-[#261812] border-4 border-black shadow-[6px_6px_0_#000] p-4';
const CAMPO = 'w-full min-h-12 px-3 py-2 border-4 border-black bg-white text-[#261812] text-base font-semibold outline-none focus:border-[#ff6b00]';
const ROTULO = 'block text-sm font-black uppercase tracking-wide text-[#261812] mb-1';

function AvisoErro({ children }: { children: ReactNode }) {
  return <div role="alert" className="bg-[#ffd9d6] text-[#8f1410] border-4 border-black p-3 text-base font-bold">{children}</div>;
}

function MedidorVolume({ leitura }: { leitura: LeituraAudio | null }) {
  const db = leitura?.nivelDb;
  const pct = typeof db === 'number' && Number.isFinite(db) ? Math.max(0, Math.min(100, ((db + 70) / 70) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm font-bold text-[#261812] mb-1">
        <span>Volume</span>
        <span>{leitura?.temSom ? 'Ouvindo som' : 'Silêncio'}</span>
      </div>
      <div className="h-5 border-4 border-black bg-white overflow-hidden">
        <div className={`h-full ${leitura?.temSom ? 'bg-[#ff6b00]' : 'bg-[#c9b8b0]'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ModoTeste({ leitura, extra }: { leitura: LeituraAudio | null; extra?: string }) {
  const [aberto, setAberto] = useState(false);
  const numero = (v: number | null | undefined, casas: number) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(casas) : '—');
  return (
    <div className="border-4 border-black bg-white text-[#261812]">
      <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto} className="w-full min-h-12 px-3 flex items-center justify-between font-black uppercase text-sm">
        Modo teste: valores ao vivo
        {aberto ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {aberto && (
        <div className="px-3 pb-3 font-mono text-sm space-y-2">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <span>Nível: {numero(leitura?.nivelDb, 1)} dB</span>
            <span>Tem som: {leitura?.temSom ? 'sim' : 'não'}</span>
            <span>MIDI: {numero(leitura?.midi, 2)}</span>
            <span>Nota: {leitura?.midi != null ? nomeMidi(Math.round(leitura.midi)) : '—'}</span>
            <span>Confiança: {numero(leitura?.confianca, 2)}</span>
            <span>Ataque: {leitura?.ataque ? 'sim' : 'não'}</span>
          </div>
          {extra && <p>{extra}</p>}
          <div className="grid grid-cols-12 gap-0.5 h-20 items-end">
            {NOTAS.map((nota, i) => (
              <div key={nota} className="h-full flex flex-col justify-end">
                <div className="bg-[#ff6b00] w-full" style={{ height: `${Math.round((leitura?.croma?.[i] ?? 0) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-12 gap-0.5 text-center text-[11px] leading-tight">
            {NOTAS.map((nota) => <span key={nota}>{nota.replace('#', '♯')}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

type Calibracao =
  | { estado: 'pedindo' }
  | { estado: 'medindo' }
  | { estado: 'pronta'; ruidoDb: number; qualidade: 'boa' | 'media' | 'ruim' };

const QUALIDADE = {
  boa: { titulo: 'Ambiente bom', texto: 'Silencioso o bastante para treinar.', cor: 'bg-[#d9f7d9] text-[#0f5d1e]' },
  media: { titulo: 'Ambiente razoável', texto: 'Dá para treinar, mas notas fracas podem não ser ouvidas.', cor: 'bg-[#fff0c2] text-[#6b4a00]' },
  ruim: { titulo: 'Ambiente barulhento', texto: 'Procure um lugar mais silencioso ou o app vai errar mais.', cor: 'bg-[#ffd9d6] text-[#8f1410]' },
};

const CALIBRACAO_MS = 3000;

function TelaCalibracao({ calibracao, leitura, aoRepetir, aoContinuar }: {
  calibracao: Calibracao;
  leitura: LeituraAudio | null;
  aoRepetir: () => void;
  aoContinuar: () => void;
}) {
  const [restante, setRestante] = useState(CALIBRACAO_MS / 1000);
  const medindo = calibracao.estado === 'medindo';

  useEffect(() => {
    if (!medindo) return;
    setRestante(CALIBRACAO_MS / 1000);
    const relogio = setInterval(() => setRestante((s) => Math.max(1, s - 1)), 1000);
    return () => clearInterval(relogio);
  }, [medindo]);

  return (
    <div className="space-y-4">
      {calibracao.estado === 'pedindo' && (
        <div className={CARTAO}>
          <p className="text-xl font-black">Ligando o microfone...</p>
          <p className="text-base mt-1">Se o aparelho perguntar, toque em Permitir.</p>
        </div>
      )}
      {medindo && (
        <div className={`${CARTAO} text-center`}>
          <p className="text-xl font-black">Fique em silêncio</p>
          <p className="text-7xl font-black text-[#ff6b00] my-3">{restante}</p>
          <p className="text-base">Estamos medindo o ruído do ambiente. Não toque ainda.</p>
        </div>
      )}
      {calibracao.estado === 'pronta' && (
        <>
          <div className={`border-4 border-black shadow-[6px_6px_0_#000] p-4 ${QUALIDADE[calibracao.qualidade].cor}`}>
            <p className="text-xl font-black">{QUALIDADE[calibracao.qualidade].titulo}</p>
            <p className="text-base mt-1">{QUALIDADE[calibracao.qualidade].texto}</p>
            <p className="text-sm mt-2">Ruído medido: {calibracao.ruidoDb.toFixed(1)} dB</p>
          </div>
          <button type="button" onClick={aoContinuar} className={`${BOTAO_LARANJA} w-full`}>
            <Play className="w-5 h-5" /> {calibracao.qualidade === 'ruim' ? 'Treinar mesmo assim' : 'Iniciar treino'}
          </button>
          <button type="button" onClick={aoRepetir} className={`${BOTAO_CLARO} w-full`}>
            <RotateCcw className="w-5 h-5" /> Medir de novo
          </button>
        </>
      )}
      {calibracao.estado !== 'pedindo' && <MedidorVolume leitura={leitura} />}
      <ModoTeste leitura={leitura} />
    </div>
  );
}

function TelaAfinacao({ leitura, aoContinuar }: { leitura: LeituraAudio | null; aoContinuar: () => void }) {
  const midi = leitura?.temSom && leitura.midi !== null && leitura.confianca >= 0.4 ? leitura.midi : null;
  const nota = midi === null ? null : Math.round(midi);
  const cents = midi === null ? null : Math.round((midi - nota!) * 100);

  return (
    <div className="space-y-4">
      <div className={`${CARTAO} text-center`}>
        <p className="text-xl font-black uppercase">Afinação do violão</p>
        <p className="text-base mt-2">Toque uma corda de cada vez. Referência: Lá 440 Hz.</p>
        <p className="text-sm font-bold mt-3">Cordas soltas: Mi2 · Lá2 · Ré3 · Sol3 · Si3 · Mi4</p>
        <p className="text-sm font-black uppercase mt-5">Nota ouvida</p>
        <p className="text-6xl font-black text-[#ff6b00] my-2">{nota === null ? '—' : nomeMidi(nota)}</p>
        <p className="text-2xl font-black">{cents === null ? 'Toque uma corda' : `${cents > 0 ? '+' : ''}${cents} cents`}</p>
        {cents !== null && <p className="text-base font-semibold mt-1">{Math.abs(cents) <= 5 ? 'Afinada' : cents < 0 ? 'Abaixo da nota' : 'Acima da nota'}</p>}
      </div>
      <MedidorVolume leitura={leitura} />
      <button type="button" onClick={aoContinuar} className={`${BOTAO_LARANJA} w-full`}><Play className="w-5 h-5" /> Continuar para o exercício</button>
      <p className="text-sm text-center font-semibold">Pode pular esta etapa a qualquer momento.</p>
      <ModoTeste leitura={leitura} />
    </div>
  );
}

function TelaMapaViolao({ escuta, aoSair }: { escuta: Escuta; aoSair: () => void }) {
  useTelaLigada(true);
  const [modelos, setModelos] = useState<ModeloViolao[]>(() => lerMapas());
  const modelosRef = useRef(modelos);
  const [escolhido, setEscolhido] = useState(() => lerModeloEscolhido() || lerMapas().at(-1)?.localId || '');
  const [indice, setIndice] = useState(0);
  const [carregandoModelos, setCarregandoModelos] = useState(true);
  const [falhaServidor, setFalhaServidor] = useState(false);
  const [falhaCache, setFalhaCache] = useState(false);
  const [salvandoModelo, setSalvandoModelo] = useState(false);
  const envioRef = useRef(false);
  const mapa = modelos.find(m => m.localId === escolhido) ?? modelos[0] ?? null;
  const atualizarModelos = (proximos: ModeloViolao[]) => {
    modelosRef.current = proximos;
    setModelos(proximos);
    setFalhaCache(!salvarMapas(proximos));
  };
  const alterarMapa = (atualizado: ModeloViolao) => {
    atualizarModelos(modelosRef.current.map(m => m.localId === atualizado.localId ? atualizado : m));
  };
  const marcarPendente = (atualizado: ModeloViolao): ModeloViolao => ({
    ...atualizado, atualizadoEm: new Date().toISOString(), pendente: true, versao: atualizado.versao + 1,
  });

  useEffect(() => {
    let ativo = true;
    apiFetch('/api/modelos-violao').then(async res => {
      const dados = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(dados)) throw new Error('Falha ao carregar modelos.');
      if (!ativo) return;
      const locais = modelosRef.current;
      const remotos: ModeloViolao[] = dados.filter((d: any) => d && typeof d.id === 'string' && typeof d.nome === 'string' && d.mapa?.amostras).map((d: any) => {
        const local = locais.find(m => m.id === d.id);
        return local?.pendente ? local : {
          id: d.id, localId: local?.localId || d.id, nome: d.nome,
          atualizadoEm: d.mapa.atualizadoEm || d.updated_at || new Date().toISOString(),
          amostras: d.mapa.amostras, pendente: false, versao: local?.versao || 0,
        };
      });
      atualizarModelos([...remotos, ...locais.filter(m => m.pendente && !remotos.some(r => r.localId === m.localId))]);
      setFalhaServidor(false);
      setCarregandoModelos(false);
    }).catch(() => {
      if (!ativo) return;
      setFalhaServidor(true);
      setCarregandoModelos(false);
    });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    if (carregandoModelos || envioRef.current || !modelos.some(m => m.pendente)) return;
    const timer = window.setTimeout(async () => {
      const proximo = modelosRef.current.find(m => m.pendente && m.nome.trim());
      if (!proximo || envioRef.current) return;
      envioRef.current = true;
      setSalvandoModelo(true);
      try {
        const res = await apiFetch(proximo.id ? `/api/modelos-violao/${proximo.id}` : '/api/modelos-violao', {
          method: proximo.id ? 'PUT' : 'POST',
          body: new Blob([JSON.stringify({ nome: proximo.nome, mapa: { atualizadoEm: proximo.atualizadoEm, amostras: proximo.amostras } })], { type: 'application/json' }),
        });
        const dados = await res.json().catch(() => ({}));
        if (!res.ok || !dados.id) throw new Error(dados.error || 'Falha ao salvar modelo.');
        const atual = modelosRef.current.find(m => m.localId === proximo.localId);
        if (atual) {
          atualizarModelos(modelosRef.current.map(m => m.localId === proximo.localId
            ? { ...m, id: dados.id, pendente: m.versao !== proximo.versao }
            : m));
        }
        setFalhaServidor(false);
      } catch {
        setFalhaServidor(true);
      } finally {
        envioRef.current = false;
        setSalvandoModelo(false);
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [modelos, carregandoModelos]);

  useEffect(() => {
    if (!falhaServidor || !modelos.some(m => m.pendente)) return;
    const timer = window.setTimeout(() => setModelos([...modelosRef.current]), 15000);
    return () => window.clearTimeout(timer);
  }, [falhaServidor, modelos]);

  useEffect(() => {
    if (!mapa && !carregandoModelos) {
      const novo: ModeloViolao = { ...novaCalibracao('Meu violão'), localId: crypto.randomUUID(), pendente: true, versao: 0 };
      atualizarModelos([...modelosRef.current, novo]);
      setEscolhido(novo.localId);
    }
  }, [mapa, carregandoModelos]);

  useEffect(() => {
    if (!mapa) return;
    lembrarModeloEscolhido(mapa.localId);
    const proximo = posicoesCalibracao.findIndex(p => (mapa.amostras[chavePosicao(p.corda, p.casa)]?.length ?? 0) < 3);
    setIndice(Math.max(0, proximo));
  }, [escolhido, !!mapa]);
  const [pausado, setPausado] = useState(false);
  const [modo, setModo] = useState<'calibrar' | 'testar'>('calibrar');
  const [aviso, setAviso] = useState('Toque a posição destacada. Faça três ataques separados.');
  const [tentativas, setTentativas] = useState<{ comMao: boolean; semMao: boolean }[]>([]);
  const [alvoTeste, setAlvoTeste] = useState<PosicaoViolao | null>(null);
  const ultimaCorreta = useRef<PosicaoViolao | null>(null);
  const posicao = posicoesCalibracao[indice];
  const feitas = posicoesCalibracao.reduce((n, p) => n + Math.min(3, mapa?.amostras[chavePosicao(p.corda, p.casa)]?.length ?? 0), 0);
  const elegiveis = useMemo(() => posicoesCalibracao.filter(p => {
    const midi = midiNaPosicao(p.corda, p.casa);
    return (mapa?.amostras[chavePosicao(p.corda, p.casa)]?.length ?? 0) === 3 &&
      posicoesCalibracao.some(outra => outra.corda !== p.corda && midiNaPosicao(outra.corda, outra.casa) === midi &&
        (mapa?.amostras[chavePosicao(outra.corda, outra.casa)]?.length ?? 0) === 3);
  }), [mapa]);

  useEffect(() => {
    if (!mapa) return;
    escuta.ouvir(l => {
      const alvo = modo === 'testar' ? alvoTeste : posicao;
      if (pausado || !alvo || !l.timbre || l.midi === null || l.confianca < 0.6) return;
      const esperado = midiNaPosicao(alvo.corda, alvo.casa)!;
      if (Math.abs(l.midi - esperado) > 0.45) {
        setAviso(`Nota diferente: ouvi ${nomeMidi(Math.round(l.midi))}; esperava ${nomeMidi(esperado)}. Amostra descartada.`);
        return;
      }
      if (modo === 'testar') {
        const comMao = estimarPosicao(esperado, ultimaCorreta.current, l.timbre, mapa, true);
        const semMao = estimarPosicao(esperado, null, l.timbre, mapa, false);
        const acertou = (p: PosicaoViolao | null) => p?.corda === alvo.corda;
        setTentativas(atuais => [...atuais, { comMao: acertou(comMao), semMao: acertou(semMao) }]);
        ultimaCorreta.current = alvo;
        setAviso(`Tocou ${alvo.corda}ª/${alvo.casa}. Com mão: ${comMao?.corda ?? '—'}ª corda; sem mão: ${semMao?.corda ?? '—'}ª corda.`);
        setAlvoTeste(null);
        return;
      }
      const atual = modelosRef.current.find(m => m.localId === mapa.localId) ?? mapa;
      const atualizado = marcarPendente({ ...atual, ...adicionarAmostra(atual, alvo.corda, alvo.casa, l.timbre) });
      alterarMapa(atualizado);
      setAviso(`Amostra ${atualizado.amostras[chavePosicao(alvo.corda, alvo.casa)].length}/3 registrada neste aparelho. Confira o status do servidor acima.`);
      if (atualizado.amostras[chavePosicao(alvo.corda, alvo.casa)].length >= 3) {
        const seguinte = posicoesCalibracao.findIndex((p, i) => i > indice && (atualizado.amostras[chavePosicao(p.corda, p.casa)]?.length ?? 0) < 3);
        const anterior = posicoesCalibracao.findIndex(p => (atualizado.amostras[chavePosicao(p.corda, p.casa)]?.length ?? 0) < 3);
        if (seguinte >= 0 || anterior >= 0) setIndice(seguinte >= 0 ? seguinte : anterior);
        else { setPausado(true); setAviso('Mapa completo. Aguarde a confirmação do servidor; depois use Testar mapa.'); }
      }
    });
    return () => escuta.ouvir(null);
  }, [escuta, mapa, modo, pausado, indice, posicao, alvoTeste]);

  const sortear = () => {
    if (!elegiveis.length) return;
    const opcoes = elegiveis.filter(p => p.corda !== alvoTeste?.corda || p.casa !== alvoTeste?.casa);
    setAlvoTeste((opcoes.length ? opcoes : elegiveis)[Math.floor(Math.random() * (opcoes.length || elegiveis.length))]);
    setAviso('Toque a corda e casa sorteadas uma vez.');
  };
  const escolherMapa = (localId: string) => {
    const modelo = modelos.find(m => m.localId === localId);
    if (!modelo) return;
    setEscolhido(localId);
    lembrarModeloEscolhido(localId);
    const proximo = posicoesCalibracao.findIndex(p => (modelo.amostras[chavePosicao(p.corda, p.casa)]?.length ?? 0) < 3);
    setIndice(Math.max(0, proximo));
    setTentativas([]);
    setAlvoTeste(null);
  };
  const criarModelo = () => {
    const novo: ModeloViolao = { ...novaCalibracao('Novo violão'), localId: crypto.randomUUID(), pendente: true, versao: 0 };
    atualizarModelos([...modelosRef.current, novo]);
    escolherMapa(novo.localId);
    setEscolhido(novo.localId);
  };
  const alvo = modo === 'testar' ? alvoTeste : posicao;
  if (!mapa) return <div className={CARTAO}>Carregando modelos de violão…</div>;
  return <div className="space-y-4 text-[#261812]">
    <div className={CARTAO}>
      <h2 className="text-xl font-black uppercase">Mapa do meu violão</h2>
      <label htmlFor="nome-violao" className={ROTULO}>Nome do violão</label>
      <input id="nome-violao" className={CAMPO} maxLength={120} value={mapa.nome} onChange={e => alterarMapa(marcarPendente({ ...mapa, nome: e.target.value }))} onBlur={() => { if (!mapa.nome.trim()) alterarMapa(marcarPendente({ ...mapa, nome: 'Meu violão' })); }} />
      <label htmlFor="modelo-violao" className={ROTULO}>Modelo ativo</label>
      <select id="modelo-violao" className={CAMPO} value={mapa.localId} onChange={e => escolherMapa(e.target.value)}>{modelos.map(m => <option key={m.localId} value={m.localId}>{m.nome || 'Sem nome'}{m.pendente ? ' · pendente' : ''}</option>)}</select>
      <button type="button" className={`${BOTAO_CLARO} mt-3`} onClick={criarModelo}>Novo modelo</button>
      {falhaServidor && <p role="alert" className="mt-3 border-4 border-black bg-[#ffcc22] p-3 font-bold">Servidor indisponível. O rascunho fica neste aparelho e será enviado automaticamente quando a conexão voltar.</p>}
      {falhaCache && <p role="alert" className="mt-3 border-4 border-black bg-[#ffcc22] p-3 font-bold">Não foi possível guardar o rascunho neste aparelho. Mantenha esta tela aberta até o servidor confirmar o envio.</p>}
      <p role="status" className="text-sm font-semibold mt-2">{mapa.pendente ? (salvandoModelo ? 'Enviando ao servidor…' : 'Alterações pendentes no servidor') : 'Modelo salvo no servidor'} · {new Date(mapa.atualizadoEm).toLocaleDateString('pt-BR')}</p>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <button type="button" className={modo === 'calibrar' ? BOTAO_LARANJA : BOTAO_CLARO} onClick={() => { setModo('calibrar'); setPausado(false); }}>Calibrar</button>
      <button type="button" className={modo === 'testar' ? BOTAO_LARANJA : BOTAO_CLARO} onClick={() => { setModo('testar'); setPausado(false); setAlvoTeste(null); }}>Testar mapa</button>
    </div>
    {modo === 'calibrar' ? <>
      <div className={CARTAO}>
        <p className="font-black">{feitas}/234 amostras · {Math.floor(feitas / 3)}/78 posições completas</p>
        <div className="h-5 border-2 border-black bg-[#eee] mt-2"><div className="h-full bg-[#ff6b00]" style={{ width: `${feitas / 234 * 100}%` }} /></div>
        <p className="font-bold mt-3">{posicao.corda}ª corda · casa {posicao.casa} · {nomeMidi(midiNaPosicao(posicao.corda, posicao.casa)!)}</p>
        <p>Coletadas aqui: {mapa.amostras[chavePosicao(posicao.corda, posicao.casa)]?.length ?? 0}/3</p>
      </div>
      <ViolaoPixel esperadas={[posicao]} aoEscolher={p => { if (p.casa <= 12) { setIndice(posicoesCalibracao.findIndex(x => x.corda === p.corda && x.casa === p.casa)); setPausado(false); } }} />
      <div className="grid grid-cols-2 gap-3">
        <button type="button" className={BOTAO_CLARO} onClick={() => setPausado(p => !p)}>{pausado ? 'Continuar' : 'Pausar'}</button>
        <button type="button" className={BOTAO_CLARO} onClick={() => setIndice((indice + 1) % posicoesCalibracao.length)}>Pular</button>
      </div>
    </> : <>
      <div className={CARTAO}>
        <p className="font-black">Teste real: {tentativas.length} {tentativas.length === 1 ? 'tentativa' : 'tentativas'}</p>
        <p>Com ajuda da mão: {tentativas.length ? `${Math.round(tentativas.filter(t => t.comMao).length / tentativas.length * 100)}%` : '—'}</p>
        <p>Sem ajuda da mão: {tentativas.length ? `${Math.round(tentativas.filter(t => t.semMao).length / tentativas.length * 100)}%` : '—'}</p>
        <p className="text-sm mt-2">A taxa conta apenas notas tocadas neste teste; exige duas cordas calibradas para a mesma nota.</p>
      </div>
      {elegiveis.length ? <button type="button" className={`${BOTAO_LARANJA} w-full`} onClick={sortear}>{alvoTeste ? 'Sortear outra' : 'Sortear posição'}</button> : <p className={CARTAO}>Calibre pelo menos duas posições da mesma nota para testar.</p>}
      {alvoTeste && <><p className={`${CARTAO} font-black`}>Toque: {alvoTeste.corda}ª corda · casa {alvoTeste.casa}</p><ViolaoPixel esperadas={[alvoTeste]} /></>}
    </>}
    <p role="status" className={`${CARTAO} font-bold`}>{aviso}</p>
    <MedidorVolume leitura={escuta.leitura} />
    <button type="button" className={`${BOTAO_CLARO} w-full`} onClick={aoSair}>Voltar</button>
  </div>;
}

function TelaTreino({ exercicio, escuta, ruidoDb, diagnosticoInicial, aoSair, aoReiniciar, metaMinutos, voltarAoAluno }: {
  exercicio: ExercicioVirtual;
  escuta: Escuta;
  ruidoDb: number;
  diagnosticoInicial?: boolean;
  aoSair: () => void;
  aoReiniciar: () => void;
  metaMinutos: number;
  voltarAoAluno?: boolean;
}) {
  const [seguidor] = useState(() => createSeguidor(exercicio));
  const [indice, setIndice] = useState(0);
  const [resultados, setResultados] = useState<ResultadoPasso[]>([]);
  const [concluido, setConcluido] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [volta, setVolta] = useState(1);
  const [acertos, setAcertos] = useState(0);
  const [tentativas, setTentativas] = useState(0);
  const inicioSessaoRef = useRef(Date.now());
  const [tempoTotal, setTempoTotal] = useState(0);
  const [mostrarTablatura, setMostrarTablatura] = useState(false);
  const [modoMemoria, setModoMemoria] = useState(false);
  const [posicaoOuvida, setPosicaoOuvida] = useState<EstimativaPosicao | null>(null);
  const [diagnosticoEstado, setDiagnosticoEstado] = useState<'parado' | 'gravando' | 'enviando' | 'enviado' | 'erro'>(diagnosticoInicial ? 'gravando' : 'parado');
  const [diagnosticoErro, setDiagnosticoErro] = useState('');
  const diagnosticoRef = useRef<{ inicioMs: number | null; bytes: number; leituras: object[] } | null>(diagnosticoInicial ? { inicioMs: null, bytes: 0, leituras: [] } : null);
  const [bpmTreino, setBpmTreino] = useState(Math.max(40, Math.min(300, exercicio.bpm || 100)));
  const bpmTreinoRef = useRef(bpmTreino);
  bpmTreinoRef.current = bpmTreino;
  const [metronomoLigado, setMetronomoLigado] = useState(false);
  const [vibrarPulso, setVibrarPulso] = useState(false);
  const podeVibrar = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
  const [cliqueLigado, setCliqueLigado] = useState(false);
  const [volumeClique, setVolumeClique] = useState(100);
  const [batidaVisual, setBatidaVisual] = useState(false);
  const [ritmo, setRitmo] = useState('');
  const [saidaEscolhida, setSaidaEscolhida] = useState(lerSaidaClique);
  const [mostrarTesteSom, setMostrarTesteSom] = useState(false);
  const [testeAtivo, setTesteAtivo] = useState<string | null>(null);
  const [statusSessao, setStatusSessao] = useState('');
  const [moedasSessao, setMoedasSessao] = useState(0); // Só nesta sessão; nunca persiste nem altera economia.
  const [combo, setCombo] = useState(0);
  const [efeito, setEfeito] = useState<{ tipo: 'acerto' | 'erro'; id: number } | null>(null);
  const contextoCliqueRef = useRef<AudioContext | null>(null);
  const saidaCliqueRef = useRef<SaidaClique | null>(null);
  const testeTimerRef = useRef<number | null>(null);
  const testeIntervaloRef = useRef<number | null>(null);
  const alturasRecentesRef = useRef<number[]>([]);
  const ataquePendenteRef = useRef(false);
  const [midiLimpo, setMidiLimpo] = useState<number | null>(null);
  const proximoCliqueRef = useRef(0);
  const inicioRitmoRef = useRef<number | null>(null);
  const temposCliqueRef = useRef<number[]>([]);
  const [ultimoAtrasoMs, setUltimoAtrasoMs] = useState<number | null>(null);
  const { ouvir, leitura } = escuta;
  const pararTesteSom = useCallback(() => {
    if (testeTimerRef.current !== null) clearTimeout(testeTimerRef.current);
    if (testeIntervaloRef.current !== null) clearInterval(testeIntervaloRef.current);
    testeTimerRef.current = null; testeIntervaloRef.current = null;
    saidaCliqueRef.current?.encerrar(); saidaCliqueRef.current = null;
    setTesteAtivo(null);
    aplicarSessaoAudio(saidaEscolhida.sessao);
  }, [saidaEscolhida]);
  useEffect(() => () => {
    if (testeTimerRef.current !== null) clearTimeout(testeTimerRef.current);
    if (testeIntervaloRef.current !== null) clearInterval(testeIntervaloRef.current);
    saidaCliqueRef.current?.encerrar();
  }, []);
  const testarSom = (item: CombinacaoClique) => {
    if (testeTimerRef.current !== null) clearTimeout(testeTimerRef.current);
    if (testeIntervaloRef.current !== null) clearInterval(testeIntervaloRef.current);
    saidaCliqueRef.current?.encerrar();
    setMetronomoLigado(false);
    try {
      const saida = new SaidaClique(item);
      saidaCliqueRef.current = saida;
      setStatusSessao(aplicarSessaoAudio(item.sessao));
      setTesteAtivo(codigoClique(item));
      saida.tocar(0);
      testeIntervaloRef.current = window.setInterval(() => saida.tocar(0), 500);
      testeTimerRef.current = window.setTimeout(() => {
        if (testeIntervaloRef.current !== null) clearInterval(testeIntervaloRef.current);
        testeIntervaloRef.current = null; testeTimerRef.current = null;
        saida.encerrar();
        if (saidaCliqueRef.current === saida) saidaCliqueRef.current = null;
        setTesteAtivo(null);
        aplicarSessaoAudio(saidaEscolhida.sessao);
      }, 4000);
    } catch (erro) { setStatusSessao(erro instanceof Error ? erro.message : 'Falha ao tocar'); setTesteAtivo(null); }
  };
  const posicoes = useMemo(() => posicoesDaSequencia(exercicio.passos), [exercicio.passos]);
  useEffect(() => {
    const timer = window.setInterval(() => setTempoTotal(Math.floor((Date.now() - inicioSessaoRef.current) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const restante = Math.max(0, metaMinutos * 60 - tempoTotal);
  const metaAtingida = tempoTotal >= metaMinutos * 60;
  const restanteFormatado = `${Math.floor(restante / 60).toString().padStart(2, '0')}:${(restante % 60).toString().padStart(2, '0')}`;
  const tempoFormatado = `${Math.floor(tempoTotal / 3600).toString().padStart(2, '0')}:${Math.floor(tempoTotal / 60 % 60).toString().padStart(2, '0')}:${(tempoTotal % 60).toString().padStart(2, '0')}`;

  const enviarDiagnostico = useCallback(async () => {
    const gravacao = diagnosticoRef.current;
    diagnosticoRef.current = null;
    if (!gravacao) return;
    setDiagnosticoEstado('enviando');
    try {
      const corpo = { exercicio: exercicio.titulo, dados: {
        sampleRate: escuta.sampleRate(), userAgent: navigator.userAgent,
        leituras: gravacao.leituras,
      } };
      const resposta = await apiFetch('/api/diagnosticos-professor-virtual', {
        method: 'POST', body: new Blob([JSON.stringify(corpo)], { type: 'application/json' }),
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados.error || 'Falha ao enviar diagnóstico.');
      setDiagnosticoEstado('enviado');
    } catch (erro: any) {
      const mensagem = erro.message || 'Falha ao enviar diagnóstico.';
      diagnosticoRef.current = gravacao;
      setDiagnosticoErro(mensagem);
      setDiagnosticoEstado('erro');
      toast.error(mensagem);
    }
  }, [exercicio.titulo, escuta.sampleRate]);

  useEffect(() => {
    if (!metronomoLigado || concluido || pausado) return;
    inicioRitmoRef.current = performance.now() + 80;
    proximoCliqueRef.current = inicioRitmoRef.current;
    temposCliqueRef.current = [];
    const timer = window.setInterval(() => {
      const agora = performance.now();
      while (proximoCliqueRef.current < agora + 100) {
        const instante = proximoCliqueRef.current;
        window.setTimeout(() => { setBatidaVisual(true); if (vibrarPulso && podeVibrar) navigator.vibrate(35); window.setTimeout(() => setBatidaVisual(false), 110); }, Math.max(0, instante - agora));
        if (cliqueLigado && contextoCliqueRef.current && volumeClique > 0) {
          const contexto = contextoCliqueRef.current;
          saidaCliqueRef.current?.tocar(Math.max(0, instante - agora), volumeClique / 100);
          const latencia = ((contexto.outputLatency || contexto.baseLatency || 0) * 1000);
          temposCliqueRef.current.push(instante + latencia);
        }
        proximoCliqueRef.current += 60000 / Math.max(40, Math.min(300, bpmTreinoRef.current));
      }
      temposCliqueRef.current = temposCliqueRef.current.filter(t => t > agora - 180);
    }, 25);
    return () => window.clearInterval(timer);
  }, [metronomoLigado, cliqueLigado, volumeClique, concluido, pausado, saidaEscolhida, vibrarPulso, podeVibrar]);



  useTelaLigada(!concluido);

  useEffect(() => {
    escuta.definirAlvo(exercicio.passos[seguidor.passoAtual()]?.midis.length === 1
      ? exercicio.passos[seguidor.passoAtual()].midis[0] : null);
    ouvir((l) => {
      if (concluido || pausado) return;
      const agora = performance.now();
      // O alto-falante pode voltar ao microfone: descarte o ataque e a curta cauda do clique.
      // Leitura descartada não pode apagar o ataque: a próxima leitura válida o herda.
      if (l.ataque) ataquePendenteRef.current = true;
      // A janela de análise guarda o clique por ~85 ms; a nota real continua soando depois da máscara.
      const intervaloClique = 60000 / Math.max(40, Math.min(300, bpmTreinoRef.current));
      const fimMascara = Math.min(140, intervaloClique * 0.55);
      if (metronomoLigado && cliqueLigado && temposCliqueRef.current.some(t => agora >= t - 30 && agora <= t + fimMascara)) {
        setMidiLimpo(null);
        return;
      }
      // Teclado é afinado e tem altura fixa; voz cai entre as notas, desliza e oscila.
      if (exercicio.instrumento === 'teclado') {
        if (l.midi === null) alturasRecentesRef.current = [];
        else {
          const alturas = alturasRecentesRef.current;
          if (alturas.length && Math.abs(l.midi - alturas[alturas.length - 1]) >= 0.75) alturas.length = 0;
          alturas.push(l.midi);
          if (alturas.length > 3) alturas.shift();
          const afinada = Math.abs(l.midi - Math.round(l.midi)) <= 0.25;
          if (!afinada || alturas.length < 3 || Math.max(...alturas) - Math.min(...alturas) > 0.1) {
            setMidiLimpo(null);
            return;
          }
        }
      }
      if (ataquePendenteRef.current && l.midi !== null) { l = { ...l, ataque: true }; ataquePendenteRef.current = false; }
      setMidiLimpo(l.midi === null ? null : Math.round(l.midi));
      const indiceAntes = seguidor.passoAtual();
      if (exercicio.instrumento === 'violao' && l.midi !== null) {
        const indiceAtual = seguidor.passoAtual();
        const midi = Math.round(l.midi);
        const notaEsperada = exercicio.passos[indiceAtual]?.midis.indexOf(midi) ?? -1;
        const salva = notaEsperada >= 0 ? posicoes[indiceAtual]?.[notaEsperada] : null;
        const anterior = posicoes[Math.max(0, indiceAtual - 1)]?.at(-1) ?? null;
        setPosicaoOuvida(salva ? { ...salva, confianca: 1 } : estimarPosicao(midi, anterior, l.timbre, lerMapaEscolhido()));
      }
      const resultado = seguidor.processar(l);
      const gravacao = diagnosticoRef.current;
      if (gravacao && diagnosticoEstado === 'gravando') {
        gravacao.inicioMs ??= l.tempoMs;
        const linha = {
          tempoMs: Math.round(l.tempoMs - gravacao.inicioMs), nivelDb: Math.round(l.nivelDb * 10) / 10,
          ataque: l.ataque, midi: l.midi === null ? null : Math.round(l.midi * 100) / 100,
          confianca: Math.round(l.confianca * 100) / 100,
          passoEsperado: exercicio.passos[indiceAntes]?.midis ?? [],
          resultadoPasso: resultado ? (resultado.correto ? 'aprovado' : 'recusado') : null,
          atrasoAprovacaoMs: resultado?.atrasoAprovacaoMs ?? null,
        };
        const bytes = new TextEncoder().encode(JSON.stringify(linha)).length + 1;
        if (l.tempoMs - gravacao.inicioMs <= 60000 && gravacao.bytes + bytes <= 270000) {
          gravacao.leituras.push(linha);
          gravacao.bytes += bytes;
        } else void enviarDiagnostico();
      }
      if (!resultado) return;
      setTentativas(v => v + 1);
      if (resultado.correto) {
        setAcertos(v => v + 1);
        setMoedasSessao(v => v + 1);
        setCombo(v => v + 1);
        if (metronomoLigado && inicioRitmoRef.current !== null) {
          const periodoNota = 60000 / bpmTreino / 4;
          const ataque = agora - (resultado.atrasoAprovacaoMs ?? 0);
          const desvio = ataque - inicioRitmoRef.current - Math.round((ataque - inicioRitmoRef.current) / periodoNota) * periodoNota;
          setRitmo(`${Math.abs(desvio) <= 25 ? 'No tempo' : desvio < 0 ? 'Adiantada' : 'Atrasada'} · ${Math.round(Math.abs(desvio))} ms`);
        }
      } else setCombo(0);
      setEfeito({ tipo: resultado.correto ? 'acerto' : 'erro', id: agora });
      if (resultado.correto && resultado.atrasoAprovacaoMs !== undefined) setUltimoAtrasoMs(resultado.atrasoAprovacaoMs);
      if (seguidor.concluido()) {
        seguidor.reiniciar();
        setVolta(v => v + 1);
      }
      escuta.definirAlvo(exercicio.passos[seguidor.passoAtual()]?.midis.length === 1
        ? exercicio.passos[seguidor.passoAtual()].midis[0] : null);
      setResultados((atuais) => [...atuais.slice(-19), resultado]);
      setIndice(seguidor.passoAtual());
      setPosicaoOuvida(null);
    });
    return () => ouvir(null);
  }, [ouvir, seguidor, escuta.definirAlvo, exercicio, posicoes, enviarDiagnostico, cliqueLigado, metronomoLigado, bpmTreino, diagnosticoEstado, pausado, concluido]);

  const total = exercicio.passos.length;
  const passo = exercicio.passos[Math.min(indice, total - 1)];
  const proximos = exercicio.passos.slice(indice + 1, indice + 5);
  const ultimo = resultados[resultados.length - 1];
  const percentual = tentativas ? Math.round(acertos / tentativas * 100) : 0;
  const rotulo = rotuloPasso(passo);
  const feitos = indice;
  const posicoesAtuais = exercicio.instrumento === 'violao' ? posicoes[Math.min(indice, total - 1)] : [];
  const posicoesProximas = exercicio.instrumento === 'violao' ? posicoes.slice(indice + 1, indice + 5).flat() : [];

  return (
    <div className="space-y-4 md:landscape:grid md:landscape:grid-cols-3 md:landscape:gap-3 md:landscape:space-y-0 lg:landscape:grid-cols-4">
      <div className="md:landscape:col-span-full">
        <p className="font-black">Volta {volta} · Tempo total {tempoFormatado} · Meta {restanteFormatado}</p>
        {metaAtingida && !concluido && <p role="status" className="mt-2 border-4 border-black bg-[#ffcc22] p-3 text-lg font-black">⏱ Meta alcançada! Continue no loop ou toque em Encerrar.</p>}
        <div className="flex justify-between text-base font-black text-[#261812] mb-1">
          <span className="min-w-0 truncate pr-2">{exercicio.titulo}</span>
          <span className="shrink-0">{feitos}/{total}</span>
        </div>
        <div className="h-4 border-4 border-black bg-white overflow-hidden">
          <div className="h-full bg-[#ff6b00] transition-all" style={{ width: `${(feitos / total) * 100}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:landscape:col-span-full"><button type="button" className={modoMemoria ? BOTAO_CLARO : BOTAO_LARANJA} aria-pressed={!modoMemoria} onClick={() => setModoMemoria(false)}>Mostrar notas</button><button type="button" className={modoMemoria ? BOTAO_LARANJA : BOTAO_CLARO} aria-pressed={modoMemoria} onClick={() => { setModoMemoria(true); setMostrarTablatura(false); }}>De cor</button></div>

      <div className={`${CARTAO} relative space-y-3 md:landscape:order-4`}>
        <style>{`@keyframes pv-moeda-sessao { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(-48px) } } @media (prefers-reduced-motion: reduce) { .pv-moeda-sessao { display: none } }`}</style>
        {efeito?.tipo === 'acerto' && <span key={efeito.id} className="pv-moeda-sessao absolute left-1/2 top-4 w-5 h-5 bg-yellow-300 border-[3px] border-black shadow-[3px_3px_0_#ad6900] pointer-events-none" style={{ animation: 'pv-moeda-sessao .65s ease-out both' }} aria-hidden="true" />}
        <div className="flex justify-between font-black text-lg"><span>🪙 {moedasSessao} moedas</span><span>Combo ×{combo}</span></div>
        <p className="text-xs font-semibold">Moedas desta sessão de treino.</p>
        <button type="button" className={`${BOTAO_LARANJA} w-full`} disabled={diagnosticoEstado === 'enviando' || diagnosticoEstado === 'enviado'} onClick={() => {
          if (diagnosticoEstado === 'gravando') void enviarDiagnostico();
          else if (diagnosticoEstado === 'erro' && diagnosticoRef.current?.leituras.length) void enviarDiagnostico();
          else { diagnosticoRef.current = { inicioMs: null, bytes: 0, leituras: [] }; setDiagnosticoErro(''); setDiagnosticoEstado('gravando'); }
        }}>{diagnosticoEstado === 'gravando' ? 'Parar e enviar diagnóstico' : diagnosticoEstado === 'enviando' ? 'Enviando diagnóstico…' : diagnosticoEstado === 'enviado' ? 'Diagnóstico enviado' : diagnosticoEstado === 'erro' ? 'Tentar enviar diagnóstico novamente' : 'Gravar diagnóstico'}</button>
        {diagnosticoEstado === 'gravando' && <p className="text-sm font-bold">Gravando até 60 s de leituras, sem áudio. Ao terminar, o envio é automático.</p>}
        {diagnosticoEstado === 'erro' && <p role="alert" className="text-sm font-bold text-red-700">Erro ao enviar: {diagnosticoErro}</p>}
      </div>

      <div className={`${CARTAO} space-y-3 md:landscape:order-5`}>
        <div className="flex items-center justify-between gap-3"><h3 className="font-black text-lg">Metrônomo</h3><span key={`${metronomoLigado}-${bpmTreino}`} className={`w-12 h-12 rounded-full border-4 border-black ${batidaVisual ? 'bg-[#ff6b00]' : 'bg-white'} ${metronomoLigado ? 'opacity-100' : 'opacity-30'}`} aria-hidden="true" /></div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2" aria-label="Controle de BPM">
            {[-5, -1].map(passo => <button key={passo} type="button" aria-label={`${passo} BPM`} className={`${BOTAO_CLARO} min-w-12 min-h-12 text-lg`} onClick={() => setBpmTreino(valor => Math.max(40, Math.min(300, valor + passo)))}>{passo}</button>)}
            <span className="font-black text-3xl text-center min-w-20" aria-live="off">{bpmTreino}<span className="block text-xs">BPM</span></span>
            {[1, 5].map(passo => <button key={passo} type="button" aria-label={`+${passo} BPM`} className={`${BOTAO_CLARO} min-w-12 min-h-12 text-lg`} onClick={() => setBpmTreino(valor => Math.max(40, Math.min(300, valor + passo)))}>+{passo}</button>)}
          </div>
          <input aria-label="BPM" type="range" min={40} max={300} value={bpmTreino} onChange={e => setBpmTreino(Number(e.target.value))} className="w-full h-10 touch-none" />
        </div>
        <div className="grid grid-cols-2 gap-2"><button type="button" className={BOTAO_CLARO} aria-pressed={metronomoLigado} onClick={() => { if (!metronomoLigado) { pararTesteSom(); contextoCliqueRef.current ??= contextoAudioTreino(); saidaCliqueRef.current?.encerrar(); saidaCliqueRef.current = new SaidaClique(saidaEscolhida); } setMetronomoLigado(v => !v); }}>{metronomoLigado ? 'Desligar' : 'Ligar'}</button><button type="button" className={BOTAO_CLARO} aria-pressed={cliqueLigado} onClick={() => { if (!cliqueLigado) { contextoCliqueRef.current ??= contextoAudioTreino(); saidaCliqueRef.current ??= new SaidaClique(saidaEscolhida); void contextoCliqueRef.current.resume(); } setCliqueLigado(v => !v); }}>{cliqueLigado ? 'Clique: ligado' : 'Clique: desligado'}</button></div>
        {podeVibrar && <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={vibrarPulso} onChange={e => setVibrarPulso(e.target.checked)} /> Vibrar no pulso</label>}
        <label className="font-bold block">Volume do clique: {volumeClique}% <input aria-label="Volume do clique" type="range" min="0" max="100" value={volumeClique} onChange={e => setVolumeClique(Number(e.target.value))} className="w-full" /></label>
        <button type="button" className={`${BOTAO_CLARO} w-full`} onClick={() => setMostrarTesteSom(v => !v)}>Testar som do metrônomo</button>
        {mostrarTesteSom && <div className="space-y-3 border-t-2 border-black pt-3">
          <p className="font-bold">Microfone aberto · nível: {leitura ? `${leitura.nivelDb.toFixed(1)} dBFS` : 'sem leitura'} · saída padrão: {codigoClique(saidaEscolhida)}</p>
          <p className="text-sm">Fale ou toque durante cada teste. Se o nível parar de mudar, o microfone pode ter sido cortado.</p>
          {(typeof navigator !== 'undefined' && 'audioSession' in navigator ? COMBINACOES_CLIQUE : COMBINACOES_CLIQUE.filter(item => item.sessao === 'auto')).map(item => <div key={codigoClique(item)} className="border-2 border-black p-3 space-y-2">
            <button type="button" className={`${BOTAO_LARANJA} w-full text-lg`} onClick={() => testarSom(item)}>{testeAtivo === codigoClique(item) ? 'Tocando 4 s…' : `Tocar ${codigoClique(item)} · 4 s`}</button>
            <p className="font-bold">{codigoClique(item)} · microfone: {leitura ? `${leitura.nivelDb.toFixed(1)} dBFS` : 'sem leitura'} {testeAtivo === codigoClique(item) && `· sessão: ${statusSessao}`}</p>
            <button type="button" className={`${BOTAO_CLARO} w-full`} onClick={() => { pararTesteSom(); setSaidaEscolhida(item); if (!salvarSaidaClique(item)) toast.error('Não foi possível salvar neste aparelho.'); aplicarSessaoAudio(item.sessao); if (metronomoLigado || cliqueLigado) saidaCliqueRef.current = new SaidaClique(item); }}>Essa ficou alta{codigoClique(saidaEscolhida) === codigoClique(item) ? ' ✓' : ''}</button>
          </div>)}
        </div>}
        <p className="text-xs font-semibold">Com fone o clique fica mais alto e não entra no microfone. Ritmo é informativo e não reprova a nota.</p>
        {ritmo && <p aria-live="polite" className="font-black">{ritmo}</p>}
      </div>

      {concluido ? (
        <div className={`${CARTAO} text-center md:landscape:order-3`}>
          <p className="text-xl font-black uppercase">Resumo do treino</p>
          <p className="text-7xl font-black text-[#ff6b00] my-3">{percentual}%</p>
          <p className="text-base font-semibold">{volta - 1} voltas completas · {tempoFormatado} · {acertos} acertos em {tentativas} tentativas.</p>
        </div>
      ) : (
        <div className={`${CARTAO} text-center md:landscape:order-3`}>
          <p className="text-sm font-black uppercase tracking-wide text-[#7b5647]">{pausado ? 'Pausado' : 'Toque agora'}</p>
          <p className={`font-black break-words my-1 ${modoMemoria ? 'text-3xl' : rotulo.length > 8 ? 'text-4xl' : 'text-7xl'}`}>{modoMemoria ? exercicio.titulo.replace(/ · .*/, '') : rotulo}</p>
          {!modoMemoria && passo.dica && <p className="text-lg font-semibold">{passo.dica}</p>}
          {!modoMemoria && proximos.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm font-bold text-[#7b5647]">Depois:</span>
              {proximos.map((p, i) => (
                <span key={i} className="border-2 border-black bg-[#fff1eb] px-2 py-0.5 text-base font-bold">{rotuloPasso(p)}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {exercicio.instrumento === 'violao' && (
        <div className="space-y-3 md:landscape:order-2 md:landscape:col-span-full">
          <ViolaoPixel esperadas={modoMemoria ? [] : posicoesAtuais} proximas={modoMemoria ? [] : posicoesProximas} midiOuvido={concluido ? null : midiAoVivo(leitura)} posicaoOuvida={concluido || !leitura?.temSom ? null : posicaoOuvida} efeito={efeito} />
          {!modoMemoria && <button type="button" onClick={() => setMostrarTablatura((valor) => !valor)} aria-pressed={mostrarTablatura} className={`${BOTAO_CLARO} w-full`}>
            {mostrarTablatura ? 'Ocultar tablatura' : 'Mostrar tablatura'}
          </button>}
          {!modoMemoria && mostrarTablatura && <Tablatura passos={exercicio.passos} indice={indice} />}
        </div>
      )}

      {exercicio.instrumento === 'teclado' && <div className="md:landscape:order-2 md:landscape:col-span-full"><TecladoPixel esperado={modoMemoria ? null : passo.midis.length === 1 ? passo.midis[0] : null} proximas={modoMemoria ? [] : proximos.flatMap(p => p.midis)} dedo={modoMemoria ? undefined : passo.dedo} midiOuvido={concluido || !leitura?.temSom ? null : midiLimpo} midiCorreto={midiLimpo != null && passo.midis.includes(midiLimpo)} efeito={efeito} /></div>}

      {ultimo && (
        <div aria-live="polite" className={`border-4 border-black p-3 ${ultimo.correto ? 'bg-[#d9f7d9] text-[#0f5d1e]' : 'bg-[#ffd9d6] text-[#8f1410]'}`}>
          <p className="text-lg font-black">{ultimo.correto ? 'Certo!' : 'Ainda não'}</p>
          {!modoMemoria && <p className="text-base font-semibold">{ultimo.mensagem}</p>}
          {!modoMemoria && typeof ultimo.desvioCents === 'number' && (
            <p className="text-sm mt-1">Afinação: {ultimo.desvioCents > 0 ? '+' : ''}{Math.round(ultimo.desvioCents)} cents</p>
          )}
        </div>
      )}

      {!modoMemoria && ultimoAtrasoMs !== null && <p className="text-xs text-[#7b5647]">Última nota aprovada: {ultimoAtrasoMs} ms após o ataque</p>}

      {!concluido && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3 text-[#261812]">
            <span className="text-base font-bold">Ouvindo:</span>
            <span className="text-2xl font-black text-right">{textoOuvido(leitura, passo.midis.length > 1)}</span>
          </div>
          <MedidorVolume leitura={leitura} />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:landscape:order-6 md:landscape:col-span-full md:landscape:sticky md:landscape:bottom-0 md:landscape:z-30 md:landscape:bg-[#fff8f6] md:landscape:py-2">
        {!concluido && <button type="button" onClick={() => setPausado(v => !v)} className={BOTAO_LARANJA}>{pausado ? 'Continuar' : 'Pausar'}</button>}
        {!concluido && <button type="button" onClick={() => { if (voltarAoAluno) aoSair(); else { setConcluido(true); escuta.desligar(); } }} className={BOTAO_CLARO}>Encerrar</button>}
        {concluido && <button type="button" onClick={aoSair} className={BOTAO_CLARO}>Voltar à lista</button>}
      </div>

      {!modoMemoria && <ModoTeste leitura={leitura} extra={`Ruído calibrado: ${ruidoDb.toFixed(1)} dB | Passo: ${indice + 1}`} />}
    </div>
  );
}

type EstadoGravacao = 'parada' | 'preparando' | 'gravando';

function Editor({ exercicio, aoFechar }: { exercicio: ExercicioVirtual | null; aoFechar: (salvou: boolean) => void }) {
  const [instrumento, setInstrumento] = useState<Instrumento>(exercicio?.instrumento || 'violao');
  const [titulo, setTitulo] = useState(exercicio?.titulo || '');
  const [descricao, setDescricao] = useState(exercicio?.descricao || '');
  const [bpm, setBpm] = useState(exercicio?.bpm ? String(exercicio.bpm) : '');
  const [passos, setPassos] = useState<PassoExercicio[]>(exercicio?.passos || []);
  const [aba, setAba] = useState<'nota' | 'acorde' | 'gravar' | 'braco'>('nota');
  const [passoSelecionado, setPassoSelecionado] = useState<number | null>(null);
  const [notaSelecionada, setNotaSelecionada] = useState(0);
  const [dedoEscolhido, setDedoEscolhido] = useState(0);
  const [oitava, setOitava] = useState(exercicio?.instrumento === 'teclado' ? 4 : 3);
  const [gravacao, setGravacao] = useState<EstadoGravacao>('parada');
  const [erroGravacao, setErroGravacao] = useState<string | null>(null);
  const [notasGravadas, setNotasGravadas] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const gravacaoIdRef = useRef(0);
  const fixosRef = useRef(new Set(passos.map((_, i) => i)));
  const gravouNotasRef = useRef(false);

  const escuta = useEscuta(() => {
    gravacaoIdRef.current++;
    setGravacao('parada');
    toast.info('Gravação parada porque o app saiu da tela.');
  });
  const { leitura } = escuta;
  useTelaLigada(gravacao !== 'parada');

  const pararGravacao = () => {
    gravacaoIdRef.current++;
    escuta.desligar();
    setGravacao('parada');
    if (gravouNotasRef.current && instrumento === 'violao') {
      setPassos(atuais => otimizarSequencia(atuais, fixosRef.current));
      gravouNotasRef.current = false;
    }
  };

  const gravar = async () => {
    const id = ++gravacaoIdRef.current;
    setErroGravacao(null);
    setNotasGravadas(0);
    setGravacao('preparando');
    try {
      await escuta.ligar(instrumento);
      if (gravacaoIdRef.current !== id) return;
      await escuta.calibrar(2000);
      if (gravacaoIdRef.current !== id) return;

      const capturar = criarCapturaNotas();
      let inicioAnterior: number | null = null;
      let posicaoAnterior: PosicaoViolao | null = passos.length ? posicoesDoPasso(passos[passos.length - 1]).at(-1) ?? null : null;
      escuta.ouvir((l) => {
        const midi = capturar(l);
        if (midi === null) return;
        if (midi < (instrumento === 'violao' ? 40 : 36) || midi > (instrumento === 'violao' ? 88 : 96)) return;
        const posicao = instrumento === 'violao' ? estimarPosicao(midi, posicaoAnterior, l.timbre, lerMapaEscolhido()) : null;
        if (posicao) posicaoAnterior = posicao;
        const duracaoAnterior = inicioAnterior === null ? null : Math.round(l.tempoMs - inicioAnterior);
        setPassos((atuais) => {
          if (atuais.length >= 200) return atuais;
          inicioAnterior = l.tempoMs;
          const copia = [...atuais];
          if (duracaoAnterior !== null && copia.length) {
            copia[copia.length - 1] = { ...copia[copia.length - 1], duracaoMs: duracaoAnterior };
          }
          copia.push({ midis: [midi], rotulo: NOTAS[midi % 12], ...(posicao ? { posicoes: [posicao] } : {}) });
          gravouNotasRef.current = true;
          return copia;
        });
        setNotasGravadas((n) => Math.min(200, n + 1));
      });
      setGravacao('gravando');
    } catch (e) {
      if (gravacaoIdRef.current !== id) return;
      escuta.desligar();
      setGravacao('parada');
      setErroGravacao(mensagemErroMicrofone(e));
    }
  };

  const trocarAba = (nova: typeof aba) => {
    if (gravacao !== 'parada') pararGravacao();
    setAba(nova);
  };

  const trocarInstrumento = (novo: Instrumento) => {
    setInstrumento(novo);
    setOitava(novo === 'teclado' ? 4 : 3);
    setAba('nota');
    setPassoSelecionado(null);
  };

  const adicionarPasso = (passo: PassoExercicio) => {
    if (passos.length >= 200) return toast.error('Limite de 200 passos por exercício.');
    setPassos((atuais) => {
      const anterior = atuais.length ? posicoesDoPasso(atuais[atuais.length - 1]).at(-1) : null;
      const posicoes = instrumento === 'violao' && !passo.posicoes ? passo.midis.map((midi) => estimarPosicao(midi, anterior)).filter((p): p is EstimativaPosicao => p !== null) : passo.posicoes;
      return [...atuais, { ...passo, ...(posicoes?.length === passo.midis.length ? { posicoes } : {}) }];
    });
  };
  const escolherNoBraco = (posicao: PosicaoViolao) => {
    const midi = midiNaPosicao(posicao.corda, posicao.casa);
    if (midi === null) return;
    const comDedo = { ...posicao, dedo: posicao.casa === 0 ? 0 : dedoEscolhido };
    if (passoSelecionado === null) {
      adicionarPasso({ midis: [midi], rotulo: NOTAS[midi % 12], posicoes: [comDedo] });
      fixosRef.current.add(passos.length);
      return;
    }
    fixosRef.current.add(passoSelecionado);
    setPassos((atuais) => atuais.map((passo, i) => {
      if (i !== passoSelecionado) return passo;
      const midis = [...passo.midis];
      midis[notaSelecionada] = midi;
      const posicoes = passo.midis.map((m, n) => n === notaSelecionada ? comDedo : passo.posicoes?.[n] ?? estimarPosicao(m)).filter((p): p is PosicaoViolao => p !== null);
      return { ...passo, midis, posicoes, rotulo: midis.length === 1 ? NOTAS[midi % 12] : passo.rotulo };
    }));
  };
  const alterarDedo = (dedo: number) => {
    setDedoEscolhido(dedo);
    if (passoSelecionado === null) return;
    fixosRef.current.add(passoSelecionado);
    setPassos((atuais) => atuais.map((passo, i) => {
      if (i !== passoSelecionado) return passo;
      const posicoes = passo.midis.map((m, n) => {
        const posicao = passo.posicoes?.[n] ?? estimarPosicao(m);
        return posicao ? { ...posicao, dedo: n === notaSelecionada ? dedo : posicao.dedo } : null;
      });
      return posicoes.every((p) => p !== null) ? { ...passo, posicoes: posicoes as PosicaoViolao[] } : passo;
    }));
  };
  const alterarDica = (indice: number, dica: string) => setPassos((atuais) => atuais.map((p, i) => (i === indice ? { ...p, dica } : p)));
  const removerPasso = (indice: number) => {
    setPassos((atuais) => atuais.filter((_, i) => i !== indice));
    setPassoSelecionado(null);
  };
  const moverPasso = (indice: number, direcao: -1 | 1) => setPassos((atuais) => {
    const copia = [...atuais];
    [copia[indice], copia[indice + direcao]] = [copia[indice + direcao], copia[indice]];
    return copia;
  });

  const salvar = async () => {
    if (!titulo.trim()) return toast.error('Informe o título.');
    if (!passos.length) return toast.error('Adicione pelo menos um passo.');
    if (passos.length > 200) return toast.error('Limite de 200 passos por exercício.');
    const minimo = instrumento === 'violao' ? 40 : 36;
    const maximo = instrumento === 'violao' ? 88 : 96;
    if (passos.some((p) => p.midis.length < 1 || p.midis.length > 8 || p.midis.some((m) => !Number.isInteger(m) || m < minimo || m > maximo))) {
      return toast.error(`As notas MIDI do ${nomeInstrumento(instrumento)} devem estar entre ${minimo} e ${maximo}, até 8 por passo.`);
    }
    if (gravacao !== 'parada') pararGravacao();
    setSalvando(true);
    try {
      const corpo = { titulo, instrumento, descricao, bpm: bpm ? Number(bpm) : null, passos };
      // O fetch global do main.tsx descarta headers vindos como objeto Headers (o caso do apiFetch);
      // com Blob o tipo application/json vai no próprio corpo.
      const res = await apiFetch(exercicio?.id ? `/api/exercicios-virtuais/${exercicio.id}` : '/api/exercicios-virtuais', {
        method: exercicio?.id ? 'PUT' : 'POST',
        body: new Blob([JSON.stringify(corpo)], { type: 'application/json' }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.error || 'Erro ao salvar o exercício.');
      toast.success('Exercício salvo!');
      aoFechar(true);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black uppercase text-[#261812]">{exercicio ? 'Editar exercício' : 'Novo exercício'}</h2>

      <div className="grid grid-cols-2 gap-3">
        {INSTRUMENTOS.map((i) => (
          <button key={i.valor} type="button" disabled={gravacao !== 'parada'} onClick={() => trocarInstrumento(i.valor)} className={instrumento === i.valor ? BOTAO_LARANJA : BOTAO_CLARO}>
            {i.nome}
          </button>
        ))}
      </div>

      <div>
        <label className={ROTULO} htmlFor="pv-titulo">Título</label>
        <input id="pv-titulo" className={CAMPO} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </div>
      <div>
        <label className={ROTULO} htmlFor="pv-descricao">Descrição (opcional)</label>
        <textarea id="pv-descricao" rows={2} className={CAMPO} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </div>
      <div>
        <label className={ROTULO} htmlFor="pv-bpm">BPM (opcional)</label>
        <input id="pv-bpm" type="number" inputMode="numeric" min={1} className={CAMPO} value={bpm} onChange={(e) => setBpm(e.target.value)} />
      </div>

      <div className={CARTAO}>
        <div className={`grid ${instrumento === 'violao' ? 'grid-cols-4' : 'grid-cols-3'} gap-1 mb-4`}>
          {([['nota', 'Nota'], ['acorde', 'Acorde'], ['gravar', 'Gravar'], ...(instrumento === 'violao' ? [['braco', 'Braço'] as const] : [])] as const).map(([valor, nome]) => (
            <button key={valor} type="button" onClick={() => trocarAba(valor)} className={`min-h-12 border-4 border-black font-black uppercase text-sm ${aba === valor ? 'bg-[#261812] text-white' : 'bg-white text-[#261812]'}`}>
              {nome}
            </button>
          ))}
        </div>

        {aba === 'nota' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-bold">Oitava</span>
              <div className="flex items-center gap-3">
                <button type="button" aria-label="Oitava abaixo" disabled={oitava <= 1} onClick={() => setOitava(oitava - 1)} className={BOTAO_ICONE}><ArrowDown className="w-5 h-5" /></button>
                <span className="text-2xl font-black w-6 text-center">{oitava}</span>
                <button type="button" aria-label="Oitava acima" disabled={oitava >= 7} onClick={() => setOitava(oitava + 1)} className={BOTAO_ICONE}><ArrowUp className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {NOTAS.map((nota, classe) => (
                <button key={nota} type="button" disabled={(oitava + 1) * 12 + classe < (instrumento === 'violao' ? 40 : 36) || (oitava + 1) * 12 + classe > (instrumento === 'violao' ? 88 : 96)} onClick={() => adicionarPasso({ midis: [(oitava + 1) * 12 + classe], rotulo: nota })} className={`min-h-12 border-2 border-black font-black text-base active:translate-y-0.5 disabled:opacity-30 ${nota.includes('#') ? 'bg-[#261812] text-white' : 'bg-[#fff1eb] text-[#261812]'}`}>
                  {nota}
                </button>
              ))}
            </div>
          </div>
        )}

        {aba === 'acorde' && (
          <div className="grid grid-cols-3 gap-2">
            {Object.keys(ACORDES).map((nome) => (
              <button key={nome} type="button" onClick={() => adicionarPasso({ midis: midisDoAcorde(nome, instrumento), rotulo: nome })} className="min-h-14 p-1 border-2 border-black bg-[#fff1eb] text-[#261812] active:translate-y-0.5">
                <span className="block text-lg font-black leading-tight">{nome}</span>
                <span className="block text-xs font-semibold leading-tight">{notasDoAcorde(nome)}</span>
              </button>
            ))}
          </div>
        )}

        {aba === 'gravar' && (
          <div className="space-y-3">
            {erroGravacao && <AvisoErro>{erroGravacao}</AvisoErro>}
            {gravacao === 'parada' && (
              <>
                <p className="text-base">Toque uma nota de cada vez: cada nota sustentada vira um passo. Acordes entram pela aba Acorde.</p>
                <button type="button" onClick={gravar} className={`${BOTAO_LARANJA} w-full`}><Mic className="w-5 h-5" /> Gravar tocando</button>
              </>
            )}
            {gravacao === 'preparando' && <p className="text-lg font-black">Fique em silêncio por 2 segundos...</p>}
            {gravacao === 'gravando' && (
              <>
                <p className="text-lg font-black">Pode tocar. {notasGravadas} {notasGravadas === 1 ? 'nota gravada' : 'notas gravadas'}.</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-bold">Ouvindo:</span>
                  <span className="text-2xl font-black">{textoOuvido(leitura, false)}</span>
                </div>
                <MedidorVolume leitura={leitura} />
              </>
            )}
            {gravacao !== 'parada' && (
              <button type="button" onClick={pararGravacao} className={`${BOTAO_CLARO} w-full`}><Square className="w-5 h-5" /> Parar gravação</button>
            )}
          </div>
        )}
        {instrumento === 'violao' && (aba === 'braco' || aba === 'gravar') && (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-bold">{passoSelecionado === null ? 'Toque no braço para adicionar um passo.' : `Corrigindo passo ${passoSelecionado + 1}, nota ${notaSelecionada + 1}. Toque na corda e casa desejadas.`}</p>
            {passoSelecionado !== null && (passos[passoSelecionado]?.midis.length ?? 0) > 1 && (
              <div className="flex flex-wrap gap-2">
                {passos[passoSelecionado].midis.map((midi, i) => <button key={i} type="button" onClick={() => { setNotaSelecionada(i); setDedoEscolhido(passos[passoSelecionado].posicoes?.[i]?.dedo ?? 0); }} className={`${BOTAO_ICONE} ${notaSelecionada === i ? 'bg-[#ffcc22]' : ''}`} aria-label={`Corrigir nota ${i + 1}: ${nomeMidi(midi)}`}>{i + 1}</button>)}
              </div>
            )}
            <div className="flex items-center flex-wrap gap-2 text-sm font-black">
              <span>Dedo:</span>
              {[0, 1, 2, 3, 4].map((dedo) => <button key={dedo} type="button" onClick={() => alterarDedo(dedo)} aria-pressed={dedoEscolhido === dedo} className={`${BOTAO_ICONE} ${dedoEscolhido === dedo ? 'bg-[#ffcc22]' : ''}`}>{dedo}</button>)}
            </div>
            <ViolaoPixel
              esperadas={passoSelecionado === null ? [] : posicoesDoPasso(passos[passoSelecionado])}
              midiOuvido={gravacao === 'gravando' ? midiAoVivo(leitura) : null}
              aoEscolher={escolherNoBraco}
            />
            {passoSelecionado !== null && <button type="button" onClick={() => setPassoSelecionado(null)} className={BOTAO_CLARO}>Adicionar novo passo</button>}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-black uppercase text-[#261812] mb-2">Passos ({passos.length})</h3>
        {passos.length === 0 && <p className="text-base text-[#261812]">Nenhum passo ainda.</p>}
        <ol className="space-y-3">
          {passos.map((passo, i) => (
            <li key={i} className={`bg-white text-[#261812] border-2 p-2 space-y-2 ${passoSelecionado === i ? 'border-[#ff6b00]' : 'border-black'}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold w-6 shrink-0">{i + 1}.</span>
                <button type="button" onClick={() => { if (instrumento === 'violao') { if (gravacao !== 'parada') pararGravacao(); setPassoSelecionado(i); setNotaSelecionada(0); setDedoEscolhido(passo.posicoes?.[0]?.dedo ?? 0); setAba('braco'); } }} disabled={instrumento !== 'violao'} className="min-w-0 flex-1 text-left" aria-label={`Corrigir posição do passo ${i + 1}`}>
                  <p className="text-lg font-black leading-tight truncate">{rotuloPasso(passo)}</p>
                  <p className="text-xs font-semibold truncate">{passo.midis.map(nomeMidi).join(' ')}</p>
                  {instrumento === 'teclado' && <label className="text-xs font-bold">Dedo direito <select value={passo.dedo ?? 0} onChange={e => setPassos(atuais => atuais.map((p, j) => j === i ? { ...p, dedo: Number(e.target.value) || undefined } : p))} className="border-2 border-black bg-white px-2 py-1">{[0,1,2,3,4,5].map(d => <option key={d} value={d}>{d || '—'}</option>)}</select></label>}
                  {instrumento === 'violao' && <p className="text-xs font-bold">{posicoesDoPasso(passo).map((p) => `${p.corda}ª/${p.casa}${p.dedo !== undefined ? ` dedo ${p.dedo}` : ''}`).join(' · ') || 'Sem posição no braço'}</p>}
                </button>
                <button type="button" aria-label="Mover para cima" disabled={i === 0} onClick={() => moverPasso(i, -1)} className={BOTAO_ICONE}><ArrowUp className="w-5 h-5" /></button>
                <button type="button" aria-label="Mover para baixo" disabled={i === passos.length - 1} onClick={() => moverPasso(i, 1)} className={BOTAO_ICONE}><ArrowDown className="w-5 h-5" /></button>
                <button type="button" aria-label="Remover passo" onClick={() => removerPasso(i)} className={BOTAO_ICONE}><X className="w-5 h-5" /></button>
              </div>
              <input aria-label={`Dica do passo ${i + 1}`} placeholder="Dica (opcional)" className="w-full min-h-11 px-2 border-2 border-black bg-white text-[#261812] text-base" value={passo.dica || ''} onChange={(e) => alterarDica(i, e.target.value)} />
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => aoFechar(false)} className={BOTAO_CLARO}>Cancelar</button>
        <button type="button" disabled={salvando} onClick={salvar} className={BOTAO_LARANJA}>{salvando ? 'Salvando...' : 'Salvar'}</button>
      </div>
      <ModoTeste leitura={leitura} />
    </div>
  );
}

type Tela =
  | { nome: 'lista' }
  | { nome: 'mapa_preparo' }
  | { nome: 'mapa' }
  | { nome: 'calibracao'; exercicio: ExercicioVirtual; diagnosticoInicial?: boolean }
  | { nome: 'afinacao'; exercicio: ExercicioVirtual; ruidoDb: number; diagnosticoInicial?: boolean }
  | { nome: 'treino'; exercicio: ExercicioVirtual; ruidoDb: number; diagnosticoInicial?: boolean }
  | { nome: 'editor'; exercicio: ExercicioVirtual | null };

export default function ProfessorVirtual() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const filtroInstrumento = params.get('instrumento') === 'teclado' || params.get('instrumento') === 'violao' ? params.get('instrumento') : 'todos';
  const [tela, setTela] = useState<Tela>({ nome: 'lista' });
  const [calibracao, setCalibracao] = useState<Calibracao>({ estado: 'pedindo' });
  const [exercicios, setExercicios] = useState<ExercicioVirtual[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [falhaLista, setFalhaLista] = useState(false);
  const [erroMicrofone, setErroMicrofone] = useState<string | null>(null);
  const [tonicaEscala, setTonicaEscala] = useState(0);
  const [cordaRaizEscala, setCordaRaizEscala] = useState<3 | 4 | 5 | 6>(5);
  const [sentidoEscala, setSentidoEscala] = useState<'subir' | 'descer' | 'subir_descer'>('subir');
  const [salvandoEscala, setSalvandoEscala] = useState(false);
  const [tonicaTeclado, setTonicaTeclado] = useState(0);
  const [tipoTeclado, setTipoTeclado] = useState<TipoEscalaTeclado>('maior');
  const [oitavasTeclado, setOitavasTeclado] = useState(1);
  const [modeloTeclado, setModeloTeclado] = useState<'escala' | 'hanon'>('escala');
  const [maoTeclado, setMaoTeclado] = useState<MaoTeclado>('direita');
  const [metaMinutos, setMetaMinutos] = useState(5);
  const sessaoRef = useRef(0);

  const escuta = useEscuta(() => {
    sessaoRef.current++;
    setTela({ nome: 'lista' });
    toast.info('Treino interrompido porque o app saiu da tela.');
  });

  const podeEditar = user?.role === 'admin' || user?.role === 'professor';

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await apiFetch('/api/exercicios-virtuais');
      const dados = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(dados)) throw new Error(dados?.error);
      setExercicios(dados);
      setFalhaLista(false);
    } catch {
      setExercicios([]);
      setFalhaLista(true);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const sair = () => {
    sessaoRef.current++;
    escuta.desligar();
    setTela({ nome: 'lista' });
  };

  const falhou = (sessao: number, erro: unknown) => {
    if (sessaoRef.current !== sessao) return;
    sair();
    setErroMicrofone(mensagemErroMicrofone(erro));
  };

  const medirAmbiente = async (sessao: number) => {
    setCalibracao({ estado: 'medindo' });
    const medida = await escuta.calibrar(CALIBRACAO_MS);
    if (sessaoRef.current === sessao) setCalibracao({ estado: 'pronta', ...medida });
  };

  const comecar = async (exercicio: ExercicioVirtual, diagnosticoInicial = false) => {
    const sessao = ++sessaoRef.current;
    setErroMicrofone(null);
    setCalibracao({ estado: 'pedindo' });
    setTela({ nome: 'calibracao', exercicio, diagnosticoInicial });
    try {
      await escuta.ligar(exercicio.instrumento);
      if (sessaoRef.current === sessao) await medirAmbiente(sessao);
    } catch (e) {
      falhou(sessao, e);
    }
  };

  const abrirMapa = async () => {
    const sessao = ++sessaoRef.current;
    setErroMicrofone(null);
    setTela({ nome: 'mapa_preparo' });
    try {
      await escuta.ligar('violao');
      if (sessaoRef.current === sessao) {
        await escuta.calibrar(CALIBRACAO_MS);
        if (sessaoRef.current === sessao) setTela({ nome: 'mapa' });
      }
    } catch (e) { falhou(sessao, e); }
  };

  const medirDeNovo = () => {
    const sessao = sessaoRef.current;
    medirAmbiente(sessao).catch((e) => falhou(sessao, e));
  };

  const aposCalibracao = (exercicio: ExercicioVirtual, ruidoDb: number, diagnosticoInicial?: boolean) => {
    setTela(exercicio.instrumento === 'violao'
      ? { nome: 'afinacao', exercicio, ruidoDb, diagnosticoInicial }
      : { nome: 'treino', exercicio, ruidoDb, diagnosticoInicial });
  };

  const desativar = async (exercicio: ExercicioVirtual) => {
    if (!window.confirm(`Desativar o exercício "${exercicio.titulo}"?`)) return;
    try {
      const res = await apiFetch(`/api/exercicios-virtuais/${exercicio.id}`, { method: 'DELETE' });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.error || 'Erro ao desativar.');
      toast.success('Exercício desativado.');
      carregar();
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const escalaAtual = gerarEscala({ tonica: tonicaEscala, cordaRaiz: cordaRaizEscala, modo: 'jonio', sentido: sentidoEscala });
  const exercicioTeclado = modeloTeclado === 'hanon' ? gerarHanon({ tonica: tonicaTeclado, tipo: tipoTeclado, mao: maoTeclado }) : gerarEscalaTeclado({ tonica: tonicaTeclado, tipo: tipoTeclado, oitavas: oitavasTeclado, mao: maoTeclado });
  const salvarEscala = async (exercicio: ExercicioVirtual) => {
    setSalvandoEscala(true);
    try {
      const res = await apiFetch('/api/exercicios-virtuais', {
        method: 'POST',
        body: new Blob([JSON.stringify(exercicio)], { type: 'application/json' }),
      });
      const dados = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dados.error || 'Erro ao salvar a escala.');
      toast.success('Escala salva como exercício.');
      carregar();
    } catch (erro: any) { toast.error(erro.message); }
    finally { setSalvandoEscala(false); }
  };

  const alunoNome = params.get('aluno')?.trim();
  const alunoId = params.get('alunoId');
  const voltarAoApp = () => navigate(alunoId ? `/area-professor?alunoTreino=${encodeURIComponent(alunoId)}` : user?.role === 'professor' ? '/area-professor' : '/');
  const sairOuVoltar = () => { if (alunoId) { escuta.desligar(); voltarAoApp(); } else sair(); };

  const mostrandoExemplos = exercicios.length === 0;
  const lista = [...exercicios, ...EXEMPLOS];

  return (
    <div className="min-h-[100dvh] bg-[#fff8f6] text-[#261812] font-sans">
      <header className="bg-[#ff6b00] border-b-4 border-black px-4 pb-3" style={{ paddingTop: 'max(env(safe-area-inset-top), 0.75rem)' }}>
        <div className="max-w-xl md:max-w-6xl mx-auto flex items-center gap-3">
          <button type="button" aria-label="Voltar" onClick={tela.nome === 'lista' ? voltarAoApp : sairOuVoltar} className={BOTAO_ICONE}><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-xl font-black uppercase text-black leading-tight">{alunoNome ? `Treino de ${alunoNome}` : 'Professor Virtual'}</h1>
        </div>
      </header>
      <p className="bg-black text-white text-center text-sm font-black uppercase tracking-wide py-1.5 px-4">
        Modo de teste: só a equipe vê esta tela
      </p>

      <main className="max-w-xl md:max-w-6xl mx-auto px-4 py-5 pb-10 space-y-5">
        {tela.nome === 'mapa_preparo' && <div className={CARTAO}><p className="text-xl font-black">Preparando microfone</p><p>Fique em silêncio por alguns segundos.</p></div>}
        {tela.nome === 'mapa' && <TelaMapaViolao escuta={escuta} aoSair={sair} />}
        {tela.nome === 'calibracao' && (
          <TelaCalibracao
            calibracao={calibracao}
            leitura={escuta.leitura}
            aoRepetir={medirDeNovo}
            aoContinuar={() => calibracao.estado === 'pronta' && aposCalibracao(tela.exercicio, calibracao.ruidoDb, tela.diagnosticoInicial)}
          />
        )}

        {tela.nome === 'afinacao' && (
          <TelaAfinacao leitura={escuta.leitura} aoContinuar={() => setTela({ nome: 'treino', exercicio: tela.exercicio, ruidoDb: tela.ruidoDb, diagnosticoInicial: tela.diagnosticoInicial })} />
        )}

        {tela.nome === 'treino' && <TelaTreino exercicio={tela.exercicio} escuta={escuta} ruidoDb={tela.ruidoDb} diagnosticoInicial={tela.diagnosticoInicial} aoSair={sairOuVoltar} aoReiniciar={() => comecar(tela.exercicio)} metaMinutos={metaMinutos} voltarAoAluno={!!alunoId} />}

        {tela.nome === 'editor' && (
          <Editor
            exercicio={tela.exercicio}
            aoFechar={(salvou) => {
              setTela({ nome: 'lista' });
              if (salvou) carregar();
            }}
          />
        )}

        {tela.nome === 'lista' && (
          <>
            {erroMicrofone && <AvisoErro>{erroMicrofone}</AvisoErro>}
            {falhaLista && <AvisoErro>Não foi possível carregar os exercícios da escola. Mostrando os exemplos.</AvisoErro>}
            {podeEditar && (
              <>
                <button type="button" onClick={abrirMapa} className={`${BOTAO_LARANJA} w-full`}>Calibrar violão · Testar mapa</button>
                <button type="button" onClick={() => setTela({ nome: 'editor', exercicio: null })} className={`${BOTAO_CLARO} w-full`}>
                  <Plus className="w-5 h-5" /> Novo exercício
                </button>
              </>
            )}
            <section className={CARTAO}><h2 className="font-black uppercase">Meta de tempo antes de começar</h2><div className="flex flex-wrap gap-2 my-2">{[3,4,5,10].map(m => <button key={m} type="button" onClick={() => setMetaMinutos(m)} className={`${BOTAO_ICONE} ${metaMinutos === m ? 'bg-[#ffcc22]' : ''}`}>{m}</button>)}</div><label className="font-bold">Minutos (1 a 30) <input type="number" min={1} max={30} value={metaMinutos} onChange={e => setMetaMinutos(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} className="w-20 border-2 border-black p-2" /></label></section>
            <div className="flex gap-2">{['todos','violao','teclado'].map(valor => <button key={valor} type="button" onClick={() => setParams(prev => { const next = new URLSearchParams(prev); if (valor === 'todos') next.delete('instrumento'); else next.set('instrumento', valor); return next; })} className={filtroInstrumento === valor ? BOTAO_LARANJA : BOTAO_CLARO}>{valor === 'todos' ? 'Todos' : valor === 'violao' ? 'Violão' : 'Teclado'}</button>)}</div>
            {carregando ? (
              <p className="text-base font-bold">Carregando exercícios...</p>
            ) : (
              <>
                {filtroInstrumento !== 'teclado' && <section className={CARTAO}>
                  <h2 className="text-2xl font-black uppercase">Escalas · violão</h2>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <label className="font-bold">Tônica<select value={tonicaEscala} onChange={e => setTonicaEscala(Number(e.target.value))} className="block w-full border-2 border-black p-2 bg-white">{NOTAS.map((nota, i) => <option key={i} value={i}>{nota}</option>)}</select></label>
                    <label className="font-bold">Corda raiz<select value={cordaRaizEscala} onChange={e => setCordaRaizEscala(Number(e.target.value) as 3 | 4 | 5 | 6)} className="block w-full border-2 border-black p-2 bg-white">{[6, 5, 4, 3].map(corda => <option key={corda} value={corda}>{corda}ª corda</option>)}</select></label>
                    <label className="font-bold col-span-2">Sentido<select value={sentidoEscala} onChange={e => setSentidoEscala(e.target.value as typeof sentidoEscala)} className="block w-full border-2 border-black p-2 bg-white"><option value="subir">Subir</option><option value="descer">Descer</option><option value="subir_descer">Subir e descer</option></select></label>
                  </div>
                  <button type="button" onClick={() => comecar(escalaAtual)} className={`${BOTAO_LARANJA} w-full mt-3`}>Começar</button>
                  {podeEditar && <button type="button" disabled={salvandoEscala} onClick={() => salvarEscala(escalaAtual)} className={`${BOTAO_CLARO} w-full mt-3`}>{salvandoEscala ? 'Salvando...' : 'Salvar como exercício'}</button>}
                </section>}
                {filtroInstrumento !== 'violao' && <section className={CARTAO}>
                  <h2 className="text-2xl font-black uppercase">Escalas e Hanon · teclado</h2>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <label className="font-bold">Exercício<select value={modeloTeclado} onChange={e => setModeloTeclado(e.target.value as 'escala' | 'hanon')} className={CAMPO}><option value="escala">Escala</option><option value="hanon">Hanon</option></select></label>
                    <label className="font-bold">Tônica<select value={tonicaTeclado} onChange={e => setTonicaTeclado(Number(e.target.value))} className={CAMPO}>{NOTAS.map((_, i) => <option key={i} value={i}>{nomeTonicaTeclado(i, tipoTeclado)}</option>)}</select></label>
                    <label className="font-bold">Mão<select value={maoTeclado} onChange={e => setMaoTeclado(e.target.value as MaoTeclado)} className={CAMPO}><option value="direita">Direita</option><option value="esquerda">Esquerda</option></select></label>
                    <label className="font-bold">Tipo<select value={tipoTeclado} onChange={e => setTipoTeclado(e.target.value as TipoEscalaTeclado)} className={CAMPO}>{TIPOS_ESCALA_TECLADO.filter(t => t.valor === 'maior' || t.valor === 'menor_natural').map(t => <option key={t.valor} value={t.valor}>{t.nome}</option>)}</select></label>{modeloTeclado === 'escala' && <label className="font-bold">Oitavas<select value={oitavasTeclado} onChange={e => setOitavasTeclado(Number(e.target.value))} className={CAMPO}>{[1,2].map(n => <option key={n} value={n}>{n}</option>)}</select></label>}
                  </div>
                  <button type="button" onClick={() => comecar(exercicioTeclado)} className={`${BOTAO_LARANJA} w-full mt-3`}>Começar</button>
                  {podeEditar && <button type="button" disabled={salvandoEscala} onClick={() => salvarEscala(exercicioTeclado)} className={`${BOTAO_CLARO} w-full mt-3`}>{salvandoEscala ? 'Salvando...' : 'Salvar como exercício'}</button>}
                </section>}
                {mostrandoExemplos && !falhaLista && <p className="text-base font-semibold">Ainda não há exercícios cadastrados. Use os exemplos para testar.</p>}
                {INSTRUMENTOS.map(({ valor, nome }) => {
                  if (filtroInstrumento !== 'todos' && filtroInstrumento !== valor) return null;
                  const doInstrumento = lista.filter((e) => e.instrumento === valor);
                  if (!doInstrumento.length) return null;
                  return (
                    <section key={valor} className="space-y-4 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4 md:space-y-0">
                      <h2 className="text-2xl font-black uppercase text-[#261812] md:col-span-full">{nome}</h2>
                      {doInstrumento.map((exercicio) => (
                        <article key={exercicio.id ?? exercicio.titulo} className={CARTAO}>
                          <h3 className="text-xl font-black leading-tight">{exercicio.titulo}</h3>
                          {exercicio.descricao && <p className="text-base mt-1">{exercicio.descricao}</p>}
                          <p className="text-sm font-bold text-[#7b5647] mt-1">
                            {exercicio.passos.length} {exercicio.passos.length === 1 ? 'passo' : 'passos'}
                            {exercicio.bpm ? ` | ${exercicio.bpm} BPM` : ''}
                            {exercicio.id ? '' : ' | exemplo'}
                          </p>
                          <button type="button" onClick={() => comecar(exercicio)} className={`${BOTAO_LARANJA} w-full mt-3`} aria-label={`Começar ${exercicio.titulo} no ${nomeInstrumento(exercicio.instrumento)}`}>
                            <Play className="w-5 h-5" /> Começar
                          </button>
                          <button type="button" onClick={() => comecar(exercicio, true)} className={`${BOTAO_CLARO} w-full mt-3`}>Gravar diagnóstico e começar</button>
                          {podeEditar && exercicio.id && (
                            <div className="grid grid-cols-2 gap-3 mt-3">
                              <button type="button" onClick={() => setTela({ nome: 'editor', exercicio })} className={BOTAO_CLARO}><Pencil className="w-4 h-4" /> Editar</button>
                              <button type="button" onClick={() => desativar(exercicio)} className={BOTAO_CLARO}><Trash2 className="w-4 h-4" /> Desativar</button>
                            </div>
                          )}
                        </article>
                      ))}
                    </section>
                  );
                })}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
