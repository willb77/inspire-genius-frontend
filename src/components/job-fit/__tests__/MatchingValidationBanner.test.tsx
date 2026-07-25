/**
 * @jest-environment jsdom
 *
 * Unit tests for the standardized Job-Fit matching-validation banner: the fixed
 * headline, the default vs. backend-supplied note, the gated caveat, and the
 * accessible role/label.
 */
import { render, screen } from "@testing-library/react"
import { MatchingValidationBanner } from "../MatchingValidationBanner"

describe("MatchingValidationBanner", () => {
  test("renders the standardized headline", () => {
    render(<MatchingValidationBanner />)
    expect(
      screen.getByText(/decision support only — not a validated selection instrument/i)
    ).toBeInTheDocument()
  })

  test("falls back to default guidance copy when no note is supplied", () => {
    render(<MatchingValidationBanner />)
    expect(screen.getByText(/never the\s+sole basis for a hiring/i)).toBeInTheDocument()
  })

  test("renders the backend methodology note when provided", () => {
    const note = "Compares your profile to this role's benchmark for development."
    render(<MatchingValidationBanner note={note} />)
    expect(screen.getByText(note)).toBeInTheDocument()
  })

  test("omits the limited-release line by default", () => {
    render(<MatchingValidationBanner />)
    expect(screen.queryByText(/limited validation release/i)).not.toBeInTheDocument()
  })

  test("shows the limited-release line and uses role=status when gated", () => {
    render(<MatchingValidationBanner gated />)
    expect(screen.getByText(/limited validation release/i)).toBeInTheDocument()
    expect(screen.getByRole("status", { name: /matching validation notice/i })).toBeInTheDocument()
  })

  test("is an accessible note by default", () => {
    render(<MatchingValidationBanner />)
    expect(screen.getByRole("note", { name: /matching validation notice/i })).toBeInTheDocument()
  })
})
