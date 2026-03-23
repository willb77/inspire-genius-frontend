/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react"
import ErrorState from "../ErrorState"

describe("ErrorState", () => {
  it("renders default error message", () => {
    render(<ErrorState />)
    expect(screen.getByText("Something went wrong")).toBeInTheDocument()
  })
  it("renders retry button when onRetry provided", () => {
    const onRetry = jest.fn()
    render(<ErrorState onRetry={onRetry} />)
    fireEvent.click(screen.getByText("Try Again"))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
  it("does not render retry without onRetry", () => {
    render(<ErrorState />)
    expect(screen.queryByText("Try Again")).not.toBeInTheDocument()
  })
})
