/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom"

import InterviewRolePage from "../InterviewRolePage"
import { ROLE_PAGES, buildRoleJobDescription, type InterviewRolePage as RolePage } from "@/types/interviewRolePage"

const withSalary = ROLE_PAGES.find((p) => p.market.salary) as RolePage

describe("buildRoleJobDescription", () => {
  it("uses only real page data (title, SOC, wages, outlook) — no invented duties", () => {
    const jd = buildRoleJobDescription(withSalary)
    expect(jd).toContain(withSalary.title)
    expect(jd).toContain(withSalary.socCode)
    const s = withSalary.market.salary!
    expect(jd).toContain(`$${s.median.toLocaleString("en-US")}`)
  })

  it("degrades to just the title + SOC when there is no wage data", () => {
    const bare: RolePage = { ...withSalary, market: { salary: null, outlook: null } }
    const jd = buildRoleJobDescription(bare)
    expect(jd).toBe(`${bare.title} (SOC ${bare.socCode}).`)
    expect(jd).not.toContain("$")
  })
})

function LocationProbe() {
  const loc = useLocation()
  return <pre data-testid="nav-state">{JSON.stringify(loc.state)}</pre>
}

describe("role page CTA carries the role into /interview-practice", () => {
  it("navigates with roleTitle + jobDescription in router state", async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={[withSalary.meta.path]}>
        <Routes>
          <Route path="/interview-practice/:slug" element={<InterviewRolePage />} />
          <Route path="/interview-practice" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole("link", { name: new RegExp(`Practice a ${withSalary.title} interview`, "i") }))

    const state = JSON.parse(screen.getByTestId("nav-state").textContent || "{}")
    expect(state.roleTitle).toBe(withSalary.title)
    expect(state.jobDescription).toContain(withSalary.title)
    expect(state.jobDescription).toContain(withSalary.socCode)
  })
})
