import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import ComparePanel from "../ComparePanel"
import type { ProfileSummary } from "@/types/character-lab"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))
jest.mock("@/components/prism/narrative/ProfileMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <div>{text}</div>,
}))

const wordMock = jest.fn()
const pdfMock = jest.fn()
jest.mock("@/lib/exportNarrative", () => ({
  ...(jest.requireActual("@/lib/exportNarrative") as object),
  exportNarrativeWord: (...a: unknown[]) => wordMock(...a),
  exportNarrativePdf: (...a: unknown[]) => pdfMock(...a),
}))

const compareMutate = jest.fn()
const questionsMutate = jest.fn()
const askMutate = jest.fn()
let profiles: ProfileSummary[] = []

jest.mock("@/hooks/super-admin/useCharacterLab", () => ({
  useSavedProfiles: () => ({ data: profiles, isLoading: false }),
  useCompareProfiles: () => ({ mutateAsync: compareMutate, isPending: false }),
  useStarterQuestions: () => ({ mutateAsync: questionsMutate, isPending: false }),
  useAskAboutProfiles: () => ({ mutateAsync: askMutate, isPending: false }),
}))

function profile(id: string, name: string): ProfileSummary {
  return {
    id,
    name,
    source: "",
    notes: "",
    scored: 88,
    has_analysis: false,
    created_at: null,
    updated_at: null,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  profiles = [profile("a", "Sonny"), profile("b", "Michael"), profile("c", "Tom"), profile("d", "Fredo"), profile("e", "Vito")]
})

function pick(...names: string[]) {
  for (const n of names) fireEvent.click(screen.getByLabelText(new RegExp(n)))
}

it("will not compare fewer than two characters", async () => {
  render(<ComparePanel />)
  pick("Sonny")
  // The button is disabled rather than firing a request that 400s.
  expect(screen.getByRole("button", { name: /Compare them/ })).toBeDisabled()
  await waitFor(() => expect(compareMutate).not.toHaveBeenCalled())
})

it("stops the operator selecting past the cap", () => {
  // Four is the server's limit. Letting a fifth be chosen and refusing
  // afterwards wastes the click and reads as a bug.
  render(<ComparePanel />)
  pick("Sonny", "Michael", "Tom", "Fredo")
  expect(screen.getByLabelText(/Vito/)).toBeDisabled()
  // The four already chosen stay clickable, or there would be no way back.
  expect(screen.getByLabelText(/Sonny/)).not.toBeDisabled()
})

it("fetches every comparison section and stitches them in order", async () => {
  compareMutate.mockImplementation(({ part }: { part: number }) =>
    Promise.resolve({ part, parts: 4, comparison: `section-${part}`, names: [], sections: [], notice: "" }),
  )
  render(<ComparePanel />)
  pick("Sonny", "Michael")
  fireEvent.click(screen.getByRole("button", { name: /Compare them/ }))

  await waitFor(() => expect(compareMutate).toHaveBeenCalledTimes(4))
  expect(await screen.findByText(/section-0[\s\S]*section-3/)).toBeInTheDocument()
  expect(compareMutate.mock.calls.map((c) => c[0].part)).toEqual([0, 1, 2, 3])
})

it("marks a failed section instead of silently shortening the comparison", async () => {
  // A missing "Friction and fit" reads as "there is no friction", which is the
  // opposite of "we could not generate it".
  compareMutate.mockImplementation(({ part }: { part: number }) =>
    part === 2
      ? Promise.reject(new Error("503"))
      : Promise.resolve({ part, parts: 4, comparison: `section-${part}`, names: [], sections: [], notice: "" }),
  )
  render(<ComparePanel />)
  pick("Sonny", "Michael")
  fireEvent.click(screen.getByRole("button", { name: /Compare them/ }))

  expect(await screen.findByText(/Section 3 of 4 could not be generated/)).toBeInTheDocument()
})

