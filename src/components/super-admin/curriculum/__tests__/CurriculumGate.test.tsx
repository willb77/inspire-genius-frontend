import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CurriculumGate } from "../CurriculumGate"
import { getCurriculumStatus } from "@/services/curriculum/curriculum.service"
import { http, renderCurriculum } from "@/test/curriculumFixtures"

jest.mock("@/services/curriculum/curriculum.service")
const status = getCurriculumStatus as jest.MockedFunction<typeof getCurriculumStatus>

const renderGate = () =>
  renderCurriculum(
    <CurriculumGate>
      <p>curriculum content</p>
    </CurriculumGate>
  )

beforeEach(() => jest.resetAllMocks())

describe("CurriculumGate — never a blank page", () => {
  it("says 'Curriculum is not enabled' while the switch is off, and hides the content", async () => {
    status.mockResolvedValue({ enabled: false, tablesReady: true })
    renderGate()
    expect(await screen.findByText("Curriculum is not enabled")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent(/switch is off on this tier/)
    expect(screen.queryByText("curriculum content")).not.toBeInTheDocument()
  })

  it("says the tables are missing when the switch is on but the migration is not applied", async () => {
    status.mockResolvedValue({ enabled: true, tablesReady: false })
    renderGate()
    expect(await screen.findByText("Curriculum isn't set up on this tier yet")).toBeInTheDocument()
    expect(screen.queryByText("curriculum content")).not.toBeInTheDocument()
  })

  it("renders the content when on and set up", async () => {
    status.mockResolvedValue({ enabled: true, tablesReady: true })
    renderGate()
    expect(await screen.findByText("curriculum content")).toBeInTheDocument()
  })

  it("explains a 404 as the service not being on this tier", async () => {
    status.mockRejectedValue(http(404, "Not Found"))
    renderGate()
    expect(await screen.findByRole("alert")).toHaveTextContent("The curriculum service isn't available on this tier yet.")
  })

  it("renders the server's 403 text, and retries on request", async () => {
    status.mockRejectedValueOnce(http(403, "Role 'user' does not have permission for this action"))
    renderGate()
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Only a super-admin can manage curriculum.")
    expect(alert).toHaveTextContent("Role 'user' does not have permission")
    status.mockResolvedValueOnce({ enabled: true, tablesReady: true })
    await userEvent.click(screen.getByRole("button", { name: /try again/i }))
    expect(await screen.findByText("curriculum content")).toBeInTheDocument()
  })

  it("renders any other error's message", async () => {
    status.mockRejectedValue(http(500, "Internal Server Error"))
    renderGate()
    expect(await screen.findByRole("alert")).toHaveTextContent("Internal Server Error")
  })
})
