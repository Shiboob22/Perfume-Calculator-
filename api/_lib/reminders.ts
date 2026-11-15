import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac } from 'node:crypto';
import { serviceClient, UUID } from './http.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadEntitlements, can, lockedFeature } from './entitlements.js';
import { sendPush, vapidFromEnv, validEndpoint } from './webpush.js';
import { sendEmail } from './email.js';
import { dueToday, type MilestoneKey } from '../../src/lib/calc/restTracker.js';

// Journal reminders (J2). A daily job (Vercel Cron, GET /api/checkins?job=reminders
// with `Authorization: Bearer $CRON_SECRET`) emails each Pro owner one digest of
// the batches that reached a milestone and have no note, for batches whose bell
// is on (batches.remind). A milestone is announced once (reminder_sends). Day 0
// is never announced: the owner is at the bench. One-click unsubscribe turns the
// bell off on every batch of that owner.
//   GET /api/checkins?unsub=<userId>.<token>   unsubscribe link in each email
// Kill switch: REMINDERS_ENABLED=0.

const DAY_MS = 24 * 60 * 60 * 1000;
const SKIP: ReadonlySet<MilestoneKey> = new Set(['d1']);

export const MILESTONE_NAMES: Record<'en' | 'ar', Record<MilestoneKey, string>> = {
  en: { d1: 'Day 1', w1: 'Week 1', w2: 'Week 2', m1: 'Month 1', m3: 'Month 3' },
  ar: { d1: 'اليوم 1', w1: 'الأسبوع 1', w2: 'الأسبوع 2', m1: 'الشهر 1', m3: 'الشهر 3' },
};

export interface ReminderBatch {
  id: string;
  user_id: string;
  batch_no: number | null;
  fragrance_name: string;
  blend_date?: string | null;
  created_at?: string | null;
  batch_checkins?: Array<{ id: string; day: number; scheduled_day?: number | null; skipped?: boolean | null; created_at?: string | null }> | null;
}

/** Start of a batch's rest, ms: its blend date (a calendar day) else when it was logged. */
export function batchStart(b: Pick<ReminderBatch, 'blend_date' | 'created_at'>): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(b.blend_date ?? '');
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const t = Date.parse(b.created_at ?? '');
  return Number.isFinite(t) ? Math.floor(t / DAY_MS) * DAY_MS : NaN;
}

export interface Due { batch: ReminderBatch; k: MilestoneKey }

/** Batches owing a note today, minus Day 1 and the ones already announced (`sent` = "batchId:milestone"). */
export function remindersDue(batches: readonly ReminderBatch[], now: Date, sent: ReadonlySet<string> = new Set()): Due[] {
  const today = Math.floor(now.getTime() / DAY_MS) * DAY_MS;
  const items = batches.map((batch) => {
    const start = batchStart(batch);
    return { batch, start, day: Number.isFinite(start) ? Math.max(0, Math.floor((today - start) / DAY_MS)) : 0, no: Number(batch.batch_no) || 0, checkins: batch.batch_checkins };
  });
  return dueToday(items)
    .filter((d) => !SKIP.has(d.k) && !sent.has(`${d.item.batch.id}:${d.k}`))
    .map((d) => ({ batch: d.item.batch, k: d.k }));
}

export function unsubToken(userId: string, secret: string): string {
  return createHmac('sha256', secret).update(`unsub:${userId}`).digest('hex').slice(0, 32);
}

