import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import ProfileLibrary from "../ProfileLibrary"
import type { ProfileSummary } from "@/types/character-lab"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() } }))

const patchMutate = jest.fn()
const deleteMutate = jest.fn()
let listResult: { data: ProfileSummary[] | undefined; isLoading: boolean; error: unknown } = {
  data: [],
  isLoading: false,
  error: null,
}

jest.mock("@/hooks/super-admin/useCharacterLab", () => ({
  useSavedProfiles: () => listResult,
  usePatchProfile: () => ({ mutateAsync: patchMutate, isPending: false }),
  useDeleteProfile: () => ({ mutateAsync: deleteMutate, isPending: false }),
}))

function profile(over: Partial<ProfileSummary> = {}): ProfileSummary {
  return {
    id: "p1",
    name: "Sonny Corleone",
    source: "The Godfather",
    notes: "Beats a man in the street.",
    scored: 62,
    has_analysis: true,
    created_at: "2026-08-27T10:00:00Z",
    updated_at: "2026-08-27T10:00:00Z",
    ...over,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  listResult = { data: [profile()], isLoading: false, error: null }
})

it("lists what is saved, with how many scales actually came back", () => {
  // 62 rather than 88: a profile built from a run where a battery failed must
  // say so. Rounding it up to the full count would hide the gap.
  render(<ProfileLibrary onLoad={jest.fn()} loadingId={null} />)
  expect(screen.getByText("Sonny Corleone")).toBeInTheDocument()
  expect(screen.getByText(/62 scales/)).toBeInTheDocument()
})

it("distinguishes a load failure from an empty library", () => {
  // These are different claims. "Nothing saved" invites the operator to rebuild
  // a character they already have.
  listResult = { data: undefined, isLoading: false, error: new Error("boom") }
  render(<ProfileLibrary onLoad={jest.fn()} loadingId={null} />)
  expect(screen.getByText(/load failure, not an empty library/i)).toBeInTheDocument()
})

it("says the library is empty only when it actually is", () => {
  listResult = { data: [], isLoading: false, error: null }
  render(<ProfileLibrary onLoad={jest.fn()} loadingId={null} />)
  expect(screen.getByText(/Nothing saved yet/i)).toBeInTheDocument()
})

it("hands the id back to the caller when Load is pressed", () => {
  const onLoad = jest.fn()
  render(<ProfileLibrary onLoad={onLoad} loadingId={null} />)
  fireEvent.click(screen.getByRole("button", { name: /^Load$/ }))
  expect(onLoad).toHaveBeenCalledWith("p1")
})

it("patches only the edited fields", async () => {
  // The endpoint treats an absent field as "leave alone". Sending the whole
  // profile would blank the analysis on every notes edit.
  patchMutate.mockResolvedValue(profile())
  render(<ProfileLibrary onLoad={jest.fn()} loadingId={null} />)

  fireEvent.click(screen.getByRole("button", { name: /Edit Sonny Corleone/ }))
  fireEvent.change(screen.getByLabelText(/What else do we know/i), {
    target: { value: "Also: the toll booth." },
  })
  fireEvent.click(screen.getByRole("button", { name: /Save changes/ }))

  await waitFor(() => expect(patchMutate).toHaveBeenCalled())
  expect(patchMutate).toHaveBeenCalledWith({
    id: "p1",
    patch: {
      name: "Sonny Corleone",
      source: "The Godfather",
      notes: "Also: the toll booth.",
    },
  })
  // Never the scores or the write-up.
  expect(Object.keys(patchMutate.mock.calls[0][0].patch)).not.toContain("analysis")
})

it("refuses to save an empty name instead of sending one", async () => {
  render(<ProfileLibrary onLoad={jest.fn()} loadingId={null} />)
  fireEvent.click(screen.getByRole("button", { name: /Edit Sonny Corleone/ }))
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "   " } })
  fireEvent.click(screen.getByRole("button", { name: /Save changes/ }))
  await waitFor(() => expect(patchMutate).not.toHaveBeenCalled())
})

it("asks before deleting", async () => {
  // These cost several model calls and the library is usually assembled just
  // before a demo.
  deleteMutate.mockResolvedValue(undefined)
  render(<ProfileLibrary onLoad={jest.fn()} loadingId={null} />)

  fireEvent.click(screen.getByRole("button", { name: /Delete Sonny Corleone/ }))
  expect(deleteMutate).not.toHaveBeenCalled()

  fireEvent.click(await screen.findByRole("button", { name: /^Delete$/ }))
  await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith("p1"))
})
