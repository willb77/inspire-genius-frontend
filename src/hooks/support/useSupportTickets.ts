import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
      queryClient.invalidateQueries({ queryKey: ["support", "tickets"] });
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
  });
}
