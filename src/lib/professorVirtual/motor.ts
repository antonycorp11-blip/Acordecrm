// Motor de escuta: liga o microfone ao analisador. Toda a matemática fica em analise.ts.

import {
  avaliarRuido,
  criarAnalisadorQuadros,
  FREQ_MAX_HZ,
  FREQ_MIN_HZ,
  LIMIAR_PADRAO_DB,
  tamanhoJanelaAnalise,
  tamanhoJanelaPitch,
  type AnalisadorQuadros,
} from './analise';
import type { Instrumento, LeituraAudio, MotorEscuta } from './types';

const INTERVALO_LEITURA_MS = 32;
const CALIBRACAO_PADRAO_MS = 2000;
/** O microfone costuma estalar ao abrir; isso não é ruído do ambiente. */
const DESCARTE_CALIBRACAO_MS = 300;
/** Sem leitura por mais que isso (app em segundo plano, ligação), o histórico do detector não vale mais. */
const LACUNA_MAXIMA_MS = 500;
/** Corta pancada na mesa e vento, abaixo do Mi grave (82 Hz). */
const PASSA_ALTA_HZ = 55;
const SINAL_MINIMO_DB = -100;
// A primeira corda na casa 19 chega a 1319 Hz; acima disso, no violão, só haveria engano.
const FREQ_MAX_VIOLAO_HZ = 1400;

interface Sessao {
  contexto: AudioContext;
  stream: MediaStream;
  analyser: AnalyserNode;
  analyserLongo: AnalyserNode;
  nos: AudioNode[];
  janela: Float32Array<ArrayBuffer>;
  janelaLonga: Float32Array<ArrayBuffer>;
  analisador: AnalisadorQuadros;
  timer: ReturnType<typeof setInterval>;
  aoVoltar: () => void;
  ultimoTempoMs: number;
  limiarDb: number;
}

let contextoCompartilhado: AudioContext | null = null;
export function contextoAudioTreino(): AudioContext {
  if (contextoCompartilhado && contextoCompartilhado.state !== 'closed') return contextoCompartilhado;
  const Contexto =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Contexto) throw new Error('Este navegador não consegue ouvir o microfone. Tente o Chrome ou o Safari atualizados.');
  contextoCompartilhado = new Contexto();
  return contextoCompartilhado;
}

function erroMicrofone(erro: unknown): Error {
  const nome = erro instanceof DOMException ? erro.name : '';
  if (nome === 'NotAllowedError' || nome === 'SecurityError') {
    return new Error('Precisamos do microfone para ouvir você. Libere o acesso nas permissões do navegador.');
  }
  if (nome === 'NotFoundError' || nome === 'OverconstrainedError') {
    return new Error('Não encontramos um microfone neste aparelho.');
  }
  if (nome === 'NotReadableError' || nome === 'AbortError') {
    return new Error('O microfone está em uso por outro aplicativo. Feche-o e tente de novo.');
  }
  return new Error('Não conseguimos abrir o microfone. Tente de novo.');
}

