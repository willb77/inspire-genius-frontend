/**
 * @jest-environment jsdom
 *
 * RWO8-F3 (2026-11-04): the sticky page header is opaque, on the page token.
 */

const mockNavigate = jest.fn();
jest.mock("@/lib/storage", () => ({
  setUIFlag: jest.fn(),
  getUIFlag: () => true,
  getUIFlagMap: () => ({}),
  setUIFlagMapEntry: jest.fn(),
}));
jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/home" }),
}));
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ logout: jest.fn(), user: { id: "u1", role: "user" } }),
}));
jest.mock("@/hooks/useNotificationInbox", () => ({ useNotificationToasts: jest.fn() }));
jest.mock("@/components/shared/UserTopHeader", () => ({
  __esModule: true,
  default: () => <div data-testid="top-header" />,
}));
jest.mock("@/components/shared/VoiceDeskWidget", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/shared/BroadcastAlertBanner", () => ({ BroadcastAlertBanner: () => null }));
jest.mock("@/components/shared/ConfirmDialog", () => ({
  __esModule: true,
  default: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
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
import SidebarScaffold from "../SidebarScaffold";

function stickyHeader(): HTMLElement {
  render(
    <SidebarScaffold navItems={[]}>
      <div />
    </SidebarScaffold>,
  );
  const header = screen.getByTestId("top-header").closest(".sticky");
  if (!(header instanceof HTMLElement)) throw new Error("sticky header not found");
  return header;
}

describe("SidebarScaffold sticky header", () => {
  it("is opaque on the page token: bg-ig-page with no opacity suffix and no backdrop blur", () => {
    const header = stickyHeader();
    const classes = [...header.classList];
    expect(classes).toContain("bg-ig-page");
    expect(classes.filter((c) => c.startsWith("bg-ig-page/"))).toEqual([]);
    expect(classes.filter((c) => c.startsWith("backdrop-blur"))).toEqual([]);
  });

  it("stays sticky at the top, above page content (z-20)", () => {
    const header = stickyHeader();
    expect(header).toHaveClass("sticky", "top-0", "z-20");
  });
});
