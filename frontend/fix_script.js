const fs = require('fs');
const path = require('path');

const sharedDirectivePath = 'src/app/shared/directives/scroll-to-message.directive';

function getRelativePath(fromPath, toPath) {
    const fromDir = path.dirname(fromPath);
    let rel = path.relative(fromDir, toPath);
    if (!rel.startsWith('.')) {
        rel = './' + rel;
    }
    return rel.replace(/\\/g, '/');
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('@shared/directives/scroll-to-message.directive')) {
                const relPath = getRelativePath(fullPath, sharedDirectivePath);
                content = content.replace(/'@shared\/directives\/scroll-to-message.directive'/g, `'${relPath}'`);
                content = content.replace(/"@shared\/directives\/scroll-to-message.directive"/g, `"${relPath}"`);
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath} with relative path ${relPath}`);
            }
        }
    }
}

processDirectory(path.join(__dirname, 'src'));

const tsconfigFiles = ['tsconfig.json', 'tsconfig.app.json', 'tsconfig.spec.json'];
for (const file of tsconfigFiles) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        content = content.replace(/"ignoreDeprecations":\s*"6\.0",?\s*/g, '');
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${file}`);
    }
}
