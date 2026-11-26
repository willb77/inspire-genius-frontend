/**
 * @jest-environment jsdom
 *
 * House-style menu (area switch `admin`). The classic menu is covered by
 * SuperAdminLayout.test.tsx; this file pins both sides of the switch.
 */
import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import SuperAdminLayout from "../SuperAdminLayout"
import { PLATFORM_OWNER_EMAIL } from "@/constants/navigation"

// Reserved example domain (RFC 2606), built at runtime.
const mockMail = (user: string) => `${user}@example.org`

const mockTools = jest.fn((): { label: string; items: { to: string; label: string }[] } | null => null)
jest.mock("@/hooks/nav/useToolsSection", () => ({ useToolsSection: () => mockTools() }))
jest.mock("@/components/layout/useVerticalLauncher", () => ({
  useWorkspaceNavItems: (items: unknown) => items,
}))
jest.mock("@/components/grant/GrantPreviewToggle", () => ({ __esModule: true, default: () => null }))
jest.mock("@/lib/agentApi", () => ({ useAgentEngine: () => true }))
// JF-13 admin: SuperAdminLayout reads `job_fit_v2` (useSavedJobsEnabled). This
// suite has no QueryClient and pins today's menus, so the switch is off here;
// the on state is covered in hooks/nav/__tests__/jf13-admin-categories.test.tsx.
jest.mock("@/hooks/job-fit/useSavedJobs", () => ({ useSavedJobsEnabled: () => false }))

let mockEmail: string | null = mockMail("admin")
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: mockEmail ? { email: mockEmail } : null }),
}))

type Item = { to: string; label: string }
type Section = { label: string; items: Item[]; defaultCollapsed?: boolean; collapsible?: boolean; pinned?: boolean }
const mockScaffold = jest.fn()
jest.mock("@/components/shared/layout/SidebarScaffold", () => ({
  __esModule: true,
  default: (props: { navSections?: Section[]; children?: ReactNode }) => {
    mockScaffold(props)
    return <div data-testid="scaffold">{props.children}</div>
  },
}))

function sections(): Section[] {
  return mockScaffold.mock.calls[mockScaffold.mock.calls.length - 1][0].navSections
}

function renderLayout() {
  render(
    <SuperAdminLayout>
      <div>child</div>
    </SuperAdminLayout>,
  )
}

describe("SuperAdminLayout — house style switch", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
    mockEmail = mockMail("admin")
    mockTools.mockReturnValue(null)
  })

  // RM-9b (2026-11-26): the classic menu (My Workspace, Role Views,
  // Administration) is gone. Both tiers built with the `admin` area on and
  // nothing in the app turns it off, so the house menu is the only menu; the
  // switch no longer changes it in either direction.
  it.each([null, "false", "true"])("house_style_admin = %s: the same house menu", (value) => {
    if (value !== null) localStorage.setItem("house_style_admin", value)
    renderLayout()
    expect(sections().map((s) => s.label)).toEqual(["", "People", "Support", "PRISM", "AI coaches", "Reports", "Advanced", "My Workspace", ""])
    expect(sections().some((s) => s.label === "Role Views")).toBe(false)
    expect(sections().some((s) => s.label === "Administration")).toBe(false)
    expect(screen.getByText("child")).toBeInTheDocument()
  })

  it("switch ON: six groups plus Advanced, then Tools, then My Workspace collapsed — no Role Views", () => {
    localStorage.setItem("house_style_admin", "true")
    mockTools.mockReturnValue({ label: "Tools", items: [{ to: "/bio", label: "Bio Capture" }] })
    renderLayout()
    expect(sections().map((s) => s.label)).toEqual([
      "",
      "People",
      "Support",
      "PRISM",
      "AI coaches",
      "Reports",
      "Advanced",
      "Tools",
      "My Workspace",
      // RM-8 (O-1): the pinned footer, Settings + Help & Support.
      "",
    ])
    const footer = sections()[sections().length - 1]
    expect(footer.pinned).toBe(true)
    expect(footer.items.map((i) => i.to)).toEqual(["/super-admin/settings", "/help"])
    const workspace = sections().find((s) => s.label === "My Workspace")
    expect(workspace?.defaultCollapsed).toBe(true)
    expect(workspace?.items.length).toBeGreaterThan(0)
    expect(sections().some((s) => s.label === "Role Views")).toBe(false)
    expect(sections().some((s) => s.label === "Administration")).toBe(false)
  })

  it("switch ON still hides the owner-only Dev traffic report from other super-admins", () => {
    localStorage.setItem("house_style_admin", "true")
    renderLayout()
    const advanced = sections().find((s) => s.label === "Advanced")
    expect(advanced?.items.map((i) => i.to)).not.toContain("/super-admin/dev-traffic-report")
  })

  it("switch ON keeps the Dev traffic report for the platform owner", () => {
    localStorage.setItem("house_style_admin", "true")
    mockEmail = PLATFORM_OWNER_EMAIL.toUpperCase()
    renderLayout()
    const advanced = sections().find((s) => s.label === "Advanced")
    expect(advanced?.items.map((i) => i.to)).toContain("/super-admin/dev-traffic-report")
  })
})
