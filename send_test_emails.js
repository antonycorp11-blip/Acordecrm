import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      'x-backend-secret': 'studio-acorde-secret-key-2024'
    }
  }
});

async function run() {
    console.log("Fetching professors...");
    const { data: professores, error } = await supabase.from('professores').select('nome, email').not('email', 'is', null).neq('email', '');
    
    if (error) {
        console.error("Error fetching professors:", error);
        return;
    }

    console.log(`Found ${professores.length} professors with email.`);

    const { data: smtpConfig } = await supabase.from('system_config').select('key_name, key_value').in('key_name', ['SMTP_EMAIL', 'SMTP_PASSWORD']);
    let smtpEmail = process.env.SMTP_EMAIL;
    let smtpPass = process.env.SMTP_PASSWORD;

    if (smtpConfig) {
        const dbEmail = smtpConfig.find(c => c.key_name === 'SMTP_EMAIL')?.key_value;
        const dbPass = smtpConfig.find(c => c.key_name === 'SMTP_PASSWORD')?.key_value;
        if (dbEmail) smtpEmail = dbEmail;
        if (dbPass) smtpPass = dbPass;
    }

    if (!smtpEmail || !smtpPass) {
        console.error("Missing SMTP configuration!");
        return;
    }

    console.log("SMTP Auth fetched successfully.");

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: smtpEmail,
            pass: smtpPass
        }
    });

    for (const prof of professores) {
        if (!prof.email) continue;
        const titulo = 'Teste de Sistema - Studio Acorde';
        const mensagem = `Olá ${prof.nome}, este é um e-mail de teste disparado pelo sistema de agendamento do Studio Acorde para verificar o recebimento das notificações. Se você recebeu isso, nosso sistema de e-mails está funcionando perfeitamente!`;
        
        const emailHtml = `
            <div style="font-family: sans-serif; padding: 20px; background: #fff8f6; border: 4px solid #261812; color: #261812;">
                <h2 style="color: #ff6b00; text-transform: uppercase;">STUDIO ACORDE - AVISO DA ESCOLA</h2>
                <p style="font-size: 16px; font-weight: bold;">${titulo}</p>
                <p>${mensagem}</p>
                <br/>
                <hr style="border: 1px dashed #7b5647;" />
                <small style="color: #8e7164;">Esta é uma mensagem automática do Studio Acorde CRM. Não responda este e-mail.</small>
            </div>
        `;

        try {
            await transporter.sendMail({
                from: `"Studio Acorde" <${smtpEmail}>`,
                to: prof.email,
                subject: titulo,
                html: emailHtml
            });
            console.log(`Email sent successfully to ${prof.nome} (${prof.email})`);
        } catch (e) {
            console.error(`Failed to send email to ${prof.email}:`, e.message);
        }
    }
    
    console.log("All done.");
}

run();
