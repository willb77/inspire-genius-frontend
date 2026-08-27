import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import ScenarioPanel from "../ScenarioPanel"
import type { ProfileSummary, SavedScenario } from "@/types/character-lab"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))
jest.mock("@/components/super-admin/character-lab/ProfileMarkdown", () => ({
  __esModule: true,
  default: ({ text }: { text: string }) => <div>{text}</div>,
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
