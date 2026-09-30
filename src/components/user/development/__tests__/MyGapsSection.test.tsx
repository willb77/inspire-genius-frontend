/**
 * Gaps, self-scoped.
 *
 * The two behaviours that come from the SERVER rather than from taste, and so
 * cannot be "tidied":
 *  - a closed gap keeps coming back in the list, so its status is rendered and
 *    the close control is offered only while it is open;
 *  - a self-declared gap is a skill gap, which is what makes it survive a
 *    dossier recompute — so the two kinds are distinguishable on the row.
 */
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { DevelopmentGap } from "@/types/development"

const useMyGaps = jest.fn()
const createMutate = jest.fn()
const closeMutate = jest.fn()
const createGap = { mutate: createMutate, isPending: false, error: null as unknown }
const closeGap = {
  mutate: closeMutate,
  isPending: false,
  error: null as unknown,
  variables: undefined as string | undefined,
}

jest.mock("@/hooks/me/useMyDevelopment", () => ({
  useMyGaps: () => useMyGaps(),
  useCreateMyGap: () => createGap,
  useCloseMyGap: () => closeGap,
}))

import MyGapsSection from "../MyGapsSection"

const gap = (over: Partial<DevelopmentGap> = {}): DevelopmentGap => ({
  gapId: "g1",
  memberId: "m1",
  competency: "Chairing a review",
  currentLevel: 2,
  targetLevel: 4,
  severity: "moderate",
  source: "behavioral",
  status: "open",
  ...over,
})

function query(over: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...over,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  createGap.isPending = false
  createGap.error = null
  closeGap.isPending = false
  closeGap.error = null
  closeGap.variables = undefined
  useMyGaps.mockReturnValue(query({ data: [] }))
})

it("names what would put a gap here, and who can", () => {
  render(<MyGapsSection />)
  expect(screen.getByText("No gaps on file yet.")).toBeInTheDocument()
  expect(screen.getByText(/completing a PRISM assessment/i)).toBeInTheDocument()
  expect(screen.getByText(/Your coach can also add one/i)).toBeInTheDocument()
})

it("distinguishes a failed read from having no gaps", () => {
  useMyGaps.mockReturnValue(query({ isError: true, error: new Error("boom") }))
  render(<MyGapsSection />)
  expect(screen.getByRole("alert")).toHaveTextContent(/couldn't load this section/i)
  expect(screen.queryByText("No gaps on file yet.")).not.toBeInTheDocument()
})

it("still offers the add form when the read failed", () => {
  // The write path is independent of the read. A person whose list failed to
  // load can still record something they want to get better at.
  useMyGaps.mockReturnValue(query({ isError: true, error: new Error("boom") }))
  render(<MyGapsSection />)
  expect(screen.getByLabelText("What is it?")).toBeInTheDocument()
})

it("shows a closed gap with its status, and no close control", () => {
  useMyGaps.mockReturnValue(query({ data: [gap({ status: "closed" })] }))
  render(<MyGapsSection />)
  expect(screen.getByText(/^Closed/)).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /mark as closed/i })).not.toBeInTheDocument()
  expect(screen.getByText("0 still open")).toBeInTheDocument()
})

it("says which gaps the person added themselves", () => {
  useMyGaps.mockReturnValue(
    query({ data: [gap({ source: "skill" }), gap({ gapId: "g2", source: "behavioral" })] }),
  )
  render(<MyGapsSection />)
  expect(screen.getByText(/You added this/)).toBeInTheDocument()
  expect(screen.getByText(/From your assessment/)).toBeInTheDocument()
  expect(screen.getByText("2 still open")).toBeInTheDocument()
})

it("closes the gap the person clicked, by its own id", async () => {
  useMyGaps.mockReturnValue(query({ data: [gap({ gapId: "g7" })] }))
  render(<MyGapsSection />)
  await userEvent.click(screen.getByRole("button", { name: /mark as closed/i }))
  expect(closeMutate).toHaveBeenCalledWith("g7")
})

it("declares a gap with the competency typed and the default severity", async () => {
  render(<MyGapsSection />)
  await userEvent.type(screen.getByLabelText("What is it?"), "Chairing a review")
  await userEvent.click(screen.getByRole("button", { name: "Add" }))
  await waitFor(() =>
    expect(createMutate).toHaveBeenCalledWith(
      { competency: "Chairing a review", severity: "moderate" },
      expect.anything(),
    ),
  )
})

it("refuses an empty competency client-side and says why", async () => {
  render(<MyGapsSection />)
  await userEvent.click(screen.getByRole("button", { name: "Add" }))
  await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
  expect(createMutate).not.toHaveBeenCalled()
})

it("renders a failed write, so nothing reports success it did not have", async () => {
  createGap.error = { response: { data: { detail: "Competency already tracked." } } }
  useMyGaps.mockReturnValue(query({ data: [] }))
  render(<MyGapsSection />)
  expect(screen.getByRole("alert")).toHaveTextContent("Competency already tracked.")
})

it("renders a failed close too", () => {
  closeGap.error = new Error("Gap not found")
  useMyGaps.mockReturnValue(query({ data: [gap()] }))
  render(<MyGapsSection />)
  expect(screen.getByRole("alert")).toHaveTextContent("Gap not found")
})
