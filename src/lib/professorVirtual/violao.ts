import type { ExercicioVirtual, PassoExercicio } from './types';
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

export type ParametrosEscala = {
  tonica: number; cordaRaiz: 3 | 4 | 5 | 6;
  modo: 'jonio'; sentido: 'subir' | 'descer' | 'subir_descer';
};
const INTERVALOS_MODOS: Record<ParametrosEscala['modo'], number[]> = {
  jonio: [0, 2, 4, 5, 7, 9, 11, 12],
};

/** A distribuição 2-3-3 fixa a digitação nas três cordas escolhidas. */
export function gerarEscala({ tonica, cordaRaiz, modo, sentido }: ParametrosEscala): ExercicioVirtual {
  const aberta = AFINACAO_VIOLAO[cordaRaiz - 1];
  const primeiraCasa = ((tonica - aberta) % 12 + 12) % 12;
  const intervalos = INTERVALOS_MODOS[modo];
  const cordaDoGrau = (i: number) => cordaRaiz - (i < 2 ? 0 : i < 5 ? 1 : 2);
  const casasDesde = (raiz: number) => intervalos.map((intervalo, i) => raiz + intervalo - AFINACAO_VIOLAO[cordaDoGrau(i) - 1]);
  // A oitava muda na escala inteira: mudar nota por nota quebraria o desenho.
  let raiz = aberta + primeiraCasa;
  if (Math.min(...casasDesde(raiz)) < 0) raiz += 12;
  const casas = casasDesde(raiz);
  const casasPresas = casas.filter(casa => casa > 0);
  const menorCasa = casasPresas.length ? Math.min(...casasPresas) : 1;
  const subir = intervalos.map((intervalo, i) => {
    const casa = casas[i];
    const dedo = casa === 0 ? 0 : Math.min(4, Math.max(1, casa - menorCasa + 1));
    return { midis: [raiz + intervalo], posicoes: [{ corda: cordaDoGrau(i), casa, dedo }] };
  });
  const descida = [...subir].reverse().map(p => ({ ...p, posicoes: p.posicoes.map(posicao => ({ ...posicao })) }));
  return {
    titulo: `Escala de ${['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si'][tonica]} maior · ${cordaRaiz}ª corda`,
    instrumento: 'violao',
    descricao: 'Modo jônio. Digitação inicial editável pelo professor.',
    passos: sentido === 'subir' ? subir : sentido === 'descer' ? descida : [...subir, ...descida.slice(1)],
  };
}

const janelas = Array.from({ length: 13 }, (_, i) => i);
const cabeNaJanela = (p: PosicaoViolao, janela: number) =>
  p.casa === 0 || (p.casa >= Math.max(1, janela) && p.casa <= janela + 4);
const custoLocal = (p: PosicaoViolao, janela: number) =>
  p.casa === 0 ? (janela <= 1 ? 0.05 : 9 + janela) : p.casa * 0.015;
const custoTransicao = (anterior: PosicaoViolao, atual: PosicaoViolao, janelaAnterior: number, janela: number) =>
  Math.abs(janela - janelaAnterior) * 5 +
  (anterior.corda !== atual.corda ? 0.45 : 0) +
  (anterior.corda === atual.corda ? Math.max(0, Math.abs(atual.casa - anterior.casa) - 2) * 1.5 : Math.max(0, Math.abs(atual.corda - anterior.corda) - 1) * 1.2) +
  (anterior.casa > 0 && atual.casa === 0 && (janela > 1 || anterior.casa > 2) ? 5 : 0) +
  (anterior.casa === 0 && atual.casa > 0 && janela > 1 ? 3 : 0);

export function estimarPosicao(midi: number, anterior?: PosicaoViolao | null, timbre?: TimbreViolao | null, mapa?: MapaViolao | null, usarMao = true): EstimativaPosicao | null {
  const opcoes = posicoesDoMidi(midi);
  if (!opcoes.length) return null;
  const custoMao = (p: PosicaoViolao) => usarMao && anterior
    ? Math.min(...janelas.filter(j => cabeNaJanela(p, j)).flatMap(j =>
      janelas.filter(a => cabeNaJanela(anterior, a)).map(a => custoTransicao(anterior, p, a, j) + custoLocal(p, j) + Math.abs(a - Math.max(1, anterior.casa - 2)) * 0.5)))
    : Math.min(...janelas.filter(j => cabeNaJanela(p, j)).map(j => custoLocal(p, j) + j * 0.1));
  // Acima da casa 12 falta referência: a mão continua sendo o critério.
  const pontuadas = opcoes.map(p => {
    const referencia = p.casa <= 12 ? mediaTimbres(mapa?.amostras[chavePosicao(p.corda, p.casa)] ?? []) : null;
    const distancia = timbre && referencia ? distanciaTimbres(timbre, referencia) : null;
    return { p, distancia, custo: custoMao(p) };
  }).sort((a, b) => a.custo - b.custo);
  const menorCusto = pontuadas[0].custo;
  const proximas = pontuadas.filter(item => item.custo - menorCusto <= 0.25);
  const comTimbre = proximas.filter(item => item.distancia !== null && item.distancia <= 0.15);
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
  type Estado = { posicao: PosicaoViolao; janela: number; custo: number; anterior: number };
  const camadas: Estado[][] = [];
  opcoes.forEach((lista, i) => {
    const estados = lista.flatMap(posicao => janelas.filter(janela => cabeNaJanela(posicao, janela)).map(janela => ({ posicao, janela, custo: Infinity, anterior: -1 })));
    estados.forEach(estado => {
      const local = custoLocal(estado.posicao, estado.janela);
      if (i === 0) { estado.custo = local + estado.janela * 0.08; return; }
      camadas[i - 1].forEach((prev, k) => {
        const custo = prev.custo + custoTransicao(prev.posicao, estado.posicao, prev.janela, estado.janela) + local;
        if (custo < estado.custo) { estado.custo = custo; estado.anterior = k; }
      });
    });
    camadas.push(estados);
  });
  let escolha = camadas.at(-1)!.reduce((best, estado, i, lista) => estado.custo < lista[best].custo ? i : best, 0);
  const resultado = [...passos];
  for (let i = passos.length - 1; i >= 0; i--) {
    const { posicao, anterior } = camadas[i][escolha];
    if (passos[i].midis.length === 1) resultado[i] = { ...passos[i], posicoes: [{ ...posicao, dedo: passos[i].posicoes?.[0]?.dedo }] };
    escolha = anterior;
  }
  return resultado;
}
