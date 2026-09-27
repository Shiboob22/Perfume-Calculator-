// The text to show for an error: a translated message when the error's code
// has one (errors.<code>, e.g. batch_cap, photo_exists), else its own
// message, else the given fallback key.
export function errorText(t, err, fallbackKey) {
  if (err?.code) {
    const key = `errors.${err.code}`;
    const text = t(key, err.detail || {});
    if (text !== key) return text;
  }
  return err?.message || (fallbackKey ? t(fallbackKey) : "");
}
