require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const workbook = xlsx.readFile('relatorio_exportado (19).xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  // Convert to array of objects
  const rows = xlsx.utils.sheet_to_json(worksheet);

  console.log(`Encontradas ${rows.length} linhas.`);

  let insertedCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    const nome = row['Aluno(a)'];
    if (!nome || nome === 'Aluno(a)') continue; // Skip empty or header rows

    const data_nascimento_br = row['Data de Nascimento'] || row['Data de nascimento'];
    let data_nascimento = null;
    if (data_nascimento_br && typeof data_nascimento_br === 'string' && data_nascimento_br.includes('/')) {
        const parts = data_nascimento_br.split('/');
        if (parts.length === 3) {
            data_nascimento = `${parts[2]}-${parts[1]}-${parts[0]}`; // YYYY-MM-DD
        }
    }

    const emailRaw = row['Email do Aluno'] || row['Email do Responsável'] || row['Email'] || null;
    const email = (emailRaw && typeof emailRaw === 'string') ? emailRaw.split('\n')[0].trim() : null;

    const telefoneRaw = row['Telefones'] || row['Telefone'] || row['Contatos'] || null;
    const telefone = (telefoneRaw && typeof telefoneRaw === 'string') ? telefoneRaw.split('\n')[0].trim() : null;

    const responsavel_nome = row['Responsável'] || null;
    const enderecoRaw = row['Endereço Completo'] || row['Endereço'] || null;
    const endereco = (enderecoRaw && typeof enderecoRaw === 'string') ? enderecoRaw.replace(/\n/g, ', ').trim() : null;

    try {
      // Upsert based on name or just insert? The user said to import them. We'll insert and if email conflicts, we might get an error.
      // But since we just want to load data, we'll try to insert. If it fails, maybe ignore.
      
      // Let's check if student already exists by name
      const { data: existing } = await supabase.from('alunos').select('id').eq('nome', nome).maybeSingle();
      
      if (existing) {
         console.log(`Aluno(a) ${nome} já existe. Ignorando.`);
         continue;
      }

      const { error } = await supabase.from('alunos').insert([{
        nome,
        email: email || null,
        telefone: telefone || null,
        data_nascimento: data_nascimento,
        responsavel_nome: responsavel_nome,
        endereco: endereco,
        status: 'ativo'
      }]);

      if (error) {
        // If unique constraint on email fails, try without email
        if (error.code === '23505' && email) {
            const { error: error2 } = await supabase.from('alunos').insert([{
                nome,
                email: null,
                telefone: telefone || null,
                data_nascimento: data_nascimento,
                responsavel_nome: responsavel_nome,
                endereco: endereco,
                status: 'ativo'
              }]);
              if (error2) {
                  console.error(`Erro ao inserir ${nome} sem email:`, error2.message);
                  errorCount++;
              } else {
                  insertedCount++;
              }
        } else {
            console.error(`Erro ao inserir ${nome}:`, error.message);
            errorCount++;
        }
      } else {
        insertedCount++;
      }
    } catch (err) {
      console.error(`Erro na linha do aluno ${nome}:`, err);
      errorCount++;
    }
  }

  console.log(`\nImportação concluída. Inseridos: ${insertedCount}. Erros: ${errorCount}.`);
}

run();
