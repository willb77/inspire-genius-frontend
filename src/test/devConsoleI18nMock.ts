/**
 * Test-only `react-i18next` mock that resolves the `devConsole` namespace
 * against the real English bundle in `src/i18n/devConsole/en.json`.
 *
 * The global mock in `jest.setup.ts` reads `public/locales/en/{ns}.json`; the
 * console's namespace is bundled with its page instead (see
 * `src/i18n/devConsole/index.ts`), so tests that render the console use:
 *
 *   jest.mock("react-i18next", () => jest.requireActual("@/test/devConsoleI18nMock").reactI18nextMock);
 */
import en from "@/i18n/devConsole/en.json";

type Bundle = Record<string, unknown>;

function resolve(bundle: Bundle, key: string): string {
  let cur: unknown = bundle;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Bundle)) cur = (cur as Bundle)[part];
    else return key;
  }
  return typeof cur === "string" ? cur : key;
}

export function translateDevConsole(key: string, opts?: Record<string, unknown>): string {
  let val = resolve(en as Bundle, key);
  if (opts) {
    for (const [k, v] of Object.entries(opts)) {
      val = val.split(`{{${k}}}`).join(String(v));
    }
  }
  return val;
}

const passthrough = (key: string) => key;

export const reactI18nextMock = {
  useTranslation: (ns?: string | string[]) => {
    const first = Array.isArray(ns) ? ns[0] : ns;
    return {
      t: first === "devConsole" ? translateDevConsole : passthrough,
      i18n: { language: "en", changeLanguage: () => Promise.resolve() },
    };
  },
  Trans: ({ children }: { children: unknown }) => children,
  initReactI18next: { type: "3rdParty", init: () => undefined },
};
