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
    '4980d582-d5a1-49c1-88db-cbec6039a982',
    '32fa89e7-9dbd-45e7-a223-1ddafafe5396',
    'a4098b59-769d-4a13-9646-4621e4ba60d3',
    'ee698d63-b9ae-450c-8510-a2fdec091c34'
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
