// Turns the picker's reasons (suggest.js) into sentences. `t` is the i18n
// function; sentences read as one clause each, so the screen can list them.
const lower = (s) => String(s).toLocaleLowerCase();

export function reasonText(t, reason, { occasion } = {}) {
  const family = reason.family ? t(`families.${reason.family}.label`) : "";
  const positive = reason.points > 0;
  switch (reason.key) {
    case "weather":
      return t(positive ? "wardrobe.reason.weatherFor" : "wardrobe.reason.weatherAgainst", { band: t(`wardrobe.bands.${reason.band}`), family });
    case "time":
      return t(positive ? "wardrobe.reason.timeFor" : "wardrobe.reason.timeAgainst", { time: lower(t(`wardrobe.times.${reason.time}`)), family });
    case "cluster":
      return t(reason.inferred ? "wardrobe.reason.clusterGuess" : "wardrobe.reason.cluster", {
        cluster: lower(t(`wardrobe.clusters.${reason.cluster}`)), occasion: lower(t(`wardrobe.occasions.${occasion}`)),
      });
    case "tooStrong":
      return t("wardrobe.reason.tooStrong", {
        projection: lower(t(`wardrobe.projections.${reason.projection}`)), ceiling: lower(t(`wardrobe.projections.${reason.ceiling}`)), occasion: lower(t(`wardrobe.occasions.${occasion}`)),
      });
    case "wornRecently": case "rested":
      return t(`wardrobe.reason.${reason.key}`, { days: reason.days });
    default:
      return t(`wardrobe.reason.${reason.key}`);
  }
}
