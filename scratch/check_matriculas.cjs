const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'x-backend-secret': 'studio-acorde-secret-key-2024'
    }
  }
});

async function main() {
  const { data, error } = await supabase
    .from('matriculas')
    .select('id, aluno_id, curso_id, professor_id, alunos(nome), cursos(nome)')
    .order('id', { ascending: false })
    .limit(10);
  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}

main();
