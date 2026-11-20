/**
 * First-run card: states what the studio is, and offers one action that opens
 * the suggested chapter (or the first chapter when none is suggested).
 */
import { render, screen, fireEvent } from "@testing-library/react"
import BioFirstRunCard from "@/components/user/bio/BioFirstRunCard"

jest.mock("@/lib/bio/clientMemoir", () => ({
  moduleLabel: (m: string) => m.replace("_", " "),
}))

describe("BioFirstRunCard", () => {
  it("says what it is, how long, who can read it and who uses it", () => {
    render(<BioFirstRunCard suggestedModule={null} onStart={jest.fn()} />)
    expect(screen.getByText(/tell your story once/i)).toBeInTheDocument()
    expect(screen.getByText(/a few minutes at a time/i)).toBeInTheDocument()
    expect(screen.getByText(/private to you/i)).toBeInTheDocument()
    expect(screen.getByText(/your coaches use it/i)).toBeInTheDocument()
  })

  it("starts the suggested chapter", () => {
    const onStart = jest.fn()
    render(<BioFirstRunCard suggestedModule="career_story" onStart={onStart} />)
    fireEvent.click(screen.getByRole("button", { name: /start with career story/i }))
    expect(onStart).toHaveBeenCalledWith("career_story")
  })

  it("falls back to the first chapter when none is suggested", () => {
    const onStart = jest.fn()
    render(<BioFirstRunCard suggestedModule={null} onStart={onStart} />)
    fireEvent.click(screen.getByRole("button", { name: /start with life story/i }))
    expect(onStart).toHaveBeenCalledWith("life_story")
  })
})
