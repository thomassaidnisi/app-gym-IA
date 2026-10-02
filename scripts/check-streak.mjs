// Chequeo de la racha al cruzar meses y años, y de la fecha local de noche.
// Uso: TZ=America/Argentina/Buenos_Aires node scripts/check-streak.mjs
import { build } from "esbuild";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const stubDb = {
  name: "stub-db",
  setup(b) {
    b.onResolve({ filter: /^\.\/db$/ }, () => ({ path: "db", namespace: "stub" }));
    b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: "export const saveUserProgress = async () => {};", loader: "js" }));
  },
};
const out = await build({
  entryPoints: [`${root}src/lib/streak.ts`, `${root}src/lib/date.ts`],
  bundle: true, write: false, format: "esm", platform: "node", plugins: [stubDb], outdir: "/tmp/check-streak",
});
const load = (name) => import("data:text/javascript," + encodeURIComponent(out.outputFiles.find((f) => f.path.endsWith(name)).text));
const { calculateStreak } = await load("streak.js");
const { localDateStr } = await load("date.js");

const everyDay = { weekly_schedule: { monday: "A", tuesday: "B", wednesday: "C", thursday: "D", friday: "E", saturday: "F", sunday: "G" } };
const monWedFri = { weekly_schedule: { monday: "A", tuesday: "Rest", wednesday: "B", thursday: "Rest", friday: "C", saturday: "Rest", sunday: "Rest" } };
const at = (s) => new Date(`${s}T12:00:00`);

// Cruce de mes: 29/9, 30/9, 1/10
assert.equal(calculateStreak(undefined, ["2026-09-29", "2026-09-30", "2026-10-01"], everyDay, at("2026-10-01")).current_streak, 3);
// Cruce de año: 30/12, 31/12, 1/1
assert.equal(calculateStreak(undefined, ["2025-12-30", "2025-12-31", "2026-01-01"], everyDay, at("2026-01-01")).current_streak, 3);
// Lun 28/9 · Mié 30/9 · Vie 2/10: los descansos del medio no cortan la racha
assert.equal(calculateStreak(undefined, ["2026-09-28", "2026-09-30", "2026-10-02"], monWedFri, at("2026-10-02")).current_streak, 3);
// Hoy (vie 2/10) todavía sin completar: no rompe la racha
assert.equal(calculateStreak(undefined, ["2026-09-28", "2026-09-30"], monWedFri, at("2026-10-02")).current_streak, 2);
// Un día de entrenamiento perdido (mié 30/9) sí la corta
assert.equal(calculateStreak(undefined, ["2026-09-28", "2026-10-02"], monWedFri, at("2026-10-02")).current_streak, 1);
// Racha más larga a través del cambio de mes
assert.equal(calculateStreak(undefined, ["2026-09-29", "2026-09-30", "2026-10-01"], everyDay, at("2026-10-05")).longest_streak, 3);
// 30/9 a las 22:30 en Buenos Aires sigue siendo 30/9 (toISOString daría 1/10)
assert.equal(localDateStr(new Date("2026-09-30T22:30:00-03:00")), "2026-09-30");

console.log("check-streak: OK");
