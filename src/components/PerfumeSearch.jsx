import React, { useState, useEffect, useRef } from 'react';
import { searchCatalog, browseCatalog, fetchPopular, fetchSimilar } from '../lib/searchApi';
import { trackInventory, saveAiFragrance, addFragrancePhoto } from '../lib/fragranceApi';
import { lookupFragrance } from '../lib/aiApi';
import { useEntitlements } from '../lib/useEntitlements';
import { can } from '../lib/entitlements';
import { TIERS, TIER_COLORS, TIER_INITIAL } from '../lib/tiers';
import { COLORS } from '../lib/theme';
import { useI18n } from '../i18n/I18nProvider';
import { errorText } from '../i18n/errorText';
import {
  accordColor, inkOn, accordWidth, noteCategory, NOTE_CATEGORIES, photoUrl, splitName,
  GENDER_GLYPH, estimateCharacter, describe,
} from '../lib/fragranceStyle';

// Resolve a fragrance's family (tier) into display data.
function familyOf(tierKey, t) {
  const key = tierKey && TIERS[tierKey] ? tierKey : null;
  return {
    key,
    label: key ? t(`families.${key}.label`) : t('search.uncategorized'),
    sub: key ? t(`families.${key}.sub`) : '',
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
  const { t } = useI18n();
  const pct = Math.max(0, Math.min(100, (Number(value) / 5) * 100));
  return (
    <span className="relative inline-block leading-none" style={{ fontSize: size, letterSpacing: 2 }} role="img" aria-label={t('search.outOf5', { value })}>
      <span style={{ color: 'rgba(233,200,138,0.22)' }}>★★★★★</span>
      <span className="absolute inset-0 overflow-hidden whitespace-nowrap" style={{ width: `${pct}%`, color: COLORS.amber }}>★★★★★</span>
    </span>
  );
}

function RatingLine({ perfume, size = 16, compact = false }) {
  const { t } = useI18n();
  if (!perfume?.rating) return null;
  const r = Number(perfume.rating);
  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <Stars value={r} size={size} />
      <span className="font-mono" style={{ fontSize: compact ? 11 : 13, color: COLORS.ink }}>{r.toFixed(2)}</span>
      {perfume.popularity > 0 && (
        <span className="font-mono" style={{ fontSize: compact ? 10 : 12, color: COLORS.inkSoft }}>
          {compact ? `(${fmtInt(perfume.popularity)})` : t('search.votes', { count: fmtInt(perfume.popularity) })}
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
  const { t } = useI18n();
  const fill = radar.map((v, i) => pt(i, v).map((n) => Math.round(n * 10) / 10).join(',')).join(' ');
  const verts = radar.map((v, i) => pt(i, v));
  return (
    // Laid out left to right in both languages: the label anchors are computed
    // for LTR, and each Arabic word still shapes correctly inside its <text>.
    <svg width="100%" viewBox="-48 0 476 390" aria-hidden="true" direction="ltr" style={{ direction: 'ltr' }}>
      {[10, 6.67, 3.33].map((v) => (
        <polygon key={v} points={ringPoints(v)} fill="none" stroke="rgba(233,200,138,0.13)" />
      ))}
      {Array.from({ length: 8 }, (_, i) => {
        const [x, y] = pt(i, 10);
        return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="rgba(233,200,138,0.10)" />;
      })}
      <polygon points={fill} fill="rgba(233,200,138,0.18)" stroke={COLORS.amber} strokeWidth="2" />
      {verts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill={COLORS.amber} />)}
      {radar.map((_, i) => {
        const { x, y, anchor } = labelPos(i);
        const label = t(`search.radar.${i}`);
        return (
          <text key={i} x={x} y={y} textAnchor={anchor} fontSize="12"
            fill="#CDBF9E" fontFamily="'IBM Plex Mono', monospace">
            {label}
          </text>
        );
      })}
    </svg>
  );
}

// Fragrantica-style accord bar: the accord's own colour, name inside the bar.
function AccordBar({ name, rank, onBrowse }) {
  const { t } = useI18n();
  const bg = accordColor(name);
  return (
    <button type="button" onClick={() => onBrowse('accord', name)} title={t('search.accordTitle', { accord: String(name).toLowerCase() })}
      className="block w-full text-start transition-opacity hover:opacity-90"
      style={{ height: 30, borderRadius: 7, background: 'rgba(255,255,255,0.035)' }}>
      <div className="flex items-center px-3" style={{
        width: `${accordWidth(rank)}%`, minWidth: 'max-content', height: '100%', borderRadius: 7, background: bg,
        boxShadow: `0 0 14px ${bg}33`,
      }}>
        <span className="font-mono whitespace-nowrap" style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: inkOn(bg) }}>
          {String(name).toLowerCase()}
        </span>
      </div>
    </button>
  );
}

