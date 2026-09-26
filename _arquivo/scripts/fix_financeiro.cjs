const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

code = code.replace(
    "<span className=\"text-[12px] font-black\">R$ {Number(p.valor).toFixed(2).replace('.', ',')}</span>",
    "<span className=\"text-[12px] font-black\">R$ {Number(p.status === 'pago' ? (p.valor_pago != null ? p.valor_pago : p.valor) : p.valor).toFixed(2).replace('.', ',')}</span>"
);

fs.writeFileSync('src/pages/Financeiro.tsx', code);
console.log('Fixed Financeiro.tsx');
