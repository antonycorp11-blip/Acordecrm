import { jsPDF } from 'jspdf';
import { NOTAS, normalizarNota, ordenarVoz, vozViolao } from '../lib/acordes';
import { MusicEngine, GUITAR_CHORD_LIBRARY } from '../lib/musicEngine';
import { partesDaMelodia } from '../components/musiclass/MelodiaBimanual';

// PDF da ficha desenhado direto (texto, teclado e braço do violão feitos com linhas e retângulos).
// Não depende de "fotografar" a tela, então sai igual no iPhone, Android e computador.

const LARG = 210, ALT = 297, MARGEM = 14, UTIL = LARG - MARGEM * 2;
type Cor = [number, number, number];
const PRETO: Cor = [28, 25, 23], CINZA: Cor = [110, 110, 110], LARANJA: Cor = [194, 65, 12], AZUL: Cor = [30, 64, 175], VERDE: Cor = [4, 120, 87], CEU: Cor = [2, 132, 199];

// jsPDF (fonte padrão) não tem emojis nem alguns símbolos
const limpar = (t: any) => String(t ?? '')
  .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
  .replace(/♯/g, '#').replace(/♭/g, 'b').replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
  .replace(/^#{1,6}\s*/gm, '').replace(/\*\*/g, '').replace(/\\([.\-*])/g, '$1')
  .replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ•·]/g, '').trim();

const lerFicha = (conteudo: any) => {
  const t = String(conteudo || '').trim();
  if (t.startsWith('{') && t.endsWith('}')) { try { const r = JSON.parse(t); if (r?.isRich) return r; } catch { /* texto */ } }
  return { isRich: false, conteudoText: t };
};

const nomeAcorde = (c: any) => {
  if (c?.name) return c.name;
  if (c?.isCustom) return c.root || '';
  const tipo = c?.typeId === 'min' ? 'm' : c?.typeId && !['maj', 'custom', 'cifra'].includes(c.typeId) ? c.typeId : '';
  const ext = c?.extId && c.extId !== 'none' ? c.extId : '';
  const baixo = c?.bass && c.bass !== 'none' ? `/${c.bass}` : '';
  return `${c?.root || ''}${tipo}${ext}${baixo}`;
};

const ehBranca = (abs: number) => !NOTAS[((abs % 12) + 12) % 12].includes('#');

