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
    'fa4ffb37-1c58-4856-849f-a12ac89324b9',
    'a11f0b18-add4-4086-a6bd-69163f606816',
    'fb4ad074-027a-4103-ad8e-7df927ecf694',
    '4e83eda9-dfa2-4d4c-bcf1-6af149817fea',
    'bb553323-9aaf-4025-9334-2d5fa68949fb'
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
