/**
 * @jest-environment jsdom
 *
 * CX-6 — the counselor's view of a student's career exercise. With the
 * `career_exercise` switch off (or its read failing) nothing is asked. On: a
 * refusal is an alert, never "has not started"; the student's words are shown
 * read-only with notes beside them; a note sends only the stage and the text;
 * a confirmation sends the version on screen.
 */
import fs from "fs"
import path from "path"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const mockEnabled = jest.fn()
const mockSessions = jest.fn()
const mockNote = jest.fn()
const mockConfirm = jest.fn()
jest.mock("@/services/career-exercise/counselor.service", () => ({
  getCareerExerciseEnabled: () => mockEnabled(),
  getStudentSessions: (s: unknown) => mockSessions(s),
  addStudentNote: (s: unknown, id: unknown, b: unknown) => mockNote(s, id, b),
  confirmStudentPaths: (s: unknown, id: unknown, v: unknown) => mockConfirm(s, id, v),
}))
jest.mock("@/layouts/PractitionerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="practitioner-layout">{children}</div>,
}))
jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="manager-layout">{children}</div>,
}))

import { CounselorExerciseView } from "@/pages/practitioner/career-exercise/CounselorExerciseView"
import PractitionerPage from "@/pages/practitioner/career-exercise/StudentCareerExercisePage"
import ManagerPage from "@/pages/manager/career-exercise/StudentCareerExercisePage"
import { counselorErrorMessage } from "@/pages/practitioner/career-exercise/counselorErrors"
import type { ExerciseSession } from "@/types/career-exercise/counselor"

const STUDENT = "00000000-0000-0000-0000-0000000000a1"

function renderWith(ui: React.ReactElement, at = "/") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[at]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

function session(over: Partial<ExerciseSession> = {}): ExerciseSession {
  return {
    session_id: "s1",
    student_id: STUDENT,
    tenant_id: null,
    stage: "commit",
    status: "active",
    version: 9,
    updated_at: "2026-11-10T12:00:00+00:00",
    self_portrait: "I work best when I can fix things with my hands",
    profile_reactions: ["Agrees on detail"],
    pillars: { interests: ["robots"], context: ["no car"] },
    roles: [
      {
        onet_soc: "29-2061.00",
        title: "Licensed Practical Nurse",
        cluster: "Health",
        typical_education: "Postsecondary certificate",
        wage_p25: 48000,
        wage_median: 54000,
        wage_p75: 60000,
        wage_area: "NC",
        bucket: "curious",
        reason: "likes helping",
      },
    ],
    posting_reaction: { look_forward: ["patient care"], dread: ["night shifts"] },
    experiments: [{ onet_soc: "29-2061.00", kind: "shadow", target_date: null, bridge_match_id: null }],
    paths: { primary: "Licensed Practical Nurse", backup: "Medical Assistant" },
    annotations: [],
    paths_confirmation: null,
    ...over,
  }
}

const err = (status: number, detail: unknown) => ({ response: { status, data: { detail } } })

beforeEach(() => {
  jest.clearAllMocks()
  mockEnabled.mockResolvedValue(true)
  mockSessions.mockResolvedValue({ studentId: STUDENT, sessions: [session()] })
})

describe("switch OFF", () => {
  test("says so and reads no student", async () => {
    mockEnabled.mockResolvedValue(false)
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    expect(await screen.findByText(/not switched on/i)).toBeInTheDocument()
    expect(mockSessions).not.toHaveBeenCalled()
  })

  test("a failed status read is off", async () => {
    mockEnabled.mockRejectedValue(new Error("boom"))
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    expect(await screen.findByText(/not switched on/i)).toBeInTheDocument()
    expect(mockSessions).not.toHaveBeenCalled()
  })
})

