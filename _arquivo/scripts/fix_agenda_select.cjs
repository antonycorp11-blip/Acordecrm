const fs = require('fs');
let apiCode = fs.readFileSync('api/index.ts', 'utf8');

apiCode = apiCode.replace(/id, data, horario, status, professor_id, aluno_id, conteudo, tarefa_casa, midias, xp_ganho, alunos\(nome, status\), professores\(nome\), cursos\(nome\)/g, "id, data, horario, status, professor_id, aluno_id, conteudo, tarefa_casa, midias, xp_ganho, data_original, motivo_cancelamento, alunos(nome, status), professores(nome), cursos(nome)");

fs.writeFileSync('api/index.ts', apiCode);
console.log('Fixed GET /api/agenda select!');
