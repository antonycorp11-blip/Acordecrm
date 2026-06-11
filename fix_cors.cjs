const fs = require('fs');

let code = fs.readFileSync('api/index.ts', 'utf8');

const regex = /'X-Upload-Content-Type': mimeType\n\s*\},\n\s*body: JSON\.stringify\(metadata\)\n\s*\}\);/;

const addition = `'X-Upload-Content-Type': mimeType,
                    'Origin': req.headers.origin || 'https://acordecrm.vercel.app'
                },
                body: JSON.stringify(metadata)
            });`;

if (code.match(regex)) {
    code = code.replace(regex, addition);
    fs.writeFileSync('api/index.ts', code);
    console.log("CORS header added to Drive POST request");
} else {
    console.log("Regex not matched");
}

