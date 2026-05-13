const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: matriculas } = await supabase.from('matriculas').select('id, aluno_id, aluno:aluno_id(nome)');
    const { data: pagamentos } = await supabase.from('pagamentos').select('id, matricula_id, aluno_id');
    
    console.log(`Total de matrículas: ${matriculas.length}`);
    console.log(`Total de pagamentos: ${pagamentos.length}`);
    
    const countByAluno = {};
    for (let p of pagamentos) {
        countByAluno[p.aluno_id] = (countByAluno[p.aluno_id] || 0) + 1;
    }
    
    console.log(`Alunos com pagamentos: ${Object.keys(countByAluno).length}`);
    
    // Alunos sem pagamentos:
    const alunosComPagamentos = new Set(Object.keys(countByAluno).map(Number));
    const alunosSemPagamentos = matriculas.filter(m => !alunosComPagamentos.has(m.aluno_id));
    console.log(`Matrículas de alunos sem pagamentos: ${alunosSemPagamentos.length}`);
}
check();
