import { midiParaFrequencia } from '../src/lib/professorVirtual/analise';
import { passarPeloMicrofone } from './bancada-professor-virtual/degradar';
import { criarRng } from './bancada-professor-virtual/dsp';
import { conferirConstantes, simular } from './bancada-professor-virtual/simulador';

conferirConstantes();
const sr = 44100;
const duracao = 1.5;
let acertos = 0;
let total = 0;
for (const quedaDb of [-20, -30]) {
  for (let midi = 36; midi <= 47; midi++) {
    const rng = criarRng(1000 + midi);
    const audio = new Float32Array(Math.round(sr * duracao));
    const f0 = midiParaFrequencia(midi);
    const fases = Array.from({ length: 12 }, () => rng() * Math.PI * 2);
    for (let i = 0; i < audio.length; i++) {
      const t = i / sr;
      const envelope = Math.min(1, t / 0.004) * (0.7 * Math.exp(-t / 1.8) + 0.3 * Math.exp(-t / 5));
      for (let h = 1; h <= 12; h++) {
        const ganho = h === 1 ? Math.pow(10, quedaDb / 20) : Math.pow(h, -1.15);
        audio[i] += 0.12 * envelope * ganho * Math.sin(2 * Math.PI * f0 * h * t + fases[h - 1]);
      }
    }
    const semente = 1000 + midi;
    const { audio: captado, inicioToque } = passarPeloMicrofone(audio, { sr, snrDb: 30, semente, nivelDb: -12, preRuidoS: 3 });
    const resultado = simular(captado, sr, { titulo: 'Graves', instrumento: 'teclado', passos: [{ midis: [midi] }] }, inicioToque, semente);
    const passou = resultado.concluido;
    if (passou) acertos++;
    total++;
    console.log(`${midi} ${quedaDb} dB: ${passou ? 'OK' : 'FALHA'} ${resultado.resultados.at(-1)?.r.mensagem ?? ''}`);
  }
}
console.log(`Graves: ${acertos}/${total}`);
