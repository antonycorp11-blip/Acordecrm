const fs = require('fs');
let code = fs.readFileSync('src/pages/AreaAluno.tsx', 'utf8');

code = code.replace(/new Date\(\(a\.data \+ 'T' \+ \(a\.horario \|\| '00:00:00'\)\)\.replace\(\/-\/g, '\/'\)\.replace\('T', ' '\)\)/g, "new Date(a.data + 'T' + (a.horario || '00:00:00'))");
code = code.replace(/new Date\(\(b\.data \+ 'T' \+ \(b\.horario \|\| '00:00:00'\)\)\.replace\(\/-\/g, '\/'\)\.replace\('T', ' '\)\)/g, "new Date(b.data + 'T' + (b.horario || '00:00:00'))");

fs.writeFileSync('src/pages/AreaAluno.tsx', code);
