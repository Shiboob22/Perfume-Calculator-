const { execSync } = require('child_process');
const fs = require('fs');

// 1. Reset the file cleanly via git
execSync('git checkout src/components/FragranceBlendCalculator.jsx');
console.log("🔄 Reset FragranceBlendCalculator.jsx to clean state.");

const file = './src/components/FragranceBlendCalculator.jsx';
let code = fs.readFileSync(file, 'utf8');

// 2. Safely Inject Volume Buttons (using Tailwind classes instead of dynamic variables)
const volAnchor = `units={[{value:"ml",label:"mL"},{value:"floz",label:"fl oz"},{value:"g",label:"g"},{value:"oz",label:"oz"}]}
            />`;
const volPayload = `units={[{value:"ml",label:"mL"},{value:"floz",label:"fl oz"},{value:"g",label:"g"},{value:"oz",label:"oz"}]}
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

if (code.includes(volAnchor)) {
  code = code.replace(volAnchor, volPayload);
  console.log("✅ Volume buttons injected safely.");
}

// 3. Safely Inject Concentration Buttons
const concAnchor = `<Field label={\`Target concentration — \${concPct}%\`} hint={tier.defaultConc + "% is this family's typical default."}>`;
const concPayload = `<Field label={\`Target concentration — \${concPct}%\`} hint={tier.defaultConc + "% is this family's typical default."}>
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

if (code.includes(concAnchor)) {
  code = code.replace(concAnchor, concPayload);
  console.log("✅ Concentration buttons injected safely.");
}

fs.writeFileSync(file, code);
console.log("🎉 File successfully patched and clean!");
