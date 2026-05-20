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
    'd644a088-542e-41e1-b143-37d1dc198e9e',
    '6aa78d2b-9a42-45f0-b0c2-dcdb131aa01a',
    '4dbb2232-6a9c-4711-bbfb-877ff2d75a51',
    '10841a70-039b-4199-a217-845155718959',
    'f87de132-89ff-4747-8f1b-d6652528933d'
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
