// Test harness for the API handlers: an in-memory stand-in for the parts of
// the Supabase client the handlers use, and fake Vercel req/res objects.
// No network, no new dependencies. Tables are plain arrays of rows; queries
// filter with .eq() and the result has supabase-js's { data, error, count }
// shape. Failures are injected per table and operation.

type Row = Record<string, any>;
type Op = 'select' | 'insert' | 'update' | 'upsert' | 'delete';
type Failure = { table: string; op: Op; error: any; times?: number };

export class FakeDb {
  tables: Record<string, Row[]> = {};
  failures: Failure[] = [];
  rpcs: { name: string; args: any }[] = [];
  rpcHandlers: Record<string, (args: any) => { data: any; error: any }> = {};
  /** Every write, in order, for asserting what a handler did. */
  writes: { table: string; op: Op; value: any }[] = [];

  constructor(seed: Record<string, Row[]> = {}) {
    for (const [t, rows] of Object.entries(seed)) this.tables[t] = rows.map((r) => ({ ...r }));
  }

  rows(table: string) {
    return (this.tables[table] ||= []);
  }

  fail(table: string, op: Op, error: any, times = 1) {
    this.failures.push({ table, op, error, times });
  }

  takeFailure(table: string, op: Op) {
    const f = this.failures.find((x) => x.table === table && x.op === op && (x.times ?? 1) > 0);
    if (!f) return null;
    f.times = (f.times ?? 1) - 1;
    return f.error;
  }

  from(table: string) {
    return new Query(this, table);
  }

  async rpc(name: string, args: any) {
    this.rpcs.push({ name, args });
    const h = this.rpcHandlers[name];
    return h ? h(args) : { data: null, error: null };
  }
}

class Query implements PromiseLike<any> {
  private filters: [string, any][] = [];
  private ilikes: [string, string][] = [];
  private op: Op = 'select';
  private value: any;
  private wantRows = true;
  private countMode = false;
  private head = false;
  private one: 'maybe' | 'single' | null = null;
  private upsertConflict = 'id';
  private limitN: number | null = null;
  private orderBy: { col: string; asc: boolean } | null = null;

