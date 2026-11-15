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

import { runReminders } from './reminders.js';

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
