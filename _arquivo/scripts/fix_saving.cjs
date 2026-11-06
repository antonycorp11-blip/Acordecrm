const fs = require('fs');

let code = fs.readFileSync('src/pages/AlunoPerfil.tsx', 'utf8');

const regex = /const \[showAgendaList, setShowAgendaList\] = useState\(false\);/;
const replacement = `const [showAgendaList, setShowAgendaList] = useState(false);
  const [saving, setSaving] = useState(false);`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/pages/AlunoPerfil.tsx', code);
console.log("Added saving state");
