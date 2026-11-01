import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "../../motion";
import { Button, Notice } from "../../components/kx";
import FlaconMark from "../../components/FlaconMark";
import { COLORS, TYPE } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { fetchProducts } from "../../lib/shopApi";
import { fromPrice, unitPrice } from "../../lib/shop/pricing";
import { cartCount, cartLines } from "../../lib/shop/cart";
import { useCartActions } from "../../lib/shop/useCart";
import { localePath } from "../meta";
import { money } from "./money";

// The Shop: products anyone can add to a cart, no account. The cart sits
// beside the products on wide screens and below them on phones, with a bar
// that jumps to it.
export default function ShopPage() {
  const { t, locale } = useI18n();
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null);
  const { cart } = useCartActions();

  const load = useCallback(() => {
    setError(null);
    fetchProducts().then(setProducts, (e) => setError(e?.code === "shop_closed" ? "closed" : "loadFailed"));
  }, []);
  useEffect(load, [load]);

  const { lines, total, gone } = useMemo(() => (products ? cartLines(cart, products) : { lines: [], total: 0, gone: [] }), [cart, products]);
  const count = cartCount(cart);

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-14 pt-10 pb-24">
      <h1 className={`${TYPE.title} mb-4`}>{t("shop.title")}</h1>
      <p className="max-w-[40em] mb-10 text-lg leading-relaxed" style={{ color: COLORS.inkSoft }}>{t("shop.intro")}</p>

      {error && (
        <Notice tone="warning" title={t(`shop.${error}`)}>
          {error === "loadFailed" && <Button variant="secondary" onClick={load} className="mt-2">{t("shop.retry")}</Button>}
        </Notice>
      )}
      {!error && !products && <p role="status" style={{ color: COLORS.inkSoft }}>{t("shop.loading")}</p>}
      {products && products.length === 0 && <p style={{ color: COLORS.inkSoft }}>{t("shop.empty")}</p>}

      {products && products.length > 0 && (
        <div className="grid gap-10 lg:grid-cols-[1fr_22rem] items-start">
          <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 list-none p-0">
            {products.map((p) => <li key={p.id}><ProductCard product={p} /></li>)}
          </ul>
          <CartPanel lines={lines} total={total} gone={gone} />
        </div>
      )}

      {count > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-4 py-3 flex items-center gap-3"
          style={{ background: COLORS.card, borderTop: `1px solid ${COLORS.line}`, paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <p className="flex-1 text-sm" style={{ color: COLORS.ink }}>
            <span className="font-medium tabular-nums">{t("shop.cart.count", { count })}</span>
            {" "}<span className="tabular-nums" style={{ color: COLORS.inkSoft }}>{money(total, locale)}</span>
          </p>
          <Button as="a" href="#cart" variant="secondary">{t("shop.cart.view")}</Button>
          <Button as={Link} to={localePath(locale, "/shop/checkout")}>{t("shop.cart.checkout")}</Button>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }) {
  const { t, locale } = useI18n();
  const { add } = useCartActions();
  const hasOptions = product.variants.length > 0;
  const [variantId, setVariantId] = useState(hasOptions ? product.variants[0].id : null);
  const [justAdded, setJustAdded] = useState(false);
  useEffect(() => { if (!justAdded) return undefined; const id = setTimeout(() => setJustAdded(false), 2000); return () => clearTimeout(id); }, [justAdded]);
  const name = product.name[locale];
  const price = hasOptions ? unitPrice(product, variantId) : product.price;
  const selectId = `opt-${product.id}`;

  return (
    <article className="h-full flex flex-col rounded" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
      <div className="aspect-[4/3] flex items-center justify-center overflow-hidden rounded-t" style={{ background: COLORS.sand }}>
        {product.image
          ? <img src={product.image} alt="" loading="lazy" className="w-full h-full object-cover" />
          : <span className="flex flex-col items-center gap-2 text-xs" style={{ color: COLORS.dim }}><FlaconMark size={44} color={COLORS.dim} />{t("shop.noImage")}</span>}
      </div>
      <div className="flex-1 flex flex-col gap-3 p-5">
        <h2 className="font-serif text-2xl leading-tight" style={{ color: COLORS.ink }}>{name}</h2>
        {product.description[locale] && <p className="text-sm leading-relaxed" style={{ color: COLORS.inkSoft }}>{product.description[locale]}</p>}
        <div className="mt-auto pt-2 flex flex-col gap-3">
          {hasOptions && (
            <div>
              <label htmlFor={selectId} className="block text-sm mb-1.5" style={{ color: COLORS.inkSoft }}>{t("shop.option")}</label>
              <select id={selectId} value={variantId} onChange={(e) => setVariantId(e.target.value)}
                className="w-full min-h-[48px] px-3 rounded" style={{ background: COLORS.cardHi, color: COLORS.ink, border: `1px solid ${COLORS.field}` }}>
                {product.variants.map((v) => <option key={v.id} value={v.id}>{v.label[locale]} — {money(v.price, locale)}</option>)}
              </select>
            </div>
          )}
          <p className="text-lg font-medium tabular-nums" style={{ color: COLORS.ink }}>
            {hasOptions ? money(price, locale) : money(fromPrice(product), locale)}
          </p>
          <Button onClick={() => { add({ productId: product.id, variantId }); setJustAdded(true); }} aria-label={`${t("shop.add")}: ${name}`}>
            {justAdded ? t("shop.added") : t("shop.add")}
          </Button>
          <span role="status" className="sr-only">{justAdded ? `${t("shop.added")}: ${name}` : ""}</span>
        </div>
      </div>
    </article>
  );
}

function CartPanel({ lines, total, gone }) {
  const { t, locale } = useI18n();
  const { setQty, remove } = useCartActions();
  return (
    <aside id="cart" aria-labelledby="cart-title" className="lg:sticky lg:top-6 p-5 rounded" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
      <h2 id="cart-title" className="font-serif text-2xl mb-4" style={{ color: COLORS.ink }}>{t("shop.cart.title")}</h2>
      {gone.length > 0 && <Notice tone="info" className="mb-4">{t("shop.cart.gone")}</Notice>}
      {lines.length === 0 ? (
        <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("shop.cart.empty")}</p>
      ) : (
        <>
          <ul className="list-none p-0 divide-y" style={{ borderColor: COLORS.line }}>
            {lines.map((l) => {
              const name = l.name[locale] + (l.variantLabel ? ` (${l.variantLabel[locale]})` : "");
              const line = { productId: l.productId, variantId: l.variantId };
              return (
                <li key={`${l.productId}:${l.variantId}`} className="py-3 flex flex-col gap-2" style={{ borderColor: COLORS.line }}>
                  <p className="text-sm font-medium" style={{ color: COLORS.ink }}>{name}</p>
                  <div className="flex items-center gap-3">
                    <div role="group" aria-label={t("shop.cart.qty", { name })} className="inline-flex items-stretch rounded" style={{ border: `1px solid ${COLORS.field}` }}>
                      <button type="button" aria-label={t("shop.cart.less")} onClick={() => setQty(line, l.qty - 1)} className="w-11 min-h-[44px] text-lg" style={{ color: COLORS.ink }}>−</button>
                      <span className="w-10 inline-flex items-center justify-center tabular-nums" style={{ color: COLORS.ink }}>{l.qty}</span>
                      <button type="button" aria-label={t("shop.cart.more")} onClick={() => setQty(line, l.qty + 1)} className="w-11 min-h-[44px] text-lg" style={{ color: COLORS.ink }}>+</button>
                    </div>
                    <span className="ms-auto tabular-nums text-sm" style={{ color: COLORS.ink }}>{money(l.subtotal, locale)}</span>
                    <button type="button" onClick={() => remove(line)} aria-label={t("shop.cart.removeLine", { name })}
                      className="min-h-[44px] px-1 text-sm underline underline-offset-4" style={{ color: COLORS.inkSoft }}>{t("shop.cart.remove")}</button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="flex justify-between items-baseline mt-4 text-lg" style={{ color: COLORS.ink }}>
            <span>{t("shop.cart.total")}</span><span className="font-medium tabular-nums">{money(total, locale)}</span>
          </p>
          <p className="text-sm mt-1 mb-4" style={{ color: COLORS.inkSoft }}>{t("shop.cart.delivery")}</p>
          <Button as={Link} to={localePath(locale, "/shop/checkout")} className="w-full" size="lg">{t("shop.cart.checkout")}</Button>
        </>
      )}
    </aside>
  );
}
