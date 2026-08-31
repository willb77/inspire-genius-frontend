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
} from "@/services/support/support.service";
import type { TicketCreate, TicketUpdate, MessageCreate } from "@/services/support/support.service";

const QK = {
  list: (params?: object) => ["support", "tickets", params] as const,
  detail: (id: string) => ["support", "tickets", id] as const,
  messages: (ticketId: string) => ["support", "tickets", ticketId, "messages"] as const,
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
