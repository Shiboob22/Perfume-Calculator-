// What a buyer must give us, checked the same way in the checkout form and in
// api/shop.ts (which is the check that counts).

export interface Customer { name: string; phone: string; email: string; city: string; address: string; note: string | null }
export type CustomerError = 'bad_name' | 'bad_phone' | 'bad_email' | 'bad_city' | 'bad_address' | 'bad_note';
export type CustomerField = 'name' | 'phone' | 'email' | 'city' | 'address' | 'note';

const clean = (v: unknown) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim() : '');
const between = (s: string, lo: number, hi: number) => s.length >= lo && s.length <= hi;

/** Every problem with the details, by field (empty when they are fine). */
export function customerErrors(c: any): Partial<Record<CustomerField, CustomerError>> {
  const name = clean(c?.name);
  const phone = clean(c?.phone);
  const email = clean(c?.email);
  const city = clean(c?.city);
  const address = clean(c?.address);
  const note = clean(c?.note);
  const out: Partial<Record<CustomerField, CustomerError>> = {};
  if (!between(name, 2, 100)) out.name = 'bad_name';
  // Digits with the usual separators: +20 100 123 4567, (010) 1234-5678.
  if (!/^\+?[0-9][0-9 ()-]{5,18}[0-9]$/.test(phone)) out.phone = 'bad_phone';
  if (!between(email, 5, 254) || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) out.email = 'bad_email';
  if (!between(city, 2, 80)) out.city = 'bad_city';
  if (!between(address, 5, 300)) out.address = 'bad_address';
  if (note.length > 500) out.note = 'bad_note';
  return out;
}

/** The details trimmed, or the first problem found. */
export function cleanCustomer(c: any): { ok: true; customer: Customer } | { ok: false; code: CustomerError } {
  const errors = customerErrors(c);
  const first = (['name', 'phone', 'email', 'city', 'address', 'note'] as const).find((f) => errors[f]);
  if (first) return { ok: false, code: errors[first]! };
  return {
    ok: true,
    customer: { name: clean(c.name), phone: clean(c.phone), email: clean(c.email), city: clean(c.city), address: clean(c.address), note: clean(c.note) || null },
  };
}
