// Análise de áudio pura: recebe amostras + sampleRate, sem Web Audio, para rodar também em Node.

import type { LeituraAudio, TimbreViolao } from './types';

export const FREQ_MIN_HZ = 60;
export const FREQ_MAX_HZ = 2000;
export const PISO_DB = -120;

export const NOMES_NOTAS = ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si'];

export const classeDaNota = (midi: number) => ((Math.round(midi) % 12) + 12) % 12;
export const nomeNota = (midi: number) => NOMES_NOTAS[classeDaNota(midi)];
export const frequenciaParaMidi = (hz: number) => 69 + 12 * Math.log2(hz / 440);
export const midiParaFrequencia = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

const proximaPotencia2 = (n: number) => {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
};

/** Janela longa (croma): ~170 ms a 48 kHz, para separar semitons nos graves do violão. */
export const tamanhoJanelaAnalise = (sampleRate: number) =>
  Math.min(32768, Math.max(4096, proximaPotencia2(sampleRate * 0.16)));
/** Janela do pitch: ~85 ms a 48 kHz, 7 períodos do Mi grave (82 Hz). */
export const tamanhoJanelaPitch = (sampleRate: number) => Math.min(4096, Math.max(2048, proximaPotencia2(sampleRate * 0.08)));
/** Janela curta (nível e ataque): ~43 ms a 48 kHz, para o ataque não se espalhar por vários quadros. */
export const tamanhoJanelaCurta = (sampleRate: number) => Math.max(512, proximaPotencia2(sampleRate * 0.04));

// --- FFT ---

interface PlanoFft {
  n: number;
  cos: Float64Array;
  sen: Float64Array;
  inverte: Uint32Array;
  re: Float64Array;
  im: Float64Array;
}

// Os buffers ficam no plano para não gerar lixo a ~30 quadros/s no celular.
const planos = new Map<number, PlanoFft>();
const janelasHann = new Map<number, Float64Array>();

function planoFft(n: number): PlanoFft {
  let plano = planos.get(n);
  if (plano) return plano;
  const cos = new Float64Array(n / 2);
  const sen = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / n);
    sen[i] = Math.sin((2 * Math.PI * i) / n);
  }
  const bits = Math.log2(n);
  const inverte = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) if (i & (1 << b)) r |= 1 << (bits - 1 - b);
    inverte[i] = r;
  }
  plano = { n, cos, sen, inverte, re: new Float64Array(n), im: new Float64Array(n) };
  planos.set(n, plano);
  return plano;
}

