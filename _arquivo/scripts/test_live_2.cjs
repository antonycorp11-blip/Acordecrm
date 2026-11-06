const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'x-backend-secret': 'studio-acorde-secret-key-2024'
    }
  }
});

async function test() {
    try {
        const reqBody = {
            nome: 'ANNY GABRIELLY SA SILVA ESPINA',
            email: '',
            telefone: '',
            cpf: '',
            endereco: '',
            data_nascimento: '2017-11-30',
            responsavel_nome: 'CIERO LEONEL',
            responsavel_telefone: '65992170088',
            responsavel_cpf: '58306734153',
            curso_id: 1, 
            professor_id: 1, 
            dia_semana: '2026-06-12', // assuming they picked this
            horario: '16:00',
            pacote_id: 1, 
            valor_parcela: 150,
            data_primeira_parcela: '2026-06-10',
            dia_vencimento: 10,
            total_parcelas: 12
        };

        const { data: aluno, error: errA } = await supabase.from('alunos').insert([{ 
            nome: reqBody.nome, 
            email: reqBody.email || null, 
            telefone: reqBody.telefone || null, 
            cpf: reqBody.cpf || null, 
            endereco: reqBody.endereco || null,
            data_nascimento: reqBody.data_nascimento || null,
            responsavel_nome: reqBody.responsavel_nome || null,
            responsavel_telefone: reqBody.responsavel_telefone || null,
            responsavel_cpf: reqBody.responsavel_cpf || null
        }]).select().single();
        if (errA) throw errA;

        const { data: matricula, error: errM } = await supabase.from('matriculas').insert([{
            aluno_id: aluno.id, 
            curso_id: reqBody.curso_id, 
            professor_id: reqBody.professor_id, 
            dia_semana: new Date(reqBody.dia_semana).getDay(),
            horario: reqBody.horario, 
            pacote_id: reqBody.pacote_id,
            data_primeira_parcela: reqBody.data_primeira_parcela || null,
            dia_vencimento: reqBody.dia_vencimento,
            valor_parcela: reqBody.valor_parcela,
            total_parcelas: reqBody.total_parcelas,
            data_inicio: reqBody.dia_semana || null
        }]).select().single();
        if (errM) throw errM;

        const aulasToInsert = [];
        let currentAulaDate = new Date(reqBody.dia_semana);
        for (let i = 0; i < 4; i++) {
            aulasToInsert.push({
                aluno_id: aluno.id,
                matricula_id: matricula.id,
                professor_id: reqBody.professor_id,
                curso_id: reqBody.curso_id,
                data: currentAulaDate.toISOString().split('T')[0],
                horario: reqBody.horario,
                status: 'pendente',
                tipo: 'regular'
            });
            currentAulaDate.setDate(currentAulaDate.getDate() + 7);
        }
        const { error: errAulas } = await supabase.from('aulas').insert(aulasToInsert);
        if (errAulas) { throw errAulas; }

        const pagamentosToInsert = [];
        let currentVencimento = new Date(reqBody.data_primeira_parcela);
        for (let i = 0; i < 1; i++) {
            pagamentosToInsert.push({
                aluno_id: aluno.id,
                matricula_id: matricula.id,
                valor: reqBody.valor_parcela,
                data_vencimento: currentVencimento.toISOString().split('T')[0],
                status: 'pendente',
                tipo_receita: 'mensalidade',
                referencia_mes_ano: `${(currentVencimento.getMonth() + 1).toString().padStart(2, '0')}/${currentVencimento.getFullYear()}`
            });
            currentVencimento.setMonth(currentVencimento.getMonth() + 1);
            currentVencimento.setDate(reqBody.dia_vencimento);
        }
        const { error: errPagamentos } = await supabase.from('pagamentos').insert(pagamentosToInsert);
        if (errPagamentos) { throw errPagamentos; }

        console.log("Success! No DB errors.");

        await supabase.from('pagamentos').delete().eq('aluno_id', aluno.id);
        await supabase.from('aulas').delete().eq('aluno_id', aluno.id);
        await supabase.from('matriculas').delete().eq('aluno_id', aluno.id);
        await supabase.from('alunos').delete().eq('id', aluno.id);

    } catch (e) {
        console.error("Caught error:", e);
    }
}
test();
