/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import BulkImport from "../BulkImport";

jest.mock("@/layouts/CompanyAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="company-admin-layout">{children}</div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...rest }: any) => (
    <button onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/bulk-import/FileUploader", () => ({
  FileUploader: ({ onParsed }: any) => (
    <div data-testid="file-uploader">
      <button onClick={() => onParsed([{ fname: "Test", lname: "User", email1: "test@test.com" }])}>
        Upload Mock
      </button>
    </div>
  ),
}));

jest.mock("@/components/bulk-import/DataPreviewTable", () => ({
  DataPreviewTable: () => <div data-testid="data-preview-table" />,
}));

jest.mock("@/components/bulk-import/ImportProgress", () => ({
  ImportProgress: () => <div data-testid="import-progress" />,
}));

jest.mock("@/components/bulk-import/InvitationComposer", () => ({
  InvitationComposer: () => <div data-testid="invitation-composer" />,
}));

jest.mock("@/components/bulk-import/RecipientSelector", () => ({
  RecipientSelector: () => <div data-testid="recipient-selector" />,
}));

jest.mock("@/components/bulk-import/DeliveryTracker", () => ({
  DeliveryTracker: () => <div data-testid="delivery-tracker" />,
}));

jest.mock("@/hooks/useBulkImport", () => ({
  useBulkImport: () => ({
    mutate: jest.fn(),
    isPending: false,
    data: null,
  }),
  useBulkDemoInvite: () => ({
    mutate: jest.fn(),
    isPending: false,
    data: undefined,
  }),
  useSendInvitations: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
  useInvitationStatus: () => ({
    data: undefined,
    isLoading: false,
  }),
  useResendInvitation: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
}));

describe("CompanyAdminBulkImport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within CompanyAdminLayout", () => {
    render(<BulkImport />);
    expect(screen.getByTestId("company-admin-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<BulkImport />);
    expect(screen.getByText("Bulk User Import")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Upload a file to import users and send invitation emails"
      )
    ).toBeInTheDocument();
  });

  it("renders step labels", () => {
    render(<BulkImport />);
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("Validate")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
    expect(screen.getByText("Compose")).toBeInTheDocument();
    expect(screen.getByText("Send")).toBeInTheDocument();
    expect(screen.getByText("Track")).toBeInTheDocument();
  });

  it("renders FileUploader on initial step", () => {
    render(<BulkImport />);
    expect(screen.getByTestId("file-uploader")).toBeInTheDocument();
  });

  it("does not show Start Over button on first step", () => {
    render(<BulkImport />);
    expect(screen.queryByText("Start Over")).not.toBeInTheDocument();
  });
});
