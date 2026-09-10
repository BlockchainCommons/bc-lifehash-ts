/**
 * Baseline vs working tree micro-benchmarks (Phase 2.3).
 *
 *   bun run build && bun bench/benchmark.mjs
 */
import * as baseline from "../tests/baseline/lifehash-baseline.mjs";
import * as current from "../dist/index.mjs";

const api = (m) =>
  typeof m.lifehash === "function"
    ? { render: (s, v) => m.lifehash(s, { version: v }) }
    : {
        render: (s, v) =>
          m.makeFromUtf8(
            s,
            { version1: m.Version.version1, version2: m.Version.version2, detailed: m.Version.detailed, fiducial: m.Version.fiducial, grayscaleFiducial: m.Version.grayscale_fiducial }[v],
            1,
            false,
          ),
      };
const time = (fn, n) => {
  fn();
  const t0 = performance.now();
  for (let i = 0; i < n; i++) fn();
  return (performance.now() - t0) / n;
};
const run = (m) => {
  const a = api(m);
  return [
    ["version2 (16×16, 150 gens)", time(() => a.render("Hello, World!", "version2"), 200)],
    ["detailed (32×32, 300 gens)", time(() => a.render("Hello, World!", "detailed"), 50)],
    ["fiducial", time(() => a.render("Hello, World!", "fiducial"), 50)],
  ];
};
const before = run(baseline);
const after = run(current);
console.log(`${"operation".padEnd(30)} ${"baseline".padStart(10)} ${"current".padStart(10)} ${"ratio".padStart(7)}`);
for (let i = 0; i < before.length; i++) {
  const [label, b] = before[i];
  const c = after[i][1];
  console.log(`${label.padEnd(30)} ${b.toFixed(3).padStart(8)}ms ${c.toFixed(3).padStart(8)}ms ${(c / b).toFixed(2).padStart(6)}×`);
}
