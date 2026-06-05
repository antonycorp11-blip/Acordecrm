const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://saojbwipdxebibjmtxqc.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY // Wait, I don't have the env var here. Let me use the JWT or just read the code again!
);
