// Síntese dos instrumentos: violão (Karplus-Strong estendido) e teclado (aditiva com decaimento).
// Saída "seca", antes do microfone. A degradação fica em degradar.ts.

import { aplicarBiquad, gauss, midiParaHz, passaBaixas, picoAbs, pico, type Rng } from './dsp';

/** Cordas soltas do violão, da 6ª para a 1ª. */
export const CORDAS_SOLTAS = [40, 45, 50, 55, 59, 64];

/** Acordes abertos, na ordem da corda grave para a aguda (cordas não tocadas ficam de fora). */
export const ACORDES_VIOLAO: Record<string, number[]> = {
  Em: [40, 47, 52, 55, 59, 64],
  Am: [45, 52, 57, 60, 64],
  C: [48, 52, 55, 60, 64],
  D: [50, 57, 62, 66],
  G: [43, 47, 50, 55, 59, 67],
  E: [40, 47, 52, 56, 59, 64],
  A: [45, 52, 57, 61, 64],
};

export interface OpcoesToque {
  rng: Rng;
  durS: number;
  /** 0 a 1, força do toque. */
  forca?: number;
  /** Afinação global do instrumento em cents (0 = perfeito). */
  afinacaoCents?: number;
  /** Desvio aleatório de cada corda (desvio-padrão em cents): violão real nunca está perfeito. */
  espalhamentoCents?: number;
  /**
   * 'dedo' (padrão): náilon dedilhado, harmônicos caem ~1/k, B ~ 5e-5.
   * 'palheta': aço com palheta, ruído de banda larga e B ~ 1e-4; bem mais brilhante e menos periódico.
   */
  toque?: 'dedo' | 'palheta';
}

/** Atraso de fase de um passa-tudo de 1ª ordem em w (amostras). */
function atrasoPassaTudo(a: number, w: number): number {
  return (w - 2 * Math.atan2(a * Math.sin(w), 1 + a * Math.cos(w))) / w;
}

/**
 * Uma polarização da corda: linha de atraso + filtro de perda + passa-tudos de dispersão
 * (rigidez, deixa os parciais altos levemente sustenidos) + passa-tudo de ajuste fino.
 */
function linhaKS(f0: number, sr: number, n: number, t60: number, s: number, exc: Float32Array, dispersao: number): Float32Array {
  const w = (2 * Math.PI * f0) / sr;
  // a<0: atraso cai com a frequência => parciais sustenidos (inarmonicidade). Corda grave, mais
  // grossa, precisa de dispersão mais forte; o alvo é ~3 a 8 cents no 8º parcial (B ~ 1e-4).
  const periodo = sr / f0;
  // O desvio cresce com estágios/período³, por isso os estágios caem rápido com a altura da nota.
  const aD = periodo > 200 ? -0.7 : periodo > 120 ? -0.45 : -0.25;
  const estagios = Math.max(1, Math.round(dispersao * (periodo > 200
    ? Math.max(2, Math.min(16, 16 * Math.pow(periodo / 535, 3)))
    : Math.max(2, Math.floor(periodo / 30)))));
  const atrasoLp = Math.atan2(s * Math.sin(w), 1 - s + s * Math.cos(w)) / w;
  const total = sr / f0 - atrasoLp - estagios * atrasoPassaTudo(aD, w);
  const L = Math.max(1, Math.floor(total - 0.5));
  const d = total - L;
  const c = (1 - d) / (1 + d);
  const g = Math.pow(10, -3 / (f0 * t60));

  const buf = new Float64Array(L);
  const dx = new Float64Array(estagios), dy = new Float64Array(estagios);
  let idx = 0, lpAnt = 0, fx = 0, fy = 0;
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = buf[idx];
    let z = (1 - s) * v + s * lpAnt;
    lpAnt = v;
    for (let e = 0; e < estagios; e++) {
      const o = aD * z + dx[e] - aD * dy[e];
      dx[e] = z; dy[e] = o; z = o;
    }
    const o = c * z + fx - c * fy;
    fx = z; fy = o;
    const saida = g * o + (i < exc.length ? exc[i] : 0);
    buf[idx] = saida;
    idx = idx + 1 === L ? 0 : idx + 1;
    y[i] = saida;
  }
  return y;
}

