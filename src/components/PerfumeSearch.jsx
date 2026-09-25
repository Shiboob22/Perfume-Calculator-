import React, { useState, useEffect, useRef } from 'react';
import { searchCatalog, fetchPopular, fetchSimilar } from '../lib/searchApi';
import { setStock, saveAiFragrance } from '../lib/fragranceApi';
import { lookupFragrance } from '../lib/aiApi';
import { TIERS, TIER_COLORS, TIER_INITIAL } from '../lib/tiers';
import { COLORS } from '../lib/theme';
import {
  accordColor, inkOn, accordWidth, noteCategory, NOTE_CATEGORIES, photoUrl, splitName,
  GENDER_LABEL, GENDER_GLYPH, RADAR_AXES, estimateCharacter, describe,
} from '../lib/fragranceStyle';

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

const fmtInt = (n) => Number(n || 0).toLocaleString('en-US');

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

// Bottle photo on a white "print" plate (the photos have white grounds), or
// the drawn flacon when there is no photo or it fails to load.
const PHOTO_SIZES = {
  hero: { w: 164, h: 212, pad: 12, art: 150 },
  card: { w: '100%', h: 150, pad: 10, art: 110 },
  thumb: { w: 44, h: 54, pad: 3, art: 44 },
};
function BottlePhoto({ perfume, size = 'hero' }) {
  const [failed, setFailed] = useState(false);
  const src = photoUrl(perfume?.image_url, size === 'thumb' ? 'thumb' : 'full');
  useEffect(() => setFailed(false), [src]);
  const s = PHOTO_SIZES[size];
  if (src && !failed) {
    return (
      <div className="shrink-0 flex items-center justify-center overflow-hidden"
        style={{ width: s.w, height: s.h, padding: s.pad, background: '#FFFFFF', borderRadius: size === 'thumb' ? 6 : 14,
          boxShadow: size === 'hero' ? '0 18px 40px rgba(0,0,0,0.45)' : 'none' }}>
        <img src={src} alt={perfume?.name || ''} loading="lazy" onError={() => setFailed(true)}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>
    );
  }
  return (
    <div className="shrink-0 flex items-center justify-center"
      style={{ width: s.w, height: s.h, borderRadius: size === 'thumb' ? 6 : 14,
        background: size === 'hero' ? 'transparent' : 'rgba(233,200,138,0.05)' }}>
      <BottleArt size={size === 'thumb' ? 40 : s.art} />
    </div>
  );
}

// Five stars filled to the rating (Fragrantica's 1–5 community score).
function Stars({ value, size = 16 }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / 5) * 100));
  return (
    <span className="relative inline-block leading-none" style={{ fontSize: size, letterSpacing: 2 }} aria-label={`${value} out of 5`}>
      <span style={{ color: 'rgba(233,200,138,0.22)' }}>★★★★★</span>
      <span className="absolute inset-0 overflow-hidden whitespace-nowrap" style={{ width: `${pct}%`, color: COLORS.amber }}>★★★★★</span>
    </span>
  );
}

function RatingLine({ perfume, size = 16, compact = false }) {
  if (!perfume?.rating) return null;
  const r = Number(perfume.rating);
  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <Stars value={r} size={size} />
      <span className="font-mono" style={{ fontSize: compact ? 11 : 13, color: COLORS.ink }}>{r.toFixed(2)}</span>
      {perfume.popularity > 0 && (
        <span className="font-mono" style={{ fontSize: compact ? 10 : 12, color: COLORS.inkSoft }}>
          {compact ? `(${fmtInt(perfume.popularity)})` : `· ${fmtInt(perfume.popularity)} votes`}
        </span>
      )}
    </span>
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
    <svg width="100%" viewBox="-48 0 476 390" aria-hidden="true">
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
            fill="#CDBF9E" fontFamily="'IBM Plex Mono', monospace">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// Fragrantica-style accord bar: the accord's own colour, name inside the bar.
function AccordBar({ name, rank }) {
  const bg = accordColor(name);
  return (
    <div style={{ height: 30, borderRadius: 7, background: 'rgba(255,255,255,0.035)' }}>
      <div className="flex items-center px-3" style={{
        width: `${accordWidth(rank)}%`, minWidth: 'max-content', height: '100%', borderRadius: 7, background: bg,
        boxShadow: `0 0 14px ${bg}33`,
      }}>
        <span className="font-mono whitespace-nowrap" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: inkOn(bg) }}>
          {String(name).toLowerCase()}
        </span>
      </div>
    </div>
  );
}

