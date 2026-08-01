/**
 * @jest-environment jsdom
 */

/* ---- Module mocks (before imports) ---- */

const mockSetUIFlag = jest.fn();
const mockGetUIFlag = jest.fn(() => true);
jest.mock("@/lib/storage", () => ({
  setUIFlag: (k: string, v: boolean) => mockSetUIFlag(k, v),
  getUIFlag: () => mockGetUIFlag(),
}));

const mockNavigate = jest.fn();
let mockPathname = "/home";
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ logout: jest.fn(), user: { id: "u1", role: "user" } }),
}));
jest.mock("@/hooks/useNotificationInbox", () => ({ useNotificationToasts: jest.fn() }));
jest.mock("@/components/shared/UserTopHeader", () => ({
  __esModule: true,
  default: () => <div data-testid="top-header" />,
}));
jest.mock("@/components/shared/VoiceDeskWidget", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("@/components/shared/BroadcastAlertBanner", () => ({
  BroadcastAlertBanner: () => null,
}));
jest.mock("@/components/shared/ConfirmDialog", () => ({
  __esModule: true,
  default: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

/* ---- Imports (after mocks) ---- */

// shadcn's `useIsMobile` reads matchMedia, which jsdom does not implement.
// Report desktop so the sidebar renders its inline (non-Sheet) form.
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

import { render, screen, fireEvent } from "@testing-library/react";
import { Home, Wallet } from "lucide-react";
import SidebarScaffold from "../SidebarScaffold";

const ITEMS = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/vertical/grant/dashboard", icon: Wallet, label: "Financial Aid", disabled: true },
];

function renderScaffold(props: Partial<React.ComponentProps<typeof SidebarScaffold>> = {}) {
  return render(
    <SidebarScaffold navItems={ITEMS} {...props}>
      <div data-testid="child" />
    </SidebarScaffold>,
  );
}

describe("SidebarScaffold — disabled (unentitled) nav items", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUIFlag.mockReturnValue(true);
  });

  it("lists an unentitled vertical rather than hiding it", () => {
    renderScaffold();
    expect(screen.getByText("Financial Aid")).toBeInTheDocument();
  });

  it("marks it disabled for assistive tech", () => {
    renderScaffold();
    const locked = screen.getByRole("button", { name: "Financial Aid" });
    expect(locked).toBeDisabled();
  });

  it("does NOT navigate when a locked item is clicked", () => {
    renderScaffold();
    fireEvent.click(screen.getByRole("button", { name: "Financial Aid" }));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("still navigates for an entitled item", () => {
    renderScaffold();
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(mockNavigate).toHaveBeenCalledWith("/home", undefined);
  });
});

describe("SidebarScaffold — activePrefix", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUIFlag.mockReturnValue(true);
    mockPathname = "/vertical/grant/loans";
  });
  afterEach(() => {
    mockPathname = "/home";
  });

  it("marks an item active for a deeper route under its prefix", () => {
    // Location is /vertical/grant/loans (see the react-router mock); the entry
    // links to the vertical's HOME page, so an exact match would miss.
    renderScaffold({
      navItems: [
        {
          to: "/vertical/grant/dashboard",
          icon: Wallet,
          label: "GRANT",
          activePrefix: "/vertical/grant",
        },
      ],
    });
    expect(screen.getByRole("button", { name: "GRANT" })).toHaveAttribute(
      "data-active",
      "true",
    );
  });

  it("leaves an unrelated prefix inactive", () => {
    renderScaffold({
      navItems: [
        {
          to: "/vertical/lumen/dashboard",
          icon: Wallet,
          label: "Lumen",
          activePrefix: "/vertical/lumen",
        },
      ],
    });
    expect(screen.getByRole("button", { name: "Lumen" })).not.toHaveAttribute(
      "data-active",
      "true",
    );
  });
});

describe("SidebarScaffold — collapseOnMount", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUIFlag.mockReturnValue(true);
  });

  it("does NOT persist the forced-collapsed state", () => {
    // The trap this guards: persisting the forced collapse would leave every
    // OTHER page collapsed too, silently overwriting the user's preference.
    renderScaffold({ collapseOnMount: true });
    expect(mockSetUIFlag).not.toHaveBeenCalled();
  });

  it("persists normally when the page does not force a collapse", () => {
    renderScaffold();
    expect(mockSetUIFlag).toHaveBeenCalled();
  });

  it("renders a `collapsible` section OPEN but with a clickable header", () => {
    // The active vertical's sub-nav: opens on arrival, can still be rolled up.
    renderScaffold({
      navSections: [{ label: "Aid pages", items: ITEMS, collapsible: true }],
    });
    const header = screen.getByRole("button", { name: /aid pages/i });
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Home")).toBeInTheDocument();
    fireEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Home")).toBeNull();
  });

  it("`defaultCollapsed` still wins — collapsible-and-closed", () => {
    renderScaffold({
      navSections: [
        { label: "My Workspace", items: ITEMS, defaultCollapsed: true, collapsible: true },
      ],
    });
    const header = screen.getByRole("button", { name: /my workspace/i });
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Home")).toBeNull();
  });

  it("hides expanded-section headers in icon mode so they cannot clip", () => {
    // Caught by eye, not by a test: in the 48px rail an always-expanded section
    // header rendered as "MY WOR" / "VERT" / "ADMI". Load-bearing now that
    // Meridian Chat opens with the rail collapsed.
    renderScaffold({
      navSections: [{ label: "Verticals", items: ITEMS }],
    });
    expect(screen.getByText("Verticals")).toHaveClass(
      "group-data-[collapsible=icon]:hidden",
    );
  });
});
