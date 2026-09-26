require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('system_config').select('*').eq('key_name', 'GOOGLE_CREDENTIALS').maybeSingle();
  if (error) console.log('Error', error);
  else if (!data) console.log('GOOGLE_CREDENTIALS not found in DB!');
  else console.log('Found GOOGLE_CREDENTIALS length:', data.key_value?.length);
}
check();
