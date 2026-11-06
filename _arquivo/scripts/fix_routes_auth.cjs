const fs = require('fs');

function fixFile(file) {
    let code = fs.readFileSync(file, 'utf-8');

    // Mover o bloco de template para DEPOIS do middleware de segurança
    const templateRegex = /\/\/ --- CONTRATOS ---[\s\S]*?\}\);\n/g;
    let templateBlock = "";
    code = code.replace(templateRegex, (match) => {
        templateBlock = match;
        return "";
    });

    const targetAPI = `    // --- API ROUTES ---`;
    code = code.replace(targetAPI, targetAPI + "\n" + templateBlock);
    
    fs.writeFileSync(file, code);
    console.log(`Fixed auth for ${file}`);
}

fixFile('server.ts');
fixFile('api/index.ts');
