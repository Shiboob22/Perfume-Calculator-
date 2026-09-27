import { ML_PER_FLOZ, G_PER_OZ } from "../formulation";

export type Unit = "ml" | "floz" | "g" | "oz";
export const UNITS: readonly Unit[] = ["ml", "floz", "g", "oz"];
export { ML_PER_FLOZ, G_PER_OZ };

/** mL and fl oz are volumes; g and oz are weights. */
export function isVolumeUnit(unit: Unit): boolean {
  return unit === "ml" || unit === "floz";
}

/** An amount in its unit, as mL (volume units) or g (weight units). */
export function toBase(amount: number, unit: Unit): number {
  if (unit === "floz") return amount * ML_PER_FLOZ;
  if (unit === "oz") return amount * G_PER_OZ;
  return amount;
}

export const gToOz = (g: number) => g / G_PER_OZ;
export const mlToFlOz = (ml: number) => ml / ML_PER_FLOZ;
