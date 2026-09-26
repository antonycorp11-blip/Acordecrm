const fs = require('fs');
const babel = require('@babel/core');

const code = fs.readFileSync('src/pages/AreaAluno.tsx', 'utf8');

try {
  babel.parse(code, {
    presets: ['@babel/preset-react', '@babel/preset-typescript'],
    filename: 'AreaAluno.tsx'
  });
  console.log("No syntax errors found by Babel.");
} catch (err) {
  console.error("Syntax Error found!");
  console.error(err.message);
  
  // Extract lines around the error
  if (err.loc) {
     const lines = code.split('\n');
     const lineStart = Math.max(0, err.loc.line - 10);
     const lineEnd = Math.min(lines.length, err.loc.line + 10);
     console.log("Context:");
     for (let i = lineStart; i < lineEnd; i++) {
        console.log(`${i+1}: ${lines[i]}`);
     }
  }
}
