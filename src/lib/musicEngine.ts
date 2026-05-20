export const ROOTS = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];

export const ROOT_NAMES: Record<string, string> = {
  'C': 'Dó', 'C#': 'Dó sustenido', 'Db': 'Ré bemol',
  'D': 'Ré', 'D#': 'Ré sustenido', 'Eb': 'Mi bemol',
  'E': 'Mi', 'F': 'Fá', 'F#': 'Fá sustenido', 'Gb': 'Sol bemol',
  'G': 'Sol', 'G#': 'Sol sustenido', 'Ab': 'Lá bemol',
  'A': 'Lá', 'A#': 'Lá sustenido', 'Bb': 'Si bemol',
  'B': 'Si'
};

export const CHORD_TYPES = [
  { id: 'maj', name: 'Maior', intervals: [0, 4, 7] },
  { id: 'min', name: 'Menor', intervals: [0, 3, 7] },
  { id: 'dim', name: 'Diminuto', intervals: [0, 3, 6] },
  { id: 'aug', name: 'Aumentado', intervals: [0, 4, 8] },
  { id: 'sus2', name: 'Sus2', intervals: [0, 2, 7] },
  { id: 'sus4', name: 'Sus4', intervals: [0, 5, 7] },
  { id: 'm7b5', name: 'm7(b5)', intervals: [0, 3, 6, 10] }
];

export const EXTENSIONS = [
  { id: 'none', name: 'Nenhuma', intervals: [] },
  { id: '8', name: '8', intervals: [12] },
  { id: 'add3', name: 'add3', intervals: [4] },
  { id: 'add4', name: 'add4', intervals: [5] },
  { id: 'add5', name: 'add5', intervals: [7] },
  { id: '6', name: '6', intervals: [9] },
  { id: '7', name: '7', intervals: [10] },
  { id: 'maj7', name: 'maj7', intervals: [11] },
  { id: '9', name: '9', intervals: [2, 14] },
  { id: 'add9', name: 'add9', intervals: [14] },
  { id: '11', name: '11', intervals: [5, 17] },
  { id: '13', name: '13', intervals: [9, 21] }
];

export const SCALES = [
  { id: 'major', name: 'Maior', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'minor', name: 'Menor Natural', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'harmonic_minor', name: 'Menor Harmônica', intervals: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'melodic_minor', name: 'Menor Melódica', intervals: [0, 2, 3, 5, 7, 9, 11] },
  { id: 'penta_maj', name: 'Pentatônica Maior', intervals: [0, 2, 4, 7, 9] },
  { id: 'penta_min', name: 'Pentatônica Menor', intervals: [0, 3, 5, 7, 10] }
];

