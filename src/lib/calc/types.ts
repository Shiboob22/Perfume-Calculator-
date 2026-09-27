export type Basis = "volume" | "weight";

/** g/mL. */
export interface Densities {
  oil: number;
  ethanol: number;
}

/** One blend, both components, in grams and millilitres. */
export interface Amounts {
  oilG: number;
  oilMl: number;
  ethanolG: number;
  ethanolMl: number;
  totalG: number;
  totalMl: number;
}

export interface Warning {
  code: string;
  [detail: string]: unknown;
}
