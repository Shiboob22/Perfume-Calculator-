import React, { useState, useEffect } from 'react';
import { fetchFragranceSuggestions } from '../lib/searchApi';
import { setStock } from '../lib/fragranceApi';
import { TIERS, TIER_COLORS, TIER_INITIAL } from '../lib/tiers';

// Resolve a fragrance's family (tier) into display data. Falls back to a
// neutral "Uncategorized" family when the row has no/unknown tier.
function familyOf(tierKey) {
  const key = tierKey && TIERS[tierKey] ? tierKey : null;
  return {
    key,
    label: key ? TIERS[key].label : 'Uncategorized',
    sub: key ? TIERS[key].sub : '',
    color: key ? TIER_COLORS[key] : '#8A8A8A',
    initial: key ? TIER_INITIAL[key] : '·',
  };
}

// hex -> rgba string, for tinting chip/pill backgrounds from the family color.
function tint(hex, alpha) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// A stylised perfume bottle, filled with the family color — the family-coded
// "bottle art" (Fragrantica/Parfumo show a photo; we have no image data, so we
// generate art tinted by family instead).
function BottleArt({ color, initial, size = 128 }) {
  return (
    <svg width={size * 0.72} height={size} viewBox="0 0 72 100" fill="none" aria-hidden="true">
      <rect x="28" y="1" width="16" height="12" rx="2" fill={color} opacity="0.9" />
      <rect x="31" y="0" width="10" height="5" rx="1.5" fill={color} />
      <rect x="30" y="12" width="12" height="7" fill={color} opacity="0.65" />
      <path
        d="M15 23 C15 20 22 21 24 19 L48 19 C50 21 57 20 57 23 L60 85 C60 92.7 54.7 98 47 98 L25 98 C17.3 98 12 92.7 12 85 Z"
        fill={color}
      />
      <path d="M15 23 C15 20 22 21 24 19 L31 19 L31 98 L25 98 C17.3 98 12 92.7 12 85 Z" fill="#fff" opacity="0.14" />
      <rect x="23" y="45" width="26" height="30" rx="2.5" fill="#fff" opacity="0.9" />
      <text x="36" y="66" textAnchor="middle" fontSize="17" fontWeight="700" fill={color} fontFamily="serif">
        {initial}
      </text>
    </svg>
  );
}

// One pyramid level rendered as a row of note pills (or a muted placeholder).
function NoteLevel({ label, notes, color }) {
  const has = Array.isArray(notes) && notes.length > 0;
  return (
    <div className="flex gap-3">
      <div className="w-16 shrink-0 pt-1 text-[10px] font-mono uppercase tracking-wider text-neutral-400 text-right">
        {label}
      </div>
      <div className="flex-1 flex flex-wrap gap-1.5">
        {has ? (
          notes.map((n, i) => (
            <span
              key={i}
              className="text-xs px-2.5 py-1 rounded-full border"
              style={{ backgroundColor: tint(color, 0.1), borderColor: tint(color, 0.28), color: '#3a3a3a' }}
            >
              {n}
            </span>
          ))
        ) : (
          <span className="text-xs text-neutral-300 italic pt-1">not specified</span>
        )}
      </div>
    </div>
  );
}

