/**
 * @jest-environment jsdom
 *
 * Support-assistant trigger REACHABILITY.
 *
 * This suite exists because of a real miss: triggers were added to Help,
 * Home and Dashboard, all three shipped green (build, lint, full suite, CI,
 * bundle-hash and chunk greps all passed) — and none of them were reachable,
 * because `surfaceFlags` makes the **V2** variants the default and the edits
 * had landed on the classic pages. Presence in a chunk is not reachability.
 *
 * So these tests assert against the surfaces a real user actually lands on,
 * with the flag left at its default, and assert the trigger CALLS the support
 * context rather than merely existing.
 */
import { render, screen, fireEvent } from "@testing-library/react";

import HelpV2 from "../HelpV2";
import DashboardV2 from "../DashboardV2";
import { SupportAgentContext } from "@/context/support-agent-context";
import { isNewUserSurfacesEnabled } from "@/lib/surfaceFlags";

jest.mock("@/layouts/UserLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="user-layout">{children}</div>
  ),
}));

// ── HelpV2 data deps ────────────────────────────────────────────────
jest.mock("@/hooks/help/useCreateIssue", () => ({
  useCreateIssue: () => ({ isPending: false, mutateAsync: jest.fn() }),
}));
jest.mock("@/hooks/help/useIssues", () => ({
  useIssues: () => ({ data: undefined, isPending: false, isLoading: false }),
}));
jest.mock("@/hooks/help/useIssueTypes", () => ({
  useIssueTypes: () => ({ data: { data: [] }, isPending: false }),
}));

// ── DashboardV2 data deps ───────────────────────────────────────────
jest.mock("@/hooks/coaches/useAgents", () => ({
  useAgents: () => ({
    data: { data: [] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
}));
jest.mock("@/lib/agentApi", () => ({ useAgentEngine: () => true }));

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => jest.fn(),
}));

function renderWithSupport(ui: React.ReactElement) {
  const open = jest.fn();
  render(
    <SupportAgentContext.Provider
      value={{ isOpen: false, open, close: jest.fn(), toggle: jest.fn() }}
    >
      {ui}
    </SupportAgentContext.Provider>,
  );
  return open;
}

describe("surface defaults", () => {
  it("the V2 surfaces are the DEFAULT — so classic-page triggers are unreachable", () => {
    // If this ever flips, the reasoning in this file (and the launcher's
    // rationale) needs revisiting rather than silently going stale.
    expect(isNewUserSurfacesEnabled()).toBe(true);
  });
});

describe("HelpV2 — the surface /help actually resolves to", () => {
  it('"Speak with Support" opens the assistant', () => {
    const open = renderWithSupport(<HelpV2 />);
    fireEvent.click(screen.getByRole("button", { name: /speak with support/i }));
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("uses the support context, not the legacy voicedesk event", () => {
    const listener = jest.fn();
    window.addEventListener("voicedesk:open", listener);
    const open = renderWithSupport(<HelpV2 />);
    fireEvent.click(screen.getByRole("button", { name: /speak with support/i }));
    window.removeEventListener("voicedesk:open", listener);
    expect(open).toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("DashboardV2 — the surface /dashboard actually resolves to", () => {
  it("exposes an in-page trigger that opens the assistant", () => {
    const open = renderWithSupport(<DashboardV2 />);
    fireEvent.click(screen.getByTestId("ask-meridian-button"));
    expect(open).toHaveBeenCalledTimes(1);
  });
});
