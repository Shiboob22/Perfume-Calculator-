import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fakeReq, fakeRes, USER, OTHER } from './harness.js';
import handler from '../../me.js';

const { auth, rpc } = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: auth }, rpc }), isAuthRetryableFetchError: () => false,
}));

async function call(token = 'test', body = { view: 'overview' } as any) {
  const req = fakeReq('POST', { body, query: { owner: '1' } });
  req.headers.authorization = token && 'Bearer ' + token;
  const res = fakeRes();
  await handler(req, res);
  return res;
}
beforeEach(() => {
  vi.stubEnv('KYPHIRA_OWNER_USER_ID', USER);
  auth.mockResolvedValue({ data: { user: { id: USER } } });
  rpc.mockResolvedValue({ data: {}, error: null });
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

it('requires a verified session', async () => {
  expect((await call('')).statusCode).toBe(401);
  auth.mockResolvedValue({ data: { user: null } });
  expect((await call()).statusCode).toBe(401);
  expect(rpc).not.toHaveBeenCalled();
});
it.each([{}, { role: 'moderator' }])('denies a non-owner including moderators', async metadata => {
  auth.mockResolvedValue({ data: { user: { id: OTHER, app_metadata: metadata } } });
  expect((await call()).statusCode).toBe(403);
  expect(rpc).not.toHaveBeenCalled();
});
it('denies access with no configured owner', async () => {
  vi.stubEnv('KYPHIRA_OWNER_USER_ID', '');
  expect((await call()).statusCode).toBe(403);
  expect(rpc).not.toHaveBeenCalled();
});
it('uses the verified owner and rejects an invalid target', async () => {
  expect((await call()).statusCode).toBe(200);
  expect(rpc).toHaveBeenCalledWith('owner_overview', {});
  expect((await call('test', { view: 'detail', target: 'invalid' })).statusCode).toBe(400);
});
it('returns a bounded directory page and the next-page indicator', async () => {
  rpc.mockResolvedValue({ data: Array.from({ length: 26 }, (_, id) => ({ id })), error: null });
  const res = await call('test', { view: 'directory', search: '  Naf  ', page: 2 });
  expect(res.body.rows).toHaveLength(25);
  expect(res.body.more).toBe(true);
  expect(rpc).toHaveBeenCalledWith('owner_directory', { search: 'Naf', page: 2 });
});
it('passes only the verified actor to the audit operation', async () => {
  rpc.mockResolvedValue({ data: { ok: true, affected: 2 }, error: null });
  const res = await call('test', { view: 'action', operation: 'revoke_sessions', actor: OTHER,
    reason: 'Lost device', target: OTHER, requestId: USER });
  expect(res.statusCode).toBe(200);
  expect(rpc).toHaveBeenCalledWith('owner_action', { operation: 'revoke_sessions', actor_id: USER,
    note: 'Lost device', target_id: OTHER, request_key: USER, new_end: null });
});
