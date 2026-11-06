// Bancada de precisão do Professor Virtual.
// Uso: npx tsx tools/bancada-professor-virtual/rodar.ts [--repeticoes 1] [--filtro "texto do caso"] [--detalhe]
// Com --filtro imprime cada tentativa e não grava resultado.md.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { OpcoesSeguidor } from '../../src/lib/professorVirtual/seguidor';
import type { ExercicioVirtual, Instrumento, PassoExercicio } from '../../src/lib/professorVirtual/types';
import { montarCasos, nomeNota, ACORDES_TECLADO, type Caso } from './casos';
import { colocarNoQuarto, misturarNoMicrofone, passarPeloMicrofone, somenteSala } from './degradar';
import { criarRng, gauss, hashTexto } from './dsp';
import { ACORDES_VIOLAO, tocarTeclado, tocarViolao } from './sintese';
import { conferirConstantes, PRE_RUIDO_S, simular } from './simulador';
import { acertou, celula, latencias, matrizErros, matrizPrincipal, piorCaso, tabela, type Tentativa } from './relatorio';

const args = process.argv.slice(2);
const opcao = (nome: string) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : undefined; };
const REPETICOES = Number(opcao('--repeticoes') ?? 1);
const FILTRO = opcao('--filtro');

const SRS = [44100, 48000];
const SNRS = [30, 20, 10];
const NIVEIS = [-6, -12, -18, -24];
const DUR_S = 3;

interface Variacao {
  afinacaoCents?: number;
  strumMs?: number;
  forca?: number;
  nivelDb?: number;
  toque?: 'dedo' | 'palheta';
}

/** Som seco, com cache: as três SNRs de um mesmo toque usam o mesmo áudio. */
const cacheSeco = new Map<string, Float32Array>();
function seco(instrumento: Instrumento, tocado: number[], sr: number, rep: number, v: Variacao = {}): Float32Array {
  const chave = `${instrumento}|${tocado.join(',')}|${sr}|${rep}|${JSON.stringify(v)}`;
  const achado = cacheSeco.get(chave);
  if (achado) return achado;
  const rng = criarRng(hashTexto(chave));
  // Afinação de verdade: instrumento nunca está exato; o teclado digital está quase.
  const violao = instrumento === 'violao';
  const afinacaoCents = v.afinacaoCents ?? gauss(rng) * (violao ? 5 : 0.5);
  const base = {
    rng, durS: DUR_S, afinacaoCents,
    espalhamentoCents: violao ? 4 : 0.5,
    forca: v.forca ?? 0.5 + rng() * 0.4,
    toque: v.toque,
  };
  const y = violao ? tocarViolao(tocado, sr, { ...base, strumMs: v.strumMs }) : tocarTeclado(tocado, sr, base);
  cacheSeco.set(chave, y);
  return y;
}

/** Som seco já no quarto e na cápsula; também compartilhado entre as SNRs. */
const cacheQuarto = new Map<string, Float32Array>();
function noQuarto(instrumento: Instrumento, tocado: number[], sr: number, rep: number, v: Variacao): Float32Array {
  const chave = `${instrumento}|${tocado.join(',')}|${sr}|${rep}|${JSON.stringify(v)}`;
  let y = cacheQuarto.get(chave);
  if (!y) {
    y = colocarNoQuarto(seco(instrumento, tocado, sr, rep, v), sr, hashTexto(chave));
    cacheQuarto.set(chave, y);
  }
  return y;
}

function limparCaches() {
  cacheSeco.clear();
  cacheQuarto.clear();
}

