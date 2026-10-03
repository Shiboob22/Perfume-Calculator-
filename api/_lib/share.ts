// @ts-ignore: plain JS shared with the browser
import { cleanText, textLang } from '../../src/lib/publicText.js';

const FAMILIES = ['fresh', 'floral', 'woody', 'oriental', 'gourmand'];

// The row a shared recipe stores (0013): a snapshot of the batch's PUBLIC
// fields only, picked one by one. Cost, price, supplier, the private notes
// and blended_by are never read here, so they can't be copied by mistake.
export interface ShareRow {
  batch_id: string;
  user_id: string;
  fragrance_name: string;
  tier: string;
  concentration_pct: number;
  basis: 'volume' | 'weight' | null;
  total_ml: number;
  total_g: number;
  oil_g: number;
  ethanol_g: number;
  rest_days: number | null;
  public_note: string | null;
  note_lang: 'en' | 'ar' | null;
}

/** The share row for a batch and the owner's input, or why it can't be shared. */
export function shareRow(batch: any, input: any): { row: ShareRow } | { error: string; code: string } {
  if (!FAMILIES.includes(batch?.tier)) return { error: 'Only a batch in one of the five families can be shared.', code: 'share_family' };
  const name = cleanText(batch.fragrance_name, 120);
  if (!name) return { error: 'The batch needs a name to be shared.', code: 'share_name' };
  const rest = input?.rest_days ?? null;
  if (rest !== null && !(Number.isInteger(rest) && rest >= 0 && rest <= 365)) {
    return { error: 'Rest days must be a whole number from 0 to 365.', code: 'share_rest' };
  }
  const note = cleanText(input?.public_note, 500);
  const num = (v: unknown) => Number(v);
  return {
    row: {
      batch_id: batch.id,
      user_id: batch.user_id,
      fragrance_name: name,
      tier: batch.tier,
      concentration_pct: num(batch.concentration_pct),
      basis: batch.basis === 'volume' || batch.basis === 'weight' ? batch.basis : null,
      total_ml: num(batch.total_ml),
      total_g: num(batch.total_g),
      oil_g: num(batch.oil_g),
      ethanol_g: num(batch.ethanol_g),
      rest_days: rest,
      public_note: note,
      note_lang: note ? textLang(note) : null,
    },
  };
}
