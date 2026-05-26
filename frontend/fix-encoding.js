const fs = require('fs');
const path = require('path');

const dir = './src/app';

const replacements = [
    { from: /Ã©/g, to: 'é' },
    { from: /Ã¨/g, to: 'è' },
    { from: /Ãª/g, to: 'ê' },
    { from: /Ã´/g, to: 'ô' },
    { from: /Ã§/g, to: 'ç' },
    { from: /Ã‰/g, to: 'É' },
    { from: /Ã€/g, to: 'À' },
    { from: /Ã¹/g, to: 'ù' },
    { from: /Ã®/g, to: 'î' },
    { from: /Ã¯/g, to: 'ï' },
    { from: /Ã¢/g, to: 'â' },
    { from: /â€™/g, to: '’' },
    { from: /â€œ/g, to: '“' },
    { from: /â€\u009D/g, to: '”' }, // sometimes it's â€
    { from: /â€"/g, to: '”' },
    { from: /â€“/g, to: '–' },
    { from: /â€”/g, to: '—' },
    { from: /Â\s/g, to: ' ' },
    { from: /Â/g, to: '' },
    { from: /Ã\s/g, to: 'à ' } // "Ã -> à lorsque le contexte correspond à 'à'"
];

function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.html') || fullPath.endsWith('.scss') || fullPath.endsWith('.css')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let original = content;
            
            for (const r of replacements) {
                content = content.replace(r.from, r.to);
            }
            
            if (content !== original) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Fixed encoding in ${fullPath}`);
            }
        }
    }
}

processDirectory(dir);
