require('dotenv').config();
const EMUSYS_TOKEN = '4vb5JK9QS6YkhaA6JpIIxocrV3VuqU';
const HEADERS = { 'token': EMUSYS_TOKEN, 'Accept': 'application/json' };

async function fetchEmusys(endpoint, queryParams = '') {
    const url = 'https://api.emusys.com.br/v1/' + endpoint + (queryParams ? '?' + queryParams : '');
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) {
        console.log(`Erro ${res.status} ao acessar ${url}`);
        return { error: true, status: res.status };
    }
    return res.json();
}

async function testMatriculas() {
    console.log('Tentando /matriculas sem param:');
    let res = await fetchEmusys('matriculas');
    console.log(res);

    console.log('\nTentando /matriculas?situacao=ativa:');
    res = await fetchEmusys('matriculas', 'situacao=ativa');
    console.log(res);

    console.log('\nTentando /alunos?situacao=ativo:');
    res = await fetchEmusys('alunos', 'situacao=ativo');
    console.log(res);
}

testMatriculas();
