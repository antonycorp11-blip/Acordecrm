const fs = require('fs');

function patch(filePath) {
    let code = fs.readFileSync(filePath, 'utf8');

    // 1. Injetar utils getDateBR e express-rate-limit no topo
    if (!code.includes('function getDateBR(')) {
        const importsStr = `import rateLimit from 'express-rate-limit';\n\nfunction getDateBR() {\n    return new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-');\n}\n`;
        code = code.replace("import nodemailer from 'nodemailer';", "import nodemailer from 'nodemailer';\n" + importsStr);
    }

    // 2. Configurar Rate Limit logo após a criação do app
    if (!code.includes('rateLimit({')) {
        const rateLimitMiddleware = `
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 200, // Limite de 200 requisições por minuto por IP
  message: { error: 'Muitas requisições deste IP. Tente novamente em um minuto.' }
});
app.use('/api', limiter);
`;
        code = code.replace("app.use('/api', authenticate);", rateLimitMiddleware + "\napp.use('/api', authenticate);");
    }

    // 3. Substituir new Date().toISOString().split('T')[0] por getDateBR()
    code = code.replace(/new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]/g, "getDateBR()");

    // 4. Transformar transporter.sendMail em uma Promise com Timeout de 5s para evitar crash
    const oldSendMail = `await transporter.sendMail({
                            from: \`"Studio Acorde" <\${smtpEmail}>\`,
                            to: emailTo,
                            subject: titulo,
                            html: emailHtml
                        });`;
    
    const newSendMail = `await Promise.race([
                            transporter.sendMail({
                                from: \`"Studio Acorde" <\${smtpEmail}>\`,
                                to: emailTo,
                                subject: titulo,
                                html: emailHtml
                            }),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP Timeout - Email cancelado mas API continua')), 5000))
                        ]).catch(e => console.error('[SMTP_TIMEOUT_HANDLED]', e.message));`;
    
    // Tentar substituir (pode variar por causa de espaços, então uso regex ou string exata se possivel)
    code = code.split(oldSendMail).join(newSendMail);

    // 5. Adicionar Middleware Global de Erros no final das rotas, antes de app.get('*')
    if (!code.includes('Erro Interno do Servidor (Global Handler)')) {
        const globalError = `
    // Error Handler Global
    app.use((err: any, req: any, res: any, next: any) => {
        console.error('[GLOBAL_ERROR]', err);
        res.status(500).json({ error: 'Erro Interno do Servidor (Global Handler)' });
    });
`;
        code = code.replace("// Serve front-end", globalError + "\n    // Serve front-end");
    }

    fs.writeFileSync(filePath, code, 'utf8');
}

patch('server.ts');
patch('api/index.ts');
console.log('Patch concluido!');
