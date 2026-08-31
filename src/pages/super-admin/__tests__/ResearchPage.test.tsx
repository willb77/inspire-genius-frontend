import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import "@testing-library/jest-dom"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import ResearchPage from "../ResearchPage"

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Stub the two folded pages so we only exercise the consolidation + upload,
// and can assert they're rendered in embedded mode (no double layout).
jest.mock("../DocumentResearchPage", () => ({
  __esModule: true,
  default: ({ embedded }: { embedded?: boolean }) => (
    <div data-testid="doc-research">research embedded={String(!!embedded)}</div>
  ),
}))
jest.mock("../ResearchLibraryPage", () => ({
  __esModule: true,
  default: ({ embedded }: { embedded?: boolean }) => (
    <div data-testid="research-library">library embedded={String(!!embedded)}</div>
  ),
}))

const mutateAsync = jest.fn().mockResolvedValue({})
jest.mock("@/hooks/documents/useDocumentUpload", () => ({
  useDocumentUpload: () => ({ mutateAsync, isPending: false }),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ResearchPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("ResearchPage (consolidated Research surface)", () => {
  beforeEach(() => mutateAsync.mockClear())

  it("renders ONE Research surface with Research / Library / Upload tabs", () => {
    renderPage()
    expect(screen.getByRole("heading", { name: "Research" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Research" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Library" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Upload" })).toBeInTheDocument()
  })

  it("mounts the folded Document Research panel embedded (no double layout)", () => {
    renderPage()
    expect(screen.getByTestId("doc-research")).toHaveTextContent("embedded=true")
  })

  it("uploads via the standard path, tagged as research", async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole("tab", { name: "Upload" }))
    expect(await screen.findByText(/standard document pipeline/i)).toBeInTheDocument()

    const input = screen.getByLabelText(/choose research documents/i) as HTMLInputElement
    const file = new File(["hi"], "notes.pdf", { type: "application/pdf" })
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByRole("button", { name: /upload/i }))

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ file, docKind: "research", tags: ["research"] }),
      ),
    )
  })
})