describe("refusals and failures are said, never shown as 'not started'", () => {
  test("a 403 is an alert carrying the server's sentence", async () => {
    mockSessions.mockRejectedValue(err(403, "You cannot see this person's sessions"))
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("You cannot see this person's sessions")
    expect(alert).toHaveTextContent(/shared their development/i)
    expect(screen.queryByText(/has not started/i)).not.toBeInTheDocument()
  })

  test("a 500 is an alert", async () => {
    mockSessions.mockRejectedValue(err(500, undefined))
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't load/i)
    expect(screen.queryByText(/has not started/i)).not.toBeInTheDocument()
  })

  test("no student id is an alert and reads nothing", async () => {
    renderWith(<CounselorExerciseView studentId={undefined} />)
    expect(await screen.findByRole("alert")).toHaveTextContent(/no student/i)
    expect(mockSessions).not.toHaveBeenCalled()
  })

  test("an empty list, and only an empty list, says not started", async () => {
    mockSessions.mockResolvedValue({ studentId: STUDENT, sessions: [] })
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    expect(await screen.findByText(/has not started/i)).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})

describe("the student's words, step by step", () => {
  test("every reached step shows the student's own answers; unreached steps are absent", async () => {
    mockSessions.mockResolvedValue({ studentId: STUDENT, sessions: [session({ stage: "explore" })] })
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    expect(await screen.findByText("I work best when I can fix things with my hands")).toBeInTheDocument()
    expect(screen.getByText("robots")).toBeInTheDocument()
    expect(screen.getByText(/median \$54,000 \(NC\)/)).toBeInTheDocument()
    expect(screen.getByText(/patient care/)).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Careers explored" })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Sorting the roles" })).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Primary and Backup Paths" })).not.toBeInTheDocument()
    // Read-only: no field holds the student's words.
    for (const box of screen.getAllByRole("textbox")) {
      expect((box as HTMLTextAreaElement).value).toBe("")
    }
  })

  test("buckets, experiments and paths render at their steps", async () => {
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    const sorting = (await screen.findByRole("heading", { name: "Sorting the roles" })).closest("section")!
    expect(within(sorting).getByText(/Curious: likes helping/)).toBeInTheDocument()
    const test = screen.getByRole("heading", { name: "Real-world experiments" }).closest("section")!
    expect(within(test).getByText(/shadow — Licensed Practical Nurse/)).toBeInTheDocument()
    const commit = screen.getByRole("heading", { name: "Primary and Backup Paths" }).closest("section")!
    expect(within(commit).getByText("Medical Assistant")).toBeInTheDocument()
  })

  test("a step with nothing recorded says so", async () => {
    mockSessions.mockResolvedValue({
      studentId: STUDENT,
      sessions: [session({ stage: "discover", self_portrait: null, profile_reactions: [] })],
    })
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    expect(await screen.findByText(/nothing recorded for this step yet/i)).toBeInTheDocument()
  })

  test("notes sit under their own step, labelled as notes", async () => {
    mockSessions.mockResolvedValue({
      studentId: STUDENT,
      sessions: [
        session({
          annotations: [
            { id: "n1", kind: "note", stage: "discover", text: "Ask about the robotics club", by: "c", by_role: "manager", at: "2026-11-10T00:00:00+00:00", session_version: 2 },
            { id: "c1", kind: "confirm_paths", paths: { primary: "a", backup: "b" }, by: "c", by_role: "manager", at: "2026-11-10T00:00:00+00:00", session_version: 9 },
          ],
        }),
      ],
    })
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    const discover = (await screen.findByRole("heading", { name: "How I work best" })).closest("section")!
    const notes = within(discover).getByRole("list", { name: "Counselor notes" })
    expect(within(notes).getByText("Ask about the robotics club")).toBeInTheDocument()
    expect(within(notes).getByText(/Counselor \(manager\)/)).toBeInTheDocument()
    // The confirmation entry is not rendered as a note.
    expect(screen.getAllByRole("list", { name: "Counselor notes" })).toHaveLength(1)
  })

  test("several sessions: the newest is shown and another can be picked", async () => {
    mockSessions.mockResolvedValue({
      studentId: STUDENT,
      sessions: [
        session({ session_id: "new", stage: "discover", self_portrait: "Newest words" }),
        session({ session_id: "old", status: "closed", stage: "discover", self_portrait: "Older words" }),
      ],
    })
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    expect(await screen.findByText("Newest words")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /finished/i }))
    expect(await screen.findByText("Older words")).toBeInTheDocument()
    expect(screen.queryByText("Newest words")).not.toBeInTheDocument()
  })
})

describe("adding a note", () => {
  test("sends only the step and the trimmed text, then clears", async () => {
    mockNote.mockResolvedValue({ studentId: STUDENT, session: session() })
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    const discover = (await screen.findByRole("heading", { name: "How I work best" })).closest("section")!
    const box = within(discover).getByRole("textbox")
    fireEvent.change(box, { target: { value: "  Ask about robotics  " } })
    fireEvent.click(within(discover).getByRole("button", { name: /add note/i }))
    await waitFor(() =>
      expect(mockNote).toHaveBeenCalledWith(STUDENT, "s1", { stage: "discover", text: "Ask about robotics" }),
    )
    await waitFor(() => expect((box as HTMLTextAreaElement).value).toBe(""))
  })

  test("a blank note is stopped before the server", async () => {
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    const discover = (await screen.findByRole("heading", { name: "How I work best" })).closest("section")!
    fireEvent.change(within(discover).getByRole("textbox"), { target: { value: "   " } })
    fireEvent.click(within(discover).getByRole("button", { name: /add note/i }))
    expect(await within(discover).findByText(/write a note first/i)).toBeInTheDocument()
    expect(mockNote).not.toHaveBeenCalled()
  })

  test("a refused note is an alert", async () => {
    mockNote.mockRejectedValue(err(403, "Only a counselor the student shares with can add notes"))
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    const discover = (await screen.findByRole("heading", { name: "How I work best" })).closest("section")!
    fireEvent.change(within(discover).getByRole("textbox"), { target: { value: "hello" } })
    fireEvent.click(within(discover).getByRole("button", { name: /add note/i }))
    expect(await within(discover).findByRole("alert")).toHaveTextContent(/only a counselor/i)
  })
})

