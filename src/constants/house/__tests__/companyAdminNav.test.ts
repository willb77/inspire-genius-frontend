/**
 * @jest-environment jsdom
 *
 * House-style company-admin menu (area `company-admin`, default OFF).
 *
 * RM-4 (2026-11-25): Role Play and Résumé Writer left the company-admin list
 * for the My Workspace section, and Settings and Help & Support are in the
 * footer section, so neither list carries them and the house menu no longer
 * appends Help.
 */
import { COMPANY_ADMIN_NAV_ITEMS, FOOTER_NAV_ITEMS_BY_ROLE, NAV_ITEMS_BY_ROLE } from "@/constants/navigation"
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
    ])
  })

  it("switch false: the classic menu", () => {
    localStorage.setItem(SWITCH, "false")
    expect(withCompanyAdminHouseMenu("company-admin", COMPANY_ADMIN_NAV_ITEMS)).toBe(COMPANY_ADMIN_NAV_ITEMS)
  })

  it("switch on: People, no Settings or Costs, and no Help (it is in the footer)", () => {
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
    ])
    expect(menu.some((i) => i.to.includes("/settings") || i.to.includes("/costs") || i.to === "/help")).toBe(false)
  })

  it("drops a Costs entry and the placeholder Settings page, and adds nothing", () => {
    const menu = companyAdminHouseMenu([
      { to: "/company-admin/costs", icon: () => null, label: "Costs" },
      { to: "/company-admin/settings", icon: () => null, label: "Settings" },
      { to: "/surveys", icon: () => null, label: "Surveys" },
    ])
    expect(labels(menu)).toEqual(["Surveys"])
  })

  it("RM-4: the company-admin footer is Settings → the shared /settings, then Help", () => {
    expect(FOOTER_NAV_ITEMS_BY_ROLE["company-admin"]?.map((i) => [i.label, i.to])).toEqual([
      ["Settings", "/settings"],
      ["Help & Support", "/help"],
    ])
  })

  it("switch on changes no other role's menu", () => {
    localStorage.setItem(SWITCH, "true")
    for (const role of ["user", "manager", "practitioner", "distributor", "super-admin"] as const) {
      expect(withCompanyAdminHouseMenu(role, NAV_ITEMS_BY_ROLE[role])).toBe(NAV_ITEMS_BY_ROLE[role])
    }
  })
})
