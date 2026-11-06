const fs = require('fs');

let code = fs.readFileSync('src/components/GeradorContrato.tsx', 'utf-8');

// Substituir handlePrintPdf
code = code.replace(
`  const handlePrintPdf = () => {
    if (!printRef.current) return;
    const element = printRef.current;
    
    // Clonar o elemento para gerar PDF oculto
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.display = 'block';
    clone.style.width = '800px';
    clone.style.padding = '40px';
    document.body.appendChild(clone);

    const opt = {
      margin:       10,
      filename:     \`Contrato_\${aluno.nome.replace(/\\s+/g, '_')}.pdf\`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().from(clone).set(opt).save().then(() => {
      document.body.removeChild(clone);
    });
  };`,
`  const handlePrintPdf = () => {
    // Usar window.print() com estilos de impressão aprimorados no CSS Global
    window.print();
  };`
);

// Mudar classes da div de impressão para usar print:block absoluto
code = code.replace(
`      {/* Conteúdo Oculto para Geração de PDF e Captura HTML */}
      <div className="hidden">
        <div ref={printRef} style={{ padding: '20px', fontFamily: 'serif', fontSize: '12px', lineHeight: '1.5', color: '#000', backgroundColor: '#fff' }}>`,
`      {/* Conteúdo Oculto para Geração de PDF e Captura HTML */}
      <div className="hidden print:block print:absolute print:inset-0 print:bg-white print:z-[9999] print:w-full print:h-full print:m-0 print:p-0">
        <div ref={printRef} className="print:w-[210mm] print:mx-auto print:p-[20mm] print:bg-white" style={{ padding: '20px', fontFamily: 'serif', fontSize: '12px', lineHeight: '1.5', color: '#000', backgroundColor: '#fff' }}>`
);

fs.writeFileSync('src/components/GeradorContrato.tsx', code);
console.log('Fixed PDF print');

let indexCss = fs.readFileSync('src/index.css', 'utf-8');
if (!indexCss.includes('@media print')) {
    indexCss += `\n\n@media print {
  @page { margin: 0; size: A4 portrait; }
  body { margin: 0; background-color: #fff !important; }
  body > *:not(.fixed) { display: none !important; } /* Hide all non-fixed elements */
}`;
    fs.writeFileSync('src/index.css', indexCss);
}
