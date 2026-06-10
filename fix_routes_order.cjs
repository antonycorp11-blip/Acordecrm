const fs = require('fs');

function fixFile(file) {
    let code = fs.readFileSync(file, 'utf-8');

    // Remove the template block
    const templateBlock = `
    // --- CONTRATOS ---
    app.get('/api/contratos/template', async (req, res) => {
        try {
            const { data, error } = await supabase.from('contrato_templates').select('*').limit(1).single();
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found
            res.json(data || { clausulas: [] });
        } catch (error: any) {
            console.error('Erro get template:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/contratos/template', async (req, res) => {
        try {
            const { clausulas } = req.body;
            // Verifica se ja existe
            const { data: existing } = await supabase.from('contrato_templates').select('id').limit(1).single();
            let result;
            if (existing) {
                result = await supabase.from('contrato_templates').update({ clausulas }).eq('id', existing.id);
            } else {
                result = await supabase.from('contrato_templates').insert([{ nome: 'Padrão', clausulas }]);
            }
            if (result.error) throw result.error;
            res.json({ success: true });
        } catch (error: any) {
            console.error('Erro post template:', error);
            res.status(500).json({ error: error.message });
        }
    });

    app.post('/api/contratos/enviar', async (req, res) => {
        try {
            const { aluno_id, dados_dinamicos, conteudo_html, email_aluno } = req.body;

            // 1. Criar registro do contrato no banco
            const { data: contrato, error } = await supabase.from('contratos').insert([{
                aluno_id,
                dados_dinamicos,
                conteudo_html,
                status: 'pendente'
            }]).select().single();

            if (error) throw error;

            // 2. Enviar email usando nodemailer
            const { data: configs } = await supabase.from('configuracoes').select('*');
            let smtpEmail = configs?.find((c: any) => c.chave === 'SMTP_EMAIL')?.valor || process.env.SMTP_EMAIL;
            let smtpPass = configs?.find((c: any) => c.chave === 'SMTP_PASS')?.valor || process.env.SMTP_PASS;

            if (!smtpEmail || !smtpPass) {
                throw new Error('Configurações de SMTP (email do estúdio) não encontradas no sistema.');
            }

            const transporter = require('nodemailer').createTransport({
                service: 'gmail',
                auth: { user: smtpEmail, pass: smtpPass }
            });

            const linkAssinatura = \`https://acordecrm.vercel.app/assinatura/\${contrato.id}\`;

            const emailHtml = \`
                <div style="font-family: sans-serif; padding: 20px; background: #fff8f6; border: 4px solid #261812; color: #261812; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #ff6b00; text-transform: uppercase;">STUDIO ACORDE</h2>
                    <p style="font-size: 16px; font-weight: bold;">Olá! Seu contrato de prestação de serviços musicais está pronto.</p>
                    <p>Para concluir sua matrícula, precisamos da sua assinatura digital.</p>
                    <p>Por favor, clique no botão abaixo para ler o contrato e assinar diretamente na tela do seu celular ou computador.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="\${linkAssinatura}" style="background-color: #ff6b00; color: white; padding: 15px 30px; text-decoration: none; font-weight: bold; border-radius: 5px; border: 2px solid #261812;">VER E ASSINAR CONTRATO</a>
                    </div>
                    <p style="font-size: 12px; color: #666;">Se não conseguir clicar no botão, copie e cole este link no seu navegador: <br/>\${linkAssinatura}</p>
                </div>
            \`;

            await transporter.sendMail({
                from: \`"Studio Acorde" <\${smtpEmail}>\`,
                to: email_aluno,
                subject: 'Assinatura do Contrato - Studio Acorde',
                html: emailHtml
            });

            res.json({ success: true, contrato_id: contrato.id });

        } catch (error: any) {
            console.error('Erro enviar contrato:', error);
            res.status(500).json({ error: error.message });
        }
    });
`;

    if (code.includes(templateBlock.trim())) {
        code = code.replace(templateBlock, '');
    }

    // Also remove any other injected template endpoints
    code = code.replace(/\/\/ --- CONTRATOS ---\s+app\.get\('\/api\/contratos\/template'[\s\S]*?\}\);/g, '');

    // The public routes block
    const publicBlockRegex = /\/\/ --- ROTAS PÚBLICAS \(ASSINATURA DE CONTRATOS\) ---[\s\S]*?\}\);/g;
    let publicBlock = "";
    code = code.replace(publicBlockRegex, (match) => {
        publicBlock = match;
        return ""; // remove from current position
    });

    // Re-inject public block BEFORE authentication!
    const targetSeguranca = `    // --- SEGURANÇA ---`;
    code = code.replace(targetSeguranca, templateBlock + "\n\n" + publicBlock + "\n\n" + targetSeguranca);
    
    fs.writeFileSync(file, code);
    console.log(`Fixed routes in ${file}`);
}

fixFile('server.ts');
fixFile('api/index.ts');
