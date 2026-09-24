import React, { useEffect, useRef, useState } from "react";
import { COLORS } from "../lib/theme";
import { askPerfumer } from "../lib/aiApi";

const STARTERS = [
  "What concentration suits a gourmand extrait?",
  "My blend smells sharp after a week — what should I do?",
  "Which of my recent batches needs the longest rest?",
];

// Conversation lives in component state only — it resets on reload by design.
export default function PerfumerChat() {
  const [messages, setMessages] = useState([]); // [{ role: 'user' | 'model', text }]
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  async function send(text) {
    const question = text.trim();
    if (!question || sending) return;
    const next = [...messages, { role: "user", text: question }];
    setMessages(next);
    setDraft("");
    setError("");
    setSending(true);
    try {
      const reply = await askPerfumer(next);
      setMessages([...next, { role: "model", text: reply }]);
    } catch (e) {
      // Drop the unanswered question and put it back in the box to retry.
      setMessages(messages);
      setDraft(question);
      setError(e.message || "Could not reach Gemini.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(draft);
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-6 sm:p-8" style={{ backgroundColor: COLORS.paper, color: COLORS.ink }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-serif font-semibold" style={{ color: COLORS.forestDeep }}>Ask the perfumer</h2>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => { setMessages([]); setError(""); }}
            className="text-xs font-mono underline"
            style={{ color: COLORS.inkSoft }}
          >
            New conversation
          </button>
        )}
      </div>

      {messages.length === 0 && (
        <div className="mb-6">
          <p className="text-sm font-mono mb-3" style={{ color: COLORS.inkSoft }}>
            Gemini knows your five families and your recent batches. Try:
          </p>
          <div className="flex flex-col gap-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={sending}
                className="text-left px-4 py-2 text-sm font-serif italic border rounded-lg disabled:opacity-50"
                style={{ borderColor: COLORS.line, backgroundColor: COLORS.card, color: COLORS.ink }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 mb-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className="px-4 py-3 text-sm rounded-lg whitespace-pre-wrap"
            style={
              m.role === "user"
                ? { marginLeft: "15%", backgroundColor: COLORS.cardHi, border: `1px solid ${COLORS.amberDeep}`, color: COLORS.ink }
                : { marginRight: "15%", backgroundColor: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.ink }
            }
          >
            {m.text}
          </div>
        ))}
        {sending && (
          <p className="text-xs font-mono animate-pulse" style={{ color: COLORS.inkSoft }}>Gemini is thinking…</p>
        )}
        <div ref={endRef} />
      </div>

      {error && <p className="text-sm font-mono mb-2" style={{ color: COLORS.danger }}>{error}</p>}

      <div className="flex gap-2 items-end">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          maxLength={2000}
          placeholder="Ask about concentrations, maceration, substitutions…"
          className="flex-1 px-3 py-2 font-mono text-sm border rounded-lg resize-y focus:outline-none"
          style={{ borderColor: COLORS.line, backgroundColor: COLORS.cardHi, color: COLORS.ink }}
        />
        <button
          type="button"
          onClick={() => send(draft)}
          disabled={sending || !draft.trim()}
          className="px-5 py-3 text-sm font-semibold rounded-lg disabled:opacity-50"
          style={{ backgroundColor: COLORS.amber, color: COLORS.onAmber }}
        >
          Send
        </button>
      </div>
      <p className="text-[10px] font-mono mt-2" style={{ color: COLORS.dim }}>
        Answers come from Gemini (free tier) and can be wrong. Enter to send, Shift+Enter for a new line.
      </p>
    </div>
  );
}
