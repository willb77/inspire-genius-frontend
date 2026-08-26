import {
  NAV_ITEMS_BY_ROLE,
  USER_NAV_ITEMS,
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

  // ── The manager menu, as specified 2026-08-16 ──────────────────────
  //
  // Order is part of the requirement, not incidental, so it is asserted as a
  // sequence rather than as a set of "contains" checks.
  //
  // 2026-08-26: "Join Requests" added after the roster, deliberately. It is how
  // the roster GROWS — approving a request writes that person's tenant key —
  // and there is no notification when one arrives, so if it is not in the
  // sidebar nobody ever looks at it and the queue silently fills up.
  describe("MANAGER_NAV_ITEMS", () => {
    const labels = () => NAV_ITEMS_BY_ROLE.manager.map((i) => i.label)

    it("is in the specified order", () => {
      expect(labels()).toEqual([
        "Dashboard",
        "Team Roster (Client)",
        "Join Requests",
        "Schedule",
        "Chat with Meridian",
        "Document Library",
        "Team Import",
        "Surveys",
        "Settings",
        "Help & Support",
      ])
    })

    it("points the four shared surfaces at their unprefixed routes", () => {
      // These carry no `/manager/` prefix, which is exactly why a manager can
      // already reach them — ProtectedRoute gates by path prefix only. Pointing
      // any of them at a /manager/* clone would create a second copy of a
      // surface that already ships.
      const byLabel = Object.fromEntries(NAV_ITEMS_BY_ROLE.manager.map((i) => [i.label, i.to]))
      expect(byLabel["Chat with Meridian"]).toBe(ROUTES.MERIDIAN_CHAT)
      expect(byLabel["Document Library"]).toBe(ROUTES.DOCUMENTS)
      expect(byLabel["Surveys"]).toBe(ROUTES.SURVEYS)
      expect(byLabel["Help & Support"]).toBe(ROUTES.HELP)
    })

    it("keeps Team Import on the existing manager bulk-import route", () => {
      const item = NAV_ITEMS_BY_ROLE.manager.find((i) => i.label === "Team Import")
      expect(item?.to).toBe(ROUTES.MANAGER.BULK_IMPORT)
    })

    it("gives Schedule its own manager route", () => {
      const item = NAV_ITEMS_BY_ROLE.manager.find((i) => i.label === "Schedule")
      expect(item?.to).toBe(ROUTES.MANAGER.SCHEDULE)
      // NOT the practitioner one — same scheduler backend, different roster.
      expect(item?.to).not.toBe(ROUTES.PRACTITIONER.SCHEDULE)
    })

    it("no longer lists the five surfaces removed on request", () => {
      // The PAGES still route; this is a shortcut list, not the route table.
      for (const gone of [
        "PRISM Team",
        "Job Blueprint",
        "Interview Prep",
        "Team Composition",
        "Analytics",
      ]) {
        expect(labels()).not.toContain(gone)
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

  it("declares every removed route hidden, so the constant matches the menu", () => {
    // HIDDEN_WORKSPACE_ROUTES means "absent from the menu". It has to stay in
    // step with getUserNavItems or the invariant test above ("never contradicts
    // the rendered menu") is asserting against a lie.
    for (const route of [
      ROUTES.ANALYTICS,
      ROUTES.DIRECTION_SETTING.GOALS,
      ROUTES.JOB_FIT.MATCHES,
    ]) {
      expect(HIDDEN_WORKSPACE_ROUTES).toContain(route)
    }
  })

  // ── 2026-08-12, user request: the menu is EXACTLY these six ──────────────
  it("renders exactly six entries, in the specified order", () => {
    // An exact-array assertion, deliberately: the request was a closed list, so
    // anything ADDED here should fail, not just anything removed. A subsequence
    // or arrayContaining check would let a seventh entry through silently.
    expect(labels(true)).toEqual([
      "Home",
      "Chat with Meridian",
      "Interview Practice",
      "Document Library",
      "Settings",
      "Help & Support",
    ])
  })

  it("is still six entries with the agent-engine toggle OFF", () => {
    // The toggle swaps the chat row's destination and label, not the shape of
    // the menu.
    expect(labels(false)).toEqual([
      "Home",
      "Chat with Coaches",
      "Interview Practice",
      "Document Library",
      "Settings",
      "Help & Support",
    ])
  })

  it("drops Goals and Job Fit from the menu", () => {
    const items = getUserNavItems(true)
    expect(items.find((i) => i.to === ROUTES.DIRECTION_SETTING.GOALS)).toBeUndefined()
    expect(labels(true)).not.toContain("Goals")
    expect(labels(true)).not.toContain("Job Fit")
  })

  it("keeps USER_NAV_ITEMS in step with getUserNavItems", () => {
    // The two drifted before — USER_NAV_ITEMS carried Request Assessment and
    // Feedback long after getUserNavItems dropped them — and which one renders
    // depends on the layout, so a drift means the menu changes as you move
    // around the app. Compared by ROUTE, since only the chat row's label varies.
    const staticRoutes = USER_NAV_ITEMS.map((i) => i.to)
    const liveRoutes = getUserNavItems(false).map((i) => i.to)
    expect(staticRoutes).toEqual(liveRoutes)
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