export const GUITAR_CHORD_LIBRARY: Record<string, { frets: (number | null)[]; fingers: (number | null)[]; barre?: number }> = {
    // MAJORS
    'Cmaj': { frets: [null, 3, 2, 0, 1, 0], fingers: [null, 3, 2, null, 1, null] },
    'C#maj': { frets: [null, 4, 6, 6, 6, 4], fingers: [null, 1, 2, 3, 4, 1], barre: 4 },
    'Dbmaj': { frets: [null, 4, 6, 6, 6, 4], fingers: [null, 1, 2, 3, 4, 1], barre: 4 },
    'Dmaj': { frets: [null, null, 0, 2, 3, 2], fingers: [null, null, null, 1, 3, 2] },
    'D#maj': { frets: [null, 6, 8, 8, 8, 6], fingers: [null, 1, 2, 3, 4, 1], barre: 6 },
    'Ebmaj': { frets: [null, 6, 8, 8, 8, 6], fingers: [null, 1, 2, 3, 4, 1], barre: 6 },
    'Emaj': { frets: [0, 2, 2, 1, 0, 0], fingers: [null, 2, 3, 1, null, null] },
    'Fmaj': { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], barre: 1 },
    'F#maj': { frets: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1], barre: 2 },
    'Gbmaj': { frets: [2, 4, 4, 3, 2, 2], fingers: [1, 3, 4, 2, 1, 1], barre: 2 },
    'Gmaj': { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, null, null, null, 3] },
    'G#maj': { frets: [4, 6, 6, 5, 4, 4], fingers: [1, 3, 4, 2, 1, 1], barre: 4 },
    'Abmaj': { frets: [4, 6, 6, 5, 4, 4], fingers: [1, 3, 4, 2, 1, 1], barre: 4 },
    'Amaj': { frets: [null, 0, 2, 2, 2, 0], fingers: [null, null, 1, 2, 3, null] },
    'A#maj': { frets: [null, 1, 3, 3, 3, 1], fingers: [null, 1, 2, 3, 4, 1], barre: 1 },
    'Bbmaj': { frets: [null, 1, 3, 3, 3, 1], fingers: [null, 1, 2, 3, 4, 1], barre: 1 },
    'Bmaj': { frets: [null, 2, 4, 4, 4, 2], fingers: [null, 1, 3, 4, 2, 1], barre: 2 },

    // MINORS
    'Cmin': { frets: [null, 3, 5, 5, 4, 3], fingers: [null, 1, 3, 4, 2, 1], barre: 3 },
    'C#min': { frets: [null, 4, 6, 6, 5, 4], fingers: [null, 1, 3, 4, 2, 1], barre: 4 },
    'Dbmin': { frets: [null, 4, 6, 6, 5, 4], fingers: [null, 1, 3, 4, 2, 1], barre: 4 },
    'Dmin': { frets: [null, null, 0, 2, 3, 1], fingers: [null, null, null, 2, 3, 1] },
    'D#min': { frets: [null, 6, 8, 8, 7, 6], fingers: [null, 1, 3, 4, 2, 1], barre: 6 },
    'Ebmin': { frets: [null, 6, 8, 8, 7, 6], fingers: [null, 1, 3, 4, 2, 1], barre: 6 },
    'Emin': { frets: [0, 2, 2, 0, 0, 0], fingers: [null, 2, 3, null, null, null] },
    'Fmin': { frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1], barre: 1 },
    'F#min': { frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1], barre: 2 },
    'Gbmin': { frets: [2, 4, 4, 2, 2, 2], fingers: [1, 3, 4, 1, 1, 1], barre: 2 },
    'Gmin': { frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], barre: 3 },
    'G#min': { frets: [4, 6, 6, 4, 4, 4], fingers: [1, 3, 4, 1, 1, 1], barre: 4 },
    'Abmin': { frets: [4, 6, 6, 4, 4, 4], fingers: [1, 3, 4, 1, 1, 1], barre: 4 },
    'Amin': { frets: [null, 0, 2, 2, 1, 0], fingers: [null, null, 2, 3, 1, null] },
    'A#min': { frets: [null, 1, 3, 3, 2, 1], fingers: [null, 1, 3, 4, 2, 1], barre: 1 },
    'Bbmin': { frets: [null, 1, 3, 3, 2, 1], fingers: [null, 1, 3, 4, 2, 1], barre: 1 },
    'Bmin': { frets: [null, 2, 4, 4, 3, 2], fingers: [null, 1, 3, 4, 2, 1], barre: 2 },

    // SEVENTHS
    'C7': { frets: [null, 3, 2, 3, 1, 0], fingers: [null, 3, 2, 4, 1, null] },
    'D7': { frets: [null, null, 0, 2, 1, 2], fingers: [null, null, null, 2, 1, 3] },
    'E7': { frets: [0, 2, 0, 1, 0, 0], fingers: [null, 2, null, 1, null, null] },
    'F7': { frets: [1, 3, 1, 2, 1, 1], fingers: [1, 3, 1, 2, 1, 1], barre: 1 },
    'G7': { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, null, null, null, 1] },
    'A7': { frets: [null, 0, 2, 0, 2, 0], fingers: [null, null, 2, null, 3, null] },
    'B7': { frets: [null, 2, 1, 2, 0, 2], fingers: [null, 2, 1, 3, null, 4] },
};

export class MusicEngine {
  static getNoteFromInterval(root: string, intervalInSemitones: number) {
    const CHROMATIC_SCALE_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const CHROMATIC_SCALE_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

    const mapFlatToSharp: Record<string, string> = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
    const normalizedRoot = mapFlatToSharp[root] || root;

    const rootIndex = CHROMATIC_SCALE_SHARP.indexOf(normalizedRoot);
    if (rootIndex === -1) return { name: root, absIndex: 0 };

    const absIndex = rootIndex + intervalInSemitones;
    const targetIndex = absIndex % 12;

    const useFlats = root.includes('b');
    const name = useFlats ? CHROMATIC_SCALE_FLAT[targetIndex] : CHROMATIC_SCALE_SHARP[targetIndex];

    return { name, absIndex };
  }

  static generateChord(root: string, typeId: string, extensionId: string = 'none') {
    const type = CHORD_TYPES.find(t => t.id === typeId);
    const ext = EXTENSIONS.find(e => e.id === extensionId);

    if (!type) return null;

    const intervals = [...type.intervals, ...(ext?.intervals || [])];
    const notesWithIndices = intervals.map(i => this.getNoteFromInterval(root, i));

    return {
      root,
      type: type.name,
      extension: ext?.name !== 'Nenhuma' ? ext?.name : '',
      notes: notesWithIndices.map(ni => ni.name),
      notesWithIndices,
      intervals
    };
  }

  static generateScale(root: string, scaleId: string) {
    const scale = SCALES.find(s => s.id === scaleId);
    if (!scale) return null;
    return scale.intervals.map(i => this.getNoteFromInterval(root, i).name);
  }

  static getGuitarShape(root: string, type: string, ext: string) {
    const fullKey = `${root}${type}${ext !== 'none' ? ext : ''}`;
    if (GUITAR_CHORD_LIBRARY[fullKey]) return GUITAR_CHORD_LIBRARY[fullKey];

    const simpleKey = `${root}${type}`;
    if (GUITAR_CHORD_LIBRARY[simpleKey]) return GUITAR_CHORD_LIBRARY[simpleKey];

    return GUITAR_CHORD_LIBRARY['Cmaj'];
  }
}
