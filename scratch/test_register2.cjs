require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const JWT_SECRET = process.env.JWT_SECRET || 'studio-acorde-secret-key-2024';
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-backend-secret': JWT_SECRET
    }
  }
});

async function test() {
  try {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('123', salt);
    const { data, error } = await supabase.from('usuarios').insert([{
      nome: 'Teste Local 2',
      email: 'teste2@acorde.xyz',
      senha: hashedPassword,
      role: 'admin'
    }]).select().single();
    
    if (error) {
      console.error('ERROR:', error);
    } else {
      console.log('SUCCESS:', data);
    }
  } catch (e) {
    console.error('EXCEPTION:', e);
  }
}
test();
