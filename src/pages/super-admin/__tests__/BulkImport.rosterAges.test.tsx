import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import SuperAdminBulkImport from "../BulkImport"

// N-2: roster dates of birth are recorded only AFTER an import succeeds, on
// both paths, and the capture flag reaches the preview table.
const mockRecordFrom = jest.fn()
const mockDemoMutate = jest.fn()
const mockStandardMutate = jest.fn()
const mockPreviewProps = jest.fn()
const ROWS = [{ fname: "T", lname: "U", email1: "t@example.com", user_type: "user", date_of_birth: "2011-04-09" }]

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock("@/components/bulk-import/FileUploader", () => ({
  FileUploader: ({ onParsed }: { onParsed: (r: unknown[]) => void }) => (
    <button onClick={() => onParsed([{ fname: "T" }])}>parse</button>
  ),
}))
jest.mock("@/components/bulk-import/DataPreviewTable", () => ({
  DataPreviewTable: (props: { onProceed: (r: unknown[]) => void; ageCaptureAllowed?: boolean }) => {
    mockPreviewProps(props)
    return <button onClick={() => props.onProceed(ROWS)}>proceed</button>
  },
}))
jest.mock("@/components/bulk-import/ImportProgress", () => ({ ImportProgress: () => null }))
jest.mock("@/components/bulk-import/DemoImportResult", () => ({ DemoImportResult: () => null }))
jest.mock("@/components/bulk-import/InvitationComposer", () => ({ InvitationComposer: () => null }))
jest.mock("@/components/bulk-import/RecipientSelector", () => ({ RecipientSelector: () => null }))
jest.mock("@/components/bulk-import/DeliveryTracker", () => ({ DeliveryTracker: () => null }))
jest.mock("@/hooks/useMinorConsent", () => ({
  useRosterAgeCapture: () => ({
    ageCaptureAllowed: true,
    recordFrom: mockRecordFrom,
    mutation: { isPending: false, isError: false, data: undefined },
  }),
}))
jest.mock("@/hooks/useBulkImport", () => ({
  useBulkImport: () => ({ mutate: mockStandardMutate, isPending: false, data: null }),
  useBulkDemoInvite: () => ({ mutate: mockDemoMutate, isPending: false, data: undefined }),
  useSendInvitations: () => ({ mutate: jest.fn(), isPending: false }),
  useInvitationStatus: () => ({ data: null, isLoading: false }),
  useResendInvitation: () => ({ mutate: jest.fn(), isPending: false }),
}))
jest.mock("@/hooks/super-admin/user-management/useOrgAssignment", () => ({
  useOrgDirectory: () => ({ data: [] }),
}))

beforeEach(() => jest.clearAllMocks())

test("the capture flag reaches the preview table", () => {
  render(<SuperAdminBulkImport />)
  fireEvent.click(screen.getByText("parse"))
  expect(mockPreviewProps).toHaveBeenLastCalledWith(expect.objectContaining({ ageCaptureAllowed: true }))
})

test("skip onboarding: ages are recorded only once the import succeeds", () => {
  render(<SuperAdminBulkImport />)
  fireEvent.click(screen.getByText("parse"))
  fireEvent.click(screen.getByText("proceed"))
  expect(mockRecordFrom).not.toHaveBeenCalled()
  const options = mockDemoMutate.mock.calls[0][1] as { onSuccess: () => void }
  options.onSuccess()
  expect(mockRecordFrom).toHaveBeenCalledWith(ROWS)
})

test("standard path: ages are recorded only once the import succeeds", () => {
  render(<SuperAdminBulkImport />)
  fireEvent.click(screen.getByRole("checkbox"))
  fireEvent.click(screen.getByText("parse"))
  fireEvent.click(screen.getByText("proceed"))
  expect(mockRecordFrom).not.toHaveBeenCalled()
  const options = mockStandardMutate.mock.calls[0][1] as { onSuccess: (d: unknown) => void }
  options.onSuccess({ results: [], batch_id: "b1" })
  expect(mockRecordFrom).toHaveBeenCalledWith(ROWS)
})
