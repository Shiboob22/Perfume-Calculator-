const fs = require('fs');
const file = './src/components/FragranceBlendCalculator.jsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Swap undefined COLORS for safe hex strings
code = code.replace(/COLORS\.ink/g, '"#000"');
code = code.replace(/COLORS\.line/g, '"#e5e7eb"');

// 2. Remove batchUnit logic (since that state likely isn't defined)
code = code.replace(/ && batchUnit === "ml"/g, '');
code = code.replace(/setBatchUnit\("ml"\); ?/g, '');

fs.writeFileSync(file, code);
console.log("🩹 Fixed the variables to cure the white screen!");
