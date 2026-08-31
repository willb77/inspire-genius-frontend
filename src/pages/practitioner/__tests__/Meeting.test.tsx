/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import PractitionerMeeting from "../Meeting"

jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="practitioner-layout">{children}</div>
  ),
}))

describe("PractitionerMeeting", () => {
  it("renders inside the layout with the Meeting title", () => {
    render(<PractitionerMeeting />)
    expect(screen.getByTestId("practitioner-layout")).toBeInTheDocument()
    expect(screen.getByText("Meeting")).toBeInTheDocument()
  })

  it("shows the live-meeting card and a disabled Start meeting button", () => {
    render(<PractitionerMeeting />)
    expect(screen.getByText("Live meeting")).toBeInTheDocument()
    const button = screen.getByRole("button", { name: /start meeting/i })
    expect(button).toBeDisabled()
  })

  it("lists the coming-soon features", () => {
    render(<PractitionerMeeting />)
    expect(screen.getByText("Coming soon")).toBeInTheDocument()
    expect(screen.getByText("Screen sharing")).toBeInTheDocument()
    expect(screen.getByText("Recording")).toBeInTheDocument()
    expect(screen.getByText("Transcription")).toBeInTheDocument()
  })
})
