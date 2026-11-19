/**
 * Phase A of the Careers/Education merge (CSA 2026-11-19): the page named
 * "Careers and Jobs" must not call itself "Job Fit". Only under the v2 page —
 * every other Job Fit page keeps its wording.
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import FitPurpose from "../FitPurpose"
import JobFitHome from "../JobFitHome"

jest.mock("@/verticals/core", () => ({
  useVerticalAccess: () => ({ hasAccess: false, isLoading: false, enabledVerticals: [] }),
}))
jest.mock("@/hooks/career-exercise/useCounselorCareerExercise", () => ({ useCareerExerciseSwitch: () => "off" }))
jest.mock("../FavoritesList", () => ({ FavoritesList: () => null }))
// Shows which wording the page asked MatchesPage for.
jest.mock("../MatchesPage", () => ({
  __esModule: true,
  default: ({ careersAndJobs }: { careersAndJobs?: boolean }) => <p>{careersAndJobs ? "CJ-NAMED" : "JF-NAMED"}</p>,
}))

describe("FitPurpose wording", () => {
  it("default is Job Fit, untouched", () => {
    render(<FitPurpose />)
    expect(screen.getByRole("heading", { name: "What Job Fit is for" })).toBeInTheDocument()
    expect(screen.getByText(/^Job Fit compares how you're wired/)).toBeInTheDocument()
  })
  it("careersAndJobs names the page Careers and Jobs, nowhere Job Fit", () => {
    const { container } = render(<FitPurpose careersAndJobs />)
    expect(screen.getByRole("heading", { name: "What Careers and Jobs is for" })).toBeInTheDocument()
    expect(screen.getByText(/^Careers and Jobs compares how you're wired/)).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/Job Fit/)
  })
})

describe("Careers and Jobs home", () => {
  it("asks the jobs section for the Careers and Jobs wording", () => {
    render(
      <MemoryRouter>
        <JobFitHome />
      </MemoryRouter>,
    )
    expect(screen.getByText("CJ-NAMED")).toBeInTheDocument()
    expect(screen.queryByText("JF-NAMED")).toBeNull()
  })
})
