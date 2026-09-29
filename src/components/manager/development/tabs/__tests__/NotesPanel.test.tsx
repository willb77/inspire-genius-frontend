/**
 * @jest-environment jsdom
 *
 * NotesPanel (TDS-2). What is pinned here is what the server enforces and the
 * surface therefore must not misrepresent:
 *
 *  1. the notes are ONE manager's — the panel says so and never implies the
 *     member or another coach reads them;
 *  2. a note is about a goal OR a milestone, never both — one picker, so the
 *     400 is unreachable rather than caught;
 *  3. a 400 over somebody else's ref is the SERVER's sentence, rendered
 *     verbatim, and a failed save keeps what was typed;
 *  4. a 404 is "no such note", never "you don't have permission" — saying the
 *     latter would confirm another manager's note exists;
 *  5. an edit sends only the fields it changed, because a null would clear one.
 */
const createMutateAsync = jest.fn()
const updateMutateAsync = jest.fn()
const deleteMutateAsync = jest.fn()
let notesState: {
  data: unknown[] | undefined
  isLoading: boolean
  isError: boolean
} = { data: [], isLoading: false, isError: false }

jest.mock("@/hooks/manager/development", () => ({
  useMemberNotes: () => notesState,
  useCreateCoachingNote: () => ({ mutateAsync: createMutateAsync, isPending: false }),
  useUpdateCoachingNote: () => ({ mutateAsync: updateMutateAsync, isPending: false }),
  useDeleteCoachingNote: () => ({ mutateAsync: deleteMutateAsync, isPending: false }),
}))

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import "@testing-library/jest-dom"
import { toast } from "sonner"

import { NotesPanel } from "../NotesPanel"

const goals = [{ goalId: "g-1", title: "Lead the Q3 launch" }]
const milestones = [{ milestoneId: "ms-1", title: "Run the handover review" }]

function renderPanel() {
  return render(
    <NotesPanel
      memberId="m-1"
      memberName="Dana Whitfield"
      goals={goals as never}
      milestones={milestones as never}
    />,
  )
}

function type(text: string) {
  fireEvent.change(screen.getByLabelText("Note body"), { target: { value: text } })
}

beforeEach(() => {
  jest.clearAllMocks()
  notesState = { data: [], isLoading: false, isError: false }
  createMutateAsync.mockResolvedValue({ id: "n-new" })
  updateMutateAsync.mockResolvedValue({ id: "n-1" })
  deleteMutateAsync.mockResolvedValue("n-1")
})

describe("NotesPanel — who can read these", () => {
  it("says only this manager sees them, and never implies the member does", () => {
    renderPanel()
    expect(screen.getByText(/Only you can see these notes/i)).toBeInTheDocument()
    expect(screen.getByText(/not shared with Dana Whitfield/i)).toBeInTheDocument()
    expect(screen.queryByText(/shared with the team/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/visible to/i)).not.toBeInTheDocument()
  })

  it("names the member in the empty state instead of showing a bare blank list", () => {
    renderPanel()
    expect(screen.getByText(/haven’t written any notes about Dana Whitfield yet/i)).toBeInTheDocument()
  })

  it("says the read failed rather than showing the same empty state as no notes", () => {
    notesState = { data: undefined, isLoading: false, isError: true }
    renderPanel()
    expect(screen.getByRole("alert")).toHaveTextContent(/Couldn’t load your notes/i)
    expect(screen.queryByText(/haven’t written any notes/i)).not.toBeInTheDocument()
  })
})

describe("NotesPanel — a goal or a milestone, never both", () => {
  it("sends goalId alone when the note is about a goal", async () => {
    renderPanel()
    type("She led the review well.")
    fireEvent.change(screen.getByLabelText("About"), { target: { value: "goal:g-1" } })
    fireEvent.click(screen.getByRole("button", { name: /save note/i }))
    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    const sent = createMutateAsync.mock.calls[0][0]
    expect(sent).toMatchObject({ kind: "observation", body: "She led the review well.", goalId: "g-1" })
    expect(sent).not.toHaveProperty("milestoneId")
  })

  it("sends milestoneId alone when the note is about a milestone", async () => {
    renderPanel()
    type("Slipping a week.")
    fireEvent.change(screen.getByLabelText("About"), { target: { value: "milestone:ms-1" } })
    fireEvent.click(screen.getByRole("button", { name: /save note/i }))
    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    const sent = createMutateAsync.mock.calls[0][0]
    expect(sent).toMatchObject({ milestoneId: "ms-1" })
    expect(sent).not.toHaveProperty("goalId")
  })

  it("sends neither when the note is about nothing in particular", async () => {
    renderPanel()
    type("General impression.")
    fireEvent.click(screen.getByRole("button", { name: /save note/i }))
    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    const sent = createMutateAsync.mock.calls[0][0]
    expect(sent).not.toHaveProperty("goalId")
    expect(sent).not.toHaveProperty("milestoneId")
  })

  it("carries the kind the manager picked", async () => {
    renderPanel()
    fireEvent.click(screen.getByRole("radio", { name: "Plan" }))
    type("Pair her with Ravi.")
    fireEvent.click(screen.getByRole("button", { name: /save note/i }))
    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1))
    expect(createMutateAsync.mock.calls[0][0]).toMatchObject({ kind: "plan" })
  })
})

