import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CourseEditor } from "../CourseEditor"
import { deleteCourse, upsertCourse } from "@/services/curriculum/curriculum.service"
import { COURSES, CYCLE_REPORT, http, renderCurriculum } from "@/test/curriculumFixtures"

jest.mock("@/services/curriculum/curriculum.service")
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
const save = upsertCourse as jest.MockedFunction<typeof upsertCourse>
const remove = deleteCourse as jest.MockedFunction<typeof deleteCourse>

beforeEach(() => jest.resetAllMocks())

describe("CourseEditor", () => {
  it("lists courses with their prerequisites", () => {
    renderCurriculum(<CourseEditor catalogId="cat-1" courses={COURSES} editable />)
    const row = screen.getByRole("row", { name: /MAT 122/ })
    expect(within(row).getByText("MAT 121 (min C)")).toBeInTheDocument()
  })

  it("picks prerequisites from the catalog only (never the course itself) and saves", async () => {
    save.mockResolvedValue({ ...COURSES[1] })
    renderCurriculum(<CourseEditor catalogId="cat-1" courses={COURSES} editable />)
    await userEvent.click(screen.getByRole("button", { name: "Edit MAT 122" }))
    const pick = screen.getByLabelText("Course", { selector: "select" })
    const options = within(pick)
      .getAllByRole("option")
      .map((o) => o.getAttribute("value"))
    expect(options).toEqual(["", "MAT 121"])
    await userEvent.click(screen.getByRole("button", { name: "Save course" }))
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith("cat-1", {
        code: "MAT 122",
        title: "Algebra II",
        credits: 3,
        description: null,
        termsOffered: [],
        prerequisites: [{ code: "MAT 121", kind: "prereq", altGroup: 1, minGrade: "C" }],
      })
    )
  })

  it("shows the server's named chain when a prerequisite would make a loop (409)", async () => {
    save.mockRejectedValue(
      http(409, {
        message: "That would make a requirement loop that can never be satisfied: MAT 121 → MAT 122 → MAT 121",
        report: { ...CYCLE_REPORT, cycles: [["MAT 121", "MAT 122", "MAT 121"]] },
      })
    )
    renderCurriculum(<CourseEditor catalogId="cat-1" courses={COURSES} editable />)
    await userEvent.click(screen.getByRole("button", { name: "Edit MAT 121" }))
    await userEvent.click(screen.getByRole("button", { name: "Add prerequisite" }))
    await userEvent.selectOptions(screen.getByLabelText("Course", { selector: "select" }), "MAT 122")
    await userEvent.click(screen.getByRole("button", { name: "Save course" }))
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("MAT 121 → MAT 122 → MAT 121")
    expect(within(alert).getByRole("region", { name: "Server report" })).toBeInTheDocument()
    // The form stays open with the error so the admin can fix it.
    expect(screen.getByRole("form", { name: "Course form" })).toBeInTheDocument()
  })

  it("validates before sending", async () => {
    renderCurriculum(<CourseEditor catalogId="cat-1" courses={COURSES} editable />)
    await userEvent.click(screen.getByRole("button", { name: "Add course" }))
    await userEvent.type(screen.getByLabelText("Credits"), "x")
    await userEvent.click(screen.getByRole("button", { name: "Add course" }))
    expect(await screen.findByText("Course code is required")).toBeInTheDocument()
    expect(screen.getByText("Title is required")).toBeInTheDocument()
    expect(screen.getByText("Credits must be a number of 0 or more")).toBeInTheDocument()
    expect(save).not.toHaveBeenCalled()
  })

  it("adds a new course with terms and closes on success", async () => {
    save.mockResolvedValue({ ...COURSES[0], code: "ENG 111" })
    renderCurriculum(<CourseEditor catalogId="cat-1" courses={COURSES} editable />)
    await userEvent.click(screen.getByRole("button", { name: "Add course" }))
    await userEvent.type(screen.getByLabelText("Course code"), "ENG 111")
    await userEvent.type(screen.getByLabelText("Title"), "Writing I")
    await userEvent.type(screen.getByLabelText("Credits"), "3")
    await userEvent.click(screen.getByLabelText("spring"))
    await userEvent.click(screen.getByRole("button", { name: "Add prerequisite" }))
    await userEvent.click(screen.getByRole("button", { name: "Remove prerequisite 1" }))
    await userEvent.click(screen.getByRole("button", { name: "Add course" }))
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith("cat-1", expect.objectContaining({ code: "ENG 111", termsOffered: ["spring"] }))
    )
    await waitFor(() => expect(screen.queryByRole("form", { name: "Course form" })).not.toBeInTheDocument())
  })

  it("shows what still requires a course when removing it is refused", async () => {
    remove.mockRejectedValue(
      http(409, { message: "MAT 121 is still required by: course MAT 122", referencedBy: ["course MAT 122"] })
    )
    renderCurriculum(<CourseEditor catalogId="cat-1" courses={COURSES} editable />)
    await userEvent.click(screen.getByRole("button", { name: "Remove MAT 121" }))
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("MAT 121 is still required by: course MAT 122")
    expect(within(alert).getByRole("listitem")).toHaveTextContent("course MAT 122")
  })

  it("is read-only when not editable", () => {
    renderCurriculum(<CourseEditor catalogId="cat-1" courses={COURSES} editable={false} />)
    expect(screen.queryByRole("button", { name: "Add course" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument()
  })

  it("has an honest empty state", () => {
    renderCurriculum(<CourseEditor catalogId="cat-1" courses={[]} editable />)
    expect(screen.getByText(/No courses in this catalog yet/)).toBeInTheDocument()
  })
})
