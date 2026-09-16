import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { COLORS } from "../lib/theme";

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function Tag({ children }) {
  return (
    <span
      className="inline-block px-2 py-0.5 text-xs font-mono mr-1.5 mb-1.5 border"
      style={{ borderColor: COLORS.line, color: COLORS.inkSoft }}
    >
      {children}
    </span>
  );
}

function NoteGroup({ label, notes }) {
  if (!notes || notes.length === 0) return null;
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold mb-1" style={{ color: COLORS.inkSoft }}>
        {label}
      </div>
      <div>
        {notes.map((n, i) => (
          <Tag key={i}>{n}</Tag>
        ))}
      </div>
    </div>
  );
}

/**
 * PerfumeSearch
 * -------------
 * Reads directly from the `perfumes` Supabase table (the same table the
 * FastAPI + BeautifulSoup scraper backend writes to). Search-as-you-type
 * with a debounce, a result list, and a detail panel with the full note
 * pyramid. Selecting a result and clicking "Use in calculator" hands the
 * record up to the parent via onSelectPerfume.
 */
export default function PerfumeSearch({ onSelectPerfume }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debouncedQuery = useDebouncedValue(query, 350);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const q = debouncedQuery.trim();
      if (!q) {
        setResults([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("perfumes")
        .select("*")
        .ilike("name", `%${q}%`)
        .order("scraped_at", { ascending: false })
        .limit(20);

      if (cancelled) return;
      setLoading(false);
      if (err) {
        setError(err.message);
        setResults([]);
      } else {
        setResults(data || []);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  return (
    <div
      className="w-full max-w-3xl mx-auto p-6 sm:p-8"
      style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}
    >
      <div className="mb-6">
        <label
          className="block text-xs font-semibold mb-2 tracking-wide"
          style={{ color: COLORS.inkSoft }}
        >
          Search saved perfumes
        </label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Layton, Naxos, Sauvage…"
          className="w-full px-3 py-2 font-mono text-sm border focus:outline-none focus:ring-2"
          style={{ borderColor: COLORS.line, color: COLORS.ink, backgroundColor: "#fff" }}
        />
      </div>

      {loading && (
        <p className="text-sm font-mono" style={{ color: COLORS.inkSoft }}>
          Searching…
        </p>
      )}
      {error && (
        <p className="text-sm font-mono" style={{ color: COLORS.danger }}>
          Search failed: {error}
        </p>
      )}
      {!loading && !error && debouncedQuery.trim() && results.length === 0 && (
        <p className="text-sm font-mono" style={{ color: COLORS.inkSoft }}>
          No saved perfumes match &ldquo;{debouncedQuery}&rdquo;.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div
          className="border divide-y overflow-hidden"
          style={{ borderColor: COLORS.line, backgroundColor: COLORS.card }}
        >
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p)}
              className="w-full text-left px-4 py-3 transition-colors hover:opacity-80"
              style={{
                backgroundColor: selected?.id === p.id ? COLORS.paper : "transparent",
              }}
            >
              <div className="text-sm font-serif font-semibold" style={{ color: COLORS.forestDeep }}>
                {p.name}
              </div>
              {p.brand && (
                <div className="text-xs font-mono mt-0.5" style={{ color: COLORS.inkSoft }}>
                  {p.brand}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="p-6 border" style={{ backgroundColor: COLORS.card, borderColor: COLORS.line }}>
          {!selected ? (
            <p className="text-sm font-mono" style={{ color: COLORS.inkSoft }}>
              Select a result to see its note pyramid and accords.
            </p>
          ) : (
            <div>
              <h3 className="text-lg font-serif italic mb-1" style={{ color: COLORS.forestDeep }}>
                {selected.name}
              </h3>
              {selected.brand && (
                <p className="text-xs font-mono mb-4" style={{ color: COLORS.inkSoft }}>
                  {selected.brand}
                </p>
              )}

              <NoteGroup label="Top notes" notes={selected.top_notes} />
              <NoteGroup label="Middle notes" notes={selected.middle_notes} />
              <NoteGroup label="Base notes" notes={selected.base_notes} />
              <NoteGroup label="Main accords" notes={selected.main_accords} />

              {selected.description && (
                <p className="text-sm mt-3 leading-relaxed" style={{ color: COLORS.ink }}>
                  {selected.description}
                </p>
              )}

              <button
                type="button"
                onClick={() => onSelectPerfume && onSelectPerfume(selected)}
                className="mt-5 px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: COLORS.forest, color: "#fff" }}
              >
                Use in calculator →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
