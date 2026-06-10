const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBzdHVkaW9hY29yZGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzgxMTA2NDkyfQ.s6irE-f0E8n_XGqrB0keWdhgRrExQ_Aezuvx-4AGzFs';

async function test() {
    const reqBody = {
        nome: 'ANNY GABRIELLY SA SILVA ESPINA',
        email: '',
        telefone: '',
        cpf: '',
        endereco: '',
        data_nascimento: '2017-11-30',
        responsavel_nome: 'CIERO LEONEL',
        responsavel_telefone: '65992170088',
        responsavel_cpf: '58306734153',
        curso_id: 1,
        professor_id: 1,
        dia_semana: '2026-06-12',
        horario: '16:00',
        pacote_id: 1,
        valor_parcela: '150',
        data_primeira_parcela: '2026-06-10',
        dia_vencimento: '10',
        total_parcelas: '12'
    };

    console.log("Sending to Vercel (n78tid64y)...");
    const res = await fetch('https://acordecrm-n78tid64y-antonys-projects-de2f677e.vercel.app/api/alunos', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reqBody)
    });
    
    const text = await res.text();
    console.log("Response:", res.status, text);
}
test();
