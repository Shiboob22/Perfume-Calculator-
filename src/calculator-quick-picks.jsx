<div className="mb-6">
  <label className="block text-xs font-mono uppercase tracking-wider text-[#78716C] mb-2">
    Bottle size — quick pick
  </label>
  <div className="flex flex-wrap gap-2">
    {[3, 5, 10, 20, 30, 50, 100, 200].map((size) => (
      <button
        key={size}
        type="button"
        onClick={() => {
          setAmount(size);
          setUnit('ml');
        }}
        className={`px-3 py-2 border font-mono text-sm transition-colors ${
          amount === size && unit === 'ml'
            ? 'bg-[#1E3A2F] border-[#1E3A2F] text-white'
            : 'bg-white border-[#E5E0D8] text-[#2C2A29] hover:border-[#1E3A2F]'
        }`}
      >
        {size} ml
      </button>
    ))}
  </div>
</div>

<div className="mb-2">
  <label className="block text-xs font-mono uppercase tracking-wider text-[#78716C] mb-2">
    Target concentration
  </label>
  <div className="flex gap-2 mb-3">
    {[20, 25, 30].map((conc) => (
      <button
        key={conc}
        type="button"
        onClick={() => setConcentration(conc)}
        className={`px-4 py-2 border font-mono text-sm transition-colors ${
          concentration === conc
            ? 'bg-[#1E3A2F] border-[#1E3A2F] text-white'
            : 'bg-white border-[#E5E0D8] text-[#2C2A29] hover:border-[#1E3A2F]'
        }`}
      >
        {conc}%
      </button>
    ))}
  </div>
</div>