function tentar(
  caso: Caso, sr: number, snrDb: number, rep: number, v: Variacao = {}, opcoes: OpcoesSeguidor = {},
): Tentativa {
  const semente = hashTexto(`${caso.id}|${sr}|${snrDb}|${rep}|${JSON.stringify(v)}`);
  const nivelDb = v.nivelDb ?? NIVEIS[semente % NIVEIS.length];
  const mic = { sr, snrDb, semente, nivelDb, preRuidoS: PRE_RUIDO_S };
  let audio: Float32Array, inicioToque: number;
  if (caso.tocado.length === 0) {
    audio = somenteSala(PRE_RUIDO_S + DUR_S, mic);
    inicioToque = Math.round(PRE_RUIDO_S * sr);
  } else {
    ({ audio, inicioToque } = misturarNoMicrofone(noQuarto(caso.instrumento, caso.tocado, sr, rep, v), mic));
  }
  const exercicio: ExercicioVirtual = { titulo: caso.id, instrumento: caso.instrumento, passos: [caso.esperado] };
  const s = simular(audio, sr, exercicio, inicioToque, semente, opcoes);
  const aprovado = s.resultados.find((x) => x.r.correto);
  return {
    caso, sr, snrDb, nivelDb, semente,
    aprovou: !!aprovado,
    reprovacoes: s.resultados.filter((x) => !x.r.correto).length,
    latenciaMs: aprovado?.tMs ?? null,
    ultimaMensagem: s.resultados.at(-1)?.r.mensagem ?? '',
  };
}

