import React from "react";
import { TYPE } from "../../lib/theme";
import { useI18n } from "../../i18n/I18nProvider";
import { fmt2 } from "../../lib/calc";
import { Light } from "../../motion";
import "./weigh.css";

const WRAP = "max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-14 ps-14 sm:ps-16 lg:ps-20";
const cg = (g) => Math.round(g * 100);

/**
 * The pinned weighing. Three beats (the oil, the alcohol, the total) over one
 * stage that stays while the page scrolls; see weigh.css. The text is real and
 * in reading order whether or not anything moves; the counter in the panel is
 * drawn (aria-hidden) and the same numbers sit beside it as text.
 */
export default function Weigh({ oil, alcohol, total, oilShare }) {
  const { t } = useI18n();
  const nums = { oil: fmt2(oil), alcohol: fmt2(alcohol), total: fmt2(total) };
  return (
    <section data-stage="weigh" data-pin aria-labelledby="st-oil" className="wg relative" style={{ "--wg-oil": cg(oil), "--wg-tot": cg(total) }}>
      <div className="wg-stage mo-grain">
        <div className={WRAP}>
          <div className="wg-grid">
            <div className="wg-copy">
              <article className="wg-beat wg-oil">
                <p className={`mb-4 ${TYPE.label} wg-dim`}>{t("site.compounding.oil.step")}</p>
                <h2 id="st-oil" className={TYPE.title}>{t("site.compounding.oil.title")}</h2>
                <p className="mt-4 font-serif text-lg measure wg-soft">{t("site.compounding.oil.text", nums)}</p>
              </article>
              <article className="wg-beat wg-alc">
                <p className={`mb-4 ${TYPE.label} wg-dim`}>{t("site.compounding.alcohol.step")}</p>
                <h2 id="st-alcohol" className={TYPE.title}>{t("site.compounding.alcohol.title")}</h2>
                <p className="mt-4 font-serif text-lg measure wg-soft">{t("site.compounding.alcohol.text", nums)}</p>
              </article>
              <article className="wg-beat wg-tot">
                <p className={`mb-4 ${TYPE.label} wg-dim`}>{nums.oil} g + {nums.alcohol} g</p>
                <h2 id="st-total" className={TYPE.title}>{t("site.compounding.reading.label")}</h2>
                <p className="mt-4 font-serif text-lg measure wg-soft">{t("site.compounding.reading.caption")}</p>
              </article>
            </div>

            <figure className="wg-panel m-0">
              <Light plain className="wg-glow" />
              <p className={`${TYPE.label} wg-label`}>{t("site.compounding.reading.label")}</p>
              <p dir="ltr" className="wg-fig font-serif" aria-hidden="true">
                <span className="wg-fig-static">{nums.total}<small>g</small></span>
                <span className="wg-read" />
              </p>
              <span className="sr-only">{nums.total} g</span>
              <div aria-hidden="true" className="wg-beam">
                <span className="wg-seg wg-seg-oil" style={{ width: `${Math.round(oilShare * 1000) / 10}%` }} />
                <span className="wg-seg wg-seg-alc" style={{ width: `${Math.round((1 - oilShare) * 1000) / 10}%` }} />
              </div>
              <dl className="wg-rows">
                <div className="wg-row wg-row-oil"><dt>{t("site.compounding.oil.label")}</dt><dd dir="ltr" className="font-serif">{nums.oil} g</dd></div>
                <div className="wg-row wg-row-alc"><dt>{t("site.compounding.alcohol.label")}</dt><dd dir="ltr" className="font-serif">{nums.alcohol} g</dd></div>
              </dl>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
