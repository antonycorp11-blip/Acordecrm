// Confere as leituras do microfone contra o passo esperado e conduz o aluno pelo exercício.

import { classeDaNota, nomeNota, NOMES_NOTAS } from './analise';
import type { ExercicioVirtual, LeituraAudio, PassoExercicio, ResultadoPasso, SeguidorExercicio } from './types';

export interface OpcoesSeguidor {
  /** Até aqui a nota está afinada. */
  toleranciaCents?: number;
  /** Entre a tolerância e este valor, a resposta é "Quase". */
  quaseCents?: number;
  /** Tempo de nota firme exigido antes de avaliar. */
  estabilidadeMs?: number;
  /** Quanto a nota pode oscilar e ainda contar como firme. */
  variacaoEstavelCents?: number;
  /** Trecho logo após o ataque que nunca é avaliado (transiente e sobra da nota anterior). */
  ignorarAtaqueMs?: number;
  confiancaMinima?: number;
  /** Depois disso sem nota firme, o ataque é descartado sem resultado (batida, fala). */
  tempoMaxColetaMs?: number;
  /** Silêncio exigido para o som voltar contar como nota nova sem ataque detectado. */
  silencioMinimoMs?: number;
  /** Mudança de nota, sem ataque detectado, que já conta como nota nova (legato). */
  mudancaNotaCents?: number;
  /** Aceita a nota uma oitava fora, com aviso. Por padrão, só no violão. */
  aceitarOitava?: boolean;
  /** Espera a janela do croma encher só com o acorde novo. */
  esperaAcordeMs?: number;
  /** Tempo de média do croma depois da espera. */
  coletaAcordeMs?: number;
  /** Fração do pico do croma para considerar uma nota presente. */
  presencaMinima?: number;
  /** Fração do pico do croma para considerar forte uma nota que não é do acorde. */
  notaEstranhaForte?: number;
  similaridadeMinima?: number;
  /** A quinta justa é a nota que mais some no celular; sem ela o acorde passa, com aviso. */
  quintaOpcional?: boolean;
}

const mediana = (valores: number[]) => {
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[ordenados.length >> 1];
};

const listar = (nomes: string[]) =>
  nomes.length < 2 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;

const limitar = (v: number) => Math.min(1, Math.max(0, v));

