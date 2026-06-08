const fs = require('fs');
let code = fs.readFileSync('api/index.ts', 'utf8');

// 1. Fix Baixa endpoint
const baixaRegex = /app\.patch\('\/api\/pagamentos\/:id\/baixa', async \(req, res\) => \{[\s\S]*?res\.status\(500\)\.json\(\{ error: error\.message \}\); \}\n    \}\);/;
const baixaReplacement = `app.patch('/api/pagamentos/:id/baixa', async (req, res) => {
        try {
            const { id } = req.params;
            const { metodo_pagamento, valor_pago } = req.body;
            const today = getDateBR();
            
            const updatePayload: any = { 
                status: 'pago', 
                data_pagamento: today, 
                metodo_pagamento: metodo_pagamento || 'dinheiro' 
            };
            if (valor_pago !== undefined) updatePayload.valor_pago = valor_pago;

            const { data, error } = await supabase.from('pagamentos')
                .update(updatePayload)
                .eq('id', id).select().single();
            if (error) throw error;
            res.json(data);
        } catch (error: any) { res.status(500).json({ error: error.message }); }
    });`;
code = code.replace(baixaRegex, baixaReplacement);

// 2. Fix Resumo endpoint
code = code.replace("receitaMes += Number(p.valor);", "const vp = p.valor_pago != null ? Number(p.valor_pago) : Number(p.valor);\n                        receitaMes += vp;");
code = code.replace("faturamentoPrevisto += (p.status === 'pago' ? Number(p.valor) : valorEfetivo);", "faturamentoPrevisto += (p.status === 'pago' ? vp : valorEfetivo);");

// 3. Fix Dashboard Stats endpoint
code = code.replace(".select('valor')", ".select('valor, valor_pago')");
code = code.replace("const receitaMensal = pagamentosMes?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;", "const receitaMensal = pagamentosMes?.reduce((acc, curr) => acc + (curr.valor_pago != null ? Number(curr.valor_pago) : Number(curr.valor)), 0) || 0;");

fs.writeFileSync('api/index.ts', code);
console.log('Fixed payments logic in API');
