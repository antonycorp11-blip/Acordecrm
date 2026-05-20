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
  const { data: cursos } = await supabase.from('cursos').select('id, nome');
  const { data: professores } = await supabase.from('professores').select('id, nome');
  const { data: pacotes } = await supabase.from('pacotes').select('id, nome');

  console.log('--- CURSOS ---');
  console.log(cursos);
  console.log('--- PROFESSORES ---');
  console.log(professores);
  console.log('--- PACOTES ---');
  console.log(pacotes);
}

main();
