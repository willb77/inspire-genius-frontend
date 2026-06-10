import { render, screen } from "@testing-library/react"

jest.mock("@inspiresgenius/dag-builder", () => ({
  DagBuilder: ({ onSave }: { onSave: (t: unknown) => void }) => (
    <div data-testid="dag-builder">
      <button onClick={() => onSave({ id: "test" })}>Save</button>
    </div>
  ),
  createIGConfig: (apiBaseUrl: string) => ({
    apiBaseUrl,
    adapter: { toApiFormat: (t: unknown) => t, fromApiFormat: (d: unknown) => d },
  }),
  // The page now instantiates TemplateApiClient at the page level — its
  // methods are not exercised in these tests, but the constructor must
  // exist as a callable so `new TemplateApiClient(...)` does not throw.
  TemplateApiClient: class {
    constructor(_baseUrl: string, _adapter: unknown, _httpClient?: unknown) {}
    async list() { return [] }
    async get() { return null }
    async create(t: unknown) { return t }
    async update(_id: string, t: unknown) { return t }
    async delete() { return undefined }
  },
  igAdapter: { toApiFormat: (t: unknown) => t, fromApiFormat: (d: unknown) => d },
}), { virtual: true })

import ProcessBuilderPage from "../ProcessBuilder"

describe("ProcessBuilderPage", () => {
  it("renders the DAG builder", () => {
    render(<ProcessBuilderPage />)
    expect(screen.getByTestId("dag-builder")).toBeInTheDocument()
  })

  it("renders within a full-screen container", () => {
    const { container } = render(<ProcessBuilderPage />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain("h-screen")
    expect(wrapper.className).toContain("w-screen")
  })
})
