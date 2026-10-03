/**
 * The `devConsole` namespace ships in every supported locale, with every
 * English key and the same {{placeholders}}. `src/__tests__/i18n.test.ts`
 * guards the shared `public/locales` namespaces; this guards this one.
 */
import * as fs from "fs";
import * as path from "path";

import { DEV_CONSOLE_BUNDLES, DEV_CONSOLE_NS, registerDevConsoleI18n } from "@/i18n/devConsole";

const DIR = path.resolve(__dirname, "..");

/** supportedLngs read from src/lib/i18n.ts itself, not a copy. */
const SUPPORTED = (() => {
  const src = fs.readFileSync(path.resolve(__dirname, "../../../lib/i18n.ts"), "utf-8");
  const m = src.match(/supportedLngs:\s*\[([^\]]*)\]/);
  if (!m) throw new Error("could not read supportedLngs from src/lib/i18n.ts");
  return [...m[1].matchAll(/["']([\w-]+)["']/g)].map((x) => x[1]);
})();

function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") Object.assign(out, flatten(v as Record<string, unknown>, key));
    else out[key] = String(v);
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();

describe("devConsole locales", () => {
  it("has a JSON file for exactly the supported languages", () => {
    expect(SUPPORTED.length).toBeGreaterThanOrEqual(21);
    const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
    expect(files.sort()).toEqual([...SUPPORTED].sort());
    expect(Object.keys(DEV_CONSOLE_BUNDLES).sort()).toEqual([...SUPPORTED].sort());
  });

  const en = flatten(DEV_CONSOLE_BUNDLES.en);

  it.each(SUPPORTED.filter((l) => l !== "en"))("%s has every English key with the same placeholders", (lng) => {
    const other = flatten(DEV_CONSOLE_BUNDLES[lng]);
    expect(Object.keys(other).sort()).toEqual(Object.keys(en).sort());
    for (const [k, v] of Object.entries(en)) {
      expect([k, placeholders(other[k])]).toEqual([k, placeholders(v)]);
      expect(other[k].trim().length).toBeGreaterThan(0);
    }
  });

  it("the contract's panel texts are verbatim in English", () => {
    expect(en["errors.OWNER_ONLY"]).toBe("Only the owner can manage access.");
    expect(en["errors.NOT_FOUND"]).toBe("Not found.");
    expect(en["errors.PROMPT_CONTAINS_SECRET"]).toBe(
      "Your prompt looks like it contains a key or token. Remove it and resend."
    );
    expect(en["errors.BUSY"]).toBe("One job at a time.");
    expect(en["errors.BUDGET_EXCEEDED"]).toBe("Today's budget is used (${{spent}} of ${{cap}}).");
    expect(en["errors.CONSOLE_DISABLED"]).toBe("The console is switched off.");
  });
});

describe("registerDevConsoleI18n", () => {
  function fakeInstance(initialised: boolean) {
    const added = new Set<string>();
    const listeners: Record<string, () => void> = {};
    return {
      added,
      listeners,
      store: initialised ? {} : undefined,
      hasResourceBundle: jest.fn((lng: string, ns: string) => added.has(`${lng}|${ns}`)),
      addResourceBundle: jest.fn((lng: string, ns: string) => {
        added.add(`${lng}|${ns}`);
      }),
      on: jest.fn((event: string, fn: () => void) => {
        listeners[event] = fn;
      }),
    };
  }

  it("adds every locale once to an initialised instance", () => {
    const inst = fakeInstance(true);
    registerDevConsoleI18n(inst as never);
    registerDevConsoleI18n(inst as never);
    expect(inst.addResourceBundle).toHaveBeenCalledTimes(SUPPORTED.length);
    expect(inst.added.has(`zh-CN|${DEV_CONSOLE_NS}`)).toBe(true);
  });

  it("waits for init on an instance that is not set up yet", () => {
    const inst = fakeInstance(false);
    registerDevConsoleI18n(inst as never);
    expect(inst.addResourceBundle).not.toHaveBeenCalled();
    inst.listeners.initialized();
    expect(inst.addResourceBundle).toHaveBeenCalledTimes(SUPPORTED.length);
  });
});

describe("registerDevConsoleI18n against a real i18next instance", () => {
  it("resolves the namespace in the active language and falls back to English", async () => {
    const { createInstance } = jest.requireActual<typeof import("i18next")>("i18next");
    const inst = createInstance();
    await inst.init({ lng: "es", fallbackLng: "en", resources: {}, interpolation: { escapeValue: false } });
    registerDevConsoleI18n(inst);
    expect(inst.t("errors.BUSY", { ns: DEV_CONSOLE_NS })).toBe("Un trabajo a la vez.");
    expect(inst.t("errors.BUDGET_EXCEEDED", { ns: DEV_CONSOLE_NS, spent: "1.00", cap: "5.00" })).toBe(
      "El presupuesto de hoy está agotado ($1.00 de $5.00)."
    );
    await inst.changeLanguage("en");
    expect(inst.t("tabs.console", { ns: DEV_CONSOLE_NS })).toBe("Claude Code");
  });
});
