import { render, screen } from "@testing-library/react"

jest.mock("@inspiresgenius/dag-builder", () => ({
  DagBuilder: ({ onSave }: { onSave: (t: unknown) => void }) => (
    <div data-testid="dag-builder">
      <button onClick={() => onSave({ id: "test" })}>Save</button>
    </div>
  ),
  createIGConfig: () => ({ url: "http://localhost:8001" }),
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
