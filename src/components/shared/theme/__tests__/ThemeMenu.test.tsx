/**
 * @jest-environment jsdom
 */

let mockPathname = "/home";
jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: mockPathname }),
}));

let mockUser: Record<string, unknown> | null = { id: "u1", role: "user", email: "a@example.com" };
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ logout: jest.fn(), user: mockUser }),
}));
jest.mock("@/components/layout/NotificationBell", () => ({ __esModule: true, default: () => <div /> }));
jest.mock("@/components/LanguageSwitcher", () => ({ __esModule: true, default: () => <div /> }));
jest.mock("@/components/shared/ConfirmDialog", () => ({
  __esModule: true,
  default: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

import { act, fireEvent, render, screen } from "@testing-library/react";
import UserTopHeader from "@/components/shared/UserTopHeader";
import ThemeMenu from "@/components/shared/theme/ThemeMenu";
import IgThemeApplier from "@/components/shared/theme/IgThemeApplier";
import { getThemeChoice, reloadThemeChoice, setThemeChoice } from "@/lib/theme/themeStore";

beforeEach(() => {
  mockPathname = "/home";
  mockUser = { id: "u1", role: "user", email: "a@example.com" };
  localStorage.clear();
  reloadThemeChoice();
  const html = document.documentElement;
  delete html.dataset.igTheme;
  delete html.dataset.igOverlay;
  delete html.dataset.igTile;
});

describe("Theme picker gate", () => {
  it("is hidden from a user outside the allowlist", () => {
    render(<UserTopHeader />);
    expect(screen.queryByTestId("ig-theme-menu-trigger")).toBeNull();
  });

  it("shows for a super-admin", () => {
    mockUser = { id: "u2", role: "super-admin", email: "b@example.com" };
    render(<UserTopHeader />);
    expect(screen.getByTestId("ig-theme-menu-trigger")).toBeTruthy();
  });

  it("shows on a device opted into the preview", () => {
    localStorage.setItem("ig_themes_preview", "true");
    render(<UserTopHeader />);
    expect(screen.getByTestId("ig-theme-menu-trigger")).toBeTruthy();
  });
});

describe("ThemeMenu", () => {
  function open(): void {
    render(<ThemeMenu />);
    fireEvent.click(screen.getByTestId("ig-theme-menu-trigger"));
  }

  it("offers all thirteen themes and ten tile choices", () => {
    open();
    expect(screen.getAllByRole("radio")).toHaveLength(23);
    expect(screen.getByRole("radio", { name: /High Contrast/ })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Tile colour: Graphite" })).toBeTruthy();
  });

  it("marks the current theme and saves a new one", () => {
    open();
    expect(screen.getByRole("radio", { name: "Light" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: /Midnight/ }));
    expect(getThemeChoice().theme).toBe("midnight");
    expect(screen.getByRole("radio", { name: /Midnight/ }).getAttribute("aria-checked")).toBe("true");
  });

  it("saves a tile colour", () => {
    open();
    fireEvent.click(screen.getByRole("radio", { name: "Tile colour: Butter" }));
    expect(getThemeChoice().tile).toBe("#FEF3C7");
  });

  it("says where colour themes apply when off a converted page", () => {
    mockPathname = "/dashboard";
    open();
    expect(screen.getByTestId("ig-theme-scope-note")).toBeTruthy();
  });

  it("says nothing extra on Home", () => {
    open();
    expect(screen.queryByTestId("ig-theme-scope-note")).toBeNull();
  });
});

describe("IgThemeApplier", () => {
  const html = (): HTMLElement => document.documentElement;

  it("applies the chosen theme for an allowed user on Home", () => {
    mockUser = { id: "u2", role: "super-admin" };
    setThemeChoice({ theme: "dark" });
    render(<IgThemeApplier />);
    expect(html().dataset.igTheme).toBe("dark");
  });

  it("applies nothing for a user outside the allowlist, whatever is stored", () => {
    setThemeChoice({ theme: "dark", tile: "#111111" });
    render(<IgThemeApplier />);
    expect(html().dataset.igTheme).toBeUndefined();
    expect(html().dataset.igTile).toBeUndefined();
  });

  it("follows a change made in the picker", () => {
    mockUser = { id: "u2", role: "super-admin" };
    render(<IgThemeApplier />);
    expect(html().dataset.igTheme).toBe("classic");
    act(() => setThemeChoice({ theme: "forest" }));
    expect(html().dataset.igTheme).toBe("forest");
  });

  it("removes the theme when it unmounts (e.g. signing out to the login page)", () => {
    mockUser = { id: "u2", role: "super-admin" };
    setThemeChoice({ theme: "gray" });
    const { unmount } = render(<IgThemeApplier />);
    expect(html().dataset.igOverlay).toBe("gray");
    unmount();
    expect(html().dataset.igOverlay).toBeUndefined();
    expect(html().dataset.igTheme).toBeUndefined();
  });
});
