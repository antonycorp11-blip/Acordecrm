const fs = require('fs');
let code = fs.readFileSync('src/pages/AreaAluno.tsx', 'utf8');

code = code.replace(/const aulaDate = new Date\(`\$\{a\.data\}T\$\{a\.horario \|\| '00:00:00'\}`\);/g, "const aulaDate = new Date((a.data + 'T' + (a.horario || '00:00:00')).replace(/-/g, '/').replace('T', ' '));");
code = code.replace(/\.sort\(\(a: any, b: any\) => new Date\(`\$\{a\.data\}T\$\{a\.horario\}`\)\.getTime\(\) - new Date\(`\$\{b\.data\}T\$\{b\.horario\}`\)\.getTime\(\)\);/g, ".sort((a: any, b: any) => { const timeA = new Date((a.data + 'T' + (a.horario || '00:00:00')).replace(/-/g, '/').replace('T', ' ')).getTime() || 0; const timeB = new Date((b.data + 'T' + (b.horario || '00:00:00')).replace(/-/g, '/').replace('T', ' ')).getTime() || 0; return timeA - timeB; });");

fs.writeFileSync('src/pages/AreaAluno.tsx', code);
