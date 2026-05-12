import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import "@testing-library/jest-dom"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import KnowledgeBase from "../KnowledgeBase"

type Children = { children?: React.ReactNode }
type Labelled = Children & { value?: string; onClick?: () => void; [key: string]: unknown }

// ── Layout & UI mocks ────────────────────────────────────────────────
jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: Children) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}))

jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: Children) => <div>{children}</div>,
  CardContent: ({ children }: Children) => <div>{children}</div>,
  CardHeader: ({ children }: Children) => <div>{children}</div>,
  CardTitle: ({ children }: Children) => <div>{children}</div>,
}))

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: Children) => <span>{children}</span>,
}))

jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...rest }: Labelled) => (
    <button onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}))

jest.mock("@/components/ui/select", () => ({
  Select: ({ children, value }: Labelled) => (
    <div data-testid="domain-select" data-value={value}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: Children) => <div>{children}</div>,
  SelectItem: ({ children, value }: Labelled) => (
    <div data-testid={`select-option-${value ?? ""}`}>{children}</div>
  ),
  SelectTrigger: ({ children }: Children) => <div>{children}</div>,
  SelectValue: () => <span />,
}))

type DocLite = { id: string; filename: string }

jest.mock("@/components/super-admin/organization/DataTable", () => ({
  DataTable: ({ data }: { data?: DocLite[] }) => (
    <div data-testid="data-table">
      {(data ?? []).map((row) => (
        <div key={row.id} data-testid={`doc-row-${row.id}`}>
          {row.filename}
        </div>
      ))}
    </div>
  ),
}))

jest.mock("@/components/shared/Pagination", () => ({
  __esModule: true,
  default: () => <div data-testid="pagination" />,
}))

jest.mock("@/components/shared/LoadingSkeleton", () => ({
  __esModule: true,
  default: () => <div data-testid="loading-skeleton" />,
}))

jest.mock("@/components/super-admin/UploadKnowledgeModal", () => ({
  __esModule: true,
  default: () => <div data-testid="upload-modal" />,
}))

jest.mock("lucide-react", () => ({
  BookOpen: () => <svg />,
  Plus: () => <svg />,
  Trash2: () => <svg />,
  RefreshCw: () => <svg />,
  FileText: () => <svg />,
  Database: () => <svg />,
}))

// ── Hook spy: capture params passed to useKnowledgeDocuments ────────
type ListParams = { domain?: string; limit?: number; offset?: number }
const useKnowledgeDocumentsSpy = jest.fn<void, [ListParams]>()

const CULTURAL_DOC = {
  id: "doc-cultural-1",
  filename: "us_regional_norms.md",
  file_type: "regional",
  domain: "cultural",
  agent_id: null,
  embedding_status: "completed",
  chunk_count: 12,
  text_length: 4200,
  is_active: true,
  created_at: "2026-05-01T00:00:00Z",
  updated_at: null,
}

const COACHING_DOC = {
  id: "doc-coaching-1",
  filename: "prism_gold_traits.md",
  file_type: "general",
  domain: "coaching",
  agent_id: "aura",
  embedding_status: "completed",
  chunk_count: 8,
  text_length: 3100,
  is_active: true,
  created_at: "2026-05-02T00:00:00Z",
  updated_at: null,
}

jest.mock("@/hooks/super-admin/knowledge/useKnowledge", () => ({
  useKnowledgeDocuments: (params: ListParams) => {
    useKnowledgeDocumentsSpy(params)
    // Simulate the server-side filter: when domain=cultural is passed,
    // only cultural docs are returned. Otherwise all docs are returned.
    const all = [CULTURAL_DOC, COACHING_DOC]
    const filtered =
      params?.domain === "cultural"
        ? all.filter((d) => d.domain === "cultural")
        : all
    return {
      data: { documents: filtered, total: filtered.length },
      isLoading: false,
    }
  },
  useDeleteKnowledge: () => ({ mutate: jest.fn(), isPending: false }),
  useRevectorize: () => ({ mutate: jest.fn(), isPending: false }),
}))

function renderWithRoute(initialUrl: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialUrl]}>
        <Routes>
          <Route path="/super-admin/knowledge-base" element={<KnowledgeBase />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function lastCallParams(): ListParams {
  const calls = useKnowledgeDocumentsSpy.mock.calls
  return calls[calls.length - 1][0]
}

describe("KnowledgeBase — domain query param + filter chips", () => {
  beforeEach(() => {
    useKnowledgeDocumentsSpy.mockClear()
  })

  it("defaults to all domains when no ?domain= is set", () => {
    renderWithRoute("/super-admin/knowledge-base")

    expect(lastCallParams()).not.toHaveProperty("domain")
    expect(screen.getByTestId("doc-row-doc-cultural-1")).toBeInTheDocument()
    expect(screen.getByTestId("doc-row-doc-coaching-1")).toBeInTheDocument()
  })

  it("?domain=cultural narrows the displayed KB items to the cultural taxonomy", () => {
    renderWithRoute("/super-admin/knowledge-base?domain=cultural")

    // Hook receives domain=cultural, so only cultural docs come back.
    expect(lastCallParams()).toMatchObject({ domain: "cultural" })

    // The cultural doc is rendered; the coaching doc is not.
    expect(screen.getByTestId("doc-row-doc-cultural-1")).toBeInTheDocument()
    expect(
      screen.queryByTestId("doc-row-doc-coaching-1"),
    ).not.toBeInTheDocument()
  })

  it("renders saved-filter chips with Cultural Only marked active when ?domain=cultural", () => {
    renderWithRoute("/super-admin/knowledge-base?domain=cultural")

    const culturalChip = screen.getByRole("button", { name: "Cultural Only" })
    expect(culturalChip).toHaveAttribute("aria-pressed", "true")

    const allChip = screen.getByRole("button", { name: "All" })
    expect(allChip).toHaveAttribute("aria-pressed", "false")
  })

  it("clicking a chip switches the active domain and reissues the query", () => {
    renderWithRoute("/super-admin/knowledge-base")

    fireEvent.click(screen.getByRole("button", { name: "Cultural Only" }))

    expect(lastCallParams()).toMatchObject({ domain: "cultural" })
    expect(
      screen.queryByTestId("doc-row-doc-coaching-1"),
    ).not.toBeInTheDocument()
  })

  it("ignores an invalid ?domain= value and falls back to all", () => {
    renderWithRoute("/super-admin/knowledge-base?domain=not-a-real-domain")
    expect(lastCallParams()).not.toHaveProperty("domain")
  })
})
