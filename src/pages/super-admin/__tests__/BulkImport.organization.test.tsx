import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"
import SuperAdminBulkImport from "../BulkImport"

// The page decides whether organisations may be applied: only the Skip-onboarding
// path's backend takes one. These tests pin that it hands the table the real
// checkbox state and the organisation directory, which the table cannot know.
const tableProps = jest.fn()

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
  DataPreviewTable: (props: Record<string, unknown>) => {
    tableProps(props)
    return <div data-testid="data-preview-table" />
  },
}))
jest.mock("@/components/bulk-import/ImportProgress", () => ({ ImportProgress: () => null }))
jest.mock("@/components/bulk-import/DemoImportResult", () => ({ DemoImportResult: () => null }))
jest.mock("@/components/bulk-import/InvitationComposer", () => ({ InvitationComposer: () => null }))
jest.mock("@/components/bulk-import/RecipientSelector", () => ({ RecipientSelector: () => null }))
jest.mock("@/components/bulk-import/DeliveryTracker", () => ({ DeliveryTracker: () => null }))
jest.mock("@/hooks/useBulkImport", () => ({
  useBulkImport: () => ({ mutate: jest.fn(), isPending: false, data: null }),
  useBulkDemoInvite: () => ({ mutate: jest.fn(), isPending: false, data: undefined }),
  useSendInvitations: () => ({ mutate: jest.fn(), isPending: false }),
  useInvitationStatus: () => ({ data: null, isLoading: false }),
  useResendInvitation: () => ({ mutate: jest.fn(), isPending: false }),
}))
const DIRECTORY = [{ id: "org-a-id", name: "test-org-a" }]
jest.mock("@/hooks/super-admin/user-management/useOrgAssignment", () => ({
  useOrgDirectory: () => ({ data: DIRECTORY }),
}))

const lastProps = () => tableProps.mock.calls[tableProps.mock.calls.length - 1][0]

beforeEach(() => tableProps.mockClear())

// Skip onboarding starts ticked (2026-10-22), so these tests start from that.
test("with Skip onboarding ticked (the default), organisations are allowed and the directory is passed", () => {
  render(<SuperAdminBulkImport />)
  fireEvent.click(screen.getByText("parse"))
  expect(lastProps()).toMatchObject({ callerRole: "super-admin", organizationAllowed: true, orgDirectory: DIRECTORY })
})

test("unticked, organisations are refused", () => {
  render(<SuperAdminBulkImport />)
  fireEvent.click(screen.getByRole("checkbox"))
  fireEvent.click(screen.getByText("parse"))
  expect(lastProps()).toMatchObject({ organizationAllowed: false, orgDirectory: DIRECTORY })
})
