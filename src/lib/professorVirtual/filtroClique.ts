// Separa o clique do metrônomo da nota tocada, sem atrasar a escuta.
// O clique tem 3 kHz (onde o alto-falante do celular é mais alto) + 6 kHz (harmônico: a distorção do
// alto-falante só gera 3, 9, 12 kHz... nada na faixa das notas). O motor corta essas faixas antes da
// análise de nota. Por segurança, nos poucos quadros em que o clique chega ao microfone, o volume e o
// "tem som" ficam como estavam (sem ataque falso); se o aluno tocou junto com o clique, o ataque é
// devolvido no quadro seguinte. Nada é segurado depois: funciona até 500 BPM.

import type { LeituraAudio } from './types';

export const FREQ_CLIQUE_HZ = 3000;
export const FREQS_CLIQUE_HZ = [3000, 6000];

// Horários (relógio do AudioContext, em ms) em que um clique foi agendado.
const agenda: number[] = [];
export function registrarClique(tempoMs: number): void {
  agenda.push(tempoMs);
  if (agenda.length > 128) agenda.splice(0, agenda.length - 128);
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
  /** A faixa do clique precisa chegar perto do volume da nota; o violão/teclado tem pouco nessa faixa. */
  relacaoMinimaDb?: number;
  /** Segurança: sem um clique novo (subida da faixa), nunca congelar mais que isso (som agudo contínuo não é clique). */
  maxCongeladoMs?: number;
  /** Na saída do clique, subida de volume que indica nota nova tocada junto. */
  subidaNotaDb?: number;
}

export interface FiltroClique {
  /** `bandaDb`: volume só na faixa do clique, no mesmo quadro. `esperado`: há clique agendado por perto. */
  processar(l: LeituraAudio, bandaDb: number, esperado: boolean): LeituraAudio;
  reiniciar(): void;
}

export function criarFiltroClique(opcoes: OpcoesFiltroClique = {}): FiltroClique {
  const { subidaDb = 12, minimoDb = -80, relacaoMinimaDb = -12, maxCongeladoMs = 160, subidaNotaDb = 4 } = opcoes;
  // Piso da faixa = menor valor dos últimos quadros: entre dois cliques a faixa sempre volta a cair,
  // mesmo com clique a cada 120 ms (500 BPM).
  const historicoBanda: number[] = [];
  let anterior: LeituraAudio | null = null; // última leitura fora do clique
  let base: LeituraAudio | null = null;     // leitura de antes do clique em andamento
  let inicioCongeladoMs: number | null = null;
  let menorNivel = Infinity;

  return {
    processar(l, bandaDb, esperado) {
      const t = l.tempoMs;
      const piso = historicoBanda.length ? Math.min(...historicoBanda) : bandaDb;
      const bandaAnterior = historicoBanda.length ? historicoBanda[historicoBanda.length - 1] : bandaDb;
      // Clique novo chegando (faixa subindo): em BPM alto os cliques emendam, e cada um renova o prazo.
      if (inicioCongeladoMs !== null && bandaDb >= bandaAnterior + 6) inicioCongeladoMs = t;
      historicoBanda.push(bandaDb);
      if (historicoBanda.length > 6) historicoBanda.shift();
      const congeladoHa = inicioCongeladoMs === null ? 0 : t - inicioCongeladoMs;
      // Só congela se o clique de fato mexeu na leitura (volume subiu ou virou "ataque"); com uma nota
      // forte soando, o resto do clique some embaixo dela e nada precisa ser segurado.
      const mexeu = l.ataque || l.nivelDb >= (inicioCongeladoMs !== null ? (base?.nivelDb ?? -Infinity) : (anterior?.nivelDb ?? -Infinity)) + 3;
      const clique = esperado && bandaDb >= minimoDb && bandaDb >= piso + subidaDb
        && bandaDb - l.nivelDb >= relacaoMinimaDb && congeladoHa < maxCongeladoMs && (mexeu || inicioCongeladoMs !== null);

      if (clique) {
        if (inicioCongeladoMs === null) { inicioCongeladoMs = t; base = anterior; menorNivel = Infinity; }
        // O clique só soma volume: o menor entre o atual e o de antes acompanha a nota caindo,
        // e a próxima nota (mesmo repetida) ainda aparece como subida.
        const nivelDb = Math.min(l.nivelDb, base?.nivelDb ?? l.nivelDb);
        menorNivel = Math.min(menorNivel, nivelDb);
        if (!base?.temSom) return { ...l, ataque: false, temSom: false, nivelDb, midi: null, confianca: 0, alvoDominante: false };
        // A nota já vem sem a faixa do clique: segue valendo, só sem ataque falso.
        return { ...l, ataque: false, temSom: true, nivelDb };
      }

      let saida = l;
      if (inicioCongeladoMs !== null) {
        const referenciaDb = Math.min(base?.nivelDb ?? Infinity, menorNivel);
        const subiu = l.temSom && (!base?.temSom || l.nivelDb >= referenciaDb + subidaNotaDb);
        const trocouNota = l.temSom && l.midi !== null && base?.midi != null && l.confianca >= 0.6 && Math.abs(l.midi - base.midi) >= 0.6;
        if (!l.ataque && (subiu || trocouNota)) saida = { ...l, ataque: true };
        inicioCongeladoMs = null;
        base = null;
      }
      anterior = saida;
      return saida;
    },
    reiniciar() {
      historicoBanda.length = 0;
      anterior = null;
      base = null;
      inicioCongeladoMs = null;
    },
  };
}
