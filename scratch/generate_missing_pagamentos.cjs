const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: matriculas } = await supabase.from('matriculas').select('*, pacote:pacotes(*)').in('status', ['ativa', 'Ativa']);
    const { data: pagamentos } = await supabase.from('pagamentos').select('matricula_id');
    
    const matriculasComPagamentos = new Set(pagamentos.map(p => p.matricula_id));
    const matriculasSemPagamentos = matriculas.filter(m => !matriculasComPagamentos.has(m.id));
    
    console.log(`Encontradas ${matriculasSemPagamentos.length} matriculas sem pagamentos.`);
    
    const pagamentosToInsert = [];
    
    for (let m of matriculasSemPagamentos) {
        const pacote = m.pacote;
        if (!pacote) continue;
        
        let total_parcelas = 12;
        if (pacote.nome === 'Semestral') total_parcelas = 6;
        
        let valor = pacote.valor_mensal - (pacote.desconto_automatico || 0);
        if (pacote.nome === 'Legado Emusys') {
            if (valor === 0) valor = 270;
        }
        
        // As parcelas comecam na data de inicio da matricula
        let currentVencimento = new Date(m.data_inicio || '2026-01-01');
        // Usar default de 10 pra evitar bugs, ja q no import a gnt nao pegou o dia de vcto
        let dia_vencimento = 10;
        
        for (let i = 0; i < total_parcelas; i++) {
            pagamentosToInsert.push({
                aluno_id: m.aluno_id,
                matricula_id: m.id,
                valor: valor,
                data_vencimento: currentVencimento.toISOString().split('T')[0],
                status: 'pendente',
                tipo_receita: 'mensalidade',
                referencia_mes_ano: `${(currentVencimento.getMonth() + 1).toString().padStart(2, '0')}/${currentVencimento.getFullYear()}`
            });
            
            currentVencimento.setMonth(currentVencimento.getMonth() + 1);
            currentVencimento.setDate(dia_vencimento);
        }
    }
    
    if (pagamentosToInsert.length > 0) {
        console.log(`Inserindo ${pagamentosToInsert.length} parcelas...`);
        // Batch insert, max 1000 per request? Supabase can do bulk.
        const { error } = await supabase.from('pagamentos').insert(pagamentosToInsert);
        if (error) {
            console.error('Erro ao inserir:', error);
        } else {
            console.log('Pagamentos gerados com sucesso!');
        }
    }
}
run();
