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
    .select('curso_id, cursos(nome)');
  if (error) {
    console.error(error);
  } else {
    const counts = {};
    for (const m of data) {
      const name = m.cursos ? m.cursos.nome : 'Sem curso';
      counts[m.curso_id] = name;
    }
    console.log(counts);
  }
}

main();
