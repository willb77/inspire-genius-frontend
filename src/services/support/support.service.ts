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

export type AttachmentOut = {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
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
  // All five are OPTIONAL on purpose. The frontend deploys independently of
  // support-service — staging-b routinely runs an older backend — so a tier
  // that has not taken migration 003 yet simply omits them. Declaring them
  // required would typecheck against a response shape that tier never sends,
  // and every consumer below already treats absence as "not recorded".
  /** Null while open, and also for tickets closed before we recorded this. */
  resolved_at?: string | null;
  resolved_by?: string | null;
  /** "form" for a posted request, "assistant" for a Speak with Support chat. */
  source?: string;
  session_id?: string | null;
  attachments?: AttachmentOut[];
  // Lifecycle (support-service migration 004). Optional for the same reason.
  /** The number a person quotes: "#1042". Null for rows the migration has not numbered. */
  ticket_number?: number | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  assigned_at?: string | null;
  assigned_by?: string | null;
  closed_at?: string | null;
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
  /** "message" — the requester thread; "note" — an admin's resolution note. */
  kind?: string;
};

// ─── Help and Support Management (super-admin) ──────────────────

export type AssignmentOut = {
  id: string;
  ticket_id: string;
  assigned_to: string;
  assigned_to_name: string | null;
  assigned_by: string | null;
  /** "claim" (took an unassigned ticket) or "escalation" (handed on). */
  reason: string;
  note: string | null;
  created_at: string;
};

export type AdminTicketOut = TicketOut & {
  notes: MessageOut[];
  assignments: AssignmentOut[];
};

export type AdminUserOut = {
  email: string;
  full_name: string | null;
};

export type ClaimResult = {
  /** False when the ticket already belongs to another admin — never stolen. */
  claimed: boolean;
  ticket: AdminTicketOut;
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

// ── Screenshots ───────────────────────────────────────────────────────────────

type PresignResponse = {
  attachment_id: string;
  upload_url: string;
  s3_key: string;
  expires_in: number;
};

/**
 * Attach one screenshot to an existing ticket.
 *
 * Three steps by design: ask the server for a presigned PUT, send the bytes
 * straight to S3, then record the row. Posting the image through the API
 * would push it across API Gateway's 10 MB request ceiling — a normal retina
 * screenshot is big enough to matter — and the row is only written after the
 * bytes land, so the ticket never lists an attachment that does not exist.
 *
 * Throws on failure. The caller decides whether a failed screenshot should
 * fail the whole request; it should not, because the ticket itself is already
 * saved by this point.
 */
export async function uploadTicketScreenshot(
  ticketId: string,
  file: File,
): Promise<AttachmentOut> {
  const presignResp = await api.post(
    `/v1/support/tickets/${ticketId}/attachments/presign`,
    {
      filename: file.name,
      content_type: file.type || "image/png",
      size_bytes: file.size,
    },
  );
  const presign = (presignResp.data as { data: PresignResponse }).data;

  // Direct to S3 — deliberately NOT the `api` axios instance, which would
  // attach the IG access-token header to a presigned request and cause S3 to
  // reject the signature.
  const put = await fetch(presign.upload_url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "image/png" },
  });
  if (!put.ok) {
    throw new Error(`Screenshot upload failed (${put.status})`);
  }

  const confirm = await api.post(
    `/v1/support/tickets/${ticketId}/attachments`,
    presign,
  );
  return (confirm.data as { data: AttachmentOut }).data;
}

// ── Speak with Support → the requests log ─────────────────────────────────────

/**
 * Record a Speak with Support conversation in the user's requests list.
 *
 * Idempotent on `sessionId`: called as the conversation grows, replacing the
 * stored transcript rather than adding a row per turn.
 */
export async function logAssistantSession(
  sessionId: string,
  subject: string,
  transcript: string,
): Promise<TicketOut> {
  const resp = await api.post("/v1/support/assistant-sessions", {
    session_id: sessionId,
    subject,
    transcript,
  });
  return (resp.data as { data: TicketOut }).data;
}

// ── Help and Support Management API ──────────────────────────────────────────
//
// All of these are 403 for anyone but a platform administrator; the page
// that calls them is already behind the super-admin route guard.

const ADMIN = "/v1/support/admin";

export async function listAdminTickets(params?: {
  status?: string;
  assigned_to?: string;
}): Promise<AdminTicketOut[]> {
  const resp = await api.get(`${ADMIN}/tickets`, { params });
  return (resp.data as { data: AdminTicketOut[] }).data;
}

export async function getAdminTicket(ticketId: string): Promise<AdminTicketOut> {
  const resp = await api.get(`${ADMIN}/tickets/${encodeURIComponent(ticketId)}`);
  return (resp.data as { data: AdminTicketOut }).data;
}

export async function listAdmins(): Promise<AdminUserOut[]> {
  const resp = await api.get(`${ADMIN}/admins`);
  return (resp.data as { data: AdminUserOut[] }).data;
}

/** The emailed link lands here: assign the ticket to whoever opened it. */
export async function claimTicket(ticketId: string): Promise<ClaimResult> {
  const resp = await api.post(`${ADMIN}/tickets/${encodeURIComponent(ticketId)}/claim`);
  return (resp.data as { data: ClaimResult }).data;
}

export async function escalateTicket(
  ticketId: string,
  req: { to_email: string; note?: string },
): Promise<AdminTicketOut> {
  const resp = await api.post(`${ADMIN}/tickets/${encodeURIComponent(ticketId)}/escalate`, req);
  return (resp.data as { data: AdminTicketOut }).data;
}

export async function addAdminNote(ticketId: string, content: string): Promise<AdminTicketOut> {
  const resp = await api.post(`${ADMIN}/tickets/${encodeURIComponent(ticketId)}/notes`, { content });
  return (resp.data as { data: AdminTicketOut }).data;
}

export async function resolveTicket(ticketId: string, note?: string): Promise<AdminTicketOut> {
  const resp = await api.post(
    `${ADMIN}/tickets/${encodeURIComponent(ticketId)}/resolve`,
    note ? { content: note } : undefined,
  );
  return (resp.data as { data: AdminTicketOut }).data;
}