export function verifyUnsub(value: string, secret: string): string | null {
  const [id, token] = value.split('.');
  if (!id || !token || !UUID.test(id)) return null;
  const want = unsubToken(id, secret);
  if (want.length !== token.length) return null;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0 ? id : null;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const no = (b: ReminderBatch) => String(b.batch_no ?? 0).padStart(3, '0');

/** The digest's subject, text and HTML in the owner's language. */
export function buildDigest(due: readonly Due[], lang: 'en' | 'ar', links: { journal: string; unsub: string }) {
  const names = MILESTONE_NAMES[lang];
  const lines = due.map((d) => lang === 'ar'
    ? `رقم ${no(d.batch)}، ${d.batch.fragrance_name}: ${names[d.k]}`
    : `No. ${no(d.batch)}, ${d.batch.fragrance_name}: ${names[d.k]}`);
  const subject = lang === 'ar'
    ? (due.length === 1 ? 'حان وقت شمّ دفعة' : `حان وقت شمّ ${due.length} دفعات`)
    : (due.length === 1 ? 'A batch is ready to smell' : `${due.length} batches are ready to smell`);
  const intro = lang === 'ar' ? 'شمّها وسجّل ملاحظة في دفتر كيفيرا:' : 'Smell it and add a note in your Kyphira Journal:';
  const open = lang === 'ar' ? 'افتح الدفتر' : 'Open the Journal';
  const stop = lang === 'ar' ? 'إيقاف هذه التذكيرات' : 'Stop these reminders';
  const why = lang === 'ar' ? 'تصلك هذه الرسالة لأنك فعّلت التذكير على دفعاتك.' : 'You get this because you switched the reminder on for your batches.';
  const text = [intro, '', ...lines, '', `${open}: ${links.journal}`, '', why, `${stop}: ${links.unsub}`].join('\n');
  const html = `<div dir="${lang === 'ar' ? 'rtl' : 'ltr'}" style="font-family:Georgia,serif;max-width:480px;color:#1d1a16"><p>${esc(intro)}</p><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul><p><a href="${esc(links.journal)}">${esc(open)}</a></p><p style="font-size:12px;color:#6b6258">${esc(why)} <a href="${esc(links.unsub)}">${esc(stop)}</a></p></div>`;
  return { subject, text, html };
}

function siteUrl(): string {
  return (process.env.SITE_URL || 'https://scent-handbook-app.vercel.app').replace(/\/$/, '');
}

/**
 * GET /api/checkins?job=reminders (cron). `?dry=1` reports what would be sent and sends nothing.
 * Two channels, each with its own switch: email (REMINDERS_ENABLED=0 turns it off) and web push
 * (PUSH_ENABLED=0 turns it off; it also needs the VAPID keys). Each is announced once per
 * milestone (reminder_sends.channel).
 */
export async function runReminders(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized.' });
  const emailOn = process.env.REMINDERS_ENABLED !== '0';
  const vapid = process.env.PUSH_ENABLED === '0' ? null : vapidFromEnv();
  if (!emailOn && !vapid) return res.status(200).json({ skipped: 'disabled' });
  const dry = req.query.dry === '1';
  const now = new Date();
  const supabase = serviceClient();
  const out = { users: 0, sent: 0, failed: 0, push: { sent: 0, gone: 0, failed: 0 }, dry, would: [] as Array<{ user: string; channel: string; items: string[] }> };
  try {
    const { data: rows, error } = await supabase
      .from('batches')
      .select('id, user_id, batch_no, fragrance_name, blend_date, created_at, batch_checkins ( id, day, scheduled_day, skipped, created_at )')
      .eq('remind', true).limit(2000);
    if (error) throw error;
    const byUser = new Map<string, ReminderBatch[]>();
    for (const b of (rows ?? []) as ReminderBatch[]) byUser.set(b.user_id, [...(byUser.get(b.user_id) ?? []), b]);

    for (const [userId, batches] of byUser) {
      const entitlements = await loadEntitlements(supabase, userId);
      if (!can(entitlements, 'reminders')) continue;
      const { data: done, error: doneError } = await supabase
        .from('reminder_sends').select('batch_id, milestone, channel').eq('user_id', userId);
      if (doneError) throw doneError;
      const sentOn = (channel: string) => new Set((done ?? []).filter((r: any) => r.channel === channel).map((r: any) => `${r.batch_id}:${r.milestone}`));
      const dueEmail = emailOn ? remindersDue(batches, now, sentOn('email')) : [];
      const duePush = vapid ? remindersDue(batches, now, sentOn('push')) : [];
      if (!dueEmail.length && !duePush.length) continue;
      out.users += 1;
      const record = async (due: Due[], channel: 'email' | 'push') => {
        const { error: insertError } = await supabase.from('reminder_sends').upsert(
          due.map((d) => ({ batch_id: d.batch.id, user_id: userId, milestone: d.k, channel })),
          { onConflict: 'batch_id,milestone,channel', ignoreDuplicates: true });
        if (insertError) console.error(JSON.stringify({ type: 'journal_reminder', channel, error: insertError.message }));
      };

      // Web push: an empty push to every device this owner turned it on for.
      if (duePush.length) {
        const { data: subs } = await supabase.from('push_subscriptions').select('endpoint').eq('user_id', userId);
        if (dry) out.would.push({ user: userId, channel: 'push', items: duePush.map((d) => `${d.batch.id}:${d.k}`) });
        else if (subs?.length) {
          let delivered = false;
          for (const sub of subs) {
            const r = await sendPush(sub.endpoint, vapid!);
            out.push[r] += 1;
            if (r === 'sent') delivered = true;
            if (r === 'gone') await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', sub.endpoint);
          }
          if (delivered) await record(duePush, 'push');
        }
      }

      // Email.
      if (dueEmail.length) {
        if (dry) { out.would.push({ user: userId, channel: 'email', items: dueEmail.map((d) => `${d.batch.id}:${d.k}`) }); continue; }
        const { data: u } = await supabase.auth.admin.getUserById(userId);
        const to = u?.user?.email;
        if (!to) { out.failed += 1; continue; }
        const { data: profile } = await supabase.from('profiles').select('locale').eq('user_id', userId).maybeSingle();
        const lang = profile?.locale === 'ar' ? 'ar' : 'en';
        const base = siteUrl();
        const unsub = `${base}/api/checkins?unsub=${userId}.${unsubToken(userId, secret)}`;
        const mail = buildDigest(dueEmail, lang, { journal: `${base}${lang === 'ar' ? '/ar' : ''}/journal`, unsub });
        const ok = await sendEmail({
          to, ...mail, from: process.env.REMINDER_FROM_EMAIL || undefined,
          headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
        }, 'journal_reminder');
        if (!ok) { out.failed += 1; continue; }
        out.sent += 1;
        await record(dueEmail, 'email');
      }
    }
    return res.status(200).json(out);
  } catch (err: any) {
    console.error(JSON.stringify({ type: 'journal_reminder', error: String(err?.message ?? err).slice(0, 300) }));
    return res.status(500).json({ error: 'Reminder job failed.' });
  }
}

/** GET /api/checkins?push=key: the public key a browser subscribes with (404 when push is not set up). */
export function pushKey(_req: VercelRequest, res: VercelResponse) {
  const v = process.env.PUSH_ENABLED === '0' ? null : vapidFromEnv();
  if (!v) return res.status(404).json({ error: 'Push is not set up.', code: 'push_off' });
  return res.status(200).json({ publicKey: v.publicKey });
}

const MAX_SUBSCRIPTIONS = 10;

/** POST /api/checkins?push=subscribe { endpoint, keys }, Pro (journal.reminders): this browser is nudged. */
export async function pushSubscribe(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient, userId: string) {
  const b = req.body ?? {};
  if (!validEndpoint(b.endpoint)) return res.status(400).json({ error: 'A push endpoint is needed.', code: 'invalid_subscription' });
  const text = (v: unknown, max: number) => (typeof v === 'string' && v.length <= max ? v : null);
  try {
    if (!can(await loadEntitlements(supabase, userId), 'reminders')) return res.status(403).json(lockedFeature('journal.reminders'));
    const { count, error: countError } = await supabase.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    if (countError) throw countError;
    const { data: existing } = await supabase.from('push_subscriptions').select('id').eq('endpoint', b.endpoint).maybeSingle();
    if (!existing && (count ?? 0) >= MAX_SUBSCRIPTIONS) return res.status(409).json({ error: 'Too many devices.', code: 'too_many_devices' });
    // The same browser signing in as someone else moves the subscription to them.
    const { error } = await supabase.from('push_subscriptions').upsert(
      { user_id: userId, endpoint: b.endpoint, p256dh: text(b.keys?.p256dh, 200), auth: text(b.keys?.auth, 100) },
      { onConflict: 'endpoint' });
    if (error) throw error;
    return res.status(201).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Could not save the subscription.' });
  }
}

/** DELETE /api/checkins?push=unsubscribe { endpoint }: this browser is not nudged any more. Always allowed. */
export async function pushUnsubscribe(req: VercelRequest, res: VercelResponse, supabase: SupabaseClient, userId: string) {
  const endpoint = req.body?.endpoint;
  if (!validEndpoint(endpoint)) return res.status(400).json({ error: 'A push endpoint is needed.', code: 'invalid_subscription' });
  const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', endpoint);
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}

/** GET /api/checkins?unsub=<userId>.<token>: turns the bell off on every batch of that owner. */
export async function unsubscribe(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  const userId = secret ? verifyUnsub(String(req.query.unsub ?? ''), secret) : null;
  const page = (title: string, body: string, status = 200) => res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8')
    .send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><body style="font-family:Georgia,serif;max-width:32rem;margin:15vh auto;padding:0 1rem"><h1>${title}</h1><p>${body}</p>`);
  if (!userId) return page('Link not valid', 'This unsubscribe link is not valid. You can switch reminders off on each batch in your Journal.', 400);
  const { error } = await serviceClient().from('batches').update({ remind: false }).eq('user_id', userId).eq('remind', true);
  if (error) return page('Try again', 'We could not switch reminders off just now. Please try the link again.', 503);
  return page('Reminders are off', 'You will not get Journal reminder emails any more. You can switch them back on for a batch in your Journal.');
}