describe("NotesPanel — a failed save says so, and keeps the text", () => {
  it("renders the server's own 400 sentence, not a paraphrase", async () => {
    const detail = "goalId is not a shared goal of this member"
    createMutateAsync.mockRejectedValue({ response: { data: { detail } } })
    renderPanel()
    type("About the wrong goal.")
    fireEvent.click(screen.getByRole("button", { name: /save note/i }))
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(detail))
    expect(toast.error).toHaveBeenCalledWith(detail)
    expect(toast.success).not.toHaveBeenCalled()
    // The note is gone from the server's point of view; it must not be gone
    // from the manager's screen as well.
    expect(screen.getByLabelText("Note body")).toHaveValue("About the wrong goal.")
  })

  it("renders a STRING for a 422 validation list, never the array of objects", async () => {
    createMutateAsync.mockRejectedValue({
      response: {
        data: { detail: [{ type: "string_type", loc: ["body", "kind"], msg: "Input should be a valid string" }] },
      },
    })
    renderPanel()
    type("x")
    fireEvent.click(screen.getByRole("button", { name: /save note/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    const arg = (toast.error as jest.Mock).mock.calls[0][0]
    expect(typeof arg).toBe("string")
    expect(arg).toMatch(/kind/)
  })

  it("clears the box only once the save succeeded", async () => {
    renderPanel()
    type("Recorded.")
    fireEvent.click(screen.getByRole("button", { name: /save note/i }))
    await waitFor(() => expect(screen.getByLabelText("Note body")).toHaveValue(""))
    expect(toast.success).toHaveBeenCalledWith("Note saved.")
  })
})

describe("NotesPanel — the list", () => {
  const notes = [
    {
      id: "n-2",
      memberId: "m-1",
      kind: "outcome" as const,
      body: "Handover landed.",
      milestoneId: "ms-1",
      createdAt: "2026-09-20T10:00:00Z",
    },
    {
      id: "n-1",
      memberId: "m-1",
      kind: "observation" as const,
      body: "Quiet in the standup.",
      goalId: "g-1",
      createdAt: "2026-09-02T10:00:00Z",
    },
  ]

  it("keeps the server's newest-first order rather than re-sorting it", () => {
    notesState = { data: notes, isLoading: false, isError: false }
    renderPanel()
    const bodies = screen.getAllByRole("listitem").map((li) => li.textContent)
    expect(bodies[0]).toContain("Handover landed.")
    expect(bodies[1]).toContain("Quiet in the standup.")
  })

  it("names the goal or milestone a note is about, by title", () => {
    notesState = { data: notes, isLoading: false, isError: false }
    renderPanel()
    // Scoped to the list: the composer's picker offers the same two titles as
    // <option>s, and matching those would pass without the list rendering them.
    const list = screen.getByRole("list", { name: /your notes about this member/i })
    expect(within(list).getByText("Milestone: Run the handover review")).toBeInTheDocument()
    expect(within(list).getByText("Goal: Lead the Q3 launch")).toBeInTheDocument()
  })

  it("an edit sends only kind and body, so the note's goal link is left alone", async () => {
    notesState = { data: [notes[1]], isLoading: false, isError: false }
    renderPanel()
    fireEvent.click(screen.getByRole("button", { name: /^edit$/i }))
    // The composer carries its own kind radios, so this must be scoped to the
    // edit form or it would drive the wrong control.
    const form = screen.getByRole("form", { name: /edit this note/i })
    fireEvent.click(within(form).getByRole("radio", { name: "Outcome" }))
    fireEvent.change(within(form).getByLabelText("Edit note body"), { target: { value: "Spoke up today." } })
    fireEvent.click(within(form).getByRole("button", { name: /save changes/i }))
    await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledTimes(1))
    expect(updateMutateAsync).toHaveBeenCalledWith({
      noteId: "n-1",
      input: { kind: "outcome", body: "Spoke up today." },
    })
    expect(updateMutateAsync.mock.calls[0][0].input).not.toHaveProperty("goalId")
  })

  it("asks before deleting, and deletes only the note that was confirmed", async () => {
    notesState = { data: notes, isLoading: false, isError: false }
    renderPanel()
    const first = screen.getAllByRole("listitem")[0]
    fireEvent.click(within(first).getByRole("button", { name: /^delete$/i }))
    expect(deleteMutateAsync).not.toHaveBeenCalled()
    expect(within(first).getByText(/Delete this note\?/i)).toBeInTheDocument()
    fireEvent.click(within(first).getByRole("button", { name: /delete note/i }))
    await waitFor(() => expect(deleteMutateAsync).toHaveBeenCalledWith("n-2"))
  })

  it("a 404 reads as 'no longer there', never as a permission message", async () => {
    notesState = { data: notes, isLoading: false, isError: false }
    deleteMutateAsync.mockRejectedValue({ response: { status: 404, data: {} } })
    renderPanel()
    const first = screen.getAllByRole("listitem")[0]
    fireEvent.click(within(first).getByRole("button", { name: /^delete$/i }))
    fireEvent.click(within(first).getByRole("button", { name: /delete note/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalled())
    const arg = (toast.error as jest.Mock).mock.calls[0][0] as string
    expect(arg).toMatch(/no longer there/i)
    expect(arg).not.toMatch(/permission/i)
    expect(toast.success).not.toHaveBeenCalled()
  })
})
