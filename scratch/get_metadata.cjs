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
    'f85a282f-9a99-4a5c-a560-20b9917f8a2a',
    '5e3636af-25f8-476c-8191-85d9ae90ec05',
    'c75bcb59-3b56-4141-b7c2-0b10afc96071',
    'ef3fb806-3d61-4fa6-bd69-1eef0893e148',
    '5149edae-7ce3-4c8b-820c-da8b4f935b72'
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
