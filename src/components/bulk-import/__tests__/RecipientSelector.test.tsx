import { render, screen, fireEvent } from "@testing-library/react"
import { RecipientSelector } from "../RecipientSelector"
import type { ImportedUser } from "@/types/bulk-import"

const mockUsers: ImportedUser[] = [
  { user_id: "1", fname: "Jane", lname: "Smith", email1: "jane@co.com", user_type: "manager" },
  { user_id: "2", fname: "John", lname: "Doe", email1: "john@co.com", user_type: "user" },
  { user_id: "3", fname: "Alice", lname: "Park", email1: "alice@co.com", user_type: "user" },
]

describe("RecipientSelector", () => {
  const defaultProps = {
    users: mockUsers,
    selectedIds: [] as string[],
    onSelectedIdsChange: jest.fn(),
    onSend: jest.fn(),
    isSending: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders user list with checkboxes", () => {
    render(<RecipientSelector {...defaultProps} />)

    expect(screen.getByText(/Jane/)).toBeInTheDocument()
    expect(screen.getByText(/John/)).toBeInTheDocument()
    expect(screen.getByText(/Alice/)).toBeInTheDocument()

    const checkboxes = screen.getAllByRole("checkbox")
    // At least 3 user checkboxes + 1 select-all
    expect(checkboxes.length).toBeGreaterThanOrEqual(3)
  })

  it("send button disabled when none selected", () => {
    render(<RecipientSelector {...defaultProps} selectedIds={[]} />)

    const sendBtn = screen.getByRole("button", { name: /send/i })
    expect(sendBtn).toBeDisabled()
  })

  it("shows selection count", () => {
    const { container } = render(
      <RecipientSelector {...defaultProps} selectedIds={["1"]} />,
    )
    const text = container.textContent ?? ""
    // Should mention 1 selected
    expect(text).toContain("1")
  })

  it("search filters users by name", () => {
    render(<RecipientSelector {...defaultProps} />)

    const searchInput = screen.getByPlaceholderText(/search/i)
    fireEvent.change(searchInput, { target: { value: "Jane" } })

    expect(screen.getByText(/Jane/)).toBeInTheDocument()
    expect(screen.queryByText(/John/)).not.toBeInTheDocument()
  })

  it("send button enabled when users are selected", () => {
    render(
      <RecipientSelector {...defaultProps} selectedIds={["1", "2"]} />,
    )

    const sendBtn = screen.getByRole("button", { name: /send/i })
    expect(sendBtn).not.toBeDisabled()
  })
})
