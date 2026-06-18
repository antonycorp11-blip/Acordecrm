import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data: profs } = await supabase.from('professores').select('id, nome');
  const prof = profs.find(p => p.nome.toLowerCase().includes('juan'));
  if(!prof) { console.log('Juan not found'); return; }
  console.log(`Found Juan: ID = ${prof.id}`);

  // remuneracao logic
  const { data: aulasRemun } = await supabase.from('aulas')
      .select('professor_id, status, professor:professores(nome)')
      .gte('data', '2026-06-01')
      .lte('data', '2026-06-30')
      .in('status', ['realizada', 'falta_aluno']);
  
  const juanRemun = aulasRemun.filter(a => a.professor_id === prof.id);
  console.log(`Remuneracao found ${juanRemun.length} classes for Juan.`);

  // agenda logic
  let query = supabase.from('aulas')
      .select('id, data, horario, status, professor_id, aluno_id, conteudo, tarefa_casa, midias, xp_ganho, alunos(nome, status), professores(nome), cursos(nome), matriculas(status)')
      .order('data', { ascending: true })
      .gte('data', '2026-06-01')
      .lte('data', '2026-06-30')
      .eq('professor_id', prof.id);

  const { data: rawAulas, error: errA } = await query;
  console.log(`Agenda rawAulas length: ${rawAulas ? rawAulas.length : 'null'}`);
  
  if (errA) console.log(errA);

  const aulas = (rawAulas || []).filter((a) => {
      const aluno = Array.isArray(a.alunos) ? a.alunos[0] : a.alunos;
      const matricula = Array.isArray(a.matriculas) ? a.matriculas[0] : a.matriculas;
      const isAlunoArquivado = aluno && aluno.status === 'arquivado';
      const isMatriculaArquivada = matricula && matricula.status === 'arquivada';
      return !isAlunoArquivado && !isMatriculaArquivada;
  });
  console.log(`Agenda filtered aulas length: ${aulas.length}`);
}
run();
