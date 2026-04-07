import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";

// Polyfill structuredClone for jsdom (used by @dagrejs/dagre)
if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = <T>(val: T): T => JSON.parse(JSON.stringify(val));
}

// Mock react-i18next with real English translations so tests can match rendered text.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _i18nBundles: Record<string, Record<string, unknown>> = {};
function _loadNs(ns: string): Record<string, unknown> {
  if (!_i18nBundles[ns]) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _i18nBundles[ns] = require(`./public/locales/en/${ns}.json`);
    } catch {
      _i18nBundles[ns] = {};
    }
  }
  return _i18nBundles[ns];
}
function _resolve(bundle: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let cur: unknown = bundle;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = (cur as Record<string, unknown>)[p];
    else return key; // fallback to key
  }
  return typeof cur === "string" ? cur : key;
}

jest.mock("react-i18next", () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const bundle = _loadNs(ns || "common");
      let val = _resolve(bundle, key);
      // Handle {{var}} interpolation
      if (opts && typeof opts === "object") {
        for (const [k, v] of Object.entries(opts)) {
          val = val.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
        }
      }
      return val;
    },
    i18n: { changeLanguage: jest.fn(), language: "en" },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: "3rdParty", init: jest.fn() },
}));

// Dummy env for tests (intentionally fake values and keys for static analyzers)
process.env.FAKE_TEST_VALID_PASSWORD ??= "fake-TestPassword123!";
process.env.FAKE_TEST_INVALID_NO_UPPERCASE ??= "fake-testpassword123!";
process.env.FAKE_TEST_INVALID_NO_LOWERCASE ??= "FAKE-TESTPASSWORD123!";
process.env.FAKE_TEST_INVALID_NO_NUMBER ??= "fake-TestPassword!";
process.env.FAKE_TEST_INVALID_NO_SPECIAL ??= "fakeTestPassword123";
process.env.FAKE_TEST_MISMATCH_PASSWORD ??= "fake-WrongPassword";

process.env.FAKE_TEST_CHANGE_PASSWORD_CURRENT ??= "fake-oldPassword123";
process.env.FAKE_TEST_CHANGE_PASSWORD_NEW ??= "fake-newPassword456";
process.env.FAKE_TEST_CHANGE_PASSWORD_WRONG_CURRENT ??= "fake-wrongPassword";
process.env.FAKE_TEST_CHANGE_PASSWORD_DIFFERENT_CONFIRM ??= "fake-differentPassword789";

process.env.FAKE_TEST_CHANGE_PASSWORD_CURRENT_SHORT ??= "fake-old123";
process.env.FAKE_TEST_CHANGE_PASSWORD_NEW_SHORT ??= "fake-new123";
process.env.FAKE_TEST_CHANGE_PASSWORD_WRONG_SHORT ??= "fake-wrong";

process.env.FAKE_TEST_CHANGE_PASSWORD_CURRENT_TINY ??= "fake-old";
process.env.FAKE_TEST_CHANGE_PASSWORD_NEW_TINY ??= "fake-new";

process.env.FAKE_TEST_SIGNUP_PASSWORD ??= "fake-Password1!";
process.env.FAKE_TEST_SIGNUP_MISMATCH_PASSWORD ??= "fake-WrongPassword";
process.env.FAKE_TEST_SIGNUP_WEAK_PASSWORD ??= "fake-abc";

process.env.FAKE_TEST_BASIC_PASSWORD ??= "fake-pass123";
process.env.FAKE_TEST_MFA_PASSWORD ??= "fake-mypassword";
process.env.FAKE_TEST_OTP_SHORT_PASSWORD ??= "fake-1234";
process.env.FAKE_TEST_OTP_PASS_PASSWORD ??= "fake-pass";
process.env.FAKE_OTP ??= "123456";

// Set up environment variables
process.env.VITE_AGENTS_WEBSOCKET_BASE_URL = "wss://fake-websocket.test";

// Polyfill for TextEncoder/TextDecoder
globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder;
globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder;
