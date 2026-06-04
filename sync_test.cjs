require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const EMUSYS_TOKEN = '4vb5JK9QS6YkhaA6JpIIxocrV3VuqU';
const HEADERS = {
    'token': EMUSYS_TOKEN,
    'Accept': 'application/json'
};

async function fetchEmusys(endpoint, queryParams = '') {
    const url = `https://api.emusys.com.br/v1/${endpoint}${queryParams ? '?' + queryParams : ''}`;
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`Emusys Error: ${res.statusText}`);
    return res.json();
}

async function syncAll() {
    try {
        console.log('Iniciando sincronização...');

        // 1. Sincronizar Cursos
        console.log('Buscando cursos do Emusys...');
        const dataCursos = await fetchEmusys('cursos');
        const cursosMap = new Map(); // nome -> id local
        
        for (const c of dataCursos.cursos) {
            const nomeCurso = c.nome.trim();
            // Inserir ou buscar curso local
            let { data: cursoLocal } = await supabase.from('cursos').select('*').ilike('nome', nomeCurso).single();
            if (!cursoLocal) {
                const { data: novoCurso, error } = await supabase.from('cursos').insert([{ nome: nomeCurso, descricao: nomeCurso, valor_base: 0 }]).select().single();
                if (error) console.log('Erro ao inserir curso:', nomeCurso, error.message);
                cursoLocal = novoCurso;
            }
            if (cursoLocal) cursosMap.set(nomeCurso, cursoLocal.id);
        }

        // 2. Sincronizar Professores
        console.log('Buscando professores do Emusys...');
        const dataProfessores = await fetchEmusys('professores');
        const profsMap = new Map(); // nome -> id local

        for (const p of dataProfessores.professores) {
            const nomeProf = p.nome.trim();
            let { data: profLocal } = await supabase.from('professores').select('*').ilike('nome', nomeProf).single();
            if (!profLocal) {
                // To avoid unique constraint on empty string, generate a dummy email if none provided
                let dummyEmail = p.email ? p.email.trim() : `sememail-${Date.now()}-${Math.floor(Math.random()*1000)}@acorde.local`;
                if (!dummyEmail) dummyEmail = `sememail-${Date.now()}-${Math.floor(Math.random()*1000)}@acorde.local`;
                
                const { data: novoProf, error } = await supabase.from('professores').insert([{ nome: nomeProf, email: dummyEmail, telefone: p.telefone || '' }]).select().single();
                if (error) console.log('Erro ao inserir prof:', nomeProf, error.message);
                profLocal = novoProf;
            }
            if (profLocal) profsMap.set(nomeProf, profLocal.id);
        }

        // 3. Buscar Aulas (últimos 30 dias e próximos 30 dias)
        console.log('Buscando aulas...');
        const hoje = new Date();
        const start = new Date(hoje); start.setDate(start.getDate() - 30);
        const end = new Date(hoje); end.setDate(end.getDate() + 30);
        
        const dataStr = start.toISOString().split('.')[0];
        const dataEnd = end.toISOString().split('.')[0];

        let cursor = null;
        let temMais = true;
        let countAulas = 0;

        while (temMais) {
            const qs = `data_hora_inicial=${dataStr}&data_hora_final=${dataEnd}&limite=50${cursor ? '&cursor='+cursor : ''}`;
            const aulaRes = await fetchEmusys('aulas', qs);
            
            for (const aula of aulaRes.items) {
                countAulas++;
                const nomeCurso = aula.curso_nome ? aula.curso_nome.trim() : null;
                const cursoId = nomeCurso ? cursosMap.get(nomeCurso) : null;
                
                let profId = null;
                if (aula.professores && aula.professores.length > 0) {
                    const profEmusysNome = aula.professores[0].nome.trim();
                    profId = profsMap.get(profEmusysNome);
                }

                // Extrair aluno e sincronizar
                if (aula.alunos && aula.alunos.length > 0) {
                    for (const al of aula.alunos) {
                        const nomeAluno = al.nome_aluno.trim();
                        if (!nomeAluno) continue;

                        let { data: alunoLocal } = await supabase.from('alunos').select('*').ilike('nome', nomeAluno).single();
                        if (!alunoLocal) {
                            let dummyEmailAluno = al.email_aluno ? al.email_aluno.trim() : `sememail-${Date.now()}-${Math.floor(Math.random()*1000)}@acorde.local`;
                            if (!dummyEmailAluno) dummyEmailAluno = `sememail-${Date.now()}-${Math.floor(Math.random()*1000)}@acorde.local`;

                            const { data: novoAluno, error } = await supabase.from('alunos').insert([{ 
                                nome: nomeAluno, 
                                email: dummyEmailAluno, 
                                telefone: al.telefone_aluno || '',
                                responsavel_nome: al.nome_responsavel || '',
                                responsavel_telefone: al.telefone_responsavel || '',
                                data_nascimento: al.data_nascimento_aluno || null
                            }]).select().single();
                            if (error) console.log('Erro ao inserir aluno:', nomeAluno, error.message);
                            alunoLocal = novoAluno;
                        }

                        // Garantir Matricula
                        console.log('Valores:', !!alunoLocal, !!cursoId, !!profId); let matriculaId = null;
                        if (alunoLocal && cursoId && profId) {
                            let { data: matLocal } = await supabase.from('matriculas').select('*').eq('aluno_id', alunoLocal.id).eq('curso_id', cursoId).single();
                            if (!matLocal) {
                                const { data: novaMat } = await supabase.from('matriculas').insert([{
                                    aluno_id: alunoLocal.id,
                                    curso_id: cursoId,
                                    professor_id: profId,
                                    status: 'Ativa'
                                }]).select().single();
                                matriculaId = novaMat?.id;
                            } else {
                                matriculaId = matLocal.id;
                            }
                        }

                        // Sincronizar Aula do aluno
                        if (matriculaId) {
                            const startTime = new Date(aula.data_hora_inicio);
                            const diaSemana = startTime.getDay(); // 0-6
                            const diaMap = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
                            
                            const hora = startTime.toTimeString().split(' ')[0].substring(0, 5);
                            const statusPresenca = al.presenca === 'presente' ? 'Realizada' : (al.presenca === 'falta' ? 'Falta do Aluno' : 'Pendente');

                            // Checar se já existe essa aula cadastrada
                            let { data: aulaLocalCheck } = await supabase.from('aulas').select('*').eq('matricula_id', matriculaId).eq('data', aula.data_hora_inicio.split(' ')[0]).eq('hora', hora).single();
                            
                            if (!aulaLocalCheck) {
                                await supabase.from('aulas').insert([{
                                    matricula_id: matriculaId,
                                    professor_id: profId,
                                    curso_id: cursoId,
                                    dia_semana: diaMap[diaSemana],
                                    hora: hora,
                                    data: aula.data_hora_inicio.split(' ')[0],
                                    status: statusPresenca
                                }]);
                            } else if (aulaLocalCheck.status === 'Pendente' && statusPresenca !== 'Pendente') {
                                // Update se o status mudou
                                await supabase.from('aulas').update({ status: statusPresenca }).eq('id', aulaLocalCheck.id);
                            }
                        }
                    }
                }
            }

            cursor = aulaRes.paginacao.proximo_cursor;
            temMais = aulaRes.paginacao.tem_mais;
        }

        console.log(`Processo finalizado com sucesso! ${countAulas} aulas processadas.`);

    } catch (e) {
        console.error('Erro na sincronização:', e);
    }
}

syncAll();
