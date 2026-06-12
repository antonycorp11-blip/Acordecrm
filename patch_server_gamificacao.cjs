const fs = require('fs');

let serverFile = fs.readFileSync('server.ts', 'utf8');

const newRoutes = `

    // --- GAMIFICACAO 2.0 ROUTES ---

    // 1. Feed
    app.get('/api/feed', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('feed_atividades')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);
            if (error && error.code !== '42P01') throw error;
            res.json(data || []);
        } catch (error) {
            console.error('Error fetching feed:', error);
            res.json([]); // Fail gracefully until table exists
        }
    });

    app.post('/api/feed', async (req, res) => {
        try {
            const { mensagem, tipo, icone, aluno_id } = req.body;
            const { error } = await supabase.from('feed_atividades').insert([{
                mensagem, tipo, icone, aluno_id
            }]);
            if (error && error.code !== '42P01') throw error;
            res.json({ success: true });
        } catch (error) {
            console.error('Error posting to feed:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // 2. Avatar
    app.put('/api/alunos/:id/avatar', async (req, res) => {
        try {
            const { avatar_config } = req.body;
            const { error } = await supabase
                .from('alunos')
                .update({ avatar_config })
                .eq('id', req.params.id);
            if (error) throw error;
            res.json({ success: true });
        } catch (error) {
            console.error('Error updating avatar:', error);
            res.status(500).json({ error: error.message });
        }
    });

    // 3. Videos
    app.get('/api/aulas-video', async (req, res) => {
        try {
            const { data, error } = await supabase.from('aulas_video').select('*, aulas_video_questoes(*)').order('created_at', { ascending: false });
            if (error && error.code !== '42P01') throw error;
            res.json(data || []);
        } catch(error) {
            res.json([]);
        }
    });

    app.post('/api/aulas-video', async (req, res) => {
        try {
            const { youtube_url, youtube_id, titulo, descricao, questoes } = req.body;
            const { data, error } = await supabase.from('aulas_video').insert([{
                youtube_url, youtube_id, titulo, descricao
            }]).select();
            if (error) throw error;
            const videoId = data[0].id;
            
            if (questoes && questoes.length > 0) {
                const questaoData = questoes.map(q => ({
                    aula_video_id: videoId,
                    pergunta: q.pergunta,
                    opcoes: q.opcoes,
                    resposta_correta: q.resposta_correta
                }));
                await supabase.from('aulas_video_questoes').insert(questaoData);
            }
            res.json(data[0]);
        } catch(error) {
            res.status(500).json({ error: error.message });
        }
    });

    // --- END GAMIFICACAO 2.0 ---
`;

if (!serverFile.includes('// --- GAMIFICACAO 2.0 ROUTES ---')) {
    const listenIndex = serverFile.lastIndexOf('app.listen(');
    if (listenIndex !== -1) {
        serverFile = serverFile.slice(0, listenIndex) + newRoutes + '\n' + serverFile.slice(listenIndex);
        fs.writeFileSync('server.ts', serverFile);
        console.log('Routes added successfully!');
    } else {
        console.log('Could not find app.listen()');
    }
} else {
    console.log('Routes already exist.');
}
