/**
 * @jest-environment jsdom
 */

jest.mock("@/lib/axios", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn(), eject: jest.fn() },
      response: { use: jest.fn(), eject: jest.fn() },
    },
  },
}));

import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Documents from "../Documents";
import DocumentsV2 from "../DocumentsV2";
import {
  useDocuments,
  useDownloadDocumentV2,
  useDeleteDocumentV2,
  useBulkDeleteDocumentsV2,
  useMarkDocumentAsPrism,
  useSearchDocumentsV2,
} from "@/hooks/documents/useDocuments";

/* ---- Mocks ---- */

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-layout">{children}</div>
  ),
}));

jest.mock("@/components/ui/icon-input", () => ({
  __esModule: true,
  default: ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
}));

jest.mock("@/components/user/chat/DocumentIframeModal", () => ({
  __esModule: true,
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="document-viewer" /> : null,
}));

jest.mock("@/components/user/documents/UploadDocumentsModal", () => ({
  __esModule: true,
  default: ({ open, onOpenChange }: any) =>
    open ? (
      <div data-testid="upload-modal">
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

jest.mock("@/components/shared/ConfirmDialog", () => ({
  __esModule: true,
  default: ({ trigger, onConfirm }: any) => (
    <div>
      {trigger}
      <button data-testid="confirm-delete" onClick={onConfirm}>
        Confirm
      </button>
    </div>
  ),
}));

jest.mock("@/components/shared/Pagination", () => ({
  __esModule: true,
  default: () => <div data-testid="pagination" />,
}));

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: () => <div data-testid="date-picker" />,
}));

jest.mock("@/hooks/documents/useDocuments", () => ({
  useDocuments: jest.fn(),
  useDownloadDocumentV2: jest.fn(),
  useDeleteDocumentV2: jest.fn(),
  useBulkDeleteDocumentsV2: jest.fn(),
  useMarkDocumentAsPrism: jest.fn(),
  useSearchDocumentsV2: jest.fn(),
}));

const mockUseDocuments = useDocuments as jest.MockedFunction<typeof useDocuments>;
const mockUseDownloadDocumentV2 = useDownloadDocumentV2 as jest.MockedFunction<typeof useDownloadDocumentV2>;
const mockUseDeleteDocumentV2 = useDeleteDocumentV2 as jest.MockedFunction<typeof useDeleteDocumentV2>;
const mockUseBulkDeleteDocumentsV2 = useBulkDeleteDocumentsV2 as jest.MockedFunction<typeof useBulkDeleteDocumentsV2>;
const mockUseMarkDocumentAsPrism = useMarkDocumentAsPrism as jest.MockedFunction<typeof useMarkDocumentAsPrism>;
const mockUseSearchDocumentsV2 = useSearchDocumentsV2 as jest.MockedFunction<typeof useSearchDocumentsV2>;

/* ---- Helpers ---- */

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

const NOW = new Date();
const MOCK_DOCS = {
  documents: [
    { id: "d1", filename: "report.pdf", doc_kind: "pdf", created_at: NOW.toISOString() },
    { id: "d2", filename: "data.csv", doc_kind: "csv", created_at: NOW.toISOString() },
  ],
  total: 2,
};

/* ---- Tests ---- */

describe("Documents Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseDocuments.mockReturnValue({
      data: MOCK_DOCS,
      isLoading: false,
      isFetching: false,
    } as any);

    mockUseDownloadDocumentV2.mockReturnValue({ mutateAsync: jest.fn() } as any);
    mockUseDeleteDocumentV2.mockReturnValue({ mutateAsync: jest.fn(), isPending: false } as any);
    mockUseBulkDeleteDocumentsV2.mockReturnValue({ mutateAsync: jest.fn(), isPending: false } as any);
    mockUseMarkDocumentAsPrism.mockReturnValue({ mutateAsync: jest.fn(), isPending: false } as any);
    mockUseSearchDocumentsV2.mockReturnValue({ data: undefined, mutate: jest.fn() } as any);
  });

  it("renders page header", () => {
    render(<Documents />, { wrapper: createWrapper() });
    expect(screen.getByText("Document Library")).toBeInTheDocument();
  });

  it("renders upload button", () => {
    render(<Documents />, { wrapper: createWrapper() });
    expect(screen.getByText("Upload Document")).toBeInTheDocument();
  });

  it("renders document list", () => {
    render(<Documents />, { wrapper: createWrapper() });
    expect(screen.getByText("report.pdf")).toBeInTheDocument();
    expect(screen.getByText("data.csv")).toBeInTheDocument();
  });

  it("shows loading skeletons when fetching", () => {
    mockUseDocuments.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: true,
    } as any);

    render(<Documents />, { wrapper: createWrapper() });
    // Skeletons are rendered as generic elements during loading
    expect(screen.queryByText("report.pdf")).not.toBeInTheDocument();
  });

  it("shows empty state when no documents", () => {
    mockUseDocuments.mockReturnValue({
      data: { documents: [], total: 0 },
      isLoading: false,
      isFetching: false,
    } as any);

    render(<Documents />, { wrapper: createWrapper() });
    expect(screen.getByText("No files found")).toBeInTheDocument();
    expect(screen.getByText("Click Upload to add files")).toBeInTheDocument();
  });

  it("opens upload modal when upload button clicked", () => {
    render(<Documents />, { wrapper: createWrapper() });

    // There are multiple "Upload document" buttons; click the first
    const buttons = screen.getAllByText("Upload Document");
    fireEvent.click(buttons[0]);

    expect(screen.getByTestId("upload-modal")).toBeInTheDocument();
  });

  it("shows search-specific empty state", () => {
    mockUseDocuments.mockReturnValue({
      data: { documents: [], total: 0 },
      isLoading: false,
      isFetching: false,
    } as any);

    render(<Documents />, { wrapper: createWrapper() });

    const searchInput = screen.getByTestId("search-input");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });

    expect(screen.getByText("No files found")).toBeInTheDocument();
    expect(screen.getByText("No documents match your search.")).toBeInTheDocument();
  });

  it("renders kind badges for documents", () => {
    render(<Documents />, { wrapper: createWrapper() });
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("CSV")).toBeInTheDocument();
  });

  it("shows a 'Mark as my PRISM report' button on each non-PRISM row", () => {
    render(<Documents />, { wrapper: createWrapper() });
    const markButtons = screen.getAllByLabelText("Mark as my PRISM report");
    expect(markButtons).toHaveLength(2);
  });

  it("calls useMarkDocumentAsPrism.mutateAsync when the star is clicked", () => {
    const mutateAsync = jest.fn().mockResolvedValue({ id: "d1", doc_kind: "prism" });
    mockUseMarkDocumentAsPrism.mockReturnValue({ mutateAsync, isPending: false } as any);

    render(<Documents />, { wrapper: createWrapper() });
    const markButtons = screen.getAllByLabelText("Mark as my PRISM report");
    fireEvent.click(markButtons[0]);

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith("d1");
  });

  it("renders a filled star indicator instead of a button on rows already tagged 'prism'", () => {
    mockUseDocuments.mockReturnValue({
      data: {
        documents: [
          { id: "p1", filename: "WAB 2nd PRISM Rpt.csv", doc_kind: "prism", created_at: NOW.toISOString() },
          { id: "d1", filename: "notes.pdf", doc_kind: "pdf", created_at: NOW.toISOString() },
        ],
        total: 2,
      },
      isLoading: false,
      isFetching: false,
    } as any);

    render(<Documents />, { wrapper: createWrapper() });
    // Only the non-PRISM row gets the actionable button
    const markButtons = screen.getAllByLabelText("Mark as my PRISM report");
    expect(markButtons).toHaveLength(1);
    // The PRISM row has the read-only indicator
    expect(screen.getByLabelText("Marked as my PRISM report")).toBeInTheDocument();
  });
});

describe("DocumentsV2 — the surface that actually ships", () => {
  // VITE_NEW_USER_SURFACES=true in CI, so DocumentsSurface renders V2 in every
  // deployed environment while the legacy page above only appears behind the
  // toggle. V2 had no test file at all, so its heading was unguarded.
  it("uses the same 'Document Library' heading as the legacy surface", () => {
    render(<DocumentsV2 />, { wrapper: createWrapper() });
    expect(screen.getByText("Document Library")).toBeInTheDocument();
  });
});
