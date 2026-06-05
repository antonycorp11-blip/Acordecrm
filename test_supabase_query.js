import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '/Users/aquillesantonysantiagosantos/Downloads/acorde-crm/.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('aulas').select('id').limit(1);
  console.log('Data length:', data?.length);
}
test();
