// Reproduz em Node o que motor.ts faz no navegador: passa-alta, AnalyserNode, leitura a cada 32 ms,
// calibração e entrega das leituras ao seguidor. Só usa o motor pelas funções públicas.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  avaliarRuido,
  criarAnalisadorQuadros,
  FREQ_MAX_HZ,
  FREQ_MIN_HZ,
  LIMIAR_PADRAO_DB,
  tamanhoJanelaAnalise,
} from '../../src/lib/professorVirtual/analise';
import { createSeguidor, type OpcoesSeguidor } from '../../src/lib/professorVirtual/seguidor';
import type { ExercicioVirtual, Instrumento, ResultadoPasso } from '../../src/lib/professorVirtual/types';
import { aplicarBiquad, criarRng, gauss, passaAltas } from './dsp';

// Copiadas de motor.ts, que não as exporta (e depende de window). conferirConstantes() trava a divergência.
const INTERVALO_LEITURA_MS = 32;
const CALIBRACAO_MS = 2000;
const DESCARTE_CALIBRACAO_MS = 300;
const PASSA_ALTA_HZ = 55;
const FREQ_MAX_VIOLAO_HZ = 1400;

/** Tempo de sala antes do toque: calibração inteira e uma folga até o aluno tocar. */
export const PRE_RUIDO_S = 3;

/** Falha alto se motor.ts mudar e a simulação ficar para trás. */
export function conferirConstantes(): void {
  const fonte = readFileSync(join(import.meta.dirname, '../../src/lib/professorVirtual/motor.ts'), 'utf8');
  const esperadas: Record<string, number> = {
    INTERVALO_LEITURA_MS, CALIBRACAO_PADRAO_MS: CALIBRACAO_MS, DESCARTE_CALIBRACAO_MS, PASSA_ALTA_HZ, FREQ_MAX_VIOLAO_HZ,
  };
  for (const [nome, valor] of Object.entries(esperadas)) {
    const achado = fonte.match(new RegExp(`const ${nome} = (\\d+)`));
    if (!achado || Number(achado[1]) !== valor) {
      throw new Error(`simulador.ts desatualizado: ${nome} em motor.ts é ${achado?.[1]}, aqui é ${valor}`);
    }
  }
}

export interface Saida {
  resultados: { r: ResultadoPasso; tMs: number }[];
  passoFinal: number;
  concluido: boolean;
  ruidoDb: number;
  limiarDb: number;
  leituras: number;
}

export function simular(
  audio: Float32Array,
  sr: number,
  exercicio: ExercicioVirtual,
  inicioToque: number,
  semente: number,
  opcoes: OpcoesSeguidor = {},
): Saida {
  const instrumento: Instrumento = exercicio.instrumento;
  // Web Audio: Q do highpass é em dB; o padrão é 1 dB.
  const entrada = aplicarBiquad(audio, passaAltas(PASSA_ALTA_HZ, Math.pow(10, 1 / 20), sr));
  const tamanho = tamanhoJanelaAnalise(sr);
  const analisador = criarAnalisadorQuadros({
    limiarDb: LIMIAR_PADRAO_DB,
    pitch: { freqMinHz: FREQ_MIN_HZ, freqMaxHz: instrumento === 'violao' ? FREQ_MAX_VIOLAO_HZ : FREQ_MAX_HZ },
  });
  const seguidor = createSeguidor(exercicio, opcoes);
  const rng = criarRng(semente ^ 0x5eed);

  analisador.definirLimiar(0);
  const niveis: number[] = [];
  const fimCalibracaoMs = CALIBRACAO_MS + DESCARTE_CALIBRACAO_MS;
  let calibrando = true;
  let ruidoDb = 0, limiarDb = LIMIAR_PADRAO_DB, leituras = 0;
  const resultados: Saida['resultados'] = [];
  const toqueMs = (inicioToque / sr) * 1000;

  let t = (tamanho / sr) * 1000 + 1;
  while (true) {
    // O AnalyserNode avança em blocos de 128 amostras; o setInterval do celular nunca é exato.
    const fim = Math.floor(((t / 1000) * sr) / 128) * 128;
    if (fim > entrada.length) break;
    const tempoMs = (fim / sr) * 1000;
    const leitura = analisador.processar(entrada.subarray(fim - tamanho, fim), sr, tempoMs);
    leituras++;
    if (calibrando) {
      if (tempoMs >= DESCARTE_CALIBRACAO_MS) niveis.push(leitura.nivelDb);
      if (tempoMs >= fimCalibracaoMs) {
        const a = avaliarRuido(niveis);
        ruidoDb = a.ruidoDb;
        limiarDb = a.limiarDb;
        analisador.definirLimiar(a.limiarDb);
        calibrando = false;
      }
    } else {
      const r = seguidor.processar(leitura);
      if (r) resultados.push({ r, tMs: tempoMs - toqueMs });
      if (seguidor.concluido()) break;
    }
    t += Math.max(4, INTERVALO_LEITURA_MS + gauss(rng) * 3);
  }
  return { resultados, passoFinal: seguidor.passoAtual(), concluido: seguidor.concluido(), ruidoDb, limiarDb, leituras };
}
