require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const activeStudents = [
    "ACSA LORENA EVANGELISTA SANTIAGO",
    "ADRIANE MARIA DE OLIVEIRA BRITO",
    "ANA JULIA MONTEIRO KLEIN",
    "ANA THERESA LIMA PORTELA",
    "ANNA BEATRIZ AJALA MORAES",
    "ANNA SOFIA RAMIRES FERREIRA SAMPAIO",
    "ARTENISA QUELEM NASCIMENTO",
    "ARTHUR CARVALHO ALVES",
    "ARTHUR GATZKE KOHLER DE MELO",
    "ATAIDE CELESTINO RAMOS DOS SANTOS",
    "BENJAMIN KALEB BARBOSA OLIVEIRA",
    "BRENDA RAILLA GAMA DOS SANTOS",
    "BRUNA GAMA DOS SANTOS",
    "CARLOS JUNIOR RONDON LOITERO",
    "DAVI MIGUEL GOMES DE BRITO",
    "DOMILLYCK ALEXANDRE GONCALVES DA SILVA",
    "EDUARDO ANTONIO",
    "EDVANIA PEREIRA MATOS DA SILVA",
    "ELIAS SAMUEL CANDIDO DE SOUZA",
    "ELOIZA MARIA ALVES RAMOS",
    "ENZO GABRIEL NERY MARQUES",
    "ENZO RAFAEL OLVEIRA DA SILVA",
    "ERICA MILENA DA SILVA",
    "GUILHERME NUNES BARBOSA",
    "GUSTAVO ARRUDA DA SILVA",
    "HEITOR SONAQUE DE SOUZA",
    "HELOISA LIMA ESTEVAO",
    "JADNA DA SILVA LIMA",
    "JOÃO HENRIQUE SOUZA MAGALHÃES",
    "JOSYANNE BARROS GONZAGA MARIO",
    "JULIA SOUZA COELHO",
    "KALEBE LUCAS CARVALHO SILVA",
    "KAMILA SHAORY RAFAELA CARVALHO",
    "KEMILY DE FARIAS OLIVEIRA",
    "LARA CAVALCANTE SILVA",
    "LUANY STEPHANY DE JESUS PORFIRIO GUIMARAES",
    "LUCAS BELATO",
    "LUCENE DE JESUS DA SILVA DO NASCIMENTO",
    "LUIS GUSTAVO DA SILVA RIBEIRO",
    "MARIA CLARA SOUZA COSTA",
    "MATHEUS HENRIQUE DA SILVA PININGA DE SOUZA",
    "MATHEUS NASCIMENTO DA CRUZ",
    "MAXUEL HENRIQUE DE PAULA CAMPOS",
    "NATHALI LIMA",
    "PIETRO JORGE DE ALMEIDA",
    "RAFAELA MARQUES",
    "RAISSA FERNANDA CASTRO DE LARA",
    "REBECA MIKAELI DE CARVALHO BOTONI",
    "RICARDO GABRIEL DE ASSUNCAO",
    "RODRIGO SOUZA PINTO",
    "SAMARA CRISTINA DA MOTA SILVA",
    "SOFYA ANDRADE DE SOUZA",
    "SULISMAIK DE SOUZA",
    "THAYLA MAYSA SILVA DO NASCIMENTO",
    "THEO ANDRADE DE SOUZA",
    "VITOR OLIVEIRA",
    "WANESSA MIRANDA",
    "WILSON FERREIRA DINIZ NETO"
];

// Normalize a string for comparison (remove accents, to lowercase, trim extra spaces)
function normalizeName(name) {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, ' ');
}

const normalizedActiveStudents = activeStudents.map(normalizeName);

async function cleanupStudents() {
    try {
        console.log('Buscando todos os alunos locais...');
        const { data: alunosLocais, error: fetchError } = await supabase.from('alunos').select('*');
        if (fetchError) throw fetchError;

        console.log(`Encontrados ${alunosLocais.length} alunos no banco de dados local.`);

        const toDelete = [];
        const toKeep = [];

        for (const aluno of alunosLocais) {
            const normLocalName = normalizeName(aluno.nome);
            if (normalizedActiveStudents.includes(normLocalName)) {
                toKeep.push(aluno.nome);
            } else {
                toDelete.push(aluno);
            }
        }

        console.log(`\nAlunos a manter (${toKeep.length}):`);
        // console.log(toKeep);
        
        console.log(`\nAlunos a EXCLUIR (${toDelete.length}):`);
        toDelete.forEach(a => console.log(`- ${a.nome}`));

        if (toDelete.length > 0) {
            console.log('\nIniciando arquivamento dos alunos sobressalentes...');
            const idsToDelete = toDelete.map(a => a.id);
            
            // Arquivar alunos em vez de excluir
            const { error: updError } = await supabase.from('alunos').update({ status: 'arquivado' }).in('id', idsToDelete);
            if (updError) throw updError;

            console.log(`Sucesso: ${toDelete.length} alunos foram movidos para Arquivados.`);
        } else {
            console.log('\nNenhum aluno sobressalente encontrado para arquivar. Tudo limpo!');
        }

    } catch (e) {
        console.error('Erro durante a limpeza:', e);
    }
}

cleanupStudents();
