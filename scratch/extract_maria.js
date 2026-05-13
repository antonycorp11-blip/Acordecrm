import fs from 'fs';
import { PDFParse } from '../node_modules/pdf-parse/dist/pdf-parse/esm/index.js';

async function extract() {
    try {
        const filePath = './MARIA CLARA.pdf';
        let buffer = fs.readFileSync(filePath);
        
        // Fix the corrupted header if 'COLO' is there
        if (buffer.toString('utf8', 0, 4) === 'COLO') {
            buffer = buffer.subarray(4);
        }

        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        fs.writeFileSync('./MARIA_CLARA_EXTRACTED.txt', result.text);
        console.log('Text extracted to MARIA_CLARA_EXTRACTED.txt');
    } catch (e) {
        console.error('Error:', e);
    }
}

extract();
