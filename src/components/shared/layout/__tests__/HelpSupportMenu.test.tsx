/**
 * @jest-environment jsdom
 */
// jsdom does not implement matchMedia; the sidebar's useIsMobile reads it.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});

import { render, screen, fireEvent } from "@testing-library/react";
import { SidebarProvider } from "@/components/ui/sidebar";
import HelpSupportMenu from "../HelpSupportMenu";
import { GUIDE_LINKS } from "../helpSupportLinks";

// Radix DropdownMenu relies on a few DOM APIs jsdom does not implement.
beforeAll(() => {
  window.PointerEvent =
    window.PointerEvent || (MouseEvent as unknown as typeof PointerEvent);
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture || (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || (() => {});
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
});

const renderMenu = () =>
  render(
    <SidebarProvider>
      <HelpSupportMenu />
    </SidebarProvider>,
  );

describe("HelpSupportMenu", () => {
  it("renders a Help / Support trigger in the sidebar footer", () => {
    renderMenu();
    expect(
      screen.getByRole("button", { name: /help and support/i }),
    ).toBeInTheDocument();
  });

  it("exposes the guide, slide-deck, and Word links under /docs/guides/", () => {
    // The contract wired to the Help / Support button: the clickable web guide,
    // the PowerPoint, and the Word version — all app-relative so they resolve on
    // whichever host the app is served from.
    expect(GUIDE_LINKS.html).toBe("/docs/guides/honor-coach-workbench-user-guide.html");
    expect(GUIDE_LINKS.pptx).toBe("/docs/guides/Honor_Coach_Workbench_User_Guide.pptx");
    expect(GUIDE_LINKS.docx).toBe("/docs/guides/Honor_Coach_Workbench_User_Guide.docx");
  });

  it("opens a menu linking to all three assets, each in a new tab", () => {
    renderMenu();
    // Radix opens the menu on pointer-down (left button), not on a synthetic click.
    const trigger = screen.getByRole("button", { name: /help and support/i });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.pointerUp(trigger, { button: 0 });

    const web = screen.getByRole("menuitem", { name: /user guide \(web\)/i });
    const deck = screen.getByRole("menuitem", { name: /slide deck/i });
    const word = screen.getByRole("menuitem", { name: /word version/i });

    expect(web).toHaveAttribute("href", GUIDE_LINKS.html);
    expect(deck).toHaveAttribute("href", GUIDE_LINKS.pptx);
    expect(word).toHaveAttribute("href", GUIDE_LINKS.docx);
    for (const link of [web, deck, word]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
  });
});
