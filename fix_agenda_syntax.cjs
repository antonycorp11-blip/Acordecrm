const fs = require('fs');
let code = fs.readFileSync('src/pages/Agenda.tsx', 'utf8');

code = code.replace(/onClick=\{\(\) => setCancelModalAula\(null\); setMotivoCancelamento\(''\);\}/g, "onClick={() => { setCancelModalAula(null); setMotivoCancelamento(''); }}");

fs.writeFileSync('src/pages/Agenda.tsx', code);
console.log('Fixed syntax error!');
