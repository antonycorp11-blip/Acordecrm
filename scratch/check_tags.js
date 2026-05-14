
import fs from 'fs';

const content = fs.readFileSync('src/pages/Atendimento.tsx', 'utf8');
const lines = content.split('\n');

let stack = [];
let inTag = false;
let tagBuffer = '';

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let j = 0;
    while (j < line.length) {
        if (line[j] === '<' && line[j+1] !== ' ' && line[j+1] !== '!' && line[j+1] !== '{') {
            inTag = true;
            tagBuffer = '';
            j++;
            continue;
        }
        if (inTag) {
            if (line[j] === ' ' || line[j] === '>' || line[j] === '/') {
                if (tagBuffer.length > 0) {
                    if (tagBuffer.startsWith('/')) {
                        const closing = tagBuffer.substring(1);
                        const opening = stack.pop();
                        if (opening !== closing) {
                            console.log(`Mismatch at line ${i+1}: expected </${opening}>, found </${closing}>`);
                            // return;
                        }
                    } else if (line[j] === '/' && line[j+1] === '>') {
                        // Self-closing
                        j++;
                    } else if (line[j] === '>') {
                        stack.push(tagBuffer);
                    } else {
                        // Attribute or something, but we have the tag name
                        let k = j;
                        while(k < line.length && line[k] !== '>') {
                            if (line[k] === '/' && line[k+1] === '>') {
                                // Self-closing
                                break;
                            }
                            k++;
                        }
                        if (line[k] === '/' && line[k+1] === '>') {
                             // Self closing
                        } else {
                             stack.push(tagBuffer);
                        }
                        j = k;
                    }
                }
                inTag = false;
            } else {
                tagBuffer += line[j];
            }
        }
        j++;
    }
}

console.log('Final stack:', stack);
