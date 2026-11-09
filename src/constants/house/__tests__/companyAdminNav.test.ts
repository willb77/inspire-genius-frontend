/**
 * @jest-environment jsdom
 *
 * House-style company-admin menu (area `company-admin`, default OFF).
 */
import { COMPANY_ADMIN_NAV_ITEMS, NAV_ITEMS_BY_ROLE } from "@/constants/navigation"
import {
  companyAdminHouseMenu,
  withCompanyAdminHouseMenu,
} from "@/constants/house/companyAdminNav"

const SWITCH = "house_style_company-admin"
const labels = (items: { label: string }[]) => items.map((i) => i.label)

afterEach(() => localStorage.clear())

describe("company-admin house menu", () => {
  it("switch absent: the classic menu, same array, unchanged", () => {
    expect(withCompanyAdminHouseMenu("company-admin", COMPANY_ADMIN_NAV_ITEMS)).toBe(COMPANY_ADMIN_NAV_ITEMS)
    expect(labels(COMPANY_ADMIN_NAV_ITEMS)).toEqual([
      "Dashboard",
      "User Management",
      "Organization",
      "Bulk Import",
      "Analytics",
      "AI Observability",
      "Culture Docs",
      "Surveys",
      "Role Play",
      "Résumé Writer",
      "Settings",
    ])
  })

  it("switch false: the classic menu", () => {
    localStorage.setItem(SWITCH, "false")
    expect(withCompanyAdminHouseMenu("company-admin", COMPANY_ADMIN_NAV_ITEMS)).toBe(COMPANY_ADMIN_NAV_ITEMS)
  })

  it("switch on: People, no Settings or Costs, Help & Support at the end", () => {
    localStorage.setItem(SWITCH, "true")
    const menu = withCompanyAdminHouseMenu("company-admin", COMPANY_ADMIN_NAV_ITEMS)
    expect(menu.map((i) => [i.label, i.to])).toEqual([
      ["Dashboard", "/company-admin/dashboard"],
      ["People", "/company-admin/users"],
      ["Organization", "/company-admin/organization"],
      ["Bulk Import", "/company-admin/bulk-import"],
      ["Analytics", "/company-admin/analytics"],
      ["AI Observability", "/company-admin/observability"],
      ["Culture Docs", "/company-admin/culture"],
      ["Surveys", "/surveys"],
      ["Role Play", "/interview-practice"],
      ["Résumé Writer", "/my/resume"],
      ["Help & Support", "/help"],
    ])
    expect(menu.some((i) => i.to.includes("/settings") || i.to.includes("/costs"))).toBe(false)
    // The classic list itself is never mutated.
    expect(COMPANY_ADMIN_NAV_ITEMS.some((i) => i.label === "Settings")).toBe(true)
  })

  it("drops a Costs entry too, and does not add a second Help", () => {
    const menu = companyAdminHouseMenu([
      { to: "/company-admin/costs", icon: () => null, label: "Costs" },
      { to: "/help", icon: () => null, label: "Help & Support" },
    ])
    expect(labels(menu)).toEqual(["Help & Support"])
  })

  it("switch on changes no other role's menu", () => {
    localStorage.setItem(SWITCH, "true")
    for (const role of ["user", "manager", "practitioner", "distributor", "super-admin"] as const) {
      expect(withCompanyAdminHouseMenu(role, NAV_ITEMS_BY_ROLE[role])).toBe(NAV_ITEMS_BY_ROLE[role])
    }
  })
})
