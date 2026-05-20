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
    '67985261-c006-42c1-bfa7-bf5a475cfba1',
    'e398444c-2b3d-4168-bbcf-f728b8d05f0a',
    '7335309c-ed9c-4a31-9d13-b1aa425be872',
    '1ccee614-b196-40c7-bc0b-4f0ba85eacdf',
    '05815454-f5f4-4bad-9c3f-8d34f040d9a9'
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
