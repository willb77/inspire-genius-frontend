import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Inbox, UserCheck } from "lucide-react";

import SuperAdminLayout from "@/layouts/SuperAdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/useAuth";
import {
  useAddAdminNote,
  useAdminTicket,
  useAdminTickets,
  useAdmins,
  useClaimTicket,
  useEscalateTicket,
  useResolveTicket,
} from "@/hooks/support/useSupportTickets";
import type { AdminTicketOut } from "@/services/support/support.service";

/**
 * Help and Support Management — Administration.
 *
 * The list every support ticket lands in, with who has it and when it was
 * opened, assigned and closed. The emailed "Open this ticket" link is
 * `/super-admin/support/:ticketId?claim=1`: opening it assigns the ticket to
 * the admin who clicked, unless a colleague already has it. From the ticket an
 * admin can escalate to another admin (roster list), add resolution notes, and
 * resolve. The requester is emailed at each step by the service.
 */

const fmt = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

const statusVariant = (status: string) =>
  status === "closed" ? ("default" as const) : ("secondary" as const);

const priorityVariant = (priority: string) => {
  if (priority === "critical" || priority === "urgent") return "destructive" as const;
  if (priority === "high") return "default" as const;
  return "outline" as const;
};

const ref = (t: AdminTicketOut) => (t.ticket_number ? `#${t.ticket_number}` : t.id.slice(0, 8));

type StatusFilter = "open" | "closed" | "all";

// ── List ─────────────────────────────────────────────────────────────────────

