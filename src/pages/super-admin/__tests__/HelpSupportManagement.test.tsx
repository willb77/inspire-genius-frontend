/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import HelpSupportManagement from "@/pages/super-admin/HelpSupportManagement";
import {
  listAdminTickets,
  getAdminTicket,
  listAdmins,
  claimTicket,
  escalateTicket,
  addAdminNote,
  resolveTicket,
} from "@/services/support/support.service";
import type { AdminTicketOut } from "@/services/support/support.service";

jest.mock("@/services/support/support.service", () => ({
  listAdminTickets: jest.fn(),
  getAdminTicket: jest.fn(),
  listAdmins: jest.fn(),
  claimTicket: jest.fn(),
  escalateTicket: jest.fn(),
  addAdminNote: jest.fn(),
  resolveTicket: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

jest.mock("@/context/useAuth", () => ({
  useAuth: () => ({ user: { id: "me", email: "admin@inspiresgenius.test", role: "super-admin" } }),
}));

const mockList = listAdminTickets as jest.MockedFunction<typeof listAdminTickets>;
const mockGet = getAdminTicket as jest.MockedFunction<typeof getAdminTicket>;
const mockAdmins = listAdmins as jest.MockedFunction<typeof listAdmins>;
const mockClaim = claimTicket as jest.MockedFunction<typeof claimTicket>;
const mockEscalate = escalateTicket as jest.MockedFunction<typeof escalateTicket>;
const mockNote = addAdminNote as jest.MockedFunction<typeof addAdminNote>;
const mockResolve = resolveTicket as jest.MockedFunction<typeof resolveTicket>;

const TICKET: AdminTicketOut = {
  id: "11111111-2222-3333-4444-555555555555",
  user_id: "sub-1",
  org_id: null,
  subject: "Report export fails",
  description: "Clicking export does nothing.",
  status: "open",
  priority: "high",
  category: "bug",
  contact_name: "Dana Reed",
  contact_email: "dana@example.com",
  contact_phone: null,
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-01T10:00:00Z",
  ticket_number: 1042,
  assigned_to: null,
  assigned_to_name: null,
  assigned_at: null,
  assigned_by: null,
  closed_at: null,
  notes: [],
  assignments: [],
};

const ASSIGNED: AdminTicketOut = {
  ...TICKET,
  assigned_to: "other.admin@inspiresgenius.test",
  assigned_to_name: "Other Admin",
  assigned_at: "2026-09-01T11:00:00Z",
  assigned_by: "other.admin@inspiresgenius.test",
  assignments: [
    {
      id: "a1",
      ticket_id: TICKET.id,
      assigned_to: "other.admin@inspiresgenius.test",
      assigned_to_name: "Other Admin",
      assigned_by: "other.admin@inspiresgenius.test",
      reason: "claim",
      note: null,
      created_at: "2026-09-01T11:00:00Z",
    },
  ],
};

function renderAt(path: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/super-admin/support" element={<HelpSupportManagement />} />
          <Route path="/super-admin/support/:ticketId" element={<HelpSupportManagement />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAdmins.mockResolvedValue([
    { email: "admin@inspiresgenius.test", full_name: "Me Admin" },
    { email: "other.admin@inspiresgenius.test", full_name: "Other Admin" },
  ]);
});

describe("HelpSupportManagement — list", () => {
  it("lists tickets with number, assignee and the four timestamps", async () => {
    mockList.mockResolvedValue([ASSIGNED, { ...TICKET, id: "t-2", ticket_number: 1043 }]);
    renderAt("/super-admin/support");
    expect(await screen.findByText("#1042")).toBeInTheDocument();
    expect(screen.getByText("#1043")).toBeInTheDocument();
    expect(screen.getByText("Other Admin")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("2 tickets")).toBeInTheDocument();
    expect(screen.getByText("· 1 unassigned")).toBeInTheDocument();
    // Default filter is open tickets.
    expect(mockList).toHaveBeenCalledWith({ status: "open" });
  });

  it("filters to closed tickets and to mine", async () => {
    mockList.mockResolvedValue([ASSIGNED]);
    renderAt("/super-admin/support");
    await screen.findByText("#1042");
    await userEvent.click(screen.getByRole("button", { name: "Closed" }));
    await waitFor(() => expect(mockList).toHaveBeenCalledWith({ status: "closed" }));
    await userEvent.click(screen.getByRole("button", { name: "Assigned to me" }));
    expect(await screen.findByText("Nothing is assigned to you.")).toBeInTheDocument();
  });

  it("shows an honest empty state", async () => {
    mockList.mockResolvedValue([]);
    renderAt("/super-admin/support");
    expect(await screen.findByText("No tickets match this filter.")).toBeInTheDocument();
  });
});

describe("HelpSupportManagement — ticket", () => {
  it("claims exactly once when opened from the email link, then drops the flag", async () => {
    mockGet.mockResolvedValue(TICKET);
    mockClaim.mockResolvedValue({ claimed: true, ticket: { ...TICKET, assigned_to: "admin@inspiresgenius.test", assigned_to_name: "Me Admin" } });
    renderAt(`/super-admin/support/${TICKET.id}?claim=1`);
    await screen.findByText("Report export fails");
    await waitFor(() => expect(mockClaim).toHaveBeenCalledTimes(1));
    expect(mockClaim).toHaveBeenCalledWith(TICKET.id);
    // Re-render settles without a second claim.
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    expect(mockClaim).toHaveBeenCalledTimes(1);
  });

  it("does not claim without the flag, and offers Assign to me for an unassigned ticket", async () => {
    mockGet.mockResolvedValue(TICKET);
    mockClaim.mockResolvedValue({ claimed: true, ticket: TICKET });
    renderAt(`/super-admin/support/${TICKET.id}`);
    await screen.findByText("Report export fails");
    expect(mockClaim).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /assign to me/i }));
    await waitFor(() => expect(mockClaim).toHaveBeenCalledWith(TICKET.id));
  });

  it("shows who has it and the history when assigned to someone else", async () => {
    mockGet.mockResolvedValue(ASSIGNED);
    renderAt(`/super-admin/support/${TICKET.id}`);
    await screen.findByText("Report export fails");
    expect(screen.queryByRole("button", { name: /assign to me/i })).not.toBeInTheDocument();
    expect(screen.getAllByText("Other Admin").length).toBeGreaterThan(0);
    expect(screen.getByText(/claimed by/)).toBeInTheDocument();
  });

  it("escalates to a roster admin other than the current assignee, with a note", async () => {
    mockGet.mockResolvedValue(ASSIGNED);
    mockEscalate.mockResolvedValue({ ...ASSIGNED, assigned_to: "admin@inspiresgenius.test" });
    renderAt(`/super-admin/support/${TICKET.id}`);
    await screen.findByText("Report export fails");
    const select = (await screen.findByLabelText("Escalate to")) as HTMLSelectElement;
    await waitFor(() => expect(select.options.length).toBe(2)); // placeholder + me (Other is current)
    expect(Array.from(select.options).map((o) => o.value)).toEqual(["", "admin@inspiresgenius.test"]);
    await userEvent.selectOptions(select, "admin@inspiresgenius.test");
    await userEvent.type(screen.getByLabelText("Escalation note"), "needs PRISM access");
    await userEvent.click(screen.getByRole("button", { name: "Escalate" }));
    await waitFor(() =>
      expect(mockEscalate).toHaveBeenCalledWith(TICKET.id, {
        to_email: "admin@inspiresgenius.test",
        note: "needs PRISM access",
      }),
    );
  });

  it("adds a resolution note and resolves with a closing note", async () => {
    mockGet.mockResolvedValue(TICKET);
    mockNote.mockResolvedValue({ ...TICKET, notes: [] });
    mockResolve.mockResolvedValue({ ...TICKET, status: "closed", closed_at: "2026-09-02T12:00:00Z" });
    renderAt(`/super-admin/support/${TICKET.id}`);
    await screen.findByText("Report export fails");
    await userEvent.type(screen.getByLabelText("Resolution note"), "Cleared the cache");
    await userEvent.click(screen.getByRole("button", { name: "Add note" }));
    await waitFor(() => expect(mockNote).toHaveBeenCalledWith(TICKET.id, "Cleared the cache"));

    await userEvent.type(screen.getByLabelText("Closing note"), "All good now");
    await userEvent.click(screen.getByRole("button", { name: /mark resolved/i }));
    await waitFor(() => expect(mockResolve).toHaveBeenCalledWith(TICKET.id, "All good now"));
  });

  it("hides every write control once the ticket is closed", async () => {
    mockGet.mockResolvedValue({ ...TICKET, status: "closed", closed_at: "2026-09-02T12:00:00Z", resolved_by: "admin@inspiresgenius.test" });
    renderAt(`/super-admin/support/${TICKET.id}`);
    await screen.findByText("Report export fails");
    expect(screen.queryByLabelText("Resolution note")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Escalate to")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /mark resolved/i })).not.toBeInTheDocument();
    expect(screen.getByText("admin@inspiresgenius.test")).toBeInTheDocument();
  });

  it("says so when the ticket cannot be loaded", async () => {
    mockGet.mockRejectedValue(new Error("404"));
    renderAt(`/super-admin/support/${TICKET.id}`);
    expect(await screen.findByText(/could not be loaded/i)).toBeInTheDocument();
  });
});