it("asks a starter question when it is clicked", async () => {
  // A list of questions with nothing to ask them of is a menu with no kitchen.
  questionsMutate.mockResolvedValue({
    notice: "",
    names: [],
    questions: [{ question: "Who de-escalates?", why: "Red 85 vs Blue 28" }],
  })
  askMutate.mockResolvedValue({ notice: "", question: "", names: [], answer: "Michael does." })

  render(<ComparePanel />)
  pick("Sonny", "Michael")
  fireEvent.click(screen.getByRole("button", { name: /Suggest questions/ }))

  const q = await screen.findByText("Who de-escalates?")
  fireEvent.click(q)

  await waitFor(() =>
    expect(askMutate).toHaveBeenCalledWith({
      profile_ids: ["a", "b"],
      question: "Who de-escalates?",
    }),
  )
  expect(await screen.findByText("Michael does.")).toBeInTheDocument()
})

it("shows the reason the question was worth asking, not just the question", () => {
  // Without the "why" the list is trivia; the scores are what make it a demo.
  questionsMutate.mockResolvedValue({
    notice: "",
    names: [],
    questions: [{ question: "Who de-escalates?", why: "Red 85 vs Blue 28" }],
  })
  render(<ComparePanel />)
  pick("Sonny", "Michael")
  fireEvent.click(screen.getByRole("button", { name: /Suggest questions/ }))
  return screen.findByText("Red 85 vs Blue 28")
})


// ─── Export ─────────────────────────────────────────────────────────────

describe("ComparePanel — narrative export", () => {
  beforeEach(() => {
    wordMock.mockReset().mockResolvedValue(undefined)
    pdfMock.mockReset().mockResolvedValue(undefined)
  })

  it("exports the stitched comparison, not just the first section", async () => {
    compareMutate.mockImplementation(({ part }: { part: number }) =>
      Promise.resolve({
        part, parts: 3, comparison: `section-${part}`,
        names: [], sections: [], notice: "SYNTHETIC NOTICE",
      }),
    )
    render(<ComparePanel />)
    pick("Sonny", "Michael")
    fireEvent.click(screen.getByRole("button", { name: /Compare them/ }))
    await screen.findByText(/section-0[\s\S]*section-2/)

    fireEvent.click(screen.getByRole("button", { name: /^PDF$/ }))
    await waitFor(() => expect(pdfMock).toHaveBeenCalled())

    const doc = pdfMock.mock.calls[0][0]
    expect(doc.title).toBe("Sonny vs Michael")
    expect(doc.notice).toBe("SYNTHETIC NOTICE")
    expect(doc.sections[0].body).toContain("section-0")
    expect(doc.sections[0].body).toContain("section-2")
  })

  it("captions an answer with the question AS ASKED, not the box contents", async () => {
    // Clicking a second starter question changes the input. A doc built at
    // render time would caption the first answer with the second question.
    questionsMutate.mockResolvedValue({
      notice: "N", names: [],
      questions: [
        { question: "Who de-escalates?", why: "a" },
        { question: "Who escalates?", why: "b" },
      ],
    })
    askMutate.mockResolvedValue({ notice: "N", question: "", names: [], answer: "Michael does." })

    render(<ComparePanel />)
    pick("Sonny", "Michael")
    fireEvent.click(screen.getByRole("button", { name: /Suggest questions/ }))
    fireEvent.click(await screen.findByText("Who de-escalates?"))
    await screen.findByText("Michael does.")

    // THE DISCRIMINATOR: the operator now types a different question but has
    // NOT asked it. Without this the input and the asked question hold the same
    // string, and the test passes whichever one the export reads — which is
    // exactly how the first version of this test failed to catch anything.
    fireEvent.change(screen.getByLabelText(/Your question/i), {
      target: { value: "Something else entirely" },
    })

    fireEvent.click(screen.getAllByRole("button", { name: /^Word$/ })[0])
    await waitFor(() => expect(wordMock).toHaveBeenCalled())

    const doc = wordMock.mock.calls[0][0]
    expect(doc.meta.find((m: { label: string }) => m.label === "Question").value).toBe(
      "Who de-escalates?",
    )
    expect(doc.sections[0].body).toBe("Michael does.")
  })

  it("offers no export before a comparison exists", () => {
    render(<ComparePanel />)
    pick("Sonny", "Michael")
    expect(screen.queryByRole("button", { name: /^PDF$/ })).not.toBeInTheDocument()
  })
})
