require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  try {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('123', salt);
    const { data, error } = await supabase.from('usuarios').insert([{
      nome: 'Teste Local',
      email: 'teste@acorde.xyz',
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
