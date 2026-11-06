const fs = require('fs');

function fix(file) {
    let code = fs.readFileSync(file, 'utf-8');

    // 1. Remove public contrato block (if exists)
    const publicContratoRegex = /\/\/ --- ROTAS PÚBLICAS \(ASSINATURA DE CONTRATOS\) ---[\s\S]*?(?=\/\/ --- SEGURANÇA ---)/;
    let publicBlock = "";
    code = code.replace(publicContratoRegex, (match) => {
        publicBlock = match.replace('// --- ROTAS PÚBLICAS (ASSINATURA DE CONTRATOS) ---', '').trim();
        return "";
    });

    // 2. Remove any other occurrences of /api/contratos/:id
    const idGetRegex = /app\.get\('\/api\/contratos\/:id'[\s\S]*?\}\);/g;
    const idPostRegex = /app\.post\('\/api\/contratos\/:id\/assinar'[\s\S]*?\}\);/g;
    
    // Extract them if they weren't in the public block
    if (!publicBlock) {
        code = code.replace(idGetRegex, (m) => { publicBlock += m + "\n\n"; return ""; });
        code = code.replace(idPostRegex, (m) => { publicBlock += m + "\n\n"; return ""; });
    }

    // 3. Insert publicBlock AFTER the template and enviar routes
    const insertAfter = `res.status(500).json({ error: error.message });\n        }\n    });`;
    // We'll find the last one (enviar) by just replacing a known pattern in the "enviar" route block
    const enviarEnd = `        } catch (error: any) {\n            console.error('Erro enviar contrato:', error);\n            res.status(500).json({ error: error.message });\n        }\n    });`;
    
    code = code.replace(enviarEnd, enviarEnd + "\n\n    " + publicBlock);

    // 4. Update authenticateToken
    const authLine = `if (publicRoutes.includes(req.path)) return next();`;
    const newAuthLine = `const isPublicContrato = req.path.match(/^\\/api\\/contratos\\/[0-9a-fA-F-]+(\\/assinar)?$/);
    if (publicRoutes.includes(req.path) || isPublicContrato) return next();`;
    code = code.replace(authLine, newAuthLine);

    // Also remove the "app.get('/api/contratos/template', ...)" that was somehow injected incorrectly earlier if it exists twice
    // (We will rely on the clean one from 90fcdb9)
    
    fs.writeFileSync(file, code);
    console.log(`Fixed ${file}`);
}

fix('server.ts');
fix('api/index.ts');
