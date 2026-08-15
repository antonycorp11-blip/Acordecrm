import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';

const env = loadEnv('development', process.cwd(), '');
const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: profs, error } = await supabase.from('professores').select('*');
  if (error) console.error(error);
  
  const gilmar = profs.find(p => p.email && p.email.includes('gilmar'));
  console.log("Gilmar:", gilmar);
  
  const byName = profs.find(p => p.nome && p.nome.toLowerCase().includes('gilmar'));
  console.log("Gilmar by name:", byName);
}

run();
