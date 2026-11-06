require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const EMUSYS_TOKEN = '4vb5JK9QS6YkhaA6JpIIxocrV3VuqU';
const HEADERS = { 'token': EMUSYS_TOKEN, 'Accept': 'application/json' };

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fetchEmusysAulasPage(dataInicial, dataFinal, cursor = null) {
    let queryParams = `data_hora_inicial=${dataInicial}&data_hora_final=${dataFinal}&limit=100`;
    if (cursor) {
        queryParams += `&cursor=${cursor}`;
    }
    const url = 'https://api.emusys.com.br/v1/aulas?' + queryParams;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Emusys Error: ${res.status} - ${text}`);
    }
    return res.json();
}

async function run() {
    console.log('Iniciando importação de histórico de aulas do Emusys...');

    // 1. Load mappings from Supabase
    const { data: alunosData } = await supabase.from('alunos').select('id, nome');
    const alunosMap = {};
    alunosData?.forEach(a => alunosMap[a.nome.toUpperCase()] = a.id);

    const { data: profsData } = await supabase.from('professores').select('id, nome');
    const profsMap = {};
    profsData?.forEach(p => profsMap[p.nome.toUpperCase().replace('PROF. ', '').trim()] = p.id);

    const { data: cursosData } = await supabase.from('cursos').select('id, nome');
    const cursosMap = {};
    cursosData?.forEach(c => cursosMap[c.nome.toUpperCase()] = c.id);

    let aulasToInsert = [];
    let hasMore = true;
    let cursor = null;
    let pageCount = 0;

    // From beginning of year to yesterday
    const dataInicial = '2024-01-01 00:00:00';
    const hoje = new Date();
    hoje.setDate(hoje.getDate() - 1); // Yesterday
    const dataFinal = `${hoje.getFullYear()}-${(hoje.getMonth()+1).toString().padStart(2, '0')}-${hoje.getDate().toString().padStart(2, '0')} 23:59:59`;

    console.log(`Buscando aulas de ${dataInicial} até ${dataFinal}`);

    while (hasMore) {
        pageCount++;
        console.log(`Buscando página ${pageCount}...`);
        
        const response = await fetchEmusysAulasPage(dataInicial, dataFinal, cursor);
        const aulasEmusys = response.items || [];
        
        for (const aula of aulasEmusys) {
            // Processa a aula
            if (!aula.alunos || aula.alunos.length === 0) continue;
            if (!aula.professores || aula.professores.length === 0) continue;

            const profObj = aula.professores[0];
            const profRaw = profObj.nome_professor || profObj.nome || profObj.professor;
            if (!profRaw) {
                console.log('Professor objeto sem nome:', profObj);
                continue;
            }
            let profNome = profRaw.toUpperCase().replace('PROF. ', '').trim();
            const professor_id = profsMap[profNome];

            const cursoNome = (aula.curso_nome || '').toUpperCase();
            const curso_id = cursosMap[cursoNome];

            // If we don't have matching ids in Supabase, we skip.
            if (!professor_id || !curso_id) continue;

            const [data, horarioFull] = aula.data_hora_inicio.split(' ');
            const horario = horarioFull.substring(0, 5); // "20:00"

            let tipo = 'regular';
            if (aula.categoria === 'experimental') tipo = 'experimental';
            // We can also have 'extra' mapped to 'reposicao' perhaps, but let's stick to 'regular' if not experimental.

            for (const aluno of aula.alunos) {
                const aluno_id = alunosMap[(aluno.nome_aluno || '').toUpperCase()];
                if (!aluno_id) continue;

                let status = 'pendente';
                const p = (aluno.presenca || '').toLowerCase();
                if (p === 'presente') status = 'realizada';
                else if (p === 'ausente' || p === 'falta' || p === 'falta sem aviso' || p.includes('falta')) status = 'falta_aluno';

                aulasToInsert.push({
                    aluno_id,
                    professor_id,
                    curso_id,
                    data,
                    horario,
                    status,
                    tipo,
                    // observacoes: aula.anotacoes || '' // Ignoring observacoes to avoid schema errors if the column doesn't exist.
                });
            }
        }

        if (response.paginacao && response.paginacao.tem_mais) {
            cursor = response.paginacao.proximo_cursor;
        } else {
            hasMore = false;
        }
    }

    console.log(`Total de aulas mapeadas para inserir: ${aulasToInsert.length}`);

    if (aulasToInsert.length > 0) {
        const chunkSize = 100;
        let inseridas = 0;
        for (let i = 0; i < aulasToInsert.length; i += chunkSize) {
            const chunk = aulasToInsert.slice(i, i + chunkSize);
            const { error } = await supabase.from('aulas').insert(chunk);
            if (error) {
                console.error('Erro ao inserir chunk:', error);
            } else {
                inseridas += chunk.length;
                console.log(`Inseridas ${inseridas}/${aulasToInsert.length}`);
            }
        }
        console.log('Finalizado com sucesso!');
    }
}

run();
