/**
 * @jest-environment jsdom
 *
 * Help & Support → Tickets | Claude Code. The tab exists ONLY when the access
 * probe returns 200 with allowed:true; every other outcome leaves the page as
 * it was before CC.3.
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import HelpSupportManagement from "@/pages/super-admin/HelpSupportManagement";
import { listAdminTickets, listAdmins } from "@/services/support/support.service";
import { devConsoleApi } from "@/lib/devConsoleApi";
import { canSeeDevConsole } from "@/pages/super-admin/dev-console/devConsoleView";
import { ME } from "@/test/devConsoleFixtures";

jest.mock("react-i18next", () => jest.requireActual("@/test/devConsoleI18nMock").reactI18nextMock);

jest.mock("@/services/support/support.service", () => ({
  listAdminTickets: jest.fn(),
  getAdminTicket: jest.fn(),
  listAdmins: jest.fn(),
  claimTicket: jest.fn(),
  escalateTicket: jest.fn(),
  addAdminNote: jest.fn(),
  resolveTicket: jest.fn(),
}));

// The probe is exercised through the REAL service against a mocked axios
// instance, so these tests cover the status handling end to end.
jest.mock("@/lib/devConsoleApi", () => ({
  devConsoleApi: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
  isDevConsoleConfigured: jest.fn(() => true),
}));

jest.mock("@/pages/super-admin/dev-console/DevConsolePanel", () => ({
  __esModule: true,
  default: () => <div>CONSOLE PANEL</div>,
}));

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { id: "me", email: "test@example.com", role: "super-admin" } }),
}));

const get = (devConsoleApi as unknown as { get: jest.Mock }).get;

function respond(status: number, data: unknown) {
  get.mockImplementation((url: string) =>
    url === "/v1/dev-console/me" ? Promise.resolve({ status, data }) : Promise.reject(new Error(`unexpected ${url}`))
  );
}

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/super-admin/support" element={<HelpSupportManagement />} />
          <Route path="/super-admin/support/claude-code" element={<HelpSupportManagement />} />
          <Route path="/super-admin/support/:ticketId" element={<HelpSupportManagement />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (listAdminTickets as jest.Mock).mockResolvedValue([]);
  (listAdmins as jest.Mock).mockResolvedValue([]);
});

describe("canSeeDevConsole", () => {
  it("is true only for allowed: true", () => {
    expect(canSeeDevConsole(ME)).toBe(true);
    expect(canSeeDevConsole({ ...ME, allowed: false })).toBe(false);
    expect(canSeeDevConsole(null)).toBe(false);
    expect(canSeeDevConsole(undefined)).toBe(false);
  });
});

describe("Help & Support tab bar", () => {
  it("shows Tickets | Claude Code when /me grants access", async () => {
    respond(200, { success: true, data: ME });
    renderAt("/super-admin/support");
    expect(await screen.findByRole("link", { name: "Claude Code" })).toHaveAttribute(
      "href",
      "/super-admin/support/claude-code"
    );
    expect(screen.getByRole("link", { name: "Tickets" })).toHaveAttribute("aria-current", "page");
    // The ticket queue is still what renders on the Tickets tab.
    await waitFor(() => expect(listAdminTickets).toHaveBeenCalled());
  });

  it.each([
    ["403 DEV_CONSOLE_FORBIDDEN", 403, { success: false, error_status: { code: "DEV_CONSOLE_FORBIDDEN" } }],
    ["403 NOT_SUPER_ADMIN", 403, { success: false, error_status: { code: "NOT_SUPER_ADMIN" } }],
    ["200 allowed:false", 200, { success: true, data: { ...ME, allowed: false } }],
    ["404 — no backend on this tier", 404, { message: "Not Found" }],
    ["401", 401, {}],
    ["503 CONSOLE_DISABLED", 503, { success: false, error_status: { code: "CONSOLE_DISABLED" } }],
  ])("hides the tab silently on %s", async (_label, status, body) => {
    respond(status, body);
    renderAt("/super-admin/support");
    await waitFor(() => expect(get).toHaveBeenCalledWith("/v1/dev-console/me", expect.anything()));
    await waitFor(() => expect(listAdminTickets).toHaveBeenCalled());
    // Give the probe's result a render to land before asserting absence.
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole("link", { name: "Claude Code" })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Help and Support sections" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("hides the tab on a network failure without an error banner", async () => {
    get.mockRejectedValue(new Error("Network Error"));
    renderAt("/super-admin/support");
    await waitFor(() => expect(get).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole("link", { name: "Claude Code" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the console on its route when allowed", async () => {
    respond(200, { success: true, data: ME });
    renderAt("/super-admin/support/claude-code");
    expect(await screen.findByText("CONSOLE PANEL")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Claude Code" })).toHaveAttribute("aria-current", "page");
    expect(listAdminTickets).not.toHaveBeenCalled();
  });

  it("sends the console route back to the queue when not allowed", async () => {
    respond(403, { success: false, error_status: { code: "DEV_CONSOLE_FORBIDDEN" } });
    renderAt("/super-admin/support/claude-code");
    await waitFor(() => expect(listAdminTickets).toHaveBeenCalled());
    expect(screen.queryByText("CONSOLE PANEL")).not.toBeInTheDocument();
  });

  it("leaves a ticket's detail page alone (no tab bar, no console)", async () => {
    respond(200, { success: true, data: ME });
    renderAt("/super-admin/support/some-ticket-id");
    await waitFor(() => expect(screen.getByTestId("layout")).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "Claude Code" })).not.toBeInTheDocument();
  });
});
