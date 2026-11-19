// Leitura de cifras (ex.: E/G#, C7M(9), F#m7(b5), Bb/D, Dsus4, G7(13)) e montagem de vozes
// para teclado e violão, sempre com o baixo como nota mais grave.

export const NOTAS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BEMOL: Record<string, string> = { Db: 'C#', Eb: 'D#', Fb: 'E', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B', 'E#': 'F', 'B#': 'C' };

export const normalizarNota = (n: string) => {
  const m = String(n || '').trim().match(/^([A-Ga-g])([#b♯♭]?)/);
  if (!m) return '';
  const base = m[1].toUpperCase() + (m[2] === '♯' ? '#' : m[2] === '♭' ? 'b' : m[2]);
  return BEMOL[base] || base;
};
export const pc = (n: string) => NOTAS.indexOf(normalizarNota(n));

export type CifraLida = { nome: string; root: string; bass: string | null; notes: string[]; erro?: string };

// Ordena: baixo (ou fundamental) primeiro e as demais notas subindo a partir dele (posição fechada)
export function ordenarVoz(notas: string[], baixo?: string | null, fundamental?: string) {
  const unicas = Array.from(new Set(notas.map(normalizarNota).filter(Boolean)));
  const grave = normalizarNota(baixo || '') || normalizarNota(fundamental || '') || unicas[0];
  if (!grave) return unicas;
  const g = pc(grave);
  const resto = unicas.filter(n => n !== grave).sort((a, b) => ((pc(a) - g + 12) % 12) - ((pc(b) - g + 12) % 12));
  return [grave, ...resto];
}

export function lerCifra(texto: string): CifraLida {
  const original = String(texto || '').trim();
  const t = original.replace(/\s+/g, '').replace(/♯/g, '#').replace(/♭/g, 'b').replace(/º/g, '°');
  const m = t.match(/^([A-Ga-g][#b]?)(.*?)(?:\/([A-Ga-g][#b]?))?$/);
  if (!m) return { nome: original, root: '', bass: null, notes: [], erro: 'Comece pela nota (ex.: E, F#, Bb).' };
  const root = normalizarNota(m[1]);
  let q = (m[2] || '').replace(/[()]/g, ' ').replace(/,/g, ' ');
  const bass = m[3] ? normalizarNota(m[3]) : null;

  // intervalos em semitons a partir da fundamental
  const iv = new Set<number>([0]);
  let terca: number | null = 4;
  let quinta: number | null = 7;
  const tem = (re: RegExp) => { const r = re.test(q); if (r) q = q.replace(re, ' '); return r; };

  if (tem(/m7b5|ø/i)) { terca = 3; quinta = 6; iv.add(10); }
  if (tem(/dim7|°7/)) { terca = 3; quinta = 6; iv.add(9); }
  if (tem(/dim|°/)) { terca = 3; quinta = 6; }
  if (tem(/aug|\+5|\+(?!\d)/)) { quinta = 8; }
  if (tem(/sus2/)) { terca = null; iv.add(2); }
  if (tem(/sus4|sus/)) { terca = null; iv.add(5); }
  if (tem(/7M|maj7|M7|7\+|Δ/)) { iv.add(11); }
  if (/^m(?!aj)/.test(q.trim()) || /^min/.test(q.trim())) { terca = 3; q = q.replace(/^\s*(min|m)/, ' '); }
  if (tem(/add9|add2/)) iv.add(2);
  if (tem(/b13/)) { iv.add(8); if (!iv.has(11)) iv.add(10); }
  if (tem(/13/)) { iv.add(9); if (!iv.has(11)) iv.add(10); }
  if (tem(/#11|\+11/)) iv.add(6);
  if (tem(/11/)) { iv.add(5); if (!iv.has(11)) iv.add(10); }
  if (tem(/b9|-9/)) iv.add(1);
  if (tem(/#9|\+9/)) iv.add(3);
  if (tem(/9/)) { iv.add(2); }
  if (tem(/b5|-5/)) quinta = 6;
  if (tem(/#5|\+5/)) quinta = 8;
  if (tem(/7/)) { if (!iv.has(11)) iv.add(10); }
  if (tem(/6/)) iv.add(9);
  if (tem(/(^|\s)4(\s|$)/)) { terca = null; iv.add(5); }
  if (tem(/(^|\s)2(\s|$)/)) { iv.add(2); }
  if (tem(/(^|\s)5(\s|$)/)) { terca = null; }

  if (terca !== null) iv.add(terca);
  if (quinta !== null) iv.add(quinta);
  const r = pc(root);
  const notas = Array.from(iv).sort((a, b) => a - b).map(i => NOTAS[(r + i) % 12]);
  if (bass && !notas.includes(bass)) notas.push(bass);
  const sobra = q.replace(/\s+/g, '');
  return {
    nome: original.replace(/♯/g, '#'),
    root,
    bass,
    notes: ordenarVoz(notas, bass, root),
    erro: sobra ? `Não entendi "${sobra}". As notas mostradas podem estar incompletas.` : undefined,
  };
}

// Posição no violão: procura a forma mais confortável que toque todas as notas,
// com a nota mais grave = baixo (ou fundamental). Afinação E A D G B E.
const AFINACAO = [4, 9, 2, 7, 11, 4]; // pc de cada corda (6ª → 1ª)
const cacheViolao = new Map<string, ReturnType<typeof calcularVozViolao>>();
export function vozViolao(notas: string[], baixo?: string | null) {
  const chave = `${notas.join(',')}|${baixo || ''}`;
  if (!cacheViolao.has(chave)) cacheViolao.set(chave, calcularVozViolao(notas, baixo));
  return cacheViolao.get(chave)!;
}
function calcularVozViolao(notas: string[], baixo?: string | null) {
  const alvo = new Set(notas.map(pc).filter(x => x >= 0));
  const grave = pc(baixo || notas[0] || '');
  if (!alvo.size || grave < 0) return null;
  let melhor: { frets: (number | null)[]; nota: number } | null = null;

  for (let pos = 0; pos <= 10; pos++) {
    const opcoes = AFINACAO.map(corda => {
      const op: (number | null)[] = [null];
      if (alvo.has(corda)) op.push(0);
      for (let f = Math.max(1, pos); f <= pos + 3; f++) if (alvo.has((corda + f) % 12)) op.push(f);
      return op;
    });
    const atual: (number | null)[] = [];
    const busca = (s: number) => {
      if (s === 6) {
        const tocadas = atual.map((f, i) => f === null ? null : (AFINACAO[i] + f) % 12);
        const primeira = tocadas.findIndex(x => x !== null);
        if (primeira < 0 || tocadas[primeira] !== grave) return;
        const cobertas = new Set(tocadas.filter(x => x !== null) as number[]);
        if (cobertas.size !== alvo.size) return;
        // depois da primeira corda tocada, no máximo uma corda abafada (e só a 1ª)
        const abafadasMeio = atual.slice(primeira).map((f, i) => f === null ? i + primeira : -1).filter(i => i >= 0);
        if (abafadasMeio.some(i => i !== 5)) return;
        const casas = atual.filter(f => f !== null && f > 0) as number[];
        const span = casas.length ? Math.max(...casas) - Math.min(...casas) : 0;
        if (span > 3) return;
        const dedos = new Set(casas).size + (casas.length > 4 ? 0 : 0);
        if (casas.length > 4 && new Set(casas).size > 3) return;
        const nota = (6 - atual.filter(f => f !== null).length) * 3 + (casas.length ? Math.min(...casas) : 0) * 1.5 + span * 2 + dedos + abafadasMeio.length * 2;
        if (!melhor || nota < melhor.nota) melhor = { frets: [...atual], nota };
        return;
      }
      for (const f of opcoes[s]) { atual.push(f); busca(s + 1); atual.pop(); }
    };
    busca(0);
  }
  if (!melhor) return null;
  const frets = (melhor as { frets: (number | null)[] }).frets;
  // dedos simples: ordem das casas
  const casasOrd = Array.from(new Set(frets.filter(f => f !== null && f > 0) as number[])).sort((a, b) => a - b);
  const fingers = frets.map(f => (f && f > 0 ? Math.min(4, casasOrd.indexOf(f) + 1) : 0));
  return { frets, fingers, barre: null as number | null };
}
