const fs = require('fs');
const file = './src/components/FragranceBlendCalculator.jsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Inject Volume Buttons
const volAnchor = `units={[{value:"ml",label:"mL"},{value:"floz",label:"fl oz"},{value:"g",label:"g"},{value:"oz",label:"oz"}]}
            />`;
const volPayload = `units={[{value:"ml",label:"mL"},{value:"floz",label:"fl oz"},{value:"g",label:"g"},{value:"oz",label:"oz"}]}
            />
            <div className="flex flex-wrap gap-2 mt-3">
              {[3, 5, 10, 20, 30, 50, 100, 200].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => { setBatchSize(amt); setBatchUnit("ml"); }}
                  className="px-2 py-1 text-[11px] font-mono border transition-opacity"
                  style={{ 
                    borderColor: Number(batchSize) === amt && batchUnit === "ml" ? COLORS.ink : COLORS.line, 
                    color: Number(batchSize) === amt && batchUnit === "ml" ? "#fff" : COLORS.ink, 
                    backgroundColor: Number(batchSize) === amt && batchUnit === "ml" ? COLORS.ink : "#fff" 
                  }}
                >
                  {amt}mL
                </button>
              ))}
            </div>`;

if (code.includes(volAnchor) && !code.includes("{[3, 5, 10")) {
  code = code.replace(volAnchor, volPayload);
  console.log("✅ Volume buttons (incl 3ml) injected.");
}

// 2. Inject Concentration Buttons
const concAnchor = `<Field label={\`Target concentration — \${concPct}%\`} hint={tier.defaultConc + "% is this family's typical default."}>`;
const concPayload = `<Field label={\`Target concentration — \${concPct}%\`} hint={tier.defaultConc + "% is this family's typical default."}>
            <div className="flex gap-2 mb-3">
              {[20, 25, 30].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setConcPct(c)}
                  className="px-3 py-1 text-[11px] font-mono border transition-opacity"
                  style={{ 
                    borderColor: Number(concPct) === c ? COLORS.ink : COLORS.line, 
                    color: Number(concPct) === c ? "#fff" : COLORS.ink, 
                    backgroundColor: Number(concPct) === c ? COLORS.ink : "#fff" 
                  }}
                >
                  {c}%
                </button>
              ))}
            </div>`;

if (code.includes(concAnchor) && !code.includes("{[20, 25, 30].map")) { 
  code = code.replace(concAnchor, concPayload);
  console.log("✅ Concentration buttons injected.");
} 

fs.writeFileSync(file, code);
console.log("🎉 File successfully updated!");
