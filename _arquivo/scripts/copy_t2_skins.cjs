const fs = require('fs');
const path = require('path');

const srcDir = __dirname;
const targetDir = path.join(__dirname, 'public', 'assets', 'avatars', 't2');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const filesToCopy = [
  'epic.png',
  'epic1.png',
  'epic6.png',
  'epic7.png',
  'legendary.png',
  'legendary1.png',
  'raro.png',
  'raro1.png',
  'raro3.png',
  'raro5.png'
];

let copied = 0;
filesToCopy.forEach(file => {
  const srcPath = path.join(srcDir, file);
  const destPath = path.join(targetDir, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    copied++;
    console.log(`Copied ${file} -> ${destPath}`);
  } else {
    console.warn(`File not found: ${srcPath}`);
  }
});

console.log(`Total T2 skin files copied: ${copied}`);
