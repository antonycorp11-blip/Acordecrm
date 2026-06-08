const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const newRoute = `
    app.get('/api/agenda/pendentes-passado', async (req, res) => {
        try {
            // Aulas pendentes no passado, excluindo as A DEFINIR (2099)
            const hojeStr = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');
            
            const { data: aulas_pendentes, error: err1 } = await supabase
                .from('aulas')
                .select('id, data, horario, status, professor_id, aluno_id, alunos(nome, status), professores(nome)')
                .eq('status', 'pendente')
                .lt('data', hojeStr)
                .neq('data', '2099-12-31')
                .order('data', { ascending: true });

            if (err1) throw err1;

            res.json(aulas_pendentes || []);
        } catch (error: any) {
            console.error('Erro pendentes-passado:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/agenda', async (req, res) => {
`;

code = code.replace("    app.get('/api/agenda', async (req, res) => {", newRoute);

fs.writeFileSync('api/index.ts', code);
console.log('Added /api/agenda/pendentes-passado route!');
