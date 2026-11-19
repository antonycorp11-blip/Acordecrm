import { toCanvas } from 'html-to-image';
import { jsPDF } from 'jspdf';

// html2canvas não entende as cores oklch do Tailwind 4 e trava; html-to-image usa o próprio navegador para desenhar
async function desenharBloco(el: HTMLElement) {
  const opts = { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true, skipFonts: true };
  try {
    await toCanvas(el, opts); // 1ª passada aquece imagens/fontes (necessário no Safari do iPhone)
  } catch { /* segue para a segunda */ }
  return toCanvas(el, opts);
}

// Gera um PDF A4 da ficha: cada bloco [data-pdf-bloco] é desenhado inteiro,
// e se não couber no resto da página vai para a página seguinte (nada é cortado ao meio).
export async function gerarFichaPdf(container: HTMLElement) {
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
    const canvas = await desenharBloco(el);
    if (!canvas.width || !canvas.height) continue;
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

  return pdf;
}

const comPdf = (n: string) => (n.endsWith('.pdf') ? n : `${n}.pdf`);

export async function baixarFichaPdf(container: HTMLElement, nomeArquivo: string) {
  const pdf = await gerarFichaPdf(container);
  pdf.save(comPdf(nomeArquivo));
}

export async function gerarArquivoFicha(container: HTMLElement, nomeArquivo: string) {
  const pdf = await gerarFichaPdf(container);
  return new File([pdf.output('blob')], comPdf(nomeArquivo), { type: 'application/pdf' });
}

export const telefoneWhatsApp = (tel?: string | null) => {
  let d = String(tel || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) d = d.replace(/^0+/, '');
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d;
};

// Envia o PDF pelo WhatsApp: no celular abre o "Compartilhar" já com o PDF (escolha WhatsApp → aluno).
// Onde não dá para compartilhar arquivo (computador), baixa o PDF e abre a conversa do aluno no WhatsApp.
export async function enviarArquivoWhatsApp(arquivo: File, telefone: string, texto: string): Promise<'compartilhado' | 'baixado' | 'cancelado'> {
  const nav: any = navigator;
  if (nav.canShare && nav.canShare({ files: [arquivo] })) {
    try {
      await nav.share({ files: [arquivo], text: texto, title: arquivo.name });
      return 'compartilhado';
    } catch (err: any) {
      if (err?.name === 'AbortError') return 'cancelado';
      // NotAllowedError etc.: cai no plano B
    }
  }
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement('a');
  a.href = url; a.download = arquivo.name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  const tel = telefoneWhatsApp(telefone);
  const link = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(texto)}` : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  window.open(link, '_blank');
  return 'baixado';
}

export function nomeArquivoFicha(alunoNome: string, data?: string) {
  const nome = String(alunoNome || 'Aluno').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
  const d = String(data || '').split('T')[0].split('-').reverse().join('-');
  return `Ficha_${nome}${d ? `_${d}` : ''}.pdf`;
}
