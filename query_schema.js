import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const p = await supabase.from('pagamentos').select('*').limit(1);
  console.log("pagamentos:", Object.keys(p.data[0] || {}));
  const m = await supabase.from('matriculas').select('*').limit(1);
  console.log("matriculas:", Object.keys(m.data[0] || {}));
}
run();