function fft({ n, cos, sen, inverte, re, im }: PlanoFft) {
  for (let i = 0; i < n; i++) {
    const j = inverte[i];
    if (j > i) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let tam = 2; tam <= n; tam <<= 1) {
    const meio = tam >> 1;
    const salto = n / tam;
    for (let inicio = 0; inicio < n; inicio += tam) {
      for (let j = 0, k = 0; j < meio; j++, k += salto) {
        const a = inicio + j;
        const b = a + meio;
        const tr = re[b] * cos[k] + im[b] * sen[k];
        const ti = im[b] * cos[k] - re[b] * sen[k];
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
}

function janelaHann(n: number) {
  let janela = janelasHann.get(n);
  if (!janela) {
    janela = new Float64Array(n);
    for (let i = 0; i < n; i++) janela[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
    janelasHann.set(n, janela);
  }
  return janela;
}

/** Aplica Hann, faz a FFT e deixa a magnitude em plano.re (metade útil: 0..n/2). */
function espectro(amostras: Float32Array): PlanoFft {
  const n = amostras.length;
  const plano = planoFft(proximaPotencia2(n));
  const hann = janelaHann(n);
  plano.re.fill(0);
  plano.im.fill(0);
  for (let i = 0; i < n; i++) plano.re[i] = amostras[i] * hann[i];
  fft(plano);
  for (let i = 0; i <= plano.n / 2; i++) plano.re[i] = Math.sqrt(plano.re[i] * plano.re[i] + plano.im[i] * plano.im[i]);
  return plano;
}

/** Uma FFT por ataque, sobre trecho já estabilizado da nota. */
export function extrairTimbre(amostras: Float32Array, sampleRate: number, fundamentalHz: number): TimbreViolao | null {
  if (!Number.isFinite(fundamentalHz) || fundamentalHz <= 0 || amostras.length < 2048) return null;
  const plano = espectro(amostras);
  const mag = plano.re;
  const hzBin = sampleRate / plano.n;
  const amps: number[] = [];
  let soma = 0;
  let somaFreq = 0;
  let somaDesvio = 0;
  let pesoDesvio = 0;
  for (let h = 1; h <= 10; h++) {
    const centro = h * fundamentalHz / hzBin;
    if (centro >= plano.n / 2 - 2) { amps.push(0); continue; }
    const alcance = Math.max(2, Math.ceil(centro * 0.018));
    let bin = Math.max(2, Math.round(centro) - alcance);
    const fim = Math.min(plano.n / 2 - 2, Math.round(centro) + alcance);
    for (let i = bin + 1; i <= fim; i++) if (mag[i] > mag[bin]) bin = i;
    const amp = mag[bin];
    amps.push(amp);
    if (amp <= 0) continue;
    const a = Math.log(mag[bin - 1] + 1e-12);
    const b = Math.log(amp + 1e-12);
    const c = Math.log(mag[bin + 1] + 1e-12);
    const curva = a - 2 * b + c;
    const ajuste = curva ? Math.max(-0.5, Math.min(0.5, 0.5 * (a - c) / curva)) : 0;
    const hz = (bin + ajuste) * hzBin;
    soma += amp;
    somaFreq += amp * hz;
    if (h > 1) {
      const cents = 1200 * Math.log2(hz / (h * fundamentalHz));
      somaDesvio += amp * cents * cents;
      pesoDesvio += amp;
    }
  }
  const maior = Math.max(...amps);
  if (maior < 1e-8 || soma <= 0) return null;
  return {
    harmonicosDb: amps.map(amp => Math.max(-60, 20 * Math.log10(Math.max(amp, maior * 0.001) / maior))),
    centroideRelativo: somaFreq / soma / fundamentalHz,
    inharmonicidadeCents: Math.sqrt(somaDesvio / Math.max(pesoDesvio, 1e-9)),
  };
}

// --- Nível ---

export function rmsDb(amostras: Float32Array): number {
  if (amostras.length === 0) return PISO_DB;
  let soma = 0;
  for (let i = 0; i < amostras.length; i++) soma += amostras[i] * amostras[i];
  const rms = Math.sqrt(soma / amostras.length);
  return rms > 1e-6 ? Math.max(PISO_DB, 20 * Math.log10(rms)) : PISO_DB;
}

// --- Pitch (McLeod / MPM) ---

export interface OpcoesPitch {
  freqMinHz?: number;
  freqMaxHz?: number;
  /** Fração do maior pico da NSDF que um pico anterior precisa ter para ganhar. Mais alto = menos erro de oitava acima. */
  limiarPico?: number;
  /** Abaixo disto não há nota definida (ruído, acorde, fala). */
  clarezaMinima?: number;
}

export interface ResultadoPitch {
  frequencia: number;
  midi: number;
  /** Altura do pico da NSDF, de 0 a 1. */
  clareza: number;
}

export function detectarPitch(
  amostras: Float32Array,
  sampleRate: number,
  opcoes: OpcoesPitch = {},
): ResultadoPitch | null {
  const { freqMinHz = FREQ_MIN_HZ, freqMaxHz = FREQ_MAX_HZ, limiarPico = 0.93, clarezaMinima = 0.5 } = opcoes;
  const n = amostras.length;
  const tauMax = Math.min(Math.ceil(sampleRate / freqMinHz) + 1, n >> 1);
  const tauMin = Math.max(2, Math.floor(sampleRate / freqMaxHz) - 1);
  if (tauMax <= tauMin + 2) return null;

  let media = 0;
  for (let i = 0; i < n; i++) media += amostras[i];
  media /= n;

  // Autocorrelação pela FFT, com zeros suficientes para não dar a volta nos atrasos usados.
  const plano = planoFft(proximaPotencia2(n + tauMax + 1));
  const { re, im } = plano;
  re.fill(0);
  im.fill(0);
  let energia = 0;
  for (let i = 0; i < n; i++) {
    re[i] = amostras[i] - media;
    energia += re[i] * re[i];
  }
  if (energia < 1e-10) return null;
  const centrada = re.slice(0, n);
  fft(plano);
  for (let i = 0; i < plano.n; i++) {
    re[i] = re[i] * re[i] + im[i] * im[i];
    im[i] = 0;
  }
  fft(plano);

  const nsdf = new Float64Array(tauMax + 1);
  let m = 2 * energia;
  nsdf[0] = 1;
  for (let tau = 1; tau <= tauMax; tau++) {
    m -= centrada[n - tau] * centrada[n - tau] + centrada[tau - 1] * centrada[tau - 1];
    nsdf[tau] = m > 1e-12 ? (2 * re[tau]) / plano.n / m : 0;
  }

  // Um pico por lóbulo positivo, a partir do primeiro cruzamento por zero.
  const picos: number[] = [];
  let tau = 1;
  while (tau <= tauMax && nsdf[tau] > 0) tau++;
  let melhor = -1;
  for (; tau < tauMax; tau++) {
    if (nsdf[tau] <= 0) {
      if (melhor >= 0) picos.push(melhor);
      melhor = -1;
    } else if (
      tau >= tauMin &&
      nsdf[tau] >= nsdf[tau - 1] &&
      nsdf[tau] > nsdf[tau + 1] &&
      (melhor < 0 || nsdf[tau] > nsdf[melhor])
    ) {
      melhor = tau;
    }
  }
  if (melhor >= 0) picos.push(melhor);
  if (picos.length === 0) return null;

  let maior = 0;
  for (const p of picos) maior = Math.max(maior, nsdf[p]);
  const escolhido = picos.find(p => nsdf[p] >= limiarPico * maior) ?? picos[0];

  const a = nsdf[escolhido - 1];
  const b = nsdf[escolhido];
  const c = nsdf[escolhido + 1];
  const curva = a - 2 * b + c;
  const ajuste = curva !== 0 ? (0.5 * (a - c)) / curva : 0;
  const clareza = Math.min(1, b - 0.25 * (a - c) * ajuste);
  if (clareza < clarezaMinima) return null;

  const frequencia = sampleRate / (escolhido + ajuste);
  if (frequencia < freqMinHz * 0.97 || frequencia > freqMaxHz * 1.03) return null;
  return { frequencia, midi: frequenciaParaMidi(frequencia), clareza };
}

// --- Cromagrama ---

export interface OpcoesCroma {
  freqMinHz?: number;
  freqMaxHz?: number;
  /** Picos abaixo desta fração do maior pico são ignorados. */
  picoMinimo?: number;
}

// Só os harmônicos que caem em OUTRA classe (3º = quinta, 5º = terça, 7º = sétima).
// Os de oitava (2, 4, 8) reforçam a própria nota e ficam como estão.
const PESO_HARMONICO: Record<number, number> = { 3: 0.25, 5: 0.25, 6: 0.25, 7: 0.15 };
const TOLERANCIA_HARMONICO_CENTS = 30;
/** Um parcial mais forte que isso em relação à base é nota de verdade, não harmônico dela. */
const RAZAO_MAXIMA_HARMONICO = 1.5;

/** Energia das 12 classes (Dó=0), máximo = 1. Trabalha com picos do espectro, não com bins. */
export function calcularCroma(amostras: Float32Array, sampleRate: number, opcoes: OpcoesCroma = {}): number[] {
  const { freqMinHz = 60, freqMaxHz = 2100, picoMinimo = 0.03 } = opcoes;
  const croma = new Array<number>(12).fill(0);
  const plano = espectro(amostras);
  const mag = plano.re;
  const hzPorBin = sampleRate / plano.n;
  const binMin = Math.max(1, Math.floor(freqMinHz / hzPorBin));
  const binMax = Math.min(plano.n / 2 - 1, Math.ceil(freqMaxHz / hzPorBin));

  let maior = 0;
  for (let i = binMin; i <= binMax; i++) if (mag[i] > maior) maior = mag[i];
  if (maior < 1e-9) return croma;

  const picos: { hz: number; amp: number }[] = [];
  for (let i = binMin; i <= binMax; i++) {
    if (mag[i] < maior * picoMinimo || mag[i] < mag[i - 1] || mag[i] <= mag[i + 1]) continue;
    const a = Math.log(mag[i - 1] + 1e-12);
    const b = Math.log(mag[i]);
    const c = Math.log(mag[i + 1] + 1e-12);
    const curva = a - 2 * b + c;
    const ajuste = curva !== 0 ? (0.5 * (a - c)) / curva : 0;
    picos.push({ hz: (i + ajuste) * hzPorBin, amp: mag[i] });
  }

  for (let i = 0; i < picos.length; i++) {
    const { hz, amp } = picos[i];
    let peso = 1 / (1 + (hz / 1000) ** 2);
    for (let j = 0; j < i; j++) {
      const razao = hz / picos[j].hz;
      const h = Math.round(razao);
      const pesoH = PESO_HARMONICO[h];
      if (!pesoH || amp > picos[j].amp * RAZAO_MAXIMA_HARMONICO) continue;
      if (Math.abs(1200 * Math.log2(razao / h)) <= TOLERANCIA_HARMONICO_CENTS) peso = Math.min(peso, pesoH);
    }
    croma[classeDaNota(frequenciaParaMidi(hz))] += amp * peso;
  }

  const topo = Math.max(...croma);
  return topo > 0 ? croma.map(v => v / topo) : croma;
}

// --- Ataque ---

export interface OpcoesAtaque {
  /** Subida de nível, em dB, sobre o mínimo recente, exigida no ataque por volume. */
  subidaDb?: number;
  /** No ataque por volume, quanto o nível precisa passar do pico recente; tremolo e batimento só voltam a ele. */
  margemPicoDb?: number;
  /** Fluxo (mudança de forma do espectro, 0 a 1) que ajuda a reconhecer um ataque com energia subindo. */
  fluxoAlto?: number;
  /** O detector só rearma quando o fluxo cai abaixo disto (histerese). */
  fluxoBaixo?: number;
  /** Tempo mínimo entre dois ataques. */
  refratarioMs?: number;
  /** Janela em que a subida precisa acontecer; ataque é rápido, o volume voltando num batimento não. */
  memoriaMs?: number;
  /** Janela do pico recente. Mesma nota repetida mais rápido que isso precisa vir mais forte para contar. */
  memoriaPicoMs?: number;
  /** O ataque por fluxo precisa chegar a esta distância do pico recente; no vale de um batimento o espectro é instável. */
  quedaMaximaDb?: number;
}

export interface DetectorAtaque {
  processar(janelaCurta: Float32Array, sampleRate: number, tempoMs: number, limiarDb: number): boolean;
  reiniciar(): void;
}

export function criarDetectorAtaque(opcoes: OpcoesAtaque = {}): DetectorAtaque {
  const {
    subidaDb = 6,
    margemPicoDb = 1,
    fluxoAlto = 0.3,
    fluxoBaixo = 0.15,
    refratarioMs = 100,
    memoriaMs = 70,
    memoriaPicoMs = 400,
    quedaMaximaDb = 6,
  } = opcoes;
  let anterior: Float64Array | null = null;
  let historico: { t: number; db: number }[] = [];
  let armado = true;
  let ultimoAtaqueMs = -Infinity;

  return {
    processar(janelaCurta, sampleRate, tempoMs, limiarDb) {
      const plano = espectro(janelaCurta);
      const hzPorBin = sampleRate / plano.n;
      const binMin = Math.max(1, Math.floor(60 / hzPorBin));
      const binMax = Math.min(plano.n / 2, Math.ceil(5000 / hzPorBin));
      const atual = plano.re.slice(binMin, binMax + 1);

      let fluxo = 0;
      if (anterior && anterior.length === atual.length) {
        // Cada quadro normalizado pela própria soma: só a forma conta, porque volume já é medido à parte.
        let totalAtual = 0;
        let totalAnterior = 0;
        for (let i = 0; i < atual.length; i++) {
          totalAtual += atual[i];
          totalAnterior += anterior[i];
        }
        if (totalAtual > 1e-9 && totalAnterior > 1e-9) {
          for (let i = 0; i < atual.length; i++) {
            fluxo += Math.max(0, atual[i] / totalAtual - anterior[i] / totalAnterior);
          }
        }
      }
      anterior = atual;

      const nivel = rmsDb(janelaCurta.subarray(janelaCurta.length >> 1));
      historico = historico.filter(h => tempoMs - h.t <= memoriaPicoMs);
      const minimo = historico.reduce((m, h) => (tempoMs - h.t <= memoriaMs ? Math.min(m, h.db) : m), nivel);
      const nivelAnterior = historico.at(-1)?.db ?? PISO_DB;
      const pico = historico.reduce((m, h) => Math.max(m, h.db), PISO_DB);
      historico.push({ t: tempoMs, db: nivel });
      const subida = nivel - minimo;

      if (nivel < limiarDb) {
        armado = true;
        return false;
      }
      if (!armado) {
        if (fluxo < fluxoBaixo && subida < subidaDb / 2) armado = true;
        return false;
      }
      if (tempoMs - ultimoAtaqueMs < refratarioMs) return false;
      const porVolume = subida >= subidaDb && nivel >= pico + margemPicoDb;
      const porFluxo = fluxo >= fluxoAlto && nivel >= pico - quedaMaximaDb && nivel > nivelAnterior;
      if (!porVolume && !porFluxo) return false;
      armado = false;
      ultimoAtaqueMs = tempoMs;
      return true;
    },
    reiniciar() {
      anterior = null;
      historico = [];
      armado = true;
      ultimoAtaqueMs = -Infinity;
    },
  };
}

// --- Ruído de fundo ---

export interface AvaliacaoRuido {
  ruidoDb: number;
  limiarDb: number;
  qualidade: 'boa' | 'media' | 'ruim';
}

export const LIMIAR_PADRAO_DB = -50;
const MARGEM_SOBRE_RUIDO_DB = 10;
const LIMIAR_MIN_DB = -65;
const LIMIAR_MAX_DB = -28;
const RUIDO_BOM_DB = -55;
const RUIDO_MEDIO_DB = -42;

/** Percentil 80: um estalo isolado não domina, mas o ruído que oscila também não fica subestimado. */
export function avaliarRuido(niveisDb: number[]): AvaliacaoRuido {
  const ordenados = [...niveisDb].sort((a, b) => a - b);
  const ruidoDb = ordenados[Math.min(ordenados.length - 1, Math.floor(ordenados.length * 0.8))] ?? PISO_DB;
  const limiarDb = Math.min(LIMIAR_MAX_DB, Math.max(LIMIAR_MIN_DB, ruidoDb + MARGEM_SOBRE_RUIDO_DB));
  const qualidade = ruidoDb < RUIDO_BOM_DB ? 'boa' : ruidoDb < RUIDO_MEDIO_DB ? 'media' : 'ruim';
  return { ruidoDb, limiarDb, qualidade };
}

// --- Quadro completo ---

export interface OpcoesAnalisador {
  limiarDb?: number;
  /** Quanto o nível precisa cair abaixo do limiar para "temSom" desligar. */
  histereseDb?: number;
  pitch?: OpcoesPitch;
  croma?: OpcoesCroma;
  ataque?: OpcoesAtaque;
}

export interface AnalisadorQuadros {
  /** `janela`: as amostras mais recentes, com pelo menos tamanhoJanelaAnalise(sampleRate). */
  processar(janela: Float32Array, sampleRate: number, tempoMs: number, janelaLonga?: Float32Array): LeituraAudio;
  definirAlvo(midi: number | null): void;
  definirLimiar(limiarDb: number): void;
  reiniciar(): void;
}

export function criarAnalisadorQuadros(opcoes: OpcoesAnalisador = {}): AnalisadorQuadros {
  const { histereseDb = 3 } = opcoes;
  const detector = criarDetectorAtaque(opcoes.ataque);
  let limiarDb = opcoes.limiarDb ?? LIMIAR_PADRAO_DB;
  let temSom = false;
  let inicioAtaqueMs = -Infinity;
  let timbreFeito = true;
  let alvoMidi: number | null = null;

  // Projeção direta da fundamental e de dois harmônicos; vizinhos impedem que um
  // pico largo de um semitom seja interpretado como o alvo.
  const energia = (amostras: Float32Array, sr: number, midi: number) => {
    const f0 = midiParaFrequencia(midi);
    const hann = janelaHann(amostras.length);
    let soma = 0;
    for (let h = 1; h <= 3 && f0 * h < sr / 2; h++) {
      const coef = 2 * Math.cos(2 * Math.PI * f0 * h / sr);
      let anterior = 0, anterior2 = 0;
      for (let i = 0; i < amostras.length; i++) {
        const atual = amostras[i] * hann[i] + coef * anterior - anterior2;
        anterior2 = anterior;
        anterior = atual;
      }
      soma += Math.sqrt(Math.max(0, anterior * anterior + anterior2 * anterior2 - coef * anterior * anterior2)) / h;
    }
    return soma;
  };

  return {
    processar(janela, sampleRate, tempoMs, janelaLonga = janela) {
      const curta = janela.subarray(janela.length - tamanhoJanelaCurta(sampleRate));
      const nivelDb = rmsDb(curta);
      temSom = nivelDb >= (temSom ? limiarDb - histereseDb : limiarDb);
      const ataque = detector.processar(curta, sampleRate, tempoMs, limiarDb);
      if (ataque) { inicioAtaqueMs = tempoMs; timbreFeito = false; }

      if (!temSom) {
        return { tempoMs, nivelDb, temSom, ataque: false, midi: null, confianca: 0, croma: new Array(12).fill(0) };
      }
      const pitch = detectarPitch(janela.subarray(janela.length - tamanhoJanelaPitch(sampleRate)), sampleRate, opcoes.pitch);
      const alvoDominante = alvoMidi !== null && pitch !== null
        && Math.abs(pitch.midi - alvoMidi) <= 0.4 && pitch.clareza >= 0.75
        && energia(janela, sampleRate, alvoMidi) > 1.1 * Math.max(
          energia(janela, sampleRate, alvoMidi - 1), energia(janela, sampleRate, alvoMidi + 1));
      const idadeAtaque = tempoMs - inicioAtaqueMs;
      const medirTimbre = !timbreFeito && idadeAtaque >= 170 && idadeAtaque <= 250 && pitch && pitch.clareza >= 0.6;
      const timbre = medirTimbre ? extrairTimbre(janelaLonga, sampleRate, pitch.frequencia) : null;
      if (medirTimbre) timbreFeito = true;
      if (idadeAtaque > 250) timbreFeito = true;
      return {
        tempoMs,
        nivelDb,
        temSom,
        ataque,
        midi: pitch?.midi ?? null,
        confianca: pitch?.clareza ?? 0,
        alvoDominante,
        croma: calcularCroma(janelaLonga, sampleRate, opcoes.croma),
        ...(timbre ? { timbre } : {}),
      };
    },
    definirAlvo(midi) { alvoMidi = midi; },
    definirLimiar(novoLimiarDb) {
      limiarDb = novoLimiarDb;
      temSom = false;
      timbreFeito = true;
    },
    reiniciar() {
      detector.reiniciar();
      temSom = false;
      timbreFeito = true;
    },
  };
}