function NoteToken({ note }) {
  const cat = NOTE_CATEGORIES[noteCategory(note)];
  const init = note.trim().charAt(0).toUpperCase();
  return (
    <div className="flex flex-col items-center gap-2" style={{ width: 84 }} title={`${note} · ${cat.label}`}>
      <span className="grid place-items-center" style={{
        width: 54, height: 54, borderRadius: 999,
        background: `radial-gradient(circle at 35% 30%, ${cat.color}, ${cat.color}AA 60%, ${cat.color}66)`,
        boxShadow: `0 6px 18px ${cat.color}33, inset 0 1px 0 rgba(255,255,255,0.35)`,
      }}>
        <span className="font-serif" style={{ fontSize: 22, color: inkOn(cat.color) }}>{init}</span>
      </span>
      <span className="font-mono text-center leading-tight" style={{ fontSize: 11, color: '#CDBF9E' }}>{note}</span>
    </div>
  );
}

function NoteLevel({ label, notes }) {
  return (
    <div className="grid gap-3 sm:gap-5 items-start" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
      <span className="font-mono text-center" style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: COLORS.amberDeep }}>{label}</span>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-5">
        {notes.map((n, i) => <NoteToken key={`${n}-${i}`} note={n} />)}
      </div>
    </div>
  );
}

function NoteLegend({ notes }) {
  const cats = [...new Set(notes.map(noteCategory))];
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
      {cats.map((c) => (
        <span key={c} className="inline-flex items-center gap-1.5 font-mono" style={{ fontSize: 10, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: NOTE_CATEGORIES[c].color }} />
          {NOTE_CATEGORIES[c].label}
        </span>
      ))}
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

const SEASON_ICON = { Winter: '❄', Spring: '✿', Summer: '☀', Fall: '❦', Day: '◐', Night: '☾' };
function SeasonBar({ label, value }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <span style={{ fontSize: 16, color: value >= 70 ? COLORS.amber : COLORS.dim }}>{SEASON_ICON[label]}</span>
      <span className="w-full relative overflow-hidden" style={{ maxWidth: 70, height: 90, borderRadius: 9, background: 'rgba(255,255,255,0.04)' }}>
        <span className="absolute bottom-0 left-0 right-0" style={{ height: `${value}%`, background: 'linear-gradient(180deg,#E9C88A,#A5673A)', opacity: 0.35 + value / 160 }} />
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

// Search result row: thumbnail, perfume, house · year, stars.
function ResultRow({ item, active, onSelect }) {
  const { brand, title } = splitName(item);
  const f = familyOf(item.tier);
  return (
    <button type="button" onClick={() => onSelect(item)}
      className="w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors"
      style={{ background: active ? 'rgba(233,200,138,0.08)' : 'transparent', borderBottom: `1px solid ${COLORS.line}` }}>
      <BottlePhoto perfume={item} size="thumb" />
      <span className="min-w-0 flex-1">
        <span className="block font-serif text-[15px] leading-tight truncate" style={{ color: COLORS.forestDeep }}>{title}</span>
        <span className="block font-mono text-[10px] uppercase tracking-wider truncate mt-0.5" style={{ color: COLORS.inkSoft }}>
          {[brand, item.year].filter(Boolean).join(' · ') || f.label}
        </span>
        {item.rating ? <span className="block mt-1"><RatingLine perfume={item} size={11} compact /></span> : null}
      </span>
      <span className="w-2 h-2 rounded-full shrink-0" title={f.label} style={{ backgroundColor: f.color, boxShadow: `0 0 6px ${f.color}` }} />
    </button>
  );
}

// Grid card for "reminds me of", "more from" and the most-rated shelf.
function PerfumeCard({ item, onSelect }) {
  const { brand, title } = splitName(item);
  return (
    <button type="button" onClick={() => onSelect(item)}
      className="text-left rounded-xl p-2.5 flex flex-col gap-2 transition-transform hover:-translate-y-0.5"
      style={{ background: COLORS.cardHi, border: `1px solid ${COLORS.line}` }}>
      <BottlePhoto perfume={item} size="card" />
      <span className="min-w-0 px-0.5">
        <span className="block font-serif text-[14px] leading-tight" style={{ color: COLORS.forestDeep, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{title}</span>
        <span className="block font-mono text-[10px] uppercase tracking-wider truncate mt-1" style={{ color: COLORS.inkSoft }}>{brand || familyOf(item.tier).label}</span>
        {item.rating ? <span className="block mt-1"><RatingLine perfume={item} size={10} compact /></span> : null}
      </span>
    </button>
  );
}

function CardGrid({ items, onSelect }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((it) => <PerfumeCard key={it.id} item={it} onSelect={onSelect} />)}
    </div>
  );
}

function CardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl animate-pulse" style={{ height: 220, background: COLORS.cardHi, border: `1px solid ${COLORS.line}` }} />
      ))}
    </div>
  );
}

