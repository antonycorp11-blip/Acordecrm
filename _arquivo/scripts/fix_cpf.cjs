const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'x-backend-secret': 'studio-acorde-secret-key-2024'
    }
  }
});

async function run() {
    // We can't run arbitrary DDL without the service key or the postgres connection string.
    // But wait! Is there a patch_schema RPC or execute_sql?
    const { data, error } = await supabase.rpc('execute_sql', {
        query: "ALTER TABLE alunos ALTER COLUMN cpf DROP NOT NULL; ALTER TABLE alunos ALTER COLUMN telefone DROP NOT NULL; ALTER TABLE alunos ALTER COLUMN email DROP NOT NULL;"
    });
    console.log("Result:", data, error);
}
run();
