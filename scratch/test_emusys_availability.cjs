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

async function finalTest() {
    try {
        const endpoints = [
            'salas',
            'grade_horaria',
            'horarios_trabalho',
            'configuracao',
            'professores/disponibilidade'
        ];

        for (const ep of endpoints) {
            try {
                console.log(`Testando /${ep}...`);
                const data = await fetchEmusys(ep);
                console.log(`Sucesso em /${ep}!`);
                console.log(JSON.stringify(data, null, 2).substring(0, 500));
            } catch (e) {
                console.log(`Endpoint /${ep} falhou.`);
            }
        }
    } catch (error) {
        console.error('Erro:', error.message);
    }
}

finalTest();
