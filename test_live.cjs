async function test() {
    const profRes = await fetch('https://acordecrm.vercel.app/api/professores');
    const profs = await profRes.json();
    const aquilles = profs.find(p => p.nome.includes('AQUILLES'));
    
    const cursosRes = await fetch('https://acordecrm.vercel.app/api/cursos');
    const cursos = await cursosRes.json();
    const curso = cursos[0];
    
    const pacotesRes = await fetch('https://acordecrm.vercel.app/api/pacotes');
    const pacotes = await pacotesRes.json();
    const pacote = pacotes[0];

    const reqBody = {
        nome: 'ANNY GABRIELY DA SILVA ESPINA',
        email: '',
        telefone: '',
        cpf: '',
        endereco: 'RUA QUATORZE QUADRA 25 CASA 24 - RES SAL',
        data_nascimento: '2017-11-30',
        responsavel_nome: 'CICERO LEONEL DE LIMA',
        responsavel_telefone: '65992170088',
        responsavel_cpf: '58306734153',
        curso_id: curso ? curso.id : 1,
        professor_id: aquilles ? aquilles.id : 1,
        dia_semana: '2026-06-12',
        horario: '19:00:00',
        pacote_id: pacote ? pacote.id : 1,
        valor_parcela: '150',
        data_primeira_parcela: '2026-06-09',
        dia_vencimento: '10',
        total_parcelas: '12'
    };

    console.log("Sending...");
    const res = await fetch('https://acordecrm.vercel.app/api/alunos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqBody)
    });
    
    const text = await res.text();
    console.log("Response:", res.status, text);
}
test();
