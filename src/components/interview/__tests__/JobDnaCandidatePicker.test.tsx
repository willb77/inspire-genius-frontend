/**
 * @jest-environment jsdom
 *
 * The Job DNA candidate link on live-interview setup (IS-11c2's front door).
 * What matters: only PUBLISHED Job DNAs are offered, picking a candidate hands
 * back both ids plus the name/code to prefill, and the linked state can be
 * cleared. Hooks are mocked — the picker's contract is its callback.
 */
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import JobDnaCandidatePicker from "../JobDnaCandidatePicker"

const jobDnaList = jest.fn()
const pipeline = jest.fn()
jest.mock("@/hooks/job-blueprint/useJobDna", () => ({ useJobDnaList: () => jobDnaList() }))
jest.mock("@/hooks/job-blueprint/useTriage", () => ({ usePipeline: (id: string) => pipeline(id) }))

const JOBS = [
  { id: "bp-active", roleTitle: "Machinist", department: "Plant", status: "active" },
  { id: "bp-draft", roleTitle: "Draft role", department: "", status: "draft" },
]
const CANDS = [
  { id: "cand-1", name: "Ada Lovelace", code: "REQ-7" },
  { id: "cand-2", name: "Grace Hopper", code: "" },
]

beforeEach(() => {
  jobDnaList.mockReturnValue({ data: JOBS, isLoading: false, isError: false })
  pipeline.mockImplementation((id: string) => ({
    data: id === "bp-active" ? CANDS : [],
    isLoading: false,
    isError: false,
  }))
})

test("offers only published Job DNAs, then the pipeline of the chosen one", async () => {
  const onPick = jest.fn()
  render(<JobDnaCandidatePicker value={null} onPick={onPick} onClear={() => {}} />)
  const jobSelect = screen.getByLabelText("Job DNA") as HTMLSelectElement
  const labels = Array.from(jobSelect.options).map((o) => o.textContent)
  expect(labels).toContain("Machinist — Plant")
  expect(labels.join()).not.toContain("Draft role")

  const candSelect = screen.getByLabelText("Candidate") as HTMLSelectElement
  expect(candSelect).toBeDisabled()
  await userEvent.selectOptions(jobSelect, "bp-active")
  expect(candSelect).toBeEnabled()
  await userEvent.selectOptions(candSelect, "cand-1")
  expect(onPick).toHaveBeenCalledWith({
    blueprint_id: "bp-active",
    candidate_id: "cand-1",
    display_name: "Ada Lovelace",
    external_id: "REQ-7",
  })
})

test("a candidate without a code links with no external id", async () => {
  const onPick = jest.fn()
  render(<JobDnaCandidatePicker value={null} onPick={onPick} onClear={() => {}} />)
  await userEvent.selectOptions(screen.getByLabelText("Job DNA"), "bp-active")
  await userEvent.selectOptions(screen.getByLabelText("Candidate"), "cand-2")
  expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ candidate_id: "cand-2", external_id: undefined }))
})

test("shows the linked state and can clear it", async () => {
  const onClear = jest.fn()
  render(
    <JobDnaCandidatePicker
      value={{ blueprint_id: "bp-active", candidate_id: "cand-1", display_name: "Ada Lovelace", external_id: "REQ-7" }}
      onPick={() => {}}
      onClear={onClear}
    />,
  )
  expect(screen.getByTestId("job-dna-link")).toHaveTextContent("Ada Lovelace (REQ-7)")
  await userEvent.click(screen.getByRole("button", { name: /unlink candidate/i }))
  expect(onClear).toHaveBeenCalled()
})

test("says so when nothing is published or a load fails", () => {
  jobDnaList.mockReturnValue({ data: [{ id: "x", roleTitle: "Only draft", status: "draft" }], isLoading: false, isError: false })
  const { rerender } = render(<JobDnaCandidatePicker value={null} onPick={() => {}} onClear={() => {}} />)
  expect(screen.getByText(/no published job dnas yet/i)).toBeInTheDocument()
  jobDnaList.mockReturnValue({ data: undefined, isLoading: false, isError: true })
  rerender(<JobDnaCandidatePicker value={null} onPick={() => {}} onClear={() => {}} />)
  expect(screen.getByRole("alert")).toHaveTextContent(/could not load job dnas/i)
})
