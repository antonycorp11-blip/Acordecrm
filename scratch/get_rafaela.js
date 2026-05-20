import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'x-backend-secret': 'studio-acorde-secret-key-2024'
    }
  }
});

async function run() {
  const { data: alunos, error } = await supabase
    .from('alunos')
    .select('*, matriculas(*, cursos(*))')
    .eq('id', 4206);

  if (error) {
    console.error(error);
    return;
  }

  console.log(JSON.stringify(alunos, null, 2));
}

run();
