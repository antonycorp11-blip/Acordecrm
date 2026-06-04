const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const cpfData = `
SULISMAIK DE SOUZA — CPF: 033.737.921-18
ANNA BEATRIZ AJALA MORAES — CPF: 016.756.221-59
LUCAS BELATO — CPF: 503.186.401-04
DOUGLAS ANTONIO ALMEIDA PEREIRA — CPF: 046.960.321-67
ELLEN DAYANE OLIVEIRA ALVES — CPF: 053.381.961-07
ELIEZER DAVID — CPF: 708.220.302-09
JOÃO HENRIQUE SOUZA MAGALHÃES — CPF: 042.306.171-27
ERICA MILENA DA SILVA — CPF: 072.659.881-08
VITOR OLIVEIRA — CPF: 571.988.961-20
MARIA CLARA SOUZA COSTA — CPF: 053.654.771-89
LARA CAVALCANTE SILVA — CPF: 046.404.811-79
DAVI MIGUEL GOMES DE BRITO — CPF: 057.486.541-13
KEMILY DE FARIAS OLIVEIRA — CPF: 838.450.461-04
HEITOR SONAQUE DE SOUZA — CPF: 035.002.891-50
KAMILA SHAORY RAFAELA CARVALHO — CPF: 004.019.751-42
ENZO GABRIEL NERY MARQUES — CPF: 032.704.181-16
RICARDO GABRIEL DE ASSUNCAO — CPF: 075.797.221-78
LUIS GUSTAVO DA SILVA RIBEIRO — CPF: 022.031.821-21
GUSTAVO ARRUDA DA SILVA — CPF: 061.291.551-40
ATAIDE CELESTINO RAMOS DOS SANTOS — CPF: 567.447.901-10
RODRIGO SOUZA PINTO — CPF: 320.951.708-81
JADNA DA SILVA LIMA — CPF: 818.585.581-15
ARTHUR GATZKE KOHLER DE MELO — CPF: 029.713.271-75
ISAAC GONZAGA MARIO — CPF: 022.776.051-40
LUANY STEPHANY DE JESUS PORFIRIO GUIMARAES — CPF: 066.858.991-40
KALEBE LUCAS CARVALHO SILVA — CPF: 015.941.721-02
RAISSA FERNANDA CASTRO DE LARA — CPF: 062.625.401-99
ENZO RAFAEL OLVEIRA DA SILVA — CPF: 035.809.011-33
MATHEUS HENRIQUE DA SILVA PININGA DE SOUZA — CPF: 869.731.691-04
ACSA LORENA EVANGELISTA SANTIAGO — CPF: 004.447.651-58
SAMARA CRISTINA DA MOTA SILVA — CPF: 054.015.591-86
GUILHERME NUNES BARBOSA — CPF: 013.654.171-23
ANA JULIA MONTEIRO KLEIN — CPF: 878.955.441-87
EDUARDO ANTONIO — CPF: 097.811.591-03
RAFAELA MARQUES — CPF: 696.900.221-72
ARTHUR CARVALHO ALVES — CPF: 972.655.941-34
THEO ANDRADE DE SOUZA — CPF: 015.458.881-40
SOFYA ANDRADE DE SOUZA — CPF: 015.458.881-40
PIETRO JORGE DE ALMEIDA — CPF: 040.247.191-14
CARLOS JUNIOR RONDON LOITERO — CPF: 070.974.061-19
MAXUEL HENRIQUE DE PAULA CAMPOS — CPF: 049.320.071-16
WANESSA MIRANDA — CPF: 038.404.001-20
WILSON FERREIRA DINIZ NETO — CPF: 621.709.371-53
ARTENISA QUELEM NASCIMENTO — CPF: 966.277.431-91
ADRIANE MARIA DE OLIVEIRA BRITO — CPF: 063.022.321-12
DOMILLYCK ALEXANDRE GONCALVES DA SILVA — CPF: 057.224.131-35
EDVANIA PEREIRA MATOS DA SILVA — CPF: 070.338.031-17
MATHEUS NASCIMENTO DA CRUZ — CNPJ: 16.513.398/0001-08
BRENDA RAILLA GAMA DOS SANTOS — CNPJ: 16.513.398/0001-08
BRUNA GAMA DOS SANTOS — CNPJ: 16.513.398/0001-08
ELIAS SAMUEL CANDIDO DE SOUZA — CNPJ: 16.513.398/0001-08
ROBSON SOLLES MENDES — CPF: 006.961.061-40
BENJAMIN KALEB BARBOSA OLIVEIRA — CPF: 029.778.641-56
REBECA MIKAELI DE CARVALHO BOTONI — CPF: 044.711.291-04
AQUILLES ANTONY SANTIAGO SANTOS — CNPJ: 01.923.028/0001-63
LUCENE DE JESUS DA SILVA DO NASCIMENTO — CPF: 831.104.291-87
THAYLA MAYSA SILVA DO NASCIMENTO — CPF: 831.104.291-87
ANNA SOFIA RAMIRES FERREIRA SAMPAIO — CPF: 040.154.151-75
ELOIZA MARIA ALVES RAMOS — CPF: 018.708.571-43
`;

async function updateAllCpfs() {
    console.log('Iniciando atualização de CPFs...');
    
    const lines = cpfData.trim().split('\n');
    for (const line of lines) {
        const parts = line.split(' — ');
        const name = parts[0].trim();
        const docPart = parts[1] || '';
        const doc = docPart.split(': ')[1] || '';

        console.log(`Processando: ${name}...`);

        // 1. Atualizar na Sala de Espera
        const { data: migracao } = await supabase.from('migracao_alunos').select('*').ilike('nome', `%${name}%`).eq('status', 'pendente');
        if (migracao && migracao.length > 0) {
            for (const item of migracao) {
                const isMinor = item.responsavel_nome && item.responsavel_nome !== item.nome;
                const update = isMinor ? { responsavel_cpf: doc } : { cpf: doc };
                await supabase.from('migracao_alunos').update(update).eq('id', item.id);
            }
        }

        // 2. Atualizar nos Alunos já matriculados
        const { data: alunos } = await supabase.from('alunos').select('*').ilike('nome', `%${name}%`);
        if (alunos && alunos.length > 0) {
            for (const aluno of alunos) {
                const isMinor = aluno.responsavel_nome && aluno.responsavel_nome !== aluno.nome;
                const update = isMinor ? { responsavel_cpf: doc } : { cpf: doc };
                await supabase.from('alunos').update(update).eq('id', aluno.id);
            }
        }
    }
    console.log('Fim da atualização de CPFs!');
}

updateAllCpfs();
