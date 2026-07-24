/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import PractitionerComingSoon from "../ComingSoon"

jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="practitioner-layout">{children}</div>
  ),
}))

describe("PractitionerComingSoon", () => {
  it("renders the Schedule variant", () => {
    render(<PractitionerComingSoon variant="schedule" />)
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument()
    expect(screen.getByText(/Bulk-schedule sessions/)).toBeInTheDocument()
    expect(screen.getByText("Schedule is on the way")).toBeInTheDocument()
  })

  it("renders the Meeting variant", () => {
    render(<PractitionerComingSoon variant="meeting" />)
    expect(screen.getByText(/LiveKit/)).toBeInTheDocument()
    expect(screen.getByText("Meeting is on the way")).toBeInTheDocument()
  })
})
