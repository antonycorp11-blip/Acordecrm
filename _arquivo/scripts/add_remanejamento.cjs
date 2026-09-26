const fs = require('fs');

let apiCode = fs.readFileSync('api/index.ts', 'utf8');

const newEndpoints = `
    // --- REMANEJAMENTO ---
    app.post('/api/alunos/:id/remanejar-pagamentos', async (req, res) => {
        try {
            const { nova_data_inicio } = req.body;
            const aluno_id = req.params.id;

            // 1. Obter matricula e valor
            const { data: matricula } = await supabase.from('matriculas').select('*').eq('aluno_id', aluno_id).order('id', { ascending: false }).limit(1).single();
            if (!matricula) throw new Error('Matrícula não encontrada');

            // 2. Obter pagamentos pendentes
            const { data: pendentes } = await supabase.from('pagamentos')
                .select('*')
                .eq('aluno_id', aluno_id)
                .eq('status', 'pendente')
                .eq('tipo_receita', 'mensalidade');
            
            if (!pendentes || pendentes.length === 0) return res.json({ success: true, message: 'Nenhum pagamento pendente para remanejar.' });

            // 3. Deletar pendentes
            await supabase.from('pagamentos').delete().in('id', pendentes.map(p => p.id));

            // 4. Recriar com novas datas
            const pagamentosToInsert = [];
            let currentVencimento = new Date(nova_data_inicio + 'T12:00:00');
            const novoDiaVencimento = currentVencimento.getDate();

            // Atualiza o dia_vencimento na matricula e também a data_primeira_parcela
            await supabase.from('matriculas').update({ 
                dia_vencimento: novoDiaVencimento,
                data_primeira_parcela: nova_data_inicio
            }).eq('id', matricula.id);

            for (let i = 0; i < pendentes.length; i++) {
                pagamentosToInsert.push({
                    aluno_id: aluno_id,
                    matricula_id: matricula.id,
                    valor: matricula.valor_parcela,
                    data_vencimento: currentVencimento.toISOString().split('T')[0],
                    status: 'pendente',
                    tipo_receita: 'mensalidade',
                    referencia_mes_ano: \`\${(currentVencimento.getMonth() + 1).toString().padStart(2, '0')}/\${currentVencimento.getFullYear()}\`
                });
                
                currentVencimento.setMonth(currentVencimento.getMonth() + 1);
                currentVencimento.setDate(novoDiaVencimento);
            }

            const { error } = await supabase.from('pagamentos').insert(pagamentosToInsert);
            if (error) throw error;

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/alunos/:id/remanejar-aulas', async (req, res) => {
        try {
            const { nova_data_inicio } = req.body;
            const aluno_id = req.params.id;

            // 1. Obter matricula
            const { data: matricula } = await supabase.from('matriculas').select('*').eq('aluno_id', aluno_id).order('id', { ascending: false }).limit(1).single();
            if (!matricula) throw new Error('Matrícula não encontrada');

            // 2. Obter aulas pendentes regulares
            const { data: aulasPendentes } = await supabase.from('aulas')
                .select('*')
                .eq('aluno_id', aluno_id)
                .eq('status', 'pendente')
                .eq('tipo', 'regular');

            if (!aulasPendentes || aulasPendentes.length === 0) return res.json({ success: true, message: 'Nenhuma aula pendente para remanejar.' });

            // 3. Deletar aulas pendentes
            await supabase.from('aulas').delete().in('id', aulasPendentes.map(a => a.id));

            // 4. Recriar
            const aulasToInsert = [];
            let currentAulaDate = new Date(nova_data_inicio + 'T12:00:00');
            const novoDiaSemana = currentAulaDate.getDay();

            // Atualiza dia_semana na matricula
            await supabase.from('matriculas').update({ dia_semana: novoDiaSemana }).eq('id', matricula.id);

            // Import isHoliday if needed, or simply skip here. We will just add 7 days.
            // Emusys system does not always strictly skip holidays automatically unless specified in the main loop, we will stick to 7 days intervals.
            for (let i = 0; i < aulasPendentes.length; i++) {
                aulasToInsert.push({
                    aluno_id: aluno_id,
                    matricula_id: matricula.id,
                    professor_id: matricula.professor_id,
                    curso_id: matricula.curso_id,
                    sala_id: matricula.sala_id,
                    data: currentAulaDate.toISOString().split('T')[0],
                    horario: matricula.horario,
                    status: 'pendente',
                    tipo: 'regular'
                });
                currentAulaDate.setDate(currentAulaDate.getDate() + 7);
            }

            const { error } = await supabase.from('aulas').insert(aulasToInsert);
            if (error) throw error;

            res.json({ success: true });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    });
`;

apiCode = apiCode.replace(
    /app.get\('\/api\/alunos\/:id\/ultima-aula'/g,
    `${newEndpoints}\n    app.get('/api/alunos/:id/ultima-aula'`
);

fs.writeFileSync('api/index.ts', apiCode);
console.log("Added remanejamento endpoints!");
