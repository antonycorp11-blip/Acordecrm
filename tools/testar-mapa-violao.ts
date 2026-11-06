import assert from 'node:assert/strict';
import { adicionarAmostra, novaCalibracao, normalizarTimbre } from '../src/lib/professorVirtual/calibracao';
import { estimarPosicao, gerarEscala, otimizarSequencia } from '../src/lib/professorVirtual/violao';
import type { TimbreViolao } from '../src/lib/professorVirtual/types';

const grave: TimbreViolao = { harmonicosDb: [0, -4, -8, -12, -15, -18, -21, -23, -26, -29], centroideRelativo: 2.1, inharmonicidadeCents: 4 };
const brilhante: TimbreViolao = { harmonicosDb: [-7, 0, -2, -4, -6, -8, -10, -12, -14, -16], centroideRelativo: 4.5, inharmonicidadeCents: 13 };
const maisAlto = { ...grave, harmonicosDb: grave.harmonicosDb.map(v => v + 17) };
assert.deepEqual(normalizarTimbre(maisAlto).harmonicosDb, normalizarTimbre(grave).harmonicosDb);

// MIDI 48: 5ª/3 e 6ª/8. A mão anterior favorece 6ª/8; o timbre favorece 5ª/3.
let mapa = novaCalibracao('Sintético');
mapa = adicionarAmostra(mapa, 5, 3, grave);
mapa = adicionarAmostra(mapa, 6, 8, brilhante);
assert.equal(estimarPosicao(48, { corda: 6, casa: 8 })?.corda, 6);
assert.equal(estimarPosicao(48, { corda: 6, casa: 8 }, grave, mapa)?.corda, 6);
assert.equal(estimarPosicao(48, null, brilhante, mapa, false)?.corda, 5);
assert.equal(estimarPosicao(48, null, grave, mapa)?.confianca! >= 0, true);
const sequencia = [56, 57, 58, 59].map(midi => ({ midis: [midi] }));
let anterior = { corda: 3, casa: 0 };
for (const [i, midi] of [56, 57, 58, 59].entries()) {
  const posicao = estimarPosicao(midi, anterior)!;
  assert.deepEqual([posicao.corda, posicao.casa], [3, i + 1]);
  anterior = posicao;
}
assert.deepEqual(otimizarSequencia(sequencia).map(passo => passo.posicoes?.[0]?.casa), [1, 2, 3, 4]);
assert.deepEqual(otimizarSequencia(sequencia).map(passo => passo.posicoes?.[0]?.corda), [3, 3, 3, 3]);
const doMaior = [48, 50, 52, 53, 55, 57, 59, 60].map(midi => ({ midis: [midi] }));
const esperadas = [[5, 3], [5, 5], [4, 2], [4, 3], [4, 5], [3, 2], [3, 4], [3, 5]];
assert.deepEqual(otimizarSequencia(doMaior).map(p => [p.posicoes?.[0].corda, p.posicoes?.[0].casa]), esperadas);
assert.deepEqual(gerarEscala({ tonica: 0, cordaRaiz: 5, modo: 'jonio', sentido: 'subir' }).passos.map(p => [p.posicoes?.[0].corda, p.posicoes?.[0].casa]), esperadas);
for (const cordaRaiz of [6, 5, 4, 3] as const) {
  const notas = gerarEscala({ tonica: 0, cordaRaiz, modo: 'jonio', sentido: 'subir' }).passos;
  assert.deepEqual(notas.map(p => p.posicoes?.[0].corda), [cordaRaiz, cordaRaiz, cordaRaiz - 1, cordaRaiz - 1, cordaRaiz - 1, cordaRaiz - 2, cordaRaiz - 2, cordaRaiz - 2]);
  assert.deepEqual(notas.map(p => p.midis[0] - notas[0].midis[0]), [0, 2, 4, 5, 7, 9, 11, 12]);
}
const primeiraPosicao = otimizarSequencia([
  { midis: [60], posicoes: [{ corda: 2, casa: 1 }] },
  { midis: [64] }, { midis: [65] },
], new Set([0]));
assert.deepEqual(primeiraPosicao.map(p => [p.posicoes?.[0].corda, p.posicoes?.[0].casa]), [[2, 1], [1, 0], [1, 1]]);
assert.equal(otimizarSequencia([
  { midis: [48], posicoes: [{ corda: 5, casa: 3 }] },
  { midis: [50], posicoes: [{ corda: 4, casa: 0 }] },
  { midis: [52], posicoes: [{ corda: 4, casa: 2 }] },
  { midis: [53], posicoes: [{ corda: 4, casa: 3 }] },
  { midis: [55], posicoes: [{ corda: 3, casa: 0 }] },
], new Set([0, 1, 2, 3, 4]))[4].posicoes?.[0].casa, 0);
assert.deepEqual(otimizarSequencia([{ midis: [55], posicoes: [{ corda: 4, casa: 5, dedo: 4 }] }], new Set([0]))[0].posicoes?.[0], { corda: 4, casa: 5, dedo: 4 });
console.log('Lógica sintética do mapa: OK (sem medir precisão acústica).');
