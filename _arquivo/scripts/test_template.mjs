import 'dotenv/config';
import jwt from 'jsonwebtoken';

const token = jwt.sign({ id: 1, email: 'admin@studioacorde.com', role: 'admin' }, process.env.JWT_SECRET || 'studio-acorde-secret-key-2024');

async function test() {
    try {
        const res = await fetch('https://acordecrm.vercel.app/api/contratos/template', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const text = await res.text();
        console.log("Status:", res.status);
        console.log("Body:", text);
    } catch(e) {
        console.error(e);
    }
}
test();