function teclasDoAcorde(c: any) {
  const notas: string[] = c.notes || [];
  const temBaixo = !!c.bass && c.bass !== 'none';
  const exatas = c.isCustom && Array.isArray(c.notesWithIndices) && c.notesWithIndices.length === notas.length && c.notesWithIndices.every((n: any) => typeof n === 'number');
  let teclas: number[] = [];
  if (exatas) teclas = [...c.notesWithIndices].map((n: number) => n + 12).sort((a, b) => a - b);
  else {
    const raiz = normalizarNota(String(c.root || '').match(/^([A-Ga-g][#b]?)/)?.[1] || notas[0] || 'C');
    let ultimo = -1;
    ordenarVoz(notas, temBaixo ? c.bass : null, raiz).forEach((n, i) => {
      const p = NOTAS.indexOf(n); if (p < 0) return;
      let abs = (i === 0 ? 12 : 0) + p; while (abs <= ultimo) abs += 12;
      teclas.push(abs); ultimo = abs;
    });
  }
  const grave = teclas.length ? Math.min(...teclas) : 12;
  const agudo = teclas.length ? Math.max(...teclas) : 24;
  const descer = (x: number) => { x--; while (!ehBranca(x)) x--; return x; };
  const subir = (x: number) => { x++; while (!ehBranca(x)) x++; return x; };
  let inicio = grave; while (!ehBranca(inicio)) inicio--; if (inicio === grave) inicio = descer(inicio); inicio = descer(inicio);
  let fim = agudo; while (!ehBranca(fim)) fim++; if (fim === agudo) fim = subir(fim); fim = subir(fim);
  const brancasEntre = () => { let k = 0; for (let x = inicio; x <= fim; x++) if (ehBranca(x)) k++; return k; };
  let baixoLado = true;
  while (brancasEntre() < 10) { if (baixoLado) inicio = descer(inicio); else fim = subir(fim); baixoLado = !baixoLado; }
  const baixoAbs = temBaixo && NOTAS[((grave % 12) + 12) % 12] === normalizarNota(c.bass) ? grave : null;
  return { teclas, inicio, fim, baixoAbs };
}

function formaViolao(c: any, instrumento: string) {
  const isBass = /baixo|bass/i.test(instrumento);
  const cordas = isBass ? 4 : 6;
  if (c.isCustom && Array.isArray(c.notesWithIndices) && c.notesWithIndices.length % 3 === 0 && c.notesWithIndices.length !== (c.notes || []).length) {
    const frets: (number | null)[] = Array(cordas).fill(null); const fingers = Array(cordas).fill(0);
    for (let j = 0; j < c.notesWithIndices.length; j += 3) {
      const s = c.notesWithIndices[j] - 1; if (s < 0 || s >= cordas) continue;
      frets[s] = c.notesWithIndices[j + 1]; fingers[s] = c.notesWithIndices[j + 2];
    }
    return { frets, fingers, cordas };
  }
  const temBaixo = !!c.bass && c.bass !== 'none';
  const ext = c.extId && c.extId !== 'none' ? c.extId : '';
  const naBib = !temBaixo && !c.isCustom && (GUITAR_CHORD_LIBRARY[`${c.root}${c.typeId}${ext}`] || (!ext && GUITAR_CHORD_LIBRARY[`${c.root}${c.typeId}`]));
  const forma: any = naBib ? MusicEngine.getGuitarShape(c.root, c.typeId, c.extId || 'none')
    : (!isBass && vozViolao(c.notes || [], temBaixo ? c.bass : (c.notes || [])[0])) || MusicEngine.getGuitarShape(c.root, c.typeId, c.extId || 'none');
  return { frets: forma.frets as (number | null)[], fingers: (forma.fingers || []) as number[], cordas };
}

export function gerarFichaPdfNativo(aula: any, alunoNome?: string, professorNome?: string, instrumento?: string) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const r = lerFicha(aula?.conteudo);
  const inst = instrumento || aula?.curso_nome || 'Musica';
  let y = MARGEM;

  const cor = (c: Cor) => { pdf.setTextColor(c[0], c[1], c[2]); };
  const preencher = (c: Cor) => pdf.setFillColor(c[0], c[1], c[2]);
  const traco = (c: Cor) => pdf.setDrawColor(c[0], c[1], c[2]);
  const garantir = (h: number) => { if (y + h > ALT - MARGEM - 6) { pdf.addPage(); y = MARGEM; } };
  const titulo = (t: string, c: Cor = PRETO, extra = 0) => {
    y += 3;
    garantir(16 + extra);
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); cor(c);
    pdf.text(limpar(t).toUpperCase(), MARGEM, y + 4);
    traco([220, 220, 220]); pdf.setLineWidth(0.3); pdf.line(MARGEM, y + 6.5, MARGEM + UTIL, y + 6.5);
    y += 10;
  };
  const paragrafo = (t: string, tam = 11, c: Cor = PRETO, negrito = false) => {
    pdf.setFont('helvetica', negrito ? 'bold' : 'normal'); pdf.setFontSize(tam); cor(c);
    const linhas: string[] = pdf.splitTextToSize(limpar(t), UTIL);
    const alt = tam * 0.42;
    linhas.forEach(l => { garantir(alt + 1); pdf.text(l, MARGEM, y + alt * 0.8); y += alt + 0.6; });
    y += 2;
  };

  // Cabeçalho
  const dataTxt = (() => {
    const [a, m, d] = String(aula?.data || '').split('T')[0].split('-').map(Number);
    return a ? new Date(a, m - 1, d).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '';
  })();
  preencher(PRETO); pdf.roundedRect(MARGEM, y, UTIL, 34, 3, 3, 'F');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); cor([253, 186, 116]); pdf.text('STUDIO ACORDE · FICHA DA AULA', MARGEM + 6, y + 7);
  pdf.setFontSize(17); cor([255, 255, 255]); pdf.text(limpar(`Aula de ${inst}`), MARGEM + 6, y + 15);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); cor([210, 210, 210]); pdf.text(limpar(dataTxt), MARGEM + 6, y + 20.5);
  pdf.setFontSize(7); cor([160, 160, 160]);
  if (alunoNome) pdf.text('ALUNO(A)', MARGEM + 6, y + 26);
  if (professorNome) pdf.text('PROFESSOR(A)', MARGEM + UTIL / 2, y + 26);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); cor([255, 255, 255]);
  if (alunoNome) pdf.text(limpar(alunoNome).slice(0, 40), MARGEM + 6, y + 31);
  if (professorNome) pdf.text(limpar(professorNome).slice(0, 40), MARGEM + UTIL / 2, y + 31);
  y += 42;

  titulo('Hoje aprendemos');
  paragrafo(r.conteudoText || 'O professor ainda não escreveu o resumo desta aula.');
  const tarefa = r.tarefaCasaText || aula?.tarefa_casa;
  if (tarefa) { titulo('Tarefa de casa', LARANJA); paragrafo(tarefa, 11, PRETO); }

  // Acordes por parte
  const grupos: Record<string, any[]> = {};
  (r.chords || []).forEach((c: any) => { const g = String(c.group || 'Acordes').toUpperCase(); (grupos[g] = grupos[g] || []).push(c); });
  Object.entries(grupos).forEach(([grupo, lista]) => {
    const teclado = (c: any) => /teclado|piano/i.test(c.instrument || inst);
    const colunas = lista.some(teclado) ? 3 : 4;
    const gap = 4;
    const w = (UTIL - gap * (colunas - 1)) / colunas;
    const primeiraLinha = lista.slice(0, colunas).some(teclado) ? w * 0.42 + 9 : w * 1.15 + 9;
    titulo(grupo === 'ACORDES' || grupo === 'GERAL' ? 'Acordes' : `Acordes · ${grupo}`, PRETO, primeiraLinha + 10);
    paragrafo(lista.map(nomeAcorde).join('   ·   '), 11, PRETO, true);
    for (let i = 0; i < lista.length; i += colunas) {
      const linha = lista.slice(i, i + colunas);
      const h = linha.some(teclado) ? w * 0.42 + 9 : w * 1.15 + 9;
      garantir(h + 2);
      linha.forEach((c, k) => desenharAcorde(pdf, c, MARGEM + k * (w + gap), y, w, teclado(c), inst));
      y += h + 4;
    }
    y += 2;
  });

  // Melodias (mão esquerda em cima, verde; direita embaixo, azul)
  (r.melody || []).forEach((mel: any, mi: number) => {
    titulo(`Melodia${mel?.name && mel.name !== 'NOVA MELODIA / GUIA' ? ` · ${mel.name}` : (r.melody.length > 1 ? ` ${mi + 1}` : '')}`);
    const partes = partesDaMelodia(mel);
    const temEsq = partes.some(p => p.esquerda.some(l => Array.isArray(l) && l.length));
    if (temEsq) { pdf.setFontSize(8); cor(VERDE); pdf.text('Verde = mão esquerda (em cima)', MARGEM, y + 3); cor(AZUL); pdf.text('Azul = mão direita (melodia)', MARGEM + 60, y + 3); y += 6; }
    partes.forEach((p, pi) => {
      if (partes.length > 1) { garantir(8); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); cor(LARANJA); pdf.text(`PARTE ${pi + 1}`, MARGEM, y + 3); y += 6; }
      const chipW = 11, chipH = 6.5, gap = 2;
      const maxEsq = Math.max(0, ...p.esquerda.map(l => (Array.isArray(l) ? l.length : 0)));
      const alturaLinha = chipH + maxEsq * (chipH - 1) + 3;
      let x = MARGEM;
      garantir(alturaLinha);
      p.direita.forEach((nota, ni) => {
        if (x + chipW > MARGEM + UTIL) { x = MARGEM; y += alturaLinha; garantir(alturaLinha); }
        const altura = (n: string) => { const m = String(n).match(/^([A-G]#?)(\d+)?/); return m ? Number(m[2] ?? 4) * 12 + NOTAS.indexOf(m[1]) : 0; };
        const esq = (Array.isArray(p.esquerda[ni]) ? [...p.esquerda[ni]] : []).sort((a, b) => altura(a) - altura(b));
        const baseY = y + maxEsq * (chipH - 1);
        esq.forEach((l, li) => {
          const yy = baseY - (li + 1) * (chipH - 1);
          preencher(VERDE); pdf.roundedRect(x + 1, yy, chipW - 2, chipH - 1.5, 1, 1, 'F');
          pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8); cor([255, 255, 255]);
          pdf.text(String(l).replace(/\d+$/, ''), x + chipW / 2, yy + 3.6, { align: 'center' });
        });
        preencher(AZUL); pdf.roundedRect(x, baseY, chipW, chipH, 1.2, 1.2, 'F');
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); cor([255, 255, 255]);
        pdf.text(String(nota).replace(/\d+$/, ''), x + chipW / 2, baseY + 4.5, { align: 'center' });
        x += chipW + gap;
      });
      y += alturaLinha + 2;
    });
  });

  if (Array.isArray(r.scales) && r.scales.length) {
    titulo('Escalas');
    r.scales.forEach((sc: any) => {
      paragrafo(`${sc.root || ''} ${sc.scaleName || ''}`, 11, PRETO, true);
      y -= 2; paragrafo((sc.notes || []).map((n: string) => String(n).replace(/\d+$/, '')).join(' - '), 10, CINZA);
    });
  }

  (r.tablatures || []).forEach((tab: any) => {
    titulo(`Tablatura${tab?.name ? ` · ${tab.name}` : ''}`);
    const m: any[][] = tab.matrix || [];
    const cols = Math.max(16, ...m.map(l => l?.length || 0));
    const passo = Math.min(10, (UTIL - 8) / cols);
    garantir(6 * 5 + 6);
    ['e', 'B', 'G', 'D', 'A', 'E'].forEach((corda, ci) => {
      const yy = y + ci * 5;
      pdf.setFont('courier', 'bold'); pdf.setFontSize(9); cor(CINZA); pdf.text(corda, MARGEM, yy + 1.2);
      traco([170, 170, 170]); pdf.setLineWidth(0.25); pdf.line(MARGEM + 5, yy, MARGEM + 5 + cols * passo, yy);
      for (let b = 0; b < cols; b++) {
        const v = m[ci]?.[b];
        if (v !== undefined && v !== null && String(v) !== '') {
          preencher([255, 255, 255]); pdf.rect(MARGEM + 5 + b * passo + passo / 2 - 2, yy - 2, 4, 4, 'F');
          cor(PRETO); pdf.text(String(v), MARGEM + 5 + b * passo + passo / 2, yy + 1.2, { align: 'center' });
        }
      }
    });
    y += 6 * 5 + 4;
  });

  if (Array.isArray(r.drums) && r.drums.length) {
    titulo('Ritmos');
    const partesBat = ['Bumbo', 'Caixa', 'Chimbal', 'Aro'];
    r.drums.forEach((d: any) => {
      paragrafo(`${d.name || d.pattern || 'Ritmo'}${d.bpm ? ` · ${d.bpm} BPM` : ''}`, 10, PRETO, true);
      if (Array.isArray(d.matrix)) {
        garantir(d.matrix.length * 5 + 4);
        d.matrix.forEach((linha: boolean[], li: number) => {
          pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); cor(CINZA); pdf.text(partesBat[li] || '', MARGEM, y + li * 5 + 3.3);
          linha.forEach((on, b) => {
            traco([180, 180, 180]); pdf.setLineWidth(0.2);
            if (on) { preencher(PRETO); pdf.rect(MARGEM + 18 + b * 5, y + li * 5, 4.4, 4.4, 'FD'); } else pdf.rect(MARGEM + 18 + b * 5, y + li * 5, 4.4, 4.4, 'S');
          });
        });
        y += d.matrix.length * 5 + 4;
      }
    });
  }

  if (Array.isArray(r.exercises) && r.exercises.length) {
    titulo('Desafios');
    r.exercises.forEach((ex: any) => {
      paragrafo(`${ex.title || ex.titulo || 'Desafio'}${ex.points ? ` · +${ex.points} pontos` : ''}`, 10.5, PRETO, true);
      if (ex.description || ex.desc) { y -= 2; paragrafo(ex.description || ex.desc, 10, CINZA); }
    });
  }

  if (Array.isArray(r.recordings) && r.recordings.length) {
    titulo('Áudios da aula');
    paragrafo(r.recordings.map((a: any, i: number) => `• ${a.name || `Áudio ${i + 1}`}`).join('\n') + '\nOuça no app do Studio Acorde.', 10, CINZA);
  }

  let midias: any[] = [];
  try { midias = typeof aula?.midias === 'string' ? JSON.parse(aula.midias) : (Array.isArray(aula?.midias) ? aula.midias : []); } catch { midias = []; }
  if (midias.length) {
    titulo('Links');
    midias.forEach((m: any) => {
      garantir(6);
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); cor(PRETO);
      const rot = `${limpar(m.titulo || 'Link')}: `;
      pdf.text(rot, MARGEM, y + 4);
      const wr = pdf.getTextWidth(rot);
      pdf.setFont('helvetica', 'normal'); cor(AZUL);
      const url = String(m.url || '');
      pdf.textWithLink(url.length > 80 ? url.slice(0, 77) + '...' : url, MARGEM + wr, y + 4, { url });
      y += 6;
    });
  }

  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); cor([150, 150, 150]);
    pdf.text(`Studio Acorde · página ${i} de ${total}`, LARG / 2, ALT - 6, { align: 'center' });
  }
  return pdf;
}

