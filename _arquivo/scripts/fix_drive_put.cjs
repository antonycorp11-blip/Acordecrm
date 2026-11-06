const fs = require('fs');

let apiCode = fs.readFileSync('api/index.ts', 'utf8');
apiCode = apiCode.replace(/res\.json\(\{ uploadUrl: resumableUrl \}\);/, "res.json({ uploadUrl: resumableUrl, accessToken: token.token });");
fs.writeFileSync('api/index.ts', apiCode);

let frontendCode = fs.readFileSync('src/pages/AreaAluno.tsx', 'utf8');
frontendCode = frontendCode.replace(/const \{ uploadUrl \} = await urlRes\.json\(\);/, "const { uploadUrl, accessToken } = await urlRes.json();");

const fetchRegex = /const driveRes = await fetch\(uploadUrl, \{\n\s*method: 'PUT',\n\s*body: videoBlob,\n\s*headers: \{ 'Content-Type': mime \}\n\s*\}\);/;
const fetchReplacement = `const driveRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: videoBlob,
          headers: { 
              'Content-Type': mime,
              'Authorization': \`Bearer \${accessToken}\`
          }
      });`;
frontendCode = frontendCode.replace(fetchRegex, fetchReplacement);
fs.writeFileSync('src/pages/AreaAluno.tsx', frontendCode);

console.log("Token added to frontend request!");
