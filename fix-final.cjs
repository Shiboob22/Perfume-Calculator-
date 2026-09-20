const fs = require('fs');
const { execSync } = require('child_process');

const file = './src/components/FragranceBlendCalculator.jsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Clean up the corrupted style syntax containing "Soft"
code = code.replace(/style=\{\{[^}]*Soft[^}]*\}\}/g, 'style={{ color: "#000" }}');
code = code.replace(/Soft/g, '');

// 2. Inject Volume Buttons if not already present
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

if (code.includes(volAnchor) && !code.includes("{[3, 5, 10")) {
  code = code.replace(volAnchor, volPayload);
}

// 3. Inject Concentration Buttons if not already present
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

if (code.includes(concAnchor) && !code.includes("{[20, 25, 30].map")) {
  code = code.replace(concAnchor, concPayload);
}

fs.writeFileSync(file, code);
console.log("🧹 Cleaned syntax error and added buttons successfully!");
