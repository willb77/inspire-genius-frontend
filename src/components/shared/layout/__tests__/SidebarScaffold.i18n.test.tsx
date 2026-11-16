/**
 * @jest-environment jsdom
 *
 * The sidebar is on every authenticated page of every role. It now paints its
 * labels through the shellUi namespace; this suite uses the REAL react-i18next
 * (jest.setup.ts mocks it for every other suite) to prove two things:
 *   1. with the English bundle the sidebar reads exactly as it did before, and
 *   2. a translation, where one exists, reaches the screen, while a label with
 *      no entry still paints as declared.
 */
import fs from "node:fs";
import path from "node:path";

jest.mock("react-i18next", () => jest.requireActual("react-i18next"));

jest.mock("@/lib/storage", () => ({
  setUIFlag: jest.fn(),
  getUIFlag: () => true,
  getUIFlagMap: () => ({}),
  setUIFlagMapEntry: jest.fn(),
}));
jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: "/home" }),
}));
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ logout: jest.fn(), user: { id: "u1", role: "user" } }),
}));
jest.mock("@/hooks/useNotificationInbox", () => ({ useNotificationToasts: jest.fn() }));
jest.mock("@/components/shared/UserTopHeader", () => ({ __esModule: true, default: () => <div /> }));
jest.mock("@/components/shared/VoiceDeskWidget", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/shared/BroadcastAlertBanner", () => ({ BroadcastAlertBanner: () => null }));
jest.mock("@/components/shared/ConfirmDialog", () => ({
  __esModule: true,
  default: ({ trigger, title }: { trigger: React.ReactNode; title: string }) => (
    <>
      <span data-testid="confirm-title">{title}</span>
      {trigger}
    </>
  ),
}));
jest.mock("@/context/SupportAgentProvider", () => ({
  SupportAgentProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});

import { render, screen } from "@testing-library/react";
import i18next, { type i18n as I18n } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { Home, Wallet } from "lucide-react";
import SidebarScaffold from "../SidebarScaffold";

const EN = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../../../../public/locales/en/shellUi.json"), "utf8"),
);

async function makeInstance(lng: string, extra: Record<string, unknown> = {}): Promise<I18n> {
  const inst = i18next.createInstance();
  await inst.use(initReactI18next).init({
    lng,
    fallbackLng: "en",
    ns: ["shellUi"],
    defaultNS: "common",
    resources: { en: { shellUi: EN }, ...(extra ? { [lng]: { shellUi: extra } } : {}) },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return inst;
}

const ITEMS = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/aid", icon: Wallet, label: "Brand New Entry", disabled: true },
];
const SECTIONS = [
  { label: "My Workspace", items: [{ to: "/home", icon: Home, label: "Help & Support" }] },
  { label: "Administration", collapsible: true, items: [{ to: "/users", icon: Home, label: "Users" }] },
];

function renderScaffold(inst: I18n, props: Partial<React.ComponentProps<typeof SidebarScaffold>> = {}) {
  return render(
    <I18nextProvider i18n={inst}>
      <SidebarScaffold navItems={ITEMS} {...props}>
        <div />
      </SidebarScaffold>
    </I18nextProvider>,
  );
}

describe("SidebarScaffold under the real i18n instance", () => {
  it("English: every label, hint and footer string reads exactly as it did before", async () => {
    renderScaffold(await makeInstance("en"), { navSections: SECTIONS });
    expect(screen.getByRole("button", { name: "Help & Support" })).toBeInTheDocument();
    expect(screen.getByText("My Workspace")).toBeInTheDocument();
    expect(screen.getByText("Administration")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Logout/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to home" })).toBeInTheDocument();
    expect(screen.getByTestId("confirm-title")).toHaveTextContent("Log out");
    expect(document.body.textContent).not.toMatch(/\b(nav|sidebar)\.(items|sections|[a-zA-Z]+)\b/);
  });

  it("English: a locked item keeps its 'not included in your plan' hover title, with the English label", async () => {
    renderScaffold(await makeInstance("en"));
    expect(screen.getByRole("button", { name: "Brand New Entry" })).toHaveAttribute(
      "title",
      "Brand New Entry — not included in your plan",
    );
  });

  it("a translation reaches the screen; an unlisted label and the locked-title sentence follow suit", async () => {
    const inst = await makeInstance("es", {
      nav: { items: { Home: "Inicio" }, sections: { My_Workspace: "Mi espacio" } },
      sidebar: { logout: "Cerrar sesión", notInPlan: "{{label}} — no incluido en tu plan" },
    });
    renderScaffold(inst, { navSections: [SECTIONS[0], { label: "", items: ITEMS }] });
    expect(screen.getByRole("button", { name: "Inicio" })).toBeInTheDocument();
    expect(screen.getByText("Mi espacio")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cerrar sesión/ })).toBeInTheDocument();
    // not in the bundle: paints as declared
    expect(screen.getByRole("button", { name: "Help & Support" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Brand New Entry" })).toHaveAttribute(
      "title",
      "Brand New Entry — no incluido en tu plan",
    );
  });
});
