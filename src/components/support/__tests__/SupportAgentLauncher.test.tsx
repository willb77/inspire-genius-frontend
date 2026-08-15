/**
 * SupportAgentLauncher tests.
 *
 * The launcher exists because per-page triggers are unreliable in this app —
 * most user pages have a V2 variant that is the DEFAULT, so a button added to
 * the classic page never renders for real users. These tests pin the two
 * properties that make the global approach work: it is always present, and it
 * yields the corner to the popup.
 */
import { render, screen, fireEvent } from "@testing-library/react";

import SupportAgentLauncher from "../SupportAgentLauncher";
import { SupportAgentContext } from "@/context/support-agent-context";

function renderWith(isOpen: boolean, open = jest.fn()) {
  render(
    <SupportAgentContext.Provider
      value={{ isOpen, open, close: jest.fn(), toggle: jest.fn() }}
    >
      <SupportAgentLauncher />
    </SupportAgentContext.Provider>,
  );
  return open;
}

describe("SupportAgentLauncher", () => {
  it("renders when the popup is closed", () => {
    renderWith(false);
    expect(screen.getByTestId("support-agent-launcher")).toBeInTheDocument();
  });

  it("opens the assistant on click", () => {
    const open = renderWith(false);
    fireEvent.click(screen.getByTestId("support-agent-launcher"));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("hides while the popup is open, so the two never overlap", () => {
    renderWith(true);
    expect(screen.queryByTestId("support-agent-launcher")).not.toBeInTheDocument();
  });

  it("is reachable by its accessible name", () => {
    renderWith(false);
    expect(screen.getByRole("button", { name: /help & support/i })).toBeInTheDocument();
  });

  it("does not sit on top of AlexFloating's corner", () => {
    renderWith(false);
    // AlexFloating owns bottom-6 right-6; the launcher must be offset left.
    const cls = screen.getByTestId("support-agent-launcher").className;
    expect(cls).toContain("right-24");
    expect(cls).not.toContain("right-6");
  });
});
