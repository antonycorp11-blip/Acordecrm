const fs = require('fs');
let code = fs.readFileSync('src/pages/AreaAluno.tsx', 'utf8');
code = code.replace(/new Date\(aula\.data \+ 'T12:00:00'\)/g, "new Date(aula.data + 'T12:00:00Z')");
fs.writeFileSync('src/pages/AreaAluno.tsx', code);
