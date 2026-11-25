// The kyphi music's loudness, 0..1, shared by the player (templeSound.js) and
// the home scroll scene (compounding/Smoke.jsx reads pulse.v each frame; CSS
// reads --kx-pulse on <html>). 0 while nothing plays.
export const pulse = { v: 0, base: 0 };

/**
 * Next state from the last one and a block's RMS. Follows the changes in
 * loudness, not the level: `base` is the recent level (a ~2 s average), and
 * `v` is how far this block rises above it (50 % above = 1), rising fast and
 * falling slow, like breath. A steady drone settles to 0. Pure.
 */
export function followPulse(prev, rms) {
  const base = prev.base ? prev.base + (rms - prev.base) * 0.01 : rms;
  const lift = base > 1e-4 ? Math.min(1, Math.max(0, (rms - base) / (base * 0.5))) : 0;
  return { base, v: prev.v + (lift - prev.v) * (lift > prev.v ? 0.3 : 0.06) };
}
