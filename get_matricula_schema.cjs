const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  global: { headers: { 'x-backend-secret': 'studio-acorde-secret-key-2024' } }
});
async function test() {
    const { data, error } = await supabase.from('matriculas').select('status').limit(1);
    console.log(data, error);
}
test();
