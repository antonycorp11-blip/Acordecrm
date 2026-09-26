const fs = require('fs');
let code = fs.readFileSync('src/pages/AlunoPerfil.tsx', 'utf8');

// Add state
code = code.replace(/const \[materiais, setMateriais\] = useState<any\[\]>\(\[\]\);/g, "const [materiais, setMateriais] = useState<any[]>([]);\n  const [professores, setProfessores] = useState<any[]>([]);");

// Add fetch
code = code.replace(/const fetchDados = async \(\) => \{/g, "const fetchDados = async () => {\n    const token = localStorage.getItem('acorde_token');\n    fetch('/api/professores', { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json()).then(data => setProfessores(Array.isArray(data) ? data : [])).catch(console.error);");

fs.writeFileSync('src/pages/AlunoPerfil.tsx', code);
