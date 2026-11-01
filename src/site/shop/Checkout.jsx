import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "../../motion";
import { Button, Field, Notice } from "../../components/kx";
import { COLORS, TYPE } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { fetchProducts, placeOrder } from "../../lib/shopApi";
import { SHOP } from "../../lib/shop/config";
import { customerErrors } from "../../lib/shop/customer";
import { cartLines } from "../../lib/shop/cart";
import { prepareProof } from "../../lib/shop/proof";
import { useCartActions } from "../../lib/shop/useCart";
import { localePath } from "../meta";
import { money } from "./money";

export const LAST_ORDER_KEY = "kyphira.lastOrder";

// Checkout, no account: the details, the InstaPay steps, and the screenshot of
// the transfer. The order is placed only with a screenshot attached.
export default function Checkout() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { cart, clear } = useCartActions();
  const [products, setProducts] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "", address: "", note: "" });
  const [proof, setProof] = useState(null); // { base64, url, name }
  const [preparing, setPreparing] = useState(false);
  const [proofError, setProofError] = useState(null);
  const [tried, setTried] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [website, setWebsite] = useState("");
  const fileRef = useRef(null);
  const errRef = useRef(null);

  useEffect(() => { fetchProducts().then(setProducts, (e) => setLoadError(e?.code || "shop_read")); }, []);
  useEffect(() => () => { if (proof?.url) URL.revokeObjectURL(proof.url); }, [proof]);
  useEffect(() => { if (!copied) return undefined; const id = setTimeout(() => setCopied(false), 2000); return () => clearTimeout(id); }, [copied]);

  const { lines, total, gone } = useMemo(() => (products ? cartLines(cart, products) : { lines: [], total: 0, gone: [] }), [cart, products]);
  const errors = useMemo(() => customerErrors(form), [form]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const text = (code) => { const key = `shop.errors.${code}`; const s = t(key); return s === key ? t("shop.errors.generic") : s; };
  const show = (field) => (tried && errors[field] ? text(errors[field]) : undefined);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProofError(null); setPreparing(true);
    try {
      const base64 = await prepareProof(file);
      setProof({ base64, url: URL.createObjectURL(file), name: file.name });
    } catch (err) {
      setProof(null); setProofError(err?.code || "bad_proof");
    } finally { setPreparing(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (Object.keys(errors).length || !proof || lines.length === 0) {
      setTried(true);
      if (!proof) setProofError("no_proof");
      return;
    }
    setSending(true);
    try {
      const res = await placeOrder({
        items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, qty: l.qty })),
        customer: form, lang: locale, proof: proof.base64, website,
      });
      try { sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ orderNo: res.orderNo, total: res.total, email: form.email.trim() })); } catch { /* private mode: the thank-you page says so */ }
      clear();
      navigate(localePath(locale, "/shop/thanks"));
    } catch (err) {
      setError(err?.code || "generic");
      setSending(false);
      requestAnimationFrame(() => errRef.current?.focus());
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(SHOP.instapay.handle); setCopied(true); } catch { /* the handle is shown as text to copy by hand */ }
  };

  const back = <Link to={localePath(locale, "/shop")} className="underline underline-offset-4" style={{ color: COLORS.actionText }}>{t("shop.checkout.back")}</Link>;

  if (loadError || (products && lines.length === 0)) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-8 pt-10 pb-24">
        <h1 className={`${TYPE.title} mb-4`}>{t("shop.checkout.title")}</h1>
        <p className="mb-4" style={{ color: COLORS.inkSoft }}>{loadError ? text(loadError) : t("shop.checkout.emptyCart")}</p>
        {back}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="max-w-[1100px] mx-auto px-4 sm:px-8 lg:px-14 pt-10 pb-24">
      <h1 className={`${TYPE.title} mb-8`}>{t("shop.checkout.title")}</h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_22rem] items-start">
        <div className="flex flex-col gap-10">
          <section aria-labelledby="co-details">
            <h2 id="co-details" className="font-serif text-2xl mb-4">{t("shop.checkout.details")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("shop.checkout.name")} value={form.name} onChange={set("name")} autoComplete="name" required error={show("name")} className="sm:col-span-2" />
              <Field label={t("shop.checkout.phone")} hint={t("shop.checkout.phoneHint")} value={form.phone} onChange={set("phone")} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" required error={show("phone")} />
              <Field label={t("shop.checkout.email")} hint={t("shop.checkout.emailHint")} value={form.email} onChange={set("email")} type="email" autoComplete="email" dir="ltr" required error={show("email")} />
              <Field label={t("shop.checkout.city")} value={form.city} onChange={set("city")} autoComplete="address-level2" required error={show("city")} />
              <Field label={t("shop.checkout.address")} value={form.address} onChange={set("address")} autoComplete="street-address" required error={show("address")} />
              <Field label={t("shop.checkout.note")} value={form.note} onChange={set("note")} maxLength={500} className="sm:col-span-2" error={show("note")} />
            </div>
            {/* Real buyers never see this field; bots fill it and are ignored. */}
            <div aria-hidden="true" style={{ position: "absolute", insetInlineStart: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
              <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
            </div>
          </section>

          <section aria-labelledby="co-pay">
            <h2 id="co-pay" className="font-serif text-2xl mb-4">{t("shop.checkout.pay.title")}</h2>
            <ol className="list-decimal ps-5 mb-5 flex flex-col gap-2" style={{ color: COLORS.ink }}>
              <li>{t("shop.checkout.pay.step1", { amount: money(total, locale) })}</li>
              <li>{t("shop.checkout.pay.step2")}</li>
              <li>{t("shop.checkout.pay.step3")}</li>
            </ol>
            <div className="p-4 rounded mb-5 flex flex-wrap items-center gap-x-6 gap-y-3" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
              <div>
                <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("shop.checkout.pay.handle")}</p>
                <p dir="ltr" className="text-lg font-medium" style={{ color: COLORS.ink }}>{SHOP.instapay.handle}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: COLORS.inkSoft }}>{t("shop.checkout.pay.amount")}</p>
                <p className="text-lg font-medium tabular-nums" style={{ color: COLORS.ink }}>{money(total, locale)}</p>
              </div>
              <div className="ms-auto flex flex-wrap gap-2">
                <Button variant="secondary" onClick={copy}>{copied ? t("shop.checkout.pay.copied") : t("shop.checkout.pay.copy")}</Button>
                <Button as="a" href={SHOP.instapay.link} target="_blank" rel="noopener noreferrer">{t("shop.checkout.pay.open")}</Button>
              </div>
              <span role="status" className="sr-only">{copied ? t("shop.checkout.pay.copied") : ""}</span>
            </div>

            <ProofPicker proof={proof} preparing={preparing} error={proofError ? text(proofError) : undefined} fileRef={fileRef} onPick={pick} />
          </section>
        </div>

        <aside aria-labelledby="co-summary" className="lg:sticky lg:top-6 p-5 rounded" style={{ background: COLORS.card, border: `1px solid ${COLORS.line}` }}>
          <h2 id="co-summary" className="font-serif text-2xl mb-4">{t("shop.checkout.summary")}</h2>
          {!products ? <p role="status" style={{ color: COLORS.inkSoft }}>{t("shop.loading")}</p> : (
            <>
              {gone.length > 0 && <Notice tone="info" className="mb-4">{t("shop.cart.gone")}</Notice>}
              <ul className="list-none p-0 flex flex-col gap-2 mb-4">
                {lines.map((l) => (
                  <li key={`${l.productId}:${l.variantId}`} className="flex justify-between gap-3 text-sm" style={{ color: COLORS.ink }}>
                    <span>{l.qty} × {l.name[locale]}{l.variantLabel ? ` (${l.variantLabel[locale]})` : ""}</span>
                    <span className="tabular-nums">{money(l.subtotal, locale)}</span>
                  </li>
                ))}
              </ul>
              <p className="flex justify-between items-baseline text-lg pt-3" style={{ borderTop: `1px solid ${COLORS.line}`, color: COLORS.ink }}>
                <span>{t("shop.cart.total")}</span><span className="font-medium tabular-nums">{money(total, locale)}</span>
              </p>
              <p className="text-sm mt-1 mb-5" style={{ color: COLORS.inkSoft }}>{t("shop.cart.delivery")}</p>
            </>
          )}
          <div ref={errRef} tabIndex={-1} aria-live="assertive" className="focus:outline-none">
            {error && <Notice tone="warning" className="mb-4">{text(error)}</Notice>}
            {tried && !error && (Object.keys(errors).length > 0 || !proof) && <p role="alert" className="text-sm mb-4" style={{ color: COLORS.danger }}>{t("shop.checkout.fix")}</p>}
          </div>
          <Button type="submit" size="lg" className="w-full" loading={sending} disabled={!products || preparing}>
            {sending ? t("shop.checkout.sending") : t("shop.checkout.submit")}
          </Button>
          <p className="text-xs mt-4 leading-relaxed" style={{ color: COLORS.dim }}>{t("shop.checkout.privacy")}</p>
          <p className="mt-4 text-sm">{back}</p>
        </aside>
      </div>
    </form>
  );
}

function ProofPicker({ proof, preparing, error, fileRef, onPick }) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm mb-1.5" style={{ color: COLORS.inkSoft }}>{t("shop.checkout.proof.label")}</label>
      <input ref={fileRef} id={id} type="file" accept="image/jpeg,image/png,image/webp" onChange={onPick} className="sr-only"
        aria-describedby={`${id}-hint${error ? ` ${id}-err` : ""}`} aria-invalid={error ? true : undefined} />
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="secondary" onClick={() => fileRef.current?.click()} loading={preparing}>
          {preparing ? t("shop.checkout.proof.preparing") : proof ? t("shop.checkout.proof.change") : t("shop.checkout.proof.choose")}
        </Button>
        {proof && <img src={proof.url} alt={t("shop.checkout.proof.preview")} className="h-24 w-auto rounded" style={{ border: `1px solid ${COLORS.line}` }} />}
      </div>
      <p id={`${id}-hint`} className="text-xs mt-1.5" style={{ color: COLORS.dim }}>{t("shop.checkout.proof.hint")}</p>
      {error && <p id={`${id}-err`} role="alert" className="text-xs mt-1.5" style={{ color: COLORS.danger }}>{error}</p>}
    </div>
  );
}
