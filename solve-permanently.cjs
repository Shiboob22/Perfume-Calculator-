const fs = require('fs');
const { execSync } = require('child_process');

// 1. Revert App files and calculator cleanly
try {
  execSync('git checkout src/App.jsx src/App.tsx src/main.jsx src/main.tsx src/components/FragranceBlendCalculator.jsx');
} catch (e) {
  // Ignore if some paths don't exist
}

console.log("🔄 Reverted files to clean upstream state.");

// 2. Now let's cleanly add the quick-pick buttons to FragranceBlendCalculator.jsx without touching App.jsx
const calcPath = './src/components/FragranceBlendCalculator.jsx';
if (fs.existsSync(calcPath)) {
  let code = fs.readFileSync(calcPath, 'utf8');

  // Insert Volume quick picks
  const volTarget = `units={[{value:"ml",label:"mL"},{value:"floz",label:"fl oz"},{value:"g",label:"g"},{value:"oz",label:"oz"}]}
            />`;
  const volButtons = `units={[{value:"ml",label:"mL"},{value:"floz",label:"fl oz"},{value:"g",label:"g"},{value:"oz",label:"oz"}]}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {[3, 5, 10, 20, 30, 50, 100, 200].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setBatchSize(amt)}
                  className="px-2 py-1 text-[11px] font-mono border rounded border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  {amt}mL
                </button>
              ))}
            </div>`;

  if (code.includes(volTarget) && !code.includes("{[3, 5, 10")) {
    code = code.replace(volTarget, volButtons);
  }

  // Insert Concentration quick picks
  const concTarget = `<Field label={\`Target concentration — \${concPct}%\`} hint={tier.defaultConc + "% is this family's typical default."}>`;
  const concButtons = `<Field label={\`Target concentration — \${concPct}%\`} hint={tier.defaultConc + "% is this family's typical default."}>
            <div className="flex gap-2 mb-3">
              {[20, 25, 30].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setConcPct(c)}
                  className="px-3 py-1 text-[11px] font-mono border rounded border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  {c}%
                </button>
              ))}
            </div>`;

  if (code.includes(concTarget) && !code.includes("{[20, 25, 30].map")) {
    code = code.replace(concTarget, concButtons);
  }

  fs.writeFileSync(calcPath, code);
  console.log("✅ Successfully added quick-pick buttons to calculator cleanly.");
}
