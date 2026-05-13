import fs from 'fs';
import pdfParse from 'pdf-parse';
pdfParse(fs.readFileSync('download.pdf')).then(data => console.log(data.text));
