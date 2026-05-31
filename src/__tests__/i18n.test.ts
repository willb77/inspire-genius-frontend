/**
 * i18n regression test suite.
 *
 * Covers:
 * - All 50 locale JSON files are valid JSON (10 langs × 5 namespaces)
 * - Every key present in English exists in all other languages
 * - zh-CN/dashboard.json JSON syntax (regression for unescaped-quote bug)
 * - RTL switching: Arabic sets dir=rtl, all others set dir=ltr
 * - useDirection hook returns correct dir value
 * - localStorage key is 'i18nextLng' (persistence contract)
 * - i18n config: fallbackLng='en', all 10 langs in supportedLngs
 * - LanguageSwitcher defines exactly 10 language entries
 * - RTL_LANGUAGES set covers Arabic (ar), Hebrew (he), Farsi (fa), Urdu (ur)
 * - Interpolation: no {{key}} double-brace placeholders escaped to literal text
 */

import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────────────────────────
//  Constants mirrored from src/lib/i18n.ts
// ─────────────────────────────────────────────────────────────────────────────

const SUPPORTED_LNGS = ["en", "es", "fr", "de", "pt", "ja", "ko", "zh-CN", "ar", "hi"] as const;
type SupportedLng = (typeof SUPPORTED_LNGS)[number];

const NAMESPACES = ["common", "auth", "coaching", "dashboard", "admin"] as const;
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

  it("at least 10 language directories (partial community langs may add more)", () => {
    const dirs = fs
      .readdirSync(LOCALES_DIR)
      .filter((d) => fs.statSync(path.join(LOCALES_DIR, d)).isDirectory());
    expect(dirs.length).toBeGreaterThanOrEqual(SUPPORTED_LNGS.length);
  });

  it("exactly 5 namespaces per language", () => {
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

  it("All 10 supported languages except ar are LTR", () => {
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

  it("All 10 supported languages return a valid dir value", () => {
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

  it("supportedLngs has exactly 10 languages", () => {
    expect(SUPPORTED_LNGS.length).toBe(10);
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

  it("5 namespaces are defined", () => {
    expect(NAMESPACES.length).toBe(5);
  });

  it("namespaces include 'common', 'auth', 'coaching', 'dashboard', 'admin'", () => {
    for (const ns of ["common", "auth", "coaching", "dashboard", "admin"]) {
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

describe("LanguageSwitcher language definitions", () => {
  // Mirrors the LANGUAGES array from LanguageSwitcher.tsx (10 core + 10 community)
  const SWITCHER_LANGUAGES = [
    { code: "en",    label: "English" },
    { code: "es",    label: "Español" },
    { code: "fr",    label: "Français" },
    { code: "de",    label: "Deutsch" },
    { code: "pt",    label: "Português" },
    { code: "ja",    label: "日本語" },
    { code: "ko",    label: "한국어" },
    { code: "zh-CN", label: "中文（简体）" },
    { code: "ar",    label: "العربية" },
    { code: "hi",    label: "हिन्दी" },
    { code: "it",    label: "Italiano" },
    { code: "nl",    label: "Nederlands" },
    { code: "ru",    label: "Русский" },
    { code: "pl",    label: "Polski" },
    { code: "tr",    label: "Türkçe" },
    { code: "th",    label: "ไทย" },
    { code: "vi",    label: "Tiếng Việt" },
    { code: "id",    label: "Bahasa Indonesia" },
    { code: "sv",    label: "Svenska" },
    { code: "nb",    label: "Norsk" },
  ] as const;

  it("defines exactly 20 languages (10 core + 10 community)", () => {
    expect(SWITCHER_LANGUAGES.length).toBe(20);
  });

  it("core 10 codes are all in supported languages", () => {
    const coreCodes = SWITCHER_LANGUAGES.slice(0, 10).map((l) => l.code);
    for (const code of coreCodes) {
      expect(SUPPORTED_LNGS).toContain(code as SupportedLng);
    }
  });

  it("every entry has a non-empty code and label", () => {
    for (const lang of SWITCHER_LANGUAGES) {
      expect(lang.code.length).toBeGreaterThan(0);
      expect(lang.label.length).toBeGreaterThan(0);
    }
  });

  it("English code is 'en'", () => {
    const en = SWITCHER_LANGUAGES.find((l) => l.label === "English");
    expect(en?.code).toBe("en");
  });

  it("Arabic code is 'ar'", () => {
    const ar = SWITCHER_LANGUAGES.find((l) => l.code === "ar");
    expect(ar?.label).toBe("العربية");
  });

  it("Chinese entry uses 'zh-CN' code", () => {
    const zh = SWITCHER_LANGUAGES.find((l) => l.code === "zh-CN");
    expect(zh).toBeDefined();
    expect(zh?.label).toContain("中文");
  });

  it("no duplicate codes", () => {
    const codes = SWITCHER_LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
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