export function PerfumeSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedPerfume, setSelectedPerfume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [addingToInventory, setAddingToInventory] = useState(false);
  const [inventoryMsg, setInventoryMsg] = useState('');

  async function handleAddToInventory() {
    if (!selectedPerfume?.id) return;
    setAddingToInventory(true);
    setInventoryMsg('');
    try {
      await setStock(selectedPerfume.id, 0);
      setInventoryMsg('Added to your inventory!');
    } catch (err) {
      setInventoryMsg(err.message || 'Could not add to inventory.');
    } finally {
      setAddingToInventory(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        const data = await fetchFragranceSuggestions(query);
        setResults(data);
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 max-w-5xl mx-auto">
      {/* Search Input and Results Column */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Search saved perfumes
          </label>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search fragrance (e.g. Naxos)..."
              className="w-full px-4 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-800"
            />
            {loading && (
              <span className="absolute right-3 top-2.5 text-xs text-neutral-400 animate-pulse">
                Searching...
              </span>
            )}
          </div>
        </div>

        {query.trim().length >= 2 && results.length === 0 && !loading && (
          <p className="text-sm text-neutral-500">No saved perfumes match "{query}".</p>
        )}

        {results.length > 0 && (
          <div className="border border-neutral-200 rounded-md overflow-hidden divide-y divide-neutral-100 bg-white shadow-sm">
            {results.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedPerfume(item)}
                className={`p-3 cursor-pointer hover:bg-neutral-50 transition-colors flex justify-between items-center ${
                  selectedPerfume?.id === item.id ? 'bg-neutral-100 font-medium' : ''
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: familyOf(item.tier).color }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-neutral-900 truncate">{item.name}</div>
                    <span className="text-xs text-neutral-500 uppercase tracking-wider">
                      {familyOf(item.tier).label}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail View: Fragrantica/Parfumo-style profile card */}
      <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm flex flex-col">
        {selectedPerfume ? (
          (() => {
            const fam = familyOf(selectedPerfume.tier);
            return (
              <div className="flex flex-col">
                {/* Hero: family-tinted band with bottle art + title */}
                <div
                  className="flex items-center gap-4 p-6"
                  style={{ background: `linear-gradient(135deg, ${tint(fam.color, 0.16)}, ${tint(fam.color, 0.04)})` }}
                >
                  <div className="shrink-0 drop-shadow-sm">
                    {selectedPerfume.image_url ? (
                      <img
                        src={`${selectedPerfume.image_url}?width=320&aspect_ratio=1:1`}
                        alt={selectedPerfume.name}
                        width={96}
                        height={96}
                        loading="lazy"
                        className="w-24 h-24 object-contain rounded-md bg-white/60"
                        onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block'; }}
                      />
                    ) : null}
                    <span style={{ display: selectedPerfume.image_url ? 'none' : 'block' }}>
                      <BottleArt color={fam.color} initial={fam.initial} size={116} />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-neutral-900 leading-tight break-words">
                      {selectedPerfume.name}
                    </h3>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-full text-white"
                        style={{ backgroundColor: fam.color }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-white/90" />
                        {fam.label}
                      </span>
                    </div>
                    {fam.sub && (
                      <p className="mt-2 text-[11px] text-neutral-500 leading-snug">{fam.sub}</p>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-5">
                  {/* Main Accords */}
                  {selectedPerfume.accords && selectedPerfume.accords.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">Main Accords</span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPerfume.accords.map((acc, i) => (
                          <span
                            key={i}
                            className="text-xs px-2.5 py-1 rounded-full font-medium border"
                            style={{ backgroundColor: tint(fam.color, 0.14), borderColor: tint(fam.color, 0.3), color: fam.color }}
                          >
                            {acc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Note Pyramid — pills per level */}
                  <div className="space-y-3 pt-1">
                    <span className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider">Note Pyramid</span>
                    <div className="space-y-3">
                      <NoteLevel label="Top" notes={selectedPerfume.top_notes} color={fam.color} />
                      <NoteLevel label="Heart" notes={selectedPerfume.middle_notes} color={fam.color} />
                      <NoteLevel label="Base" notes={selectedPerfume.base_notes} color={fam.color} />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 text-[10px] font-mono text-neutral-400 flex justify-between">
                    <span>Source: {selectedPerfume.source || 'Database'}</span>
                    <span>ID: {selectedPerfume.id.substring(0, 8)}...</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToInventory}
                    disabled={addingToInventory}
                    className="w-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors rounded"
                    style={{ backgroundColor: '#2C3B2E', color: '#fff' }}
                  >
                    {addingToInventory ? 'Adding…' : '+ Add to Inventory'}
                  </button>
                  {inventoryMsg && (
                    <p className={`text-xs mt-1.5 ${inventoryMsg.includes('Added') ? 'text-green-700' : 'text-red-700'}`}>
                      {inventoryMsg}
                    </p>
                  )}
                </div>
              </div>
            );
          })()
        ) : (
          <div className="h-full flex items-center justify-center text-center text-sm text-neutral-400 py-16 px-6">
            Select a result to see its bottle, note pyramid, and family.
          </div>
        )}
      </div>
    </div>
  );
}

export default PerfumeSearch;
