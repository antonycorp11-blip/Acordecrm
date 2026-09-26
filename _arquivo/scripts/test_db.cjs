require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: alunos, error } = await supabase.from('alunos').select('id, nome, matriculas(id, status)');
  console.log(alunos ? alunos.length : 0);
  if(alunos && alunos.length > 0) {
    console.log(alunos[0]);
  }
}
run();