describe("confirming the Primary and Backup Paths", () => {
  test("sends the version on screen", async () => {
    mockConfirm.mockResolvedValue({ studentId: STUDENT, session: session() })
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    fireEvent.click(await screen.findByRole("button", { name: /confirm primary and backup paths/i }))
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith(STUDENT, "s1", 9))
  })

  test("a current confirmation says who and when, and offers no second confirm", async () => {
    mockSessions.mockResolvedValue({
      studentId: STUDENT,
      sessions: [
        session({
          paths_confirmation: { by: "c", by_role: "practitioner", at: "2026-11-10T00:00:00+00:00", paths: { primary: "Licensed Practical Nurse", backup: "Medical Assistant" }, current: true },
        }),
      ],
    })
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    expect(await screen.findByText(/confirmed by counselor \(practitioner\)/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /confirm primary and backup paths/i })).not.toBeInTheDocument()
  })

  test("paths changed since the confirmation are flagged and can be confirmed again", async () => {
    mockSessions.mockResolvedValue({
      studentId: STUDENT,
      sessions: [
        session({
          paths_confirmation: { by: "c", by_role: "manager", at: "2026-11-10T00:00:00+00:00", paths: { primary: "x", backup: "y" }, current: false },
        }),
      ],
    })
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    expect(await screen.findByText(/changed their paths after they were confirmed/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /confirm primary and backup paths/i })).toBeInTheDocument()
  })

  test("a version conflict is said in plain words and the list is read again", async () => {
    mockConfirm.mockRejectedValue(err(409, { code: "version_conflict", currentVersion: 10, message: "x" }))
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    fireEvent.click(await screen.findByRole("button", { name: /confirm primary and backup paths/i }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/moved on since you opened it/i)
    await waitFor(() => expect(mockSessions).toHaveBeenCalledTimes(2))
  })

  test("no paths, no confirm button", async () => {
    mockSessions.mockResolvedValue({ studentId: STUDENT, sessions: [session({ paths: null })] })
    renderWith(<CounselorExerciseView studentId={STUDENT} />)
    await screen.findByRole("heading", { name: "Primary and Backup Paths" })
    expect(screen.queryByRole("button", { name: /confirm primary/i })).not.toBeInTheDocument()
  })
})

describe("error copy", () => {
  test("each 409 code has its sentence; otherwise the server's, then the fallback", () => {
    expect(counselorErrorMessage(err(409, { code: "no_paths" }), "f")).toMatch(/not chosen/i)
    expect(counselorErrorMessage(err(409, { code: "stage_not_reached" }), "f")).toMatch(/not reached/i)
    expect(counselorErrorMessage(err(409, { code: "too_many_annotations" }), "f")).toMatch(/limit/i)
    expect(counselorErrorMessage(err(409, { code: "other", message: "server says" }), "f")).toBe("server says")
    expect(counselorErrorMessage(err(403, undefined), "f")).toMatch(/cannot see/i)
    expect(counselorErrorMessage(err(422, [{ msg: "bad" }]), "f")).toBe("f")
    expect(counselorErrorMessage(undefined, "f")).toBe("f")
  })
})

describe("the two pages", () => {
  test.each([
    ["practitioner", "/practitioner/career-exercise/:studentId", PractitionerPage, "practitioner-layout"],
    ["manager", "/manager/career-exercise/:studentId", ManagerPage, "manager-layout"],
  ])("%s page reads the student named in the URL", async (_role, pattern, Page, layout) => {
    renderWith(
      <Routes>
        <Route path={pattern} element={<Page />} />
      </Routes>,
      pattern.replace(":studentId", STUDENT),
    )
    expect(await screen.findByTestId(layout)).toBeInTheDocument()
    await waitFor(() => expect(mockSessions).toHaveBeenCalledWith(STUDENT))
  })

  test("the routes are spelled as the ROUTES constants in routes.tsx", () => {
    const src = path.resolve(__dirname, "../../../..")
    const routes = fs.readFileSync(path.join(src, "routes.tsx"), "utf-8")
    const constants = fs.readFileSync(path.join(src, "constants/routes.ts"), "utf-8")
    for (const p of ["/practitioner/career-exercise/:studentId", "/manager/career-exercise/:studentId"]) {
      expect(constants).toContain(`CAREER_EXERCISE_STUDENT: "${p}"`)
      expect(routes).toContain(`{ path: "${p}"`)
    }
  })
})
