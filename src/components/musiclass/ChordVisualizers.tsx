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
  const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  const translateNote = (note: string) => note.replace('b', 'b');
  const simplify = (n: string) => n.replace('Ab','G#').replace('Db','C#').replace('Eb','D#').replace('Gb','F#').replace('Bb','A#');
  
  const rootClean = simplify((root || '').match(/^([A-G][#b]?)/)?.[1] || 'C');
  const rootLetter = rootClean.charAt(0);

  // Encontra o índice da letra raiz na escala de notas brancas
  const rootWhiteIdx = WHITE_NOTES.indexOf(rootLetter);
  // O teclado começa 2 notas brancas antes da raiz
  const startWhiteIdx = (rootWhiteIdx - 2 + 7) % 7;

  // Gera 10 teclas brancas
  const WHITE_KEYS: string[] = [];
  for (let i = 0; i < 10; i++) {
    WHITE_KEYS.push(WHITE_NOTES[(startWhiteIdx + i) % 7]);
  }

  // Descobre quais teclas brancas têm uma tecla preta à direita
  const hasBlackKeyAfter = (note: string) => !['E', 'B'].includes(note);

  const BLACK_KEYS: { note: string, afterWhiteIdx: number }[] = [];
  for (let i = 0; i < WHITE_KEYS.length - 1; i++) {
    if (hasBlackKeyAfter(WHITE_KEYS[i])) {
      const whiteNoteIndex = CHROMATIC_SCALE.indexOf(WHITE_KEYS[i]);
      const blackNote = CHROMATIC_SCALE[(whiteNoteIndex + 1) % 12];
      BLACK_KEYS.push({ note: blackNote, afterWhiteIdx: i });
    }
  }

  const targetNotes = chordNotes.map(simplify);

  const highlightedWhite = new Set<number>();
  const highlightedBlack = new Set<number>();

  // Constroi ALL_KEYS ordenado
  const ALL_KEYS: { type: 'white' | 'black', note: string, wIdx: number, bIdx: number }[] = [];
  let wIdx = 0;
  let bIdx = 0;
  
  for (let i = 0; i < WHITE_KEYS.length; i++) {
    ALL_KEYS.push({ type: 'white', note: WHITE_KEYS[i], wIdx: i, bIdx: -1 });
    if (i < WHITE_KEYS.length - 1 && hasBlackKeyAfter(WHITE_KEYS[i])) {
      const whiteNoteIndex = CHROMATIC_SCALE.indexOf(WHITE_KEYS[i]);
      const blackNote = CHROMATIC_SCALE[(whiteNoteIndex + 1) % 12];
      ALL_KEYS.push({ type: 'black', note: blackNote, wIdx: -1, bIdx: bIdx });
      bIdx++;
    }
  }

  let currentKeyIndex = 0;

  // Try to place root first
  let rootFoundIndex = -1;
  for (let i = 0; i < ALL_KEYS.length; i++) {
    if (ALL_KEYS[i].note === rootClean) {
      if (ALL_KEYS[i].type === 'white') highlightedWhite.add(ALL_KEYS[i].wIdx);
      if (ALL_KEYS[i].type === 'black') highlightedBlack.add(ALL_KEYS[i].bIdx);
      rootFoundIndex = i;
      break;
    }
  }

  currentKeyIndex = rootFoundIndex !== -1 ? rootFoundIndex : 0;
  
  targetNotes.forEach(target => {
    // Skip if it's the root we already placed
    if (target === rootClean && rootFoundIndex !== -1 && currentKeyIndex === rootFoundIndex) {
      currentKeyIndex++; // move past it
      return;
    }

    let placed = false;
    // Look for the note starting from currentKeyIndex
    for (let i = currentKeyIndex; i < ALL_KEYS.length; i++) {
      if (ALL_KEYS[i].note === target) {
        if (ALL_KEYS[i].type === 'white') highlightedWhite.add(ALL_KEYS[i].wIdx);
        if (ALL_KEYS[i].type === 'black') highlightedBlack.add(ALL_KEYS[i].bIdx);
        currentKeyIndex = i + 1;
        placed = true;
        break;
      }
    }
    
    // Fallback se faltar espaço (inversão)
    if (!placed) {
      for (let i = 0; i < currentKeyIndex; i++) {
        if (ALL_KEYS[i].note === target) {
          if (ALL_KEYS[i].type === 'white') highlightedWhite.add(ALL_KEYS[i].wIdx);
          if (ALL_KEYS[i].type === 'black') highlightedBlack.add(ALL_KEYS[i].bIdx);
          break;
        }
      }
    }
  });

  const displayType = type === 'min' ? 'm' : (type === 'maj' ? '' : type);
  const displayExt = ext === 'none' || !ext ? '' : ext;
  const displayBass = bass && bass !== 'none' ? `/${bass}` : '';
  const fullChordName = isCustom ? root : `${root}${displayType}${displayExt}${displayBass}`;

  return (
    <div className="flex flex-col bg-[#fcfcfc] border-4 border-black shadow-[6px_6px_0_#000] rounded-lg w-full max-w-[480px] mx-auto font-['Inter'] overflow-hidden">
      {/* Header */}
      <div className="bg-[#261812] py-4 px-5 flex justify-between items-center">
        <h5 className="text-xl sm:text-2xl font-black text-[#ff6b00] tracking-tight">{fullChordName}</h5>
        <div className="flex gap-2">
          {chordNotes.map((n, i) => (
            <span key={i} className="text-sm sm:text-base font-black text-white uppercase">{translateNote(n)}</span>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative w-full aspect-[2.5/1] bg-[#1a1a1a] border-t-4 border-black">
          {/* Teclado */}
          <div className="relative w-full h-full flex bg-[#261812] overflow-hidden">
            {/* White Keys */}
            {WHITE_KEYS.map((noteName, i) => {
              const active = highlightedWhite.has(i);
              return (
                <div
                  key={`w-${i}`}
                  style={{ width: `${100 / WHITE_KEYS.length}%` }}
                  className={`h-full border-r-2 border-black relative transition-all ${
                    active ? 'bg-[#fff5f0]' : 'bg-white'
                  }`}
                >
                  {active && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 sm:w-6 sm:h-6 rounded-full bg-[#261812] flex items-center justify-center shadow-md">
                      <span className="text-[7px] sm:text-[9px] font-black text-white uppercase">{translateNote(noteName)}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Black Keys */}
            {BLACK_KEYS.map((bk, i) => {
              const whiteKeyWidth = 100 / WHITE_KEYS.length;
              const left = (bk.afterWhiteIdx + 1) * whiteKeyWidth;
              const active = highlightedBlack.has(i);

              return (
                <div
                  key={`b-${i}`}
                  className={`absolute top-0 h-[60%] z-30 flex items-end justify-center pb-2 shadow-xl transition-all border-x-2 border-b-2 border-black ${
                    active ? 'bg-[#402a20]' : 'bg-[#1a1a1a]'
                  }`}
                  style={{
                    left: `${left}%`,
                    width: `${whiteKeyWidth * 0.7}%`,
                    marginLeft: `-${(whiteKeyWidth * 0.7) / 2}%`
                  }}
                >
                  {active && (
                    <div className="w-3 h-3 sm:w-5 sm:h-5 rounded-full bg-white flex items-center justify-center shadow-md">
                      <span className="text-[6px] sm:text-[8px] font-black text-[#ff6b00] uppercase">{translateNote(bk.note)}</span>
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

          {/* Trastes e Números das Casas */}
          {fretIndices.map((f) => (
            <React.Fragment key={f}>
              <div
                className="absolute w-full h-[2px] bg-stone-300"
                style={{ top: `${(f / numFretsToShow) * 100}%` }}
              />
              {f < numFretsToShow && (
                <div
                  className="absolute -left-6 w-5 text-right text-[8px] font-black text-[#261812]"
                  style={{ top: `${((f + 0.5) / numFretsToShow) * 100}%`, transform: 'translateY(-50%)' }}
                >
                  {startFret + f}
                </div>
              )}
            </React.Fragment>
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
