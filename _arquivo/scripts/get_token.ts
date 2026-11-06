import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const secret = process.env.JWT_SECRET || 'studio-acorde-secret-key-2024';
const token = jwt.sign({ id: 1, email: 'admin@studio.com', role: 'admin' }, secret, { expiresIn: '1h' });

async function run() {
    const res = await fetch('https://acordecrm.vercel.app/api/gamificacao/conquistas', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log("Vercel returned:", data);
}
run();
