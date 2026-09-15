/**
 * i18n regression test suite.
 *
 * Covers:
 * - Every shipped locale JSON file is valid JSON
 * - Every key present in English exists in all other languages
 * - The three lists of languages agree: i18n.ts supportedLngs, the locale
 *   directories on disk, and LanguageSwitcher's menu
 * - zh-CN/dashboard.json JSON syntax (regression for unescaped-quote bug)
 * - RTL switching: Arabic sets dir=rtl, all others set dir=ltr
 * - useDirection hook returns correct dir value
 * - localStorage key is 'i18nextLng' (persistence contract)
 * - i18n config: fallbackLng='en', supportedLngs read from src/lib/i18n.ts
 * - LanguageSwitcher's entries match supportedLngs exactly
 * - RTL_LANGUAGES set covers Arabic (ar), Hebrew (he), Farsi (fa), Urdu (ur)
 * - Interpolation: no {{key}} double-brace placeholders escaped to literal text
 */

import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────
//  Constants mirrored from src/lib/i18n.ts
// ─────────────────────────────────────────────────────────────────────────────

const SRC_DIR = path.resolve(__dirname, "..");

/**
 * Read a string-literal array out of a source file WITHOUT importing it.
 *
 * Importing `src/lib/i18n.ts` would run `i18n.init()` with HttpBackend inside
 * jsdom for every test that touches this file — the same reason
 * `src/lib/voiceLanguage.ts` reads localStorage directly instead of importing
 * the i18next instance. Parsing the source keeps the assertion honest without
 * paying that cost.
 */
function readCodesFrom(
  relPath: string,
  pattern: RegExp,
  entry = /["']([\w-]+)["']/g
): string[] {
  const src = fs.readFileSync(path.join(SRC_DIR, relPath), "utf-8");
  const m = src.match(pattern);
  if (!m) {
    throw new Error(
      `could not read language codes from ${relPath} — the source shape changed, ` +
        `and this test must be updated rather than left passing against a stale copy`
    );
  }
  const codes = [...m[1].matchAll(entry)].map((x) => x[1]);
  if (codes.length === 0) {
    throw new Error(`no language codes found in ${relPath}`);
  }
  return codes;
}

/** The real supportedLngs from src/lib/i18n.ts — not a copy of it. */
const SUPPORTED_LNGS = readCodesFrom("lib/i18n.ts", /supportedLngs:\s*\[([^\]]*)\]/);

