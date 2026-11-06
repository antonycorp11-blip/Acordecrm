// Monta os casos: o que o exercício espera e o que o "aluno" tocou de verdade.

import type { Instrumento, PassoExercicio } from '../../src/lib/professorVirtual/types';
import { ACORDES_VIOLAO, CORDAS_SOLTAS } from './sintese';

export type TipoErro =
  | 'semitom'
  | 'tom'
  | 'corda-vizinha'
  | 'oitava'
  | 'acorde-parecido'
  | 'nota-no-lugar-do-acorde'
  | 'sala-em-silencio';

export interface Caso {
  id: string;
  instrumento: Instrumento;
  tipo: 'nota' | 'acorde';
  /** true = o aluno tocou o esperado; o motor deve aprovar. */
  certo: boolean;
  erro?: TipoErro;
  esperado: PassoExercicio;
  /** Notas soadas; vazio = ninguém tocou. */
  tocado: number[];
}

const NOMES = ['Dó', 'Dó#', 'Ré', 'Ré#', 'Mi', 'Fá', 'Fá#', 'Sol', 'Sol#', 'Lá', 'Lá#', 'Si'];
export const nomeNota = (m: number): string => `${NOMES[m % 12]}${Math.floor(m / 12) - 1}`;

const FAIXA: Record<Instrumento, [number, number]> = { violao: [40, 76], teclado: [48, 84] };

/** Notas pedidas: cordas soltas e notas da 1ª posição no violão; toda a faixa C3-C6 em passos no teclado. */
const NOTAS: Record<Instrumento, number[]> = {
  violao: [...CORDAS_SOLTAS, 43, 48, 52, 57, 60, 67, 72],
  teclado: [48, 52, 55, 57, 60, 62, 63, 65, 69, 72, 76, 79, 81, 84],
};

/** Tríades do teclado (posição fechada, em registros diferentes). */
export const ACORDES_TECLADO: Record<string, number[]> = {
  C: [60, 64, 67],
  Cm: [60, 63, 67],
  D: [62, 66, 69],
  Dm: [62, 65, 69],
  E: [52, 56, 59],
  Em: [52, 55, 59],
  F: [53, 57, 60],
  G: [55, 59, 62],
  A: [57, 61, 64],
  Am: [57, 60, 64],
  'C grave': [48, 52, 55],
  'C agudo': [72, 76, 79],
  'Am agudo': [69, 72, 76],
};

/** Exercício pede `chave`, aluno toca `valor`: pares que dividem notas ou mudam só uma. */
const PARES: Record<Instrumento, [string, string][]> = {
  violao: [
    ['C', 'Am'], ['Am', 'C'], ['Em', 'G'], ['G', 'Em'], ['E', 'Em'], ['Em', 'E'],
    ['A', 'Am'], ['Am', 'A'], ['G', 'D'], ['D', 'G'], ['C', 'G'], ['E', 'A'],
  ],
  teclado: [
    ['C', 'Am'], ['Am', 'C'], ['Em', 'G'], ['G', 'Em'], ['E', 'Em'], ['Em', 'E'],
    ['A', 'Am'], ['Am', 'A'], ['D', 'Dm'], ['Dm', 'D'], ['C', 'Cm'], ['Cm', 'C'],
    ['C agudo', 'Am agudo'], ['Am agudo', 'C agudo'],
  ],
};

export function montarCasos(): Caso[] {
  const casos: Caso[] = [];
  for (const instrumento of ['violao', 'teclado'] as Instrumento[]) {
    const [min, max] = FAIXA[instrumento];

    for (const m of NOTAS[instrumento]) {
      const esperado: PassoExercicio = { midis: [m], rotulo: nomeNota(m) };
      casos.push({ id: `${instrumento} nota ${nomeNota(m)} certa`, instrumento, tipo: 'nota', certo: true, esperado, tocado: [m] });
      const erros: [TipoErro, number][] = [
        ['semitom', m + 1], ['semitom', m - 1], ['tom', m + 2], ['tom', m - 2], ['oitava', m + 12], ['oitava', m - 12],
      ];
      if (instrumento === 'violao') {
        const i = CORDAS_SOLTAS.indexOf(m);
        if (i >= 0 && i + 1 < CORDAS_SOLTAS.length) erros.push(['corda-vizinha', CORDAS_SOLTAS[i + 1]]);
        if (i > 0) erros.push(['corda-vizinha', CORDAS_SOLTAS[i - 1]]);
      }
      for (const [erro, t] of erros) {
        if (t < min || t > max) continue;
        casos.push({
          id: `${instrumento} pede ${nomeNota(m)}, toca ${nomeNota(t)} (${erro})`,
          instrumento, tipo: 'nota', certo: false, erro, esperado, tocado: [t],
        });
      }
      // Sala vazia: basta uma amostra da faixa, o áudio é o mesmo para qualquer nota pedida.
      if (NOTAS[instrumento].indexOf(m) % 3 === 0) {
        casos.push({
          id: `${instrumento} pede ${nomeNota(m)}, sala em silêncio`,
          instrumento, tipo: 'nota', certo: false, erro: 'sala-em-silencio', esperado, tocado: [],
        });
      }
    }

    const acordes = instrumento === 'violao' ? ACORDES_VIOLAO : ACORDES_TECLADO;
    for (const [nome, midis] of Object.entries(acordes)) {
      const esperado: PassoExercicio = { midis, rotulo: nome };
      casos.push({ id: `${instrumento} acorde ${nome} certo`, instrumento, tipo: 'acorde', certo: true, esperado, tocado: midis });
      // Aluno tocou só a nota mais grave em vez do acorde.
      casos.push({
        id: `${instrumento} pede ${nome}, toca só ${nomeNota(midis[0])}`,
        instrumento, tipo: 'acorde', certo: false, erro: 'nota-no-lugar-do-acorde', esperado, tocado: [midis[0]],
      });
      if (nome === 'C' || nome === 'G' || nome === 'Em') {
        casos.push({
          id: `${instrumento} pede ${nome}, sala em silêncio`,
          instrumento, tipo: 'acorde', certo: false, erro: 'sala-em-silencio', esperado, tocado: [],
        });
      }
    }
    for (const [pede, toca] of PARES[instrumento]) {
      casos.push({
        id: `${instrumento} pede ${pede}, toca ${toca}`,
        instrumento, tipo: 'acorde', certo: false, erro: 'acorde-parecido',
        esperado: { midis: acordes[pede], rotulo: pede }, tocado: acordes[toca],
      });
    }
  }
  return casos;
}
