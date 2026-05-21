import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Adiciona o header de bypass RLS
const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
        headers: {
            'x-backend-secret': 'studio-acorde-secret-key-2024'
        }
    }
});

async function run() {
    console.log('--- Buscando Alunos com nome contendo "Guilherme" ou "Jadna" ---');
    const { data: alunos, error: errAlunos } = await supabase
        .from('alunos')
        .select('*');
        
    if (errAlunos) {
        console.error('Erro ao buscar alunos:', errAlunos);
        return;
    }
    
    const filtered = alunos.filter((a: any) => 
        (a.nome && a.nome.toLowerCase().includes('guilherme')) || 
        (a.nome && a.nome.toLowerCase().includes('jadna'))
    );
    
    console.log(`Encontrados ${filtered.length} alunos:`);
    for (const aluno of filtered) {
        console.log(`\nID: ${aluno.id} | Nome: ${aluno.nome} | Email: ${aluno.email} | Status: ${aluno.status}`);
        
        // Matriculas
        const { data: matriculas } = await supabase
            .from('matriculas')
            .select('*')
            .eq('aluno_id', aluno.id);
            
        console.log(`Matrículas (${matriculas?.length || 0}):`);
        matriculas?.forEach((m: any) => {
            console.log(`  - ID: ${m.id} | Curso: ${m.curso_id} | Status: ${m.status} | Dia Semana: ${m.dia_semana} | Horário: ${m.horario}`);
        });
        
        // Aulas
        const { data: aulas } = await supabase
            .from('aulas')
            .select('id, data, horario, status, professor_id')
            .eq('aluno_id', aluno.id);
            
        console.log(`Aulas Agendadas (${aulas?.length || 0}):`);
        aulas?.forEach((a: any) => {
            console.log(`  - Aula ID: ${a.id} | Data: ${a.data} | Horário: ${a.horario} | Status: ${a.status}`);
        });
    }
}

run();