  constructor(private db: FakeDb, private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op === 'select') this.op = 'select';
    this.wantRows = true;
    if (opts?.count) this.countMode = true;
    if (opts?.head) this.head = true;
    return this;
  }
  insert(rows: Row[] | Row) { this.op = 'insert'; this.value = Array.isArray(rows) ? rows : [rows]; this.wantRows = false; return this; }
  update(values: Row) { this.op = 'update'; this.value = values; this.wantRows = false; return this; }
  upsert(row: Row, opts?: { onConflict?: string }) { this.op = 'upsert'; this.value = row; this.upsertConflict = opts?.onConflict || 'id'; this.wantRows = false; return this; }
  delete() { this.op = 'delete'; this.wantRows = false; return this; }
  eq(col: string, v: any) { this.filters.push([col, v]); return this; }
  ilike(col: string, pattern: string) { this.ilikes.push([col, pattern]); return this; }
  order(col: string, opts?: { ascending?: boolean; referencedTable?: string }) {
    if (!opts?.referencedTable) this.orderBy = { col, asc: opts?.ascending !== false };
    return this;
  }
  limit(n: number) { this.limitN = n; return this; }
  maybeSingle() { this.one = 'maybe'; return this; }
  single() { this.one = 'single'; return this; }

  private matches(r: Row) {
    return this.filters.every(([c, v]) => r[c] === v)
      && this.ilikes.every(([c, p]) => new RegExp(`^${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')}$`, 'i').test(String(r[c] ?? '')));
  }

  private run(): { data: any; error: any; count?: number } {
    const failure = this.db.takeFailure(this.table, this.op);
    if (failure) return { data: null, error: failure };
    const rows = this.db.rows(this.table);
    let out: Row[] = [];

    if (this.op === 'select') {
      out = rows.filter((r) => this.matches(r));
      if (this.orderBy) {
        const { col, asc } = this.orderBy;
        out = [...out].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (asc ? 1 : -1));
      }
      if (this.limitN != null) out = out.slice(0, this.limitN);
      if (this.countMode && this.head) return { data: null, error: null, count: out.length };
    } else if (this.op === 'insert') {
      for (const r of this.value) {
        if (r.id && rows.some((x) => x.id === r.id)) return { data: null, error: { code: '23505', message: 'duplicate key value' } };
      }
      out = this.value.map((r: Row) => ({ id: r.id ?? crypto.randomUUID(), ...r }));
      rows.push(...out);
      this.db.writes.push({ table: this.table, op: 'insert', value: out });
    } else if (this.op === 'update') {
      out = rows.filter((r) => this.matches(r));
      for (const r of out) Object.assign(r, this.value);
      this.db.writes.push({ table: this.table, op: 'update', value: { set: this.value, where: this.filters } });
    } else if (this.op === 'upsert') {
      // onConflict may name several columns ('user_id, fragrance_id').
      const keys = this.upsertConflict.split(',').map((k) => k.trim());
      const existing = rows.find((r) => keys.every((k) => r[k] === this.value[k]));
      if (existing) Object.assign(existing, this.value);
      else rows.push({ ...this.value });
      out = [existing ?? rows[rows.length - 1]];
      this.db.writes.push({ table: this.table, op: 'upsert', value: this.value });
    } else if (this.op === 'delete') {
      out = rows.filter((r) => this.matches(r));
      this.db.tables[this.table] = rows.filter((r) => !this.matches(r));
      this.db.writes.push({ table: this.table, op: 'delete', value: this.filters });
    }

    const copy = out.map((r) => ({ ...r }));
    if (this.one === 'maybe') return { data: copy[0] ?? null, error: copy.length > 1 ? { message: 'multiple rows' } : null };
    if (this.one === 'single') return copy.length === 1 ? { data: copy[0], error: null } : { data: null, error: { code: 'PGRST116', message: 'no rows' } };
    return { data: this.wantRows || this.op !== 'select' ? copy : copy, error: null };
  }

  then<T1 = any, T2 = never>(ok?: ((v: any) => T1 | PromiseLike<T1>) | null, bad?: ((e: any) => T2 | PromiseLike<T2>) | null) {
    return Promise.resolve().then(() => this.run()).then(ok, bad);
  }
}

export function fakeReq(method: string, { body, query, headers }: { body?: any; query?: Record<string, any>; headers?: Record<string, string> } = {}) {
  return { method, body, query: query || {}, headers: { authorization: 'Bearer test-token', ...(headers || {}) } } as any;
}

export function fakeRes() {
  const res: any = { statusCode: 200, body: undefined, headers: {} as Record<string, string> };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  res.end = () => res;
  res.send = (b: any) => { res.body = b; return res; };
  res.setHeader = (k: string, v: string) => { res.headers[k.toLowerCase()] = v; return res; };
  return res;
}

export const USER = '00000000-0000-4000-8000-000000000001';
export const OTHER = '00000000-0000-4000-8000-000000000002';
export const PRO_PLAN = { id: 'pro', name: 'Pro', features: ['batches.unlimited', 'inventory', 'ai.ask', 'export.labels', 'cards.download', 'journal.insights'], batch_cap: null };
export const FREE_PLAN = { id: 'free', name: 'Free', features: ['cards.download'], batch_cap: 25 };

/** A fake db with the two plans and the user on `plan`. */
export function dbFor(plan: 'pro' | 'free', seed: Record<string, Row[]> = {}) {
  const db = new FakeDb({
    plans: [PRO_PLAN, FREE_PLAN],
    user_plans: plan === 'pro' ? [{ user_id: USER, plan_id: 'pro', plans: PRO_PLAN }] : [],
    batches: [],
    rate_limits: [],
    ...seed,
  });
  db.rpcHandlers.hit_rate_limit = () => ({ data: 1, error: null });
  return db;
}
