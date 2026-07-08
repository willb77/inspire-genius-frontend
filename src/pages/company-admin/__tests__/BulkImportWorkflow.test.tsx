/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import BulkImport from "../BulkImport";

jest.mock("@/layouts/CompanyAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="company-admin-layout">{children}</div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid={rest["data-testid"]}>
      {children}
    </button>
  ),
}));

// ── Step component mocks that expose callbacks ──

jest.mock("@/components/bulk-import/FileUploader", () => ({
  FileUploader: ({ onParsed }: any) => {
    return (
      <div data-testid="step-upload">
        <button
          data-testid="trigger-upload"
          onClick={() =>
            onParsed([
              { fname: "Jane", lname: "Doe", email1: "jane@test.com", user_type: "user" },
              { fname: "John", lname: "Smith", email1: "john@test.com", user_type: "user" },
            ])
          }
        >
          Upload File
        </button>
      </div>
    );
  },
}));

jest.mock("@/components/bulk-import/DataPreviewTable", () => ({
  DataPreviewTable: ({ records, onProceed }: any) => {
    return (
      <div data-testid="step-validate">
        <span data-testid="record-count">{records?.length ?? 0} records</span>
        <button
          data-testid="trigger-proceed"
          onClick={() =>
            onProceed(
              records.map((r: any) => ({
                ...r,
                email1: r.email1,
                fname: r.fname,
                lname: r.lname,
                user_type: r.user_type ?? "user",
              }))
            )
          }
        >
          Proceed to Import
        </button>
      </div>
    );
  },
}));

jest.mock("@/components/bulk-import/ImportProgress", () => ({
  ImportProgress: ({ isLoading, data, onContinue }: any) => {
    return (
      <div data-testid="step-import">
        {isLoading && <span data-testid="import-loading">Importing...</span>}
        {data && <span data-testid="import-done">Import complete</span>}
        <button data-testid="trigger-import-continue" onClick={onContinue}>
          Continue
        </button>
      </div>
    );
  },
}));

jest.mock("@/components/bulk-import/InvitationComposer", () => ({
  InvitationComposer: ({
    importedUsers,
    onContinue,
  }: any) => {
    return (
      <div data-testid="step-compose">
        <span data-testid="imported-count">
          {importedUsers?.length ?? 0} imported
        </span>
        <button data-testid="trigger-compose-continue" onClick={onContinue}>
          Continue to Send
        </button>
      </div>
    );
  },
}));

jest.mock("@/components/bulk-import/RecipientSelector", () => ({
  RecipientSelector: ({
    selectedIds,
    onSend,
  }: any) => {
    return (
      <div data-testid="step-send">
        <span data-testid="recipient-count">
          {selectedIds?.length ?? 0} selected
        </span>
        <button data-testid="trigger-send" onClick={onSend}>
          Send Invitations
        </button>
      </div>
    );
  },
}));

jest.mock("@/components/bulk-import/DeliveryTracker", () => ({
  DeliveryTracker: ({ isLoading }: any) => (
    <div data-testid="step-track">
      {isLoading && <span>Tracking...</span>}
      <span data-testid="tracker-status">Delivery Tracker</span>
    </div>
  ),
}));

// ── Hook mocks ──

const mockImportMutate = jest.fn();
const mockSendMutate = jest.fn();
const mockResendMutate = jest.fn();

jest.mock("@/hooks/useBulkImport", () => ({
  useBulkImport: () => ({
    mutate: mockImportMutate,
    isPending: false,
    data: null,
  }),
  useBulkDemoInvite: () => ({
    mutate: jest.fn(),
    isPending: false,
    data: undefined,
  }),
  useSendInvitations: () => ({
    mutate: mockSendMutate,
    isPending: false,
  }),
  useInvitationStatus: () => ({
    data: undefined,
    isLoading: false,
  }),
  useResendInvitation: () => ({
    mutate: mockResendMutate,
    isPending: false,
  }),
}));

// ── Tests ──

describe("BulkImportWorkflow — 6-step flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Step 1: starts on upload step and shows FileUploader", () => {
    render(<BulkImport />);
    expect(screen.getByTestId("step-upload")).toBeInTheDocument();
    expect(screen.queryByTestId("step-validate")).not.toBeInTheDocument();
    expect(screen.queryByText("Start Over")).not.toBeInTheDocument();
  });

  it("Step 2: transitions to validate step after file upload", () => {
    render(<BulkImport />);
    fireEvent.click(screen.getByTestId("trigger-upload"));
    expect(screen.getByTestId("step-validate")).toBeInTheDocument();
    expect(screen.getByTestId("record-count")).toHaveTextContent("2 records");
    expect(screen.queryByTestId("step-upload")).not.toBeInTheDocument();
  });

  it("Step 3: transitions to import step after validation", () => {
    render(<BulkImport />);
    // Step 1 -> 2
    fireEvent.click(screen.getByTestId("trigger-upload"));
    // Step 2 -> 3
    fireEvent.click(screen.getByTestId("trigger-proceed"));
    expect(screen.getByTestId("step-import")).toBeInTheDocument();
    expect(mockImportMutate).toHaveBeenCalledTimes(1);
  });

  it("Step 4: transitions to compose step from import", () => {
    render(<BulkImport />);
    fireEvent.click(screen.getByTestId("trigger-upload"));
    fireEvent.click(screen.getByTestId("trigger-proceed"));
    // Step 3 -> 4 (via onContinue callback)
    fireEvent.click(screen.getByTestId("trigger-import-continue"));
    expect(screen.getByTestId("step-compose")).toBeInTheDocument();
  });

  it("Step 5: transitions to send step from compose", () => {
    render(<BulkImport />);
    fireEvent.click(screen.getByTestId("trigger-upload"));
    fireEvent.click(screen.getByTestId("trigger-proceed"));
    fireEvent.click(screen.getByTestId("trigger-import-continue"));
    // Step 4 -> 5
    fireEvent.click(screen.getByTestId("trigger-compose-continue"));
    expect(screen.getByTestId("step-send")).toBeInTheDocument();
  });

  it("shows all 6 step labels in stepper", () => {
    render(<BulkImport />);
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("Validate")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
    expect(screen.getByText("Compose")).toBeInTheDocument();
    expect(screen.getByText("Send")).toBeInTheDocument();
    expect(screen.getByText("Track")).toBeInTheDocument();
  });

  it("shows Start Over button after leaving upload step", () => {
    render(<BulkImport />);
    expect(screen.queryByText("Start Over")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("trigger-upload"));
    expect(screen.getByText("Start Over")).toBeInTheDocument();
  });

  it("Start Over resets to upload step", () => {
    render(<BulkImport />);
    fireEvent.click(screen.getByTestId("trigger-upload"));
    expect(screen.getByTestId("step-validate")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Start Over"));
    expect(screen.getByTestId("step-upload")).toBeInTheDocument();
  });

  it("Back button returns to previous step", () => {
    render(<BulkImport />);
    fireEvent.click(screen.getByTestId("trigger-upload"));
    expect(screen.getByTestId("step-validate")).toBeInTheDocument();
    // Click Back
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByTestId("step-upload")).toBeInTheDocument();
  });

  it("renders the correct heading for company-admin variant", () => {
    render(<BulkImport />);
    expect(screen.getByText("Bulk User Import")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Upload a file to import users and send invitation emails"
      )
    ).toBeInTheDocument();
  });
});
