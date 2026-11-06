import assert from 'node:assert/strict';
import { gerarEscalaTeclado, gerarHanon, nomeTonicaTeclado, TIPOS_ESCALA_TECLADO } from '../src/lib/professorVirtual/teclado';
const esperados = {
  maior: [0, 2, 4, 5, 7, 9, 11, 12],
  menor_natural: [0, 2, 3, 5, 7, 8, 10, 12],
  menor_harmonica: [0, 2, 3, 5, 7, 8, 11, 12],
  menor_melodica: [0, 2, 3, 5, 7, 9, 11, 12],
};
for (const { valor } of TIPOS_ESCALA_TECLADO) for (let tonica = 0; tonica < 12; tonica++) {
  const passos = gerarEscalaTeclado({ tonica, tipo: valor, oitavas: 1 }).passos;
  const raiz = 60 + tonica;
  assert.deepEqual(passos.slice(0, 8).map(p => p.midis[0] - raiz), esperados[valor]);
  const desce = valor === 'menor_melodica' ? esperados.menor_natural : esperados[valor];
  assert.deepEqual(passos.slice(8).map(p => p.midis[0] - raiz), [...desce.slice(1, 7)].reverse().concat(0));
  assert.ok(passos.every(p => p.dedo && p.dedo >= 1 && p.dedo <= 5));
}
assert.equal(nomeTonicaTeclado(1, 'maior'), 'Ré♭');
assert.equal(gerarEscalaTeclado({ tonica: 1, tipo: 'maior', oitavas: 1 }).passos[3].rotulo, 'Sol♭');
assert.equal(gerarEscalaTeclado({ tonica: 6, tipo: 'maior', oitavas: 1 }).passos[6].rotulo, 'Mi♯');
assert.equal(gerarEscalaTeclado({ tonica: 11, tipo: 'maior', oitavas: 2 }).passos[14].midis[0], 95);
const midis = (tonica: number, tipo: 'maior' | 'menor_natural' = 'maior', mao: 'direita' | 'esquerda' = 'direita') =>
  gerarHanon({ tonica, tipo, mao }).passos.map(p => p.midis[0]);
assert.deepEqual(midis(0).slice(0, 16), [60,64,65,67,69,67,65,64, 62,65,67,69,71,69,67,65]);
assert.deepEqual(midis(2).slice(0, 16), [62,66,67,69,71,69,67,66, 64,67,69,71,73,71,69,67]);
assert.deepEqual(midis(9, 'menor_natural').slice(0, 10), [69,72,74,76,77,76,74,72, 71,74]);
for (const tipo of ['maior', 'menor_natural'] as const) for (let tonica = 0; tonica < 12; tonica++) {
  for (const mao of ['direita', 'esquerda'] as const) {
    const passos = gerarHanon({ tonica, tipo, mao }).passos;
    assert.equal(passos.length, 64);
    assert.equal(passos[0].midis[0], (mao === 'esquerda' ? 36 : 60) + tonica);
    assert.equal(passos[35].midis[0], (mao === 'esquerda' ? 48 : 72) + tonica);
    assert.ok(passos.every(p => p.dedo && p.dedo >= 1 && p.dedo <= 5));
    const escala = gerarEscalaTeclado({ tonica, tipo, oitavas: 1, mao });
    assert.equal(escala.passos[0].midis[0], (mao === 'esquerda' ? 36 : 60) + tonica);
  }
}
assert.equal(gerarHanon({ tonica: 0, mao: 'esquerda' }).passos[0].dedo, 5);
console.log('Teclado: 48 escalas, Hanon maior/menor nas 12 tônicas e ambas as mãos verificados.');
