require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fix() {
  try {
    const creds = fs.readFileSync('google-credentials.json', 'utf8');
    
    // Check if key exists
    const { data: existing } = await supabase.from('system_config').select('id').eq('key_name', 'GOOGLE_CREDENTIALS').maybeSingle();
    
    if (existing) {
        const { error } = await supabase.from('system_config').update({ key_value: creds }).eq('id', existing.id);
        if (error) throw error;
        console.log('Updated existing GOOGLE_CREDENTIALS in DB');
    } else {
        const { error } = await supabase.from('system_config').insert({ key_name: 'GOOGLE_CREDENTIALS', key_value: creds });
        if (error) {
            // Table might not exist or schema differs. 
            throw error;
        }
        console.log('Inserted GOOGLE_CREDENTIALS into DB');
    }
  } catch(e) {
    console.error('Failed to fix creds:', e.message);
  }
}
fix();
