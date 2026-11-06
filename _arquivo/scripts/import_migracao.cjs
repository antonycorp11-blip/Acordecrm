const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function importMigracao() {
    console.log('Atualizando Sala de Espera com lógica Aluno/Responsável...');
    
    const workbook = xlsx.readFile('relatorio_exportado (20).xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(worksheet);

    const students = rows.map(row => {
        const nome = row['Aluno(a)'] || row['Nome'] || '';
        const telefone = row['Telefones'] || row['Contatos'] || '';
        const responsavel = row['Responsável'] || '';
        const nascimento = row['Data de Nascimento'] || '';
        const endereco = row['Endereço Completo'] || '';
        const mensalidade = row['Mensalidades'] || '';
        
        const isMinor = responsavel && responsavel !== nome;

        return {
            nome: nome,
            email: '', // Não encontrado campo claro de email
            telefone: isMinor ? '' : telefone, // Telefone vai pro resp se for menor
            endereco: isMinor ? '' : endereco.replace(/\n/g, ' ').trim(),
            data_nascimento: nascimento,
            responsavel_nome: isMinor ? responsavel : '',
            responsavel_telefone: isMinor ? telefone : '',
            responsavel_cpf: '', // Não encontrado na planilha
            dados_originais: row,
            status: 'pendente'
        };
    }).filter(s => s.nome && s.nome !== 'Aluno(a)');

    // Limpar anteriores para não duplicar com a nova lógica
    await supabase.from('migracao_alunos').delete().eq('status', 'pendente');

    const { error } = await supabase.from('migracao_alunos').insert(students);

    if (error) {
        console.error('Erro ao importar:', error);
    } else {
        console.log(`Sucesso! ${students.length} alunos reorganizados na Sala de Espera.`);
    }
}

importMigracao();
