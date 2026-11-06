const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

const newEndpoint = `
    app.get('/api/dashboard/faturas-pendentes', async (req, res) => {
        try {
            const dataHoje = new Date();
            const startOfMonth = new Date(dataHoje.getFullYear(), dataHoje.getMonth(), 1).toLocaleDateString('pt-BR').split('/').reverse().join('-');
            const endOfMonth = new Date(dataHoje.getFullYear(), dataHoje.getMonth() + 1, 0).toLocaleDateString('pt-BR').split('/').reverse().join('-');

            const { data: faturas, error } = await supabase
                .from('pagamentos')
                .select('id, aluno_id, valor, data_vencimento, status, alunos(nome)')
                .in('status', ['pendente', 'atrasado'])
                .gte('data_vencimento', startOfMonth)
                .lte('data_vencimento', endOfMonth)
                .order('data_vencimento', { ascending: true });

            if (error) throw error;
            res.json(faturas || []);
        } catch (error: any) {
            console.error('Erro faturas-pendentes:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.get('/api/dashboard/stats', async (req, res) => {
`;

code = code.replace("    app.get('/api/dashboard/stats', async (req, res) => {", newEndpoint);

fs.writeFileSync('api/index.ts', code);
console.log('Added /api/dashboard/faturas-pendentes route!');
