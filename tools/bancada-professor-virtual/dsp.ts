// Utilitários de sinal da bancada. Tudo determinístico (semente) para o resultado ser reproduzível.

export type Rng = () => number;

/** Gerador pseudoaleatório com semente (mulberry32), uniforme em [0, 1). */
export function criarRng(semente: number): Rng {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Número aleatório gaussiano (Box-Muller). */
export function gauss(rng: Rng): number {
  const u = Math.max(rng(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

/** Transforma texto em semente estável. */
export function hashTexto(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const midiParaHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** FFT radix-2 no lugar. O tamanho precisa ser potência de 2. */
export function fft(re: Float64Array, im: Float64Array, inversa = false): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inversa ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const meio = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < meio; k++) {
        const a = i + k;
        const b = a + meio;
        const xr = re[b] * cr - im[b] * ci;
        const xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
  if (inversa) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

/** Convolução por FFT; devolve só os primeiros x.length amostras (a cauda é descartada). */
export function convolver(x: Float32Array, h: Float32Array): Float32Array {
  let n = 1;
  while (n < x.length + h.length) n <<= 1;
  const ar = new Float64Array(n), ai = new Float64Array(n);
  const br = new Float64Array(n), bi = new Float64Array(n);
  ar.set(x);
  br.set(h);
  fft(ar, ai);
  fft(br, bi);
  for (let i = 0; i < n; i++) {
    const r = ar[i] * br[i] - ai[i] * bi[i];
    ai[i] = ar[i] * bi[i] + ai[i] * br[i];
    ar[i] = r;
  }
  fft(ar, ai, true);
  const y = new Float32Array(x.length);
  for (let i = 0; i < y.length; i++) y[i] = ar[i];
  return y;
}

export interface Biquad { b0: number; b1: number; b2: number; a1: number; a2: number }

function normalizar(b0: number, b1: number, b2: number, a0: number, a1: number, a2: number): Biquad {
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

export function passaAltas(fc: number, q: number, sr: number): Biquad {
  const w = (2 * Math.PI * fc) / sr, c = Math.cos(w), al = Math.sin(w) / (2 * q);
  return normalizar((1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + al, -2 * c, 1 - al);
}

export function passaBaixas(fc: number, q: number, sr: number): Biquad {
  const w = (2 * Math.PI * fc) / sr, c = Math.cos(w), al = Math.sin(w) / (2 * q);
  return normalizar((1 - c) / 2, 1 - c, (1 - c) / 2, 1 + al, -2 * c, 1 - al);
}

export function pico(fc: number, q: number, ganhoDb: number, sr: number): Biquad {
  const A = Math.pow(10, ganhoDb / 40);
  const w = (2 * Math.PI * fc) / sr, c = Math.cos(w), al = Math.sin(w) / (2 * q);
  return normalizar(1 + al * A, -2 * c, 1 - al * A, 1 + al / A, -2 * c, 1 - al / A);
}

export function aplicarBiquad(x: Float32Array, f: Biquad): Float32Array {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    const o = f.b0 * v + f.b1 * x1 + f.b2 * x2 - f.a1 * y1 - f.a2 * y2;
    x2 = x1; x1 = v; y2 = y1; y1 = o;
    y[i] = o;
  }
  return y;
}

export function rms(x: Float32Array, ini = 0, fim = x.length): number {
  let s = 0;
  for (let i = ini; i < fim; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, fim - ini));
}

export function picoAbs(x: Float32Array): number {
  let p = 0;
  for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > p) p = a; }
  return p;
}
