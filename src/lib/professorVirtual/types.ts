// Contrato do Professor Virtual: exercícios fixos da escola e a escuta do aluno.
// O motor de áudio confere o som contra o passo ESPERADO (não transcreve áudio livre).

export type Instrumento = 'violao' | 'teclado';

/** Um passo do exercício: 1 nota = melodia; 2 ou mais = acorde. Notas em MIDI (60 = Dó central). */
export interface PassoExercicio {
  midis: number[];
  /** Posições no violão: corda 1 = Mi agudo, 6 = Mi grave; casa 0 = solta. */
  posicoes?: { corda: number; casa: number; dedo?: number }[];
  /** Dedilhado da mão direita no teclado, editável pelo professor. */
  dedo?: number;
  /** Nome exibido ao aluno, ex.: "Dó", "C", "Am". */
  rotulo?: string;
  /** Duração gravada pelo professor, em ms (usada para ritmo; opcional no modo "espera a nota"). */
  duracaoMs?: number;
  /** Dica pedagógica, ex.: "3ª casa da corda Lá, dedo 3". */
  dica?: string;
}

export interface ExercicioVirtual {
  id?: number;
  titulo: string;
  instrumento: Instrumento;
  descricao?: string;
  bpm?: number | null;
  passos: PassoExercicio[];
}

/** Uma leitura do microfone (várias por segundo). */
export interface LeituraAudio {
  tempoMs: number;
  /** Volume em dBFS (RMS). */
  nivelDb: number;
  /** Há som tocado acima do ruído de fundo calibrado. */
  temSom: boolean;
  /** Ataque de nota detectado neste quadro. */
  ataque: boolean;
  /** Nota principal (MIDI, com fração) ou null; confiança de 0 a 1. */
  midi: number | null;
  confianca: number;
  /** Confirmação espectral do alvo esperado na janela curta. */
  alvoDominante?: boolean;
  /** Energia das 12 classes de nota (Dó=0 ... Si=11), normalizada de 0 a 1. */
  croma: number[];
  /** Medida única após o ataque; ausente nos demais quadros. */
  timbre?: TimbreViolao;
}

export interface TimbreViolao {
  /** Harmônicos 1 a 10 em dB relativos ao mais forte (0 dB). */
  harmonicosDb: number[];
  /** Centroide dividido pela fundamental, independente da nota. */
  centroideRelativo: number;
  /** Desvio RMS dos parciais em cents frente aos harmônicos ideais. */
  inharmonicidadeCents: number;
}

/** Resultado da conferência de um passo. */
export interface ResultadoPasso {
  indice: number;
  correto: boolean;
  /** 0 a 1: quão bem o som bateu com o esperado. */
  pontuacao: number;
  /** Notas ouvidas (classes 0-11 no acorde; MIDI na melodia). */
  ouvido: number[];
  /** Texto para o aluno, ex.: "Você tocou Ré, a nota é Mi." */
  mensagem: string;
  /** Afinação em cents quando for nota única. */
  desvioCents?: number;
  /** Tempo entre ataque detectado e aprovação. */
  atrasoAprovacaoMs?: number;
}

/** Interface do motor; a tela e o teste de precisão dependem só disto. */
export interface MotorEscuta {
  /** Pede o microfone (precisa vir de um toque do usuário no iOS). */
  iniciar(instrumento: Instrumento): Promise<void>;
  /** Mede o ruído do ambiente por alguns segundos, em silêncio. */
  calibrar(duracaoMs?: number): Promise<{ ruidoDb: number; qualidade: 'boa' | 'media' | 'ruim' }>;
  aoLer(cb: (l: LeituraAudio) => void): () => void;
  definirAlvo(midi: number | null): void;
  sampleRate(): number | null;
  parar(): void;
}

/** Compara as leituras com o exercício, passo a passo (avança quando o aluno acerta). */
export interface SeguidorExercicio {
  processar(l: LeituraAudio): ResultadoPasso | null;
  passoAtual(): number;
  concluido(): boolean;
  reiniciar(): void;
}
