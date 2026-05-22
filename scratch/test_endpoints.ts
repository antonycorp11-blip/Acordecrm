import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
        headers: {
            'x-backend-secret': 'studio-acorde-secret-key-2024'
        }
    }
});

async function testMeEndpoint(email: string) {
    console.log(`\n--- Testando /api/alunos/me para o email: ${email} ---`);
    try {
        const { data: aluno, error: errMe } = await supabase
            .from('alunos')
            .select('*, matriculas(*, cursos(nome))')
            .ilike('email', email)
            .order('id', { foreignTable: 'matriculas', ascending: false })
            .maybeSingle();

        if (errMe) {
            console.error(`Erro no endpoint /api/alunos/me:`, errMe);
            return null;
        }

        if (!aluno) {
            console.log(`Nenhum aluno encontrado para ${email}`);
            return null;
        }

        const activeCourse = (aluno.matriculas || []).find((m: any) => m?.status === 'ativa')?.cursos?.nome || 'STUDENT';
        console.log(`Sucesso! Aluno ID: ${aluno.id}, Nome: ${aluno.nome}, Curso Ativo: ${activeCourse}`);
        return aluno;
    } catch (err: any) {
        console.error(`Erro fatal no testMeEndpoint:`, err.message);
        return null;
    }
}

async function testAgendaEndpoint(email: string) {
    console.log(`\n--- Testando /api/agenda para o email: ${email} ---`);
    try {
        let filterAlunoId: string | null = null;
        const { data: aluno, error: errMe } = await supabase
            .from('alunos')
            .select('id')
            .ilike('email', email)
            .maybeSingle();
            
        if (errMe) {
            console.error(`Erro ao buscar ID do aluno:`, errMe);
            return;
        }
        
        if (aluno) {
            filterAlunoId = String(aluno.id);
            console.log(`Aluno encontrado! ID: ${filterAlunoId}`);
        } else {
            console.warn(`Aluno não encontrado para email: ${email}`);
            filterAlunoId = '-1';
        }

        let query = supabase.from('aulas')
            .select('id, data, horario, status, professor_id, aluno_id, conteudo, tarefa_casa, midias, xp_ganho, alunos!inner(nome, status), professores(nome), cursos(nome)')
            .eq('alunos.status', 'ativo')
            .order('data', { ascending: true });
        
        if (filterAlunoId) query = query.eq('aluno_id', filterAlunoId);

        const { data: aulas, error: errA } = await query;
        if (errA) {
            console.error(`Erro nas aulas do endpoint /api/agenda:`, errA);
            return;
        }

        console.log(`Sucesso! Aulas encontradas: ${aulas?.length || 0}`);
        if (aulas && aulas.length > 0) {
            console.log(`Primeira aula encontrada: ID=${aulas[0].id}, Data=${aulas[0].data}, Aluno=${(aulas[0].alunos as any)?.nome}, Status=${aulas[0].status}`);
        }
    } catch (err: any) {
        console.error(`Erro fatal no testAgendaEndpoint:`, err.message);
    }
}

async function run() {
    const emails = ['ta@ta.com', 'guilhermenunes0412@gmail.com'];
    for (const email of emails) {
        await testMeEndpoint(email);
        await testAgendaEndpoint(email);
    }
}

run();
