import { describe, expect, it, vi } from 'vitest';
import { clientIp, overLimit } from './rateLimit.js';

function fakeRes() {
  const res: any = { headers: {} as Record<string, string> };
  res.setHeader = (k: string, v: string) => { res.headers[k] = v; };
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}
const client = (result: { data: unknown; error: unknown }) => ({ rpc: vi.fn(async () => result) }) as any;

describe('clientIp', () => {
  it('takes the first hop', () => {
    expect(clientIp({ headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' } })).toBe('1.2.3.4');
    expect(clientIp({ headers: { 'x-vercel-forwarded-for': '5.6.7.8' } })).toBe('5.6.7.8');
    expect(clientIp({ headers: { 'x-real-ip': ['9.9.9.9'] } })).toBe('9.9.9.9');
    expect(clientIp({ headers: {} })).toBe('unknown');
  });
});

describe('overLimit', () => {
  it('lets a request within the limit through', async () => {
    const sb = client({ data: true, error: null });
    const res = fakeRes();
    expect(await overLimit(sb, res, 'ai', 'u1')).toBe(false);
    expect(sb.rpc).toHaveBeenCalledWith('hit_rate_limit', { p_key: 'ai:u1', p_limit: 30, p_window_seconds: 3600 });
    expect(res.status).not.toHaveBeenCalled();
  });

  it('answers 429 with Retry-After when over', async () => {
    const res = fakeRes();
    expect(await overLimit(client({ data: false, error: null }), res, 'live', 'ip')).toBe(true);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.headers['Retry-After']).toBe('600');
    expect(res.json.mock.calls[0][0].code).toBe('rate_limited');
  });

  it('fails open when the counter is unreachable', async () => {
    const res = fakeRes();
    expect(await overLimit(client({ data: null, error: { message: 'down' } }), res, 'batch', 'u')).toBe(false);
    expect(res.status).not.toHaveBeenCalled();
  });
});
