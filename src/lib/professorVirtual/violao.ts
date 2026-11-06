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

const custoTransicao = (anterior: PosicaoViolao, atual: PosicaoViolao) =>
  Math.abs(atual.casa - anterior.casa) * 2 + Math.abs(atual.corda - anterior.corda) * 2.5 +
  (anterior.casa >= 1 && atual.casa === 0 ? 4 : 0) -
  (anterior.corda === atual.corda && Math.abs(atual.casa - anterior.casa) === 1 ? 3 : 0);

export function estimarPosicao(midi: number, anterior?: PosicaoViolao | null, timbre?: TimbreViolao | null, mapa?: MapaViolao | null, usarMao = true): EstimativaPosicao | null {
  const opcoes = posicoesDoMidi(midi);
  if (!opcoes.length) return null;
  const custoMao = (p: PosicaoViolao) => usarMao && anterior
    ? custoTransicao(anterior, p) + p.casa * 0.01
    : p.casa + (p.corda === 1 ? 0.02 : 0);
  // Acima da casa 12 falta referência: a mão continua sendo o critério.
  const pontuadas = opcoes.map(p => {
    const referencia = p.casa <= 12 ? mediaTimbres(mapa?.amostras[chavePosicao(p.corda, p.casa)] ?? []) : null;
    const distancia = timbre && referencia ? distanciaTimbres(timbre, referencia) : null;
    return { p, distancia, custo: custoMao(p) };
  }).sort((a, b) => a.custo - b.custo);
  const menorCusto = pontuadas[0].custo;
  const proximas = pontuadas.filter(item => item.custo - menorCusto <= 1);
  const comTimbre = proximas.filter(item => item.distancia !== null && item.distancia <= 0.35);
  const melhor = comTimbre.length && timbre && mapa
    ? [...comTimbre].sort((a, b) => (a.distancia! - b.distancia!))[0]
    : pontuadas[0];
  const segundo = pontuadas.find(item => item !== melhor);
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

/** Reavalia uma melodia inteira; índices fixos representam correções manuais. */
export function otimizarSequencia(passos: PassoExercicio[], fixos: ReadonlySet<number> = new Set()): PassoExercicio[] {
  const opcoes = passos.map((passo, i) => {
    if (passo.midis.length !== 1) return [passo.posicoes?.[0] ?? estimarPosicao(passo.midis[0])].filter((p): p is PosicaoViolao => !!p);
    const salva = passo.posicoes?.[0];
    return fixos.has(i) && salva && midiNaPosicao(salva.corda, salva.casa) === passo.midis[0]
      ? [salva] : posicoesDoMidi(passo.midis[0]);
  });
  if (opcoes.some(lista => !lista.length)) return passos;
  const custos: number[][] = [];
  const origens: number[][] = [];
  opcoes.forEach((lista, i) => {
    custos[i] = [];
    origens[i] = [];
    lista.forEach((p, j) => {
      const local = p.casa * 0.03 + (p.casa === 0 ? 0.5 : 0);
      if (i === 0) { custos[i][j] = local; origens[i][j] = -1; return; }
      const candidatos = opcoes[i - 1].map((anterior, k) => custos[i - 1][k] + custoTransicao(anterior, p));
      const origem = candidatos.indexOf(Math.min(...candidatos));
      custos[i][j] = candidatos[origem] + local;
      origens[i][j] = origem;
    });
  });
  let escolha = custos.at(-1)!.indexOf(Math.min(...custos.at(-1)!));
  const resultado = [...passos];
  for (let i = passos.length - 1; i >= 0; i--) {
    const posicao = opcoes[i][escolha];
    if (passos[i].midis.length === 1) resultado[i] = { ...passos[i], posicoes: [{ ...posicao, dedo: passos[i].posicoes?.[0]?.dedo }] };
    escolha = origens[i][escolha];
  }
  return resultado;
}
