const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
    const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/alunos?limit=1`, {
        headers: {
            'apikey': process.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
        }
    });
    console.log(await res.json());
}
test();
