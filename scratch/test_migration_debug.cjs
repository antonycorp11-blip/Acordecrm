const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testMigration() {
    console.log('Testando migração...');
    
    const payload = {
        nome: "TESTE MIGRACAO " + Date.now(),
        email: null,
        telefone: "123",
        cpf: null,
        endereco: "Rua Teste",
        data_nascimento: "01/01/2000",
        curso_id: 1, // Assumindo que o ID 1 existe
        professor_id: 1,
        dia_semana: "sabado",
        horario: "08:00",
        pacote_id: 1,
        aulas_restantes: 1,
        reposicoes: 0,
        faturas_pendentes: 1,
        fatura_mes_atraso: false,
        valor_parcela: 300,
        valor_desconto: 280,
        dia_vencimento: 10,
        total_parcelas: 12
    };

    try {
        // Simular o que o backend faz
        const { data: aluno, error: errA } = await supabase.from('alunos').insert([{ 
            nome: payload.nome, 
            email: payload.email, 
            telefone: payload.telefone, 
            cpf: payload.cpf, 
            endereco: payload.endereco,
            status: 'ativo'
        }]).select().single();
        
        if (errA) {
            console.error('Erro Aluno:', errA);
            return;
        }
        console.log('Aluno criado:', aluno.id);

        const { data: matricula, error: errM } = await supabase.from('matriculas').insert([{
            aluno_id: aluno.id, 
            curso_id: payload.curso_id, 
            professor_id: payload.professor_id, 
            dia_semana: 6,
            horario: payload.horario, 
            pacote_id: payload.pacote_id,
            valor_parcela: payload.valor_parcela,
            total_parcelas: payload.total_parcelas
        }]).select().single();

        if (errM) {
            console.error('Erro Matricula:', errM);
            return;
        }
        console.log('Matricula criada:', matricula.id);

    } catch (e) {
        console.error('Exception:', e);
    }
}

testMigration();
