/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react"
import HonorHelpMenu from "../HonorHelpMenu"
import { GUIDE_LINKS } from "@/components/shared/layout/helpSupportLinks"

// Radix DropdownMenu relies on a few DOM APIs jsdom does not implement.
beforeAll(() => {
  window.PointerEvent =
    window.PointerEvent || (MouseEvent as unknown as typeof PointerEvent)
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || (() => false)
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || (() => {})
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || (() => {})
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {})
})

describe("HonorHelpMenu (Honor sidebar footer)", () => {
  it("renders a Help / Support trigger", () => {
    render(<HonorHelpMenu />)
    expect(screen.getByRole("button", { name: /help and support/i })).toBeInTheDocument()
  })

  it("opens a menu linking to the web guide, slide deck, and Word doc — each in a new tab", () => {
    render(<HonorHelpMenu />)
    // Radix opens on pointer-down (left button), not on a synthetic click.
    const trigger = screen.getByRole("button", { name: /help and support/i })
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
    fireEvent.pointerUp(trigger, { button: 0 })

    const web = screen.getByRole("menuitem", { name: /user guide \(web\)/i })
    const deck = screen.getByRole("menuitem", { name: /slide deck/i })
    const word = screen.getByRole("menuitem", { name: /word version/i })

    expect(web).toHaveAttribute("href", GUIDE_LINKS.html)
    expect(deck).toHaveAttribute("href", GUIDE_LINKS.pptx)
    expect(word).toHaveAttribute("href", GUIDE_LINKS.docx)
    for (const link of [web, deck, word]) {
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"))
    }
  })
})
