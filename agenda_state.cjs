const fs = require('fs');
let code = fs.readFileSync('src/pages/Agenda.tsx', 'utf8');

// Add state
code = code.replace("const [cancelModalAula, setCancelModalAula] = useState<any>(null);", "const [cancelModalAula, setCancelModalAula] = useState<any>(null);\n  const [aulasSemStatus, setAulasSemStatus] = useState<any[]>([]);\n  const [showAulasSemStatus, setShowAulasSemStatus] = useState(false);");

// Add fetch inside fetchAulas
const fetchLogic = `
    const fetchAulas = () => {
    const token = localStorage.getItem('acorde_token');
    const headers = { Authorization: \`Bearer \${token}\` };

    // Fetch aulas sem status
    fetch('/api/agenda/pendentes-passado', { headers })
      .then(res => res.json())
      .then(data => setAulasSemStatus(data))
      .catch(console.error);

    const start = format(getDisplayDate(0), 'yyyy-MM-dd');
`;

code = code.replace(/const fetchAulas = \(\) => \{\n    const token = localStorage.getItem\('acorde_token'\);\n    const headers = \{ Authorization: `Bearer \$\{token\}` \};\n    const start = format\(getDisplayDate\(0\), 'yyyy-MM-dd'\);/g, fetchLogic.trim());

fs.writeFileSync('src/pages/Agenda.tsx', code);
console.log('Added state and fetch logic to Agenda.tsx');
