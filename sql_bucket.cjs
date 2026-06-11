const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

// Wait, I can just use the VITE_SUPABASE_ANON_KEY to hit the GraphQL or REST API if it has permissions? No, SQL is best.
