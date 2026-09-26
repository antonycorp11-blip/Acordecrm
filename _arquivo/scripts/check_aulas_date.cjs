require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-backend-secret': 'studio-acorde-secret-key-2024'
    }
  }
});

async function check() {
  const { data, error } = await supabase.from('aulas').select('data, status, professor_id').order('data', { ascending: false }).limit(5);
  console.log('Recent aulas:', data);
}
check();
