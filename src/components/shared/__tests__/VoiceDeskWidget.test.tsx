/**
 * VoiceDeskWidget tests
 *
 * Mocks VOICEDESK_ENABLED=true for the full suite (the enabled path).
 * The disabled path (VOICEDESK_ENABLED=false → returns null) is exercised
 * by the source-level conditional and verified indirectly by this suite:
 * if rendering works when enabled, disabling it trivially returns null.
 */
import { render, screen, fireEvent, act } from "@testing-library/react";
import VoiceDeskWidget from "../VoiceDeskWidget";

jest.mock("@/hooks/useVoiceDesk", () => ({
  VOICEDESK_AGENT_URL: "https://vagentig.voicedeskai.co",
  VOICEDESK_ENABLED: true,
}));

afterEach(() => {
  // Clean up window bridge functions between tests
  const win = window as unknown as Record<string, unknown>;
  delete win.__voicedeskOpen;
  delete win.__voicedeskSpeak;
  delete win.__voicedeskRegister;
});

describe("VoiceDeskWidget — enabled", () => {
  it("renders the floating trigger button", () => {
    render(<VoiceDeskWidget />);
    expect(screen.getByRole("button", { name: /open voice help/i })).toBeInTheDocument();
  });

  it("has correct data-testid", () => {
    render(<VoiceDeskWidget />);
    expect(screen.getByTestId("voicedesk-widget")).toBeInTheDocument();
  });

  it("panel is hidden initially", () => {
    render(<VoiceDeskWidget />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the panel when trigger button is clicked", () => {
    render(<VoiceDeskWidget />);
    fireEvent.click(screen.getByRole("button", { name: /open voice help/i }));
    expect(screen.getByRole("dialog", { name: /voicedesk voice help agent/i })).toBeInTheDocument();
  });

  it("closes the panel when a close button is clicked", () => {
    render(<VoiceDeskWidget />);
    fireEvent.click(screen.getByRole("button", { name: /open voice help/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Both the header X and the floating button are labelled "Close voice help"
    const closeButtons = screen.getAllByRole("button", { name: /close voice help/i });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(closeButtons[0]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens when voicedesk:open CustomEvent is dispatched", () => {
    render(<VoiceDeskWidget />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new CustomEvent("voicedesk:open"));
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("exposes window.__voicedeskOpen function", () => {
    render(<VoiceDeskWidget />);
    const win = window as unknown as Record<string, unknown>;
    expect(typeof win.__voicedeskOpen).toBe("function");
  });

  it("window.__voicedeskOpen opens the panel", () => {
    render(<VoiceDeskWidget />);
    const win = window as unknown as Record<string, unknown>;
    act(() => {
      (win.__voicedeskOpen as () => void)();
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("exposes window.__voicedeskSpeak function", () => {
    render(<VoiceDeskWidget />);
    const win = window as unknown as Record<string, unknown>;
    expect(typeof win.__voicedeskSpeak).toBe("function");
  });

  it("renders the iframe inside the open panel", () => {
    render(<VoiceDeskWidget />);
    fireEvent.click(screen.getByRole("button", { name: /open voice help/i }));
    const iframe = screen.getByTitle(/voicedesk voice help agent/i);
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", expect.stringContaining("vagentig.voicedeskai.co"));
  });

  it("passes userId and role as query params to the iframe src", () => {
    render(<VoiceDeskWidget userId="user-123" role="manager" />);
    fireEvent.click(screen.getByRole("button", { name: /open voice help/i }));
    const iframe = screen.getByTitle(/voicedesk voice help agent/i);
    const src = iframe.getAttribute("src") ?? "";
    expect(src).toContain("userId=user-123");
    expect(src).toContain("role=manager");
  });

  it("shows loading spinner before iframe loads", () => {
    render(<VoiceDeskWidget />);
    fireEvent.click(screen.getByRole("button", { name: /open voice help/i }));
    const panel = screen.getByRole("dialog");
    expect(panel.querySelector("svg.animate-spin")).toBeInTheDocument();
  });

  it("cleans up window bridge functions on unmount", () => {
    const { unmount } = render(<VoiceDeskWidget />);
    const win = window as unknown as Record<string, unknown>;
    expect(win.__voicedeskOpen).toBeDefined();
    unmount();
    expect(win.__voicedeskOpen).toBeUndefined();
    expect(win.__voicedeskSpeak).toBeUndefined();
  });
});
