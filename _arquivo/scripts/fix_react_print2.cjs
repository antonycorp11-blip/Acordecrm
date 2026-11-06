const fs = require('fs');

let code = fs.readFileSync('src/components/GeradorContrato.tsx', 'utf-8');

code = code.replace(
`  const handlePrintPdf = useReactToPrint({
    content: () => printRef.current,
    documentTitle: \`Contrato_\${aluno.nome.replace(/\\s+/g, '_')}\`,
  });`,
`  const handlePrintPdf = useReactToPrint({
    contentRef: printRef,
    documentTitle: \`Contrato_\${aluno.nome.replace(/\\s+/g, '_')}\`,
  });`
);

fs.writeFileSync('src/components/GeradorContrato.tsx', code);
