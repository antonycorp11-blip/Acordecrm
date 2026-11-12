// Separa o clique do metrônomo da nota tocada.
// O clique é um tom puro de FREQ_CLIQUE_HZ (fora da faixa das notas). A análise de nota recebe o som
// já sem essa faixa (filtro no motor) e, por segurança, os quadros em que o clique chega ao microfone
// não podem virar "ataque" nem "começo de som". Se o aluno tocou junto com o clique (o objetivo do
// metrônomo!), o ataque é devolvido logo que o clique passa.

import type { LeituraAudio } from './types';

/** Tom único: dois tons no alto-falante do celular geram um terceiro (a diferença) dentro da faixa das notas. */
export const FREQ_CLIQUE_HZ = 4800;

// Horários (relógio do AudioContext, em ms) em que um clique foi agendado.
const agenda: number[] = [];
export function registrarClique(tempoMs: number): void {
  agenda.push(tempoMs);
  if (agenda.length > 64) agenda.splice(0, agenda.length - 64);
}
export function limparCliques(): void { agenda.length = 0; }
/** Saída do alto-falante + entrada do microfone passam de 300 ms em alguns Android. */
export function cliqueEsperado(tempoMs: number, latenciaMaxMs = 450): boolean {
  for (let i = agenda.length - 1; i >= 0; i--) {
    const t = agenda[i];
    if (tempoMs >= t - 30 && tempoMs <= t + latenciaMaxMs) return true;
    if (t + latenciaMaxMs < tempoMs) break;
  }
  return false;
}

export interface OpcoesFiltroClique {
  /** Quanto a faixa do clique precisa subir acima do próprio piso para contar como clique. */
  subidaDb?: number;
  /** Abaixo disso a faixa é considerada silêncio, mesmo subindo. */
  minimoDb?: number;
  /** Segurança: nunca segurar mais que isso seguido (som agudo contínuo não é clique). */
  maxQuadros?: number;
  /** Na saída do clique, subida de volume que indica nota nova tocada junto. */
  subidaNotaDb?: number;
}

export interface FiltroClique {
  /** `bandaDb`: volume só na faixa do clique, no mesmo quadro. `esperado`: há clique agendado por perto. */
  processar(l: LeituraAudio, bandaDb: number, esperado: boolean): LeituraAudio;
  reiniciar(): void;
}

export function criarFiltroClique(opcoes: OpcoesFiltroClique = {}): FiltroClique {
  const { subidaDb = 12, minimoDb = -80, maxQuadros = 6, subidaNotaDb = 4 } = opcoes;
  let pisoBanda: number | null = null;
  let anterior: LeituraAudio | null = null; // última leitura fora do clique
  let antesDoClique: LeituraAudio | null = null;
  let quadrosNoClique = 0;

  return {
    processar(l, bandaDb, esperado) {
      const piso = pisoBanda ?? bandaDb;
      const clique = esperado && bandaDb >= minimoDb && bandaDb >= piso + subidaDb && quadrosNoClique < maxQuadros;

      if (clique) {
        if (quadrosNoClique === 0) antesDoClique = anterior;
        quadrosNoClique++;
        const base = antesDoClique;
        const tinhaSom = base?.temSom ?? false;
        // Congela volume e "tem som" como estavam antes do clique; a nota (já filtrada) segue valendo se havia som.
        return {
          ...l,
          ataque: false,
          temSom: tinhaSom,
          nivelDb: base?.nivelDb ?? l.nivelDb,
          ...(tinhaSom ? {} : { midi: null, confianca: 0, alvoDominante: false }),
        };
      }

      // Piso da faixa: desce rápido, sobe devagar (só fora do clique).
      pisoBanda = pisoBanda === null ? bandaDb : bandaDb < pisoBanda ? bandaDb : pisoBanda + 0.05 * (bandaDb - pisoBanda);

      let saida = l;
      if (quadrosNoClique > 0) {
        const base = antesDoClique;
        const subiu = l.temSom && (!base?.temSom || l.nivelDb >= base.nivelDb + subidaNotaDb);
        const trocouNota = l.temSom && l.midi !== null && base?.midi != null && l.confianca >= 0.6 && Math.abs(l.midi - base.midi) >= 0.6;
        if (!l.ataque && (subiu || trocouNota)) saida = { ...l, ataque: true };
        quadrosNoClique = 0;
        antesDoClique = null;
      }
      anterior = saida;
      return saida;
    },
    reiniciar() {
      pisoBanda = null;
      anterior = null;
      antesDoClique = null;
      quadrosNoClique = 0;
    },
  };
}
