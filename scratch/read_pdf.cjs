const fs = require('fs');
const pdfParse = require('pdf-parse');
pdfParse(fs.readFileSync('download.pdf')).then((data) => console.log(data.text));
