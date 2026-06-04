require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  // Since we don't have the SUPABASE_SERVICE_ROLE_KEY here or easy DDL access,
  // we might not be able to execute raw SQL easily. 
  // Let's try to query the table first to see if columns exist.
  const { data, error } = await supabase.from('professores').select('instrumentos, disponibilidade').limit(1);
  if (error) {
    console.log("Error querying columns:", error.message);
  } else {
    console.log("Columns exist!");
  }
}
run();