export function PerfumeSearch({ onSelectPerfume }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [matchKind, setMatchKind] = useState('exact');
  const [selectedPerfume, setSelectedPerfume] = useState(null);
  const [loading, setLoading] = useState(false);
  const [popular, setPopular] = useState([]);
  const [related, setRelated] = useState({ loading: false, basis: 'accords', similar: [], sameBrand: [], error: '' });
  const [addingToInventory, setAddingToInventory] = useState(false);
  const [inventoryMsg, setInventoryMsg] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const [savingAi, setSavingAi] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const detailRef = useRef(null);

  function selectPerfume(item) {
    setSelectedPerfume(item);
    setSaveMsg('');
    setInventoryMsg('');
    // On a phone the page is one column, and a card picked from "reminds me
    // of" sits far below the hero: bring the detail's top back into view.
    requestAnimationFrame(() => {
      const el = detailRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.6) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Only on an explicit click — the debounced search fires per keystroke and
  // would burn the free Gemini quota.
  async function handleAskGemini() {
    setAiLoading(true);
    setAiMsg('');
    try {
      const estimate = await lookupFragrance(query.trim());
      if (!estimate.known) {
        setAiMsg(`Gemini doesn't recognise “${query.trim()}” either.`);
        return;
      }
      // No id until saved: that's how the detail panel tells an estimate apart.
      selectPerfume({ ...estimate, id: null });
    } catch (err) {
      setAiMsg(err.message || 'Could not reach Gemini.');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSaveEstimate() {
    setSavingAi(true);
    setSaveMsg('');
    try {
      const saved = await saveAiFragrance(selectedPerfume);
      setSelectedPerfume(saved);
      setSaveMsg(saved.source === selectedPerfume.source
        ? 'Saved to your catalog.'
        : 'Already in your catalog — showing the saved entry.');
    } catch (err) {
      setSaveMsg(err.message || 'Could not save to catalog.');
    } finally {
      setSavingAi(false);
    }
  }

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
    fetchPopular().then(setPopular);
  }, []);

  useEffect(() => {
    setAiMsg('');
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        const data = await searchCatalog(query);
        if (cancelled) return;
        setResults(data.results);
        setMatchKind(data.match || 'exact');
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  // Similar perfumes and the house's line-up for the selected fragrance.
  const selectedId = selectedPerfume?.id || null;
  useEffect(() => {
    if (!selectedId) {
      setRelated({ loading: false, basis: 'accords', similar: [], sameBrand: [], error: '' });
      return;
    }
    let cancelled = false;
    setRelated((r) => ({ ...r, loading: true, error: '' }));
    fetchSimilar(selectedId)
      .then((d) => { if (!cancelled) setRelated({ loading: false, basis: d.basis, similar: d.similar || [], sameBrand: d.sameBrand || [], error: '' }); })
      .catch((e) => { if (!cancelled) setRelated({ loading: false, basis: 'accords', similar: [], sameBrand: [], error: e.message || 'Could not load similar fragrances.' }); });
    return () => { cancelled = true; };
  }, [selectedId]);

  const p = selectedPerfume;
  const fam = p ? familyOf(p.tier) : null;
  const names = p ? splitName(p) : null;
  const character = p ? estimateCharacter(p) : null;
  const accords = p?.accords || [];
  const top = p?.top_notes || [];
  const mid = p?.middle_notes || [];
  const bas = p?.base_notes || [];
  const flatNotes = top.length > 0 && mid.length === 0 && bas.length === 0;
  const allNotes = [...top, ...mid, ...bas];
  const about = p ? describe(p) : '';
  const meta = p ? [
    p.gender ? `${GENDER_GLYPH[p.gender]} ${GENDER_LABEL[p.gender]}` : null,
    p.year || null,
    p.country || null,
  ].filter(Boolean) : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[340px_minmax(0,1fr)] gap-6 md:gap-8 px-4 sm:px-6 md:px-10 py-8 max-w-6xl mx-auto"
      style={{ colorScheme: 'dark' }}>
      {/* ---------------- Search column ---------------- */}
      <div className="space-y-4 md:sticky md:top-4 md:self-start">
        <label className="block font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: COLORS.amberDeep }}>
          Search the library
        </label>
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search perfumes or houses…"
            className="w-full px-4 py-3 font-mono text-sm rounded-lg focus:outline-none"
            style={{ background: COLORS.cardHi, border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
          />
          {loading && (
            <span className="absolute right-3 top-3.5 text-xs font-mono animate-pulse" style={{ color: COLORS.inkSoft }}>
              Searching…
            </span>
          )}
        </div>
        {query.trim().length < 2 && (
          <p className="text-xs font-mono leading-relaxed" style={{ color: COLORS.inkSoft }}>
            Over 80,000 fragrances with notes, accords, ratings and bottle photos. Any word order works, accents optional.
          </p>
        )}

        {query.trim().length >= 2 && results.length === 0 && !loading && (
          <div className="space-y-3">
            <p className="text-sm font-mono" style={{ color: COLORS.inkSoft }}>No perfumes match “{query}”.</p>
            <button
              type="button"
              onClick={handleAskGemini}
              disabled={aiLoading}
              className="w-full px-4 py-3 rounded-lg font-mono text-xs uppercase tracking-wider disabled:opacity-50"
              style={{ border: `1px solid ${COLORS.amberDeep}`, color: COLORS.amber, background: 'rgba(233,200,138,0.06)' }}
            >
              {aiLoading ? 'Asking Gemini…' : `Ask Gemini about “${query.trim()}”`}
            </button>
            {aiMsg && <p className="text-xs font-mono" style={{ color: COLORS.inkSoft }}>{aiMsg}</p>}
          </div>
        )}

        {results.length > 0 && (
          <div>
            {matchKind === 'fuzzy' && (
              <p className="text-xs font-mono mb-2" style={{ color: COLORS.inkSoft }}>No exact match — closest names:</p>
            )}
            <div className="rounded-lg overflow-hidden md:max-h-[70vh] md:overflow-y-auto" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.card }}>
              {results.map((item) => (
                <ResultRow key={item.id} item={item} active={selectedPerfume?.id === item.id} onSelect={selectPerfume} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---------------- Detail column ---------------- */}
      <div ref={detailRef} className="rounded-2xl overflow-hidden scroll-mt-4" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.card }}>
        {p ? (
          <div>
            {/* Hero */}
            <div className="relative px-5 sm:px-8 pt-8 sm:pt-10 pb-8" style={{ background: 'linear-gradient(180deg, rgba(233,200,138,0.08), rgba(16,14,10,0))' }}>
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
                <div className="self-center sm:self-auto">
                  <BottlePhoto perfume={p} size="hero" />
                </div>
                <div className="min-w-0 flex-1">
                  {names.brand && (
                    <div className="font-mono text-[12px] tracking-[0.24em] uppercase" style={{ color: COLORS.amberDeep }}>
                      {names.brand}
                    </div>
                  )}
                  <h3 className="font-serif italic leading-[0.95] break-words text-4xl sm:text-5xl mt-1" style={{ color: COLORS.forestDeep }}>
                    {names.title}
                  </h3>
                  {meta.length > 0 && (
                    <div className="mt-3 font-mono text-[12px] tracking-wide" style={{ color: '#CDBF9E' }}>
                      {meta.join('  ·  ')}
                    </div>
                  )}
                  {p.rating ? <div className="mt-3"><RatingLine perfume={p} size={18} /></div> : null}
                  <div className="mt-4 flex items-center gap-2 flex-wrap">
                    {p.olfactory_family && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full font-mono text-[11px] tracking-wider uppercase"
                        style={{ border: `1px solid ${COLORS.line}`, color: COLORS.ink, background: 'rgba(255,255,255,0.03)' }}>
                        {p.olfactory_family}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full" title="Family used by the Calculator for density and concentration"
                      style={{ border: `1px solid ${COLORS.amberDeep}`, background: 'rgba(233,200,138,0.08)' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: fam.color }} />
                      <span className="font-mono text-[11px] tracking-wider uppercase" style={{ color: COLORS.amber }}>{fam.label}</span>
                    </span>
                  </div>
                  {p.perfumers && p.perfumers.length > 0 && (
                    <p className="mt-3 font-mono text-[12px]" style={{ color: COLORS.inkSoft }}>
                      {p.perfumers.length > 1 ? 'Perfumers' : 'Perfumer'} · <span style={{ color: COLORS.ink }}>{p.perfumers.join(', ')}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-7 flex gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => onSelectPerfume && onSelectPerfume(p)}
                  className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl font-semibold text-[15px]"
                  style={{ background: 'linear-gradient(180deg,#E9C88A,#C9A15A)', color: COLORS.onAmber }}
                >
                  Blend this in the Calculator <span aria-hidden="true">→</span>
                </button>
                {p.id ? (
                  <button
                    type="button"
                    onClick={handleAddToInventory}
                    disabled={addingToInventory}
                    className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl font-semibold text-[15px] disabled:opacity-50"
                    style={{ background: 'transparent', border: `1px solid ${COLORS.amberDeep}`, color: COLORS.amber }}
                  >
                    {addingToInventory ? 'Adding…' : '+ Add to Inventory'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveEstimate}
                    disabled={savingAi}
                    className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl font-semibold text-[15px] disabled:opacity-50"
                    style={{ background: 'transparent', border: `1px solid ${COLORS.amberDeep}`, color: COLORS.amber }}
                  >
                    {savingAi ? 'Saving…' : 'Save to catalog'}
                  </button>
                )}
              </div>
              {!p.id && (
                <p className="text-xs font-mono mt-3" style={{ color: COLORS.inkSoft }}>
                  AI estimate — notes and family come from Gemini and may be wrong. Check before saving.
                </p>
              )}
              {saveMsg && (
                <p className="text-xs font-mono mt-2" style={{ color: /^(Saved|Already)/.test(saveMsg) ? COLORS.amber : COLORS.danger }}>
                  {saveMsg}
                </p>
              )}
              {inventoryMsg && (
                <p className="text-xs font-mono mt-2" style={{ color: inventoryMsg.includes('Added') ? COLORS.amber : COLORS.danger }}>
                  {inventoryMsg}
                </p>
              )}
            </div>

            <div className="px-5 sm:px-8 py-8 space-y-10">
              {about && (
                <p className="font-serif leading-relaxed" style={{ fontSize: 17, color: '#DCCFB2' }}>{about}</p>
              )}

              {/* Accords + profile */}
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-8 items-start">
                <div>
                  <SectionLabel n="01">Main accords</SectionLabel>
                  <div className="mt-5 flex flex-col gap-2">
                    {accords.length > 0
                      ? accords.slice(0, 10).map((a, i) => <AccordBar key={a} name={a} rank={i} />)
                      : <p className="font-serif italic" style={{ color: COLORS.dim }}>No accords recorded for this fragrance.</p>}
                  </div>
                </div>
                <div className="rounded-2xl p-4" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.ink1 }}>
                  <SectionLabel>Olfactive profile · est.</SectionLabel>
                  <ClassificationRadar radar={character.radar} />
                </div>
              </div>

              <div style={{ height: 1, background: COLORS.hair }} />

              {/* Note pyramid */}
              <div>
                <SectionLabel n="02">{flatNotes ? 'Notes' : 'Fragrance pyramid'}</SectionLabel>
                {allNotes.length === 0 ? (
                  <p className="mt-5 font-serif italic" style={{ color: COLORS.dim }}>No notes recorded for this fragrance.</p>
                ) : (
                  <div className="mt-6 flex flex-col gap-7">
                    {flatNotes ? (
                      <NoteLevel label="Notes" notes={top} />
                    ) : (
                      <>
                        {top.length > 0 && <NoteLevel label="Top notes" notes={top} />}
                        {mid.length > 0 && <NoteLevel label="Middle notes" notes={mid} />}
                        {bas.length > 0 && <NoteLevel label="Base notes" notes={bas} />}
                      </>
                    )}
                    <NoteLegend notes={allNotes} />
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: COLORS.hair }} />

              {/* Character (estimated) */}
              <div>
                <SectionLabel n="03">When to wear · estimated from {character.basis === 'accords' ? 'accords' : 'family'}</SectionLabel>
                <div className="mt-6 flex justify-between items-end gap-2 sm:gap-4">
                  {Object.entries(character.seasons).map(([label, value], i) => (
                    <React.Fragment key={label}>
                      {i === 4 && <div style={{ width: 1, height: 110, background: COLORS.hair }} />}
                      <SeasonBar label={label} value={value} />
                    </React.Fragment>
                  ))}
                </div>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <SegMeter label="Longevity" value={character.lon} caption={character.lon >= 8 ? 'Long lasting' : character.lon >= 5.5 ? 'Moderate' : character.lon >= 4 ? 'Weak' : 'Very weak'} />
                  <SegMeter label="Sillage" value={character.sil} caption={character.sil >= 7 ? 'Strong' : character.sil >= 5 ? 'Moderate' : character.sil >= 3.5 ? 'Soft' : 'Intimate'} />
                </div>
              </div>

              {/* Related */}
              {p.id && (
                <>
                  <div style={{ height: 1, background: COLORS.hair }} />
                  <div>
                    <SectionLabel n="04">{related.basis === 'family' ? `Popular ${fam.label.toLowerCase()} fragrances` : 'This perfume reminds me of'}</SectionLabel>
                    <div className="mt-5">
                      {related.loading ? <CardSkeleton /> : related.error ? (
                        <p className="text-xs font-mono" style={{ color: COLORS.danger }}>{related.error}</p>
                      ) : related.similar.length > 0 ? (
                        <CardGrid items={related.similar} onSelect={selectPerfume} />
                      ) : (
                        <p className="font-serif italic" style={{ color: COLORS.dim }}>Nothing similar found yet.</p>
                      )}
                    </div>
                  </div>
                  {names.brand && (related.loading || related.sameBrand.length > 0) && (
                    <div>
                      <SectionLabel n="05">More from {names.brand}</SectionLabel>
                      <div className="mt-5">
                        {related.loading ? <CardSkeleton /> : <CardGrid items={related.sameBrand} onSelect={selectPerfume} />}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="pt-3 flex flex-wrap gap-2 justify-between font-mono text-[10px] uppercase tracking-wider" style={{ color: COLORS.dim, borderTop: `1px solid ${COLORS.hair}` }}>
                <span>Source · {p.source || 'Database'}</span>
                <span>{p.id ? `ID ${String(p.id).substring(0, 8)}` : 'Not saved'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 sm:px-8 py-8">
            <SectionLabel>Most rated in the library</SectionLabel>
            <p className="mt-2 mb-6 font-serif italic" style={{ fontSize: 17, color: COLORS.inkSoft }}>
              Pick one, or search for any perfume to see its bottle, accords, pyramid and similar scents.
            </p>
            {popular.length > 0 ? <CardGrid items={popular} onSelect={selectPerfume} /> : <CardSkeleton count={8} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default PerfumeSearch;
