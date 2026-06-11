const fs = require('fs');

let code = fs.readFileSync('api/index.ts', 'utf8');

const cronEndpoint = `
// Vercel Cron Job: Limpar vídeos com mais de 24 horas
app.get('/api/cron/cleanup-videos', async (req, res) => {
    try {
        console.log("Iniciando limpeza de vídeos...");
        const { data: files, error } = await supabase.storage.from('videos').list();
        
        if (error || !files) {
            console.error("Erro ao listar arquivos:", error);
            return res.status(500).json({ error });
        }
        
        const now = new Date().getTime();
        const filesToDelete = files
            .filter(f => {
                 if (f.name === '.emptyFolderPlaceholder') return false;
                 const fileAge = now - new Date(f.created_at).getTime();
                 return fileAge > 24 * 60 * 60 * 1000;
            })
            .map(f => f.name);

        if (filesToDelete.length > 0) {
            console.log("Apagando arquivos:", filesToDelete);
            const { error: deleteError } = await supabase.storage.from('videos').remove(filesToDelete);
            if (deleteError) {
                console.error("Erro ao deletar arquivos:", deleteError);
                return res.status(500).json({ error: deleteError });
            }
        }
        
        res.json({ message: \`Limpeza concluída. \${filesToDelete.length} vídeos apagados.\` });
    } catch (e) {
        console.error("Exceção na limpeza:", e);
        res.status(500).json({ error: e.message });
    }
});
`;

// Insert the endpoint right before the Google Drive routes or at the end
if (code.includes('// Upload do Vídeo via Google Drive')) {
    code = code.replace('// Upload do Vídeo via Google Drive', cronEndpoint + '\n\n// Upload do Vídeo via Google Drive');
    fs.writeFileSync('api/index.ts', code);
    console.log("Cron endpoint added.");
} else {
    // If not found, insert before the end
    const exportLine = 'export default app;';
    if (code.includes(exportLine)) {
        code = code.replace(exportLine, cronEndpoint + '\n\n' + exportLine);
        fs.writeFileSync('api/index.ts', code);
        console.log("Cron endpoint added near EOF.");
    } else {
        console.log("Could not find place to insert cron endpoint.");
    }
}
