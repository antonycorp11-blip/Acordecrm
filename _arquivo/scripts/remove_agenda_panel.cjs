const fs = require('fs');
let code = fs.readFileSync('src/pages/Agenda.tsx', 'utf8');

// Remove state
code = code.replace("  const [aulasSemStatus, setAulasSemStatus] = useState<any[]>([]);\n  const [showAulasSemStatus, setShowAulasSemStatus] = useState(false);", "");

// Remove fetch
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
code = code.replace(fetchLogic.trim(), "const fetchAulas = () => {\n    const token = localStorage.getItem('acorde_token');\n    const headers = { Authorization: `Bearer ${token}` };\n    const start = format(getDisplayDate(0), 'yyyy-MM-dd');");

// Remove UI
const uiComponentStart = "{/* CENTRO DE RESOLUÇÕES - AULAS SEM STATUS NO PASSADO */}";
const uiComponentEnd = "{/* CALENDAR CONTAINER */}";

const startIdx = code.indexOf(uiComponentStart);
const endIdx = code.indexOf(uiComponentEnd);

if (startIdx !== -1 && endIdx !== -1) {
    code = code.substring(0, startIdx) + code.substring(endIdx);
}

fs.writeFileSync('src/pages/Agenda.tsx', code);
console.log('Removed AulasSemStatus UI from Agenda.tsx');
