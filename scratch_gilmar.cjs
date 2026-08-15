const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: profs, error } = await supabase.from('professores').select('*');
  if (error) console.error(error);
  
  const gilmar = profs.find(p => p.email && p.email.includes('gilmar'));
  console.log("Gilmar by email contains 'gilmar':", gilmar);
  
  const byName = profs.find(p => p.nome && p.nome.toLowerCase().includes('gilmar'));
  console.log("Gilmar by name contains 'gilmar':", byName);
}

run();
