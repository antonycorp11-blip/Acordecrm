const fs = require('fs');
let code = fs.readFileSync('src/pages/Reposicoes.tsx', 'utf8');

if (!code.includes('useNavigate')) {
  code = code.replace("import { Calendar, Clock, RefreshCcw, User } from 'lucide-react';", "import { Calendar, Clock, RefreshCcw, User } from 'lucide-react';\nimport { useNavigate } from 'react-router-dom';");
}

code = code.replace("export function Reposicoes() {", "export function Reposicoes() {\n  const navigate = useNavigate();");

code = code.replace(/toast\('Em breve: Reagendamento direto por aqui!', \{ icon: '🚧' \}\)/g, "navigate('/agenda', { state: { rescheduleAula: aula } })");

fs.writeFileSync('src/pages/Reposicoes.tsx', code);
console.log('Fixed Reposicoes navigation!');
