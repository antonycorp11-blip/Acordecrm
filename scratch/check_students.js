import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'x-backend-secret': 'studio-acorde-secret-key-2024'
    }
  }
});

async function listAllStudentsFinanceiro() {
  const { data: alunos, error: errA } = await supabase.from('alunos').select('id, nome');
  if (errA) {
    console.error(errA);
    return;
  }

  console.log('--- RELATÓRIO FINANCEIRO DE TODOS OS ALUNOS ---');
  for (const a of alunos) {
    const { data: faturas } = await supabase.from('pagamentos').select('status').eq('aluno_id', a.id);
    const total = faturas ? faturas.length : 0;
    const pagas = faturas ? faturas.filter(f => f.status === 'pago').length : 0;
    const pendentes = total - pagas;
    
    // Obter total_parcelas da matrícula
    const { data: matriculas } = await supabase.from('matriculas').select('total_parcelas').eq('aluno_id', a.id).eq('status', 'ativa');
    const totalContrato = matriculas && matriculas.length > 0 ? matriculas[0].total_parcelas : 'N/A';

    console.log(`- Aluno: ${a.nome} (ID: ${a.id}) | Contrato: ${totalContrato} parcelas | Faturas no Banco: ${total} (Pagas: ${pagas}, Restantes/Pendentes: ${pendentes})`);
  }
}

listAllStudentsFinanceiro();
