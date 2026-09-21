import React, { useState, useEffect } from 'react';
import { fetchFragranceSuggestions } from '../lib/searchApi';
import { setStock } from '../lib/fragranceApi';
import { TIERS, TIER_COLORS, TIER_INITIAL } from '../lib/tiers';
import { COLORS } from '../lib/theme';

// Resolve a fragrance's family (tier) into display data.
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

// ---------------------------------------------------------------------------
// Family → olfactive profile. The database stores notes & accords but no
// radar / longevity / season numbers, so we DERIVE those from the family in
// one place instead of inventing per-bottle stats. Tune these rows to change
// how a whole family reads. radar axes (0–10) are, in order:
//   Sweet · Spicy · Woody · Balsamic · Amber · Gourmand · Floral · Fresh
// ---------------------------------------------------------------------------
const RADAR_AXES = ['SWEET', 'SPICY', 'WOODY', 'BALSAM', 'AMBER', 'GOURM.', 'FLORAL', 'FRESH'];
const PROFILES = {
  fresh:    { radar: [3, 4, 3, 2, 2, 2, 5, 9], lon: 5, sil: 4, seasons: { Winter: 20, Fall: 45, Spring: 90, Summer: 95, Night: 40, Day: 95 } },
  floral:   { radar: [5, 4, 3, 3, 3, 4, 9, 5], lon: 6, sil: 5, seasons: { Winter: 40, Fall: 60, Spring: 90, Summer: 70, Night: 60, Day: 85 } },
  woody:    { radar: [3, 6, 9, 5, 6, 3, 3, 4], lon: 8, sil: 7, seasons: { Winter: 80, Fall: 90, Spring: 55, Summer: 35, Night: 80, Day: 70 } },
  gourmand: { radar: [9, 5, 3, 4, 6, 9, 3, 3], lon: 8, sil: 7, seasons: { Winter: 90, Fall: 85, Spring: 45, Summer: 25, Night: 85, Day: 60 } },
  oriental: { radar: [8, 7, 6, 7, 9, 6, 4, 3], lon: 9, sil: 8, seasons: { Winter: 95, Fall: 88, Spring: 40, Summer: 20, Night: 90, Day: 55 } },
};
const FALLBACK_PROFILE = { radar: [5, 5, 5, 5, 5, 5, 5, 5], lon: 6, sil: 5, seasons: { Winter: 50, Fall: 50, Spring: 50, Summer: 50, Night: 50, Day: 50 } };
function profileOf(tierKey) {
  return PROFILES[tierKey] || FALLBACK_PROFILE;
}

// A stylised gold flacon on the dark ground, used when no bottle photo exists.
function BottleArt({ size = 150 }) {
  return (
    <svg width={size * 0.72} height={size} viewBox="0 0 72 100" fill="none" aria-hidden="true"
      style={{ filter: 'drop-shadow(0 16px 30px rgba(0,0,0,0.6))' }}>
      <defs>
        <linearGradient id="flaconGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E9C88A" />
          <stop offset="0.5" stopColor="#B8823F" />
          <stop offset="1" stopColor="#6E3F22" />
        </linearGradient>
      </defs>
      <rect x="28" y="1" width="16" height="12" rx="2" fill="#C9A15A" />
      <rect x="31" y="0" width="10" height="5" rx="1.5" fill="#E9C88A" />
      <rect x="30" y="12" width="12" height="7" fill="#8A5A2E" />
      <path d="M15 23 C15 20 22 21 24 19 L48 19 C50 21 57 20 57 23 L60 85 C60 92.7 54.7 98 47 98 L25 98 C17.3 98 12 92.7 12 85 Z" fill="url(#flaconGlass)" />
      <path d="M15 23 C15 20 22 21 24 19 L30 19 L30 98 L25 98 C17.3 98 12 92.7 12 85 Z" fill="#ffffff" opacity="0.16" />
    </svg>
  );
}

// --- Radar geometry ---------------------------------------------------------
const R = 150, CX = 190, CY = 190;
function pt(i, v) {
  const a = (-90 + i * 45) * Math.PI / 180;
  const r = (R * v) / 10;
  return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
}
function ringPoints(v) {
  return Array.from({ length: 8 }, (_, i) => pt(i, v).map((n) => Math.round(n * 10) / 10).join(',')).join(' ');
}
function labelPos(i) {
  const a = (-90 + i * 45) * Math.PI / 180;
  const r = R + 24;
  const c = Math.cos(a);
  return {
    x: CX + r * c,
    y: CY + r * Math.sin(a) + 4,
    anchor: Math.abs(c) < 0.35 ? 'middle' : c > 0 ? 'start' : 'end',
  };
}

