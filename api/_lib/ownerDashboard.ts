import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function ownerDashboard(req: VercelRequest, res: VercelResponse, actor: string, db: SupabaseClient) {
  if (!process.env.KYPHIRA_OWNER_USER_ID || actor !== process.env.KYPHIRA_OWNER_USER_ID) {
    return res.status(403).json({ error: 'Owner access required.' });
  }
  // Use POST for reads too, so email searches never enter URL or access logs.
  const body = req.body ?? {};
  let name: string;
  let args = {};
  switch (body.view) {
    case 'overview':
      name = 'owner_overview';
      break;
    case 'directory':
      if (typeof body.search !== 'string' || body.search.length > 254 ||
          !Number.isSafeInteger(body.page) || body.page < 0 || body.page > 2147483647) {
        return res.status(400).json({ error: 'Invalid search or page.' });
      }
      name = 'owner_directory';
      args = { search: body.search.trim(), page: body.page };
      break;
    case 'detail':
      if (!uuid.test(body.target)) return res.status(400).json({ error: 'Invalid account ID.' });
      name = 'owner_detail';
      args = { target_id: body.target };
      break;
    case 'action': {
      const extend = body.operation === 'extend_trial';
      if ((!extend && body.operation !== 'revoke_sessions') || !uuid.test(body.target) ||
          !uuid.test(body.requestId) || typeof body.reason !== 'string' || !body.reason.trim() ||
          body.reason.length > 500 || (extend && (typeof body.end !== 'string' ||
          !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(body.end) || !Number.isFinite(Date.parse(body.end))))) {
        return res.status(400).json({ error: 'Check the account, reason, and expiration.' });
      }
      name = 'owner_action';
      args = { actor_id: actor, target_id: body.target, operation: body.operation, note: body.reason.trim(),
        request_key: body.requestId, new_end: extend ? body.end : null };
      break;
    }
    default: return res.status(400).json({ error: 'Unknown dashboard request.' });
  }
  const { data, error } = await db.rpc(name, args);
  if (error) return res.status(503).json({ error: 'Dashboard database unavailable. Please retry.' });
  if (data === null) return res.status(404).json({ error: 'Account not found.' });
  if (body.view === 'action' && !data.ok) return res.status(409).json({ error: data.message });
  if (body.view === 'directory') return res.json({ rows: data.slice(0, 25), more: data.length > 25 });
  return res.json(data);
}
