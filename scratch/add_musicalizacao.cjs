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
    .from('cursos')
    .insert([{ id: 8, nome: 'Musicalização Infantil' }])
    .select();

  if (error) {
    console.error("Erro ao inserir curso de Musicalização:", error);
  } else {
    console.log("Curso de Musicalização Infantil criado com sucesso!", data);
  }
}

main();