/**
 * Dedilhado: a corda solta de uma forma triangular, e a força na ponte é a derivada disso, um pulso
 * de largura beta. Os harmônicos ficam ~ sen(k*pi*beta)/k; a polpa do dedo corta os agudos.
 */
function excitacaoDedo(periodo: number, beta: number, forca: number, sr: number, rng: Rng): Float32Array {
  const exc = new Float32Array(periodo);
  const largura = Math.max(1, Math.round(beta * periodo));
  for (let i = 0; i < periodo; i++) exc[i] = (i < largura ? 1 - beta : -beta) + 0.05 * (rng() * 2 - 1);
  const coef = 1 - Math.exp((-2 * Math.PI * (1200 + 2000 * forca)) / sr);
  // Duas voltas pelo filtro: ele é circular, como a onda que dá voltas na corda.
  let lp = 0;
  for (let v = 0; v < 2; v++) for (let i = 0; i < periodo; i++) { lp += coef * (exc[i] - lp); if (v === 1) exc[i] = lp; }
  return exc;
}

/** Palheta em corda de aço: ruído curto de banda larga, com o pente da posição do toque. */
function excitacaoPalheta(periodo: number, beta: number, forca: number, rng: Rng): Float32Array {
  const exc = new Float32Array(periodo);
  let lp = 0, media = 0;
  const coefBrilho = 0.25 + 0.6 * forca;
  for (let i = 0; i < periodo; i++) {
    lp += coefBrilho * (rng() * 2 - 1 - lp);
    exc[i] = lp;
    media += lp;
  }
  media /= periodo;
  for (let i = 0; i < periodo; i++) exc[i] -= media;
  const atraso = Math.max(1, Math.round(beta * periodo));
  const pente = new Float32Array(periodo + atraso);
  for (let i = 0; i < pente.length; i++) {
    pente[i] = (i < periodo ? exc[i] : 0) - (i >= atraso ? exc[i - atraso] : 0);
  }
  return pente;
}

/** Uma corda de violão, com ataque de palheta/dedo, duas polarizações e decaimento natural. */
export function cordaViolao(midi: number, sr: number, o: OpcoesToque): Float32Array {
  const { rng, durS } = o;
  const forca = o.forca ?? 0.7;
  const cents = (o.afinacaoCents ?? 0) + gauss(rng) * (o.espalhamentoCents ?? 0);
  const f0 = midiParaHz(midi + cents / 100);
  const n = Math.round(durS * sr);
  const periodo = Math.round(sr / f0);

  const beta = 0.12 + rng() * 0.1; // ponto do toque: 1/5 a 1/8 da corda
  const excPente = o.toque === 'palheta' ? excitacaoPalheta(periodo, beta, forca, rng) : excitacaoDedo(periodo, beta, forca, sr, rng);
  const dispersao = o.toque === 'palheta' ? 1 : 0.5;

  // Grave soa mais tempo; agudo perde brilho mais cedo.
  const t60 = 7 - ((midi - 40) / 30) * 4;
  const s = 0.18 + rng() * 0.1;
  const dtz = Math.pow(2, 0.6 / 1200);
  const a = linhaKS(f0 * dtz, sr, n, t60, s, excPente, dispersao);
  const b = linhaKS(f0 / dtz, sr, n, t60 * 0.55, s + 0.08, excPente, dispersao);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) y[i] = 0.65 * a[i] + 0.35 * b[i];

  // Estalo do toque: 8 ms de ruído de banda larga.
  const clique = Math.round(0.008 * sr);
  for (let i = 0; i < clique && i < n; i++) {
    y[i] += (o.toque === 'palheta' ? 0.12 : 0.04) * forca * (rng() * 2 - 1) * (1 - i / clique);
  }
  return y;
}