function ClassificationRadar({ radar }) {
  const fill = radar.map((v, i) => pt(i, v).map((n) => Math.round(n * 10) / 10).join(',')).join(' ');
  const verts = radar.map((v, i) => pt(i, v));
  return (
    <svg width="100%" viewBox="0 0 380 400" aria-hidden="true">
      {[10, 6.67, 3.33].map((v) => (
        <polygon key={v} points={ringPoints(v)} fill="none" stroke="rgba(233,200,138,0.13)" />
      ))}
      {Array.from({ length: 8 }, (_, i) => {
        const [x, y] = pt(i, 10);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="rgba(233,200,138,0.10)" />;
      })}
      <polygon points={fill} fill="rgba(233,200,138,0.18)" stroke={COLORS.amber} strokeWidth="2" />
      {verts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill={COLORS.amber} />)}
      {RADAR_AXES.map((label, i) => {
        const { x, y, anchor } = labelPos(i);
        return (
          <text key={label} x={x} y={y} textAnchor={anchor} fontSize="12"
            fill={label === 'AMBER' ? COLORS.amber : '#CDBF9E'} fontFamily="'IBM Plex Mono', monospace">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

function AccordBar({ name, weight }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px minmax(0,1fr) 40px', alignItems: 'center', gap: 16 }}>
      <span className="font-mono" style={{ fontSize: 12, textTransform: 'uppercase', color: COLORS.ink }}>{name}</span>
      <span style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 5, overflow: 'hidden' }}>
        <span style={{ display: 'block', height: '100%', width: `${weight}%`, background: 'linear-gradient(90deg,#A5673A,#E9C88A)', borderRadius: 5, boxShadow: '0 0 12px rgba(233,200,138,0.35)' }} />
      </span>
      <span className="font-mono" style={{ fontSize: 11, color: COLORS.inkSoft, textAlign: 'right' }}>{weight}</span>
    </div>
  );
}

function NoteToken({ note, depth }) {
  const bg = `rgba(233,200,138,${0.06 + depth * 0.07})`;
  const border = `rgba(233,200,138,${0.28 + depth * 0.13})`;
  const initColor = depth >= 2 ? '#1A1207' : depth === 1 ? '#F3DCA9' : COLORS.amber;
  const init = note.trim().slice(0, note.trim().length > 9 ? 2 : 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, width: 88 }}>
      <span style={{ width: 60, height: 60, borderRadius: 999, background: bg, border: `1px solid ${border}`, display: 'grid', placeItems: 'center' }}>
        <span className="font-serif" style={{ fontSize: 22, color: initColor }}>{init}</span>
      </span>
      <span className="font-mono" style={{ fontSize: 11, color: '#CDBF9E', textAlign: 'center' }}>{note}</span>
    </div>
  );
}

function NoteLevel({ label, notes, depth }) {
  const has = Array.isArray(notes) && notes.length > 0;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '76px minmax(0,1fr)', gap: 20, alignItems: 'center' }}>
      <span className="font-mono" style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: COLORS.amberDeep, textAlign: 'right' }}>{label}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        {has
          ? notes.map((n, i) => <NoteToken key={i} note={n} depth={depth} />)
          : <span className="font-serif" style={{ fontStyle: 'italic', color: COLORS.dim }}>not specified</span>}
      </div>
    </div>
  );
}

function SegMeter({ label, value, caption }) {
  const filled = Math.round(value);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="font-mono" style={{ fontSize: 12, textTransform: 'uppercase', color: '#CDBF9E' }}>{label}</span>
        <span className="font-mono" style={{ fontSize: 12, color: COLORS.inkSoft }}>{caption}</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i < filled ? COLORS.amber : COLORS.line }} />
        ))}
      </div>
    </div>
  );
}

