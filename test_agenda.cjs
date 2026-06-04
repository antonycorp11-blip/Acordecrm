require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { 'x-backend-secret': 'studio-acorde-secret-key-2024' } }
});

async function check() {
  const { data: aluno } = await supabase.from('alunos').select('*').limit(1).single();
  let query = supabase.from('aulas')
                .select('id, data, horario, status, professor_id, aluno_id, conteudo, tarefa_casa, midias, xp_ganho, alunos(nome, status), professores(nome), cursos(nome)')
                .eq('aluno_id', aluno.id)
                .order('data', { ascending: true });
  
  const { data, error } = await query;
  console.log("Error aulas:", error);
  console.log("Aulas:", data ? data.length : 0);
  
  // Test progresso
  const { data: prog, error: progErr } = await supabase.from('gamificacao_progresso').select('*, conquista:conquista_id(*)').eq('aluno_id', aluno.id);
  console.log("Progresso err:", progErr);
  console.log("Progresso:", prog ? prog.length : 0);
}
check();
