// Simula o caminho até o microfone do celular: quarto, cápsula, ruído e saturação.

import { aplicarBiquad, convolver, criarRng, gauss, passaAltas, passaBaixas, picoAbs, rms, type Rng } from './dsp';

/** Passa-faixa do microfone: Butterworth de 4ª ordem nas duas pontas. O Mi grave (82 Hz) perde ~13 dB. */
export function filtroMicrofone(x: Float32Array, sr: number): Float32Array {
  let y = aplicarBiquad(x, passaAltas(120, 0.5412, sr));
  y = aplicarBiquad(y, passaAltas(120, 1.3066, sr));
  y = aplicarBiquad(y, passaBaixas(8000, 0.5412, sr));
  return aplicarBiquad(y, passaBaixas(8000, 1.3066, sr));
}

/** Resposta ao impulso de um quarto pequeno: som direto, reflexões iniciais e cauda (RT60 ~0,35 s). */
export function respostaQuarto(sr: number, rng: Rng, rt60 = 0.35): Float32Array {
  const n = Math.round(rt60 * 1.2 * sr);
  const h = new Float32Array(n);
  h[0] = 1;
  for (let i = 0; i < 8; i++) {
    const t = Math.round((0.003 + rng() * 0.03) * sr);
    h[t] += (rng() < 0.5 ? -1 : 1) * (0.25 + rng() * 0.3);
  }
  const inicio = Math.round(0.02 * sr);
  const k = (-6.91 / rt60) / sr; // -60 dB em rt60
  for (let i = inicio; i < n; i++) h[i] += 0.035 * gauss(rng) * Math.exp(k * (i - inicio));
  return h;
}

/** Ruído de sala: rosa + ronco grave + zumbido da rede de 60 Hz e harmônicos. */
export function ruidoSala(n: number, sr: number, rng: Rng): Float32Array {
  const y = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0, grave = 0;
  const fase = rng() * 6.28;
  for (let i = 0; i < n; i++) {
    const w = rng() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.099046;
    b1 = 0.963 * b1 + w * 0.2965164;
    b2 = 0.57 * b2 + w * 1.0526913;
    grave += 0.01 * (w - grave);
    const t = (2 * Math.PI * i) / sr;
    const rede = 0.02 * Math.sin(60 * t + fase) + 0.03 * Math.sin(120 * t + fase) + 0.015 * Math.sin(180 * t);
    y[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11 + grave * 2 + rede;
  }
  return y;
}

/** Saturação leve do pré-amplificador (tanh). */
export function saturar(x: Float32Array, quanto = 1.3): Float32Array {
  const y = new Float32Array(x.length);
  const k = Math.tanh(quanto);
  for (let i = 0; i < x.length; i++) y[i] = Math.tanh(quanto * x[i]) / k;
  return y;
}

export interface OpcoesMic {
  sr: number;
  snrDb: number;
  semente: number;
  /** Pico do sinal na cápsula em dBFS: quanto mais longe o celular, menor. */
  nivelDb?: number;
  /** Silêncio de sala antes do toque (o motor calibra aqui). */
  preRuidoS?: number;
}

/** Quarto + cápsula sobre o som seco. Não depende da SNR, então pode ser reaproveitado entre elas. */
export function colocarNoQuarto(seco: Float32Array, sr: number, semente: number): Float32Array {
  return filtroMicrofone(convolver(seco, respostaQuarto(sr, criarRng(semente))), sr);
}

// 40 s de ruído por sampleRate, já filtrado e com RMS 1. Cada tentativa lê um trecho sorteado:
// gerar e filtrar ruído novo a cada tentativa custava mais que a própria análise.
const DURACAO_RUIDO_S = 40;
const fitasRuido = new Map<number, Float32Array>();

function fitaRuido(sr: number): Float32Array {
  let fita = fitasRuido.get(sr);
  if (!fita) {
    fita = filtroMicrofone(ruidoSala(DURACAO_RUIDO_S * sr, sr, criarRng(sr)), sr);
    const r = rms(fita) || 1;
    for (let i = 0; i < fita.length; i++) fita[i] /= r;
    fitasRuido.set(sr, fita);
  }
  return fita;
}

function trechoRuido(n: number, sr: number, semente: number): Float32Array {
  const fita = fitaRuido(sr);
  const inicio = Math.floor(criarRng(semente)() * (fita.length - n));
  return fita.subarray(inicio, inicio + n);
}

/**
 * Soma ruído e satura. `noQuarto` vem de colocarNoQuarto. SNR = RMS do sinal no primeiro 1,5 s (já
 * filtrado) contra o RMS do ruído (já filtrado). Medir só o trecho sonoro não infla o SNR com cauda
 * silenciosa, e o decaimento do instrumento faz o SNR real cair ao longo da nota, como na sala.
 */
export function misturarNoMicrofone(noQuarto: Float32Array, o: OpcoesMic): { audio: Float32Array; inicioToque: number } {
  const pre = Math.round((o.preRuidoS ?? 1.5) * o.sr);
  const ganho = Math.pow(10, (o.nivelDb ?? -12) / 20) / (picoAbs(noQuarto) || 1);
  const rmsSinal = ganho * rms(noQuarto, 0, Math.min(noQuarto.length, Math.round(1.5 * o.sr)));
  const total = pre + noQuarto.length;
  const ruido = trechoRuido(total, o.sr, o.semente);
  const escala = rmsSinal / Math.pow(10, o.snrDb / 20) / (rms(ruido) || 1);

  const y = new Float32Array(total);
  for (let i = 0; i < total; i++) y[i] = ruido[i] * escala + (i >= pre ? noQuarto[i - pre] * ganho : 0);
  return { audio: saturar(y), inicioToque: pre };
}

/** Atalho: som seco até o microfone. */
export function passarPeloMicrofone(seco: Float32Array, o: OpcoesMic): { audio: Float32Array; inicioToque: number } {
  return misturarNoMicrofone(colocarNoQuarto(seco, o.sr, o.semente), o);
}

/** Só o ruído da sala, no nível que teria com a SNR pedida para um sinal de referência. */
export function somenteSala(durS: number, o: OpcoesMic): Float32Array {
  const n = Math.round(durS * o.sr);
  const ruido = trechoRuido(n, o.sr, o.semente);
  // Referência: nota típica com pico no nível pedido tem RMS cerca de 12 dB abaixo do pico.
  const rmsRef = Math.pow(10, ((o.nivelDb ?? -12) - 12) / 20);
  const escala = rmsRef / Math.pow(10, o.snrDb / 20) / (rms(ruido) || 1);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) y[i] = ruido[i] * escala;
  return saturar(y);
}
