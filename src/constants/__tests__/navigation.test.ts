import {
  NAV_ITEMS_BY_ROLE,
  HOME_ROUTE_BY_ROLE,
  DEFAULT_ROLE_CONFIGS,
  TOOL_ITEMS_BY_ROLE,
  SUPER_ADMIN_TOOLS_SECTION,
  getUserNavItems,
  HIDDEN_WORKSPACE_ROUTES,
  WORKSPACE_ITEM_UNAVAILABLE_REASON,
} from "../navigation"
import { ROUTES } from "@/constants/routes"
import type { UserRole } from "@/types/roles"

const ALL_ROLES: UserRole[] = ["user", "manager", "company-admin", "practitioner", "distributor", "super-admin"]

describe("constants/navigation", () => {
  describe("NAV_ITEMS_BY_ROLE", () => {
    it("provides nav items for every role", () => {
      for (const role of ALL_ROLES) {
        expect(NAV_ITEMS_BY_ROLE[role]).toBeDefined()
        expect(NAV_ITEMS_BY_ROLE[role].length).toBeGreaterThan(0)
      }
    })

    it("each nav item has to, icon, and label", () => {
      for (const role of ALL_ROLES) {
        for (const item of NAV_ITEMS_BY_ROLE[role]) {
          expect(typeof item.to).toBe("string")
          expect(typeof item.label).toBe("string")
          expect(item.icon).toBeDefined()
        }
      }
    })
  })

  describe("Tools rollup", () => {
    it("defines tool-item arrays for manager and super-admin", () => {
      expect(Array.isArray(TOOL_ITEMS_BY_ROLE.manager)).toBe(true)
      expect(Array.isArray(TOOL_ITEMS_BY_ROLE["super-admin"])).toBe(true)
    })

    it("every tool item is well-formed (to, icon, label)", () => {
      for (const items of Object.values(TOOL_ITEMS_BY_ROLE)) {
        for (const item of items ?? []) {
          expect(typeof item.to).toBe("string")
          expect(typeof item.label).toBe("string")
          expect(item.icon).toBeDefined()
        }
      }
    })

    it("super-admin Tools section is a collapsed 'Tools' rollup or null", () => {
      if (SUPER_ADMIN_TOOLS_SECTION) {
        expect(SUPER_ADMIN_TOOLS_SECTION.label).toBe("Tools")
        expect(SUPER_ADMIN_TOOLS_SECTION.defaultCollapsed).toBe(true)
        expect(SUPER_ADMIN_TOOLS_SECTION.items.length).toBeGreaterThan(0)
      } else {
        expect(SUPER_ADMIN_TOOLS_SECTION).toBeNull()
      }
    })
  })

  describe("HOME_ROUTE_BY_ROLE", () => {
    it("provides a home route for every role", () => {
      for (const role of ALL_ROLES) {
        expect(typeof HOME_ROUTE_BY_ROLE[role]).toBe("string")
        expect(HOME_ROUTE_BY_ROLE[role].startsWith("/")).toBe(true)
      }
    })
  })

  describe("DEFAULT_ROLE_CONFIGS", () => {
    it("provides a config for every role", () => {
      for (const role of ALL_ROLES) {
        const config = DEFAULT_ROLE_CONFIGS[role]
        expect(config.role).toBe(role)
        expect(typeof config.label).toBe("string")
        expect(typeof config.description).toBe("string")
        expect(typeof config.homeRoute).toBe("string")
        expect(config.navItems.length).toBeGreaterThan(0)
      }
    })
  })
})

describe("Document Library in My Workspace", () => {
  it("appears in the user menu under both agent-engine toggle states", () => {
    for (const agentEngineOn of [true, false]) {
      const items = getUserNavItems(agentEngineOn)
      const doc = items.find((i) => i.to === ROUTES.DOCUMENTS)
      expect(doc).toBeDefined()
      expect(doc!.label).toBe("Document Library")
    }
  })

  it("is no longer listed as a hidden workspace route", () => {
    expect(HIDDEN_WORKSPACE_ROUTES).not.toContain(ROUTES.DOCUMENTS)
  })

  it("HIDDEN_WORKSPACE_ROUTES never contradicts the rendered menu", () => {
    // The constant is documentation-as-code with no runtime consumer, so
    // nothing else would catch it drifting out of step with the real menu —
    // a route claimed "hidden" while actually rendered is a silent lie to
    // whoever reads it next.
    const rendered = new Set(getUserNavItems(true).map((i) => i.to))
    for (const hidden of HIDDEN_WORKSPACE_ROUTES) {
      expect(rendered.has(hidden)).toBe(false)
    }
  })

  it("keeps the route itself unchanged so existing links still resolve", () => {
    // The rename is label-only. If ROUTES.DOCUMENTS ever moved, bookmarks and
    // the Meridian header entry point would break silently.
    expect(ROUTES.DOCUMENTS).toBe("/documents")
  })
})

