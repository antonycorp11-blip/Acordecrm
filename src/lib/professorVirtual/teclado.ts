import type { ExercicioVirtual, PassoExercicio } from './types';

export type TipoEscalaTeclado = 'maior' | 'menor_natural' | 'menor_harmonica' | 'menor_melodica';
export type MaoTeclado = 'direita' | 'esquerda';
export type ParametrosEscalaTeclado = { tonica: number; tipo: TipoEscalaTeclado; oitavas: number; mao?: MaoTeclado };
export const TIPOS_ESCALA_TECLADO: { valor: TipoEscalaTeclado; nome: string }[] = [
  { valor: 'maior', nome: 'maior' }, { valor: 'menor_natural', nome: 'menor natural' },
  { valor: 'menor_harmonica', nome: 'menor harmônica' }, { valor: 'menor_melodica', nome: 'menor melódica' },
];
const GRAUS: Record<TipoEscalaTeclado, number[]> = {
  maior: [0, 2, 4, 5, 7, 9, 11], menor_natural: [0, 2, 3, 5, 7, 8, 10],
  menor_harmonica: [0, 2, 3, 5, 7, 8, 11], menor_melodica: [0, 2, 3, 5, 7, 9, 11],
};
// Uma grafia por armadura convencional para cada uma das 12 classes de tônica.
const TONICAS_MAIORES = ['Dó', 'Ré♭', 'Ré', 'Mi♭', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Lá♭', 'Lá', 'Si♭', 'Si'];
const TONICAS_MENORES = ['Dó', 'Dó♯', 'Ré', 'Mi♭', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Sol♯', 'Lá', 'Si♭', 'Si'];
export function nomeTonicaTeclado(tonica: number, tipo: TipoEscalaTeclado = 'maior'): string {
  validarTonica(tonica);
  return (tipo === 'maior' ? TONICAS_MAIORES : TONICAS_MENORES)[tonica];
}
const LETRAS = ['Dó', 'Ré', 'Mi', 'Fá', 'Sol', 'Lá', 'Si'];
const NATURAIS = [0, 2, 4, 5, 7, 9, 11];
// Mão direita: padrão inicial por tônica, editável em cada passo do exercício.
export const DEDILHADO_DIREITA: Record<number, readonly number[]> = {
  0: [1, 2, 3, 1, 2, 3, 4, 5], 1: [2, 3, 1, 2, 3, 4, 1, 2],
  2: [1, 2, 3, 1, 2, 3, 4, 5], 3: [3, 1, 2, 3, 4, 1, 2, 3],
  4: [1, 2, 3, 1, 2, 3, 4, 5], 5: [1, 2, 3, 4, 1, 2, 3, 4],
  6: [2, 3, 4, 1, 2, 3, 1, 2], 7: [1, 2, 3, 1, 2, 3, 4, 5],
  8: [3, 4, 1, 2, 3, 1, 2, 3], 9: [1, 2, 3, 1, 2, 3, 4, 5],
  10: [4, 1, 2, 3, 1, 2, 3, 4], 11: [1, 2, 3, 1, 2, 3, 4, 5],
};
const DEDILHADO_ESQUERDA = [5, 4, 3, 2, 1, 3, 2, 1];
function validarTonica(tonica: number) {
  if (!Number.isInteger(tonica) || tonica < 0 || tonica > 11) throw new RangeError('Tônica deve ser de 0 a 11.');
}
function nomeGrau(tonica: number, tipo: TipoEscalaTeclado, grau: number, intervalo: number): string {
  const nomeRaiz = (tipo === 'maior' ? TONICAS_MAIORES : TONICAS_MENORES)[tonica];
  const indiceRaiz = LETRAS.findIndex(letra => nomeRaiz.startsWith(letra));
  const indice = (indiceRaiz + grau) % 7;
  const classe = (tonica + intervalo) % 12;
  const diferenca = (classe - NATURAIS[indice] + 12) % 12;
  return LETRAS[indice] + (diferenca === 1 ? '♯' : diferenca === 2 ? '𝄪' : diferenca === 11 ? '♭' : diferenca === 10 ? '𝄫' : '');
}
export function gerarEscalaTeclado({ tonica, tipo, oitavas, mao = 'direita' }: ParametrosEscalaTeclado): ExercicioVirtual {
  validarTonica(tonica);
  if (!GRAUS[tipo]) throw new RangeError('Tipo de escala inválido.');
  if (!Number.isInteger(oitavas) || oitavas < 1 || oitavas > 2) throw new RangeError('Oitavas deve ser de 1 a 2.');
  const raiz = (mao === 'esquerda' ? 36 : 60) + tonica;
  const nome = (tipo === 'maior' ? TONICAS_MAIORES : TONICAS_MENORES)[tonica];
  const criar = (oitava: number, grau: number, intervalo: number): PassoExercicio => ({
    midis: [raiz + oitava * 12 + intervalo], rotulo: nomeGrau(tonica, tipo, grau, intervalo),
    dedo: mao === 'esquerda' ? DEDILHADO_ESQUERDA[grau] : DEDILHADO_DIREITA[tonica][grau],
  });
  const subida = Array.from({ length: oitavas }, (_, o) => GRAUS[tipo].map((intervalo, grau) => criar(o, grau, intervalo))).flat();
  subida.push({ midis: [raiz + oitavas * 12], rotulo: nome, dedo: mao === 'esquerda' ? DEDILHADO_ESQUERDA[7] : DEDILHADO_DIREITA[tonica][7] });
  const descidaGraus = tipo === 'menor_melodica' ? GRAUS.menor_natural : GRAUS[tipo];
  const descida = Array.from({ length: oitavas }, (_, k) => {
    const o = oitavas - 1 - k;
    return descidaGraus.map((_, i) => {
      const grau = 6 - i;
      return criar(o, grau, descidaGraus[grau]);
    });
  }).flat();
  return { titulo: `Escala de ${nome} ${TIPOS_ESCALA_TECLADO.find(t => t.valor === tipo)!.nome}`, instrumento: 'teclado',
    descricao: `${oitavas} ${oitavas === 1 ? 'oitava' : 'oitavas'} · mão ${mao} · dedilhado editável`, passos: [...subida, ...descida] };
}

export function gerarHanon({ tonica, tipo = 'maior', mao = 'direita', retorno = 'salto' }: {
  tonica: number; tipo?: TipoEscalaTeclado; mao?: MaoTeclado; retorno?: 'salto' | 'passando';
}): ExercicioVirtual {
  validarTonica(tonica);
  if (!GRAUS[tipo]) throw new RangeError('Tipo de escala inválido.');
  const graus = GRAUS[tipo];
  const raiz = (mao === 'esquerda' ? 36 : 60) + tonica;
  const dedoSubida = mao === 'esquerda' ? [5, 4, 3, 2, 1] : [1, 2, 3, 4, 5];
  const dedoVolta = mao === 'esquerda' ? [2, 3, 4] : [4, 3, 2];
  const passos = Array.from({ length: 8 }, (_, inicio) => {
    const ordem = [inicio, inicio + 2, inicio + 3, inicio + 4, inicio + 5];
    if (retorno === 'passando') ordem.push(inicio + 4, inicio + 3, inicio + 2);
    return ordem.map((grau, i): PassoExercicio => ({
      midis: [raiz + 12 * Math.floor(grau / 7) + graus[grau % 7]],
      rotulo: nomeGrau(tonica, tipo, grau % 7, graus[grau % 7]),
      dedo: i < 5 ? dedoSubida[i] : dedoVolta[i - 5],
    }));
  }).flat();
  return { titulo: `Hanon em ${nomeTonicaTeclado(tonica, tipo)} ${TIPOS_ESCALA_TECLADO.find(t => t.valor === tipo)!.nome}`,
    instrumento: 'teclado', descricao: `Padrão diatônico · mão ${mao} · dedilhado editável`, passos };
}
