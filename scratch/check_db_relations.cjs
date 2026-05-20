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
  const { data: pacotes } = await supabase.from('pacotes').select('*');
  console.log("=== PACOTES ===");
  console.log(pacotes);

  const { data: professores } = await supabase.from('professores').select('*');
  console.log("\n=== PROFESSORES ===");
  console.log(professores);
}

main();
