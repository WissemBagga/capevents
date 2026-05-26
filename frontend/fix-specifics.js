const fs = require('fs');

// Fix admin-stats.ts
let adminStatsPath = './src/app/features/admin/analytics/admin-stats/admin-stats.ts';
let content = fs.readFileSync(adminStatsPath, 'utf8');
content = content.replace(/Département:\s*item\.departmentName/g, "'Département': item.departmentName");
content = content.replace(/Présents:\s*item\.presentCount/g, "'Présents': item.presentCount");
content = content.replace(/Inscrits:\s*item\.registeredCount/g, "'Inscrits': item.registeredCount");
fs.writeFileSync(adminStatsPath, content, 'utf8');
console.log('Checked admin-stats.ts');

// Fix register.ts regexes
let registerPath = './src/app/features/auth/register/register.ts';
let regContent = fs.readFileSync(registerPath, 'utf8');
regContent = regContent.replace(/\/^\[A-Za-zÀ-ÿ\]\[A-Za-zÀ-ÿ' -\]\*\$\//g, "/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]*$/");
regContent = regContent.replace(/\/^\[A-Za-zÃ€-Ã¿\]\[A-Za-zÃ€-Ã¿' -\]\*\$\//g, "/^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ' -]*$/");
fs.writeFileSync(registerPath, regContent, 'utf8');
console.log('Checked register.ts');

// Fix settings-hub.ts
let settingsHubPath = './src/app/features/account/settings/settings-hub/settings-hub.ts';
let setContent = fs.readFileSync(settingsHubPath, 'utf8');
setContent = setContent.replace(/DÃ©partements/g, "Départements");
setContent = setContent.replace(/Utilisateurs & rÃ´les/g, "Utilisateurs & rôles");
setContent = setContent.replace(/Mes intÃ©rÃªts/g, "Mes intérêts");
setContent = setContent.replace(/GÃ©rez/g, "Gérez");
setContent = setContent.replace(/dÃ©partements/g, "départements");
setContent = setContent.replace(/rÃ´les/g, "rôles");
setContent = setContent.replace(/accÃ¨s/g, "accès");
setContent = setContent.replace(/dâ€™intÃ©rÃªt/g, "d’intérêt");
setContent = setContent.replace(/amÃ©liorer/g, "améliorer");
setContent = setContent.replace(/Mettez Ã  jour/g, "Mettez à jour");
setContent = setContent.replace(/prÃ©fÃ©rences/g, "préférences");
setContent = setContent.replace(/sÃ©curitÃ©/g, "sécurité");
fs.writeFileSync(settingsHubPath, setContent, 'utf8');
console.log('Checked settings-hub.ts');
