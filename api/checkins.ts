import type { VercelRequest, VercelResponse } from '@vercel/node';
import { setCors, serviceClient, requireUser, isTimeout, SLOW_READ, SLOW_WRITE, UUID } from './_lib/http.js';
import { overLimit } from './_lib/rateLimit.js';
import { loadEntitlements, can } from './_lib/entitlements.js';
import { parseCheckIn } from './_lib/checkin.js';
import { familyPatterns, MAX_CHECKINS_PER_BATCH } from '../src/lib/calc/journal.js';

// The Resting Journal.
//   POST   /api/checkins       a check-in (or a skip) on one of the caller's batches
//   DELETE /api/checkins?id=   remove one of the caller's check-ins
//   GET    /api/checkins       the caller's per-family patterns: the days for
//                              Pro (journal.insights), only which families
//                              are ready for Free
// Check-ins are read with the batches (GET /api/batches embeds them).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(req, res, 'GET, POST, DELETE');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabase = serviceClient();
  const userId = await requireUser(req, res);
  if (!userId) return;

  if (req.method === 'POST') {
    try {
      const parsed = parseCheckIn(req.body);
      if ('error' in parsed) return res.status(400).json({ error: parsed.error, code: 'invalid_checkin' });
      const row = parsed.row;

      // A re-sent check-in that already landed (offline retry).
      const { data: same, error: sameError } = await supabase
        .from('batch_checkins').select('*').eq('id', row.id).eq('user_id', userId).maybeSingle();
      if (sameError) throw sameError;
      if (same) return res.status(200).json({ checkin: same, duplicate: true });

      if (await overLimit(supabase, res, 'checkin', userId)) return;

      const { data: batch, error: batchError } = await supabase
        .from('batches').select('id').eq('id', row.batch_id).eq('user_id', userId).maybeSingle();
      if (batchError) throw batchError;
      if (!batch) return res.status(404).json({ error: 'Batch not found.', code: 'not_found' });

      const { count, error: countError } = await supabase
        .from('batch_checkins').select('id', { count: 'exact', head: true })
        .eq('batch_id', row.batch_id).eq('user_id', userId);
      if (countError) throw countError;
      if ((count ?? 0) >= MAX_CHECKINS_PER_BATCH) {
        return res.status(403).json({ error: `A batch keeps up to ${MAX_CHECKINS_PER_BATCH} check-ins.`, code: 'checkin_cap', cap: MAX_CHECKINS_PER_BATCH });
      }

      const { data, error } = await supabase
        .from('batch_checkins').insert([{ ...row, user_id: userId }]).select().single();
      if (error?.code === '23505' && row.scheduled_day !== null) {
        // That point was answered or skipped already (another device, or a
        // skip). An answer may replace a skip; anything else is kept.
        const { data: existing, error: existingError } = await supabase
          .from('batch_checkins').select('*')
          .eq('batch_id', row.batch_id).eq('scheduled_day', row.scheduled_day).eq('user_id', userId).maybeSingle();
        if (existingError) throw existingError;
        if (existing?.skipped && !row.skipped) {
          const { data: replaced, error: replaceError } = await supabase
            .from('batch_checkins')
            .update({ day: row.day, note: row.note, rating: row.rating, skipped: false })
            .eq('id', existing.id).eq('user_id', userId).select().single();
          if (replaceError) throw replaceError;
          return res.status(200).json({ checkin: replaced });
        }
        return res.status(409).json({ error: 'This check-in was already made.', code: 'already_answered', checkin: existing });
      }
      if (error) throw error;
      return res.status(201).json({ checkin: data });
    } catch (err: any) {
      if (isTimeout(err)) return res.status(503).json({ error: SLOW_WRITE });
      return res.status(500).json({ error: err.message || 'Failed to save the check-in' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const id = String(req.query.id ?? '');
      if (!UUID.test(id)) return res.status(400).json({ error: 'Missing check-in id.' });
      const { error } = await supabase.from('batch_checkins').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err: any) {
      if (isTimeout(err)) return res.status(503).json({ error: SLOW_WRITE });
      return res.status(500).json({ error: err.message || 'Failed to delete the check-in' });
    }
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('batch_checkins')
        .select('batch_id, day, rating, skipped, batches ( tier )')
        .eq('user_id', userId)
        .not('rating', 'is', null)
        .limit(5000);
      if (error) throw error;
      const patterns = familyPatterns(
        (data ?? []).map((r: any) => ({ batch_id: r.batch_id, day: r.day, rating: r.rating, skipped: r.skipped, tier: r.batches?.tier ?? '' }))
      );
      // The Pro gate is here, not only in the app: Free gets which families
      // have a pattern waiting, never the days.
      const entitlements = await loadEntitlements(supabase, userId);
      if (can(entitlements, 'journal.insights')) return res.status(200).json({ patterns, locked: false });
      return res.status(200).json({ ready: Object.keys(patterns), locked: true });
    } catch (err: any) {
      if (isTimeout(err)) return res.status(503).json({ error: SLOW_READ });
      return res.status(500).json({ error: err.message || 'Failed to read the journal' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
