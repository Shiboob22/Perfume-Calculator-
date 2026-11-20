import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';

// The daily job with a hand-made database: who is nudged by push, who by email, what is recorded.
const db = vi.hoisted(() => ({ tables: {} as Record<string, any[]>, deletes: [] as any[], upserts: [] as any[] }));

vi.mock('./entitlements.js', () => ({ loadEntitlements: async () => ({}), can: () => true, lockedFeature: () => ({}) }));
vi.mock('./http.js', () => {
  const builder = (table: string) => {
    let rows = db.tables[table] ?? [];
    const filters: Array<(r: any) => boolean> = [];
    const q: any = {
      select: () => q,
      eq: (k: string, v: any) => { filters.push((r) => r[k] === v); return q; },
      limit: () => q,
      maybeSingle: async () => ({ data: rows.filter((r) => filters.every((f) => f(r)))[0] ?? null, error: null }),
      upsert: async (v: any) => { db.upserts.push({ table, rows: v }); return { error: null }; },
      delete: () => { const d = { table, filters: [] as any[] }; db.deletes.push(d); const del: any = { eq: (k: string, v: any) => { d.filters.push([k, v]); return del; }, then: (ok: any) => ok({ error: null }) }; return del; },
      then: (ok: any) => ok({ data: rows.filter((r) => filters.every((f) => f(r))), error: null }),
    };
    return q;
  };
  return {
    serviceClient: () => ({ from: builder, auth: { admin: { getUserById: async () => ({ data: { user: { email: 'o@example.test' } } }) } } }),
    UUID: /^[0-9a-f-]{36}$/i,
  };
});

vi.mock('./rateLimit.js', () => ({ overLimit: async () => false }));

import { runReminders, sendTest, testDue } from './reminders.js';
import { serviceClient } from './http.js';

function vapid() {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const jwk = privateKey.export({ format: 'jwk' }) as any;
  const pub = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]).toString('base64url');
  return { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: jwk.d };
}
const res = () => { const r: any = { code: 0, body: null }; r.status = (c: number) => { r.code = c; return r; }; r.json = (b: any) => { r.body = b; return r; }; return r; };
const req = (q: any = {}) => ({ query: q, headers: { authorization: 'Bearer s3cret' } }) as any;
const day = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

describe('the reminder job: web push', () => {
  const keep = { ...process.env };
  beforeEach(() => {
    db.deletes.length = 0; db.upserts.length = 0;
    db.tables = {
      batches: [{ id: 'b1', remind: true, user_id: 'u1', batch_no: 7, fragrance_name: 'Oud', blend_date: day(8), created_at: new Date().toISOString(), batch_checkins: [] }],
      reminder_sends: [], push_subscriptions: [{ user_id: 'u1', endpoint: 'https://push.test/a' }, { user_id: 'u1', endpoint: 'https://push.test/gone' }],
      profiles: [{ user_id: 'u1', locale: 'en' }],
    };
    process.env.CRON_SECRET = 's3cret';
    Object.assign(process.env, vapid());
    process.env.REMINDERS_ENABLED = '0'; // email off: push alone
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(null, { status: url.endsWith('/gone') ? 410 : 201 })));
  });
  afterEach(() => { process.env = { ...keep }; vi.unstubAllGlobals(); });

  it('pushes to every device, drops the gone one, records the milestone once', async () => {
    const r = res();
    await runReminders(req(), r);
    expect(r.code).toBe(200);
    expect(r.body.push).toEqual({ sent: 1, gone: 1, failed: 0 });
    expect(db.deletes).toEqual([{ table: 'push_subscriptions', filters: [['user_id', 'u1'], ['endpoint', 'https://push.test/gone']] }]);
    expect(db.upserts).toEqual([{ table: 'reminder_sends', rows: [{ batch_id: 'b1', user_id: 'u1', milestone: 'w1', channel: 'push' }] }]);
    expect((fetch as any).mock.calls.every(([, init]: any) => !init.body)).toBe(true); // empty pushes
  });
  it('is quiet when that milestone was already pushed', async () => {
    db.tables.reminder_sends = [{ batch_id: 'b1', user_id: 'u1', milestone: 'w1', channel: 'push' }];
    const r = res();
    await runReminders(req(), r);
    expect(r.body.users).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
    db.tables.reminder_sends = [];
    const again = res();
    await runReminders(req({ dry: '1' }), again);
    expect(again.body.users).toBe(1); // the same batch is due when nothing was recorded
  });
  it('does not record a push nobody received', async () => {
    db.tables.push_subscriptions = [{ user_id: 'u1', endpoint: 'https://push.test/gone' }];
    const r = res();
    await runReminders(req(), r);
    expect(db.upserts).toEqual([]);
  });
  it('a dry run says what would be pushed and sends nothing', async () => {
    const r = res();
    await runReminders(req({ dry: '1' }), r);
    expect(r.body.would).toEqual([{ user: 'u1', channel: 'push', items: ['b1:w1'] }]);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('skips everything when email is off and push has no keys, and refuses a wrong secret', async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    const r = res();
    await runReminders(req(), r);
    expect(r.body).toEqual({ skipped: 'disabled' });
    const bad = res();
    await runReminders({ query: {}, headers: { authorization: 'Bearer nope' } } as any, bad);
    expect(bad.code).toBe(401);
  });
});

