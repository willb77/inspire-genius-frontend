import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import { toast } from "sonner";
import {
  createTicket,
  listTickets,
  getTicket,
  updateTicket,
  addMessage,
  listMessages,
  listAdminTickets,
  getAdminTicket,
  listAdmins,
  claimTicket,
  escalateTicket,
  addAdminNote,
  resolveTicket,
} from "@/services/support/support.service";
import type { TicketCreate, TicketUpdate, MessageCreate } from "@/services/support/support.service";

const QK = {
  list: (params?: object) => ["support", "tickets", params] as const,
  detail: (id: string) => ["support", "tickets", id] as const,
  messages: (ticketId: string) => ["support", "tickets", ticketId, "messages"] as const,
  adminList: (params?: object) => ["support", "admin", "tickets", params] as const,
  adminDetail: (id: string) => ["support", "admin", "tickets", id] as const,
  admins: ["support", "admin", "admins"] as const,
};

/**
 * Pull a human-readable message out of an API error.
 *
 * The support service is FastAPI, so validation failures arrive as a 422 with
 * `{ detail: [{ msg, loc }] }` rather than `{ message }`. Surfacing `msg` is
 * what shows the user the "describe the issue in detail" guidance instead of a
 * generic failure toast.
 */
function errorMessage(err: unknown, fallback: string): string {
  const ax = err as AxiosError<{
    message?: string;
    detail?: string | Array<{ msg?: string }>;
  }>;
  const detail = ax?.response?.data?.detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map((d) => d?.msg).filter(Boolean);
    if (msgs.length) return msgs.join(" ");
  }
  if (typeof detail === "string" && detail) return detail;
  if (ax?.response?.data?.message) return ax.response.data.message;
  return (err as Error)?.message || fallback;
}

export function useSupportTickets(params?: { user_id?: string; status?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: QK.list(params),
    queryFn: () => listTickets(params),
    staleTime: 60_000,
  });
}

export function useSupportTicket(ticketId: string) {
  return useQuery({
    queryKey: QK.detail(ticketId),
    queryFn: () => getTicket(ticketId),
    enabled: Boolean(ticketId),
    staleTime: 60_000,
  });
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: TicketCreate) => createTicket(req),
    onSuccess: () => {
      toast.success("Support request sent — our team has been notified.");
      queryClient.invalidateQueries({ queryKey: ["support", "tickets"] });
    },
    onError: (err) => {
      toast.error(errorMessage(err, "Could not send your support request."));
    },
  });
}

export function useUpdateSupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, req }: { ticketId: string; req: TicketUpdate }) =>
      updateTicket(ticketId, req),
    onSuccess: (_data, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: QK.detail(ticketId) });
      queryClient.invalidateQueries({ queryKey: ["support", "tickets"] });
    },
  });
}

export function useTicketMessages(ticketId: string) {
  return useQuery({
    queryKey: QK.messages(ticketId),
    queryFn: () => listMessages(ticketId),
    enabled: Boolean(ticketId),
    staleTime: 30_000,
  });
}

export function useAddTicketMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, req }: { ticketId: string; req: MessageCreate }) =>
      addMessage(ticketId, req),
    onSuccess: (_data, { ticketId }) => {
      queryClient.invalidateQueries({ queryKey: QK.messages(ticketId) });
    },
    onError: (err) => {
      toast.error(errorMessage(err, "Could not post your message."));
    },
  });
}

// ── Help and Support Management ───────────────────────────────────────────────

export function useAdminTickets(params?: { status?: string; assigned_to?: string }) {
  return useQuery({
    queryKey: QK.adminList(params),
    queryFn: () => listAdminTickets(params),
    staleTime: 30_000,
  });
}

export function useAdminTicket(ticketId: string | undefined) {
  return useQuery({
    queryKey: QK.adminDetail(ticketId ?? ""),
    queryFn: () => getAdminTicket(ticketId ?? ""),
    enabled: Boolean(ticketId),
    staleTime: 30_000,
  });
}

export function useAdmins() {
  return useQuery({
    queryKey: QK.admins,
    queryFn: listAdmins,
    staleTime: 5 * 60_000,
  });
}

/** Every admin mutation invalidates both the list and the ticket's detail. */
function useAdminInvalidator() {
  const queryClient = useQueryClient();
  return (ticketId: string) => {
    queryClient.invalidateQueries({ queryKey: ["support", "admin", "tickets"] });
    queryClient.invalidateQueries({ queryKey: QK.adminDetail(ticketId) });
    // The requester's own list shows status/assignment too.
    queryClient.invalidateQueries({ queryKey: ["support", "tickets"] });
  };
}

export function useClaimTicket() {
  const invalidate = useAdminInvalidator();
  return useMutation({
    mutationFn: (ticketId: string) => claimTicket(ticketId),
    onSuccess: (result, ticketId) => {
      invalidate(ticketId);
      if (result.claimed) {
        toast.success(`Ticket #${result.ticket.ticket_number ?? ""} assigned to you.`);
      } else {
        toast.info(
          `Already assigned to ${result.ticket.assigned_to_name ?? result.ticket.assigned_to}.`,
        );
      }
    },
    onError: (err) => toast.error(errorMessage(err, "Could not assign the ticket.")),
  });
}

export function useEscalateTicket() {
  const invalidate = useAdminInvalidator();
  return useMutation({
    mutationFn: ({ ticketId, req }: { ticketId: string; req: { to_email: string; note?: string } }) =>
      escalateTicket(ticketId, req),
    onSuccess: (ticket, { ticketId }) => {
      invalidate(ticketId);
      toast.success(`Escalated to ${ticket.assigned_to_name ?? ticket.assigned_to}.`);
    },
    onError: (err) => toast.error(errorMessage(err, "Could not escalate the ticket.")),
  });
}

export function useAddAdminNote() {
  const invalidate = useAdminInvalidator();
  return useMutation({
    mutationFn: ({ ticketId, content }: { ticketId: string; content: string }) =>
      addAdminNote(ticketId, content),
    onSuccess: (_ticket, { ticketId }) => {
      invalidate(ticketId);
      toast.success("Note added and sent to the requester.");
    },
    onError: (err) => toast.error(errorMessage(err, "Could not add the note.")),
  });
}

export function useResolveTicket() {
  const invalidate = useAdminInvalidator();
  return useMutation({
    mutationFn: ({ ticketId, note }: { ticketId: string; note?: string }) =>
      resolveTicket(ticketId, note),
    onSuccess: (_ticket, { ticketId }) => {
      invalidate(ticketId);
      toast.success("Ticket resolved. The requester has been emailed.");
    },
    onError: (err) => toast.error(errorMessage(err, "Could not resolve the ticket.")),
  });
}
