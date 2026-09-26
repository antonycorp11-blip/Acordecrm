const fs = require('fs');
const file = 'server.ts';
let code = fs.readFileSync(file, 'utf-8');

const targetStr = `    // --- SEGURANÇA ---`;
const injection = `
    // --- ROTAS PÚBLICAS (ASSINATURA DE CONTRATOS) ---
    app.get('/api/contratos/:id', async (req, res) => {
        try {
            const { data, error } = await supabase.from('contratos').select('*, alunos(nome, cpf)').eq('id', req.params.id).single();
            if (error) throw error;
            if (!data) return res.status(404).json({ error: 'Contrato não encontrado' });
            res.json(data);
        } catch (error: any) {
            console.error('Erro get contrato:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/contratos/:id/assinar', async (req, res) => {
        try {
            const { assinatura_base64 } = req.body;
            if (!assinatura_base64) return res.status(400).json({ error: 'Assinatura inválida' });

            const { data, error } = await supabase.from('contratos')
                .update({ 
                    assinatura_base64, 
                    status: 'assinado', 
                    data_assinatura: new Date().toISOString() 
                })
                .eq('id', req.params.id)
                .select()
                .single();
                
            if (error) throw error;
            res.json({ success: true, data });
        } catch (error: any) {
            console.error('Erro ao assinar contrato:', error);
            res.status(500).json({ error: error.message });
        }
    });

`;

if (!code.includes('/api/contratos/:id/assinar')) {
    code = code.replace(targetStr, injection + targetStr);
    fs.writeFileSync(file, code);
    console.log("Injected public endpoints into server.ts");
} else {
    console.log("Already injected.");
}

const indexFile = 'api/index.ts';
let indexCode = fs.readFileSync(indexFile, 'utf-8');
if (!indexCode.includes('/api/contratos/:id/assinar')) {
    indexCode = indexCode.replace(targetStr, injection + targetStr);
    fs.writeFileSync(indexFile, indexCode);
    console.log("Injected public endpoints into api/index.ts");
} else {
    console.log("Already injected api/index.ts");
}