// ── 2026-08-04, user request ──────────────────────────────────────────────
// My Workspace order fixed, and Analytics / Goals / Job Fit switched off.
// Job Fit is spliced in from the vertical registry, so its half of the change
// is pinned in components/layout/__tests__/useVerticalLauncher.test.ts.
describe("My Workspace menu order + switched-off entries", () => {
  const labels = (agentEngineOn: boolean) =>
    getUserNavItems(agentEngineOn).map((i) => i.label)

  it("orders the usable entries Home → Chat → Document Library → Interview Practice → Help", () => {
    // Asserted as a subsequence, not the whole array: the greyed entries and
    // Settings sit between them, and Job Fit is spliced in later by
    // useWorkspaceNavItems. What was specified is the RELATIVE order of these
    // five, so that is what is pinned.
    const wanted = [
      "Home",
      "Chat with Meridian",
      "Document Library",
      "Interview Practice",
      "Help & Support",
    ]
    const positions = wanted.map((l) => labels(true).indexOf(l))
    expect(positions).not.toContain(-1)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it("puts Document Library ahead of Interview Practice (they swapped)", () => {
    for (const on of [true, false]) {
      const l = labels(on)
      expect(l.indexOf("Document Library")).toBeLessThan(
        l.indexOf("Interview Practice"),
      )
    }
  })

  it("keeps Help & Support last", () => {
    for (const on of [true, false]) {
      expect(labels(on).at(-1)).toBe("Help & Support")
    }
  })

  it("greys out Analytics and Goals under BOTH agent-engine toggle states", () => {
    for (const on of [true, false]) {
      const items = getUserNavItems(on)
      for (const route of [ROUTES.ANALYTICS, ROUTES.DIRECTION_SETTING.GOALS]) {
        const item = items.find((i) => i.to === route)
        expect(item).toBeDefined()
        expect(item!.disabled).toBe(true)
      }
    }
  })

  it("explains WHY they are off instead of blaming the user's plan", () => {
    // NavItemDef's default locked title is "not included in your plan". These
    // three are off for everyone, so that default would be untrue — a menu
    // that misinforms is worse than one that says nothing.
    const items = getUserNavItems(true)
    for (const route of [ROUTES.ANALYTICS, ROUTES.DIRECTION_SETTING.GOALS]) {
      expect(items.find((i) => i.to === route)!.disabledReason).toBe(
        WORKSPACE_ITEM_UNAVAILABLE_REASON,
      )
    }
  })

  it("leaves the switched-off entries VISIBLE — disabled is not deleted", () => {
    const rendered = labels(true)
    expect(rendered).toContain("Analytics")
    expect(rendered).toContain("Goals")
  })

  it("does not list them as hidden — they are present, just not usable", () => {
    // HIDDEN_WORKSPACE_ROUTES means "absent from the menu". Adding a greyed
    // entry to it would make the constant lie, and the invariant test above
    // ("never contradicts the rendered menu") would fail.
    expect(HIDDEN_WORKSPACE_ROUTES).not.toContain(ROUTES.ANALYTICS)
    expect(HIDDEN_WORKSPACE_ROUTES).not.toContain(ROUTES.DIRECTION_SETTING.GOALS)
  })

  it("keeps every switched-off route resolvable so re-enabling is one line", () => {
    const items = getUserNavItems(true)
    expect(items.find((i) => i.label === "Analytics")!.to).toBe(ROUTES.ANALYTICS)
    expect(items.find((i) => i.label === "Goals")!.to).toBe(
      ROUTES.DIRECTION_SETTING.GOALS,
    )
  })

  it("leaves the four usable entries usable", () => {
    const items = getUserNavItems(true)
    for (const label of [
      "Home",
      "Chat with Meridian",
      "Document Library",
      "Interview Practice",
      "Settings",
      "Help & Support",
    ]) {
      expect(items.find((i) => i.label === label)!.disabled).toBeFalsy()
    }
  })
})
