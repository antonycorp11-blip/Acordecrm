const fs = require('fs');
let code = fs.readFileSync('src/pages/AlunoPerfil.tsx', 'utf8');

code = code.replace(/new Date\(a\.data \+ 'T23:59:59'\)/g, "new Date((a.data + 'T23:59:59').replace(/-/g, '/').replace('T', ' '))");
code = code.replace(/new Date\(\(a\.data \|\| '2099-12-31'\) \+ 'T12:00:00'\)/g, "new Date(((a.data || '2099-12-31') + 'T12:00:00').replace(/-/g, '/').replace('T', ' '))");
code = code.replace(/new Date\(\(b\.data \|\| '2099-12-31'\) \+ 'T12:00:00'\)/g, "new Date(((b.data || '2099-12-31') + 'T12:00:00').replace(/-/g, '/').replace('T', ' '))");
code = code.replace(/new Date\(aula\.data \+ 'T12:00:00'\)/g, "new Date((aula.data + 'T12:00:00').replace(/-/g, '/').replace('T', ' '))");
code = code.replace(/new Date\(r\.data \+ 'T12:00:00'\)/g, "new Date((r.data + 'T12:00:00').replace(/-/g, '/').replace('T', ' '))");
code = code.replace(/new Date\(da\.data \+ 'T12:00:00'\)/g, "new Date((da.data + 'T12:00:00').replace(/-/g, '/').replace('T', ' '))");
code = code.replace(/new Date\(prox\.data \+ 'T12:00:00'\)/g, "new Date((prox.data + 'T12:00:00').replace(/-/g, '/').replace('T', ' '))");
code = code.replace(/new Date\(proxData \+ 'T12:00:00'\)/g, "new Date((proxData + 'T12:00:00').replace(/-/g, '/').replace('T', ' '))");
code = code.replace(/new Date\(proxAulas\[0\]\.data \+ 'T12:00:00'\)/g, "new Date((proxAulas[0].data + 'T12:00:00').replace(/-/g, '/').replace('T', ' '))");

fs.writeFileSync('src/pages/AlunoPerfil.tsx', code);
