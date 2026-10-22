/**
 * @jest-environment jsdom
 *
 * N-4 — the three validation forms: what each refuses before it sends, what
 * it sends, and that the server's refusal is shown in its own words.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const mutation = () => ({ mutateAsync: jest.fn().mockResolvedValue({}), isPending: false })
const mockRequest = mutation()
const mockRecord = mutation()
const mockVerdict = mutation()
jest.mock("@/hooks/job-blueprint/useBlueprintValidation", () => ({
  useRequestValidation: () => mockRequest,
  useRecordAttestation: () => mockRecord,
  useGiveVerdict: () => mockVerdict,
  validationErrorMessage: (err: { response?: { data?: { detail?: string } } }, fb: string) =>
    err?.response?.data?.detail ?? fb,
}))

import { RecordAttestationForm, RequestValidationForm, VerdictForm } from "../ValidationForms"

const DIMS = [
  { key: "behavior:1", label: "Innovating" },
  { key: "core-trait:3", label: "Decisiveness" },
]

beforeEach(() => {
  for (const m of [mockRequest, mockRecord, mockVerdict]) m.mutateAsync.mockReset().mockResolvedValue({})
})

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

describe("RequestValidationForm", () => {
  it("says the reviewer may hold the manager role or above (matches the server's rule)", () => {
    render(<RequestValidationForm blueprintId="bp1" />)
    expect(screen.getByText(/must hold the manager role or above in this role's organisation/)).toBeInTheDocument()
  })

  it("refuses a malformed email without calling the server", async () => {
    render(<RequestValidationForm blueprintId="bp1" />)
    type("Reviewer's email", "not-an-email")
    fireEvent.click(screen.getByRole("button", { name: "Request validation" }))
    expect(await screen.findByText("Enter the reviewer's email address")).toBeInTheDocument()
    expect(mockRequest.mutateAsync).not.toHaveBeenCalled()
  })

  it("shows the server's refusal", async () => {
    mockRequest.mutateAsync.mockRejectedValueOnce({ response: { data: { detail: "A reviewer must hold the manager role or above in this role's organisation." } } })
    const done = jest.fn()
    render(<RequestValidationForm blueprintId="bp1" onDone={done} />)
    type("Reviewer's email", "x@example.test")
    type("Note to the reviewer (optional)", "Please")
    fireEvent.click(screen.getByRole("button", { name: "Request validation" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("manager role or above")
    expect(mockRequest.mutateAsync).toHaveBeenCalledWith({ id: "bp1", body: { reviewerEmail: "x@example.test", note: "Please" } })
    expect(done).not.toHaveBeenCalled()
  })
})

describe("RecordAttestationForm", () => {
  const fill = () => {
    type("SME name", "Sam Expert")
    type("Organisation", "Acme Plant")
    type("Date signed", "2026-10-01")
  }

  it("will not record without the attestation ticked", async () => {
    render(<RecordAttestationForm blueprintId="bp1" dims={DIMS} />)
    fill()
    fireEvent.click(screen.getByRole("button", { name: "Record attestation" }))
    expect(await screen.findByText("Confirm the SME attested to this benchmark")).toBeInTheDocument()
    expect(mockRecord.mutateAsync).not.toHaveBeenCalled()
  })

  it("refuses a future date", async () => {
    render(<RecordAttestationForm blueprintId="bp1" dims={DIMS} />)
    fill()
    type("Date signed", "2999-01-01")
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Record attestation" }))
    expect(await screen.findByText("The date cannot be in the future")).toBeInTheDocument()
  })

  it("sends the attestation with the dimension notes keyed as the server expects", async () => {
    const done = jest.fn()
    render(<RecordAttestationForm blueprintId="bp1" dims={DIMS} onDone={done} />)
    fill()
    type("Decisiveness", "Calls made on the floor")
    fireEvent.click(screen.getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Record attestation" }))
    await waitFor(() => expect(done).toHaveBeenCalled())
    expect(mockRecord.mutateAsync).toHaveBeenCalledWith({
      id: "bp1",
      body: {
        name: "Sam Expert", org: "Acme Plant", title: undefined, validatedOn: "2026-10-01",
        comments: undefined, dimensionNotes: { "core-trait:3": "Calls made on the floor" }, attest: true,
      },
    })
  })
})

describe("VerdictForm", () => {
  it("needs a name and organisation to validate", async () => {
    render(<VerdictForm blueprintId="bp1" dims={[]} />)
    fireEvent.click(screen.getByRole("button", { name: "Submit verdict" }))
    expect(await screen.findByText("Your name as it should appear on the report")).toBeInTheDocument()
    expect(mockVerdict.mutateAsync).not.toHaveBeenCalled()
  })

  it("needs comments to ask for changes, then sends them", async () => {
    render(<VerdictForm blueprintId="bp1" dims={[]} />)
    fireEvent.click(screen.getByLabelText(/Changes needed/))
    fireEvent.click(screen.getByRole("button", { name: "Submit verdict" }))
    expect(await screen.findByText("Say what needs to change")).toBeInTheDocument()
    type("What needs to change", "Rank Supporting higher")
    fireEvent.click(screen.getByRole("button", { name: "Submit verdict" }))
    await waitFor(() => expect(mockVerdict.mutateAsync).toHaveBeenCalled())
    expect(mockVerdict.mutateAsync.mock.calls[0][0]).toEqual({
      id: "bp1",
      body: { verdict: "changes_requested", name: undefined, org: undefined, title: undefined,
              comments: "Rank Supporting higher", dimensionNotes: undefined },
    })
  })

  it("validates and shows a server refusal", async () => {
    mockVerdict.mutateAsync.mockRejectedValueOnce({ response: { data: { detail: "Only the reviewer named on the request can give a verdict." } } })
    render(<VerdictForm blueprintId="bp1" dims={DIMS} />)
    type("Your name", "Rhea Reviewer")
    type("Organisation", "Org A")
    fireEvent.click(screen.getByRole("button", { name: "Submit verdict" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Only the reviewer named")
    expect(mockVerdict.mutateAsync.mock.calls[0][0].body).toMatchObject({ verdict: "validated", name: "Rhea Reviewer", org: "Org A" })
  })
})
