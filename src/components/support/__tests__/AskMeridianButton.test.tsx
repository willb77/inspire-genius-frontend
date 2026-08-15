/**
 * AskMeridianButton tests — the drop-in trigger used to expose the assistant
 * on additional pages.
 */
import { render, screen, fireEvent } from "@testing-library/react";

import AskMeridianButton from "../AskMeridianButton";
import { SupportAgentContext } from "@/context/support-agent-context";

function renderWithContext(open = jest.fn()) {
  render(
    <SupportAgentContext.Provider
      value={{ isOpen: false, open, close: jest.fn(), toggle: jest.fn() }}
    >
      <AskMeridianButton />
    </SupportAgentContext.Provider>,
  );
  return open;
}

describe("AskMeridianButton", () => {
  it("opens the assistant when clicked", () => {
    const open = renderWithContext();
    fireEvent.click(screen.getByTestId("ask-meridian-button"));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("renders the default label", () => {
    renderWithContext();
    expect(screen.getByRole("button", { name: /ask meridian/i })).toBeInTheDocument();
  });

  it("accepts a custom label", () => {
    render(<AskMeridianButton label="Need help?" />);
    expect(screen.getByRole("button", { name: /need help\?/i })).toBeInTheDocument();
  });

  it("does not throw outside the provider", () => {
    render(<AskMeridianButton />);
    expect(() => fireEvent.click(screen.getByTestId("ask-meridian-button"))).not.toThrow();
  });
});
