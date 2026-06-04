const fs = require('fs');

function patch(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');

    // Add google-auth-library
    if (!code.includes("import { GoogleAuth } from 'google-auth-library';")) {
        code = code.replace("import nodemailer from 'nodemailer';", "import nodemailer from 'nodemailer';\nimport { GoogleAuth } from 'google-auth-library';");
    }

    // Add DELETE and PATCH to /api/agenda/:id
    const patchRoute = `
    app.patch('/api/agenda/:id/cancelar', async (req, res) => {
        try {
            const { id } = req.params;
            const { reposicao } = req.body;
            let type = 'reg';
            let originalId = id;
            if (id.includes('-')) {
                [type, originalId] = id.split('-');
            }
            if (type !== 'reg') {
                await supabase.from('aulas_experimentais').delete().eq('id', originalId);
                return res.json({ success: true, action: 'deleted' });
            }

            if (reposicao) {
                await supabase.from('aulas').update({ status: 'reposicao', data: null, horario: null }).eq('id', originalId);
            } else {
                await supabase.from('aulas').update({ status: 'falta' }).eq('id', originalId);
            }
            res.json({ success: true, action: 'updated' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });
`;
    if (!code.includes("app.patch('/api/agenda/:id/cancelar'")) {
        code = code.replace("app.delete('/api/agenda/:id', async (req, res) => {", patchRoute + "\n    app.delete('/api/agenda/:id', async (req, res) => {");
    }

    // Add Google Drive routes
    const driveRoutes = `
    const driveFolderId = '1EHXi800HrwkDWOgd-l0lXKtQZkMlSFyV';
    
    app.post('/api/drive/upload-url', authenticate, async (req, res) => {
        try {
            const { filename, mimeType } = req.body;
            const auth = new GoogleAuth({
                keyFile: './google-credentials.json',
                scopes: ['https://www.googleapis.com/auth/drive.file']
            });
            const client = await auth.getClient();
            const token = await client.getAccessToken();

            const metadata = {
                name: filename,
                parents: [driveFolderId]
            };

            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
                method: 'POST',
                headers: {
                    'Authorization': \`Bearer \${token.token}\`,
                    'Content-Type': 'application/json',
                    'X-Upload-Content-Type': mimeType
                },
                body: JSON.stringify(metadata)
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error('Google Drive Error: ' + text);
            }

            const resumableUrl = response.headers.get('Location');
            res.json({ uploadUrl: resumableUrl });
        } catch (error: any) {
            console.error('Drive API Error:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/drive/finish-upload', authenticate, async (req, res) => {
        try {
            const { fileId } = req.body;
            const auth = new GoogleAuth({
                keyFile: './google-credentials.json',
                scopes: ['https://www.googleapis.com/auth/drive.file']
            });
            const client = await auth.getClient();
            const token = await client.getAccessToken();

            // Set file to anyone with link can view (so professor can see it)
            await fetch(\`https://www.googleapis.com/drive/v3/files/\${fileId}/permissions\`, {
                method: 'POST',
                headers: {
                    'Authorization': \`Bearer \${token.token}\`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    role: 'reader',
                    type: 'anyone'
                })
            });

            const fileRes = await fetch(\`https://www.googleapis.com/drive/v3/files/\${fileId}?fields=webViewLink\`, {
                headers: { 'Authorization': \`Bearer \${token.token}\` }
            });
            
            const fileData = await fileRes.json();
            res.json({ url: fileData.webViewLink });
        } catch(err: any) {
            res.status(500).json({ error: err.message });
        }
    });
`;
    if (!code.includes("app.post('/api/drive/upload-url'")) {
        code = code.replace("app.post('/api/treinos/upload-video'", driveRoutes + "\n    app.post('/api/treinos/upload-video'");
    }

    fs.writeFileSync(filePath, code, 'utf8');
}

patch('server.ts');
patch('api/index.ts');
console.log('Patch aplicado!');
