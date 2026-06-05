const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://saojbwipdxebibjmtxqc.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || require('./google-credentials.json').SUPABASE_KEY // I don't have it.
);
