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
    'b1b40d8f-bfbd-42e6-9f50-9c228fb8929c',
    '40bb10e0-aa5f-4fa1-9e07-a11de442cd71',
    '533963d5-fc5e-4a78-aa04-4e3995850ef9',
    '0ddda4b0-0c90-4dee-9c18-5728a741d588',
    'cf0ab31a-f313-4a31-b87e-ba5692eaaec1'
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
