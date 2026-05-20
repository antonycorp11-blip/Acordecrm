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
  const { data, error } = await supabase
    .from('professores')
    .insert([{ id: 18, nome: 'Emilly Gabriele Alves Moraes' }])
    .select();

  if (error) {
    console.error("Erro ao inserir professora Emilly:", error);
  } else {
    console.log("Professora Emilly inserida com sucesso!", data);
  }
}

main();