describe('send me a test (admins)', () => {
  const keep = { ...process.env };
  beforeEach(() => {
    db.deletes.length = 0; db.upserts.length = 0;
    db.tables = {
      admins: [{ user_id: 'u1' }],
      batches: [{ id: 'b1', user_id: 'u1', batch_no: 7, fragrance_name: 'Oud', blend_date: day(3), created_at: new Date().toISOString(), batch_checkins: [] }],
      reminder_sends: [], push_subscriptions: [{ user_id: 'u1', endpoint: 'https://push.test/a' }, { user_id: 'u1', endpoint: 'https://push.test/gone' }],
      profiles: [{ user_id: 'u1', locale: 'en' }],
    };
    process.env.CRON_SECRET = 's3cret';
    process.env.RESEND_API_KEY = 're_test';
    Object.assign(process.env, vapid());
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(null, { status: url.endsWith('/gone') ? 410 : url.includes('resend') ? 200 : 201 })));
  });
  afterEach(() => { process.env = { ...keep }; vi.unstubAllGlobals(); });

  it('refuses anyone who is not an admin, and sends nothing', async () => {
    const r = res();
    await sendTest({} as any, r, serviceClient() as any, 'u2');
    expect(r.code).toBe(403);
    expect(r.body.code).toBe('admin_only');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('emails a marked digest and pushes every device, recording nothing', async () => {
    const r = res();
    await sendTest({} as any, r, serviceClient() as any, 'u1');
    expect(r.code).toBe(200);
    expect(r.body).toEqual({ email: 'sent', push: { devices: 2, sent: 1, gone: 1, failed: 0 }, items: 1 });
    const mail = (fetch as any).mock.calls.find(([url]: any) => url.includes('resend'));
    const body = JSON.parse(mail[1].body);
    expect(body.to).toEqual(['o@example.test']);
    expect(body.subject).toBe('[Test] A batch is ready to smell');
    expect(body.text).toContain('No. 007, Oud: Week 1');
    expect(db.upserts).toEqual([]); // the daily job still announces it
  });
  it('says what is switched off', async () => {
    process.env.REMINDERS_ENABLED = '0';
    process.env.PUSH_ENABLED = '0';
    const r = res();
    await sendTest({} as any, r, serviceClient() as any, 'u1');
    expect(r.body).toEqual({ email: 'off', push: 'off', items: 1 });
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('testDue', () => {
  const now = new Date();
  it('uses the batches really owing a note', () => {
    const due = testDue([{ id: 'b1', user_id: 'u', batch_no: 2, fragrance_name: 'A', blend_date: day(15) }], now);
    expect(due.map((d) => d.k)).toEqual(['w2']);
  });
  it('falls back to the newest batch at Week 1, then to a sample', () => {
    const batches = [
      { id: 'b1', user_id: 'u', batch_no: 2, fragrance_name: 'A', blend_date: day(0) },
      { id: 'b2', user_id: 'u', batch_no: 9, fragrance_name: 'B', blend_date: day(0) },
    ];
    expect(testDue(batches, now)).toEqual([{ batch: batches[1], k: 'w1' }]);
    expect(testDue([], now)[0]).toMatchObject({ k: 'w1', batch: { fragrance_name: 'Sample batch' } });
  });
});
