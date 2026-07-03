// Pure helpers for the benchmark pipeline. No fs, no I/O — unit-testable.

export function median(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function stats(nums) {
  const s = [...nums].sort((a, b) => a - b);
  return { min: s[0], median: median(s), max: s[s.length - 1] };
}

// Netlify transform URLs embed the deploy id (`dpl=`); a new deploy changes it
// and resets every cached transform. Benchmarks must not span deploys.
export function extractDpl(url) {
  const m = /[?&]dpl=([A-Za-z0-9]+)/.exec(url ?? "");
  return m ? m[1] : null;
}
