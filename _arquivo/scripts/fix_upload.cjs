const fs = require('fs');

function fix(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Mudar a validação inicial
    content = content.replace(
        /if \(!req\.file\) \{\n\s*return res\.status\(400\)\.json\(\{ error: 'Nenhum arquivo de vídeo enviado\.' \}\);\n\s*\}/,
        `if (!req.file && !req.body.video_url) {
            return res.status(400).json({ error: 'Nenhum arquivo de vídeo enviado.' });
        }`
    );

    // Substituir bloco de upload do req.file para lidar com a URL fornecida pelo frontend
    const oldBlock = `            let ext = path.extname(req.file.originalname) || '.mp4';
            let mimeType = req.file.mimetype || 'video/mp4';
            const extLower = ext.toLowerCase();

            // Bypass incondicional para iOS:
            if (mimeType.includes('quicktime') || extLower === '.mov' || extLower === '.qt') {
                mimeType = 'video/mp4';
                ext = '.mp4';
            } else if (!mimeType.startsWith('video/') || mimeType.includes('text/plain') || mimeType.includes('octet-stream')) {
                if (extLower === '.webm') mimeType = 'video/webm';
                else mimeType = 'video/mp4';
            }

            const filename = \`treinos/\${aluno.id}_\${Date.now()}_video\${ext}\`;
            const fileBuffer = fs.readFileSync(req.file.path);

            // Enviar fileBuffer nativamente ao invés do Blob global do NodeJS 
            // O supabase client lida melhor com o buffer diretamente se contentType for fornecido
            // Octet-stream ignora validacoes
            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filename, fileBuffer, { 
                    contentType: 'application/octet-stream', 
                    upsert: true,
                    cacheControl: '3600'
                });

            try { fs.unlinkSync(req.file.path); } catch {}

            if (uploadError) {
                console.error('[TREINO_VIDEO_UPLOAD] Erro Storage:', uploadError.message);
                return res.status(500).json({ error: 'Falha ao salvar vídeo: ' + uploadError.message });
            }

            const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
            const url = publicUrlData?.publicUrl || '';`;

    const newBlock = `            let url = req.body.video_url || '';

            if (!req.body.video_url && req.file) {
                let ext = path.extname(req.file.originalname) || '.mp4';
                let mimeType = req.file.mimetype || 'video/mp4';
                const extLower = ext.toLowerCase();

                if (mimeType.includes('quicktime') || extLower === '.mov' || extLower === '.qt') {
                    mimeType = 'video/mp4';
                    ext = '.mp4';
                } else if (!mimeType.startsWith('video/') || mimeType.includes('text/plain') || mimeType.includes('octet-stream')) {
                    if (extLower === '.webm') mimeType = 'video/webm';
                    else mimeType = 'video/mp4';
                }

                const filename = \`treinos/\${aluno.id}_\${Date.now()}_video\${ext}\`;
                const fileBuffer = fs.readFileSync(req.file.path);

                const { error: uploadError } = await supabase.storage
                    .from('uploads')
                    .upload(filename, fileBuffer, { 
                        contentType: 'application/octet-stream', 
                        upsert: true,
                        cacheControl: '3600'
                    });

                try { fs.unlinkSync(req.file.path); } catch {}

                if (uploadError) {
                    console.error('[TREINO_VIDEO_UPLOAD] Erro Storage:', uploadError.message);
                    return res.status(500).json({ error: 'Falha ao salvar vídeo: ' + uploadError.message });
                }

                const { data: publicUrlData } = supabase.storage.from('uploads').getPublicUrl(filename);
                url = publicUrlData?.publicUrl || '';
            }`;

    // replace oldBlock by newBlock, ignoring multiple spaces
    const regexSafeOld = oldBlock.replace(/[.*+?^$\{\}()|\[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
    content = content.replace(new RegExp(regexSafeOld), newBlock);

    // Ajustar o delete do vídeo antigo para ignorar se a url for a mesma
    content = content.replace(
        /if \(treino\.video_url\) \{/,
        "if (treino.video_url && treino.video_url !== url) {"
    );

    fs.writeFileSync(filePath, content, 'utf8');
}

fix('api/index.ts');
fix('server.ts');
console.log('Upload de videos corrigido!');
