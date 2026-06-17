require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log("Checking tables...");
    const { data, error } = await supabase.from('alunos').select('*').limit(1);
    console.log(error ? error : "Success.");
}
run();
