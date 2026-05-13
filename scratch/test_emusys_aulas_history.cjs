require('dotenv').config();
const EMUSYS_TOKEN = '4vb5JK9QS6YkhaA6JpIIxocrV3VuqU';
const HEADERS = { 'token': EMUSYS_TOKEN, 'Accept': 'application/json' };

async function fetchEmusys(endpoint, queryParams = '') {
    const url = 'https://api.emusys.com.br/v1/' + endpoint + (queryParams ? '?' + queryParams : '');
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
        const text = await res.text();
        return { error: true, status: res.status, text };
    }
    return res.json();
}

async function testHistory() {
    console.log('Buscando aulas de Junho 2024 para ver formato...');
    // We want to see a class that already happened and has students in it
    const aulas = await fetchEmusys('aulas', 'data_hora_inicial=2024-06-01 00:00:00&data_hora_final=2024-08-30 23:59:59&limit=50');
    
    if (aulas.items && aulas.items.length > 0) {
        // Find one with students
        const aulaComAlunos = aulas.items.find(a => a.alunos && a.alunos.length > 0);
        if (aulaComAlunos) {
            require('fs').writeFileSync('scratch/alunos_aula_exemplo.json', JSON.stringify(aulaComAlunos.alunos, null, 2));
            console.log('Salvo em scratch/alunos_aula_exemplo.json');
        } else {
            console.log('Nenhuma aula com alunos encontrada na amostra.', JSON.stringify(aulas.items[0], null, 2));
        }
    } else {
        console.log('Nenhuma aula encontrada:', aulas);
    }
}

testHistory();