export function createSeguidor(exercicio: ExercicioVirtual, opcoes: OpcoesSeguidor = {}): SeguidorExercicio {
  const {
    toleranciaCents = 40,
    quaseCents = 70,
    estabilidadeMs = 120,
    variacaoEstavelCents = 50,
    ignorarAtaqueMs = 50,
    confiancaMinima = 0.75,
    tempoMaxColetaMs = 900,
    silencioMinimoMs = 200,
    aceitarOitava = exercicio.instrumento === 'violao',
    esperaAcordeMs = 190,
    coletaAcordeMs = 150,
    presencaMinima = 0.2,
    notaEstranhaForte = 0.6,
    similaridadeMinima = 0.7,
    quintaOpcional = true,
  } = opcoes;

  const passos = exercicio.passos;
  let indice = 0;
  let tinhaSom = false;
  let ultimoSomMs = -Infinity;
  let coletando = false;
  let inicioAtaqueMs = 0;
  let sequencia: { t: number; midi: number }[] = [];
  let somaCroma = new Array<number>(12).fill(0);
  let quadrosCroma = 0;
  let recentes: { midi: number; t: number }[] = [];
  let niveis: { t: number; db: number }[] = [];
  let inicioErroMs: number | null = null;
  let midiErro: number | null = null;

  const pularVazios = () => {
    while (indice < passos.length && passos[indice].midis.length === 0) indice++;
  };

  const zerarColeta = () => {
    coletando = false;
    sequencia = [];
    somaCroma = new Array<number>(12).fill(0);
    quadrosCroma = 0;
    inicioErroMs = null;
    midiErro = null;
  };

  const concluirAvaliacao = (resultado: ResultadoPasso) => {
    const tempo = sequencia.at(-1)?.t ?? inicioAtaqueMs;
    zerarColeta();
    if (resultado.correto) {
      for (const midi of passos[indice].midis) recentes.push({ midi, t: tempo });
      indice++;
      pularVazios();
    }
    return resultado;
  };

  function avaliarNota(midiOuvido: number, passo: PassoExercicio): ResultadoPasso {
    const esperado = passo.midis[0];
    const desvio = (midiOuvido - esperado) * 100;
    const oitavas = Math.round(desvio / 1200);
    const resto = desvio - oitavas * 1200;
    const ouvido = [Math.round(midiOuvido)];
    const base = { indice, ouvido };
    const nome = nomeNota(esperado);

    if (Math.abs(resto) <= quaseCents && oitavas !== 0) {
      const lado = oitavas > 0 ? 'acima' : 'abaixo';
      const distancia = Math.abs(oitavas) === 1 ? 'uma oitava' : `${Math.abs(oitavas)} oitavas`;
      if (aceitarOitava && Math.abs(oitavas) === 1 && Math.abs(resto) <= toleranciaCents) {
        return { ...base, correto: true, pontuacao: 0.7, desvioCents: resto, mensagem: `Boa, é ${nome}! Só que soou uma oitava ${lado} da pedida.` };
      }
      return { ...base, correto: false, pontuacao: 0.4, desvioCents: resto, mensagem: `A nota é ${nome} mesmo, mas ${distancia} ${lado} da pedida.` };
    }
    if (Math.abs(desvio) <= toleranciaCents) {
      const pontuacao = 1 - (0.4 * Math.abs(desvio)) / toleranciaCents;
      return { ...base, correto: true, pontuacao, desvioCents: desvio, mensagem: `Boa! ${nome} certinho.` };
    }
    if (Math.abs(desvio) <= quaseCents) {
      const lado = desvio > 0 ? 'agudo' : 'grave';
      return { ...base, correto: false, pontuacao: 0.5, desvioCents: desvio, mensagem: `Quase: está um pouco ${lado}.` };
    }
    return { ...base, correto: false, pontuacao: 0, desvioCents: desvio, mensagem: `Você tocou ${nomeNota(midiOuvido)}, a nota é ${nome}.` };
  }

  function avaliarAcorde(croma: number[], passo: PassoExercicio): ResultadoPasso {
    const topo = Math.max(...croma, 1e-9);
    const normal = croma.map(v => v / topo);
    const classes = [...new Set(passo.midis.map(classeDaNota))];
    const raiz = classeDaNota(Math.min(...passo.midis));
    const quinta = (raiz + 7) % 12;
    const opcional = (c: number) => quintaOpcional && classes.length >= 3 && c === quinta;

    const ausentes = classes.filter(c => normal[c] < presencaMinima);
    const faltam = ausentes.filter(c => !opcional(c)).map(c => NOMES_NOTAS[c]);
    const fracas = ausentes.filter(opcional).map(c => NOMES_NOTAS[c]);
    const estranhas = normal
      .map((v, c) => ({ v, c }))
      .filter(({ v, c }) => !classes.includes(c) && v >= notaEstranhaForte)
      .sort((a, b) => b.v - a.v)
      .map(({ c }) => NOMES_NOTAS[c]);

    const produto = classes.reduce((soma, c) => soma + normal[c], 0);
    const norma = Math.sqrt(normal.reduce((soma, v) => soma + v * v, 0) * classes.length);
    const similaridade = norma > 0 ? produto / norma : 0;
    const pontuacao = limitar(
      similaridade * (1 - (0.3 * faltam.length) / classes.length - 0.15 * estranhas.length - 0.1 * fracas.length),
    );
    const correto = faltam.length === 0 && estranhas.length === 0 && similaridade >= similaridadeMinima;
    const ouvido = normal.flatMap((v, c) => (v >= presencaMinima ? [c] : []));
    const nome = passo.rotulo ?? 'pedido';

    let mensagem: string;
    if (correto) {
      mensagem = `Boa! Acorde ${nome} certo.`;
      if (fracas.length > 0) mensagem += ` Só a nota ${listar(fracas)} ficou fraca.`;
    } else if (faltam.length === 1) {
      mensagem = `Falta a nota ${faltam[0]} no acorde.`;
    } else if (faltam.length > 1) {
      mensagem = `Faltam as notas ${listar(faltam)} no acorde.`;
    } else if (estranhas.length > 0) {
      mensagem = `Tem nota a mais soando: ${listar(estranhas)}. Confira os dedos.`;
    } else {
      mensagem = `Ainda não soou como o acorde ${nome}. Tente de novo com calma.`;
    }
    return { indice, correto, pontuacao, ouvido, mensagem };
  }

  function processarNota(l: LeituraAudio, passo: PassoExercicio): ResultadoPasso | null {
    if (!l.temSom) {
      zerarColeta();
      return null;
    }
    if (coletando) {
      const decorrido = l.tempoMs - inicioAtaqueMs;
      if (decorrido < ignorarAtaqueMs) return null;
      if (decorrido > tempoMaxColetaMs) { zerarColeta(); return null; }
    }
    // Sem ataque, só se pode confirmar o alvo novo; jamais reprovar nem repetir a nota anterior.
    if (!coletando && (recentes.length === 0 || recentes.some(({ midi }) =>
      [0, 7, 12, 19, 24, -7, -12].some(intervalo =>
        Math.abs(passo.midis[0] - midi - intervalo) * 100 <= quaseCents,
      )))) return null;
    if (l.midi === null || l.confianca < confiancaMinima) return null;

    if (sequencia.length > 0 && Math.abs(l.midi - mediana(sequencia.map(q => q.midi))) * 100 > variacaoEstavelCents) {
      sequencia = [];
    }
    sequencia.push({ t: l.tempoMs, midi: l.midi });
    sequencia = sequencia.filter(q => l.tempoMs - q.t <= Math.max(200, estabilidadeMs));
    if (sequencia.length < 3 || l.tempoMs - sequencia[0].t < estabilidadeMs) return null;

    const midiFirme = mediana(sequencia.map(q => q.midi));
    const resultado = avaliarNota(midiFirme, passo);
    if (resultado.correto) return concluirAvaliacao(resultado);
    if (!coletando) return null;

    // O pitch pode preferir a corda antiga numa mistura. A presença do alvo no croma prevalece.
    const classeEsperada = classeDaNota(passo.midis[0]);
    const pico = Math.max(...l.croma, 1e-9);
    if (recentes.length > 0 && l.croma[classeEsperada] / pico >= 0.45) {
      return concluirAvaliacao(avaliarNota(passo.midis[0], passo));
    }
    const ressonancia = recentes.some(({ midi }) => [0, 7, 12, 19, 24, -7, -12].some(
      intervalo => Math.abs(midiFirme - midi - intervalo) * 100 <= quaseCents,
    ));
    if (ressonancia) { inicioErroMs = null; midiErro = null; return null; }
    if (midiErro === null || Math.abs(midiFirme - midiErro) * 100 > variacaoEstavelCents) {
      midiErro = midiFirme;
      inicioErroMs = l.tempoMs;
      return null;
    }
    if (inicioErroMs === null || l.tempoMs - inicioErroMs < 200) return null;
    return concluirAvaliacao(resultado);
  }

  function processarAcorde(l: LeituraAudio, passo: PassoExercicio): ResultadoPasso | null {
    if (!coletando) return null;
    // Exigir som até o fim da coleta também descarta palmas e batidas, que somem antes disso.
    if (!l.temSom) {
      zerarColeta();
      return null;
    }
    const decorrido = l.tempoMs - inicioAtaqueMs;
    if (decorrido < esperaAcordeMs) return null;
    l.croma.forEach((v, c) => {
      somaCroma[c] += v;
    });
    quadrosCroma++;
    if (quadrosCroma < 3 || decorrido < esperaAcordeMs + coletaAcordeMs) return null;
    const croma = [...somaCroma];
    const classes = passo.midis.map(classeDaNota);
    for (const { midi } of recentes) {
      for (const classe of [classeDaNota(midi), classeDaNota(midi + 7)]) {
        if (!classes.includes(classe)) croma[classe] = 0;
      }
    }
    return concluirAvaliacao(avaliarAcorde(croma, passo));
  }

  pularVazios();

  return {
    processar(l) {
      if (indice >= passos.length) return null;
      recentes = recentes.filter(r => l.tempoMs - r.t <= 2000);
      niveis = niveis.filter(n => l.tempoMs - n.t <= 90);
      const nivelAnterior = niveis.length ? Math.min(...niveis.map(n => n.db)) : -Infinity;
      const energiaSubindo = l.nivelDb > nivelAnterior;
      niveis.push({ t: l.tempoMs, db: l.nivelDb });
      // Sem o silêncio mínimo, a cauda oscilando no limiar viraria nota nova e seria conferida contra o passo seguinte.
      const somComecou = l.temSom && !tinhaSom && l.tempoMs - ultimoSomMs >= silencioMinimoMs;
      tinhaSom = l.temSom;
      if (l.temSom) ultimoSomMs = l.tempoMs;
      if ((l.ataque || somComecou) && energiaSubindo) {
        zerarColeta();
        coletando = true;
        inicioAtaqueMs = l.tempoMs;
      }
      const passo = passos[indice];
      return passo.midis.length > 1 ? processarAcorde(l, passo) : processarNota(l, passo);
    },
    passoAtual: () => indice,
    concluido: () => indice >= passos.length,
    reiniciar() {
      indice = 0;
      tinhaSom = false;
      ultimoSomMs = -Infinity;
      recentes = [];
      niveis = [];
      zerarColeta();
      pularVazios();
    },
  };
}
