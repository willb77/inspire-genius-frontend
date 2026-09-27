import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import InterviewSubjectPicker from "../InterviewSubjectPicker"

const enabled = jest.fn(() => true)
const roster = jest.fn()
jest.mock("@/hooks/switches/useStudioInterviewSharingEnabled", () => ({
  useStudioInterviewSharingEnabled: () => enabled(),
}))
jest.mock("@/hooks/manager/development/useTeamDevelopmentRoster", () => ({
  useTeamDevelopmentRoster: () => roster(),
}))

const MEMBERS = [
  { memberId: "m1", name: "Ada Member" },
  { memberId: "m2", name: "Bo Member" },
]

beforeEach(() => {
  enabled.mockReturnValue(true)
  roster.mockReturnValue({ data: MEMBERS, isLoading: false, isError: false })
})

describe("InterviewSubjectPicker (S-3)", () => {
  it("offers exactly the interviewer's roster, plus 'don't link'", () => {
    render(<InterviewSubjectPicker value={null} onChange={jest.fn()} />)
    const options = screen.getAllByRole("option").map((o) => o.textContent)
    expect(options).toEqual(["Don't link this interview", "Ada Member", "Bo Member"])
  })

  it("reports the chosen member, and null for 'don't link'", async () => {
    const onChange = jest.fn()
    const user = userEvent.setup()
    render(<InterviewSubjectPicker value={null} onChange={onChange} />)
    await user.selectOptions(screen.getByLabelText(/development record/i), "m2")
    expect(onChange).toHaveBeenLastCalledWith("m2")
    await user.selectOptions(screen.getByLabelText(/development record/i), "")
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it("renders nothing while the server switch is off", () => {
    enabled.mockReturnValue(false)
    const { container } = render(<InterviewSubjectPicker value={null} onChange={jest.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("says so when the roster cannot load, rather than showing an empty list", () => {
    roster.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<InterviewSubjectPicker value={null} onChange={jest.fn()} />)
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load your team roster/i)
  })
})
