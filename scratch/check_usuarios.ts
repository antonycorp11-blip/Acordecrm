import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
        headers: {
            'x-backend-secret': 'studio-acorde-secret-key-2024'
        }
    }
});

async function run() {
    console.log('--- LISTAGEM DE USUÁRIOS NO SUPABASE ---');
    const { data: usuarios, error: errU } = await supabase
        .from('usuarios')
        .select('*');
        
    if (errU) {
        console.error('Erro ao buscar usuários:', errU);
        return;
    }
    
    console.log(`Total de usuários cadastrados: ${usuarios?.length || 0}`);
    usuarios?.forEach((u: any) => {
        console.log(`ID: ${u.id} | Nome: ${u.nome} | Email: ${u.email} | Role: ${u.role}`);
    });
}

run();
