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
  const ids = [
    'c16d88f9-9185-4a82-ae80-33bba1295db0',
    '25c1e662-fcc4-46b2-a574-d5ca7ef3e123',
    'e956e390-a360-42ea-ba51-327293eecf27',
    'faa5e579-7f7f-4e73-8f2b-196dff40050e',
    'f7ccf1b0-cf36-4668-a16d-7b56d6c84a88'
  ];

  const { data, error } = await supabase
    .from('migracao_alunos')
    .select('*')
    .in('id', ids);

  if (error) {
    console.error(error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

main();
