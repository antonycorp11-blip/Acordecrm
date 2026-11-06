require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { 'x-backend-secret': 'studio-acorde-secret-key-2024' } }
});

async function check() {
  const { data, error } = await supabase.from('alunos').select('email');
  const emails = data.map(d => d.email).filter(e => e);
  const duplicates = emails.filter((e, i, a) => a.indexOf(e) !== i);
  console.log("Duplicate emails:", [...new Set(duplicates)]);
}
check();
