/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import {
  useSupportTickets,
  useSupportTicket,
  useCreateSupportTicket,
  useUpdateSupportTicket,
  useTicketMessages,
  useAddTicketMessage,
  useClaimTicket,
  useAdminTickets,
} from "@/hooks/support/useSupportTickets";
import { toast } from "sonner";
import { claimTicket, listAdminTickets } from "@/services/support/support.service";
import {
  listTickets,
  getTicket,
  createTicket,
  updateTicket,
  listMessages,
  addMessage,
} from "@/services/support/support.service";

jest.mock("@/services/support/support.service", () => ({
  listTickets: jest.fn(),
  getTicket: jest.fn(),
  createTicket: jest.fn(),
  updateTicket: jest.fn(),
  listMessages: jest.fn(),
  addMessage: jest.fn(),
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

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const TICKET = {
  id: "t1",
  user_id: "u1",
  org_id: null,
  subject: "Can't login",
  description: "Getting 401",
  status: "open",
  priority: "normal",
  category: null,
  created_at: "2026-03-30T00:00:00Z",
  updated_at: "2026-03-30T00:00:00Z",
};

const MESSAGE = {
  id: "m1",
  ticket_id: "t1",
  author_id: "u1",
  author_role: "user",
  content: "Please help",
  created_at: "2026-03-30T00:00:00Z",
};

beforeEach(() => jest.clearAllMocks());

// ─── useSupportTickets ───────────────────────────────────────────

describe("useSupportTickets", () => {
  it("returns ticket list on success", async () => {
    (listTickets as jest.Mock).mockResolvedValueOnce([TICKET]);

    const { result } = renderHook(() => useSupportTickets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([TICKET]);
    expect(listTickets).toHaveBeenCalledWith(undefined);
  });

  it("passes filter params to listTickets", async () => {
    (listTickets as jest.Mock).mockResolvedValueOnce([]);

    const params = { user_id: "u1", status: "open" };
    const { result } = renderHook(() => useSupportTickets(params), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listTickets).toHaveBeenCalledWith(params);
  });

  it("sets isError on failure", async () => {
    (listTickets as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useSupportTickets(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── useSupportTicket ────────────────────────────────────────────

describe("useSupportTicket", () => {
  it("fetches a single ticket by id", async () => {
    (getTicket as jest.Mock).mockResolvedValueOnce(TICKET);

    const { result } = renderHook(() => useSupportTicket("t1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(TICKET);
    expect(getTicket).toHaveBeenCalledWith("t1");
  });

  it("is disabled when ticketId is empty", () => {
    const { result } = renderHook(() => useSupportTicket(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(getTicket).not.toHaveBeenCalled();
  });
});

// ─── useCreateSupportTicket ──────────────────────────────────────

describe("useCreateSupportTicket", () => {
  it("calls createTicket and returns the new ticket", async () => {
    (createTicket as jest.Mock).mockResolvedValueOnce(TICKET);

    const { result } = renderHook(() => useCreateSupportTicket(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        user_id: "u1",
        subject: "Can't login",
        description: "Getting 401",
      });
    });

    expect(createTicket).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", subject: "Can't login" }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("sets isError on failure", async () => {
    (createTicket as jest.Mock).mockRejectedValueOnce(new Error("Server error"));

    const { result } = renderHook(() => useCreateSupportTicket(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      try {
        await result.current.mutateAsync({ user_id: "u1", subject: "x", description: "x" });
      } catch {
        // swallow
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ─── useUpdateSupportTicket ──────────────────────────────────────

describe("useUpdateSupportTicket", () => {
  it("calls updateTicket with correct args", async () => {
    const updated = { ...TICKET, status: "resolved" };
    (updateTicket as jest.Mock).mockResolvedValueOnce(updated);

    const { result } = renderHook(() => useUpdateSupportTicket(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ ticketId: "t1", req: { status: "resolved" } });
    });

    expect(updateTicket).toHaveBeenCalledWith("t1", { status: "resolved" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

// ─── useTicketMessages ───────────────────────────────────────────

describe("useTicketMessages", () => {
  it("fetches messages for a ticket", async () => {
    (listMessages as jest.Mock).mockResolvedValueOnce([MESSAGE]);

    const { result } = renderHook(() => useTicketMessages("t1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([MESSAGE]);
    expect(listMessages).toHaveBeenCalledWith("t1");
  });

  it("is disabled when ticketId is empty", () => {
    const { result } = renderHook(() => useTicketMessages(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(listMessages).not.toHaveBeenCalled();
  });
});

// ─── useAddTicketMessage ─────────────────────────────────────────

describe("useAddTicketMessage", () => {
  it("calls addMessage and returns the new message", async () => {
    (addMessage as jest.Mock).mockResolvedValueOnce(MESSAGE);

    const { result } = renderHook(() => useAddTicketMessage(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({
        ticketId: "t1",
        req: { author_id: "u1", content: "Please help" },
      });
    });

    expect(addMessage).toHaveBeenCalledWith("t1", { author_id: "u1", content: "Please help" });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});

describe("Help and Support Management hooks", () => {
  const mockClaim = claimTicket as jest.MockedFunction<typeof claimTicket>;
  const mockAdminList = listAdminTickets as jest.MockedFunction<typeof listAdminTickets>;

  beforeEach(() => jest.clearAllMocks());

  it("useAdminTickets passes the filter through", async () => {
    mockAdminList.mockResolvedValue([]);
    const { result } = renderHook(() => useAdminTickets({ status: "open" }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockAdminList).toHaveBeenCalledWith({ status: "open" });
  });

  it("useClaimTicket toasts success when claimed", async () => {
    mockClaim.mockResolvedValue({ claimed: true, ticket: { ...TICKET, ticket_number: 1042 } as never });
    const { result } = renderHook(() => useClaimTicket(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync("t1");
    });
    expect(mockClaim).toHaveBeenCalledWith("t1");
    expect(toast.success).toHaveBeenCalledWith("Ticket #1042 assigned to you.");
  });

  it("useClaimTicket reports the current assignee when not claimed", async () => {
    mockClaim.mockResolvedValue({
      claimed: false,
      ticket: { ...TICKET, assigned_to: "x@y.z", assigned_to_name: "X Y" } as never,
    });
    const { result } = renderHook(() => useClaimTicket(), { wrapper: createWrapper() });
    await act(async () => {
      await result.current.mutateAsync("t1");
    });
    expect(toast.info).toHaveBeenCalledWith("Already assigned to X Y.");
    expect(toast.success).not.toHaveBeenCalled();
  });
});