function NoteToken({ note, onBrowse }) {
  const { t } = useI18n();
  const catKey = noteCategory(note);
  const cat = NOTE_CATEGORIES[catKey];
  const init = note.trim().charAt(0).toUpperCase();
  return (
    <button type="button" onClick={() => onBrowse('note', note)} title={t('search.noteTitle', { note, category: t(`search.noteCats.${catKey}`) })}
      className="flex flex-col items-center gap-2 transition-transform hover:-translate-y-0.5" style={{ width: 84 }}>
      <span className="grid place-items-center" style={{
        width: 54, height: 54, borderRadius: 999,
        background: `radial-gradient(circle at 35% 30%, ${cat.color}, ${cat.color}AA 60%, ${cat.color}66)`,
        boxShadow: `0 6px 18px ${cat.color}33, inset 0 1px 0 rgba(255,255,255,0.35)`,
      }}>
        <span className="font-serif" style={{ fontSize: 22, color: inkOn(cat.color) }}>{init}</span>
      </span>
      <span className="font-mono text-center leading-tight" style={{ fontSize: 11, color: '#CDBF9E' }}>{note}</span>
    </button>
  );
}

function NoteLevel({ label, notes, onBrowse }) {
  return (
    <div className="grid gap-3 sm:gap-5 items-start" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
      <span className="font-mono text-center" style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: COLORS.amberDeep }}>{label}</span>
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-5">
        {notes.map((n, i) => <NoteToken key={`${n}-${i}`} note={n} onBrowse={onBrowse} />)}
      </div>
    </div>
  );
}

