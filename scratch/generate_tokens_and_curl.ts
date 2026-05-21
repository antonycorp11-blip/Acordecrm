import jwt from 'jsonwebtoken';
import { execSync } from 'child_process';

const JWT_SECRET = 'studio-acorde-secret-key-2024';

const testUsers = [
    { id: 11, email: 'ta@ta.com', role: 'aluno', name: 'Jadna' },
    { id: 10, email: 'guilhermenunes0412@gmail.com', role: 'aluno', name: 'Guilherme' }
];

async function run() {
    for (const u of testUsers) {
        console.log(`\n========================================`);
        console.log(`Testando para o aluno: ${u.name} (${u.email})`);
        
        // Gerar Token
        const token = jwt.sign({ id: u.id, email: u.email, role: u.role }, JWT_SECRET, { expiresIn: '7d' });
        console.log(`Token gerado: ${token}`);
        
        // Curl para /api/alunos/me na Vercel
        console.log(`\n--- Chamando /api/alunos/me na Vercel ---`);
        try {
            const resMe = execSync(`curl -s -w "\\n%{http_code}" -H "Authorization: Bearer ${token}" "https://acordecrm.vercel.app/api/alunos/me"`).toString();
            console.log(resMe);
        } catch (err: any) {
            console.error(`Erro no curl me:`, err.message);
        }
        
        // Curl para /api/agenda na Vercel
        console.log(`\n--- Chamando /api/agenda na Vercel ---`);
        try {
            const resAgenda = execSync(`curl -s -w "\\n%{http_code}" -H "Authorization: Bearer ${token}" "https://acordecrm.vercel.app/api/agenda"`).toString();
            console.log(resAgenda.substring(0, 1000)); // Limita a visualização
            if (resAgenda.length > 1000) console.log('... (truncado)');
        } catch (err: any) {
            console.error(`Erro no curl agenda:`, err.message);
        }
    }
}

run();
