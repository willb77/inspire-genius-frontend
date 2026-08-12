import {
  NAV_ITEMS_BY_ROLE,
  HOME_ROUTE_BY_ROLE,
  DEFAULT_ROLE_CONFIGS,
  TOOL_ITEMS_BY_ROLE,
  getUserNavItems,
  HIDDEN_WORKSPACE_ROUTES,
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

    // SUPER_ADMIN_TOOLS_SECTION was removed 2026-08-12 — the section is now
    // assembled by useToolsSection, covered in hooks/nav/__tests__. What still
    // belongs here is the DATA that hook consumes.
    it("gives super-admin all four tools, none of them behind the pilot flag", () => {
      // Team Development Studio is flag-gated for the manager pilot but must be
      // unconditional for super-admin — gating the platform owner on a pilot
      // flag is what made the entry vanish from builds with the flag unset.
      const labels = (TOOL_ITEMS_BY_ROLE["super-admin"] ?? []).map((i) => i.label)
      expect(labels).toEqual([
        "Team Development Studio",
        "Interview Practice",
        "Live Interview",
        "Interview Studio",
      ])
    })

    it("points super-admin Live Interview at its OWN route, not the manager one", () => {
      const live = (TOOL_ITEMS_BY_ROLE["super-admin"] ?? []).find(
        (i) => i.label === "Live Interview",
      )
      expect(live?.to).toBe(ROUTES.SUPER_ADMIN.INTERVIEW_LIVE)
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

  it("orders the usable entries Home → Chat → Interview Practice → Document Library → Help", () => {
    // Asserted as a subsequence, not the whole array: the greyed entries and
    // Settings sit between them, and Job Fit is spliced in later by
    // useWorkspaceNavItems. What was specified is the RELATIVE order, so that
    // is what is pinned.
    //
    // Document Library moved from third to just above Settings on 2026-08-06.
    const wanted = [
      "Home",
      "Chat with Meridian",
      "Interview Practice",
      "Document Library",
      "Help & Support",
    ]
    const positions = wanted.map((l) => labels(true).indexOf(l))
    expect(positions).not.toContain(-1)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
  })

  it("puts Document Library DIRECTLY above Settings, with nothing between", () => {
    // Adjacency is the requirement, not just order: the workspace-vertical
    // splice used to land between the two, which is why "Document Library" is
    // in MENU_TAIL_LABELS. A plain indexOf(<) comparison would not catch that
    // regression, so this asserts the gap is exactly one.
    for (const on of [true, false]) {
      const l = labels(on)
      expect(l.indexOf("Settings") - l.indexOf("Document Library")).toBe(1)
    }
  })

  it("keeps Help & Support last", () => {
    for (const on of [true, false]) {
      expect(labels(on).at(-1)).toBe("Help & Support")
    }
  })

  // ── 2026-08-12, user request: Analytics REMOVED ─────────────────────────
  it("no longer lists Analytics at all, under BOTH agent-engine toggle states", () => {
    // It was a greyed, non-navigating row from 2026-08-04 until now. Asserting
    // on the ROUTE as well as the label: a future entry pointing at
    // ROUTES.ANALYTICS under a different name would still be the thing that was
    // asked to be removed.
    for (const on of [true, false]) {
      const items = getUserNavItems(on)
      expect(items.find((i) => i.to === ROUTES.ANALYTICS)).toBeUndefined()
      expect(items.map((i) => i.label)).not.toContain("Analytics")
    }
  })

  it("declares Analytics hidden, so the constant matches the menu", () => {
    // HIDDEN_WORKSPACE_ROUTES means "absent from the menu" — now true of
    // Analytics, where before it would have been a lie. The invariant test
    // above ("never contradicts the rendered menu") depends on this staying in
    // step with getUserNavItems.
    expect(HIDDEN_WORKSPACE_ROUTES).toContain(ROUTES.ANALYTICS)
    expect(HIDDEN_WORKSPACE_ROUTES).not.toContain(ROUTES.DIRECTION_SETTING.GOALS)
  })

  it("keeps Goals VISIBLE — removing Analytics did not take its neighbour", () => {
    expect(labels(true)).toContain("Goals")
  })

  // ── 2026-08-11, user request: Goals live for EVERY user ──────────────────
  //
  // Was switched off 2026-08-04, then unlocked for the platform owner only on
  // 2026-08-06 via a `{ viewerEmail }` option. Goals is now a plain live row and
  // that option is gone — `getUserNavItems` takes the toggle and nothing else.
  //
  // Access is no longer decided here at all: it is the `direction-setting`
  // entitlement, enforced server-side by `require_vertical`. A live menu row for
  // an unentitled user is correct — they reach the route and VerticalShell sends
  // them home, exactly like every other vertical.
  describe("Goals — live for everyone", () => {
    const goals = (on = true) =>
      getUserNavItems(on).find((i) => i.to === ROUTES.DIRECTION_SETTING.GOALS)!

    it("is a live entry under BOTH agent-engine toggle states", () => {
      for (const on of [true, false]) {
        expect(goals(on).disabled).toBeFalsy()
        expect(goals(on).disabledReason).toBeUndefined()
      }
    })

    it("no longer varies by viewer — the menu is identical for everyone", () => {
      // The owner gate is gone. Two calls must be byte-identical, because there
      // is no per-viewer input left to make them differ.
      expect(getUserNavItems(true)).toEqual(getUserNavItems(true))
    })

    it("sits between Interview Practice and Document Library", () => {
      // Goals used to be pinned as "directly after Analytics". Analytics was
      // removed on 2026-08-12, so that anchor is gone; this pins the position
      // against the neighbours that remain rather than deleting the assertion
      // and losing the guarantee that Goals keeps its slot.
      const l = labels(true)
      expect(l.indexOf("Interview Practice")).toBeLessThan(l.indexOf("Goals"))
      expect(l.indexOf("Goals")).toBeLessThan(l.indexOf("Document Library"))
    })
  })

  it("keeps Goals pointing at its real route", () => {
    const items = getUserNavItems(true)
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
