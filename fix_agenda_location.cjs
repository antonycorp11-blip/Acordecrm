const fs = require('fs');
let code = fs.readFileSync('src/pages/Agenda.tsx', 'utf8');

if (!code.includes('useLocation')) {
  code = code.replace("import { useNavigate }", "import { useNavigate, useLocation }");
}

code = code.replace(/const navigate = useNavigate\(\);/g, "const navigate = useNavigate();\n  const location = useLocation();\n\n  useEffect(() => {\n    if (location.state?.rescheduleAula) {\n      setReschedulingAula(location.state.rescheduleAula);\n      window.history.replaceState({}, document.title);\n    }\n  }, [location.state]);\n");

fs.writeFileSync('src/pages/Agenda.tsx', code);
console.log('Fixed Agenda location!');
