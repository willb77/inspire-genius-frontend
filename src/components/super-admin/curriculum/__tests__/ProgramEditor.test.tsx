import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProgramEditor } from "../ProgramEditor"
import { deleteProgram, getProgramOutcomes, upsertProgram } from "@/services/curriculum/curriculum.service"
import { COURSES, CYCLE_REPORT, http, PROGRAMS, programOutcomes, renderCurriculum } from "@/test/curriculumFixtures"

jest.mock("@/services/curriculum/curriculum.service")
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
const save = upsertProgram as jest.MockedFunction<typeof upsertProgram>
const remove = deleteProgram as jest.MockedFunction<typeof deleteProgram>
const m = <T extends (...a: never[]) => unknown>(f: T) => f as unknown as jest.MockedFunction<T>

beforeEach(() => jest.resetAllMocks())

describe("ProgramEditor", () => {
  it("lists programs with their requirement groups", () => {
    renderCurriculum(<ProgramEditor catalogId="cat-1" programs={PROGRAMS} courses={COURSES} editable />)
    expect(screen.getByText("Core: all of — MAT 122")).toBeInTheDocument()
  })

  it("edits a program's groups with courses picked from the catalog and saves", async () => {
    save.mockResolvedValue(PROGRAMS[0])
    renderCurriculum(<ProgramEditor catalogId="cat-1" programs={PROGRAMS} courses={COURSES} editable />)
    await userEvent.click(screen.getByRole("button", { name: "Edit P1" }))
    await userEvent.click(screen.getByRole("button", { name: "Add requirement group" }))
    await userEvent.type(screen.getByLabelText("Group name", { selector: "#group-name-1" }), "Pick one")
    await userEvent.selectOptions(screen.getByLabelText("Rule", { selector: "#group-rule-1" }), "choose_n")
    await userEvent.type(screen.getByLabelText("n", { selector: "#group-n-1" }), "1")
    const groups = screen.getAllByRole("group", { name: "Courses in this group" })
    await userEvent.click(within(groups[1]).getByLabelText(/MAT 121/))
    await userEvent.click(screen.getByRole("button", { name: "Save program" }))
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith("cat-1", {
        code: "P1",
        title: "Example Program",
        credential: "AAS",
        totalCredits: 6,
        cipCode: null,
        description: null,
        requirements: [
          { groupName: "Core", rule: "required", n: null, minCredits: null, courses: ["MAT 122"] },
          { groupName: "Pick one", rule: "choose_n", n: 1, minCredits: null, courses: ["MAT 121"] },
        ],
      })
    )
  })

  it("refuses an impossible 'choose n' in the form", async () => {
    renderCurriculum(<ProgramEditor catalogId="cat-1" programs={PROGRAMS} courses={COURSES} editable />)
    await userEvent.click(screen.getByRole("button", { name: "Edit P1" }))
    await userEvent.selectOptions(screen.getByLabelText("Rule", { selector: "#group-rule-0" }), "choose_n")
    await userEvent.type(screen.getByLabelText("n", { selector: "#group-n-0" }), "2")
    await userEvent.click(screen.getByRole("button", { name: "Save program" }))
    expect(await screen.findByText("Choose 2 from 1 listed course(s) is impossible")).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it("renders the server's unknown-code refusal with its report", async () => {
    save.mockRejectedValue(
      http(422, { message: "These course codes are not in this catalog: XYZ 999", report: CYCLE_REPORT })
    )
    renderCurriculum(<ProgramEditor catalogId="cat-1" programs={PROGRAMS} courses={COURSES} editable />)
    await userEvent.click(screen.getByRole("button", { name: "Add program" }))
    await userEvent.type(screen.getByLabelText("Program code"), "P2")
    await userEvent.type(screen.getByLabelText("Title"), "Other")
    await userEvent.type(screen.getByLabelText("Total credits"), "60")
    await userEvent.click(screen.getByRole("button", { name: "Add program" }))
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("These course codes are not in this catalog: XYZ 999")
    expect(within(alert).getByText(/XYZ 999 — needed by/)).toBeInTheDocument()
  })

  it("points the program form at the Outcomes button instead of editing outcomes inside it (CUR-3)", async () => {
    renderCurriculum(<ProgramEditor catalogId="cat-1" programs={PROGRAMS} courses={COURSES} editable />)
    await userEvent.click(screen.getByRole("button", { name: "Add program" }))
    expect(screen.getByText(/set per program with the\s+Outcomes button.*once the program is saved/)).toBeInTheDocument()
    const form = screen.getByRole("form", { name: "Program form" })
    expect(within(form).queryByLabelText(/role family|blueprint|SOC/i)).not.toBeInTheDocument()
  })

  it("opens a program's outcomes from the list, on a published catalog too", async () => {
    m(getProgramOutcomes).mockResolvedValue(programOutcomes("published"))
    renderCurriculum(<ProgramEditor catalogId="cat-1" programs={PROGRAMS} courses={COURSES} editable={false} />)
    await userEvent.click(screen.getByRole("button", { name: "Outcomes for P1" }))
    const panel = await screen.findByRole("region", { name: "Outcomes of P1" })
    expect(await within(panel).findByText("Example Analyst")).toBeInTheDocument()
    expect(getProgramOutcomes).toHaveBeenCalledWith("prog-1")
    expect(within(panel).queryByRole("button", { name: "Edit outcomes" })).not.toBeInTheDocument()
    await userEvent.click(within(panel).getByRole("button", { name: "Close outcomes" }))
    expect(screen.queryByRole("region", { name: "Outcomes of P1" })).not.toBeInTheDocument()
  })

  it("renders a refused delete, and is read-only when not editable", async () => {
    remove.mockRejectedValue(http(409, "This catalog is published, and published catalogs are never edited."))
    const { unmount } = renderCurriculum(
      <ProgramEditor catalogId="cat-1" programs={PROGRAMS} courses={COURSES} editable />
    )
    await userEvent.click(screen.getByRole("button", { name: "Remove P1" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("published catalogs are never edited")
    unmount()
    renderCurriculum(<ProgramEditor catalogId="cat-1" programs={[]} courses={COURSES} editable={false} />)
    expect(screen.queryByRole("button", { name: "Add program" })).not.toBeInTheDocument()
    expect(screen.getByText(/No programs in this catalog yet\./)).toBeInTheDocument()
  })
})
