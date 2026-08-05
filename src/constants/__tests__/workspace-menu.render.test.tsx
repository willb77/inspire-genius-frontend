/**
 * @jest-environment jsdom
 *
 * The My Workspace menu as a user actually sees it (2026-08-04).
 *
 * Deliberately separate from `navigation.test.ts`, which asserts against the
 * nav-item ARRAY. An array is not a menu: the order can be right and the items
 * correctly flagged while the rendered result is still wrong — the greying
 * lives in `SidebarScaffold`, and Job Fit is not in the array at all until
 * `withWorkspaceVerticals` splices it in. This renders the real composition
 * through the real markup and asserts on the DOM.
 */
import { render, renderHook, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { getUserNavItems } from "../navigation"
import {
  withWorkspaceVerticals,
  useWorkspaceVerticalItems,
} from "@/components/layout/useVerticalLauncher"
import { __resetRegistry, registerVertical } from "@/verticals/core"
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold"

const mockUseEnabledVerticals = jest.fn()
jest.mock("@/verticals/core/useEnabledVerticals", () => ({
  useEnabledVerticals: () => mockUseEnabledVerticals(),
}))

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { name: "Test", role: "user" }, logout: jest.fn() }),
}))
jest.mock("@/components/shared/UserTopHeader", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/components/shared/VoiceDeskWidget", () => ({
  __esModule: true,
  default: () => null,
}))
jest.mock("@/components/shared/BroadcastAlertBanner", () => ({
  BroadcastAlertBanner: () => null,
}))
jest.mock("@/hooks/useNotificationInbox", () => ({
  useNotificationToasts: () => undefined,
}))

// jsdom has no matchMedia; the sidebar's mobile hook calls it on mount.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: () => ({
    matches: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }),
})

/**
 * Render the menu for a user with the given entitlements. Job Fit is entitled
 * by default — the harder case, since a force-disabled entry must stay greyed
 * for someone whose plan *does* include it.
 */
function renderMenu(entitlements: string[] = ["job-fit"]) {
  __resetRegistry()
  registerVertical({
    key: "job-fit",
    title: "Job Fit",
    description: "fit ranking",
    routePrefix: "/vertical/job-fit",
    homePath: "/vertical/job-fit/matches",
  })
  mockUseEnabledVerticals.mockReturnValue({ data: entitlements, isLoading: false })

  const { result } = renderHook(() => useWorkspaceVerticalItems())
  const menu = withWorkspaceVerticals(getUserNavItems(true), result.current)

  render(
    <MemoryRouter initialEntries={["/home"]}>
      <SidebarScaffold navItems={menu}>
        <div />
      </SidebarScaffold>
    </MemoryRouter>,
  )
  return menu
}

const row = (label: string) => screen.getByRole("button", { name: label })
const isGreyed = (label: string) =>
  (row(label).className || "").includes("text-[#1A1A1A]/40")

describe("My Workspace — rendered menu", () => {
  it("renders in the specified order", () => {
    const menu = renderMenu()
    expect(menu.map((i) => i.label)).toEqual([
      "Home",
      "Chat with Meridian",
      "Document Library",
      "Interview Practice",
      "Analytics",
      "Goals",
      "Job Fit",
      "Settings",
      "Help & Support",
    ])
  })

  it("draws Analytics, Goals and Job Fit greyed and non-interactive", () => {
    renderMenu()
    for (const label of ["Analytics", "Goals", "Job Fit"]) {
      expect(row(label)).toBeDisabled()
      expect(row(label)).toHaveAttribute("aria-disabled", "true")
      expect(isGreyed(label)).toBe(true)
    }
  })

  it("greys Job Fit even for a user who IS entitled to it", () => {
    // The entitlement path would render this one usable; the force-disable
    // must win. If this ever regresses, the menu silently comes back to life
    // for exactly the users most likely to click it.
    renderMenu(["job-fit"])
    expect(row("Job Fit")).toBeDisabled()
  })

  it("does not blame the user's plan for entries switched off for everyone", () => {
    renderMenu(["job-fit"])
    for (const label of ["Analytics", "Goals", "Job Fit"]) {
      expect(row(label)).toHaveAttribute("title", "Temporarily unavailable")
    }
  })

  it("leaves the four usable shortcuts (and the tail) fully interactive", () => {
    renderMenu()
    for (const label of [
      "Home",
      "Chat with Meridian",
      "Document Library",
      "Interview Practice",
      "Settings",
      "Help & Support",
    ]) {
      expect(row(label)).toBeEnabled()
      expect(isGreyed(label)).toBe(false)
    }
  })

  it("still SHOWS the switched-off entries — greyed, not removed", () => {
    renderMenu()
    for (const label of ["Analytics", "Goals", "Job Fit"]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })
})
