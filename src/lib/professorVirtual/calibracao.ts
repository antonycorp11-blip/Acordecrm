import type { TimbreViolao } from './types';

export interface MapaViolao {
  nome: string;
  atualizadoEm: string;
  /** Chave: `corda:casa`; até três medidas válidas por posição. */
  amostras: Record<string, TimbreViolao[]>;
}

export interface ModeloViolao extends MapaViolao {
  localId: string;
  id?: string;
  pendente: boolean;
  versao: number;
}

const CHAVE = 'professorVirtual.mapasViolao.v1';
const CHAVE_ESCOLHA = 'professorVirtual.modeloViolaoEscolhido.v1';
export const posicoesCalibracao = Array.from({ length: 6 }, (_, i) => 6 - i)
  .flatMap(corda => Array.from({ length: 13 }, (_, casa) => ({ corda, casa })));
export const chavePosicao = (corda: number, casa: number) => `${corda}:${casa}`;

export function normalizarTimbre(t: TimbreViolao): TimbreViolao {
  const harmonicos = t.harmonicosDb.slice(0, 10);
  const maior = Math.max(...harmonicos);
  return {
    harmonicosDb: harmonicos.map(v => Math.max(-60, Math.min(0, v - maior))),
    centroideRelativo: Math.max(0, t.centroideRelativo),
    inharmonicidadeCents: Math.max(0, t.inharmonicidadeCents),
  };
}

export function mediaTimbres(amostras: TimbreViolao[]): TimbreViolao | null {
  if (!amostras.length) return null;
  const valores = amostras.map(normalizarTimbre);
  const media = (fn: (t: TimbreViolao) => number) => valores.reduce((s, t) => s + fn(t), 0) / valores.length;
  return {
    harmonicosDb: Array.from({ length: 10 }, (_, i) => media(t => t.harmonicosDb[i] ?? -60)),
    centroideRelativo: media(t => t.centroideRelativo),
    inharmonicidadeCents: media(t => t.inharmonicidadeCents),
  };
}

/** Escala aproximada: 0 = igual; 1 = muito diferente. */
export function distanciaTimbres(a: TimbreViolao, b: TimbreViolao): number {
  const x = normalizarTimbre(a);
  const y = normalizarTimbre(b);
  const harmonicos = x.harmonicosDb.reduce((s, v, i) => s + Math.min(40, Math.abs(v - (y.harmonicosDb[i] ?? -60))) / 40, 0) / 10;
  const centroide = Math.min(1, Math.abs(x.centroideRelativo - y.centroideRelativo) / 4);
  const inharmonicidade = Math.min(1, Math.abs(x.inharmonicidadeCents - y.inharmonicidadeCents) / 60);
  return 0.75 * harmonicos + 0.2 * centroide + 0.05 * inharmonicidade;
}

export function adicionarAmostra(mapa: MapaViolao, corda: number, casa: number, timbre: TimbreViolao): MapaViolao {
  if (!Number.isInteger(corda) || corda < 1 || corda > 6 || !Number.isInteger(casa) || casa < 0 || casa > 12) return mapa;
  const chave = chavePosicao(corda, casa);
  return { ...mapa, atualizadoEm: new Date().toISOString(), amostras: {
    ...mapa.amostras, [chave]: [...(mapa.amostras[chave] ?? []), normalizarTimbre(timbre)].slice(-3),
  } };
}

export function novaCalibracao(nome: string): MapaViolao {
  return { nome: nome.trim() || 'Meu violão', atualizadoEm: new Date().toISOString(), amostras: {} };
}

export function lerMapas(): ModeloViolao[] {
  try {
    const dados = JSON.parse(localStorage.getItem(CHAVE) || '[]');
    return Array.isArray(dados) ? dados.filter((m): m is ModeloViolao =>
      typeof m?.nome === 'string' && typeof m?.atualizadoEm === 'string' && m?.amostras && typeof m.amostras === 'object')
      .map((m, i) => ({ ...m, localId: m.localId || `legado-${i}`, pendente: m.pendente ?? !m.id, versao: m.versao ?? 0 })) : [];
  } catch { return []; }
}

export function salvarMapas(mapas: ModeloViolao[]): boolean {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(mapas));
    return true;
  } catch { return false; }
}

export function lerModeloEscolhido(): string | null {
  try { return localStorage.getItem(CHAVE_ESCOLHA); } catch { return null; }
}

export function lerMapaEscolhido(): ModeloViolao | undefined {
  const mapas = lerMapas();
  return mapas.find(m => m.localId === lerModeloEscolhido()) ?? mapas.at(-1);
}

export function lembrarModeloEscolhido(localId: string): void {
  try { localStorage.setItem(CHAVE_ESCOLHA, localId); } catch { /* Cache opcional. */ }
}
