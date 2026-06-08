const fs = require('fs');

// 1. Fix API
let apiCode = fs.readFileSync('api/index.ts', 'utf8');
apiCode = apiCode.replace(/if \(filterAlunoId\) query = query\.eq\('aluno_id', filterAlunoId\);/g, "if (filterAlunoId) query = query.eq('aluno_id', filterAlunoId);\n            if (req.query.status) query = query.eq('status', req.query.status);");
fs.writeFileSync('api/index.ts', apiCode);

// 2. Fix Reposicoes.tsx
let repCode = fs.readFileSync('src/pages/Reposicoes.tsx', 'utf8');
repCode = repCode.replace(/fetch\('\/api\/agenda', \{/g, "fetch('/api/agenda?status=reposicao', {");
fs.writeFileSync('src/pages/Reposicoes.tsx', repCode);
