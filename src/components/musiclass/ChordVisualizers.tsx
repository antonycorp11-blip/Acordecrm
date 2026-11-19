import React from 'react';
import { MusicEngine, GUITAR_CHORD_LIBRARY } from '../../lib/musicEngine';
import { NOTAS, normalizarNota, ordenarVoz, vozViolao } from '../../lib/acordes';

interface ChordVisualizerProps {
  instrument: string;
  chordNotes: string[];
  root: string;
  type?: string;
  ext?: string;
  bass?: string;
  notesWithIndices?: any[];
  isCustom?: boolean;
  name?: string;
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

const nomeCompleto = (root: string, type = 'maj', ext = '', bass = 'none', isCustom?: boolean, name?: string) => {
  if (name) return name;
  if (isCustom) return root;
  const displayType = type === 'min' ? 'm' : (type === 'maj' ? '' : type);
  const displayExt = ext === 'none' || !ext ? '' : ext;
  const displayBass = bass && bass !== 'none' ? `/${bass}` : '';
  return `${root}${displayType}${displayExt}${displayBass}`;
};

const ehBranca = (abs: number) => !NOTAS[((abs % 12) + 12) % 12].includes('#');

export const KeyboardVisualizer: React.FC<{
  chordNotes: string[];
  root: string;
  type?: string;
  ext?: string;
  bass?: string;
  notesWithIndices?: any[];
  isCustom?: boolean;
  name?: string;
}> = ({ chordNotes, root, type = 'maj', ext = '', bass = 'none', notesWithIndices, isCustom, name }) => {
  const temBaixo = !!bass && bass !== 'none';
  // Teclas exatas (índice 0 = Dó 3) quando o acorde foi montado tecla por tecla
  const exatas = isCustom && Array.isArray(notesWithIndices) && notesWithIndices.length > 0
    && notesWithIndices.length === (chordNotes || []).length && notesWithIndices.every(n => typeof n === 'number');

  let teclas: number[] = [];
  if (exatas) {
    teclas = [...(notesWithIndices as number[])].map(n => n + 12).sort((a, b) => a - b);
  } else {
    const rootClean = normalizarNota((root || '').match(/^([A-Ga-g][#b]?)/)?.[1] || chordNotes?.[0] || 'C');
    const ordem = ordenarVoz(chordNotes || [], temBaixo ? bass : null, rootClean);
    let ultimo = -1;
    ordem.forEach((n, i) => {
      const p = NOTAS.indexOf(n);
      if (p < 0) return;
      let abs = (i === 0 ? 12 : 0) + p; // começa na oitava 4 (índice 12 = Dó 4)
      while (abs <= ultimo) abs += 12;
      teclas.push(abs);
      ultimo = abs;
    });
  }
  const grave = teclas.length ? Math.min(...teclas) : 12;
  const agudo = teclas.length ? Math.max(...teclas) : 24;

  // Faixa visível: começa numa tecla branca abaixo da mais grave e tem no mínimo 10 brancas
  // Acorde centralizado: pelo menos 2 teclas brancas de folga de cada lado (assim aparecem as pretas vizinhas)
  const descer = (x: number) => { x--; while (!ehBranca(x)) x--; return x; };
  const subir = (x: number) => { x++; while (!ehBranca(x)) x++; return x; };
  let inicio = grave; while (!ehBranca(inicio)) inicio--;
  if (inicio === grave) inicio = descer(inicio);
  inicio = descer(inicio);
  let fim = agudo; while (!ehBranca(fim)) fim++;
  if (fim === agudo) fim = subir(fim);
  fim = subir(fim);
  const contarBrancas = (a: number, b: number) => { let c = 0; for (let x = a; x <= b; x++) if (ehBranca(x)) c++; return c; };
  let ladoBaixo = true;
  while (contarBrancas(inicio, fim) < 10) { if (ladoBaixo) inicio = descer(inicio); else fim = subir(fim); ladoBaixo = !ladoBaixo; }

  const brancas: number[] = [];
  const pretas: { abs: number; depoisDe: number }[] = [];
  for (let x = inicio; x <= fim; x++) {
    if (ehBranca(x)) brancas.push(x);
    else pretas.push({ abs: x, depoisDe: brancas.length - 1 });
  }
  const ativas = new Set(teclas);
  const largura = 100 / brancas.length;
  const nomeNota = (abs: number) => NOTAS[((abs % 12) + 12) % 12];
  const fullChordName = nomeCompleto(root, type, ext, bass, isCustom, name);
  const ehBaixo = (abs: number) => temBaixo && abs === grave && nomeNota(abs) === normalizarNota(bass);

  return (
    <div className="flex flex-col bg-[#fcfcfc] border-2 border-black shadow-[3px_3px_0_#000] rounded-lg w-full max-w-[480px] mx-auto font-['Space_Mono'] overflow-hidden">
      <div className="bg-[#261812] py-1.5 px-3.5 flex justify-between items-center gap-2">
        <h5 className="text-sm font-black text-[#ff6b00] tracking-tight leading-none">{fullChordName}</h5>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {teclas.map((t, i) => (
            <span key={i} className={`text-[10px] font-black uppercase leading-none ${ehBaixo(t) ? 'text-sky-300' : 'text-white/90'}`}>{nomeNota(t)}</span>
          ))}
        </div>
      </div>
      <div className="relative w-full aspect-[3.4/1] bg-[#1a1a1a] border-t-2 border-black">
        <div className="relative w-full h-full flex bg-[#261812] overflow-hidden">
          {brancas.map((abs, i) => {
            const active = ativas.has(abs);
            return (
              <div key={`w-${i}`} style={{ width: `${largura}%` }} className={`h-full border-r-2 border-black relative ${active ? 'bg-[#fff5f0]' : 'bg-white'}`}>
                {active && (
                  <div className={`absolute bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow-md ${ehBaixo(abs) ? 'bg-sky-600' : 'bg-[#261812]'}`}>
                    <span className="text-[7px] sm:text-[9px] font-black text-white uppercase">{nomeNota(abs)}</span>
                  </div>
                )}
              </div>
            );
          })}
          {pretas.map((bk, i) => {
            if (bk.depoisDe < 0) return null;
            const active = ativas.has(bk.abs);
            return (
              <div key={`b-${i}`}
                className={`absolute top-0 h-[60%] z-30 flex items-end justify-center pb-2 shadow-xl border-x-2 border-b-2 border-black ${active ? (ehBaixo(bk.abs) ? 'bg-sky-800' : 'bg-[#402a20]') : 'bg-[#1a1a1a]'}`}
                style={{ left: `${(bk.depoisDe + 1) * largura}%`, width: `${largura * 0.7}%`, marginLeft: `-${(largura * 0.7) / 2}%` }}>
                {active && (
                  <div className="w-3 h-3 sm:w-5 sm:h-5 rounded-full bg-white flex items-center justify-center shadow-md">
                    <span className="text-[6px] sm:text-[8px] font-black text-[#ff6b00] uppercase">{nomeNota(bk.abs)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {temBaixo && <p className="text-[9px] font-bold text-sky-700 px-2 py-0.5 bg-sky-50">● Nota azul = baixo ({bass})</p>}
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
  isCustom,
  name
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
        name={name}
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
    const temBaixo = !!bass && bass !== 'none';
    const chave = `${root}${type}${ext && ext !== 'none' ? ext : ''}`;
    const naBiblioteca = !temBaixo && !isCustom && (GUITAR_CHORD_LIBRARY[chave] || (!ext || ext === 'none') && GUITAR_CHORD_LIBRARY[`${root}${type}`]);
    const gerada = !naBiblioteca && !isBass ? vozViolao(chordNotes || [], temBaixo ? bass : (chordNotes || [])[0]) : null;
    shape = naBiblioteca ? MusicEngine.getGuitarShape(root, type, ext) : (gerada || MusicEngine.getGuitarShape(root, type, ext));
  }

  const nonNullFrets = shape.frets.filter((f: any) => f !== null && f > 0) as number[];
  const minFret = nonNullFrets.length > 0 ? Math.min(...nonNullFrets) : 0;
  const maxFret = nonNullFrets.length > 0 ? Math.max(...nonNullFrets) : 0;

  const startFret = minFret > 4 ? minFret : 1;
  const numFretsToShow = Math.max(5, maxFret - startFret + 1);
  const fretIndices = Array.from({ length: numFretsToShow + 1 }, (_, i) => i);

  const fullChordName = nomeCompleto(root, type, ext, bass, isCustom, name);

  return (
    <div className="flex flex-col bg-[#fff8f6] border-4 border-black shadow-[4px_4px_0_#000] w-full max-w-[200px] mx-auto font-['Space_Mono'] overflow-hidden">
      <div className="bg-[#261812] py-2 px-3 flex justify-between items-center border-b-4 border-black">
        <h5 className="text-[11px] font-black text-[#ff6b00] uppercase leading-none">{fullChordName}</h5>
        <div className="flex gap-1">
          {chordNotes.slice(0, 4).map((n, i) => (
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
