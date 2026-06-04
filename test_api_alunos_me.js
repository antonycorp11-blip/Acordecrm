import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

async function test() {
    const searchEmail = 'teste@teste.com';
    const { data: aluno, error } = await supabase
        .from('alunos')
        .select('*, matriculas(*, cursos(nome))')
        .ilike('email', searchEmail)
        .single();
    
    if (error || !aluno) {
        console.error("Aluno error:", error);
        return;
    }

    const { data: allAlunos, error: errAll } = await supabase.from('alunos').select('id, xp');
    if(errAll) console.error("allAlunos error:", errAll);

    const { data: progresso, error: errProg } = await supabase.from('gamificacao_progresso').select('*, conquista:conquista_id(*)');
    if(errProg) console.error("progresso error:", errProg);
    
    const rankingList = (allAlunos || []).map(al => {
        const prog = progresso?.filter(p => p.aluno_id === al.id) || [];
        const xpCalculado = prog.reduce((acc, p) => acc + (p.conquista?.pontos || 0), 0);
        return { id: al.id, xp: (al.xp || 0) + xpCalculado };
    }).sort((a, b) => b.xp - a.xp);

    console.log("Success! Ranking list length:", rankingList.length);
}
test();
