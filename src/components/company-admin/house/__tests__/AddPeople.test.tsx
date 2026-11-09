/**
 * @jest-environment jsdom
 *
 * House-style "Add people" (company admin). It must say plainly that people
 * added here cannot sign in yet, must never claim an invitation was sent or
 * accounts were created, and uses only the import call the classic page uses.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AddPeople, ADD_PEOPLE_NOTICE } from "../AddPeople"
import type { BulkImportResponse } from "@/types/bulk-import"

const ROW = { fname: "Rowan", lname: "Field", email1: "rowan.field (test)", user_type: "user" }

jest.mock("@/components/bulk-import/FileUploader", () => ({
  FileUploader: ({ onParsed }: { onParsed: (r: unknown[]) => void }) => (
    <button onClick={() => onParsed([{ fname: "Rowan" }])}>mock upload</button>
  ),
}))
jest.mock("@/components/bulk-import/DataPreviewTable", () => ({
  DataPreviewTable: ({ onProceed, records }: { onProceed: (r: unknown[]) => void; records: unknown[] }) => (
    <button onClick={() => onProceed([ROW])}>mock proceed {records.length}</button>
  ),
}))
const mockRecordAges = jest.fn()
jest.mock("@/hooks/useMinorConsent", () => ({
  useRosterAgeCapture: () => ({
    ageCaptureAllowed: false,
    recordFrom: (...a: unknown[]) => mockRecordAges(...a),
    mutation: { isPending: false, isError: false, data: undefined },
  }),
}))
const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() }
jest.mock("sonner", () => ({ toast: mockToast }))

const mockBulkImport = jest.fn()
const mockSendInvites = jest.fn()
jest.mock("@/services/bulk-import", () => ({
  bulkImportUsers: (...a: unknown[]) => mockBulkImport(...a),
  sendBulkInvitations: (...a: unknown[]) => mockSendInvites(...a),
}))

const OK: BulkImportResponse = {
  batch_id: "b1",
  total: 2,
  succeeded: 1,
  failed: 1,
  results: [
    { email: "rowan.field (test)", status: "success", user_id: "u1" },
    { email: "kit.marsh (test)", status: "failed", error: "Email already exists" },
  ],
}

const onClose = jest.fn()
function setup() {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <AddPeople onClose={onClose} />
    </QueryClientProvider>,
  )
}

const MISLEADING = /invitation sent|invitations sent|import complete|users created|can now sign in|account(s)? (was|were) created/i

beforeEach(() => jest.clearAllMocks())

describe("AddPeople", () => {
  it("always carries the plain sign-in notice", () => {
    setup()
    expect(screen.getByRole("note")).toHaveTextContent(ADD_PEOPLE_NOTICE)
    expect(ADD_PEOPLE_NOTICE).toMatch(/cannot sign in yet/)
    expect(ADD_PEOPLE_NOTICE).toMatch(/Inspire Genius contact has to activate/)
  })

  it("offers no skip-onboarding option and no invitation step", () => {
    setup()
    expect(screen.queryByText(/skip onboarding/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/invitation/i)).not.toBeInTheDocument()
  })

  it("records through the classic import call and reports the honest outcome", async () => {
    mockBulkImport.mockResolvedValue(OK)
    setup()
    fireEvent.click(screen.getByText("mock upload"))
    fireEvent.click(screen.getByText("mock proceed 1"))
    expect(await screen.findByText("Recorded 1 of 2 people.")).toBeInTheDocument()
    expect(mockBulkImport).toHaveBeenCalledTimes(1)
    expect(mockBulkImport.mock.calls[0][0]).toEqual([ROW])
    expect(mockSendInvites).not.toHaveBeenCalled()
    expect(mockRecordAges).toHaveBeenCalledWith([ROW])
    expect(screen.getByText(/They cannot sign in yet/)).toBeInTheDocument()
    expect(screen.getByText("Not recorded (1)")).toBeInTheDocument()
    expect(screen.getByText("kit.marsh (test): Email already exists")).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(MISLEADING)
    expect(mockToast.success).not.toHaveBeenCalled()
  })

  it("singular wording, and no not-recorded list when all succeed", async () => {
    mockBulkImport.mockResolvedValue({ ...OK, total: 1, succeeded: 1, failed: 0, results: [OK.results[0]] })
    setup()
    fireEvent.click(screen.getByText("mock upload"))
    fireEvent.click(screen.getByText("mock proceed 1"))
    expect(await screen.findByText("Recorded 1 of 1 person.")).toBeInTheDocument()
    expect(screen.queryByText(/Not recorded/)).not.toBeInTheDocument()
  })

  it("a failed call is an error state with Try again, which retries the same rows", async () => {
    mockBulkImport.mockRejectedValueOnce(new Error("500")).mockResolvedValueOnce(OK)
    setup()
    fireEvent.click(screen.getByText("mock upload"))
    fireEvent.click(screen.getByText("mock proceed 1"))
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't finish recording these people.")
    expect(mockRecordAges).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByText("Recorded 1 of 2 people.")).toBeInTheDocument()
    expect(mockBulkImport).toHaveBeenCalledTimes(2)
    expect(mockBulkImport.mock.calls[1][0]).toEqual([ROW])
  })

  it("shows loading while recording", async () => {
    let resolve: (v: BulkImportResponse) => void = () => {}
    mockBulkImport.mockReturnValue(new Promise<BulkImportResponse>((r) => (resolve = r)))
    setup()
    fireEvent.click(screen.getByText("mock upload"))
    fireEvent.click(screen.getByText("mock proceed 1"))
    expect(await screen.findByRole("status", { name: "Loading" })).toBeInTheDocument()
    expect(screen.queryByText("Add more people")).not.toBeInTheDocument()
    resolve(OK)
    await waitFor(() => expect(screen.getByText("Recorded 1 of 2 people.")).toBeInTheDocument())
  })

  it("Add more people starts over; Close calls onClose", async () => {
    mockBulkImport.mockResolvedValue(OK)
    setup()
    fireEvent.click(screen.getByText("mock upload"))
    expect(screen.getByText("Add more people")).toBeInTheDocument()
    fireEvent.click(screen.getByText("mock proceed 1"))
    await screen.findByText("Recorded 1 of 2 people.")
    fireEvent.click(screen.getByText("Add more people"))
    expect(screen.getByText("mock upload")).toBeInTheDocument()
    expect(screen.queryByText(/Recorded/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(onClose).toHaveBeenCalled()
  })
})
