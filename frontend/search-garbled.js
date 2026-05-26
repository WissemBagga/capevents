const fs = require('fs');
const path = require('path');

const dir = './src/app';
const patterns = [/Ã/, /â€™/, /\uFFFD/];

let found = false;

function searchDirectory(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            searchDirectory(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.html') || fullPath.endsWith('.scss') || fullPath.endsWith('.css')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, index) => {
                for (const p of patterns) {
                    if (p.test(line)) {
                        console.log(`${fullPath}:${index + 1}:${line.trim()}`);
                        found = true;
                        break;
                    }
                }
            });
        }
    }
}

searchDirectory(dir);

if (!found) {
    console.log('No garbled text found.');
}
