import { contextoAudioTreino } from './motor';
import { FREQS_CLIQUE_HZ, registrarClique } from './filtroClique';

export type RotaClique = 'A' | 'B' | 'C';
export type SessaoAudio = 'auto' | 'playback' | 'play-and-record';
export type CombinacaoClique = { rota: RotaClique; sessao: SessaoAudio };
export const COMBINACOES_CLIQUE: CombinacaoClique[] = (['A', 'B', 'C'] as const).flatMap(rota =>
  (['auto', 'playback', 'play-and-record'] as const).map(sessao => ({ rota, sessao })));
const CHAVE = 'professorVirtual.saidaClique.v1';
export const codigoClique = ({ rota, sessao }: CombinacaoClique) => `${rota}-${sessao}`;
export function lerSaidaClique(): CombinacaoClique {
  try { return COMBINACOES_CLIQUE.find(item => codigoClique(item) === localStorage.getItem(CHAVE)) ?? { rota: 'A', sessao: 'play-and-record' }; }
  catch { return { rota: 'A', sessao: 'play-and-record' }; }
}
export function salvarSaidaClique(item: CombinacaoClique): boolean {
  try { localStorage.setItem(CHAVE, codigoClique(item)); return true; } catch { return false; }
}
export function aplicarSessaoAudio(tipo: SessaoAudio): string {
  try {
    const sessao = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (!sessao) return 'indisponível';
    sessao.type = tipo;
    return sessao.type === tipo ? 'aplicada' : `atual: ${sessao.type}`;
  } catch { return 'recusada'; }
}

const DURACAO = 0.05;
function pcm(taxa: number): Float32Array {
  const dados = new Float32Array(Math.ceil(taxa * DURACAO));
  let pico = 0;
  for (let i = 0; i < dados.length; i++) {
    const t = i / taxa;
    // 3 kHz é onde o alto-falante do celular soa mais alto; 6 kHz é harmônico dele, então a distorção
    // do alto-falante não cria som novo na faixa das notas (o antigo 3 + 4,5 kHz criava 1,5 kHz).
    // Subida suave (4 ms): concentra a energia em 3/6 kHz, sem espirrar para a faixa das notas.
    const subida = t < 0.004 ? 0.5 - 0.5 * Math.cos(Math.PI * t / 0.004) : 1;
    dados[i] = subida * Math.exp(-t * 80) *
      (0.7 * Math.sin(2 * Math.PI * FREQS_CLIQUE_HZ[0] * t) + 0.3 * Math.sin(2 * Math.PI * FREQS_CLIQUE_HZ[1] * t));
    pico = Math.max(pico, Math.abs(dados[i]));
  }
  for (let i = 0; i < dados.length; i++) dados[i] /= pico || 1;
  return dados;
}
function wav(dados: Float32Array, taxa: number): Blob {
  const buffer = new ArrayBuffer(44 + dados.length * 2);
  const view = new DataView(buffer);
  const palavra = (offset: number, valor: string) => [...valor].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  palavra(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); palavra(8, 'WAVE'); palavra(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, taxa, true); view.setUint32(28, taxa * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); palavra(36, 'data'); view.setUint32(40, dados.length * 2, true);
  dados.forEach((valor, i) => view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, valor)) * 32767), true));
  return new Blob([buffer], { type: 'audio/wav' });
}

export class SaidaClique {
  private contexto = contextoAudioTreino();
  private buffer: AudioBuffer | null = null;
  private url: string | null = null;
  private elementos: HTMLAudioElement[] = [];
  private destino: MediaStreamAudioDestinationNode | null = null;
  private proximo = 0;
  private timers = new Set<number>();
  readonly combinacao: CombinacaoClique;

  constructor(combinacao: CombinacaoClique) {
    this.combinacao = combinacao;
    aplicarSessaoAudio(combinacao.sessao);
    if (combinacao.rota === 'B') {
      this.url = URL.createObjectURL(wav(pcm(48000), 48000));
      this.elementos = Array.from({ length: 3 }, () => {
        const audio = new Audio(this.url!); audio.preload = 'auto'; audio.volume = 1; audio.load(); return audio;
      });
    } else {
      const dados = pcm(this.contexto.sampleRate);
      this.buffer = this.contexto.createBuffer(1, dados.length, this.contexto.sampleRate);
      this.buffer.copyToChannel(dados, 0);
      if (combinacao.rota === 'C') {
        this.destino = this.contexto.createMediaStreamDestination();
        const audio = new Audio(); audio.autoplay = true; audio.volume = 1; audio.srcObject = this.destino.stream;
        this.elementos = [audio]; void audio.play().catch(() => undefined);
      }
    }
    void this.contexto.resume().catch(() => undefined);
  }

  tocar(atrasoMs: number, volume = 1): void {
    if (volume <= 0) return;
    registrarClique((this.contexto.currentTime + Math.max(0, atrasoMs) / 1000) * 1000);
    if (this.combinacao.rota === 'B') {
      const timer = window.setTimeout(() => {
        this.timers.delete(timer);
        const audio = this.elementos[this.proximo++ % this.elementos.length];
        audio.pause(); audio.currentTime = 0; audio.volume = 1;
        void audio.play().catch(() => undefined);
      }, Math.max(0, atrasoMs));
      this.timers.add(timer);
      return;
    }
    const fonte = this.contexto.createBufferSource();
    const ganho = this.contexto.createGain();
    fonte.buffer = this.buffer;
    ganho.gain.value = Math.min(1, volume);
    fonte.connect(ganho).connect(this.destino ?? this.contexto.destination);
    fonte.onended = () => { fonte.disconnect(); ganho.disconnect(); };
    fonte.start(this.contexto.currentTime + Math.max(0, atrasoMs) / 1000);
  }

  encerrar(): void {
    this.timers.forEach(timer => clearTimeout(timer)); this.timers.clear();
    this.elementos.forEach(audio => { audio.pause(); audio.srcObject = null; audio.removeAttribute('src'); audio.load(); });
    this.destino?.stream.getTracks().forEach(track => track.stop());
    if (this.url) URL.revokeObjectURL(this.url);
  }
}
