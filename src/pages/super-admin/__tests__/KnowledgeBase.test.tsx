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
type ColLite = { key: string; header: string; render: (row: DocLite) => React.ReactNode }

// Renders each column's own `render` output, keyed by header. The previous
// mock printed only the filename, which is why a "Domain" column displaying
// MIME types passed its tests for months — the cell was never rendered.
jest.mock("@/components/super-admin/organization/DataTable", () => ({
  DataTable: ({ data, columns }: { data?: DocLite[]; columns?: ColLite[] }) => (
    <div data-testid="data-table">
      {(data ?? []).map((row) => (
        <div key={row.id} data-testid={`doc-row-${row.id}`}>
          {row.filename}
          {(columns ?? []).map((col) => (
            <span key={col.key} data-testid={`cell-${row.id}-${col.header || col.key}`}>
              {col.render(row)}
            </span>
          ))}
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

// `file_type` carries the MIME type (the API selects it from
// `documents.content_type`) and `domain` the derived knowledge domain. They
// are different axes; the bug fixed on 2026-08-11 was the Domain column
// rendering the former.
const CULTURAL_DOC = {
  id: "doc-cultural-1",
  filename: "us_regional_norms.md",
  file_type: "text/markdown",
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
  file_type: "text/markdown",
  domain: "coaching",
  agent_id: "aura",
  embedding_status: "completed",
  chunk_count: 8,
  text_length: 3100,
  is_active: true,
  created_at: "2026-05-02T00:00:00Z",
  updated_at: null,
}

// The shape that actually dominates staging-b: a personal upload with no
// domain signal. 121 of 147 rows there look like this.
const UNCATEGORISED_DOC = {
  id: "doc-uncat-1",
  filename: "Stewart_Withrow_resume.pdf",
  file_type: "application/pdf",
  domain: null,
  agent_id: null,
  embedding_status: "pending",
  chunk_count: 0,
  text_length: 8100,
  is_active: true,
  created_at: "2026-08-01T00:00:00Z",
  updated_at: null,
}

// Facet counts are NOT narrowed by the active domain — that is the whole
// point of them, so the mock returns the same map whatever is selected.
const DOMAIN_COUNTS = { cultural: 1, coaching: 1, uncategorised: 1 }

jest.mock("@/hooks/super-admin/knowledge/useKnowledge", () => ({
  useKnowledgeDocuments: (params: ListParams) => {
    useKnowledgeDocumentsSpy(params)
    // Simulate the server-side filter over the DERIVED domain, including the
    // `uncategorised` sentinel, which server-side is an IS NULL test.
    const all = [CULTURAL_DOC, COACHING_DOC, UNCATEGORISED_DOC]
    const wanted = params?.domain
    const filtered = !wanted
      ? all
      : wanted === "uncategorised"
        ? all.filter((d) => d.domain === null)
        : all.filter((d) => d.domain === wanted)
    return {
      data: {
        documents: filtered,
        total: filtered.length,
        domain_counts: DOMAIN_COUNTS,
      },
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

  it("renders saved-filter chips with Cultural marked active when ?domain=cultural", () => {
    renderWithRoute("/super-admin/knowledge-base?domain=cultural")

    const culturalChip = screen.getByRole("button", { name: /^Cultural/ })
    expect(culturalChip).toHaveAttribute("aria-pressed", "true")

    const allChip = screen.getByRole("button", { name: /^All/ })
    expect(allChip).toHaveAttribute("aria-pressed", "false")
  })

  it("clicking a chip switches the active domain and reissues the query", () => {
    renderWithRoute("/super-admin/knowledge-base")

    fireEvent.click(screen.getByRole("button", { name: /^Cultural/ }))

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

// ── The two defects reported on 2026-08-11 ──────────────────────────
describe("KnowledgeBase — Domain column", () => {
  beforeEach(() => useKnowledgeDocumentsSpy.mockClear())

  it("shows the domain, not the MIME type", () => {
    renderWithRoute("/super-admin/knowledge-base")

    const cell = screen.getByTestId("cell-doc-cultural-1-Domain")
    expect(cell).toHaveTextContent("Cultural Context")
    // The regression: this cell used to render `file_type`.
    expect(cell).not.toHaveTextContent("text/markdown")
  })

  it("keeps the MIME type, under its own Type header, abbreviated", () => {
    renderWithRoute("/super-admin/knowledge-base")

    expect(screen.getByTestId("cell-doc-uncat-1-Type")).toHaveTextContent("PDF")
    expect(screen.getByTestId("cell-doc-uncat-1-Domain")).toHaveTextContent(
      "Uncategorised",
    )
  })

  it("labels a null domain rather than defaulting it to General", () => {
    // The old cell fell back to the literal "general" for a missing value,
    // which is a claim about the document rather than an absence of one.
    renderWithRoute("/super-admin/knowledge-base")
    const cell = screen.getByTestId("cell-doc-uncat-1-Domain")
    expect(cell).toHaveTextContent("Uncategorised")
    expect(cell).not.toHaveTextContent("General")
  })
})

describe("KnowledgeBase — uncategorised rows are reachable", () => {
  beforeEach(() => useKnowledgeDocumentsSpy.mockClear())

  it("offers an Uncategorised chip that filters on the sentinel", () => {
    renderWithRoute("/super-admin/knowledge-base")

    fireEvent.click(screen.getByRole("button", { name: /^Uncategorised/ }))

    expect(lastCallParams()).toMatchObject({ domain: "uncategorised" })
    expect(screen.getByTestId("doc-row-doc-uncat-1")).toBeInTheDocument()
    expect(screen.queryByTestId("doc-row-doc-cultural-1")).not.toBeInTheDocument()
  })

  it("accepts ?domain=uncategorised from the URL", () => {
    renderWithRoute("/super-admin/knowledge-base?domain=uncategorised")
    expect(lastCallParams()).toMatchObject({ domain: "uncategorised" })
  })
})

describe("KnowledgeBase — facet counts", () => {
  beforeEach(() => useKnowledgeDocumentsSpy.mockClear())

  it("shows each domain's count on its chip, including empty ones", () => {
    renderWithRoute("/super-admin/knowledge-base")

    expect(screen.getByRole("button", { name: /^Cultural/ })).toHaveTextContent(
      "Cultural1",
    )
    // Business holds nothing — an explicit 0 is the evidence that the filter
    // ran and the domain is empty, which is what a blank table cannot say.
    expect(screen.getByRole("button", { name: /^Business/ })).toHaveTextContent(
      "Business0",
    )
  })

  it("counts do not narrow when a domain is selected", () => {
    renderWithRoute("/super-admin/knowledge-base?domain=cultural")
    expect(screen.getByRole("button", { name: /^Coaching/ })).toHaveTextContent(
      "Coaching1",
    )
  })

  it("All sums the facets", () => {
    renderWithRoute("/super-admin/knowledge-base")
    expect(screen.getByRole("button", { name: /^All/ })).toHaveTextContent("All3")
  })
})
