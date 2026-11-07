// The Shop's arithmetic: one place for the cart's prices, used by the page to
// show a total and by api/shop.ts to charge it. The server prices every order
// again from the database, so a total sent by the browser is never trusted.
// Money is counted in piastres (integers) and shown as pounds.

export const MAX_LINES = 20;
export const MAX_QTY = 20;

export interface Localized { en: string; ar: string }
export interface ShopVariant { id: string; label: Localized; price: number }
export interface ShopProduct {
  id: string;
  slug: string;
  name: Localized;
  description: Localized;
  image: string | null;
  /** Price when the product has no variants. */
  price: number;
  variants: ShopVariant[];
}
export interface CartItem { productId: string; variantId: string | null; qty: number }

export interface PricedLine {
  productId: string;
  variantId: string | null;
  name: Localized;
  variantLabel: Localized | null;
  unit: number;
  qty: number;
  subtotal: number;
}
export type PriceError = 'empty' | 'too_many' | 'bad_qty' | 'unknown_product' | 'unknown_variant';
export type Priced = { ok: true; lines: PricedLine[]; total: number } | { ok: false; code: PriceError };

const piastres = (pounds: number) => Math.round(pounds * 100);
const pounds = (p: number) => p / 100;

/** The price of one unit, or null when the variant doesn't belong to the product. */
export function unitPrice(product: ShopProduct, variantId: string | null): number | null {
  if (product.variants.length === 0) return variantId == null ? product.price : null;
  const v = product.variants.find((x) => x.id === variantId);
  return v ? v.price : null;
}

/** Cheapest price a buyer can pay for the product, for "from 150 EGP". */
export function fromPrice(product: ShopProduct): number {
  return product.variants.length ? Math.min(...product.variants.map((v) => v.price)) : product.price;
}

/** Prices a cart against the product list. Fails on the first thing wrong with it. */
export function priceCart(items: readonly CartItem[], products: readonly ShopProduct[]): Priced {
  if (!Array.isArray(items) || items.length === 0) return { ok: false, code: 'empty' };
  if (items.length > MAX_LINES) return { ok: false, code: 'too_many' };
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: PricedLine[] = [];
  let total = 0;
  for (const it of items) {
    if (!Number.isInteger(it?.qty) || it.qty < 1 || it.qty > MAX_QTY) return { ok: false, code: 'bad_qty' };
    const product = byId.get(it.productId);
    if (!product) return { ok: false, code: 'unknown_product' };
    const variantId = it.variantId ?? null;
    const unit = unitPrice(product, variantId);
    if (unit == null) return { ok: false, code: 'unknown_variant' };
    const subtotal = pounds(piastres(unit) * it.qty);
    total += piastres(unit) * it.qty;
    lines.push({
      productId: product.id,
      variantId,
      name: product.name,
      variantLabel: variantId ? product.variants.find((v) => v.id === variantId)!.label : null,
      unit,
      qty: it.qty,
      subtotal,
    });
  }
  return { ok: true, lines, total: pounds(total) };
}

/** A database row (snake_case, numeric as number or string) as the public product. */
export function toProduct(row: any): ShopProduct {
  const variants: ShopVariant[] = Array.isArray(row.variants)
    ? row.variants
        .filter((v: any) => v && typeof v.id === 'string' && Number.isFinite(Number(v.price_egp)))
        .map((v: any) => ({ id: v.id, label: { en: String(v.label_en ?? v.id), ar: String(v.label_ar ?? v.label_en ?? v.id) }, price: Number(v.price_egp) }))
    : [];
  return {
    id: row.id,
    slug: row.slug,
    name: { en: row.name_en, ar: row.name_ar },
    description: { en: row.description_en ?? '', ar: row.description_ar ?? '' },
    image: row.image_url ?? null,
    price: Number(row.price_egp),
    variants,
  };
}