/** Ressonâncias do tampo e da caixa. */
function corpoViolao(x: Float32Array, sr: number): Float32Array {
  let y = aplicarBiquad(x, pico(105, 4, 6, sr));
  y = aplicarBiquad(y, pico(210, 3, 4, sr));
  y = aplicarBiquad(y, pico(420, 2, 2, sr));
  return aplicarBiquad(y, passaBaixas(6500, 0.7, sr));
}

function normalizar(y: Float32Array, picoAlvo = 0.5): Float32Array {
  const p = picoAbs(y) || 1;
  for (let i = 0; i < y.length; i++) y[i] *= picoAlvo / p;
  return y;
}

/** Violão: nota única, ou acorde com strum de ~30 ms entre cordas (grave para agudo). */
export function tocarViolao(midis: number[], sr: number, o: OpcoesToque & { strumMs?: number }): Float32Array {
  const n = Math.round(o.durS * sr);
  const y = new Float32Array(n);
  const strum = o.strumMs ?? 30;
  midis.forEach((m, i) => {
    const atraso = Math.max(0, Math.round(((i * strum + gauss(o.rng) * 4) / 1000) * sr));
    const corda = cordaViolao(m, sr, { ...o, durS: o.durS });
    const ganho = Math.pow(10, (gauss(o.rng) * 2.5) / 20); // cordas nunca soam iguais no strum
    for (let k = 0; k + atraso < n; k++) y[k + atraso] += ganho * corda[k];
  });
  return normalizar(corpoViolao(y, sr));
}

/** Uma nota de teclado: parciais levemente inarmônicos, cada um com o seu decaimento em dois estágios. */
export function notaTeclado(midi: number, sr: number, o: OpcoesToque): Float32Array {
  const { rng, durS } = o;
  const forca = o.forca ?? 0.7;
  const cents = (o.afinacaoCents ?? 0) + gauss(rng) * (o.espalhamentoCents ?? 0);
  const f0 = midiParaHz(midi + cents / 100);
  const n = Math.round(durS * sr);
  const y = new Float32Array(n);
  const B = 0.00015 * Math.pow(2, (midi - 48) / 24);
  const tau0 = 2.2 * Math.pow(0.5, (midi - 48) / 18);
  const inclinacao = 1.5 - 0.5 * forca;
  const nParciais = Math.min(24, Math.floor(7000 / f0));
  const ataque = 0.004 * sr;

  for (let k = 1; k <= nParciais; k++) {
    const fk = k * f0 * Math.sqrt(1 + B * k * k);
    const ak = Math.pow(k, -inclinacao) * (0.8 + rng() * 0.4);
    const tau = tau0 / (1 + 0.3 * (k - 1));
    const fase = rng() * 2 * Math.PI;
    const w = (2 * Math.PI * fk) / sr;
    const d1 = Math.exp(-1 / (tau * sr));
    const d2 = Math.exp(-1 / (tau * 4 * sr));
    let e1 = 0.7, e2 = 0.3;
    for (let i = 0; i < n; i++) {
      y[i] += ak * (e1 + e2) * Math.sin(w * i + fase);
      e1 *= d1; e2 *= d2;
    }
  }
  for (let i = 0; i < ataque && i < n; i++) y[i] *= i / ataque;
  // Ruído do martelo/tecla.
  const mart = Math.round(0.012 * sr);
  for (let i = 0; i < mart && i < n; i++) y[i] += 0.05 * forca * (rng() * 2 - 1) * (1 - i / mart);
  return y;
}

/** Teclado: notas soam juntas, com poucos ms de diferença entre os dedos. */
export function tocarTeclado(midis: number[], sr: number, o: OpcoesToque): Float32Array {
  const n = Math.round(o.durS * sr);
  const y = new Float32Array(n);
  for (const m of midis) {
    const atraso = Math.max(0, Math.round(((Math.abs(gauss(o.rng)) * 8) / 1000) * sr));
    const nota = notaTeclado(m, sr, o);
    const ganho = Math.pow(10, (gauss(o.rng) * 1.5) / 20);
    for (let k = 0; k + atraso < n; k++) y[k + atraso] += ganho * nota[k];
  }
  return normalizar(y);
}
