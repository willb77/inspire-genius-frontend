/**
 * Support Service client — tickets and messages.
 *
 * Talks to the Support Service Lambda (v1/support/*).
 */
import { api } from "@/lib/axios";

// ─── Types ──────────────────────────────────────────────────────

export type TicketCreate = {
  /** Optional — the backend takes ownership from the verified JWT and ignores
   *  any user_id sent here. Kept for backward compatibility only. */
  user_id?: string;
  org_id?: string;
  subject: string;
  description: string;
  priority?: string;
  category?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
};

export type TicketUpdate = {
  status?: string;
  priority?: string;
  category?: string;
};

export type TicketOut = {
  id: string;
  user_id: string;
  org_id: string | null;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
};

export type MessageCreate = {
  author_id: string;
  author_role?: string;
  content: string;
};

export type MessageOut = {
  id: string;
  ticket_id: string;
  author_id: string;
  author_role: string;
  content: string;
  created_at: string;
};

// ─── API calls ──────────────────────────────────────────────────

export async function createTicket(req: TicketCreate): Promise<TicketOut> {
  const resp = await api.post("/v1/support/tickets", req);
  return (resp.data as { data: TicketOut }).data;
}

export async function listTickets(params?: {
  user_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<TicketOut[]> {
  const resp = await api.get("/v1/support/tickets", { params });
  return (resp.data as { data: TicketOut[] }).data;
}

export async function getTicket(ticketId: string): Promise<TicketOut> {
  const resp = await api.get(`/v1/support/tickets/${encodeURIComponent(ticketId)}`);
  return (resp.data as { data: TicketOut }).data;
}

export async function updateTicket(ticketId: string, req: TicketUpdate): Promise<TicketOut> {
  const resp = await api.patch(`/v1/support/tickets/${encodeURIComponent(ticketId)}`, req);
  return (resp.data as { data: TicketOut }).data;
}

export async function addMessage(ticketId: string, req: MessageCreate): Promise<MessageOut> {
  const resp = await api.post(
    `/v1/support/tickets/${encodeURIComponent(ticketId)}/messages`,
    req,
  );
  return (resp.data as { data: MessageOut }).data;
}

export async function listMessages(ticketId: string): Promise<MessageOut[]> {
  const resp = await api.get(
    `/v1/support/tickets/${encodeURIComponent(ticketId)}/messages`,
  );
  return (resp.data as { data: MessageOut[] }).data;
}
