/**
 * @jest-environment jsdom
 *
 * I18N-5A-entry: the entry pages (login, join, onboarding, welcome) were extracted into the
 * `authPages`, `joinPages`, `onboardingPages` and `welcomePages` namespaces.
 *
 * jest.setup.ts mocks react-i18next for every other suite. This one uses the REAL library, because
 * the question here is whether the real instance renders the same English, and whether a page
 * painted before its namespace has loaded shows English rather than raw keys.
 */
import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18next, { type i18n as I18n } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import Login from "../Login";
import { JoinBrandPanel } from "@/pages/join/JoinBrandPanel";

jest.mock("react-i18next", () => jest.requireActual("react-i18next"));
jest.mock("@/context/useAuth", () => ({ useAuth: () => ({ login: jest.fn(), isLoading: false, completeAuthFromPayload: jest.fn() }) }));
jest.mock("@/hooks/useAuthRedirectForAuthPages", () => ({ useAuthRedirectForAuthPages: () => undefined }));
jest.mock("@/hooks/magic-auth/useMagicAuth", () => ({ useRequestMagicLink: () => ({ mutateAsync: jest.fn(), isPending: false }) }));
jest.mock("@/components/auth/AuthFields", () => ({
  EmailField: () => <input aria-label="email" />,
  PasswordField: () => <input aria-label="password" />,
  SocialAuthSection: () => null,
}));
jest.mock("@/components/auth/AuthLayout", () => ({ __esModule: true, default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
jest.mock("@/components/auth/AuthHeader", () => ({
  __esModule: true,
  default: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <header>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  ),
}));

const ROOT = path.resolve(__dirname, "../../../..");
const EN = path.join(ROOT, "public/locales/en");
const NAMESPACES = ["common", "auth", "authPages", "joinPages", "onboardingPages", "welcomePages"];

function bundle(ns: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(EN, `${ns}.json`), "utf8"));
}

async function makeInstance(withResources: boolean): Promise<I18n> {
  const inst = i18next.createInstance();
  await inst.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    ns: NAMESPACES,
    defaultNS: "common",
    resources: withResources ? { en: Object.fromEntries(NAMESPACES.map((n) => [n, bundle(n)])) } : { en: {} },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return inst;
}

const renderLogin = (inst: I18n) =>
  render(
    <I18nextProvider i18n={inst}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </I18nextProvider>,
  );

describe("entry pages under the real i18n instance", () => {
  it("Login (primary screen) renders its extracted English hint and has no raw keys", async () => {
    const inst = await makeInstance(true);
    renderLogin(inst);
    expect(screen.getByText("You can sign in with your primary or secondary email address")).toBeInTheDocument();
    expect(screen.getByText("Hello Again")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\b(login|authPages|brand)\.[a-zA-Z]+/);
  });

  it("Login shows English, not keys, before any namespace has loaded (no flash of keys)", async () => {
    const inst = await makeInstance(false);
    renderLogin(inst);
    expect(screen.getByText("You can sign in with your primary or secondary email address")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\bauthPages\b|\blogin\.emailHint\b/);
  });

  it("JoinBrandPanel renders the same English from the namespace and from defaultValue alone", async () => {
    for (const withResources of [true, false]) {
      const inst = await makeInstance(withResources);
      const { unmount } = render(
        <I18nextProvider i18n={inst}>
          <JoinBrandPanel />
        </I18nextProvider>,
      );
      expect(screen.getByText("Support every client")).toBeInTheDocument();
      expect(screen.getByText("between sessions")).toBeInTheDocument();
      expect(screen.getByText("Individuals")).toBeInTheDocument();
      expect(
        screen.getByText("No account and nothing to install. Tick the first box to hear when the next webinar is scheduled."),
      ).toBeInTheDocument();
      unmount();
    }
  });
});

describe("every extracted default is byte-identical to its en value", () => {
  const AREAS = ["join", "onboarding", "auth", "welcome"].map((a) => path.join(ROOT, "src/pages", a));
  const NS_BY_HOOK: Record<string, string> = {};

  function sources(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return e.name === "__tests__" ? [] : sources(p);
      return /\.tsx?$/.test(e.name) ? [p] : [];
    });
  }
  const get = (obj: Record<string, unknown>, key: string): unknown =>
    key.split(".").reduce<unknown>((cur, p) => (cur && typeof cur === "object" ? (cur as Record<string, unknown>)[p] : undefined), obj);

  it("literal t(key, { defaultValue }) calls in the four areas match the en namespace files", () => {
    const CALL = /\b(t|ta)\(\s*"([^"]+)",\s*\{\s*defaultValue:\s*("(?:[^"\\]|\\.)*")/g;
    let checked = 0;
    for (const file of AREAS.flatMap(sources)) {
      const src = fs.readFileSync(file, "utf8");
      const names = [...src.matchAll(/useTranslation\((["'])(joinPages|onboardingPages|authPages|welcomePages)\1\)/g)].map((m) => m[2]);
      if (names.length === 0) continue;
      for (const m of src.matchAll(CALL)) {
        const ns = m[1] === "ta" ? "authPages" : names[0];
        NS_BY_HOOK[ns] = ns;
        const want = JSON.parse(m[3]) as string;
        expect({ file: path.basename(file), key: m[2], value: get(bundle(ns), m[2]) }).toEqual({ file: path.basename(file), key: m[2], value: want });
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });
});
