const fs = require('fs');

function fix(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Em /api/aulas, adicionar o envio de email para o professor
    if (!content.includes('Nova aula agendada!')) {
        const replacementAulaPost = `
            if (newAula.status === 'realizada') {
                const valorAula = Number(profObj?.valor_aula) || 0;
                const novoSaldo = (Number(profObj?.saldo) || 0) + valorAula;
                if (profObj?.id) {
                    await supabase.from('professores').update({ saldo: novoSaldo }).eq('id', profObj.id);
                }

                if (aluno_id) {
                    const { data: aluno } = await supabase.from('alunos').select('xp').eq('id', aluno_id).single();
                    if (aluno) {
                        const novoXp = (Number(aluno.xp) || 0) + Number(newAula.xp_ganho);
                        await supabase.from('alunos').update({ xp: novoXp }).eq('id', aluno_id);
                    }
                }
            }

            // Avisar o professor sobre a nova aula
            if (profObj?.id && profObj?.email) {
                const titulo = 'Nova aula agendada!';
                const msg = \`Uma nova aula foi adicionada na sua agenda para o dia \${data} às \${horario}.\`;
                await sendPushNotification(titulo, msg, String(profObj.id), profObj.email);
            }`;
        
        content = content.replace(
            /if \(newAula\.status === 'realizada'\) \{[\s\S]*?\}\n\s*\}/,
            replacementAulaPost
        );
    }

    // Em solicitar-confirmacao, precisamos buscar o email do aluno
    content = content.replace(
        /if \(aula\.alunos\?\.id\) \{\n\s*const titulo = 'Confirme sua próxima aula! 🎸';\n\s*const msg = `Olá \$\{aula\.alunos\.nome\.split\(' '\)\[0\]\}, precisamos confirmar sua presença na próxima aula\. Toque aqui e acesse sua Área do Aluno!`;\n\s*await sendPushNotification\(titulo, msg, String\(aula\.alunos\.id\)\);\n\s*\}/,
        `if (aula.alunos?.id) {
                const { data: alunoData } = await supabase.from('alunos').select('email').eq('id', aula.alunos.id).single();
                const titulo = 'Confirme sua próxima aula! 🎸';
                const msg = \`Olá \${aula.alunos.nome.split(' ')[0]}, precisamos confirmar sua presença na próxima aula. Toque aqui e acesse sua Área do Aluno!\`;
                await sendPushNotification(titulo, msg, String(aula.alunos.id), alunoData?.email);
            }`
    );

    // Em confirmar, precisamos buscar o email do professor
    content = content.replace(
        /if \(aula\.professores\?\.id\) \{\n\s*const titulo = 'Aula Confirmada! ✅';\n\s*const msg = `O aluno \$\{aula\.alunos\?\.nome \|\| 'seu aluno'\} confirmou a presença na próxima aula!`;\n\s*await supabase\.from\('notificacoes'\)\.insert\(\[\{\n\s*titulo, mensagem: msg, tipo: 'agenda', professor_id: aula\.professores\.id\n\s*\}\]\);\n\s*await sendPushNotification\(titulo, msg, String\(aula\.professores\.id\)\);\n\s*\}/,
        `if (aula.professores?.id) {
                const { data: profData } = await supabase.from('professores').select('email').eq('id', aula.professores.id).single();
                const titulo = 'Aula Confirmada! ✅';
                const msg = \`O aluno \${aula.alunos?.nome || 'seu aluno'} confirmou a presença na próxima aula!\`;
                
                await supabase.from('notificacoes').insert([{
                    titulo, mensagem: msg, tipo: 'agenda', professor_id: aula.professores.id
                }]);

                await sendPushNotification(titulo, msg, String(aula.professores.id), profData?.email);
            }`
    );

    fs.writeFileSync(filePath, content, 'utf8');
}

fix('api/index.ts');
fix('server.ts');
console.log('Done fixing emails');
