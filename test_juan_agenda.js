import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: prof } = await supabase.from('professores').select('id').ilike('nome', '%juan%').single();
  if(!prof) { console.log('Juan not found'); return; }
  
  const start = '2026-06-01';
  const end = '2026-06-30';
  const filterProfId = prof.id;
  
  let query = supabase.from('aulas')
      .select('id, data, horario, status, professor_id, aluno_id, conteudo, tarefa_casa, midias, xp_ganho, alunos(nome, status), professores(nome), cursos(nome), matriculas(status)')
      .order('data', { ascending: true })
      .gte('data', start)
      .lte('data', end)
      .eq('professor_id', filterProfId);
      
  const { data: rawAulas, error: errA } = await query;
  if (errA) console.log(errA);
  
  const aulas = (rawAulas || []).filter((a) => {
      const aluno = Array.isArray(a.alunos) ? a.alunos[0] : a.alunos;
      const matricula = Array.isArray(a.matriculas) ? a.matriculas[0] : a.matriculas;
      const isAlunoArquivado = aluno && aluno.status === 'arquivado';
      const isMatriculaArquivada = matricula && matricula.status === 'arquivada';
      return !isAlunoArquivado && !isMatriculaArquivada;
  });
  console.log(`Aulas Juan in June: ${aulas.length}`);
  if (aulas.length > 0) {
     console.log(aulas.map(a => a.status).join(', '));
  }
}
run();
