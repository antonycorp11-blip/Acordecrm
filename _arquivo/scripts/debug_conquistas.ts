import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: c1, error: e1 } = await supabase.from('gamificacao_conquistas').select('*');
    console.log("gamificacao_conquistas:", c1?.length, e1?.message);
    
    const { data: c2, error: e2 } = await supabase.from('conquistas').select('*');
    console.log("conquistas:", c2?.length, e2?.message);
}

check();
