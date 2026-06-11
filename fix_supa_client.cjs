const fs = require('fs');

let code = fs.readFileSync('src/pages/AreaAluno.tsx', 'utf8');

const regex = /import \{ createClient \} from '@supabase\/supabase-js';/;
const replacement = `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);`;

if (code.match(regex)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/pages/AreaAluno.tsx', code);
    console.log("Supabase client initialized.");
} else {
    console.log("Regex not matched!");
}

