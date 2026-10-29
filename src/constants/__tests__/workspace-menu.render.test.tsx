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
// WS-1's workspace_direction_setting switch, held OFF: this menu is the
// switch-off contract, unchanged.
jest.mock("@/hooks/switches/useWorkspaceDirectionSettingEnabled", () => ({
  useWorkspaceDirectionSettingEnabled: () => false,
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
 * used to grey it for entitled users too was lifted. Pass `null` for "the
 * entitlement read has not landed yet".
 *
 * The fixture uses the real manifest's title, "Career Fit".
 */
function renderMenu(entitlements: string[] | null = ["job-fit"]) {
  __resetRegistry()
  registerVertical({
    key: "job-fit",
    title: "Career Fit",
    description: "fit ranking",
    routePrefix: "/vertical/job-fit",
    homePath: "/vertical/job-fit/matches",
  })
  // Registered AFTER Career Fit on purpose: the menu order (Discovery first) is
  // stated in useVerticalLauncher, so it must not depend on registry order.
  registerVertical({
    key: "career-discovery",
    title: "Career & Education Discovery",
    description: "career and education discovery",
    routePrefix: "/vertical/career-discovery",
    homePath: "/vertical/career-discovery",
  })
  mockUseEnabledVerticals.mockReturnValue(
    entitlements === null
      ? { data: undefined, isLoading: true }
      : { data: entitlements, isLoading: false },
  )

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

/**
 * The nine fixed rows (Résumé Writer since 2026-10-19). Career & Education
 * Discovery and Career Fit are spliced in front of Role Play when entitled.
 */
const FIXED = [
  "Home",
  "Chat with Meridian",
  "Goals Studio",
  // "Interview Practice" until 2026-10-18 (request).
  "Role Play",
  // After Role Play since 2026-10-29 (request).
  "My development",
  "Résumé Writer",
  "Document Library",
  "Settings",
  "Help & Support",
]

describe("My Workspace — rendered menu", () => {
  it("renders in the specified order for an account entitled to job-fit", () => {
    const menu = renderMenu()
    expect(menu.map((i) => i.label)).toEqual([
      // Exactly six as of 2026-08-12 (request), seven since 2026-09-04 when
      // Goals returned (Goals offering, Phase 3), eight since 2026-09-30 when
      // My development joined (TDS-4c). 2026-10-18 (request): "Interview
      // Practice" became "Role Play". 2026-10-29 (request): Career Fit, for an
      // account entitled to `job-fit`, sits in FRONT of Role Play, and My
      // development moved after Role Play.
      "Home",
      "Chat with Meridian",
      "Goals Studio",
      "Career Fit",
      "Role Play",
      "My development",
      "Résumé Writer",
      "Document Library",
      "Settings",
      "Help & Support",
    ])
    // Opens on My fit, not on any other Career Fit page.
    expect(menu.find((i) => i.label === "Career Fit")?.to).toBe("/vertical/job-fit/matches")
    expect(row("Career Fit")).toBeEnabled()
    expect(isGreyed("Career Fit")).toBe(false)
  })

  it("renders the 2026-10-29 list exactly for an account entitled to both workspace verticals", () => {
    // The request, verbatim in order: Home, Chat with Meridian, Goals Studio,
    // Career & Education Discovery, Career Fit, Role Play, My development,
    // Resume Writer, Document Library, Settings, Help & Support.
    const menu = renderMenu(["lumen", "job-fit", "career-discovery"])
    expect(menu.map((i) => i.label)).toEqual([
      "Home",
      "Chat with Meridian",
      "Goals Studio",
      "Career & Education Discovery",
      "Career Fit",
      "Role Play",
      "My development",
      "Résumé Writer",
      "Document Library",
      "Settings",
      "Help & Support",
    ])
    expect(row("Career & Education Discovery")).toBeEnabled()
    expect(isGreyed("Career & Education Discovery")).toBe(false)
  })

  it("does not render Analytics at all", () => {
    // Removed 2026-08-12. Asserted on the rendered menu, not just the nav
    // array: a row can be present in the data and still be drawn, and it is the
    // drawn menu the request was about.
    renderMenu()
    expect(screen.queryByText("Analytics")).not.toBeInTheDocument()
  })

  it("leaves the usable shortcuts (and the tail) fully interactive", () => {
    renderMenu()
    for (const label of [
      "Home",
      "Chat with Meridian",
      "Document Library",
      "Role Play",
      // 2026-09-30 (TDS-4c): named explicitly, not left to the "no
      // permanently-greyed rows" sweep below. A greyed My development would
      // carry the "Temporarily unavailable" hover text, which would be a lie
      // about a page gated on nothing but sign-in.
      "My development",
      "Settings",
      "Help & Support",
    ]) {
      expect(row(label)).toBeEnabled()
      expect(isGreyed(label)).toBe(false)
    }
  })

  it("HIDES Career Fit — not greyed — for an account not entitled to job-fit", () => {
    // 2026-10-18 (request): Career Fit shows ONLY for entitled accounts. A
    // greyed row would still show, so this asserts the row is absent from the
    // DOM, across entitlement lists that lack job-fit.
    for (const ents of [[], ["honor"], ["grant", "lumen"]]) {
      const menu = renderMenu(ents)
      expect(menu.map((i) => i.label)).toEqual(FIXED)
      expect(screen.queryByText("Career Fit")).not.toBeInTheDocument()
      cleanup()
    }
  })

  it("HIDES Career Fit while the entitlement read is loading", () => {
    const menu = renderMenu(null)
    expect(menu.map((i) => i.label)).toEqual(FIXED)
    expect(screen.queryByText("Career Fit")).not.toBeInTheDocument()
  })

  it("never shows Job Fit's old label or Resume Writer, at ANY entitlement level", () => {
    // Resume Writer was spliced into this menu on 2026-08-12 and removed the
    // same day. The vertical is "Career Fit" in its manifest; "Job Fit" is the
    // retired label and must not come back as a second row.
    for (const ents of [[], ["job-fit"], ["honor"], ["job-fit", "honor"]]) {
      renderMenu(ents)
      expect(screen.queryByText("Job Fit")).not.toBeInTheDocument()
      expect(screen.queryByText("Resume Writer")).not.toBeInTheDocument()
      expect(screen.queryAllByText("Career Fit").length).toBeLessThanOrEqual(1)
      cleanup()
    }
  })

  it("has no permanently-greyed rows left in the menu", () => {
    // Analytics was the last entry that was greyed for EVERYONE regardless of
    // entitlement. With a fully-entitled user every row must be live — if a new
    // always-off row appears, this fails rather than it quietly becoming normal.
    const menu = renderMenu(["job-fit", "honor"])
    for (const item of menu) {
      expect(row(item.label)).toBeEnabled()
    }
  })
})

// ── 2026-08-12 — the menu is exactly six entries (eight fixed since 09-30) ──
// Rendered, not just asserted on the nav array: the greying lives in
// SidebarScaffold's NavItem, and entries are spliced in after the array is
// built, so only a render proves what a user actually sees.
describe("My Workspace — the nine fixed entries", () => {
  it("renders the same nine with no entitlements at all", () => {
    // Goals Studio, My development and Role Play render with NO entitlement,
    // which is the point of asserting on an empty entitlement list here. Every
    // read behind My development is a `/v1/growth/me/*` route resolved from
    // the caller's own token, so there is nothing to entitle.
    const menu = renderMenu([])
    expect(menu.map((i) => i.label)).toEqual(FIXED)
  })
})
