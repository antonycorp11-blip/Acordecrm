const fs = require('fs');
let code = fs.readFileSync('src/pages/AlunoPerfil.tsx', 'utf8');

code = code.replace(
    "<td className=\"px-6 py-4 font-black text-black text-lg italic\">R$ {Number(fat.valor).toFixed(2).replace('.', ',')}</td>",
    "<td className=\"px-6 py-4 font-black text-black text-lg italic\">R$ {Number(fat.status === 'pago' ? (fat.valor_pago != null ? fat.valor_pago : fat.valor) : fat.valor).toFixed(2).replace('.', ',')}</td>"
);

fs.writeFileSync('src/pages/AlunoPerfil.tsx', code);
console.log('Fixed AlunoPerfil.tsx');
