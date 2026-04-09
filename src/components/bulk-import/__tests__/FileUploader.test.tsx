import { render } from "@testing-library/react"
import { FileUploader } from "../FileUploader"

jest.mock("@/lib/bulk-import/parsers", () => ({
  parseFile: jest.fn(),
  SUPPORTED_EXTENSIONS: [".csv", ".json", ".xlsx", ".xls", ".xml"],
  MAX_FILE_SIZE: 10 * 1024 * 1024,
}))

describe("FileUploader", () => {
  const mockOnParsed = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders upload zone", () => {
    const { container } = render(<FileUploader onParsed={mockOnParsed} />)
    // Should render a card with drag-drop instructions
    expect(container.querySelector("[data-slot='card']")).toBeTruthy()
  })

  it("shows supported formats text", () => {
    const { container } = render(<FileUploader onParsed={mockOnParsed} />)
    const text = (container.textContent ?? "").toLowerCase()
    expect(text).toContain("csv")
  })

  it("does not call onParsed before file is selected", () => {
    render(<FileUploader onParsed={mockOnParsed} />)
    expect(mockOnParsed).not.toHaveBeenCalled()
  })

  it("has a hidden file input", () => {
    const { container } = render(<FileUploader onParsed={mockOnParsed} />)
    const fileInput = container.querySelector("input[type='file']")
    expect(fileInput).toBeTruthy()
  })
})
