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
    '06ef119c-1f07-483d-a350-47d8c9c7ef9a',
    '6ed548c2-2be8-4ecf-a4d1-6763664353d4',
    'a5df8657-790f-4040-9e3c-cb68e888fd02',
    'b738def8-a932-426a-a72d-c9a2009cabce',
    '3e7cf43d-97f8-4a1e-8b3b-238de35155d2'
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