export function createMotorEscuta(): MotorEscuta {
  const ouvintes = new Set<(l: LeituraAudio) => void>();
  let sessao: Sessao | null = null;
  // Invalida um iniciar() que ainda espera a permissão quando parar() ou outro iniciar() chega antes.
  let geracao = 0;
  let alvoEnergiaMidi: number | null = null;
  let niveisCalibracao: { t: number; db: number }[] | null = null;

  function lerQuadro(s: Sessao) {
    const tempoMs = s.contexto.currentTime * 1000;
    if (tempoMs === s.ultimoTempoMs) return;
    if (tempoMs - s.ultimoTempoMs > LACUNA_MAXIMA_MS) s.analisador.reiniciar();
    s.ultimoTempoMs = tempoMs;

    s.analyser.getFloatTimeDomainData(s.janela);
    s.analyserLongo.getFloatTimeDomainData(s.janelaLonga);
    // O sampleRate real pode não ser 44,1/48 kHz e muda de aparelho para aparelho.
    const leitura = s.analisador.processar(s.janela, s.contexto.sampleRate, tempoMs, s.janelaLonga);
    niveisCalibracao?.push({ t: tempoMs, db: leitura.nivelDb });
    if (alvoEnergiaMidi !== null) {
      const f0 = 440 * 2 ** ((alvoEnergiaMidi - 69) / 12);
      const omega = 2 * Math.PI * f0 / s.contexto.sampleRate;
      const coef = 2 * Math.cos(omega);
      let a = 0, b = 0;
      for (const amostra of s.janela) { const c = amostra + coef * a - b; b = a; a = c; }
      (leitura as LeituraAudio & { energiaF0?: number }).energiaF0 = Math.sqrt(Math.max(0, a * a + b * b - coef * a * b)) / s.janela.length;
    }
    ouvintes.forEach(cb => cb(leitura));
  }

  function encerrar(s: Sessao) {
    clearInterval(s.timer);
    document.removeEventListener('visibilitychange', s.aoVoltar);
    s.stream.getTracks().forEach(t => t.stop());
    s.nos.forEach(n => n.disconnect());

  }

  const motor: MotorEscuta = {
    async iniciar(instrumento: Instrumento) {
      motor.parar();
      const minhaGeracao = ++geracao;

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('O microfone só funciona em página segura (https) e em navegador atualizado.');
      }
      // No iOS o resume precisa sair antes do primeiro await, ainda dentro do toque do usuário.
      const contexto = contextoAudioTreino();
      const retomada = contexto.resume().catch(() => undefined);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
        });
      } catch (erro) {

        throw erroMicrofone(erro);
      }
      await retomada;
      if (minhaGeracao !== geracao) {
        stream.getTracks().forEach(t => t.stop());

        return;
      }
      if (contexto.state !== 'running') await contexto.resume().catch(() => undefined);
      if (minhaGeracao !== geracao || contexto.state !== 'running') {
        stream.getTracks().forEach(t => t.stop());

        if (minhaGeracao === geracao) throw new Error('O áudio não iniciou. Toque em Começar novamente.');
        return;
      }

      try {
        const fonte = contexto.createMediaStreamSource(stream);
        const passaAlta = contexto.createBiquadFilter();
        passaAlta.type = 'highpass';
        passaAlta.frequency.value = PASSA_ALTA_HZ;
        const analyser = contexto.createAnalyser();
        analyser.fftSize = tamanhoJanelaPitch(contexto.sampleRate);
        const analyserLongo = contexto.createAnalyser();
        analyserLongo.fftSize = tamanhoJanelaAnalise(contexto.sampleRate);
        // O Safari pode não processar um grafo sem destino; ganho zero evita microfonia.
        const mudo = contexto.createGain();
        mudo.gain.value = 0;
        fonte.connect(passaAlta);
        // Teclado: o clique do metrônomo fica acima de 3 kHz e não pode chegar à análise.
        let saidaFiltrada: AudioNode = passaAlta;
        if (instrumento === 'teclado') {
          for (let i = 0; i < 3; i++) {
            const passaBaixa = contexto.createBiquadFilter();
            passaBaixa.type = 'lowpass';
            passaBaixa.frequency.value = 1800;
            saidaFiltrada.connect(passaBaixa);
            saidaFiltrada = passaBaixa;
          }
        }
        saidaFiltrada.connect(analyser).connect(mudo).connect(contexto.destination);
        saidaFiltrada.connect(analyserLongo).connect(mudo);

        const analisador = criarAnalisadorQuadros({
          limiarDb: LIMIAR_PADRAO_DB,
          pitch: {
            freqMinHz: FREQ_MIN_HZ,
            freqMaxHz: instrumento === 'violao' ? FREQ_MAX_VIOLAO_HZ : FREQ_MAX_HZ,
          },
        });
        const aoVoltar = () => {
          // O iOS deixa o contexto "interrupted" depois de ligação ou troca de app.
          if (document.visibilityState === 'visible' && contexto.state !== 'running') {
            void contexto.resume().catch(() => undefined);
          }
        };
        document.addEventListener('visibilitychange', aoVoltar);

        const nova: Sessao = {
          contexto,
          stream,
          analyser,
          analyserLongo,
          nos: [fonte, passaAlta, analyser, analyserLongo, mudo],
          janela: new Float32Array(analyser.fftSize),
          janelaLonga: new Float32Array(analyserLongo.fftSize),
          analisador,
          timer: setInterval(() => lerQuadro(nova), INTERVALO_LEITURA_MS),
          aoVoltar,
          ultimoTempoMs: contexto.currentTime * 1000,
          limiarDb: LIMIAR_PADRAO_DB,
        };
        sessao = nova;
      } catch (erro) {
        stream.getTracks().forEach(t => t.stop());

        throw erro;
      }
    },

    async calibrar(duracaoMs = CALIBRACAO_PADRAO_MS) {
      const s = sessao;
      if (!s) throw new Error('Ligue o microfone antes de calibrar.');
      if (niveisCalibracao) throw new Error('A calibração já está em andamento.');

      // Limiar em 0 dBFS: durante a medição nada conta como som tocado.
      s.analisador.definirLimiar(0);
      const inicioMs = s.contexto.currentTime * 1000;
      const coletados: { t: number; db: number }[] = [];
      niveisCalibracao = coletados;
      await new Promise(resolve => setTimeout(resolve, duracaoMs + DESCARTE_CALIBRACAO_MS));
      niveisCalibracao = null;

      const niveis = coletados.filter(n => n.t - inicioMs >= DESCARTE_CALIBRACAO_MS).map(n => n.db);
      const avaliacao = avaliarRuido(niveis);
      const semSinal = niveis.length === 0 || avaliacao.ruidoDb <= SINAL_MINIMO_DB;
      if (sessao === s) s.analisador.definirLimiar(semSinal ? s.limiarDb : avaliacao.limiarDb);
      if (semSinal) throw new Error('Não estamos recebendo som do microfone. Confira se ele não está bloqueado ou em uso.');

      s.limiarDb = avaliacao.limiarDb;
      return { ruidoDb: avaliacao.ruidoDb, qualidade: avaliacao.qualidade };
    },

    aoLer(cb) {
      ouvintes.add(cb);
      return () => {
        ouvintes.delete(cb);
      };
    },

    definirAlvo(midi) { alvoEnergiaMidi = midi; sessao?.analisador.definirAlvo(midi); },
    sampleRate() { return sessao?.contexto.sampleRate ?? null; },

    parar() {
      geracao++;
      niveisCalibracao = null;
      if (sessao) encerrar(sessao);
      sessao = null;
    },
  };

  return motor;
}
