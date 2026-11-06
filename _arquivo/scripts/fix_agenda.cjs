const fs = require('fs');

let agenda = fs.readFileSync('src/pages/Agenda.tsx', 'utf8');

// Adicionar timestamp na URL e Headers de no-cache
agenda = agenda.replace(
    /fetch\(`\/api\/agenda\?date=\$\{start\}`,\s*\{ headers \}\)/g,
    "fetch(`/api/agenda?date=${start}&_t=${Date.now()}`, { headers: { ...headers, 'Cache-Control': 'no-cache, no-store, must-revalidate' } })"
);

// E também no professores para garantir
agenda = agenda.replace(
    /fetch\('\/api\/professores',\s*\{ headers \}\)/g,
    "fetch(`/api/professores?_t=${Date.now()}`, { headers: { ...headers, 'Cache-Control': 'no-cache, no-store, must-revalidate' } })"
);

// Adicionar a mesma coisa no fetch do backend para confirmar aulas, cancelar, etc
// Isso evita cachear respostas de preflight ou erro
fs.writeFileSync('src/pages/Agenda.tsx', agenda, 'utf8');
console.log('Agenda.tsx corrigido!');
