import React from "react";
import { COLORS } from "../lib/theme";
import { useI18n } from "../i18n/I18nProvider";
import { reportError } from "../lib/reportError";

function Fallback({ onRetry }) {
  const { t } = useI18n();
  return (
    <div role="alert" className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <h1 className="font-serif italic text-3xl mb-3" style={{ color: COLORS.forestDeep }}>{t("app.crash.title")}</h1>
        <p className="text-sm mb-6" style={{ color: COLORS.inkSoft }}>{t("app.crash.text")}</p>
        <div className="flex gap-3 justify-center">
          <button type="button" onClick={onRetry} className="px-4 py-2 rounded-lg text-sm" style={{ background: COLORS.cardHi, color: COLORS.ink, border: `1px solid ${COLORS.line}` }}>{t("app.crash.retry")}</button>
          <button type="button" onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: COLORS.amber, color: COLORS.onAmber }}>{t("app.crash.reload")}</button>
        </div>
      </div>
    </div>
  );
}

// Catches a render error in the app, reports it, and offers a retry or a
// reload (a reload also fixes a chunk that went missing after a deploy).
// Saved data is safe: batches logged offline stay in the outbox.
export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportError(error, { componentStack: info?.componentStack });
  }

  render() {
    if (this.state.error) return <Fallback onRetry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}
