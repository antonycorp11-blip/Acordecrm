require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data, error } = await supabase
        .from('pagamentos')
        .select('*')
        .limit(3);
    
    console.log(JSON.stringify(data, null, 2));
    console.log("Error:", error);
}
run();
