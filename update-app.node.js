const fs = require('fs');
const path = './src/App.tsx';

if (fs.existsSync(path)) {
  let content = fs.readFileSync(path, 'utf8');

  // Add import if missing
  if (!content.includes('FragranceAutocomplete')) {
    content = `import { FragranceAutocomplete } from './components/FragranceAutocomplete';\n` + content;
  }

  fs.writeFileSync(path, content, 'utf8');
  console.log('App.tsx import updated successfully.');
} else {
  console.log('App.tsx not found in src/');
}
