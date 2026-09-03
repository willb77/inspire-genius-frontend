import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import ScenarioPanel from "../ScenarioPanel"
import type { ProfileSummary, SavedScenario } from "@/types/character-lab"

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

const runMutate = jest.fn()
const saveMutate = jest.fn()
const deleteMutate = jest.fn()
let profiles: ProfileSummary[] = []
let scenarios: SavedScenario[] = []

jest.mock("@/hooks/super-admin/useCharacterLab", () => ({
  useSavedProfiles: () => ({ data: profiles, isLoading: false }),
  useSavedScenarios: () => ({ data: scenarios, isLoading: false }),
  useRunScenario: () => ({ mutateAsync: runMutate, isPending: false }),
  useSaveScenario: () => ({ mutateAsync: saveMutate, isPending: false }),
  useDeleteScenario: () => ({ mutateAsync: deleteMutate, isPending: false }),
}))

function profile(id: string, name: string): ProfileSummary {
  return { id, name, source: "", notes: "", scored: 88, has_analysis: false, created_at: null, updated_at: null }
}

beforeEach(() => {
  jest.clearAllMocks()
  profiles = [profile("a", "Sonny"), profile("b", "Michael")]
  scenarios = []
  runMutate.mockImplementation(({ focus }: { focus: string }) =>
    Promise.resolve({ notice: "", focus, heading: focus, names: [], behaviour: `read-${focus}` }),
  )
})

function setup() {
  render(<ScenarioPanel />)
  fireEvent.click(screen.getByLabelText(/Sonny/))
  fireEvent.click(screen.getByLabelText(/Michael/))
  fireEvent.change(screen.getByLabelText(/The situation/), {
    target: { value: "An ambush at a toll booth." },
  })
}

it("requests one read per character plus the collaborative one", async () => {
  // One request describing four characters is exactly the unbounded generation
  // that 503s against the gateway's 30s cap. Splitting by focus keeps each short.
  setup()
  fireEvent.click(screen.getByRole("button", { name: /Run the scenario/ }))

  await waitFor(() => expect(runMutate).toHaveBeenCalledTimes(3))
  expect(runMutate.mock.calls.map((c) => c[0].focus)).toEqual(["a", "b", "collaborative"])
  expect(await screen.findByText("read-a")).toBeInTheDocument()
  expect(await screen.findByText("read-collaborative")).toBeInTheDocument()
})

it("marks the read that failed instead of dropping the character silently", async () => {
  // A character whose read is simply absent looks like a character with nothing
  // to say about the situation.
  runMutate.mockImplementation(({ focus }: { focus: string }) =>
    focus === "b"
      ? Promise.reject(new Error("503"))
      : Promise.resolve({ notice: "", focus, heading: focus, names: [], behaviour: `read-${focus}` }),
  )
  setup()
  fireEvent.click(screen.getByRole("button", { name: /Run the scenario/ }))
  expect(await screen.findByText(/The read for Michael could not be generated/)).toBeInTheDocument()
})

it("refuses to run without a situation", async () => {
  render(<ScenarioPanel />)
  fireEvent.click(screen.getByLabelText(/Sonny/))
  fireEvent.click(screen.getByRole("button", { name: /Run the scenario/ }))
  await waitFor(() => expect(runMutate).not.toHaveBeenCalled())
})

it("keeps the run with the cast names as they were", async () => {
  // So a saved scenario still reads correctly after a profile is renamed or
  // deleted — the names are a snapshot, not a live lookup.
  saveMutate.mockResolvedValue({})
  setup()
  fireEvent.click(screen.getByRole("button", { name: /Run the scenario/ }))
  await screen.findByText("read-collaborative")

  fireEvent.click(screen.getByRole("button", { name: /Keep this run/ }))
  await waitFor(() => expect(saveMutate).toHaveBeenCalled())

  const body = saveMutate.mock.calls[0][0]
  expect(body.character_names).toEqual(["Sonny", "Michael"])
  expect(body.profile_ids).toEqual(["a", "b"])
  expect(body.result.collaborative).toBe("read-collaborative")
})

it("reopens a saved run from its stored result, without re-running the model", async () => {
  scenarios = [
    {
      id: "s1",
      title: "The toll booth",
      situation: "An ambush.",
      character_ids: ["a"],
      character_names: ["Sonny"],
      result: { individual: { a: "stored-read" }, collaborative: "stored-together" },
      notice: "",
      created_at: null,
      updated_at: null,
    },
  ]
  render(<ScenarioPanel />)
  fireEvent.click(screen.getByRole("button", { name: /Open/ }))

  expect(await screen.findByText("stored-together")).toBeInTheDocument()
  expect(runMutate).not.toHaveBeenCalled()
})

it("shows a saved run's own cast names even when the profile is gone", () => {
  // The library is EMPTY here: the character has been deleted, so the only
  // place the name still exists is the scenario's own snapshot. If the panel
  // resolved names by looking the id up in `profiles`, this would render blank.
  profiles = []
  scenarios = [
    {
      id: "s1",
      title: "The toll booth",
      situation: "An ambush.",
      character_ids: ["deleted"],
      character_names: ["Sonny"],
      result: { collaborative: "text" },
      notice: "",
      created_at: null,
      updated_at: null,
    },
  ]
  render(<ScenarioPanel />)
  expect(screen.getByText("Sonny")).toBeInTheDocument()
})


// ─── Export ─────────────────────────────────────────────────────────────

describe("ScenarioPanel — narrative export", () => {
  beforeEach(() => {
    wordMock.mockReset().mockResolvedValue(undefined)
    pdfMock.mockReset().mockResolvedValue(undefined)
  })

  it("exports one section per character, in cast order, then the group read", async () => {
    setup()
    fireEvent.click(screen.getByRole("button", { name: /Run the scenario/ }))
    await screen.findByText("read-collaborative")

    fireEvent.click(screen.getByRole("button", { name: /^PDF$/ }))
    await waitFor(() => expect(pdfMock).toHaveBeenCalled())

    const doc = pdfMock.mock.calls[0][0]
    expect(doc.sections.map((s: { heading: string }) => s.heading)).toEqual([
      "Sonny", "Michael", "Together",
    ])
    expect(doc.sections[0].body).toBe("read-a")
    expect(doc.sections[2].body).toBe("read-collaborative")
    expect(doc.meta.find((m: { label: string }) => m.label === "Situation").value).toBe(
      "An ambush at a toll booth.",
    )
  })

  it("keeps a failed character's marker in the export", async () => {
    // Dropping it would make the document read as a complete scene that was
    // simply shorter — the failure this surface keeps guarding against.
    runMutate.mockImplementation(({ focus }: { focus: string }) =>
      focus === "b"
        ? Promise.reject(new Error("503"))
        : Promise.resolve({ notice: "N", focus, heading: focus, names: [], behaviour: `read-${focus}` }),
    )
    setup()
    fireEvent.click(screen.getByRole("button", { name: /Run the scenario/ }))
    await screen.findByText(/could not be generated/)

    fireEvent.click(screen.getByRole("button", { name: /^Word$/ }))
    await waitFor(() => expect(wordMock).toHaveBeenCalled())

    const michael = wordMock.mock.calls[0][0].sections.find(
      (s: { heading: string }) => s.heading === "Michael",
    )
    expect(michael.body).toContain("could not be generated")
  })

  it("offers no export until a scenario has been run", () => {
    render(<ScenarioPanel />)
    expect(screen.queryByRole("button", { name: /^PDF$/ })).not.toBeInTheDocument()
  })
})
