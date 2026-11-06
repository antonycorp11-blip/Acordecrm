// Agrega as tentativas em matrizes de acerto e escreve o resumo em Markdown.

import type { Caso } from './casos';

export interface Tentativa {
  caso: Caso;
  sr: number;
  snrDb: number;
  nivelDb: number;
  semente: number;
  /** O seguidor deu o passo como correto em algum momento. */
  aprovou: boolean;
  /** Quantos resultados "incorreto" saíram antes de aprovar (ou no total, se não aprovou). */
  reprovacoes: number;
  /** Tempo do início do toque até a aprovação, em ms. */
  latenciaMs: number | null;
  ultimaMensagem: string;
}

/** Acertou = aprovou quando era certo, ou não aprovou quando era errado. */
export const acertou = (t: Tentativa): boolean => t.aprovou === t.caso.certo;

/** Intervalo de Wilson a 95%. */
export function wilson(acertos: number, n: number): [number, number] {
  if (n === 0) return [0, 0];
  const z = 1.96, p = acertos / n, d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, (c - m) / d), Math.min(1, (c + m) / d)];
}

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;

export function celula(ts: Tentativa[]): string {
  if (ts.length === 0) return '-';
  const a = ts.filter(acertou).length;
  const [lo, hi] = wilson(a, ts.length);
  return `${pct(a / ts.length)} (${a}/${ts.length}; IC ${pct(lo)}-${pct(hi)})`;
}

export function tabela(cabecalho: string[], linhas: string[][]): string {
  return [
    `| ${cabecalho.join(' | ')} |`,
    `| ${cabecalho.map(() => '---').join(' | ')} |`,
    ...linhas.map((l) => `| ${l.join(' | ')} |`),
  ].join('\n');
}

const SNRS = [30, 20, 10];

/** Matriz principal: instrumento x tipo x SNR, separando "tocou certo" de "tocou errado". */
export function matrizPrincipal(ts: Tentativa[]): string {
  const linhas: string[][] = [];
  for (const instrumento of ['violao', 'teclado']) {
    for (const tipo of ['nota', 'acorde']) {
      for (const certo of [true, false]) {
        const base = ts.filter((t) => t.caso.instrumento === instrumento && t.caso.tipo === tipo && t.caso.certo === certo);
        linhas.push([
          instrumento === 'violao' ? 'Violão' : 'Teclado',
          tipo,
          certo ? 'tocou certo (aprovar)' : 'tocou errado (recusar)',
          ...SNRS.map((s) => celula(base.filter((t) => t.snrDb === s))),
        ]);
      }
    }
  }
  return tabela(['Instrumento', 'Tipo', 'Situação', ...SNRS.map((s) => `SNR ${s} dB`)], linhas);
}

/** Acerto por tipo de erro: mostra qual confusão escapa. */
export function matrizErros(ts: Tentativa[]): string {
  const linhas: string[][] = [];
  const erros = [...new Set(ts.filter((t) => t.caso.erro).map((t) => t.caso.erro as string))];
  for (const instrumento of ['violao', 'teclado']) {
    for (const erro of erros) {
      const base = ts.filter((t) => t.caso.instrumento === instrumento && t.caso.erro === erro);
      if (base.length === 0) continue;
      linhas.push([instrumento === 'violao' ? 'Violão' : 'Teclado', erro, ...SNRS.map((s) => celula(base.filter((t) => t.snrDb === s)))]);
    }
  }
  return tabela(['Instrumento', 'Erro do aluno', ...SNRS.map((s) => `SNR ${s} dB`)], linhas);
}

/** Casos com pior taxa de acerto, somando todas as repetições, sample rates e SNRs. */
export function piorCaso(ts: Tentativa[], limite = 15): string {
  const porCaso = new Map<string, Tentativa[]>();
  for (const t of ts) {
    const l = porCaso.get(t.caso.id) ?? [];
    l.push(t);
    porCaso.set(t.caso.id, l);
  }
  const ordenado = [...porCaso.entries()]
    .map(([id, l]) => ({ id, l, taxa: l.filter(acertou).length / l.length }))
    .filter((c) => c.taxa < 1)
    .sort((a, b) => a.taxa - b.taxa || a.id.localeCompare(b.id))
    .slice(0, limite);
  if (ordenado.length === 0) return 'Nenhum caso falhou nesta rodada.';
  return tabela(
    ['Caso', 'Acerto', 'Falhas por SNR (30/20/10)', 'Exemplo para reproduzir', 'Última mensagem'],
    ordenado.map(({ id, l, taxa }) => {
      const falhas = l.filter((t) => !acertou(t));
      const ex = falhas[0];
      return [
        id,
        `${pct(taxa)} (${l.length - falhas.length}/${l.length})`,
        SNRS.map((s) => falhas.filter((t) => t.snrDb === s).length).join('/'),
        `sr ${ex.sr}, SNR ${ex.snrDb}, nível ${ex.nivelDb} dBFS, semente ${ex.semente}`,
        ex.ultimaMensagem.replace(/\|/g, '/') || '(sem resultado)',
      ];
    }),
  );
}

/** Mediana e percentil 90 da latência de aprovação nos casos certos. */
export function latencias(ts: Tentativa[]): string {
  const linhas: string[][] = [];
  for (const instrumento of ['violao', 'teclado']) {
    for (const tipo of ['nota', 'acorde']) {
      const v = ts
        .filter((t) => t.caso.certo && t.aprovou && t.caso.instrumento === instrumento && t.caso.tipo === tipo)
        .map((t) => t.latenciaMs as number)
        .sort((a, b) => a - b);
      if (v.length === 0) continue;
      linhas.push([
        instrumento === 'violao' ? 'Violão' : 'Teclado', tipo,
        `${Math.round(v[Math.floor(v.length / 2)])} ms`,
        `${Math.round(v[Math.floor(v.length * 0.9)])} ms`,
      ]);
    }
  }
  return tabela(['Instrumento', 'Tipo', 'Mediana', 'P90'], linhas);
}
