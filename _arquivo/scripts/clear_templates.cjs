require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function clear() {
  const { error } = await supabase.from('contrato_templates').delete().neq('id', 0);
  if (error) console.error(error);
  else console.log('Templates cleared');
}
clear();
