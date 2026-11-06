const fs = require('fs');

let code = fs.readFileSync('api/index.ts', 'utf8');

// Update the select query for /api/alunos/:id
code = code.replace(
    /app\.get\('\/api\/alunos\/:id', async \(req, res\) => \{\n        try \{\n            const \{ data, error \} = await supabase\n                \.from\('alunos'\)\n                \.select\('\*, matriculas\(\*, cursos\(nome\)\)'\)/,
    `app.get('/api/alunos/:id', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('alunos')
                .select('*, matriculas(*, cursos(nome)), contratos(id)')`
);

fs.writeFileSync('api/index.ts', code);
console.log('Done api/index.ts');
