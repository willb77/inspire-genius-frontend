/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import ManagerBulkImport from "../BulkImport";

jest.mock("@/layouts/ManagerLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="manager-layout">{children}</div>
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

describe("ManagerBulkImport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders within ManagerLayout", () => {
    render(<ManagerBulkImport />);
    expect(screen.getByTestId("manager-layout")).toBeInTheDocument();
  });

  it("renders page heading", () => {
    render(<ManagerBulkImport />);
    expect(screen.getByText("Bulk Team Import")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Upload a file to import team members and send invitation emails"
      )
    ).toBeInTheDocument();
  });

  it("renders step labels", () => {
    render(<ManagerBulkImport />);
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("Validate")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
    expect(screen.getByText("Compose")).toBeInTheDocument();
    expect(screen.getByText("Send")).toBeInTheDocument();
    expect(screen.getByText("Track")).toBeInTheDocument();
  });

  it("renders FileUploader on initial step", () => {
    render(<ManagerBulkImport />);
    expect(screen.getByTestId("file-uploader")).toBeInTheDocument();
  });

  it("does not show Start Over button on first step", () => {
    render(<ManagerBulkImport />);
    expect(screen.queryByText("Start Over")).not.toBeInTheDocument();
  });
});
