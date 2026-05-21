import React from 'react';
import { MusicEngine } from '../../lib/musicEngine';

interface ChordVisualizerProps {
  instrument: string;
  chordNotes: string[];
  root: string;
  type?: string;
  ext?: string;
  bass?: string;
  notesWithIndices?: any[];
  isCustom?: boolean;
}

export const DrumsVisualizer: React.FC<{ rhythmName: string }> = ({ rhythmName }) => {
  const instruments = ['Chimbal 🔔', 'Caixa 🥁', 'Bumbo 🔊'];
  const steps = [1, 2, 3, 4, 5, 6, 7, 8];

  // Grid predefinido para bateria para ritmos clássicos
  const presetHits: Record<string, boolean[][]> = {
    'ROCK': [
      [true, true, true, true, true, true, true, true], // Chimbal
      [false, false, true, false, false, false, true, false], // Caixa
      [true, false, false, false, true, false, false, false], // Bumbo
    ],
    'SAMBA': [
      [true, true, true, true, true, true, true, true],
      [false, true, false, true, false, true, false, true],
      [true, false, true, false, true, false, true, false],
    ],
    'DEFAULT': [
      [true, false, true, false, true, false, true, false],
      [false, false, true, false, false, false, true, false],
      [true, false, false, false, true, false, false, false],
    ]
  };

  const hits = presetHits[rhythmName.toUpperCase()] || presetHits['DEFAULT'];

  return (
    <div className="bg-[#261812] p-4 border-4 border-black shadow-[4px_4px_0_#000] w-full max-w-[340px] mx-auto font-mono text-white">
      <h5 className="text-[10px] font-black text-[#ff6b00] uppercase mb-3 flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
        RITMO: {rhythmName.toUpperCase()}
      </h5>

      <div className="grid grid-cols-9 gap-1 text-center items-center">
        {/* Cabeçalho de Tempos */}
        <div className="col-span-1"></div>
        {steps.map((s) => (
          <div key={s} className="text-[7px] font-black text-white/50">{s}</div>
        ))}

        {/* Linhas de Instrumentos */}
        {instruments.map((inst, instIdx) => (
          <React.Fragment key={inst}>
            <div className="text-[7px] font-black text-left text-white/80 whitespace-nowrap">{inst}</div>
            {steps.map((_, stepIdx) => {
              const active = hits[instIdx] ? hits[instIdx][stepIdx] : false;
              return (
                <div
                  key={stepIdx}
                  className={`h-6 border-2 border-black flex items-center justify-center transition-all ${
                    active ? 'bg-[#ff6b00]' : 'bg-[#1a0a05]'
                  }`}
                >
                  {active && <span className="text-[9px] font-black text-white">X</span>}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export const KeyboardVisualizer: React.FC<{
  chordNotes: string[];
  root: string;
  type?: string;
  ext?: string;
  bass?: string;
  notesWithIndices?: any[];
  isCustom?: boolean;
}> = ({ chordNotes, root, type = 'maj', ext = '', bass = 'none', notesWithIndices, isCustom }) => {
  const CHROMATIC_SCALE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  // 8 teclas brancas → cada tecla fica ~40% mais larga e legível
  const WHITE_KEYS_COUNT = 8;

  const translateNote = (note: string) => {
    // Retorna a cifra original (ex: C, C#, G#) ao invés do solfejo falado
    return note;
  };

  const isWhiteKey = (absIdx: number) => {
    const normalized = ((absIdx % 12) + 12) % 12;
    return [0, 2, 4, 5, 7, 9, 11].includes(normalized);
  };

  // Algoritmo dinâmico: translada o teclado para começar na tônica (ou na tecla branca imediatamente anterior)
  const getStartAbsIndex = (rootNote: string) => {
    const rootEnharmonic = (rootNote || '').replace('Ab','G#').replace('Db','C#').replace('Eb','D#').replace('Gb','F#').replace('Bb','A#');
    const idx = CHROMATIC_SCALE.indexOf(rootEnharmonic);
    if (idx === -1) return 0;
    
    // Retorna a tecla branca inicial que contém ou antecede a tônica
    if (idx === 0 || idx === 1) return 0;  // C, C# -> C
    if (idx === 2 || idx === 3) return 2;  // D, D# -> D
    if (idx === 4) return 4;               // E -> E
    if (idx === 5 || idx === 6) return 5;  // F, F# -> F
    if (idx === 7 || idx === 8) return 7;  // G, G# -> G
    if (idx === 9 || idx === 10) return 9; // A, A# -> A
    if (idx === 11) return 11;             // B -> B
    return 0;
  };

  // Extrai apenas a tônica limpa (ex: 'A' de 'AMIN', 'B' de 'B7')
  const rootClean = (root || '').match(/^([A-G][#b]?)/)?.[1] || 'C';
  const rootEnharmonic = rootClean.replace('Ab','G#').replace('Db','C#').replace('Eb','D#').replace('Gb','F#').replace('Bb','A#');
  const startAbsIndex = getStartAbsIndex(rootClean);

  const whiteKeysInView: number[] = [];
  let checkIdx = startAbsIndex;
  while (whiteKeysInView.length < WHITE_KEYS_COUNT) {
    if (isWhiteKey(checkIdx)) {
      whiteKeysInView.push(checkIdx);
    }
    checkIdx++;
  }

  const blackKeysToRender: { absIndex: number; afterIdx: number }[] = [];
  for (let i = 0; i < whiteKeysInView.length - 1; i++) {
    const currentWhite = whiteKeysInView[i];
    const nextWhite = whiteKeysInView[i + 1];
    if (nextWhite - currentWhite === 2) {
      blackKeysToRender.push({ absIndex: currentWhite + 1, afterIdx: i });
    }
  }

  // Algoritmo corrigido: ilumina as notas em POSIÇÃO FUNDAMENTAL
  const highlightedAbsIndices = React.useMemo(() => {
    if (isCustom && notesWithIndices) {
      return new Set<number>(notesWithIndices);
    }
    const result = new Set<number>();
    const allVisibleKeys = [...whiteKeysInView, ...blackKeysToRender.map(bk => bk.absIndex)].sort((a, b) => a - b);

    // Encontra a posição da RAIZ dentro das teclas visíveis
    const rootIndexInKeys = allVisibleKeys.findIndex(absIdx => {
      const normalized = ((absIdx % 12) + 12) % 12;
      return CHROMATIC_SCALE[normalized] === rootEnharmonic || CHROMATIC_SCALE[normalized] === rootClean;
    });
    const startFrom = rootIndexInKeys >= 0 ? rootIndexInKeys : 0;

    // Escaneia da raiz em diante → posição fundamental garantida
    const notesLeft = new Set(chordNotes);
    const keysFromRoot = [
      ...allVisibleKeys.slice(startFrom),
      ...allVisibleKeys.slice(0, startFrom) // wrap para cobrir casos extremos
    ];

    for (const absIdx of keysFromRoot) {
      const normalized = ((absIdx % 12) + 12) % 12;
      const noteName = CHROMATIC_SCALE[normalized];
      if (notesLeft.has(noteName)) {
        result.add(absIdx);
        notesLeft.delete(noteName);
      }
      if (notesLeft.size === 0) break;
    }
    return result;
  }, [isCustom, notesWithIndices, chordNotes, rootClean, rootEnharmonic, whiteKeysInView, blackKeysToRender]);

  const isHighlighted = (absIdx: number) => {
    return highlightedAbsIndices.has(absIdx);
  };

  const getNoteName = (absIdx: number) => {
    const normalizedAbsIdx = ((absIdx % 12) + 12) % 12;
    return CHROMATIC_SCALE[normalizedAbsIdx];
  };

  const displayType = type === 'min' ? 'm' : (type === 'maj' ? '' : type);
  const displayExt = ext === 'none' || !ext ? '' : ext;
  const displayBass = bass && bass !== 'none' ? `/${bass}` : '';
  const fullChordName = isCustom ? root : `${root}${displayType}${displayExt}${displayBass}`;

  // Mapeia cifragem legível no cabeçalho do acorde
  const translateChordNote = (note: string) => {
    return note;
  };

  return (
    <div className="flex flex-col bg-[#fff8f6] border-4 border-black shadow-[6px_6px_0_#000] w-full max-w-[480px] mx-auto font-['Space_Mono'] overflow-hidden">
      {/* Header do Acorde */}
      <div className="bg-[#261812] py-2 px-3.5 flex justify-between items-center border-b-4 border-black">
        <h5 className="text-[11px] sm:text-xs font-black text-[#ff6b00] uppercase leading-none">{fullChordName}</h5>
        <div className="flex gap-1.5">
          {chordNotes.map((n, i) => (
            <span key={i} className="text-[7px] sm:text-[9px] font-black text-white/95 bg-black/40 px-1 py-0.5 border border-white/10 uppercase">{translateChordNote(n)}</span>
          ))}
        </div>
      </div>

      <div className="p-1 sm:p-2.5 bg-[#feccba]/20 flex justify-center">
        <div className="relative w-full bg-[#1a0a05] rounded-none p-1 sm:p-2 border-4 border-black shadow-inner">
          {/* Teclado responsivo usando aspect-ratio para não ficar achatado ou espremido no celular */}
          <div className="relative w-full aspect-[1.8/1] sm:aspect-[2.6/1] flex bg-[#261812] rounded-none pt-0.5 overflow-visible">
            {/* White Keys */}
            {whiteKeysInView.map((absIdx, i) => {
              const active = isHighlighted(absIdx);
              const noteName = getNoteName(absIdx);
              return (
                <div
                  key={`w-${i}`}
                  style={{ width: `${100 / WHITE_KEYS_COUNT}%` }}
                  className={`h-full border-r-2 border-black relative transition-all rounded-none ${
                    active ? 'bg-[#ff6b00]' : 'bg-white hover:bg-stone-50'
                  }`}
                >
                  {active && (
                    <div className="absolute bottom-1.5 sm:bottom-2 left-1/2 -translate-x-1/2 w-[70%] max-w-[24px] aspect-square rounded-full bg-black flex items-center justify-center border-2 border-white shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                      <span className="text-[6px] sm:text-[7.5px] font-black text-white uppercase leading-none">{translateNote(noteName)}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Black Keys */}
            {blackKeysToRender.map((bk, i) => {
              const whiteKeyWidth = 100 / WHITE_KEYS_COUNT;
              const left = (bk.afterIdx + 1) * whiteKeyWidth;
              const active = isHighlighted(bk.absIndex);
              const noteName = getNoteName(bk.absIndex);

              return (
                <div
                  key={`b-${bk.absIndex}`}
                  className={`absolute top-0 h-[60%] sm:h-[62%] z-30 flex items-end justify-center pb-1 sm:pb-1.5 rounded-none shadow-md transition-all ${
                    active ? 'bg-[#ff6b00] border-b-2 border-black' : 'bg-black hover:bg-stone-900'
                  }`}
                  style={{
                    left: `${left}%`,
                    width: `${whiteKeyWidth * 0.65}%`,
                    marginLeft: `-${(whiteKeyWidth * 0.65) / 2}%`
                  }}
                >
                  {active && (
                    <div className="w-[85%] max-w-[20px] aspect-square rounded-full bg-white flex items-center justify-center border-2 border-black shadow-sm">
                      <span className="text-[5px] sm:text-[6.5px] font-black text-black leading-none uppercase">{translateNote(noteName)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChordVisualizer: React.FC<ChordVisualizerProps> = ({
  instrument,
  chordNotes,
  root,
  type = 'maj',
  ext = '',
  bass = 'none',
  notesWithIndices,
  isCustom
}) => {
  const isTeclado =
    instrument?.toLowerCase().includes('teclado') ||
    instrument?.toLowerCase().includes('piano') ||
    instrument?.toLowerCase().includes('piano_keyboard');

  const isBateria = instrument?.toLowerCase().includes('bateria') || instrument?.toLowerCase().includes('drums');

  if (isTeclado) {
    return (
      <KeyboardVisualizer
        chordNotes={chordNotes}
        root={root}
        type={type}
        ext={ext}
        bass={bass}
        notesWithIndices={notesWithIndices}
        isCustom={isCustom}
      />
    );
  }

  if (isBateria) {
    return <DrumsVisualizer rhythmName={root} />;
  }

  // Guitarra / Violão / Baixo
  const isBass = instrument?.toLowerCase().includes('baixo') || instrument?.toLowerCase().includes('bass');
  const numStrings = isBass ? 4 : 6;
  const stringIndices = Array.from({ length: numStrings }, (_, i) => i);

  let shape: any;
  if (isCustom && notesWithIndices) {
    const frets: (number | null)[] = Array(numStrings).fill(null);
    const fingers: number[] = Array(numStrings).fill(0);
    for (let j = 0; j < notesWithIndices.length; j += 3) {
      const s = notesWithIndices[j] - 1;
      if (s < 0 || s >= numStrings) continue;
      const f = notesWithIndices[j + 1];
      const fin = notesWithIndices[j + 2];
      frets[s] = f;
      fingers[s] = fin;
    }
    shape = { frets, fingers, barre: null };
  } else {
    shape = MusicEngine.getGuitarShape(root, type, ext);
  }

  const nonNullFrets = shape.frets.filter((f: any) => f !== null && f > 0) as number[];
  const minFret = nonNullFrets.length > 0 ? Math.min(...nonNullFrets) : 0;
  const maxFret = nonNullFrets.length > 0 ? Math.max(...nonNullFrets) : 0;

  const startFret = minFret > 4 ? minFret : 1;
  const numFretsToShow = Math.max(5, maxFret - startFret + 1);
  const fretIndices = Array.from({ length: numFretsToShow + 1 }, (_, i) => i);

  const displayType = type === 'min' ? 'm' : (type === 'maj' ? '' : type);
  const displayExt = ext === 'none' || !ext ? '' : ext;
  const displayBass = bass && bass !== 'none' ? `/${bass}` : '';
  const fullChordName = isCustom ? root : `${root}${displayType}${displayExt}${displayBass}`;

  return (
    <div className="flex flex-col bg-[#fff8f6] border-4 border-black shadow-[4px_4px_0_#000] w-full max-w-[200px] mx-auto font-['Space_Mono'] overflow-hidden">
      <div className="bg-[#261812] py-2 px-3 flex justify-between items-center border-b-4 border-black">
        <h5 className="text-[11px] font-black text-[#ff6b00] uppercase leading-none">{fullChordName}</h5>
        <div className="flex gap-1">
          {chordNotes.slice(0, 3).map((n, i) => (
            <span key={i} className="text-[7px] font-black text-white/80 uppercase">{n}</span>
          ))}
        </div>
      </div>

      <div className="p-3 bg-[#feccba]/20 flex flex-col items-center">
        <div className="relative w-24 h-36 bg-white border-x-4 border-b-4 border-black mt-1 relative z-10">
          {startFret > 1 ? (
            <div className="absolute -left-10 top-0 bg-black text-white text-[6px] font-black px-1 border-2 border-white py-0.5">
              {startFret}ª c.
            </div>
          ) : (
            <div className="absolute top-0 w-full h-2 bg-black -mt-1 z-40" />
          )}

          {/* Trastes */}
          {fretIndices.map((f) => (
            <div
              key={f}
              className="absolute w-full h-[2px] bg-stone-300"
              style={{ top: `${(f / numFretsToShow) * 100}%` }}
            />
          ))}

          {/* Cordas */}
          {stringIndices.map((s) => (
            <div
              key={s}
              className="absolute h-full w-[1.5px] bg-stone-400"
              style={{ left: `${s * (100 / (numStrings - 1))}%` }}
            />
          ))}

          {/* Dedos */}
          {shape.frets.map((fret: any, stringIndex: number) => {
            if (fret === null) {
              return (
                <div
                  key={stringIndex}
                  className="absolute -top-3 text-red-500 text-[8px] font-black transform -translate-x-1/2"
                  style={{ left: `${stringIndex * (100 / (numStrings - 1))}%` }}
                >
                  X
                </div>
              );
            }
            if (fret === 0) {
              return (
                <div
                  key={stringIndex}
                  className="absolute -top-3 text-emerald-500 text-[8px] font-black transform -translate-x-1/2"
                  style={{ left: `${stringIndex * (100 / (numStrings - 1))}%` }}
                >
                  O
                </div>
              );
            }

            const relativeFret = fret - startFret + 1;
            const finger = shape.fingers[stringIndex];

            return (
              <div
                key={stringIndex}
                className="absolute w-5 h-5 bg-[#ff6b00] text-white rounded-full border-2 border-black font-black text-[9px] flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 z-30"
                style={{
                  top: `${(relativeFret / numFretsToShow) * 100 - (100 / numFretsToShow / 2)}%`,
                  left: `${stringIndex * (100 / (numStrings - 1))}%`
                }}
              >
                {finger || ''}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
