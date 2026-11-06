const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    // try to bypass RLS by looking at how api/index.ts does it
    // Wait, in api/index.ts it just queries `professores` directly.
    const { data } = await supabase.from('professores').select('id, email, role');
    console.log(data);
}
check();
