/**
 * I18N-5A guard for the `summitPages` namespace.
 *
 * The jest react-i18next mock resolves keys from public/locales/en and ignores
 * `defaultValue`, so a unit test cannot see the two ways an extraction rots:
 * a key used in code but absent from the English file (the UI then shows the
 * raw key), and a `defaultValue` that has drifted from the English file (the
 * UI differs before the namespace has loaded). This reads the source and checks
 * both, statically.
 */
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "..");
const EN = JSON.parse(
  readFileSync(join(__dirname, "../../../../public/locales/en/summitPages.json"), "utf8"),
) as Record<string, unknown>;

function flat(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === "object") Object.assign(out, flat(v as Record<string, unknown>, `${prefix}${k}.`));
    else out[`${prefix}${k}`] = String(v);
  }
  return out;
}
const KEYS = flat(EN);

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === "__tests__") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...sources(p));
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const FILES = sources(ROOT).map((p) => ({ p, s: readFileSync(p, "utf8") }));

describe("summitPages namespace", () => {
  it("has a source to check", () => {
    expect(FILES.length).toBeGreaterThan(10);
    expect(Object.keys(KEYS).length).toBeGreaterThan(100);
  });

  it("every key used in code exists in the English file", () => {
    const missing: string[] = [];
    for (const { p, s } of FILES) {
      for (const m of s.matchAll(/\bt\("([^"]+)"/g)) if (!(m[1] in KEYS)) missing.push(`${p}: ${m[1]}`);
      for (const m of s.matchAll(/i18nKey="([^"]+)"/g)) if (!(m[1] in KEYS)) missing.push(`${p}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });

  it("every defaultValue is byte-identical to the English file", () => {
    const drift: string[] = [];
    let checked = 0;
    const re = /\bt\("([^"]+)", \{ (?:count: [\w.]+, )?defaultValue: ("(?:[^"\\]|\\.)*")/g;
    for (const { p, s } of FILES) {
      for (const m of s.matchAll(re)) {
        checked += 1;
        if (KEYS[m[1]] !== JSON.parse(m[2])) drift.push(`${p}: ${m[1]}`);
      }
    }
    expect(checked).toBeGreaterThan(200);
    expect(drift).toEqual([]);
  });

  it("builds no key dynamically (a dynamic key has no defaultValue to fall back on)", () => {
    const dynamic = FILES.filter(({ s }) => /\bt\(`/.test(s)).map(({ p }) => p);
    expect(dynamic).toEqual([]);
  });
});
