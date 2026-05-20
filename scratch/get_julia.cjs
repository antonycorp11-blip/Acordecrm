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
    .select('*')
    .eq('id', '40bb10e0-aa5f-4fa1-9e07-a11de442cd71')
    .single();

  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

main();
