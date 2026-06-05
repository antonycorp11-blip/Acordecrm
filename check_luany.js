import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: alunos, error: err1 } = await supabase.from('alunos').select('*').ilike('nome', '%luany%');
  console.log("Alunos:", alunos?.map(a => ({id: a.id, nome: a.nome})));
  if (!alunos || alunos.length === 0) return;
  
  const alunoId = alunos[0].id;
  const { data: aulas, error: err2 } = await supabase.from('aulas').select('*').eq('aluno_id', alunoId);
  console.log("Aulas da Luany:", aulas?.length);
  if (aulas && aulas.length > 0) {
      console.log("Exemplo de aula:", aulas[0]);
  }
}
check();
