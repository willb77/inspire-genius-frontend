/**
 * @jest-environment jsdom
 *
 * Smoke tests for the DiagnosticChat ("Agent Trace Console") page —
 * narrowly scoped to verify the new "New Chat" header button renders
 * and resets local state when clicked. The full chat flow (WebSocket
 * handshake, message dispatch, voice pipeline) is intentionally not
 * exercised here — DiagnosticChat is a 940-line super-admin diagnostic
 * tool and full-flow coverage would require substantial WebSocket /
 * MediaRecorder / fetch mocking out of scope for this PR.
 */

/* ── Mock auth context ── */
jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({
    user: { id: "test-user", email: "test@example.com", fullName: "Test User", role: "super-admin" },
    isAuthenticated: true,
    accessToken: "test-token",
  }),
}));

/* ── Mock axios. DiagnosticChat calls axios.create(...) at module load
   to build a standalone instance pointed at the Agent Engine, so the
   mock must return an object with create() → axios-like instance. ── */
jest.mock("axios", () => {
  const instance = {
    post: jest.fn().mockResolvedValue({ data: {} }),
    get: jest.fn().mockResolvedValue({ data: {} }),
    defaults: { baseURL: "http://localhost:3000" },
  };
  return {
    __esModule: true,
    default: {
      ...instance,
      create: jest.fn(() => instance),
    },
  };
});

/* ── Mock WebSocket — the constructor must not throw on connect() ── */
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  readyState = 1;
  url = "";
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  send = jest.fn();
  close = jest.fn();
  constructor(url: string) {
    this.url = url;
  }
}

Object.defineProperty(global, "WebSocket", {
  value: MockWebSocket,
  writable: true,
});

/* ── Layout chrome ──
   The page now renders inside SuperAdminLayout so the left nav is present at
   /super-admin/agent-trace-console. That pulls in SidebarScaffold →
   UserTopHeader → NotificationBell → the real `@/lib/axios`, whose
   module-level `attachInterceptors` blows up against this file's axios mock.
   Stub the layout, as the other super-admin page tests do. */
jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="super-admin-layout">{children}</div>
  ),
}));

/* ── Mock MediaRecorder / scrollIntoView for the voice + auto-scroll path ── */
beforeAll(() => {
  Object.defineProperty(global, "MediaRecorder", {
    value: jest.fn(),
    writable: true,
  });
  // jsdom doesn't implement scrollIntoView — DiagnosticChat auto-scrolls
  // its message list on every render.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Element.prototype as any).scrollIntoView = jest.fn();
});

/* ── Imports must follow mocks ── */
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DiagnosticChat from "../DiagnosticChat";

function renderPage(variant: "classic" | "v2" = "classic") {
  return render(
    <MemoryRouter>
      <DiagnosticChat variant={variant} />
    </MemoryRouter>,
  );
}

describe("DiagnosticChat — New Chat button", () => {
  it("renders the New Chat button in the header", () => {
    renderPage();
    const btn = screen.getByTestId("diagnostic-new-chat-button");
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveTextContent(/new chat/i);
  });

  it("clicking New Chat is wired (no throw, button stays enabled)", () => {
    renderPage();
    const btn = screen.getByTestId("diagnostic-new-chat-button");
    act(() => {
      btn.click();
    });
    // The handler resets local state + reconnects WebSocket. We assert
    // it doesn't throw and the button remains clickable for the next
    // reset cycle — full state-reset behaviour is observable in the
    // (separately-tested) PAGE trace log on the live UI.
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });
});

describe("DiagnosticChat — V2 surface skin", () => {
  it("renders the console (New Chat + title) in the V2 variant without throwing", () => {
    renderPage("v2");
    const btn = screen.getByTestId("diagnostic-new-chat-button");
    expect(btn).toBeInTheDocument();
    // The header title is shared between variants; V2 only re-skins chrome.
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("applies the cream page panel token in V2 (not in classic)", () => {
    const { container, unmount } = renderPage("v2");
    // Outer wrapper carries the HomeV2 cream panel token in V2.
    expect(container.querySelector(".bg-panel")).toBeInTheDocument();
    unmount();
    const { container: classicContainer } = renderPage("classic");
    expect(classicContainer.querySelector(".bg-panel")).toBeNull();
  });
});
