/**
 * @jest-environment jsdom
 *
 * FitNav — "Blueprint a role" is greyed for the `user` role only (2026-10-18).
 */
import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import type { UserRole } from "@/types/roles"

const mockUseAuth = jest.fn()
jest.mock("@/context/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}))

import FitNav from "../FitNav"

const OTHER_ROLES: UserRole[] = [
  "manager",
  "company-admin",
  "practitioner",
  "distributor",
  "super-admin",
]
const OTHER_TOOLS = ["My fit", "Gaps", "Pathway", "Fit a JD", "Coaching"]

function renderAs(role: string | undefined) {
  mockUseAuth.mockReturnValue({ user: role === undefined ? null : { id: "me", role } })
  render(
    <MemoryRouter initialEntries={["/vertical/job-fit/matches"]}>
      <FitNav />
    </MemoryRouter>,
  )
  return screen.getByRole("navigation", { name: "Job Fit tools" })
}

describe("FitNav — Blueprint a role by role", () => {
  it("greys it for `user`: aria-disabled, no href, not tabbable, with the reason", () => {
    const nav = renderAs("user")
    const item = within(nav).getByRole("link", { name: "Blueprint a role" })
    expect(item).toHaveAttribute("aria-disabled", "true")
    expect(item).not.toHaveAttribute("href")
    expect(item.tagName).not.toBe("A")
    expect(item).not.toHaveAttribute("tabindex")
    expect(item).toHaveAttribute("title", "Not available for the User role")
  })

  it("keeps every other Career Fit tool enabled for `user`", () => {
    const nav = renderAs("user")
    for (const label of OTHER_TOOLS) {
      const link = within(nav).getByRole("link", { name: label })
      expect(link.tagName).toBe("A")
      expect(link).toHaveAttribute("href")
      expect(link).not.toHaveAttribute("aria-disabled")
    }
  })

  it("treats a missing role as `user`, matching VerticalShell's sidebar", () => {
    const nav = renderAs(undefined)
    expect(within(nav).getByRole("link", { name: "Blueprint a role" })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
  })

  it.each(OTHER_ROLES)("leaves it an enabled link for %s", (role) => {
    const nav = renderAs(role)
    const link = within(nav).getByRole("link", { name: "Blueprint a role" })
    expect(link.tagName).toBe("A")
    expect(link).toHaveAttribute("href", "/vertical/job-fit/blueprint")
    expect(link).not.toHaveAttribute("aria-disabled")
    expect(link).not.toHaveAttribute("title")
  })
})
