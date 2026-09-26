require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'x-backend-secret': process.env.JWT_SECRET || 'studio-acorde-secret-key-2024'
    }
  }
});

async function run() {
    const applyDiscount = true;
    const { data, error } = await supabase
        .from('pagamentos')
        .select('*, aluno:aluno_id!inner(nome, status, matriculas(id, status, valor_com_desconto))')
        .ilike('aluno.nome', '%ANNA SOFIA%')
        .limit(5);

    const formatted = data?.map((p) => {
        let valorEfetivo = Number(p.valor);
        let log = '';
        if (applyDiscount && p.tipo_receita === 'mensalidade' && p.status !== 'pago') {
            const alunoObj = Array.isArray(p.aluno) ? p.aluno[0] : p.aluno;
            const matriculas = alunoObj?.matriculas;
            let matriculaAlvo = null;
            if (Array.isArray(matriculas) && matriculas.length > 0) {
                matriculaAlvo = p.matricula_id ? matriculas.find((m) => String(m.id) === String(p.matricula_id)) : null;
                if (!matriculaAlvo) matriculaAlvo = matriculas.find((m) => m.status === 'ativa');
            }
            log += `matriculaAlvo: ${JSON.stringify(matriculaAlvo)}`;
            if (matriculaAlvo && matriculaAlvo.valor_com_desconto != null && Number(matriculaAlvo.valor_com_desconto) > 0) {
                valorEfetivo = Number(matriculaAlvo.valor_com_desconto);
            }
        }
        return { nome: p.aluno?.nome, original: p.valor, efetivo: valorEfetivo, log };
    }) || [];
    
    console.log(JSON.stringify(formatted, null, 2));
}
run();
