const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    const { data, error } = await supabase.rpc('execute_sql', {
        query: "ALTER TABLE professores ADD COLUMN IF NOT EXISTS disponibilidade JSONB DEFAULT '[]'::jsonb;"
    });
    if (error) {
        // If we don't have execute_sql, maybe we can just create it using the postgres directly?
        // Wait, we can't run arbitrary SQL through supabase-js directly unless there's an RPC.
        console.log("No RPC execute_sql found. We might need to use node-postgres if we have connection string.");
    } else {
        console.log("Added column:", data);
    }
}
main();
