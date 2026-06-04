const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("import { Reposicoes } from './pages/Reposicoes';")) {
    code = code.replace("import { Dashboard } from './pages/Dashboard';", "import { Dashboard } from './pages/Dashboard';\nimport { Reposicoes } from './pages/Reposicoes';");
    code = code.replace("<Route path=\"/migracao\" element={<Migracao />} />", "<Route path=\"/migracao\" element={<Migracao />} />\n                <Route path=\"/reposicoes\" element={<Reposicoes />} />");
    fs.writeFileSync('src/App.tsx', code, 'utf8');
}
