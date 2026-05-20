const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-backend-secret': 'studio-acorde-secret-key-2024'
    }
  }
});

async function check() {
    const { data: profs, error: errP } = await supabase.from('professores').select('*');
    if (errP) console.error('Erro professores:', errP);
    else console.log('Total professores:', profs.length, 'Exemplo professor:', profs[0]);

    const { data: users, error: errU } = await supabase.from('usuarios').select('*');
    if (errU) console.error('Erro usuarios:', errU);
    else console.log('Total usuarios:', users.length, 'Exemplo usuário:', users[0]);
}

check();
