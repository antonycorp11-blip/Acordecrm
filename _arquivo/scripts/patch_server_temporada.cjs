const fs = require('fs');

let serverFile = fs.readFileSync('server.ts', 'utf8');

const newRoutes = `
    // 4. Temporada Atual
    app.get('/api/temporada-atual', async (req, res) => {
        try {
            const { data, error } = await supabase
                .from('temporadas')
                .select('*')
                .eq('ativa', true)
                .single();
            if (error && error.code !== 'PGRST116' && error.code !== '42P01') throw error;
            res.json(data || { nome: 'Temporada 1' });
        } catch(error) {
            res.json({ nome: 'Temporada 1' });
        }
    });
`;

if (!serverFile.includes('/api/temporada-atual')) {
    const listenIndex = serverFile.lastIndexOf('app.listen(');
    if (listenIndex !== -1) {
        serverFile = serverFile.slice(0, listenIndex) + newRoutes + '\n' + serverFile.slice(listenIndex);
        fs.writeFileSync('server.ts', serverFile);
        console.log('Temporada route added successfully!');
    } else {
        console.log('Could not find app.listen()');
    }
} else {
    console.log('Temporada route already exists.');
}
