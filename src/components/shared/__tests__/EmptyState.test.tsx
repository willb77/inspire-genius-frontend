/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import EmptyState from "../EmptyState"

describe("EmptyState", () => {
  it("renders default title and message", () => {
    render(<EmptyState />)
    expect(screen.getByText("No data yet")).toBeInTheDocument()
    expect(screen.getByText("There's nothing to show here right now.")).toBeInTheDocument()
  })
  it("renders custom title", () => {
    render(<EmptyState title="No clients" message="Add your first client." />)
    expect(screen.getByText("No clients")).toBeInTheDocument()
  })
  it("renders action when provided", () => {
    render(<EmptyState action={<button>Add New</button>} />)
    expect(screen.getByText("Add New")).toBeInTheDocument()
  })
})
