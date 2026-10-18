// Watches frame times and says how much a canvas scene should give up.
// Level 0: full quality. 1: half the particles. 2: stop (the static fallback
// stays). It only ever steps down, so a scene never flaps. Pure: the caller
// feeds it frame durations in ms.
export function createGovernor({ budgetMs = 24, frames = 30 } = {}) {
  let level = 0;
  let sum = 0;
  let n = 0;
  return {
    get level() { return level; },
    push(dt) {
      if (level >= 2 || dt > 250) return level; // a hidden-tab gap is not a slow frame
      sum += dt;
      n += 1;
      if (n >= frames) {
        if (sum / n > budgetMs) level += 1;
        sum = 0;
        n = 0;
      }
      return level;
    },
  };
}

/** Particle count for a quality level. */
export const particlesAt = (full, level) => (level <= 0 ? full : level === 1 ? Math.ceil(full / 2) : 0);
