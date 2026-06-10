const fs = require('fs');

// 1. Update GeradorContrato.tsx
let code = fs.readFileSync('src/components/GeradorContrato.tsx', 'utf-8');

// Import useReactToPrint
if (!code.includes('useReactToPrint')) {
    code = code.replace("import { toast } from 'sonner';", "import { toast } from 'sonner';\nimport { useReactToPrint } from 'react-to-print';");
}

// Replace handlePrintPdf
code = code.replace(
`  const handlePrintPdf = () => {
    // Usar window.print() com estilos de impressão aprimorados no CSS Global
    window.print();
  };`,
`  const handlePrintPdf = useReactToPrint({
    content: () => printRef.current,
    documentTitle: \`Contrato_\${aluno.nome.replace(/\\s+/g, '_')}\`,
  });`
);

// Fix the div classes - we want it to be hidden on the screen but visible to print
// Since react-to-print clones it into an iframe where it will be the ONLY element, we can leave it hidden on screen!
// Actually, react-to-print requires the element to not be display:none when cloned? No, it works if the parent has display:none, but if the element itself has display:none, it clones it as display:none.
// We can use a trick: absolute, opacity-0, pointer-events-none, z-[-1]
code = code.replace(
`      {/* Conteúdo Oculto para Geração de PDF e Captura HTML */}
      <div className="hidden print:block print:absolute print:inset-0 print:bg-white print:z-[9999] print:w-full print:h-full print:m-0 print:p-0">
        <div ref={printRef} className="print:w-[210mm] print:mx-auto print:p-[20mm] print:bg-white" style={{ padding: '20px', fontFamily: 'serif', fontSize: '12px', lineHeight: '1.5', color: '#000', backgroundColor: '#fff' }}>`,
`      {/* Conteúdo Oculto para Geração de PDF e Captura HTML */}
      <div className="fixed opacity-0 pointer-events-none z-[-1]">
        <div ref={printRef} className="bg-white p-8" style={{ width: '800px', fontFamily: 'serif', fontSize: '14px', lineHeight: '1.5', color: '#000', backgroundColor: '#fff' }}>`
);

fs.writeFileSync('src/components/GeradorContrato.tsx', code);

// 2. Remove the bad print CSS from index.css
let css = fs.readFileSync('src/index.css', 'utf-8');
css = css.replace(/@media print \{[\s\S]*?body > \*:not\(\.fixed\) \{ display: none !important; \} \/\* Hide all non-fixed elements \*\/[\s\S]*?\}/, '');
fs.writeFileSync('src/index.css', css);

console.log('Fixed react-to-print');
