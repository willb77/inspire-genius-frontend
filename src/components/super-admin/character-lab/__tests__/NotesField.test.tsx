import { useState } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import NotesField from "../NotesField"
import { CHARACTER_LIMITS, notesLength, notesOverLimit } from "../limits"

const toastMock = { success: jest.fn(), error: jest.fn(), warning: jest.fn() }
jest.mock("sonner", () => ({
  toast: {
    success: (...a: unknown[]) => toastMock.success(...a),
    error: (...a: unknown[]) => toastMock.error(...a),
    warning: (...a: unknown[]) => toastMock.warning(...a),
  },
}))

const extractMock = jest.fn()
jest.mock("@/lib/extractRoleText", () => ({
  ACCEPTED_ROLE_FILE_TYPES: ".txt,.text,.md,.markdown,.pdf,.doc,.docx",
  MAX_EXTRACTED_CHARS: 8000,
  extractRoleText: (...a: unknown[]) => extractMock(...a),
}))

/** The field is controlled; a tiny host keeps its value like the page does. */
function Host({ initial = "" }: { initial?: string }) {
  const [v, setV] = useState(initial)
  return (
    <>
      <NotesField value={v} onChange={setV} />
      <output data-testid="value">{v}</output>
    </>
  )
}

const counterTop = () => screen.getByTestId("notes-counter-top")
const counterBottom = () => screen.getByTestId("notes-counter-bottom")

beforeEach(() => {
  extractMock.mockReset()
  Object.values(toastMock).forEach((m) => m.mockReset())
})

describe("limits", () => {
  it("match the server's CharacterRequest (name 120, source 200, notes 4000)", () => {
    expect(CHARACTER_LIMITS).toEqual({ name: 120, source: 200, notes: 4000 })
  })

  it("measure notes the way they are sent: trimmed", () => {
    expect(notesLength("  abc \n")).toBe(3)
    expect(notesOverLimit("x".repeat(4000))).toBe(false)
    expect(notesOverLimit("x".repeat(4001))).toBe(true)
    expect(notesOverLimit(` ${"x".repeat(4000)}  `)).toBe(false)
  })
})

describe("counters", () => {
  it("show the count above AND below the box", () => {
    render(<Host initial="hello" />)
    expect(counterTop()).toHaveTextContent("5 / 4,000 characters")
    expect(counterBottom()).toHaveTextContent("5 / 4,000 characters")
  })

  it("update as the operator types", () => {
    render(<Host />)
    fireEvent.change(screen.getByLabelText("Notes (optional)"), { target: { value: "abcdef" } })
    expect(counterTop()).toHaveTextContent("6 / 4,000")
    expect(counterBottom()).toHaveTextContent("6 / 4,000")
  })

  it("turn red and say how far over, with no trim offered until then", () => {
    render(<Host initial={"x".repeat(4000)} />)
    expect(counterBottom()).not.toHaveTextContent("over the limit")
    expect(screen.queryByRole("button", { name: /keep the first/i })).toBeNull()
    fireEvent.change(screen.getByLabelText("Notes (optional)"), {
      target: { value: "x".repeat(4250) },
    })
    expect(counterTop()).toHaveTextContent("4,250 / 4,000 characters — 250 over the limit")
    expect(counterBottom()).toHaveTextContent("250 over the limit")
    expect(counterBottom().className).toMatch(/text-destructive/)
  })

  it("never silently cuts a long paste — the box keeps all of it", () => {
    render(<Host />)
    // jsdom ignores maxLength on a programmatic change, so assert the attribute
    // itself: a browser WOULD cut a paste at it, with no message.
    expect(screen.getByLabelText("Notes (optional)")).not.toHaveAttribute("maxLength")
    fireEvent.change(screen.getByLabelText("Notes (optional)"), {
      target: { value: "y".repeat(5000) },
    })
    expect(screen.getByTestId("value").textContent).toHaveLength(5000)
  })

  it("trims to exactly the limit only when asked", () => {
    render(<Host initial={"z".repeat(4600)} />)
    fireEvent.click(screen.getByRole("button", { name: /keep the first 4,000 characters/i }))
    expect(screen.getByTestId("value").textContent).toHaveLength(4000)
    expect(counterBottom()).toHaveTextContent("4,000 / 4,000 characters")
    expect(screen.queryByRole("button", { name: /keep the first/i })).toBeNull()
  })
})

describe("document upload", () => {
  const file = new File(["ignored"], "brief.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  })

  it("accepts the document types the extractor reads", () => {
    render(<Host />)
    expect(screen.getByTestId("notes-file-input")).toHaveAttribute(
      "accept",
      ".txt,.text,.md,.markdown,.pdf,.doc,.docx",
    )
  })

  it("puts the document's text into empty notes", async () => {
    extractMock.mockResolvedValue({ text: "From the document.", suggestedTitle: "brief" })
    render(<Host />)
    fireEvent.change(screen.getByTestId("notes-file-input"), { target: { files: [file] } })
    await waitFor(() =>
      expect(screen.getByTestId("value")).toHaveTextContent("From the document."),
    )
    expect(extractMock).toHaveBeenCalledWith(file)
    expect(toastMock.success).toHaveBeenCalledWith("Added 18 characters from brief.docx")
  })

  it("adds to existing notes instead of replacing them", async () => {
    extractMock.mockResolvedValue({ text: "Second part.", suggestedTitle: "brief" })
    render(<Host initial="First part." />)
    fireEvent.change(screen.getByTestId("notes-file-input"), { target: { files: [file] } })
    await waitFor(() =>
      expect(screen.getByTestId("value").textContent).toBe("First part.\n\nSecond part."),
    )
  })

  it("warns when the document was longer than the extractor reads", async () => {
    extractMock.mockResolvedValue({ text: "q".repeat(8000), suggestedTitle: "brief" })
    render(<Host />)
    fireEvent.change(screen.getByTestId("notes-file-input"), { target: { files: [file] } })
    await waitFor(() =>
      expect(toastMock.warning).toHaveBeenCalledWith(
        "Only the first 8,000 characters of brief.docx were read.",
      ),
    )
    // …and the over-limit state follows from the counters, not a silent cut.
    expect(counterBottom()).toHaveTextContent("4,000 over the limit")
  })

  it("says so when a file cannot be read, and leaves the notes alone", async () => {
    extractMock.mockRejectedValue(new Error("No readable text found in that file."))
    render(<Host initial="keep me" />)
    fireEvent.change(screen.getByTestId("notes-file-input"), { target: { files: [file] } })
    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith("No readable text found in that file."),
    )
    expect(screen.getByTestId("value").textContent).toBe("keep me")
  })
})
