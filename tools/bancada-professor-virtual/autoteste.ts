// Confere o próprio gerador antes de confiar nele: afinação, inarmonicidade, atenuação do Mi grave e SNR.
// Uso: npx tsx tools/bancada-professor-virtual/autoteste.ts

import { criarRng, fft, midiParaHz, rms } from './dsp';
import { filtroMicrofone, passarPeloMicrofone, ruidoSala } from './degradar';
import { cordaViolao, notaTeclado, tocarViolao } from './sintese';

/** Pico mais forte perto de `alvoHz`, com interpolação parabólica. */
function picoPerto(x: Float32Array, sr: number, alvoHz: number, ini: number): number {
  const N = 1 << 17;
  const re = new Float64Array(N), im = new Float64Array(N);
  const L = Math.min(N, x.length - ini);
  for (let i = 0; i < L; i++) re[i] = x[ini + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / L));
  fft(re, im);
  const mag = (k: number) => Math.log(Math.hypot(re[k], im[k]) + 1e-20);
  const c = Math.round((alvoHz * N) / sr);
  const r = Math.round(c * 0.02) + 2;
  let m = c - r;
  for (let k = c - r; k <= c + r; k++) if (mag(k) > mag(m)) m = k;
  const d = (mag(m - 1) - mag(m + 1)) / (2 * (mag(m - 1) - 2 * mag(m) + mag(m + 1)));
  return ((m + d) * sr) / N;
}

const cents = (f: number, ref: number) => 1200 * Math.log2(f / ref);

for (const sr of [44100, 48000]) {
  console.log(`\n== sr ${sr}: afinação do fundamental e 8º parcial (cents) ==`);
  for (const m of [40, 45, 50, 55, 59, 64, 69, 76]) {
    const y = cordaViolao(m, sr, { rng: criarRng(m), durS: 3 });
    const f = midiParaHz(m);
    const f1 = picoPerto(y, sr, f, 2000);
    const f8 = picoPerto(y, sr, 8 * f1, 2000);
    console.log(`violão midi ${m}: f1 ${cents(f1, f).toFixed(1)}  parcial8/8f1 ${cents(f8, 8 * f1).toFixed(1)}`);
  }
  for (const m of [48, 60, 72, 84]) {
    const y = notaTeclado(m, sr, { rng: criarRng(m), durS: 3 });
    const f = midiParaHz(m);
    console.log(`teclado midi ${m}: f1 ${cents(picoPerto(y, sr, f, 2000), f).toFixed(1)}`);
  }
}

console.log('\n== atenuação do microfone (dB) ==');
const sr = 44100;
for (const hz of [60, 82.4, 110, 120, 165, 1000, 8000, 12000]) {
  const x = new Float32Array(sr);
  for (let i = 0; i < sr; i++) x[i] = Math.sin((2 * Math.PI * hz * i) / sr);
  console.log(`${hz} Hz: ${(20 * Math.log10(rms(filtroMicrofone(x, sr), sr / 2) / rms(x, sr / 2))).toFixed(1)} dB`);
}

console.log('\n== decaimento do violão (RMS em dB por trecho) e pico ==');
const nota = cordaViolao(40, sr, { rng: criarRng(1), durS: 3 });
for (const t of [0.05, 0.5, 1, 2]) {
  const i = Math.round(t * sr);
  console.log(`Mi grave t=${t}s: ${(20 * Math.log10(rms(nota, i, i + 4096))).toFixed(1)} dB`);
}

console.log('\n== espectro do Mi grave seco (dB relativo ao 1º parcial, média dos 500 ms iniciais) ==');
for (const toque of ['dedo', 'palheta'] as const) {
  const y = tocarViolao([40], sr, { rng: criarRng(9), durS: 3, forca: 0.7, toque });
  const N = 1 << 15;
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) re[i] = y[2000 + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  fft(re, im);
  const amp = (hz: number) => {
    const c = Math.round((hz * N) / sr);
    let m = 0;
    const r = Math.round(c * 0.03) + 4; // folga para a inarmonicidade dos parciais altos
    for (let k = c - r; k <= c + r; k++) m = Math.max(m, Math.hypot(re[k], im[k]));
    return m;
  };
  const f = midiParaHz(40);
  const base = amp(f);
  console.log(toque, [1, 2, 3, 4, 6, 8, 12, 16, 24].map((k) => `k${k}: ${(20 * Math.log10(amp(k * f) / base)).toFixed(0)}`).join('  '));
}

console.log('\n== SNR entregue ==');
for (const snr of [30, 20, 10]) {
  const seco = tocarViolao([40], sr, { rng: criarRng(3), durS: 3 });
  const { audio, inicioToque } = passarPeloMicrofone(seco, { sr, snrDb: snr, semente: 5 });
  const ruido = rms(audio, 0, inicioToque);
  const sinal = rms(audio, inicioToque, inicioToque + Math.round(1.5 * sr));
  console.log(`pedido ${snr} dB: medido ${(20 * Math.log10(Math.sqrt(Math.max(sinal ** 2 - ruido ** 2, 0)) / ruido)).toFixed(1)} dB`);
}
void ruidoSala;
