import fs from 'fs';
import pdfParse from 'pdf-parse';
pdfParse(fs.readFileSync('download.pdf')).then((data: any) => console.log(data.text));