function SeasonBar({ label, value, cool }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
      <span className="font-mono" style={{ fontSize: 11, color: COLORS.inkSoft }}>{value}</span>
      <span style={{ width: '100%', maxWidth: 90, height: 100, borderRadius: 9, background: 'rgba(255,255,255,0.04)', position: 'relative', overflow: 'hidden' }}>
        <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${value}%`, background: cool ? 'linear-gradient(180deg,#E9C88A,#A5673A)' : 'linear-gradient(180deg,#6E5A34,#4A3A1F)' }} />
      </span>
      <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#CDBF9E' }}>{label}</span>
    </div>
  );
}

function SectionLabel({ n, children }) {
  return (
    <div className="font-mono" style={{ fontSize: 11, letterSpacing: '0.26em', textTransform: 'uppercase', color: COLORS.amberDeep }}>
      {n ? `${n} — ` : ''}{children}
    </div>
  );
}

export function PerfumeSearch({ onSelectPerfume }) {
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

  const fam = selectedPerfume ? familyOf(selectedPerfume.tier) : null;
  const profile = selectedPerfume ? profileOf(selectedPerfume.tier) : null;
  const accords = selectedPerfume?.accords || [];
  const accordBars = accords.slice(0, 8).map((name, i) => ({ name, weight: Math.max(28, 100 - i * 11) }));
  const coolSeasons = ['Winter', 'Fall', 'Night'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[360px_minmax(0,1fr)] gap-8 px-6 md:px-10 py-8 max-w-6xl mx-auto">
      {/* ---------------- Search column ---------------- */}
      <div className="space-y-4">
        <label className="block font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: COLORS.amberDeep }}>
          Search the library
        </label>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fragrance (e.g. Naxos)…"
            className="w-full px-4 py-3 font-mono text-sm rounded-lg focus:outline-none"
            style={{ background: COLORS.cardHi, border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
          />
          {loading && (
            <span className="absolute right-3 top-3.5 text-xs font-mono animate-pulse" style={{ color: COLORS.inkSoft }}>
              Searching…
            </span>
          )}
        </div>

        {query.trim().length >= 2 && results.length === 0 && !loading && (
          <p className="text-sm font-mono" style={{ color: COLORS.inkSoft }}>No saved perfumes match “{query}”.</p>
        )}

        {results.length > 0 && (
          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.card }}>
            {results.map((item) => {
              const f = familyOf(item.tier);
              const active = selectedPerfume?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedPerfume(item)}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
                  style={{
                    background: active ? 'rgba(233,200,138,0.08)' : 'transparent',
                    borderBottom: `1px solid ${COLORS.line}`,
                  }}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: f.color, boxShadow: `0 0 8px ${f.color}` }} />
                  <span className="min-w-0">
                    <span className="block font-serif text-base leading-tight truncate" style={{ color: COLORS.forestDeep }}>{item.name}</span>
                    <span className="block font-mono text-[10px] uppercase tracking-wider" style={{ color: COLORS.inkSoft }}>{f.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------- Detail column ---------------- */}
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.card }}>
        {selectedPerfume ? (
          <div>
            {/* Hero */}
            <div className="relative px-8 pt-10 pb-8" style={{ background: 'linear-gradient(180deg, rgba(233,200,138,0.08), rgba(16,14,10,0))' }}>
              <div className="relative flex items-center gap-8">
                <div className="shrink-0 relative flex items-center justify-center" style={{ width: 150, height: 190 }}>
                  <span style={{ position: 'absolute', width: 150, height: 150, borderRadius: 999, border: '1px solid rgba(233,200,138,0.22)' }} />
                  {selectedPerfume.image_url ? (
                    <img
                      src={`${selectedPerfume.image_url}?width=320&aspect_ratio=1:1`}
                      alt={selectedPerfume.name}
                      className="relative w-28 h-28 object-contain"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block'; }}
                    />
                  ) : null}
                  <span style={{ display: selectedPerfume.image_url ? 'none' : 'block', position: 'relative' }}>
                    <BottleArt size={150} />
                  </span>
                </div>
                <div className="min-w-0">
                  {selectedPerfume.source && (
                    <div className="font-mono text-[11px] tracking-[0.24em] uppercase" style={{ color: COLORS.amberDeep }}>
                      {selectedPerfume.source}
                    </div>
                  )}
                  <h3 className="font-serif italic leading-[0.9] break-words" style={{ fontSize: 52, color: COLORS.forestDeep }}>
                    {selectedPerfume.name}
                  </h3>
                  <div className="mt-4 flex items-center gap-3 flex-wrap">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
                      style={{ border: `1px solid ${COLORS.amberDeep}`, background: 'rgba(233,200,138,0.08)' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS.amber }} />
                      <span className="font-mono text-[11px] tracking-wider uppercase" style={{ color: COLORS.amber }}>{fam.label}</span>
                    </span>
                  </div>
                  {fam.sub && (
                    <p className="mt-3 font-serif italic" style={{ fontSize: 18, color: '#CDBF9E' }}>{fam.sub}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-7 flex gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => onSelectPerfume && onSelectPerfume(selectedPerfume)}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[15px]"
                  style={{ background: 'linear-gradient(180deg,#E9C88A,#C9A15A)', color: COLORS.onAmber }}
                >
                  Blend this in the Calculator <span aria-hidden="true">→</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddToInventory}
                  disabled={addingToInventory}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[15px] disabled:opacity-50"
                  style={{ background: 'transparent', border: `1px solid ${COLORS.amberDeep}`, color: COLORS.amber }}
                >
                  {addingToInventory ? 'Adding…' : '+ Add to Inventory'}
                </button>
              </div>
              {inventoryMsg && (
                <p className="text-xs font-mono mt-2" style={{ color: inventoryMsg.includes('Added') ? COLORS.amber : COLORS.danger }}>
                  {inventoryMsg}
                </p>
              )}
            </div>

            <div className="px-8 py-8 space-y-10">
              {/* Classification + accords */}
              <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-8 items-center">
                <div className="rounded-2xl p-4" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.ink1 }}>
                  <SectionLabel>Classification · derived from family</SectionLabel>
                  <ClassificationRadar radar={profile.radar} />
                </div>
                <div>
                  <SectionLabel n="01">Main accords · relative</SectionLabel>
                  <div className="mt-5 flex flex-col gap-3.5">
                    {accordBars.length > 0
                      ? accordBars.map((a) => <AccordBar key={a.name} name={a.name} weight={a.weight} />)
                      : <p className="font-serif italic" style={{ color: COLORS.dim }}>No accords recorded for this fragrance.</p>}
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: COLORS.hair }} />

              {/* Note pyramid */}
              <div>
                <SectionLabel n="02">Note pyramid</SectionLabel>
                <div className="mt-6 flex flex-col gap-6">
                  <NoteLevel label="Top" notes={selectedPerfume.top_notes} depth={0} />
                  <div style={{ height: 1, background: COLORS.hair }} />
                  <NoteLevel label="Heart" notes={selectedPerfume.middle_notes} depth={1} />
                  <div style={{ height: 1, background: COLORS.hair }} />
                  <NoteLevel label="Base" notes={selectedPerfume.base_notes} depth={2} />
                </div>
              </div>

              <div style={{ height: 1, background: COLORS.hair }} />

              {/* Character (derived) */}
              <div>
                <SectionLabel n="03">Character · estimated from family</SectionLabel>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <SegMeter label="Longevity" value={profile.lon} caption={profile.lon >= 8 ? 'Long lasting' : profile.lon >= 6 ? 'Moderate' : 'Soft'} />
                  <SegMeter label="Sillage" value={profile.sil} caption={profile.sil >= 7 ? 'Heavy' : profile.sil >= 5 ? 'Moderate' : 'Intimate'} />
                </div>

                <div className="mt-8 flex justify-between items-end gap-4" style={{ height: 150 }}>
                  {Object.entries(profile.seasons).map(([label, value], i) => (
                    <React.Fragment key={label}>
                      {i === 4 && <div style={{ width: 1, height: 120, background: COLORS.hair }} />}
                      <SeasonBar label={label} value={value} cool={coolSeasons.includes(label)} />
                    </React.Fragment>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-between font-mono text-[10px] uppercase tracking-wider" style={{ color: COLORS.dim, borderTop: `1px solid ${COLORS.hair}` }}>
                <span>Source · {selectedPerfume.source || 'Database'}</span>
                <span>ID {String(selectedPerfume.id).substring(0, 8)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center py-24 px-8">
            <p className="font-serif italic text-lg" style={{ color: COLORS.inkSoft }}>
              Select a result to see its flacon, classification radar, accords and note pyramid.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PerfumeSearch;
