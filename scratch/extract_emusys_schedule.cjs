require('dotenv').config();

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

async function extractSchedule() {
    try {
        console.log('--- EXTRAINDO DISPONIBILIDADE BASEADA NA AGENDA DO EMUSYS ---');
        
        // Próxima semana (segunda a sábado)
        const today = new Date();
        const nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + (1 - today.getDay() + 7) % 7);
        const nextSaturday = new Date(nextMonday);
        nextSaturday.setDate(nextMonday.getDate() + 5);

        const startStr = nextMonday.toISOString().split('T')[0] + ' 00:00:00';
        const endStr = nextSaturday.toISOString().split('T')[0] + ' 23:59:59';

        console.log(`Período de análise: ${startStr} até ${endStr}`);

        let cursor = null;
        let temMais = true;
        const schedule = {}; // { professor: { dia: Set(horarios) } }

        while (temMais) {
            const qs = `data_hora_inicial=${encodeURIComponent(startStr)}&data_hora_final=${encodeURIComponent(endStr)}&limite=100${cursor ? '&cursor='+cursor : ''}`;
            const res = await fetchEmusys('aulas', qs);
            
            for (const aula of res.items) {
                if (aula.cancelada) continue;
                
                const data = new Date(aula.data_hora_inicio.replace(' ', 'T'));
                const diaSemana = data.toLocaleDateString('pt-BR', { weekday: 'long' });
                const horario = aula.data_hora_inicio.split(' ')[1];

                for (const prof of aula.professores) {
                    const nome = prof.nome;
                    if (!schedule[nome]) schedule[nome] = {};
                    if (!schedule[nome][diaSemana]) schedule[nome][diaSemana] = new Set();
                    schedule[nome][diaSemana].add(horario);
                }
            }
            
            temMais = res.paginacao.tem_mais;
            cursor = res.paginacao.proximo_cursor;
        }

        console.log('\n--- RESULTADO DA DISPONIBILIDADE (HORÁRIOS OCUPADOS NO EMUSYS) ---');
        for (const [prof, dias] of Object.entries(schedule)) {
            console.log(`\nProfessor: ${prof}`);
            const diasOrdenados = ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
            for (const dia of diasOrdenados) {
                if (dias[dia]) {
                    const horarios = Array.from(dias[dia]).sort();
                    console.log(`  ${dia}: ${horarios.join(', ')}`);
                }
            }
        }

    } catch (error) {
        console.error('Erro ao extrair:', error.message);
    }
}

extractSchedule();