function NoteLegend({ notes }) {
  const { t } = useI18n();
  const cats = [...new Set(notes.map(noteCategory))];
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
      {cats.map((c) => (
        <span key={c} className="inline-flex items-center gap-1.5 font-mono" style={{ fontSize: 10, color: COLORS.inkSoft, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: NOTE_CATEGORIES[c].color }} />
          {t(`search.noteCats.${c}`)}
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
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <span style={{ fontSize: 16, color: value >= 70 ? COLORS.amber : COLORS.dim }}>{SEASON_ICON[label]}</span>
      <span className="w-full relative overflow-hidden" style={{ maxWidth: 70, height: 90, borderRadius: 9, background: 'rgba(255,255,255,0.04)' }}>
        <span className="absolute bottom-0 left-0 right-0" style={{ height: `${value}%`, background: 'linear-gradient(180deg,#E9C88A,#A5673A)', opacity: 0.35 + value / 160 }} />
      </span>
      <span className="font-mono" style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#CDBF9E' }}>{t(`search.seasons.${label}`)}</span>
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
  const { t } = useI18n();
  const { brand, title } = splitName(item);
  const f = familyOf(item.tier, t);
  return (
    <button type="button" onClick={() => onSelect(item)}
      className="w-full text-start px-3 py-2.5 flex items-center gap-3 transition-colors"
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
  const { t } = useI18n();
  const { brand, title } = splitName(item);
  return (
    <button type="button" onClick={() => onSelect(item)}
      className="text-start rounded-xl p-2.5 flex flex-col gap-2 transition-transform hover:-translate-y-0.5"
      style={{ background: COLORS.cardHi, border: `1px solid ${COLORS.line}` }}>
      <BottlePhoto perfume={item} size="card" />
      <span className="min-w-0 px-0.5">
        <span className="block font-serif text-[14px] leading-tight" style={{ color: COLORS.forestDeep, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{title}</span>
        <span className="block font-mono text-[10px] uppercase tracking-wider truncate mt-1" style={{ color: COLORS.inkSoft }}>{brand || familyOf(item.tier, t).label}</span>
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
  const { t, locale } = useI18n();
  const entitlements = useEntitlements();
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
  // Browsing by note / accord / house instead of a typed query.
  const [browse, setBrowse] = useState(null); // { kind: 'note'|'accord'|'brand', value }
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const detailRef = useRef(null);
  const searchColRef = useRef(null);
  // "+ Add photo" for the few catalog rows no dataset had a bottle photo for.
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoDraft, setPhotoDraft] = useState('');
  const [photoMsg, setPhotoMsg] = useState('');

  async function handleSavePhoto() {
    setPhotoMsg('');
    try {
      const saved = await addFragrancePhoto(selectedPerfume.id, photoDraft);
      setSelectedPerfume((cur) => (cur && cur.id === saved.id ? { ...cur, image_url: saved.image_url } : cur));
      setResults((rs) => rs.map((r) => (r.id === saved.id ? { ...r, image_url: saved.image_url } : r)));
      setPhotoOpen(false);
      setPhotoDraft('');
    } catch (err) {
      setPhotoMsg(errorText(t, err, 'search.photoFailed'));
    }
  }

  function browseBy(kind, value) {
    if (!value) return;
    setQuery('');
    setBrowse({ kind, value });
    // On a phone the list sits above the detail: scroll back up to it.
    requestAnimationFrame(() => {
      const el = searchColRef.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function loadMore() {
    setLoadingMore(true);
    const offset = results.length;
    const data = browse
      ? await browseCatalog(browse.kind, browse.value, offset)
      : await searchCatalog(query, offset);
    setResults((prev) => {
      const seen = new Set(prev.map((r) => r.id));
      return [...prev, ...data.results.filter((r) => !seen.has(r.id))];
    });
    setHasMore(!!data.hasMore);
    setLoadingMore(false);
  }

  function selectPerfume(item) {
    setSelectedPerfume(item);
    setSaveMsg('');
    setInventoryMsg('');
    setPhotoOpen(false);
    setPhotoMsg('');
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
        setAiMsg(t('search.geminiUnknown', { query: query.trim() }));
        return;
      }
      // No id until saved: that's how the detail panel tells an estimate apart.
      selectPerfume({ ...estimate, id: null });
    } catch (err) {
      setAiMsg(errorText(t, err, 'chat.unreachable'));
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
      setSaveMsg({ ok: true, text: saved.source === selectedPerfume.source ? t('search.savedToCatalog') : t('search.alreadyInCatalog') });
    } catch (err) {
      setSaveMsg({ ok: false, text: errorText(t, err, 'search.saveFailed') });
    } finally {
      setSavingAi(false);
    }
  }

  async function handleAddToInventory() {
    if (!selectedPerfume?.id) return;
    setAddingToInventory(true);
    setInventoryMsg('');
    try {
      await trackInventory(selectedPerfume.id);
      setInventoryMsg({ ok: true, text: t('search.addedToInventory') });
    } catch (err) {
      setInventoryMsg({ ok: false, text: errorText(t, err, 'search.inventoryFailed') });
    } finally {
      setAddingToInventory(false);
    }
  }

  useEffect(() => {
    fetchPopular().then(setPopular);
  }, []);

  useEffect(() => {
    setAiMsg('');
    if (browse) return; // the browse effect owns the list
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setLoading(true);
        const data = await searchCatalog(query);
        if (cancelled) return;
        setResults(data.results);
        setMatchKind(data.match || 'exact');
        setHasMore(!!data.hasMore);
        setLoading(false);
      } else {
        setResults([]);
        setHasMore(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, browse]);

  useEffect(() => {
    if (!browse) return;
    let cancelled = false;
    setLoading(true);
    browseCatalog(browse.kind, browse.value).then((data) => {
      if (cancelled) return;
      setResults(data.results);
      setMatchKind('browse');
      setHasMore(!!data.hasMore);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [browse]);

  const browseTitle = browse ? t(`search.browseTitle.${browse.kind}`, { value: browse.value }) : '';

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
      .catch((e) => { if (!cancelled) setRelated({ loading: false, basis: 'accords', similar: [], sameBrand: [], error: errorText(t, e, 'search.similarFailed') }); });
    return () => { cancelled = true; };
  }, [selectedId]);

  const p = selectedPerfume;
  const fam = p ? familyOf(p.tier, t) : null;
  const names = p ? splitName(p) : null;
  const character = p ? estimateCharacter(p) : null;
  const accords = p?.accords || [];
  const top = p?.top_notes || [];
  const mid = p?.middle_notes || [];
  const bas = p?.base_notes || [];
  const flatNotes = top.length > 0 && mid.length === 0 && bas.length === 0;
  const allNotes = [...top, ...mid, ...bas];
  const about = p ? describe(p, t, locale) : '';
  const meta = p ? [
    p.gender && GENDER_GLYPH[p.gender] ? `${GENDER_GLYPH[p.gender]} ${t(`search.gender.${p.gender}`)}` : null,
    p.year || null,
    p.country || null,
  ].filter(Boolean) : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-[340px_minmax(0,1fr)] gap-6 md:gap-8 px-4 sm:px-6 md:px-10 py-8 max-w-6xl mx-auto"
      style={{ colorScheme: 'dark' }}>
      {/* ---------------- Search column ---------------- */}
      <div ref={searchColRef} className="space-y-4 md:sticky md:top-4 md:self-start scroll-mt-4">
        <label htmlFor="search-input" className="block font-mono text-[11px] uppercase tracking-[0.2em]" style={{ color: COLORS.amberDeep }}>
          {t('search.label')}
        </label>
        <div className="relative">
          <input
            id="search-input"
            type="search"
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (browse) setBrowse(null); }}
            placeholder={t('search.placeholder')}
            className="w-full px-4 py-3 font-mono text-sm rounded-lg focus:outline-none focus:ring-2"
            style={{ background: COLORS.cardHi, border: `1px solid ${COLORS.field}`, color: COLORS.ink }}
          />
          {loading && (
            <span className="absolute end-3 top-3.5 text-xs font-mono animate-pulse" style={{ color: COLORS.inkSoft }}>
              {t('search.searching')}
            </span>
          )}
        </div>
        {browse && (
          <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
            style={{ border: `1px solid ${COLORS.amberDeep}`, background: 'rgba(233,200,138,0.06)' }}>
            <span className="min-w-0">
              <span className="block font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: COLORS.amberDeep }}>
                {t('search.browsing')}
              </span>
              <span className="block font-serif text-[17px] truncate" style={{ color: COLORS.forestDeep }}>{browseTitle}</span>
            </span>
            <button type="button" onClick={() => setBrowse(null)} className="shrink-0 font-mono text-[11px] uppercase tracking-wider px-2 py-1 rounded"
              style={{ color: COLORS.amber, border: `1px solid ${COLORS.line}` }} aria-label={t('search.clearBrowse')}>
              {t('search.clear')}
            </button>
          </div>
        )}
        {!browse && query.trim().length < 2 && (
          <p className="text-xs font-mono leading-relaxed" style={{ color: COLORS.inkSoft }}>
            {t('search.intro')}
          </p>
        )}

        {!browse && query.trim().length >= 2 && results.length === 0 && !loading && (
          <div className="space-y-3">
            <p className="text-sm font-mono" style={{ color: COLORS.inkSoft }}>{t('search.noMatch', { query })}</p>
            {can(entitlements, 'ai.ask') && <button
              type="button"
              onClick={handleAskGemini}
              disabled={aiLoading}
              className="w-full px-4 py-3 rounded-lg font-mono text-xs uppercase tracking-wider disabled:opacity-50"
              style={{ border: `1px solid ${COLORS.amberDeep}`, color: COLORS.amber, background: 'rgba(233,200,138,0.06)' }}
            >
              {aiLoading ? t('search.askingGemini') : t('search.askGemini', { query: query.trim() })}
            </button>}
            {aiMsg && <p className="text-xs font-mono" style={{ color: COLORS.inkSoft }}>{aiMsg}</p>}
          </div>
        )}

        {results.length > 0 && (
          <div>
            {matchKind === 'fuzzy' && (
              <p className="text-xs font-mono mb-2" style={{ color: COLORS.inkSoft }}>{t('search.closest')}</p>
            )}
            <div className="rounded-lg overflow-hidden md:max-h-[70vh] md:overflow-y-auto" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.card }}>
              {results.map((item) => (
                <ResultRow key={item.id} item={item} active={selectedPerfume?.id === item.id} onSelect={selectPerfume} />
              ))}
              {hasMore && (
                <button type="button" onClick={loadMore} disabled={loadingMore}
                  className="w-full px-4 py-3 font-mono text-[11px] uppercase tracking-wider disabled:opacity-50"
                  style={{ color: COLORS.amber, background: 'rgba(233,200,138,0.04)' }}>
                  {loadingMore ? t('app.loading') : t('search.showMore')}
                </button>
              )}
            </div>
          </div>
        )}
        {browse && !loading && results.length === 0 && (
          <p className="text-sm font-mono" style={{ color: COLORS.inkSoft }}>{t('search.nothingFor', { title: browseTitle })}</p>
        )}
      </div>

      {/* ---------------- Detail column ---------------- */}
      <div ref={detailRef} className="rounded-2xl overflow-hidden scroll-mt-4" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.card }}>
        {p ? (
          <div>
            {/* Hero */}
            <div className="relative px-5 sm:px-8 pt-8 sm:pt-10 pb-8" style={{ background: 'linear-gradient(180deg, rgba(233,200,138,0.08), rgba(16,14,10,0))' }}>
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8">
                <div className="self-center sm:self-auto flex flex-col items-center gap-2">
                  <BottlePhoto perfume={p} size="hero" />
                  {p.id && !p.image_url && (
                    photoOpen ? (
                      <div className="flex flex-col gap-1.5" style={{ width: 200 }}>
                        <input type="url" value={photoDraft} onChange={(e) => setPhotoDraft(e.target.value)}
                          placeholder={t('search.photoPlaceholder')} aria-label={t('search.photoPlaceholder')} autoFocus
                          className="w-full px-2.5 py-1.5 font-mono text-[11px] rounded focus:outline-none focus:ring-2"
                          style={{ background: COLORS.cardHi, border: `1px solid ${COLORS.field}`, color: COLORS.ink }} />
                        <div className="flex gap-2">
                          <button type="button" onClick={handleSavePhoto}
                            className="flex-1 px-2 py-1 rounded font-mono text-[10px] uppercase tracking-wider"
                            style={{ background: COLORS.amber, color: COLORS.onAmber }}>{t('search.save')}</button>
                          <button type="button" onClick={() => { setPhotoOpen(false); setPhotoMsg(''); }}
                            className="px-2 py-1 rounded font-mono text-[10px] uppercase tracking-wider"
                            style={{ border: `1px solid ${COLORS.line}`, color: COLORS.inkSoft }}>{t('search.cancel')}</button>
                        </div>
                        {photoMsg && <p className="font-mono text-[10px]" style={{ color: COLORS.danger }}>{photoMsg}</p>}
                      </div>
                    ) : (
                      <button type="button" onClick={() => setPhotoOpen(true)}
                        className="font-mono text-[10px] uppercase tracking-wider hover:underline underline-offset-4"
                        style={{ color: COLORS.inkSoft }}>
                        {t('search.addPhoto')}
                      </button>
                    )
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {names.brand && (
                    p.brand ? (
                      <button type="button" onClick={() => browseBy('brand', p.brand)} title={t('search.brandTitle', { brand: p.brand })}
                        className="font-mono text-[12px] tracking-[0.24em] uppercase hover:underline underline-offset-4 text-start"
                        style={{ color: COLORS.amberDeep }}>
                        {names.brand}
                      </button>
                    ) : (
                      <div className="font-mono text-[12px] tracking-[0.24em] uppercase" style={{ color: COLORS.amberDeep }}>
                        {names.brand}
                      </div>
                    )
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
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full" title={t('search.familyTitle')}
                      style={{ border: `1px solid ${COLORS.amberDeep}`, background: 'rgba(233,200,138,0.08)' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: fam.color }} />
                      <span className="font-mono text-[11px] tracking-wider uppercase" style={{ color: COLORS.amber }}>{fam.label}</span>
                    </span>
                  </div>
                  {p.perfumers && p.perfumers.length > 0 && (
                    <p className="mt-3 font-mono text-[12px]" style={{ color: COLORS.inkSoft }}>
                      {t('search.perfumer', { count: p.perfumers.length })} · <span style={{ color: COLORS.ink }}>{p.perfumers.join(', ')}</span>
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
                  {t('search.blend')} <span aria-hidden="true" className="rtl:-scale-x-100 inline-block">→</span>
                </button>
                {p.id ? (can(entitlements, 'inventory') && (
                  <button
                    type="button"
                    onClick={handleAddToInventory}
                    disabled={addingToInventory}
                    className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl font-semibold text-[15px] disabled:opacity-50"
                    style={{ background: 'transparent', border: `1px solid ${COLORS.amberDeep}`, color: COLORS.amber }}
                  >
                    {addingToInventory ? t('search.adding') : t('search.addToInventory')}
                  </button>
                )) : (
                  <button
                    type="button"
                    onClick={handleSaveEstimate}
                    disabled={savingAi}
                    className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl font-semibold text-[15px] disabled:opacity-50"
                    style={{ background: 'transparent', border: `1px solid ${COLORS.amberDeep}`, color: COLORS.amber }}
                  >
                    {savingAi ? t('search.saving') : t('search.saveToCatalog')}
                  </button>
                )}
              </div>
              {!p.id && (
                <p className="text-xs font-mono mt-3" style={{ color: COLORS.inkSoft }}>
                  {t('search.aiEstimate')}
                </p>
              )}
              {saveMsg && (
                <p className="text-xs font-mono mt-2" style={{ color: saveMsg.ok ? COLORS.amber : COLORS.danger }}>
                  {saveMsg.text}
                </p>
              )}
              {inventoryMsg && (
                <p className="text-xs font-mono mt-2" style={{ color: inventoryMsg.ok ? COLORS.amber : COLORS.danger }}>
                  {inventoryMsg.text}
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
                  <SectionLabel n="01">{t('search.mainAccords')}</SectionLabel>
                  <div className="mt-5 flex flex-col gap-2">
                    {accords.length > 0
                      ? accords.slice(0, 10).map((a, i) => <AccordBar key={a} name={a} rank={i} onBrowse={browseBy} />)
                      : <p className="font-serif italic" style={{ color: COLORS.dim }}>{t('search.noAccords')}</p>}
                  </div>
                </div>
                <div className="rounded-2xl p-4" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.ink1 }}>
                  <SectionLabel>{t('search.profile')}</SectionLabel>
                  <ClassificationRadar radar={character.radar} />
                </div>
              </div>

              <div style={{ height: 1, background: COLORS.hair }} />

              {/* Note pyramid */}
              <div>
                <SectionLabel n="02">{flatNotes ? t('search.notes') : t('search.pyramid')}</SectionLabel>
                {allNotes.length === 0 ? (
                  <p className="mt-5 font-serif italic" style={{ color: COLORS.dim }}>{t('search.noNotes')}</p>
                ) : (
                  <div className="mt-6 flex flex-col gap-7">
                    {flatNotes ? (
                      <NoteLevel label={t('search.notes')} notes={top} onBrowse={browseBy} />
                    ) : (
                      <>
                        {top.length > 0 && <NoteLevel label={t('search.top')} notes={top} onBrowse={browseBy} />}
                        {mid.length > 0 && <NoteLevel label={t('search.middle')} notes={mid} onBrowse={browseBy} />}
                        {bas.length > 0 && <NoteLevel label={t('search.base')} notes={bas} onBrowse={browseBy} />}
                      </>
                    )}
                    <NoteLegend notes={allNotes} />
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: COLORS.hair }} />

              {/* Character (estimated) */}
              <div>
                <SectionLabel n="03">{t(`search.whenToWear.${character.basis === 'accords' ? 'accords' : 'family'}`)}</SectionLabel>
                <div className="mt-6 flex justify-between items-end gap-2 sm:gap-4">
                  {Object.entries(character.seasons).map(([label, value], i) => (
                    <React.Fragment key={label}>
                      {i === 4 && <div style={{ width: 1, height: 110, background: COLORS.hair }} />}
                      <SeasonBar label={label} value={value} />
                    </React.Fragment>
                  ))}
                </div>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <SegMeter label={t('search.longevity')} value={character.lon} caption={t(`search.longevityLevels.${character.lon >= 8 ? 'long' : character.lon >= 5.5 ? 'moderate' : character.lon >= 4 ? 'weak' : 'veryWeak'}`)} />
                  <SegMeter label={t('search.sillage')} value={character.sil} caption={t(`search.sillageLevels.${character.sil >= 7 ? 'strong' : character.sil >= 5 ? 'moderate' : character.sil >= 3.5 ? 'soft' : 'intimate'}`)} />
                </div>
              </div>

              {/* Related */}
              {p.id && (
                <>
                  <div style={{ height: 1, background: COLORS.hair }} />
                  <div>
                    <SectionLabel n="04">{related.basis === 'family' ? t('search.popularInFamily', { family: fam.label.toLowerCase() }) : t('search.remindsMe')}</SectionLabel>
                    <div className="mt-5">
                      {related.loading ? <CardSkeleton /> : related.error ? (
                        <p className="text-xs font-mono" style={{ color: COLORS.danger }}>{related.error}</p>
                      ) : related.similar.length > 0 ? (
                        <CardGrid items={related.similar} onSelect={selectPerfume} />
                      ) : (
                        <p className="font-serif italic" style={{ color: COLORS.dim }}>{t('search.nothingSimilar')}</p>
                      )}
                    </div>
                  </div>
                  {names.brand && (related.loading || related.sameBrand.length > 0) && (
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <SectionLabel n="05">{t('search.moreFrom', { brand: names.brand })}</SectionLabel>
                        {p.brand && (
                          <button type="button" onClick={() => browseBy('brand', p.brand)}
                            className="shrink-0 font-mono text-[11px] uppercase tracking-wider hover:underline underline-offset-4"
                            style={{ color: COLORS.amber }}>
                            {t('search.seeAll')}
                          </button>
                        )}
                      </div>
                      <div className="mt-5">
                        {related.loading ? <CardSkeleton /> : <CardGrid items={related.sameBrand} onSelect={selectPerfume} />}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="pt-3 flex flex-wrap gap-2 justify-between font-mono text-[10px] uppercase tracking-wider" style={{ color: COLORS.dim, borderTop: `1px solid ${COLORS.hair}` }}>
                <span>{t('search.source', { source: p.source || t('search.database') })}</span>
                <span>{p.id ? t('search.id', { id: String(p.id).substring(0, 8) }) : t('search.notSaved')}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 sm:px-8 py-8">
            <SectionLabel>{t('search.mostRated')}</SectionLabel>
            <p className="mt-2 mb-6 font-serif italic" style={{ fontSize: 17, color: COLORS.inkSoft }}>
              {t('search.emptyIntro')}
            </p>
            {popular.length > 0 ? <CardGrid items={popular} onSelect={selectPerfume} /> : <CardSkeleton count={8} />}
          </div>
        )}
      </div>
    </div>
  );
}

export default PerfumeSearch;
