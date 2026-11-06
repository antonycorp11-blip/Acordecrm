import type { PassoExercicio } from './types';
import type { TimbreViolao } from './types';
import { chavePosicao, distanciaTimbres, mediaTimbres, type MapaViolao } from './calibracao';

export type PosicaoViolao = { corda: number; casa: number; dedo?: number };
export type EstimativaPosicao = PosicaoViolao & { confianca: number };

/** Índice 0 corresponde à 1ª corda (Mi agudo). */
export const AFINACAO_VIOLAO = [64, 59, 55, 50, 45, 40] as const;

export function midiNaPosicao(corda: number, casa: number): number | null {
  if (!Number.isInteger(corda) || corda < 1 || corda > 6 || !Number.isInteger(casa) || casa < 0 || casa > 24) return null;
  return AFINACAO_VIOLAO[corda - 1] + casa;
}

export function posicoesDoMidi(midi: number): PosicaoViolao[] {
  if (!Number.isInteger(midi)) return [];
  return AFINACAO_VIOLAO.flatMap((aberta, i) => {
    const casa = midi - aberta;
    return casa >= 0 && casa <= 15 ? [{ corda: i + 1, casa }] : [];
  });
}

export function estimarPosicao(midi: number, anterior?: PosicaoViolao | null, timbre?: TimbreViolao | null, mapa?: MapaViolao | null, usarMao = true): EstimativaPosicao | null {
  const opcoes = posicoesDoMidi(midi);
  if (!opcoes.length) return null;
  const custoMao = (p: PosicaoViolao) => usarMao && anterior
    ? Math.abs(p.casa - anterior.casa) * 2 + Math.abs(p.corda - anterior.corda) + p.casa * 0.01
    : p.casa + (p.corda === 1 ? 0.02 : 0);
  // Acima da casa 12 falta referência: a mão continua sendo o critério.
  const pontuadas = opcoes.map(p => {
    const referencia = p.casa <= 12 ? mediaTimbres(mapa?.amostras[chavePosicao(p.corda, p.casa)] ?? []) : null;
    const distancia = timbre && referencia ? distanciaTimbres(timbre, referencia) : null;
    return { p, distancia, custo: (distancia === null ? 0.45 : distancia) * (timbre && mapa ? 4 : 0) + custoMao(p) * (timbre && mapa ? 0.02 : 1) };
  }).sort((a, b) => a.custo - b.custo);
  const melhor = pontuadas[0];
  const segundo = pontuadas[1];
  const margem = segundo ? Math.max(0, segundo.custo - melhor.custo) : 1;
  const confianca = melhor.distancia === null ? (segundo ? 0.25 : 0.7)
    : Math.max(0.05, Math.min(1, 0.45 + margem / 2 - melhor.distancia / 2));
  return { ...melhor.p, confianca };
}

/** Respeita a digitação escrita; completa notas antigas sem posição mantendo o contexto. */
export function posicoesDoPasso(passo: PassoExercicio, anterior?: PosicaoViolao | null): PosicaoViolao[] {
  let contexto = anterior;
  return passo.midis.flatMap((midi, i) => {
    const escrita = passo.posicoes?.[i];
    const posicao = escrita && midiNaPosicao(escrita.corda, escrita.casa) === midi ? escrita : estimarPosicao(midi, contexto);
    if (posicao) contexto = posicao;
    return posicao ? [posicao] : [];
  });
}

export function posicoesDaSequencia(passos: PassoExercicio[]): PosicaoViolao[][] {
  let anterior: PosicaoViolao | null = null;
  return passos.map((passo) => {
    const posicoes = posicoesDoPasso(passo, anterior);
    anterior = posicoes.at(-1) ?? anterior;
    return posicoes;
  });
}
