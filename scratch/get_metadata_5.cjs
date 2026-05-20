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
    '671af349-cba1-4f9a-affb-b8ddd6ea0cd9',
    'ee8fa7c9-91f6-4f9e-adf7-d1c3f4dccea0',
    '7a3a5453-59c2-4f1c-ad86-146aaa18af69',
    '2a484c91-7438-4562-af30-f6330989d8cf',
    '2a5cda7d-983d-4e87-b467-f4bce1e0f339'
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
