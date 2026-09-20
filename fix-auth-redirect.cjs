const fs = require('fs');

// Look for App.jsx or main.jsx or wherever Supabase auth state is handled
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
console.log(`📂 Inspecting ${targetFile}...`);

// Inject a check to clean up the Supabase hash redirect if it gets stuck
const authFixSnippet = `
  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);
`;

if (!code.includes('access_token')) {
  // Try to insert it right inside the main App component or useEffect
  code = code.replace(/function App\s*\([^)]*\)\s*\{/, (match) => {
    return match + `\n  useEffect(() => {\n    if (window.location.hash && window.location.hash.includes('access_token')) {\n      window.history.replaceState(null, '', window.location.pathname);\n    }\n  }, []);\n`;
  });
  fs.writeFileSync(targetFile, code);
  console.log("✅ Added hash-clearing cleanup for Supabase redirect.");
} else {
  console.log("ℹ️ Hash handling already present or skipped.");
}

