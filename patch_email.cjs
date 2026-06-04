const fs = require('fs');

function patchFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add import if missing
    if (!content.includes("import nodemailer")) {
        content = content.replace("import { execSync } from 'child_process';", "import { execSync } from 'child_process';\nimport nodemailer from 'nodemailer';");
    }

    // Update function signature
    content = content.replace(
        /async function sendPushNotification\(titulo: string, mensagem: string, targetUserId\?: string(\s*\|\s*string\[\])?\)\s*\{/g,
        "async function sendPushNotification(titulo: string, mensagem: string, targetUserId?: string | string[], emailTo?: string) {"
    );

    // Inject nodemailer logic
    if (!content.includes("nodemailer.createTransport")) {
        const replacement = `            const data = await response.json();
            console.log('[PUSH_NOTIFICATION] OneSignal Push enviado com sucesso:', data);
            
            // Disparo de E-MAIL via Nodemailer (Gmail)
            if (emailTo) {
                try {
                    const { data: smtpConfig } = await supabase.from('system_config').select('key_name, key_value').in('key_name', ['SMTP_EMAIL', 'SMTP_PASSWORD']);
                    let smtpEmail = process.env.SMTP_EMAIL;
                    let smtpPass = process.env.SMTP_PASSWORD;

                    if (smtpConfig) {
                        const dbEmail = smtpConfig.find(c => c.key_name === 'SMTP_EMAIL')?.key_value;
                        const dbPass = smtpConfig.find(c => c.key_name === 'SMTP_PASSWORD')?.key_value;
                        if (dbEmail) smtpEmail = dbEmail;
                        if (dbPass) smtpPass = dbPass;
                    }

                    if (smtpEmail && smtpPass) {
                        const transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                                user: smtpEmail,
                                pass: smtpPass
                            }
                        });

                        const emailHtml = \`
                            <div style="font-family: sans-serif; padding: 20px; background: #fff8f6; border: 4px solid #261812; color: #261812;">
                                <h2 style="color: #ff6b00; text-transform: uppercase;">STUDIO ACORDE - AVISO DA ESCOLA</h2>
                                <p style="font-size: 16px; font-weight: bold;">\${titulo}</p>
                                <p>\${mensagem}</p>
                                <br/>
                                <a href="https://acordecrm.vercel.app" style="display: inline-block; padding: 15px 30px; background: #ff6b00; color: #fff; text-decoration: none; font-weight: bold; border-radius: 4px; border: 2px solid #261812; box-shadow: 4px 4px 0 #261812;">ACESSAR MEU APLICATIVO</a>
                                <br/><br/>
                                <hr style="border: 1px dashed #7b5647;" />
                                <small style="color: #8e7164;">Esta é uma mensagem automática do Studio Acorde CRM. Não responda este e-mail.</small>
                            </div>
                        \`;

                        await transporter.sendMail({
                            from: \\\`"Studio Acorde" <\${smtpEmail}>\\\`,
                            to: emailTo,
                            subject: titulo,
                            html: emailHtml
                        });
                        console.log('[PUSH_NOTIFICATION] E-mail do Gmail disparado para', emailTo);
                    } else {
                        console.log('[PUSH_NOTIFICATION] SMTP_EMAIL ou SMTP_PASSWORD não configurado no env ou BD. E-mail ignorado.');
                    }
                } catch (emailErr) {
                    console.error('[PUSH_NOTIFICATION] Erro ao enviar E-mail via Nodemailer:', emailErr);
                }
            }`;
        
        content = content.replace(
            /const data = await response\.json\(\);\n\s*console\.log\('\[PUSH_NOTIFICATION\] OneSignal Push enviado com sucesso:', data\);/,
            replacement
        );
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
}

patchFile('api/index.ts');
patchFile('server.ts');
console.log('Patch aplicado!');
