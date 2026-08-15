/**
 * SupportAgentProvider tests — the "expose this popup on a few pages" contract.
 *
 * Any page under the provider must be able to open the assistant with one
 * hook call, and the legacy `voicedesk:open` event must reach it so existing
 * triggers light up the new assistant instead of a disabled iframe widget.
 */
import { render, screen, fireEvent, act } from "@testing-library/react";

import { SupportAgentProvider } from "../SupportAgentProvider";
import { useSupportAgent } from "../useSupportAgent";

jest.mock("@/components/support/SupportAgentPopup", () => ({
  __esModule: true,
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="popup">
        <button onClick={onClose}>close-popup</button>
      </div>
    ) : null,
}));

function Consumer() {
  const { isOpen, open, close, toggle } = useSupportAgent();
  return (
    <div>
      <span data-testid="state">{isOpen ? "open" : "closed"}</span>
      <button onClick={open}>open-it</button>
      <button onClick={close}>close-it</button>
      <button onClick={toggle}>toggle-it</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <SupportAgentProvider>
      <Consumer />
    </SupportAgentProvider>,
  );
}

describe("SupportAgentProvider", () => {
  it("starts closed", () => {
    renderWithProvider();
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
    expect(screen.queryByTestId("popup")).not.toBeInTheDocument();
  });

  it("opens from a child page via the hook", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("open-it"));
    expect(screen.getByTestId("state")).toHaveTextContent("open");
    expect(screen.getByTestId("popup")).toBeInTheDocument();
  });

  it("closes from the child and from the popup itself", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("open-it"));
    fireEvent.click(screen.getByText("close-it"));
    expect(screen.getByTestId("state")).toHaveTextContent("closed");

    fireEvent.click(screen.getByText("open-it"));
    fireEvent.click(screen.getByText("close-popup"));
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
  });

  it("toggles", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("toggle-it"));
    expect(screen.getByTestId("state")).toHaveTextContent("open");
    fireEvent.click(screen.getByText("toggle-it"));
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
  });

  it("opens on the support-agent:open event", () => {
    renderWithProvider();
    act(() => {
      window.dispatchEvent(new CustomEvent("support-agent:open"));
    });
    expect(screen.getByTestId("popup")).toBeInTheDocument();
  });

  it("opens on the legacy voicedesk:open event", () => {
    renderWithProvider();
    act(() => {
      window.dispatchEvent(new CustomEvent("voicedesk:open"));
    });
    expect(screen.getByTestId("popup")).toBeInTheDocument();
  });

  it("stops listening once unmounted", () => {
    const { unmount } = renderWithProvider();
    unmount();
    // No provider mounted — dispatching must not throw.
    expect(() =>
      act(() => {
        window.dispatchEvent(new CustomEvent("voicedesk:open"));
      }),
    ).not.toThrow();
  });
});

describe("useSupportAgent outside a provider", () => {
  it("degrades to a no-op instead of throwing", () => {
    render(<Consumer />);
    expect(screen.getByTestId("state")).toHaveTextContent("closed");
    expect(() => fireEvent.click(screen.getByText("open-it"))).not.toThrow();
  });
});
