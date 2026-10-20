/**
 * @jest-environment node
 *
 * The theme stylesheet, held to the two promises Phase A makes.
 *
 * 1. Light is unchanged. Every --ig-* default equals the colour the converted
 *    files hard-coded before themes existed. If a default drifts, every page in
 *    the shell changes colour for every user, with no theme selected.
 * 2. No theme leaves a token undefined. A palette theme that forgets a token
 *    inherits today's light value for it, which on a dark theme is light text
 *    on a light card, or the reverse. That renders as unreadable, never as an
 *    error.
 */
import fs from "fs";
import path from "path";
import { IG_THEMES } from "@/lib/theme/igThemes";

const CSS = fs.readFileSync(path.resolve(__dirname, "../ig-themes.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

function block(selector: string): string {
  const at = CSS.indexOf(`${selector} {`);
  if (at < 0) throw new Error(`no block for ${selector}`);
  const open = CSS.indexOf("{", at);
  return CSS.slice(open + 1, CSS.indexOf("}", open));
}

function decls(body: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of body.split(";")) {
    const m = part.match(/^\s*(--[\w-]+)\s*:\s*([\s\S]+?)\s*$/);
    if (m) out.set(m[1], m[2].replace(/\s+/g, " "));
  }
  return out;
}

/** The colour each token replaced, as it was written in the source. */
const LEGACY: Record<string, string> = {
  "--ig-page": "#FBF7F0",
  "--ig-surface": "#FFFFFF",
  "--ig-muted": "#F1F1F1",
  "--ig-ink": "#0B1B33",
  "--ig-on-ink": "#FFFFFF",
  "--ig-body": "#4B5F80",
  "--ig-faint": "#7C93B5",
  "--ig-faint-2": "#9AA3B0",
  "--ig-accent": "#C9711A",
  "--ig-accent-hover": "#E8932B",
  "--ig-accent-strong": "#9C560F",
  "--ig-ok": "#3E6B55",
  "--ig-ok-hover": "#5B8A72",
  "--ig-line": "rgba(11, 27, 51, 0.10)",
  "--ig-line-soft": "rgba(11, 27, 51, 0.06)",
  "--ig-line-strong": "rgba(11, 27, 51, 0.25)",
  "--ig-nav-fg": "#1A1A1A",
  "--ig-nav-active": "#0B1B33",
  "--ig-nav-active-fg": "#FFFFFF",
  "--ig-raised": "var(--color-gray-50)",
  "--ig-raised-hover": "var(--color-gray-100)",
  "--ig-icon": "var(--color-gray-700)",
  "--ig-icon-muted": "#4B5563",
  "--ig-icon-hover": "#F3F4F6",
  "--ig-avatar-ink": "var(--foreground)",
};

const ROOT = decls(block(":root"));
const TOKENS = [...ROOT.keys()].filter((k) => k.startsWith("--ig-"));

describe("ig-themes.css", () => {
  it("defines exactly the legacy token set at :root", () => {
    expect(TOKENS.sort()).toEqual(Object.keys(LEGACY).sort());
  });

  it.each(Object.entries(LEGACY))("keeps %s at today's colour (%s)", (token, legacy) => {
    expect(ROOT.get(token)?.toLowerCase()).toBe(legacy.toLowerCase());
  });

  const fullPalettes = ["dark", "black", "sepia", "contrast", "midnight", "solarLight", "solarDark", "forest"];

  it.each(fullPalettes)("theme %s defines every --ig-* token", (id) => {
    const own = decls(block(`html[data-ig-theme="${id}"]`));
    const missing = TOKENS.filter((t) => !own.has(t));
    expect(missing).toEqual([]);
  });

  it.each(fullPalettes)("theme %s also sets the shared component colours", (id) => {
    const own = decls(block(`html[data-ig-theme="${id}"]`));
    for (const t of ["--background", "--foreground", "--popover", "--popover-foreground", "--border", "--sidebar", "--sidebar-foreground"]) {
      expect(own.has(t)).toBe(true);
    }
  });

  it("has a block for every palette theme the picker offers", () => {
    for (const t of IG_THEMES.filter((x) => x.kind === "palette")) {
      expect(() => block(`html[data-ig-theme="${t.id}"]`)).not.toThrow();
    }
  });

  it("styles both overlay themes", () => {
    expect(CSS).toContain('html[data-ig-overlay="gray"]');
    expect(CSS).toContain('html[data-ig-overlay="amber"] body::after');
  });

  it("resets every colour token inside a light island to today's value", () => {
    const island = decls(block("html[data-ig-theme] .ig-light-island"));
    for (const [token, legacy] of Object.entries(LEGACY)) {
      if (legacy.startsWith("var(") || token.startsWith("--ig-nav") || token.startsWith("--ig-icon") || token.startsWith("--ig-raised")) continue;
      expect(island.get(token)?.toLowerCase()).toBe(legacy.toLowerCase());
    }
  });

  it("never themes a PRISM colour", () => {
    expect(CSS.toLowerCase()).not.toMatch(/--[\w-]*prism/);
  });
});