function TicketList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<StatusFilter>("open");
  const [mineOnly, setMineOnly] = useState(false);
  const query = useAdminTickets(status === "all" ? undefined : { status });

  const myEmail = (user?.email ?? "").toLowerCase();
  const rows = useMemo(() => {
    const all = query.data ?? [];
    return mineOnly ? all.filter((t) => (t.assigned_to ?? "") === myEmail) : all;
  }, [query.data, mineOnly, myEmail]);

  const counts = useMemo(() => {
    const all = query.data ?? [];
    return {
      total: all.length,
      unassigned: all.filter((t) => !t.assigned_to).length,
    };
  }, [query.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Help and Support Management</h1>
          <p className="text-sm text-muted-foreground">
            Every support request, who is responsible for it, and when it was opened,
            assigned and closed.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["open", "closed", "all"] as StatusFilter[]).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? "default" : "outline"}
              onClick={() => setStatus(s)}
            >
              {s === "all" ? "All" : s === "open" ? "Open" : "Closed"}
            </Button>
          ))}
          <Button
            size="sm"
            variant={mineOnly ? "default" : "outline"}
            onClick={() => setMineOnly((v) => !v)}
            aria-pressed={mineOnly}
          >
            Assigned to me
          </Button>
        </div>
      </div>

      {query.data ? (
        <div className="flex gap-2 text-sm text-muted-foreground">
          <span>{counts.total} ticket{counts.total === 1 ? "" : "s"}</span>
          {status !== "closed" ? <span>· {counts.unassigned} unassigned</span> : null}
        </div>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {query.isPending ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : query.isError ? (
            <div className="p-6 text-sm text-destructive">
              Could not load tickets. Refresh to try again.
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-sm text-muted-foreground">
              <Inbox className="size-8" />
              {mineOnly ? "Nothing is assigned to you." : "No tickets match this filter."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Ticket</th>
                    <th className="px-4 py-2">Subject</th>
                    <th className="px-4 py-2">From</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Opened</th>
                    <th className="px-4 py-2">Assigned to</th>
                    <th className="px-4 py-2">Assigned</th>
                    <th className="px-4 py-2">Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr
                      key={t.id}
                      className="cursor-pointer border-b last:border-0 hover:bg-muted/30"
                      onClick={() => navigate(`${ROUTES.SUPER_ADMIN.SUPPORT_MANAGEMENT}/${t.id}`)}
                    >
                      <td className="whitespace-nowrap px-4 py-2 font-medium tabular-nums">
                        {ref(t)}
                      </td>
                      <td className="max-w-[28ch] truncate px-4 py-2" title={t.subject}>
                        <span className="mr-2">{t.subject}</span>
                        <Badge variant={priorityVariant(t.priority)}>{t.priority}</Badge>
                      </td>
                      <td className="max-w-[24ch] truncate px-4 py-2 text-muted-foreground">
                        {t.contact_name || t.contact_email || t.user_id}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                        {fmt(t.created_at)}
                      </td>
                      <td className="px-4 py-2">
                        {t.assigned_to ? (
                          <span className={cn(t.assigned_to === myEmail && "font-medium")}>
                            {t.assigned_to_name ?? t.assigned_to}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Unassigned</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                        {fmt(t.assigned_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">
                        {fmt(t.closed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Detail ───────────────────────────────────────────────────────────────────

function TicketDetail({ ticketId }: { ticketId: string }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const myEmail = (user?.email ?? "").toLowerCase();

  const detail = useAdminTicket(ticketId);
  const admins = useAdmins();
  const claim = useClaimTicket();
  const escalate = useEscalateTicket();
  const addNote = useAddAdminNote();
  const resolve = useResolveTicket();

  const [note, setNote] = useState("");
  const [escalateTo, setEscalateTo] = useState("");
  const [escalateNote, setEscalateNote] = useState("");
  const [closingNote, setClosingNote] = useState("");

  // The emailed link: claim exactly once per visit, then drop the flag so a
  // refresh does not re-claim. The server refuses to take a colleague's
  // ticket, so this is safe to fire even when someone else already has it.
  const claimFired = useRef(false);
  const wantsClaim = searchParams.get("claim") === "1";
  useEffect(() => {
    if (!wantsClaim || claimFired.current || !detail.data) return;
    claimFired.current = true;
    claim.mutate(ticketId, {
      onSettled: () => {
        const next = new URLSearchParams(searchParams);
        next.delete("claim");
        setSearchParams(next, { replace: true });
      },
    });
  }, [wantsClaim, detail.data, claim, ticketId, searchParams, setSearchParams]);

  const t = detail.data;
  const isMine = Boolean(t?.assigned_to && t.assigned_to === myEmail);
  const escalationTargets = (admins.data ?? []).filter((a) => a.email !== (t?.assigned_to ?? ""));

  if (detail.isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (detail.isError || !t) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.SUPER_ADMIN.SUPPORT_MANAGEMENT)}>
          <ArrowLeft className="mr-1 size-4" /> All tickets
        </Button>
        <div className="text-sm text-destructive">
          This ticket could not be loaded. It may have been archived.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.SUPER_ADMIN.SUPPORT_MANAGEMENT)}>
        <ArrowLeft className="mr-1 size-4" /> All tickets
      </Button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-sm text-muted-foreground tabular-nums">Ticket {ref(t)}</div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.subject}</h1>
          <div className="mt-1 flex flex-wrap gap-2">
            <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
            <Badge variant={priorityVariant(t.priority)}>{t.priority}</Badge>
            {t.category ? <Badge variant="outline">{t.category}</Badge> : null}
            {t.source === "assistant" ? <Badge variant="outline">Support chat</Badge> : null}
          </div>
        </div>
        {t.status !== "closed" && !t.assigned_to ? (
          <Button onClick={() => claim.mutate(ticketId)} disabled={claim.isPending}>
            <UserCheck className="mr-1 size-4" /> Assign to me
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 p-4">
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </div>
              <div className="whitespace-pre-line text-sm">{t.description}</div>
            </div>
            {t.attachments?.length ? (
              <div className="text-xs text-muted-foreground">
                {t.attachments.length} screenshot{t.attachments.length === 1 ? "" : "s"} attached
              </div>
            ) : null}

            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Resolution notes
              </div>
              {t.notes.length === 0 ? (
                <div className="text-sm text-muted-foreground">No notes yet.</div>
              ) : (
                <ul className="space-y-2">
                  {t.notes.map((n) => (
                    <li key={n.id} className="rounded-lg border bg-muted/30 p-3 text-sm">
                      <div className="whitespace-pre-line">{n.content}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{fmt(n.created_at)}</div>
                    </li>
                  ))}
                </ul>
              )}
              {t.status !== "closed" ? (
                <form
                  className="mt-3 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const content = note.trim();
                    if (!content) return;
                    addNote.mutate({ ticketId, content }, { onSuccess: () => setNote("") });
                  }}
                >
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note. The requester is emailed a copy."
                    rows={3}
                    aria-label="Resolution note"
                  />
                  <Button type="submit" size="sm" disabled={!note.trim() || addNote.isPending}>
                    Add note
                  </Button>
                </form>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-1 p-4 text-sm">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Requester
              </div>
              <div className="font-medium">{t.contact_name || "—"}</div>
              <div className="text-muted-foreground">{t.contact_email || "—"}</div>
              <div className="text-muted-foreground">{t.contact_phone || "—"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1 p-4 text-sm">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Timeline
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="text-muted-foreground">Opened</dt>
                <dd>{fmt(t.created_at)}</dd>
                <dt className="text-muted-foreground">Assigned to</dt>
                <dd>{t.assigned_to ? t.assigned_to_name ?? t.assigned_to : "Unassigned"}</dd>
                <dt className="text-muted-foreground">Assigned</dt>
                <dd>{fmt(t.assigned_at)}</dd>
                <dt className="text-muted-foreground">Closed</dt>
                <dd>{fmt(t.closed_at)}</dd>
                {t.resolved_by ? (
                  <>
                    <dt className="text-muted-foreground">Resolved by</dt>
                    <dd>{t.resolved_by}</dd>
                  </>
                ) : null}
              </dl>
              {t.assignments.length > 0 ? (
                <div className="mt-3">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    History
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {t.assignments.map((a) => (
                      <li key={a.id}>
                        {fmt(a.created_at)} — {a.reason === "escalation" ? "escalated to" : "claimed by"}{" "}
                        <span className="text-foreground">{a.assigned_to_name ?? a.assigned_to}</span>
                        {a.reason === "escalation" && a.assigned_by ? ` by ${a.assigned_by}` : ""}
                        {a.note ? `: ${a.note}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {t.status !== "closed" ? (
            <Card>
              <CardContent className="space-y-3 p-4 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Escalate
                </div>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={escalateTo}
                  onChange={(e) => setEscalateTo(e.target.value)}
                  aria-label="Escalate to"
                >
                  <option value="">Choose an administrator…</option>
                  {escalationTargets.map((a) => (
                    <option key={a.email} value={a.email}>
                      {a.full_name ? `${a.full_name} — ${a.email}` : a.email}
                    </option>
                  ))}
                </select>
                <Textarea
                  value={escalateNote}
                  onChange={(e) => setEscalateNote(e.target.value)}
                  placeholder="Why (optional). Included in the email to them."
                  rows={2}
                  aria-label="Escalation note"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!escalateTo || escalate.isPending}
                  onClick={() =>
                    escalate.mutate(
                      { ticketId, req: { to_email: escalateTo, note: escalateNote.trim() || undefined } },
                      {
                        onSuccess: () => {
                          setEscalateTo("");
                          setEscalateNote("");
                        },
                      },
                    )
                  }
                >
                  Escalate
                </Button>
                {admins.data && escalationTargets.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No other administrators to escalate to.</div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {t.status !== "closed" ? (
            <Card>
              <CardContent className="space-y-3 p-4 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Resolve
                </div>
                <Textarea
                  value={closingNote}
                  onChange={(e) => setClosingNote(e.target.value)}
                  placeholder="Closing note (optional). Sent to the requester with the resolved email."
                  rows={2}
                  aria-label="Closing note"
                />
                <Button
                  size="sm"
                  disabled={resolve.isPending}
                  onClick={() =>
                    resolve.mutate({ ticketId, note: closingNote.trim() || undefined })
                  }
                >
                  <CheckCircle2 className="mr-1 size-4" />
                  {isMine || !t.assigned_to ? "Mark resolved" : "Mark resolved (assigned to someone else)"}
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function HelpSupportManagement() {
  const { ticketId } = useParams<{ ticketId: string }>();
  return (
    <SuperAdminLayout>
      {ticketId ? <TicketDetail ticketId={ticketId} /> : <TicketList />}
    </SuperAdminLayout>
  );
}
