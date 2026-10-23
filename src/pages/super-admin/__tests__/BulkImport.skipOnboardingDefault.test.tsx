import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import SuperAdminBulkImport from "../BulkImport"

// Skip onboarding is ticked by default (Bill, 2026-10-22): the unticked path
// creates no sign-in account today, so unticking shows a warning. Unticking is
// still allowed and still reaches the standard path.
const demoMutate = jest.fn()
const standardMutate = jest.fn()

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
jest.mock("@/components/bulk-import/FileUploader", () => ({
  FileUploader: ({ onParsed }: { onParsed: (r: unknown[]) => void }) => (
    <button onClick={() => onParsed([{ fname: "T", lname: "U", email1: "t@example.com", user_type: "user" }])}>
      parse
    </button>
  ),
}))
jest.mock("@/components/bulk-import/DataPreviewTable", () => ({
  DataPreviewTable: ({ onProceed }: { onProceed: (r: unknown[]) => void }) => (
    <button onClick={() => onProceed([{ fname: "T", lname: "U", email1: "t@example.com", user_type: "user" }])}>
      proceed
    </button>
  ),
}))
jest.mock("@/components/bulk-import/ImportProgress", () => ({ ImportProgress: () => null }))
jest.mock("@/components/bulk-import/DemoImportResult", () => ({ DemoImportResult: () => null }))
jest.mock("@/components/bulk-import/InvitationComposer", () => ({ InvitationComposer: () => null }))
jest.mock("@/components/bulk-import/RecipientSelector", () => ({ RecipientSelector: () => null }))
jest.mock("@/components/bulk-import/DeliveryTracker", () => ({ DeliveryTracker: () => null }))
jest.mock("@/hooks/useBulkImport", () => ({
  useBulkImport: () => ({ mutate: standardMutate, isPending: false, data: null }),
  useBulkDemoInvite: () => ({ mutate: demoMutate, isPending: false, data: undefined }),
  useSendInvitations: () => ({ mutate: jest.fn(), isPending: false }),
  useInvitationStatus: () => ({ data: null, isLoading: false }),
  useResendInvitation: () => ({ mutate: jest.fn(), isPending: false }),
}))
jest.mock("@/hooks/super-admin/user-management/useOrgAssignment", () => ({
  useOrgDirectory: () => ({ data: [] }),
}))

beforeEach(() => {
  demoMutate.mockClear()
  standardMutate.mockClear()
})

test("the box starts ticked and there is no warning", () => {
  render(<SuperAdminBulkImport />)
  expect(screen.getByRole("checkbox")).toBeChecked()
  expect(screen.queryByRole("alert")).not.toBeInTheDocument()
})

test("by default the import goes down the Skip-onboarding path", () => {
  render(<SuperAdminBulkImport />)
  fireEvent.click(screen.getByText("parse"))
  fireEvent.click(screen.getByText("proceed"))
  expect(demoMutate).toHaveBeenCalledTimes(1)
  expect(standardMutate).not.toHaveBeenCalled()
})

test("unticking shows the warning, and ticking again removes it", () => {
  render(<SuperAdminBulkImport />)
  fireEvent.click(screen.getByRole("checkbox"))
  expect(screen.getByRole("checkbox")).not.toBeChecked()
  expect(screen.getByRole("alert")).toHaveTextContent(/do not get a sign-in\s+account/)
  fireEvent.click(screen.getByRole("checkbox"))
  expect(screen.queryByRole("alert")).not.toBeInTheDocument()
})

test("unticked, the import still goes down the standard path", () => {
  render(<SuperAdminBulkImport />)
  fireEvent.click(screen.getByRole("checkbox"))
  fireEvent.click(screen.getByText("parse"))
  fireEvent.click(screen.getByText("proceed"))
  expect(standardMutate).toHaveBeenCalledTimes(1)
  expect(demoMutate).not.toHaveBeenCalled()
})
