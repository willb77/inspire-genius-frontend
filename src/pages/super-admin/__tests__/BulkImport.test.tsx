import { render, screen } from "@testing-library/react"
import SuperAdminBulkImport from "../BulkImport"
import React from "react"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}))

jest.mock("@/components/bulk-import/FileUploader", () => ({
  FileUploader: () => <div data-testid="file-uploader">FileUploader</div>,
}))
jest.mock("@/components/bulk-import/DataPreviewTable", () => ({
  DataPreviewTable: () => <div data-testid="data-preview-table" />,
}))
jest.mock("@/components/bulk-import/ImportProgress", () => ({
  ImportProgress: () => <div data-testid="import-progress" />,
}))
jest.mock("@/components/bulk-import/InvitationComposer", () => ({
  InvitationComposer: () => <div data-testid="invitation-composer" />,
}))
jest.mock("@/components/bulk-import/RecipientSelector", () => ({
  RecipientSelector: () => <div data-testid="recipient-selector" />,
}))
jest.mock("@/components/bulk-import/DeliveryTracker", () => ({
  DeliveryTracker: () => <div data-testid="delivery-tracker" />,
}))

jest.mock("@/hooks/useBulkImport", () => ({
  useBulkImport: () => ({ mutate: jest.fn(), isPending: false, data: null }),
  useBulkDemoInvite: () => ({ mutate: jest.fn(), isPending: false, data: undefined }),
  useSendInvitations: () => ({ mutate: jest.fn(), isPending: false }),
  useInvitationStatus: () => ({ data: null, isLoading: false }),
  useResendInvitation: () => ({ mutate: jest.fn(), isPending: false }),
}))

describe("SuperAdminBulkImport", () => {
  it("renders the page title", () => {
    render(<SuperAdminBulkImport />)
    expect(screen.getByText("Bulk User Import")).toBeInTheDocument()
  })

  it("renders step labels", () => {
    render(<SuperAdminBulkImport />)
    expect(screen.getByText("Upload")).toBeInTheDocument()
    expect(screen.getByText("Validate")).toBeInTheDocument()
    expect(screen.getByText("Import")).toBeInTheDocument()
    expect(screen.getByText("Compose")).toBeInTheDocument()
    expect(screen.getByText("Send")).toBeInTheDocument()
    expect(screen.getByText("Track")).toBeInTheDocument()
  })

  it("renders file uploader on first step", () => {
    render(<SuperAdminBulkImport />)
    expect(screen.getByTestId("file-uploader")).toBeInTheDocument()
  })

  it("does not show Start Over button on first step", () => {
    render(<SuperAdminBulkImport />)
    expect(screen.queryByText("Start Over")).not.toBeInTheDocument()
  })

  it("wraps content in SuperAdminLayout", () => {
    render(<SuperAdminBulkImport />)
    expect(screen.getByTestId("super-admin-layout")).toBeInTheDocument()
  })
})
