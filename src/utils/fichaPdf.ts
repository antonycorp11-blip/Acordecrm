import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

// Gera um PDF A4 da ficha: cada bloco [data-pdf-bloco] é desenhado inteiro,
// e se não couber no resto da página vai para a página seguinte (nada é cortado ao meio).
export async function baixarFichaPdf(container: HTMLElement, nomeArquivo: string) {
  const blocos = Array.from(container.querySelectorAll<HTMLElement>('[data-pdf-bloco]'));
  const alvos = blocos.length ? blocos : [container];

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const larguraPag = 210;
  const alturaPag = 297;
  const margem = 12;
  const larguraUtil = larguraPag - margem * 2;
  const alturaUtil = alturaPag - margem * 2;
  const espaco = 4;
  let y = margem;
  let primeiraPagina = true;

  for (const el of alvos) {
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
    let w = larguraUtil;
    let h = (canvas.height * w) / canvas.width;
    if (h > alturaUtil) { // bloco maior que a página: reduz para caber inteiro
      h = alturaUtil;
      w = (canvas.width * h) / canvas.height;
    }
    if (!primeiraPagina && y + h > alturaPag - margem) {
      pdf.addPage();
      y = margem;
    }
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margem + (larguraUtil - w) / 2, y, w, h);
    y += h + espaco;
    primeiraPagina = false;
  }

  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(140);
    pdf.text(`Studio Acorde · página ${i} de ${total}`, larguraPag / 2, alturaPag - 5, { align: 'center' });
  }

  pdf.save(nomeArquivo.endsWith('.pdf') ? nomeArquivo : `${nomeArquivo}.pdf`);
}

export function nomeArquivoFicha(alunoNome: string, data?: string) {
  const nome = String(alunoNome || 'Aluno').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
  const d = String(data || '').split('T')[0].split('-').reverse().join('-');
  return `Ficha_${nome}${d ? `_${d}` : ''}.pdf`;
}
