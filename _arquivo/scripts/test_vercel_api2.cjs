require('dotenv').config();
const jwt = require('jsonwebtoken');

async function run() {
    const token = jwt.sign({ id: 1, email: 'admin@acorde.com', role: 'admin' }, process.env.JWT_SECRET || 'studio-acorde-secret-key-2024');
    
    const res = await fetch("https://acordecrm.vercel.app/api/pagamentos?mes=06/2026&desconto_dia_10=true", {
        headers: {
            "Authorization": "Bearer " + token
        }
    });
    const data = await res.json();
    const anna = data.find(p => p.aluno_nome && p.aluno_nome.includes("ANNA SOFIA"));
    console.log("Anna Sofia in API:", anna);
}
run();