function varrer(casos: Caso[], rotulo: string): Tentativa[] {
  const ts: Tentativa[] = [];
  const inicio = Date.now();
  // sr e repetição por fora: o cache de áudio pode ser esvaziado entre as rodadas.
  for (const sr of SRS) {
    for (let rep = 0; rep < REPETICOES; rep++) {
      for (const caso of casos) for (const snr of SNRS) ts.push(tentar(caso, sr, snr, rep));
      limparCaches();
      console.error(`[${rotulo}] sr ${sr} rep ${rep}: ${ts.length} tentativas, ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
    }
  }
  return ts;
}

// --- Sequências: o que só aparece com mais de um passo ---

interface Sequencia {
  nome: string;
  instrumento: Instrumento;
  passos: PassoExercicio[];
  /** Toques reais; por padrão, os próprios passos. */
  toques?: number[][];
  /** Passo final correto para esta sequência. */
  passoEsperado?: number;
  intervaloS?: number;
  /** Deixa o toque anterior soar (cordas soltas diferentes); senão abafa. */
  deixaSoar?: boolean;
}

const nota = (m: number): PassoExercicio => ({ midis: [m], rotulo: nomeNota(m) });
const acV = (n: string): PassoExercicio => ({ midis: ACORDES_VIOLAO[n], rotulo: n });
const acT = (n: string): PassoExercicio => ({ midis: ACORDES_TECLADO[n], rotulo: n });

const SEQUENCIAS: Sequencia[] = [
  { nome: 'violão: 6 cordas soltas em ordem, deixando soar', instrumento: 'violao', passos: [40, 45, 50, 55, 59, 64].map(nota), deixaSoar: true },
  { nome: 'violão: Dó maior na 1ª posição', instrumento: 'violao', passos: [48, 50, 52, 53, 55, 57, 59, 60].map(nota), intervaloS: 0.8 },
  { nome: 'violão: mesma nota 3 vezes', instrumento: 'violao', passos: [52, 52, 52].map(nota) },
  { nome: 'violão: C G Am Em', instrumento: 'violao', passos: ['C', 'G', 'Am', 'Em'].map(acV), intervaloS: 1.5 },
  { nome: 'violão: mesmo acorde 2 vezes', instrumento: 'violao', passos: ['G', 'G'].map(acV), intervaloS: 1.5 },
  { nome: 'teclado: Dó maior', instrumento: 'teclado', passos: [60, 62, 64, 65, 67, 69, 71, 72].map(nota), intervaloS: 0.6 },
  { nome: 'teclado: mesma nota 3 vezes', instrumento: 'teclado', passos: [60, 60, 60].map(nota), intervaloS: 0.7 },
  { nome: 'teclado: C F G Am', instrumento: 'teclado', passos: ['C', 'F', 'G', 'Am'].map(acT), intervaloS: 1.2 },
  // Um toque só não pode valer por dois: o som que continua soando não é nota nova.
  { nome: 'violão: pede Mi 2 vezes, toca 1 vez', instrumento: 'violao', passos: [52, 52].map(nota), toques: [[52]], passoEsperado: 1 },
  { nome: 'violão: pede G 2 vezes, toca 1 vez', instrumento: 'violao', passos: ['G', 'G'].map(acV), toques: [ACORDES_VIOLAO.G], passoEsperado: 1 },
  { nome: 'teclado: pede Dó 2 vezes, toca 1 vez', instrumento: 'teclado', passos: [60, 60].map(nota), toques: [[60]], passoEsperado: 1 },
  { nome: 'teclado: pede C 2 vezes, toca 1 vez', instrumento: 'teclado', passos: ['C', 'C'].map(acT), toques: [ACORDES_TECLADO.C], passoEsperado: 1 },
  // Passo 2 errado, mas o passo 1 ainda soa: não pode avançar.
  { nome: 'violão: Mi, Lá pedidos; toca Mi e Fá', instrumento: 'violao', passos: [52, 57].map(nota), toques: [[52], [53]], passoEsperado: 1 },
  { nome: 'teclado: C, Am pedidos; toca C e Em', instrumento: 'teclado', passos: ['C', 'Am'].map(acT), toques: [ACORDES_TECLADO.C, ACORDES_TECLADO.Em], passoEsperado: 1, intervaloS: 1.2 },
];

function rodarSequencia(q: Sequencia, sr: number, snrDb: number, rep: number) {
  const toques = q.toques ?? q.passos.map((p) => p.midis);
  const passo = q.intervaloS ?? 1;
  const total = passo * (toques.length - 1) + DUR_S;
  const n = Math.round(total * sr);
  const mix = new Float32Array(n);
  toques.forEach((midis, i) => {
    const y = seco(q.instrumento, midis, sr, rep * 100 + i);
    const ini = Math.round(i * passo * sr);
    // A mão abafa o toque anterior em ~80 ms quando chega o próximo, salvo se for para deixar soar.
    const corte = !q.deixaSoar && i + 1 < toques.length ? Math.round(passo * sr) : Infinity;
    const queda = Math.round(0.08 * sr);
    for (let k = 0; k < y.length && ini + k < n; k++) {
      const g = k < corte ? 1 : Math.max(0, 1 - (k - corte) / queda);
      mix[ini + k] += y[k] * g;
    }
  });
  const semente = hashTexto(`${q.nome}|${sr}|${snrDb}|${rep}`);
  const nivelDb = NIVEIS[semente % 2]; // celular razoavelmente perto: aqui o foco é a sequência
  const { audio, inicioToque } = passarPeloMicrofone(mix, { sr, snrDb, semente, nivelDb, preRuidoS: PRE_RUIDO_S });
  const s = simular(audio, sr, { titulo: q.nome, instrumento: q.instrumento, passos: q.passos }, inicioToque, semente);
  return { passo: s.passoFinal, alvo: q.passoEsperado ?? q.passos.length, mensagens: s.resultados.map((x) => x.r.mensagem) };
}

function secaoSequencias(): string {
  const linhas: string[][] = [];
  for (const q of SEQUENCIAS) {
    const celulas = SNRS.map((snr) => {
      let ok = 0, n = 0;
      const finais: number[] = [];
      for (const sr of SRS) for (let rep = 0; rep < Math.max(3, REPETICOES); rep++) {
        const r = rodarSequencia(q, sr, snr, rep);
        n++;
        if (r.passo === r.alvo) ok++;
        finais.push(r.passo);
      }
      limparCaches();
      return `${ok}/${n} (passos: ${finais.join(',')})`;
    });
    const alvo = q.passoEsperado ?? q.passos.length;
    linhas.push([q.nome, String(alvo), ...celulas]);
    console.error(`[sequências] ${q.nome}`);
  }
  return tabela(['Sequência', 'Passo final certo', ...SNRS.map((s) => `SNR ${s} dB`)], linhas);
}

// --- Estresse: condições fora da matriz principal, em SNR 20 dB ---

function secaoEstresse(casos: Caso[]): string {
  const certos = (i: Instrumento, t: Caso['tipo']) => casos.filter((c) => c.certo && c.instrumento === i && c.tipo === t);
  const linhas: string[][] = [];
  const medir = (rotulo: string, lista: Caso[], v: Variacao, ajuste?: (c: Caso) => Caso) => {
    const ts: Tentativa[] = [];
    for (const sr of SRS) for (let rep = 0; rep < REPETICOES; rep++) {
      for (const c of lista) ts.push(tentar(ajuste ? ajuste(c) : c, sr, 20, rep, v));
      limparCaches();
    }
    linhas.push([rotulo, celula(ts)]);
    console.error(`[estresse] ${rotulo}`);
  };
  const tiraCorda = (c: Caso): Caso => {
    const meio = Math.floor(c.tocado.length / 2);
    return { ...c, id: `${c.id} sem a corda do meio`, tocado: c.tocado.filter((_, i) => i !== meio) };
  };
  const tiraPrimeira = (c: Caso): Caso => ({ ...c, id: `${c.id} sem o baixo`, tocado: c.tocado.slice(1) });
  const av = certos('violao', 'acorde'), nv = certos('violao', 'nota');
  const parecidos = casos.filter((c) => c.instrumento === 'violao' && c.erro === 'acorde-parecido');
  const semitons = casos.filter((c) => c.instrumento === 'violao' && c.erro === 'semitom');
  medir('Violão aço/palheta: nota certa', nv, { toque: 'palheta' });
  medir('Violão aço/palheta: acorde certo', av, { toque: 'palheta' });
  medir('Violão aço/palheta: semitom errado (acerto = recusou)', semitons, { toque: 'palheta' });
  medir('Violão aço/palheta: acorde parecido (acerto = recusou)', parecidos, { toque: 'palheta' });
  medir('Violão nota certa, instrumento 25 cents agudo', nv, { afinacaoCents: 25 });
  medir('Violão nota certa, instrumento 35 cents grave', nv, { afinacaoCents: -35 });
  medir('Violão acorde certo, instrumento 25 cents agudo', av, { afinacaoCents: 25 });
  medir('Violão acorde certo, instrumento 35 cents grave', av, { afinacaoCents: -35 });
  medir('Violão acorde certo, strum lento (80 ms)', av, { strumMs: 80 });
  medir('Violão acorde certo, toque fraco', av, { forca: 0.2 });
  medir('Violão acorde com uma corda do meio abafada', av, {}, tiraCorda);
  medir('Violão acorde sem a corda mais grave', av, {}, tiraPrimeira);
  medir('Violão nota certa, celular longe (pico -36 dBFS)', nv, { nivelDb: -36 });
  medir('Violão acorde certo, celular longe (pico -36 dBFS)', av, { nivelDb: -36 });
  medir('Teclado nota certa, celular longe (pico -36 dBFS)', certos('teclado', 'nota'), { nivelDb: -36 });
  medir('Teclado acorde certo, celular longe (pico -36 dBFS)', certos('teclado', 'acorde'), { nivelDb: -36 });
  return tabela(['Condição (SNR 20 dB)', 'Acerto'], linhas);
}

/** Oitava no violão: padrão do motor (aceita com aviso) contra exigir a oitava exata. */
function secaoOitava(casos: Caso[], padrao: Tentativa[]): string {
  const lista = casos.filter((c) => c.instrumento === 'violao' && c.tipo === 'nota' && (c.certo || c.erro === 'oitava'));
  const estrito: Tentativa[] = [];
  for (const sr of SRS) for (let rep = 0; rep < REPETICOES; rep++) {
    for (const c of lista) for (const snr of SNRS) estrito.push(tentar(c, sr, snr, rep, {}, { aceitarOitava: false }));
    limparCaches();
  }
  console.error('[oitava] exata concluída');
  const linhas: string[][] = [];
  for (const [nome, ts] of [['padrão (aceitarOitava: true)', padrao], ['exata (aceitarOitava: false)', estrito]] as const) {
    for (const [rot, f] of [
      ['nota certa', (t: Tentativa) => t.caso.instrumento === 'violao' && t.caso.tipo === 'nota' && t.caso.certo],
      ['oitava errada', (t: Tentativa) => t.caso.instrumento === 'violao' && t.caso.erro === 'oitava'],
      ['Mi2 (corda solta 6) certo', (t: Tentativa) => t.caso.instrumento === 'violao' && t.caso.certo && t.caso.tipo === 'nota' && t.caso.esperado.midis[0] === 40],
    ] as const) {
      linhas.push([nome, rot, ...SNRS.map((s) => celula(ts.filter((t) => f(t) && t.snrDb === s)))]);
    }
  }
  return tabela(['Configuração', 'Situação', ...SNRS.map((s) => `SNR ${s} dB`)], linhas);
}

/** Como o erro aparece para o aluno nos casos certos: reprovado, ou nenhuma resposta. */
function secaoFalhas(ts: Tentativa[]): string {
  const linhas: string[][] = [];
  for (const instrumento of ['violao', 'teclado']) for (const tipo of ['nota', 'acorde']) {
    const base = ts.filter((t) => t.caso.certo && t.caso.instrumento === instrumento && t.caso.tipo === tipo);
    const n = base.length;
    const p = (k: number) => `${k} (${((k / n) * 100).toFixed(1)}%)`;
    linhas.push([
      instrumento === 'violao' ? 'Violão' : 'Teclado', tipo, String(n),
      p(base.filter((t) => t.aprovou && t.reprovacoes === 0).length),
      p(base.filter((t) => t.aprovou && t.reprovacoes > 0).length),
      p(base.filter((t) => !t.aprovou && t.reprovacoes > 0).length),
      p(base.filter((t) => !t.aprovou && t.reprovacoes === 0).length),
    ]);
  }
  return tabela(['Instrumento', 'Tipo', 'n', 'Aprovou de primeira', 'Reprovou e depois aprovou', 'Só reprovou', 'Sem resposta'], linhas);
}

function principal() {
  conferirConstantes();
  let casos = montarCasos();
  if (FILTRO) {
    casos = casos.filter((c) => c.id.includes(FILTRO));
    for (const t of varrer(casos, 'filtro')) {
      console.log(`${acertou(t) ? 'ok   ' : 'FALHA'} ${t.caso.id} | sr ${t.sr} snr ${t.snrDb} nível ${t.nivelDb} | aprovou ${t.aprovou} reprov ${t.reprovacoes} lat ${t.latenciaMs?.toFixed(0)} | ${t.ultimaMensagem}`);
    }
    return;
  }

  const inicio = Date.now();
  const ts = varrer(casos, 'matriz');
  const oitava = secaoOitava(casos, ts);
  const sequencias = secaoSequencias();
  const estresse = secaoEstresse(casos);
  const geral = (certo: boolean) => celula(ts.filter((t) => t.caso.certo === certo));
  const semOitava = ts.filter((t) => !t.caso.certo && !(t.caso.instrumento === 'violao' && t.caso.erro === 'oitava'));

  const automatico = `# Bancada de precisão do Professor Virtual

Gerado por \`npx tsx tools/bancada-professor-virtual/rodar.ts --repeticoes ${REPETICOES}\`. ${ts.length} tentativas na matriz, em ${((Date.now() - inicio) / 60000).toFixed(1)} min.
Áudio 100% sintético: isto é um teto otimista, não a precisão em quarto real.

Cada célula traz acerto, (acertos/total; intervalo de confiança de Wilson a 95%). As tentativas de um mesmo caso não são independentes, então o intervalo real é mais largo.

## Geral

- Tocou certo e foi aprovado: ${geral(true)}
- Tocou errado e foi recusado: ${geral(false)}
- Tocou errado e foi recusado, sem contar oitava no violão (aceita de propósito): ${celula(semOitava)}

## Matriz principal (configuração padrão do motor)

"Tocou certo": o que falta para 100% é falso negativo. "Tocou errado": o que falta para 100% é falso positivo.

${matrizPrincipal(ts)}

## Recusa por tipo de erro

${matrizErros(ts)}

## Como a falha aparece nos casos certos

${secaoFalhas(ts)}

## Oitava no violão

${oitava}

## Pior caso

${piorCaso(ts)}

## Tempo até aprovar (a partir do início do toque)

${latencias(ts)}

## Sequências (várias notas seguidas)

Certo = o seguidor terminou exatamente no passo indicado.

${sequencias}

## Estresse (fora da matriz)

${estresse}
`;
  const caminho = join(import.meta.dirname, 'resultado.md');
  const MARCA = '<!-- análise manual: o texto abaixo é preservado entre rodadas -->';
  const anterior = existsSync(caminho) ? readFileSync(caminho, 'utf8') : '';
  const manual = anterior.includes(MARCA) ? anterior.slice(anterior.indexOf(MARCA)) : `${MARCA}\n`;
  writeFileSync(caminho, `${automatico}\n${manual}`);
  console.log(automatico);
}

principal();
