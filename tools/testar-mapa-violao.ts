import assert from 'node:assert/strict';
import { adicionarAmostra, novaCalibracao, normalizarTimbre } from '../src/lib/professorVirtual/calibracao';
import { estimarPosicao } from '../src/lib/professorVirtual/violao';
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
assert.equal(estimarPosicao(48, { corda: 6, casa: 8 }, grave, mapa)?.corda, 5);
assert.equal(estimarPosicao(48, null, brilhante, mapa, false)?.corda, 6);
assert.equal(estimarPosicao(48, null, grave, mapa)?.confianca! >= 0, true);
console.log('Lógica sintética do mapa: OK (sem medir precisão acústica).');
