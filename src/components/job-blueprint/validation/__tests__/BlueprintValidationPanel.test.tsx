/**
 * @jest-environment jsdom
 *
 * N-4 — the validation panel on the Job DNA detail page, and the reviewer's queue.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import type { BlueprintValidation, ValidationEvent } from "@/types/job-blueprint"

const mockRole = jest.fn<string, []>(() => "manager")
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { id: "me", role: mockRole() } }),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/components/dashboard/DataCard", () => ({
  __esModule: true,
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}))

const mockEnabled = jest.fn(() => true)
const mockValidation = jest.fn()
const mockAwaiting = jest.fn()
const mockRationale = jest.fn()
const mutation = () => ({ mutateAsync: jest.fn().mockResolvedValue({}), isPending: false })
const mockWithdraw = mutation()
const mockRequest = mutation()
const mockRecord = mutation()
const mockVerdict = mutation()
const mockExport = mutation()

jest.mock("@/hooks/job-blueprint/useBlueprintValidation", () => ({
  useValidationEnabled: () => mockEnabled(),
  useBlueprintValidation: () => mockValidation(),
  useAwaitingValidation: () => mockAwaiting(),
  useRationale: () => mockRationale(),
  useWithdrawValidation: () => mockWithdraw,
  useRequestValidation: () => mockRequest,
  useRecordAttestation: () => mockRecord,
  useGiveVerdict: () => mockVerdict,
  useExportRationale: () => mockExport,
  validationErrorMessage: (err: { response?: { data?: { detail?: string } } }, fb: string) =>
    err?.response?.data?.detail ?? fb,
}))

import { BlueprintValidationPanel } from "../BlueprintValidationPanel"
import { noteDimensions } from "../noteDimensions"
import { ValidationReviewQueue } from "../ValidationReviewQueue"

const DIMS = [{ key: "behavior:1", label: "Innovating" }]

function view(over: Partial<BlueprintValidation> = {}): BlueprintValidation {
  return {
    blueprintId: "bp1", version: 2, eligible: true, ineligibleReason: null, state: "none",
    current: null, reviewerName: null, awaitingYou: false, requestedByYou: false, history: [],
    retentionDays: 90, ...over,
  }
}

const recorded: ValidationEvent = {
  id: "e1", event: "validated", method: "recorded", at: "2026-10-03T00:00:00", actorName: "Edda Editor",
  reviewerName: null, validatorName: "Sam Expert", validatorOrg: "Acme", validatorTitle: null,
  validatedOn: "2026-10-01", comments: null, dimensionNotes: {}, retentionApplied: false,
}

const panel = () => render(<BlueprintValidationPanel blueprintId="bp1" dims={DIMS} />)

beforeEach(() => {
  jest.clearAllMocks()
  mockEnabled.mockReturnValue(true)
  mockRole.mockReturnValue("manager")
  mockValidation.mockReturnValue({ data: view(), isLoading: false, isError: false })
  mockAwaiting.mockReturnValue({ data: [] })
  mockRationale.mockReturnValue({ data: undefined, isLoading: false, isError: false })
  for (const m of [mockWithdraw, mockRequest, mockRecord, mockVerdict, mockExport]) {
    m.mutateAsync.mockReset().mockResolvedValue({})
  }
})

describe("BlueprintValidationPanel", () => {
  it("renders nothing while the switch is off", () => {
    mockEnabled.mockReturnValue(false)
    const { container } = panel()
    expect(container).toBeEmptyDOMElement()
  })

  it("shows the state and offers request and record on an unvalidated role", () => {
    panel()
    expect(screen.getByTestId("validation-state")).toHaveTextContent("Not validated")
    expect(screen.getByRole("button", { name: "Request validation" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Record an attestation" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Rationale Report/ })).toBeInTheDocument()
  })

  it("says why a global role cannot be validated and offers no actions", () => {
    mockValidation.mockReturnValue({
      data: view({ eligible: false, ineligibleReason: "This is a global library role. Copy it." }),
      isLoading: false, isError: false,
    })
    panel()
    expect(screen.getByText(/global library role/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Request validation" })).not.toBeInTheDocument()
  })

  it("labels a recorded attestation and who recorded it", () => {
    mockValidation.mockReturnValue({
      data: view({ state: "validated", current: recorded, history: [recorded] }),
      isLoading: false, isError: false,
    })
    panel()
    expect(screen.getByTestId("validation-state")).toHaveTextContent("Validated (recorded attestation)")
    expect(screen.getByText(/Sam Expert, Acme — 2026-10-01 · recorded by Edda Editor/)).toBeInTheDocument()
    expect(screen.getByTestId("validation-history")).toHaveTextContent("recorded an attestation by Sam Expert")
    expect(screen.queryByRole("button", { name: "Request validation" })).not.toBeInTheDocument()
  })

  it("says when the retention removed an SME's name", () => {
    const expired = { ...recorded, validatorName: null, validatorOrg: null, retentionApplied: true }
    mockValidation.mockReturnValue({
      data: view({ state: "validated", current: expired, history: [expired] }), isLoading: false, isError: false,
    })
    panel()
    expect(screen.getByText(/Name no longer held \(90-day retention\)/)).toBeInTheDocument()
  })

  it("shows the verdict form to the named reviewer", () => {
    mockValidation.mockReturnValue({
      data: view({ state: "in_review", awaitingYou: true, reviewerName: "Rhea Reviewer" }),
      isLoading: false, isError: false,
    })
    panel()
    expect(screen.getByText("This role is awaiting your validation.")).toBeInTheDocument()
    expect(screen.getByRole("form", { name: "Your verdict" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Withdraw the request" })).not.toBeInTheDocument()
  })

  it("lets the requester withdraw, and renders a refusal", async () => {
    mockValidation.mockReturnValue({
      data: view({ state: "in_review", requestedByYou: true, reviewerName: "Rhea Reviewer" }),
      isLoading: false, isError: false,
    })
    mockWithdraw.mutateAsync.mockRejectedValueOnce({ response: { data: { detail: "Nope." } } })
    panel()
    expect(screen.getByText("awaiting Rhea Reviewer")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Withdraw the request" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Nope.")
    expect(mockWithdraw.mutateAsync).toHaveBeenCalledWith({ id: "bp1" })
  })

  it("lets a super-admin withdraw someone else's request", () => {
    mockRole.mockReturnValue("super-admin")
    mockValidation.mockReturnValue({ data: view({ state: "in_review" }), isLoading: false, isError: false })
    panel()
    expect(screen.getByRole("button", { name: "Withdraw the request" })).toBeInTheDocument()
  })

  it("renders a load failure rather than an empty panel", () => {
    mockValidation.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    panel()
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load")
  })

  it("exports the report and renders a failure", async () => {
    mockExport.mutateAsync.mockRejectedValueOnce(new Error("x"))
    panel()
    fireEvent.click(screen.getByRole("button", { name: /Rationale Report/ }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not build the Rationale Report.")
    expect(mockExport.mutateAsync).toHaveBeenCalledWith("bp1")
  })

  it("opens the request form and submits the reviewer's email", async () => {
    panel()
    fireEvent.click(screen.getByRole("button", { name: "Request validation" }))
    fireEvent.change(screen.getByLabelText("Reviewer's email"), { target: { value: "rhea@example.test" } })
    fireEvent.click(screen.getAllByRole("button", { name: "Request validation" })[1])
    await waitFor(() =>
      expect(mockRequest.mutateAsync).toHaveBeenCalledWith({
        id: "bp1", body: { reviewerEmail: "rhea@example.test", note: undefined },
      }),
    )
  })
})

describe("noteDimensions", () => {
  it("keys each dimension the way the server accepts", () => {
    const d = (category: "behavior" | "aptitude" | "core-trait", id: number, name: string) => ({
      dimensionId: id, dimensionName: name, category, rankPosition: 0, rankPercent: 0, rateValue: 0,
      finalBenchmarkPercent: 0, interpretation: "moderate" as const,
    })
    expect(noteDimensions({
      behaviors: [d("behavior", 1, "Innovating")], aptitudes: [d("aptitude", 2, "Investigative")],
      coreTraits: [d("core-trait", 3, "Decisiveness")],
    })).toEqual([
      { key: "behavior:1", label: "Innovating" },
      { key: "aptitude:2", label: "Investigative" },
      { key: "core-trait:3", label: "Decisiveness" },
    ])
  })
})

describe("ValidationReviewQueue", () => {
  const item = {
    blueprintId: "bp9", roleTitle: "Line Supervisor", version: 1, requestedBy: "Edda Editor",
    requestedAt: "2026-10-19T10:00:00", note: "Please check the ranks",
  }

  it("renders nothing while the switch is off or nothing waits", () => {
    mockEnabled.mockReturnValue(false)
    mockAwaiting.mockReturnValue({ data: [item] })
    expect(render(<ValidationReviewQueue />).container).toBeEmptyDOMElement()
    mockEnabled.mockReturnValue(true)
    mockAwaiting.mockReturnValue({ data: [] })
    expect(render(<ValidationReviewQueue />).container).toBeEmptyDOMElement()
  })

  it("lists the reviewer's roles and opens one with its benchmark and the verdict form", () => {
    mockAwaiting.mockReturnValue({ data: [item] })
    mockRationale.mockReturnValue({
      data: { dimensions: [{ category: "behavior", categoryLabel: "Behavior Preferences", dimensionId: 1,
        dimensionName: "Innovating", targetPercent: 80, importanceTier: "critical" }] },
      isLoading: false, isError: false,
    })
    render(<ValidationReviewQueue />)
    expect(screen.getByText("Awaiting your validation")).toBeInTheDocument()
    expect(screen.getByText("“Please check the ranks”")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /Line Supervisor/ }))
    expect(screen.getByTestId("review-dimensions")).toHaveTextContent("Behavior Preferences — Innovating80%critical")
    expect(screen.getByRole("form", { name: "Your verdict" })).toBeInTheDocument()
  })

  it("renders a failure to load the benchmark", () => {
    mockAwaiting.mockReturnValue({ data: [item] })
    mockRationale.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<ValidationReviewQueue />)
    fireEvent.click(screen.getByRole("button", { name: /Line Supervisor/ }))
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load")
  })
})