function desenharAcorde(pdf: jsPDF, c: any, x: number, y: number, w: number, teclado: boolean, inst: string) {
  // moldura + nome
  pdf.setDrawColor(210, 210, 210); pdf.setLineWidth(0.3); pdf.setFillColor(255, 255, 255);
  const h = teclado ? w * 0.42 + 9 : w * 1.15 + 9;
  pdf.roundedRect(x, y, w, h, 2, 2, 'FD');
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(28, 25, 23);
  pdf.text(limpar(nomeAcorde(c)), x + w / 2, y + 5.5, { align: 'center' });
  const ix = x + 2.5, iy = y + 8, iw = w - 5;

  if (teclado) {
    const { teclas, inicio, fim, baixoAbs } = teclasDoAcorde(c);
    const brancas: number[] = []; const pretas: { abs: number; idx: number }[] = [];
    for (let a = inicio; a <= fim; a++) { if (ehBranca(a)) brancas.push(a); else pretas.push({ abs: a, idx: brancas.length - 1 }); }
    const bw = iw / brancas.length, bh = w * 0.42 - 1;
    const ativas = new Set(teclas);
    brancas.forEach((a, i) => {
      pdf.setDrawColor(40, 40, 40); pdf.setLineWidth(0.25); pdf.setFillColor(255, 255, 255);
      pdf.rect(ix + i * bw, iy, bw, bh, 'FD');
      if (ativas.has(a)) {
        const baixo = a === baixoAbs;
        if (baixo) pdf.setFillColor(2, 132, 199); else pdf.setFillColor(38, 24, 18);
        pdf.circle(ix + i * bw + bw / 2, iy + bh - 2.6, Math.min(2.2, bw * 0.38), 'F');
        pdf.setFontSize(5.5); pdf.setTextColor(255, 255, 255);
        pdf.text(NOTAS[((a % 12) + 12) % 12], ix + i * bw + bw / 2, iy + bh - 1.9, { align: 'center' });
      }
    });
    pretas.forEach(p => {
      if (p.idx < 0 || p.idx >= brancas.length - 1) return;
      const pw = bw * 0.62, px = ix + (p.idx + 1) * bw - pw / 2, ph = bh * 0.6;
      const ativa = ativas.has(p.abs);
      if (ativa) { if (p.abs === baixoAbs) pdf.setFillColor(7, 89, 133); else pdf.setFillColor(194, 65, 12); } else pdf.setFillColor(26, 26, 26);
      pdf.rect(px, iy, pw, ph, 'F');
      if (ativa) {
        pdf.setFontSize(4.8); pdf.setTextColor(255, 255, 255);
        pdf.text(NOTAS[((p.abs % 12) + 12) % 12], px + pw / 2, iy + ph - 1.3, { align: 'center' });
      }
    });
    return;
  }

  // Violão: diagrama vertical
  const { frets, fingers, cordas } = formaViolao(c, c.instrument || inst);
  const casas = (frets.filter(f => f !== null && f > 0) as number[]);
  const min = casas.length ? Math.min(...casas) : 1, max = casas.length ? Math.max(...casas) : 1;
  const inicio = min > 4 ? min : 1; const n = Math.max(5, max - inicio + 1);
  const gw = iw * 0.62, gx = x + (w - gw) / 2, gy = iy + 5, gh = w * 1.15 - 9;
  const dx = gw / (cordas - 1), dy = gh / n;
  pdf.setDrawColor(60, 60, 60);
  if (inicio === 1) { pdf.setLineWidth(1.2); pdf.line(gx, gy, gx + gw, gy); }
  else { pdf.setFontSize(6); pdf.setTextColor(28, 25, 23); pdf.text(`${inicio}ª`, gx - 2, gy + dy / 2 + 1, { align: 'right' }); }
  pdf.setLineWidth(0.25);
  for (let f = 0; f <= n; f++) pdf.line(gx, gy + f * dy, gx + gw, gy + f * dy);
  for (let s = 0; s < cordas; s++) pdf.line(gx + s * dx, gy, gx + s * dx, gy + gh);
  frets.forEach((f, s) => {
    const cx = gx + s * dx;
    pdf.setFontSize(6.5);
    if (f === null) { pdf.setTextColor(220, 38, 38); pdf.text('x', cx, gy - 1.2, { align: 'center' }); return; }
    if (f === 0) { pdf.setDrawColor(5, 150, 105); pdf.setLineWidth(0.35); pdf.circle(cx, gy - 2, 1, 'S'); pdf.setDrawColor(60, 60, 60); pdf.setLineWidth(0.25); return; }
    const cy = gy + (f - inicio + 0.5) * dy;
    pdf.setFillColor(194, 65, 12); pdf.circle(cx, cy, Math.min(2, dx * 0.42), 'F');
    if (fingers[s]) { pdf.setFontSize(5.5); pdf.setTextColor(255, 255, 255); pdf.text(String(fingers[s]), cx, cy + 0.8, { align: 'center' }); }
  });
}
