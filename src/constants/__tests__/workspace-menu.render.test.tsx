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
      "Home",
      "Chat with Meridian",
      "Interview Practice",
      // Analytics removed 2026-08-12 (request) — it sat between Interview
      // Practice and Goals as a permanently greyed row.
      "Goals",
      "Job Fit",
      // Resume Writer (Honor) joined My Workspace 2026-08-12. It rides the same
      // splice as Job Fit, so it lands here — above the tail, below the
      // primary shortcuts.
      "Resume Writer",
      // Document Library moved down to sit DIRECTLY above Settings on
      // 2026-08-06. "Directly" is why it also joined MENU_TAIL_LABELS — the
      // workspace-vertical splice (Job Fit) would otherwise land between the
      // two and separate them.
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

  it("draws Resume Writer greyed for a user without the Honor entitlement", () => {
    // Honor sits behind VerticalShell, which sends an unentitled visitor to
    // /home. A live-looking row that bounces is worse than a greyed one, so the
    // item is entitlement-aware even though it is a deep link rather than a
    // vertical home.
    renderMenu(["job-fit"])
    expect(row("Resume Writer")).toBeDisabled()
    expect(isGreyed("Resume Writer")).toBe(true)
  })

  it("draws Resume Writer LIVE for a user who IS Honor-entitled", () => {
    renderMenu(["honor"])
    expect(row("Resume Writer")).toBeEnabled()
    expect(isGreyed("Resume Writer")).toBe(false)
  })

  it("draws Job Fit LIVE for a user who is entitled to it", () => {
    // Was greyed-even-when-entitled from 2026-08-04 to 2026-08-11. Entitlement
    // decides it now, so an entitled user must actually be able to click it.
    renderMenu(["job-fit"])
    expect(row("Job Fit")).toBeEnabled()
    expect(isGreyed("Job Fit")).toBe(false)
  })

  it("still greys Job Fit for a user who is NOT entitled", () => {
    // Lifting the force-disable must not open the entry to everyone: the
    // entitlement gate underneath it has to keep working on its own.
    renderMenu(["grant"])
    expect(row("Job Fit")).toBeDisabled()
    expect(isGreyed("Job Fit")).toBe(true)
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

// ── 2026-08-11 — Goals live for every user ────────────────────────────────
// Rendered, not just asserted on the nav array: the greying lives in
// SidebarScaffold's NavItem, so only a render proves the row actually clicks
// through rather than merely carrying the right flag.
//
// Goals was owner-only between 2026-08-06 and 2026-08-11. The owner branch is
// gone — there is no per-viewer input left — so these cases are about the one
// menu everybody gets.
describe("My Workspace — Goals live for everyone", () => {
  it("draws Goals live", () => {
    renderMenu()
    expect(row("Goals")).toBeEnabled()
    expect(row("Goals")).not.toHaveAttribute("aria-disabled", "true")
    expect(row("Goals")).not.toHaveAttribute("title", "Temporarily unavailable")
    expect(isGreyed("Goals")).toBe(false)
  })

  it("draws Goals live even for a user with NO entitlements at all", () => {
    // The row is deliberately not entitlement-aware: it is a plain link, and
    // VerticalShell redirects an unentitled visitor once they arrive. A greyed
    // row here would need `direction-setting` spliced into the workspace menu,
    // which it is not.
    renderMenu([])
    expect(row("Goals")).toBeEnabled()
  })

  it("keeps the menu in the same order it had while greyed", () => {
    const menu = renderMenu()
    expect(menu.map((i) => i.label)).toEqual([
      "Home",
      "Chat with Meridian",
      "Interview Practice",
      // Analytics removed 2026-08-12 (request) — it sat between Interview
      // Practice and Goals as a permanently greyed row.
      "Goals",
      "Job Fit",
      // Resume Writer (Honor) joined My Workspace 2026-08-12. It rides the same
      // splice as Job Fit, so it lands here — above the tail, below the
      // primary shortcuts.
      "Resume Writer",
      // Document Library moved down to sit DIRECTLY above Settings on
      // 2026-08-06. "Directly" is why it also joined MENU_TAIL_LABELS — the
      // workspace-vertical splice (Job Fit) would otherwise land between the
      // two and separate them.
      "Document Library",
      "Settings",
      "Help & Support",
    ])
  })
})
