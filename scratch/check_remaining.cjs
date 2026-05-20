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
    .from('migracao_alunos')
    .select('id, nome, status')
    .eq('status', 'pendente');

  if (error) {
    console.error(error);
  } else {
    console.log("Alunos com status 'pendente' restantes:", data.length);
    console.log(data);
  }
}

main();
