const fs = require('fs');

let code = fs.readFileSync('src/components/alunos/AlunoModal.tsx', 'utf8');

const regex = /\{formData\.pacote_id && \(\n\s*<div className="mt-2 bg-white border border-black p-2">/;
const replacement = `<div className="mt-2 bg-white border border-black p-2">`;

code = code.replace(regex, replacement);

const regex2 = /A data selecionada ajustará o vencimento e os próximos pagamentos\.<\/p>\n\s*<\/div>\n\s*\)\}/;
const replacement2 = `A data selecionada ajustará o vencimento e os próximos pagamentos.</p>\n                    </div>`;

code = code.replace(regex2, replacement2);

fs.writeFileSync('src/components/alunos/AlunoModal.tsx', code);
console.log("Removed condition from AlunoModal.tsx");
