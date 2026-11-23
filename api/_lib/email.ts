// One place that sends mail through Resend. Returns false (and logs) when the
// key is missing or the send fails; callers decide what a failure means.
export interface Mail {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
  headers?: Record<string, string>;
}

export async function sendEmail(mail: Mail, type = 'email'): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.error(JSON.stringify({ type, error: 'RESEND_API_KEY not set' })); return false; }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: mail.from || 'Kyphira <onboarding@resend.dev>',
        to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html, headers: mail.headers,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) { console.error(JSON.stringify({ type, status: res.status, body: (await res.text()).slice(0, 300) })); return false; }
    return true;
  } catch (err: any) {
    console.error(JSON.stringify({ type, error: String(err?.message ?? err).slice(0, 300) }));
    return false;
  }
}