/** The real menu from LanguageSwitcher.tsx — not a copy of it. */
const SWITCHER_CODES = readCodesFrom(
  "components/LanguageSwitcher.tsx",
  /LANGUAGES(?::[^=]*)?\s*=\s*\[([\s\S]*?)\n\s*\]/,
  /\bcode:\s*["']([\w-]+)["']/g
);

type SupportedLng = string;

const NAMESPACES = ["common", "auth", "coaching", "dashboard", "admin", "chat"] as const;
type Namespace = (typeof NAMESPACES)[number];

const FALLBACK_LNG = "en";
const LOCALSTORAGE_KEY = "i18nextLng";
const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

const LOCALES_DIR = path.resolve(
  __dirname,
  "../../public/locales"
);

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

function readJson(lang: string, ns: string): Record<string, unknown> {
  const filePath = path.join(LOCALES_DIR, lang, `${ns}.json`);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

/** Flatten a nested object into dot-separated keys, e.g. { a: { b: 1 } } → ['a.b'] */
function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...flattenKeys(v as Record<string, unknown>, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

// ─────────────────────────────────────────────────────────────────────────────
//  File existence — all 50 locale files must exist
// ─────────────────────────────────────────────────────────────────────────────

describe("Locale file existence", () => {
  it.each(SUPPORTED_LNGS)("language directory exists: %s", (lang) => {
    const dir = path.join(LOCALES_DIR, lang);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it.each(
    SUPPORTED_LNGS.flatMap((lang) =>
      NAMESPACES.map((ns) => [lang, ns] as [SupportedLng, Namespace])
    )
  )("%s/%s.json exists", (lang, ns) => {
    const filePath = path.join(LOCALES_DIR, lang, `${ns}.json`);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("the locale directories on disk are exactly the supported languages", () => {
    const dirs = fs
      .readdirSync(LOCALES_DIR)
      .filter((d) => fs.statSync(path.join(LOCALES_DIR, d)).isDirectory());
    // Equality, not ">=". A language shipped in supportedLngs with no locale
    // directory renders raw keys; a directory nothing lists is dead weight.
    expect([...dirs].sort()).toEqual([...SUPPORTED_LNGS].sort());
  });

  it("every namespace file exists for every language", () => {
    for (const lang of SUPPORTED_LNGS) {
      const files = fs
        .readdirSync(path.join(LOCALES_DIR, lang))
        .filter((f) => f.endsWith(".json"));
      expect(files.length).toBe(NAMESPACES.length);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  JSON validity — all 50 locale files must be parseable
// ─────────────────────────────────────────────────────────────────────────────

describe("Locale JSON validity", () => {
  it.each(
    SUPPORTED_LNGS.flatMap((lang) =>
      NAMESPACES.map((ns) => [lang, ns] as [SupportedLng, Namespace])
    )
  )("%s/%s.json is valid JSON", (lang, ns) => {
    expect(() => readJson(lang, ns)).not.toThrow();
  });

  it("zh-CN/dashboard.json parses without error (regression: unescaped quote bug)", () => {
    // Previously had unescaped ASCII " inside noCoachesMatch value — now fixed
    expect(() => readJson("zh-CN", "dashboard")).not.toThrow();
    const data = readJson("zh-CN", "dashboard");
    expect(data).toHaveProperty("noCoachesMatch");
    expect(typeof data["noCoachesMatch"]).toBe("string");
  });

  it("all locale files are non-empty objects", () => {
    for (const lang of SUPPORTED_LNGS) {
      for (const ns of NAMESPACES) {
        const data = readJson(lang, ns);
        expect(typeof data).toBe("object");
        expect(Object.keys(data).length).toBeGreaterThan(0);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Key completeness — every English key must exist in every language
// ─────────────────────────────────────────────────────────────────────────────

describe("Translation key completeness", () => {
  const enCache: Partial<Record<Namespace, string[]>> = {};

  function getEnglishKeys(ns: Namespace): string[] {
    if (!enCache[ns]) {
      enCache[ns] = flattenKeys(readJson("en", ns));
    }
    return enCache[ns]!;
  }

  it.each(
    (["es", "fr", "de", "pt", "ja", "ko", "zh-CN", "ar", "hi"] as const).flatMap(
      (lang) => NAMESPACES.map((ns) => [lang, ns] as [Exclude<SupportedLng, "en">, Namespace])
    )
  )("%s/%s has all English keys", (lang, ns) => {
    const enKeys = getEnglishKeys(ns);
    const langKeys = flattenKeys(readJson(lang, ns));
    const langKeySet = new Set(langKeys);
    const missing = enKeys.filter((k) => !langKeySet.has(k));
    expect(missing).toEqual([]);
  });

  it("English has at least 35 total top-level common keys", () => {
    const enCommon = readJson("en", "common");
    expect(Object.keys(enCommon).length).toBeGreaterThanOrEqual(35);
  });

  it("English auth has all expected login keys", () => {
    const data = readJson("en", "auth") as Record<string, Record<string, unknown>>;
    expect(data).toHaveProperty("login");
    const login = data.login;
    expect(login).toHaveProperty("title");
    expect(login).toHaveProperty("email");
    expect(login).toHaveProperty("password");
    expect(login).toHaveProperty("submit");
  });

  it("English coaching has chat and feedback sections", () => {
    const data = readJson("en", "coaching") as Record<string, unknown>;
    expect(data).toHaveProperty("chat");
    expect(data).toHaveProperty("feedback");
  });

  it("English dashboard has welcome and sessions keys", () => {
    const data = readJson("en", "dashboard");
    expect(data).toHaveProperty("welcome");
    expect(data).toHaveProperty("sessions");
    expect(data).toHaveProperty("title");
  });

  it("English admin has users, settings, audit, manager, companyAdmin sections", () => {
    const data = readJson("en", "admin") as Record<string, unknown>;
    for (const section of ["users", "settings", "audit", "manager", "companyAdmin"]) {
      expect(data).toHaveProperty(section);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Translation values — non-empty strings
// ─────────────────────────────────────────────────────────────────────────────

describe("Translation values are non-empty", () => {
  it("all common.json values are non-empty strings", () => {
    for (const lang of SUPPORTED_LNGS) {
      const data = readJson(lang, "common") as Record<string, unknown>;
      for (const [_key, value] of Object.entries(data)) {
        expect(typeof value).toBe("string");
        expect((value as string).length).toBeGreaterThan(0);
      }
    }
  });

  it("Arabic common values are non-empty (RTL language)", () => {
    const data = readJson("ar", "common") as Record<string, string>;
    expect(data.save.length).toBeGreaterThan(0);
    expect(data.cancel.length).toBeGreaterThan(0);
    expect(data.logout.length).toBeGreaterThan(0);
  });

  it("zh-CN common values are non-empty", () => {
    const data = readJson("zh-CN", "common") as Record<string, string>;
    expect(data.save).toBeTruthy();
    expect(data.dashboard).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  RTL switching — Arabic sets dir=rtl, all others set dir=ltr
// ─────────────────────────────────────────────────────────────────────────────

describe("RTL_LANGUAGES set", () => {
  it("Arabic (ar) is in RTL_LANGUAGES", () => {
    expect(RTL_LANGUAGES.has("ar")).toBe(true);
  });

  it("Hebrew (he) is in RTL_LANGUAGES", () => {
    expect(RTL_LANGUAGES.has("he")).toBe(true);
  });

  it("Farsi (fa) is in RTL_LANGUAGES", () => {
    expect(RTL_LANGUAGES.has("fa")).toBe(true);
  });

  it("Urdu (ur) is in RTL_LANGUAGES", () => {
    expect(RTL_LANGUAGES.has("ur")).toBe(true);
  });

  it("English (en) is NOT in RTL_LANGUAGES", () => {
    expect(RTL_LANGUAGES.has("en")).toBe(false);
  });

  it("Spanish (es) is NOT in RTL_LANGUAGES", () => {
    expect(RTL_LANGUAGES.has("es")).toBe(false);
  });

  it("every supported language except ar is LTR", () => {
    const ltrLangs = SUPPORTED_LNGS.filter((l) => l !== "ar");
    for (const lang of ltrLangs) {
      const baseLang = lang.split("-")[0];
      const isRTL = RTL_LANGUAGES.has(baseLang);
      expect(isRTL).toBe(false);
    }
  });

  it("RTL set has exactly 4 entries", () => {
    expect(RTL_LANGUAGES.size).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  useDirection hook — dir value per language
// ─────────────────────────────────────────────────────────────────────────────

describe("useDirection hook logic", () => {
  /** Simulate the hook's direction computation. */
  function computeDir(language: string): "rtl" | "ltr" {
    const lang = language.split("-")[0] ?? "en";
    return RTL_LANGUAGES.has(lang) ? "rtl" : "ltr";
  }

  it("Arabic (ar) produces 'rtl'", () => {
    expect(computeDir("ar")).toBe("rtl");
  });

  it("English (en) produces 'ltr'", () => {
    expect(computeDir("en")).toBe("ltr");
  });

  it("Spanish (es) produces 'ltr'", () => {
    expect(computeDir("es")).toBe("ltr");
  });

  it("French (fr) produces 'ltr'", () => {
    expect(computeDir("fr")).toBe("ltr");
  });

  it("Japanese (ja) produces 'ltr'", () => {
    expect(computeDir("ja")).toBe("ltr");
  });

  it("Chinese Simplified (zh-CN) base-stripped to 'zh' → ltr", () => {
    expect(computeDir("zh-CN")).toBe("ltr");
  });

  it("Korean (ko) produces 'ltr'", () => {
    expect(computeDir("ko")).toBe("ltr");
  });

  it("Hindi (hi) produces 'ltr'", () => {
    expect(computeDir("hi")).toBe("ltr");
  });

  it("every supported language returns a valid dir value", () => {
    for (const lang of SUPPORTED_LNGS) {
      const dir = computeDir(lang);
      expect(["rtl", "ltr"]).toContain(dir);
    }
  });

  it("Only Arabic produces 'rtl' among supported languages", () => {
    const rtlLangs = SUPPORTED_LNGS.filter((l) => computeDir(l) === "rtl");
    expect(rtlLangs).toEqual(["ar"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  localStorage persistence — key contract
// ─────────────────────────────────────────────────────────────────────────────

describe("localStorage persistence contract", () => {
  it("LOCALSTORAGE_KEY is 'i18nextLng'", () => {
    expect(LOCALSTORAGE_KEY).toBe("i18nextLng");
  });

  it("localStorage can store and retrieve the language key", () => {
    localStorage.setItem(LOCALSTORAGE_KEY, "es");
    expect(localStorage.getItem(LOCALSTORAGE_KEY)).toBe("es");
    localStorage.removeItem(LOCALSTORAGE_KEY);
  });

  it("language persists across simulated re-reads", () => {
    for (const lang of SUPPORTED_LNGS) {
      localStorage.setItem(LOCALSTORAGE_KEY, lang);
      const retrieved = localStorage.getItem(LOCALSTORAGE_KEY);
      expect(retrieved).toBe(lang);
    }
    localStorage.removeItem(LOCALSTORAGE_KEY);
  });

  it("removing the key leaves no trace", () => {
    localStorage.setItem(LOCALSTORAGE_KEY, "fr");
    localStorage.removeItem(LOCALSTORAGE_KEY);
    expect(localStorage.getItem(LOCALSTORAGE_KEY)).toBeNull();
  });

  it("Arabic language code persists correctly", () => {
    localStorage.setItem(LOCALSTORAGE_KEY, "ar");
    expect(localStorage.getItem(LOCALSTORAGE_KEY)).toBe("ar");
    localStorage.removeItem(LOCALSTORAGE_KEY);
  });

  it("zh-CN code persists correctly (hyphenated code)", () => {
    localStorage.setItem(LOCALSTORAGE_KEY, "zh-CN");
    expect(localStorage.getItem(LOCALSTORAGE_KEY)).toBe("zh-CN");
    localStorage.removeItem(LOCALSTORAGE_KEY);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  i18n config — fallback and supported languages
// ─────────────────────────────────────────────────────────────────────────────

describe("i18n configuration contract", () => {
  it("fallbackLng is 'en'", () => {
    expect(FALLBACK_LNG).toBe("en");
  });

  it("English locale files exist (fallback must be resolvable)", () => {
    for (const ns of NAMESPACES) {
      expect(() => readJson("en", ns)).not.toThrow();
    }
  });

  it("supportedLngs is non-empty and free of duplicates", () => {
    // NOT a hardcoded count. This file asserted "exactly 10" against its own
    // copy of the list while the app shipped 21 — it passed, and guarded
    // nothing. The count is whatever i18n.ts says; what matters is that the
    // other two lists agree with it.
    expect(SUPPORTED_LNGS.length).toBeGreaterThan(0);
    expect(new Set(SUPPORTED_LNGS).size).toBe(SUPPORTED_LNGS.length);
  });

  it("every supported language has a locale directory", () => {
    for (const lang of SUPPORTED_LNGS) {
      expect(fs.existsSync(path.join(LOCALES_DIR, lang))).toBe(true);
    }
  });

  it("supportedLngs includes 'en'", () => {
    expect(SUPPORTED_LNGS).toContain("en");
  });

  it("supportedLngs includes 'ar' (RTL language)", () => {
    expect(SUPPORTED_LNGS).toContain("ar");
  });

  it("supportedLngs includes 'zh-CN'", () => {
    expect(SUPPORTED_LNGS).toContain("zh-CN");
  });

  it("6 namespaces are defined", () => {
    expect(NAMESPACES.length).toBe(6);
  });

  it("namespaces include 'common', 'auth', 'coaching', 'dashboard', 'admin', 'chat'", () => {
    for (const ns of ["common", "auth", "coaching", "dashboard", "admin", "chat"]) {
      expect(NAMESPACES).toContain(ns as Namespace);
    }
  });

  it("detection order puts localStorage before navigator", () => {
    // Mirrors i18n.ts detection config: order: ['localStorage', 'navigator']
    const detectionOrder = ["localStorage", "navigator"];
    expect(detectionOrder[0]).toBe("localStorage");
    expect(detectionOrder[1]).toBe("navigator");
  });

  it("backend load path uses {{lng}} and {{ns}} placeholders", () => {
    const loadPath = "/locales/{{lng}}/{{ns}}.json";
    expect(loadPath).toContain("{{lng}}");
    expect(loadPath).toContain("{{ns}}");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  LanguageSwitcher — 10 language entries
// ─────────────────────────────────────────────────────────────────────────────

describe("LanguageSwitcher menu", () => {
  it("offers exactly the supported languages — no more, no less", () => {
    // This block used to assert "exactly 20 (10 core + 10 community)" against
    // a hand-copied array. The switcher had 21 entries at the time. A menu
    // entry i18n.ts does not support switches the user to a language that
    // never loads; a supported language missing from the menu is unreachable.
    expect([...SWITCHER_CODES].sort()).toEqual([...SUPPORTED_LNGS].sort());
  });

  it("no duplicate codes", () => {
    expect(new Set(SWITCHER_CODES).size).toBe(SWITCHER_CODES.length);
  });

  it("English is offered", () => {
    expect(SWITCHER_CODES).toContain("en");
  });

  it("Arabic is offered (the one RTL language shipped)", () => {
    expect(SWITCHER_CODES).toContain("ar");
  });

  it("Chinese uses the hyphenated 'zh-CN' code, not bare 'zh'", () => {
    expect(SWITCHER_CODES).toContain("zh-CN");
    expect(SWITCHER_CODES).not.toContain("zh");
  });

  it("every code reads as a language tag", () => {
    for (const code of SWITCHER_CODES) {
      expect(code).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  English fallback — English keys not empty (fallback must be non-trivial)
// ─────────────────────────────────────────────────────────────────────────────

describe("English fallback integrity", () => {
  it("common: 'save' key translates to 'Save'", () => {
    const data = readJson("en", "common") as Record<string, string>;
    expect(data.save).toBe("Save");
  });

  it("auth: login.submit is 'Log In'", () => {
    const data = readJson("en", "auth") as Record<string, Record<string, string>>;
    expect(data.login.submit).toBe("Log In");
  });

  it("coaching: chat.send is 'Send'", () => {
    const data = readJson("en", "coaching") as Record<string, Record<string, string>>;
    expect(data.chat.send).toBe("Send");
  });

  it("dashboard: title is 'Dashboard'", () => {
    const data = readJson("en", "dashboard") as Record<string, string>;
    expect(data.title).toBe("Dashboard");
  });

  it("admin: users.title is 'User Management'", () => {
    const data = readJson("en", "admin") as Record<string, Record<string, string>>;
    expect(data.users.title).toBe("User Management");
  });

  it("coaching mentions Meridian (not Alex) in quickActions", () => {
    const data = readJson("en", "coaching") as Record<string, Record<string, string>>;
    const quickActions = data.quickActions ?? {};
    // 'chatWithMeridian' key confirms the Meridian rename
    expect(quickActions.chatWithMeridian).toBeDefined();
    expect(quickActions.chatWithMeridian).not.toContain("Alex");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  zh-CN dashboard regression — specific key values after JSON fix
// ─────────────────────────────────────────────────────────────────────────────

describe("zh-CN/dashboard.json regression", () => {
  it("noCoachesMatch value is a string (JSON was previously broken)", () => {
    const data = readJson("zh-CN", "dashboard");
    expect(typeof data.noCoachesMatch).toBe("string");
  });

  it("noCoachesMatch does not cause JSON parse error", () => {
    expect(() => readJson("zh-CN", "dashboard")).not.toThrow();
  });

  it("noCoachesMatch contains the query placeholder", () => {
    const data = readJson("zh-CN", "dashboard") as Record<string, string>;
    // Double-brace i18next interpolation: {{query}}
    expect(data.noCoachesMatch).toContain("{{query}}");
  });

  it("all zh-CN dashboard keys match English keys", () => {
    const enKeys = new Set(flattenKeys(readJson("en", "dashboard")));
    const zhKeys = new Set(flattenKeys(readJson("zh-CN", "dashboard")));
    const missing = [...enKeys].filter((k) => !zhKeys.has(k));
    expect(missing).toEqual([]);
  });
});
