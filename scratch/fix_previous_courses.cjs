const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  global: {
    headers: {
      'x-backend-secret': 'studio-acorde-secret-key-2024'
    }
  }
});

async function main() {
  // 1. João Henrique Souza Magalhães (aluno_id: 4188, matricula_id: 36) -> Guitarra (curso_id: 2)
  console.log("Corrigindo curso do João Henrique...");
  const { error: errJH1 } = await supabase.from('matriculas').update({ curso_id: 2 }).eq('id', 36);
  const { error: errJH2 } = await supabase.from('aulas').update({ curso_id: 2 }).eq('matricula_id', 36);
  if (errJH1 || errJH2) console.error("Erro João Henrique:", errJH1, errJH2);
  else console.log("João Henrique corrigido!");

  // 2. Kemily De Farias Oliveira (aluno_id: 4192, matricula_id: 40) -> Violão (curso_id: 1)
  console.log("Corrigindo curso de Kemily...");
  const { error: errK1 } = await supabase.from('matriculas').update({ curso_id: 1 }).eq('id', 40);
  const { error: errK2 } = await supabase.from('aulas').update({ curso_id: 1 }).eq('matricula_id', 40);
  if (errK1 || errK2) console.error("Erro Kemily:", errK1, errK2);
  else console.log("Kemily corrigida!");

  // 3. Kamila Shaory Rafaela Carvalho (aluno_id: 4191, matricula_id: 39) -> Baixo (curso_id: 6)
  console.log("Corrigindo curso de Kamila...");
  const { error: errKS1 } = await supabase.from('matriculas').update({ curso_id: 6 }).eq('id', 39);
  const { error: errKS2 } = await supabase.from('aulas').update({ curso_id: 6 }).eq('matricula_id', 39);
  if (errKS1 || errKS2) console.error("Erro Kamila:", errKS1, errKS2);
  else console.log("Kamila corrigida!");
}

main();
