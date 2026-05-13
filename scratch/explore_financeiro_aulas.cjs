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

async function explore() {
    console.log('--- TESTANDO ALUNO ESPECIFICO ---');
    const alunos = await fetchEmusys('alunos', 'limit=1');
    if (alunos.data && alunos.data.length > 0) {
        const alunoId = alunos.data[0].id;
        console.log('Exemplo Aluno Inteiro:', JSON.stringify(alunos.data[0], null, 2));
        
        console.log(`\n--- TENTANDO ENDPOINTS ANINHADOS PARA ALUNO ${alunoId} ---`);
        const endpointsToTest = [
            `alunos/${alunoId}/faturas`,
            `alunos/${alunoId}/parcelas`,
            `alunos/${alunoId}/financeiro`,
            `alunos/${alunoId}/contratos`,
            `alunos/${alunoId}/matriculas`
        ];

        for (const ep of endpointsToTest) {
            const res = await fetchEmusys(ep);
            if (res.error) {
                console.log(`[${ep}] Erro ${res.status}: ${res.text.substring(0, 60)}`);
            } else {
                console.log(`[${ep}] SUCESSO!`);
                if (res.data) console.log(JSON.stringify(res.data[0]).substring(0, 200));
                else console.log(JSON.stringify(res).substring(0, 200));
            }
        }
    }

    console.log('\n--- TENTANDO PARCELAS GLOBALMENTE ---');
    const parcelas = await fetchEmusys('parcelas', 'limit=5');
    if (parcelas.error) console.log('Parcelas erro:', parcelas.text);
    else console.log('Parcelas sucesso!');
}

explore();
