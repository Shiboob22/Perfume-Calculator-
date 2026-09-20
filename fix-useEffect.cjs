const fs = require('fs');

const potentialPaths = [
  './src/App.jsx',
  './src/App.tsx',
  './src/main.jsx',
  './src/main.tsx'
];

let targetFile = potentialPaths.find(p => fs.existsSync(p));
if (!targetFile) {
  console.log("❌ Could not locate App entry file.");
  process.exit(1);
}

let code = fs.readFileSync(targetFile, 'utf8');

// Ensure React hooks are imported properly
if (!code.includes('useEffect')) {
  code = code.replace(/import\s+React[^\n]*\n/, (match) => {
    return match.includes('{') 
      ? match.replace('}', ', useEffect }')
      : "import React, { useEffect } from 'react';\n";
  });
  if (!code.includes('useEffect')) {
    code = "import { useEffect } from 'react';\n" + code;
  }
}

fs.writeFileSync(targetFile, code);
console.log("✅ Added missing useEffect import.");
