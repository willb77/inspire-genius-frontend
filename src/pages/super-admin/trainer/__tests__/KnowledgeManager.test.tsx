import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import KnowledgeManager from "../KnowledgeManager";

/* ── Mocks ─────────────────────────────────────────────────────── */

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="sa-layout">{children}</div>,
}));

const mockCreateSource = { mutate: jest.fn(), isPending: false };
const mockUploadDoc = { mutate: jest.fn(), isPending: false };
const mockSearchKnowledge = { mutate: jest.fn(), data: null, isPending: false };

const mockSources = [
  { id: "src-1", name: "PRISM Docs", source_type: "manual", document_count: 12 },
  { id: "src-2", name: "FAQ", source_type: "web", document_count: 5 },
];

jest.mock("@/hooks/trainer/useTrainer", () => ({
  useKnowledgeSources: () => ({ data: { data: mockSources } }),
  useCreateKnowledgeSource: () => mockCreateSource,
  useUploadKnowledgeDoc: () => mockUploadDoc,
  useSearchKnowledge: () => mockSearchKnowledge,
  useKnowledgeCoverage: () => ({
    data: { data: { total_documents: 17, total_chunks: 340 } },
  }),
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { email: "admin@test.com", role: "super-admin" },
    isAuthenticated: true,
  }),
}));

/* ── Helpers ───────────────────────────────────────────────────── */

function renderComponent(agentId = "agent-1") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/super-admin/agent-trainer/${agentId}/knowledge`]}>
        <Routes>
          <Route path="/super-admin/agent-trainer/:agentId/knowledge" element={<KnowledgeManager />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/* ── Tests ─────────────────────────────────────────────────────── */

describe("KnowledgeManager", () => {
  beforeEach(() => {
    mockCreateSource.mutate.mockClear();
    mockUploadDoc.mutate.mockClear();
    mockSearchKnowledge.mutate.mockClear();
  });

  it("renders the Knowledge Sources heading", () => {
    renderComponent();
    expect(screen.getByText("Knowledge Sources")).toBeInTheDocument();
  });

  it("displays all knowledge sources in the left panel", () => {
    renderComponent();
    expect(screen.getByText("PRISM Docs")).toBeInTheDocument();
    expect(screen.getByText("FAQ")).toBeInTheDocument();
  });

  it("shows document counts per source", () => {
    renderComponent();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows empty state when no source is selected", () => {
    renderComponent();
    expect(screen.getByText(/Select a knowledge source/)).toBeInTheDocument();
  });

  it("creates a new source when name entered and button clicked", () => {
    renderComponent();
    const input = screen.getByPlaceholderText("New source...");
    fireEvent.change(input, { target: { value: "New KB" } });
    // The create button is the one with FolderPlus icon inside the source creation area
    const createBtn = input.parentElement!.querySelector("button")!;
    fireEvent.click(createBtn);
    expect(mockCreateSource.mutate).toHaveBeenCalledWith({
      agentId: "agent-1",
      payload: { name: "New KB" },
    });
  });

  it("shows coverage stats when a source is selected", () => {
    renderComponent();
    // Click on a source to select it
    fireEvent.click(screen.getByText("PRISM Docs"));
    expect(screen.getByText(/17 docs/)).toBeInTheDocument();
    expect(screen.getByText(/340 chunks/)).toBeInTheDocument();
  });

  it("renders the search input for testing relevance", () => {
    renderComponent();
    expect(screen.getByPlaceholderText("Test relevance...")).toBeInTheDocument();
  });

  it("renders the Upload button", () => {
    renderComponent();
    expect(screen.getByText("Upload")).toBeInTheDocument();
  });
});
