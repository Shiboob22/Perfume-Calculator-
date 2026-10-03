import React, { useEffect, useRef, useState } from "react";
import { COLORS } from "../lib/theme";
import { askPerfumer } from "../lib/aiApi";
import { useI18n } from "../i18n/I18nProvider";
import { errorText } from "../i18n/errorText";

const STARTERS = ["gourmandExtrait", "sharpAfterWeek", "longestRest"];

// Conversation lives in component state only — it resets on reload by design.
export default function PerfumerChat() {
  const { t, locale } = useI18n();
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
      setError(errorText(t, e, "chat.unreachable"));
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
        <h2 className="font-serif italic text-3xl" style={{ color: COLORS.forestDeep }}>{t("chat.title")}</h2>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => { setMessages([]); setError(""); }}
            className="text-xs font-mono underline"
            style={{ color: COLORS.inkSoft }}
          >
            {t("chat.newConversation")}
          </button>
        )}
      </div>

      <p className="text-xs mb-4" style={{ color: COLORS.dim }}>
        {t("chat.disclosure")}{" "}
        <a href={`${locale === "ar" ? "/ar" : ""}/privacy#ai`} className="underline" style={{ color: COLORS.inkSoft }}>{t("chat.disclosureLink")}</a>
      </p>

      {messages.length === 0 && (
        <div className="mb-6">
          <p className="text-sm mb-3" style={{ color: COLORS.inkSoft }}>
            {t("chat.intro")}
          </p>
          <div className="flex flex-col gap-2">
            {STARTERS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => send(t(`chat.starters.${key}`))}
                disabled={sending}
                className="text-start px-4 py-2 text-sm font-serif italic border rounded-lg disabled:opacity-50"
                style={{ borderColor: COLORS.line, backgroundColor: COLORS.card, color: COLORS.ink }}
              >
                {t(`chat.starters.${key}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* role=log: new replies are read out as they arrive. */}
      <div role="log" aria-live="polite" aria-label={t("chat.title")} className="space-y-3 mb-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className="px-4 py-3 text-sm rounded-lg whitespace-pre-wrap"
            style={
              m.role === "user"
                ? { marginInlineStart: "15%", backgroundColor: COLORS.cardHi, border: `1px solid ${COLORS.amberDeep}`, color: COLORS.ink }
                : { marginInlineEnd: "15%", backgroundColor: COLORS.card, border: `1px solid ${COLORS.line}`, color: COLORS.ink }
            }
          >
            {m.text}
          </div>
        ))}
        {sending && (
          <p className="text-xs font-mono animate-pulse" style={{ color: COLORS.inkSoft }}>{t("chat.thinking")}</p>
        )}
        <div ref={endRef} />
      </div>

      {error && <p role="alert" className="text-sm mb-2" style={{ color: COLORS.danger }}>{error}</p>}

      <div className="flex gap-2 items-end">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          maxLength={2000}
          placeholder={t("chat.placeholder")}
          aria-label={t("chat.placeholder")}
          className="flex-1 px-3 py-2 text-sm border rounded-lg resize-y focus:outline-none focus:ring-2"
          style={{ borderColor: COLORS.field, backgroundColor: COLORS.cardHi, color: COLORS.ink }}
        />
        <button
          type="button"
          onClick={() => send(draft)}
          disabled={sending || !draft.trim()}
          className="px-5 py-3 text-sm font-semibold rounded-lg disabled:opacity-50"
          style={{ backgroundColor: COLORS.amber, color: COLORS.onAmber }}
        >
          {t("chat.send")}
        </button>
      </div>
      <p className="text-xs mt-2" style={{ color: COLORS.dim }}>
        {t("chat.footnote")}
      </p>
    </div>
  );
}
