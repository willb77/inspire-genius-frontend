import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import { PRACTITIONER_NAV_ITEMS, TOOL_ITEMS_BY_ROLE } from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"

/**
 * U9 (decision D3) — the practitioner's Studio is the "Client Development
 * Studio", it leads the practitioner's main menu, and it is no longer in Tools.
 *
 * The practitioner sidebar (UnifiedLayout) renders PRACTITIONER_NAV_ITEMS and
 * the Tools rollup fed by TOOL_ITEMS_BY_ROLE.practitioner. SidebarScaffold
 * keys rows by label, so one label in both lists renders twice and collides.
 */

const flat = (items: NavItemDef[]): NavItemDef[] =>
  items.flatMap((i) => [i, ...flat(i.children ?? [])])

const main = PRACTITIONER_NAV_ITEMS
const tools = TOOL_ITEMS_BY_ROLE.practitioner ?? []

describe("practitioner menu (U9)", () => {
  it("as declared — main menu and Tools", () => {
    expect({
      main: main.map((i) => `${i.label} -> ${i.to}`),
      tools: flat(tools).map((i) => `${i.label} -> ${i.to}`),
    }).toMatchInlineSnapshot(`
      {
        "main": [
          "Client Development Studio -> /practitioner/development",
          "Practitioner Home -> /practitioner/home",
          "Chat with Meridian -> /meridian/chat",
          "My Clients -> /practitioner/clients",
          "Client PRISM Assessments -> /practitioner/prism-clients",
          "My PRISM Practice -> /practitioner/practice",
          "Schedule -> /practitioner/schedule",
          "Surveys -> /surveys",
          "Analytics -> /practitioner/analytics",
          "Role Play -> /interview-practice",
          "Résumé Writer -> /my/resume",
        ],
        "tools": [
          "Goals Studio -> /my/goals",
          "Role Blueprint Match -> /practitioner/job-blueprint",
          "Interview Studio -> /practitioner/interview-studio",
          "Live Interview -> /practitioner/interview-live",
          "Character Lab -> /practitioner/character-lab",
        ],
      }
    `)
  })

  it("leads with the Client Development Studio", () => {
    expect(main[0]).toMatchObject({ label: "Client Development Studio", to: ROUTES.PRACTITIONER.DEVELOPMENT })
  })

  it("lists the Studio once across the whole sidebar, by route and by label", () => {
    const all = [...flat(main), ...flat(tools)]
    expect(all.filter((i) => i.to === ROUTES.PRACTITIONER.DEVELOPMENT)).toHaveLength(1)
    expect(all.filter((i) => /Development Studio/.test(i.label))).toHaveLength(1)
  })

  it("never uses one label twice across the main menu and Tools", () => {
    const labels = [...flat(main), ...flat(tools)].map((i) => i.label)
    const dupes = labels.filter((l, idx) => labels.indexOf(l) !== idx)
    expect(dupes).toEqual([])
  })

  it("a control: the uniqueness check does catch a label listed twice", () => {
    const labels = [...flat(main), ...flat([...tools, main[0]])].map((i) => i.label)
    const dupes = labels.filter((l, idx) => labels.indexOf(l) !== idx)
    expect(dupes).toEqual(["Client Development Studio"])
  })

  it("keeps My Clients until U11 folds it into the Studio", () => {
    expect(main.map((i) => i.to)).toContain(ROUTES.PRACTITIONER.CLIENTS)
  })
})
