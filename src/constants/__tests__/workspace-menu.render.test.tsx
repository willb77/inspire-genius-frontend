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
import { cleanup, render, renderHook, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { getUserNavItems } from "../navigation"
import { useWorkspaceNavItems } from "@/components/layout/useVerticalLauncher"
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
 * by default, which since 2026-08-11 is the LIVE case — the force-disable that
 * used to grey it for entitled users too was lifted.
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

  // Composed through `useWorkspaceNavItems` — the hook the layouts actually
  // call — rather than by hand from its two primitives. Building it by hand is
  // how the Resume Writer splice went missing from this suite while shipping
  // fine in the app: the test was asserting on a menu production never builds.
  const { result } = renderHook(() => useWorkspaceNavItems(getUserNavItems(true)))
  const menu = result.current

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
      // Exactly six as of 2026-08-12 (request), seven since 2026-09-04 when
      // Goals returned (Goals offering, Phase 3). Nothing is spliced in any
      // more — WORKSPACE_VERTICALS and WORKSPACE_VERTICAL_LINKS are both empty
      // — so the rendered menu is the nav array, with nothing added between
      // building it and drawing it.
      "Home",
      "Chat with Meridian",
      "Goals",
      "Interview Practice",
      "Document Library",
      "Settings",
      "Help & Support",
    ])
  })

  it("does not render Analytics at all", () => {
    // Removed 2026-08-12. Asserted on the rendered menu, not just the nav
    // array: a row can be present in the data and still be drawn, and it is the
    // drawn menu the request was about.
    renderMenu()
    expect(screen.queryByText("Analytics")).not.toBeInTheDocument()
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

  it("shows neither Job Fit nor Resume Writer, at ANY entitlement level", () => {
    // Both were spliced into this menu earlier on 2026-08-12 and removed the
    // same day when the list was fixed at six. Checked across entitlement
    // states because the splice was entitlement-aware — an entry could have
    // come back greyed rather than not at all, which the exact-order assertion
    // above would catch but this names.
    for (const ents of [[], ["job-fit"], ["honor"], ["job-fit", "honor"]]) {
      renderMenu(ents)
      expect(screen.queryByText("Job Fit")).not.toBeInTheDocument()
      expect(screen.queryByText("Resume Writer")).not.toBeInTheDocument()
      cleanup()
    }
  })

  it("has no permanently-greyed rows left in the menu", () => {
    // Analytics was the last entry that was greyed for EVERYONE regardless of
    // entitlement. Job Fit and Resume Writer grey per-entitlement, so with a
    // fully-entitled user every row must be live — if a new always-off row
    // appears, this fails rather than it quietly becoming normal.
    const menu = renderMenu(["job-fit", "honor"])
    for (const item of menu) {
      expect(row(item.label)).toBeEnabled()
    }
  })
})

// ── 2026-08-12 — the menu is exactly six entries ─────────────────────────
// Rendered, not just asserted on the nav array: the greying lives in
// SidebarScaffold's NavItem, and entries used to be spliced in after the array
// was built, so only a render proves what a user actually sees.
describe("My Workspace — the seven entries", () => {
  it("renders the same seven regardless of entitlements", () => {
    const menu = renderMenu([])
    expect(menu.map((i) => i.label)).toEqual([
      // Exactly six as of 2026-08-12 (request), seven since 2026-09-04 when
      // Goals returned — and Goals renders with NO entitlement, which is the
      // point of asserting on an empty entitlement list here.
      "Home",
      "Chat with Meridian",
      "Goals",
      "Interview Practice",
      "Document Library",
      "Settings",
      "Help & Support",
    ])
  })
})
