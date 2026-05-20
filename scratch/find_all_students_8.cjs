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
  const names = [
    'Ricardo Gabriel De Assuncao',
    'Robson Solles Mendes',
    'Rodrigo Souza Pinto',
    'Samara Cristina Da Mota Silva',
    'Sofya Andrade De Souza'
  ];

  for (const n of names) {
    const { data, error } = await supabase
      .from('migracao_alunos')
      .select('id, nome, status')
      .ilike('nome', `%${n}%`);
    
    if (error) {
      console.error(error);
    } else {
      console.log(`Para a busca "${n}":`, data);
    }
  }
}

main();
