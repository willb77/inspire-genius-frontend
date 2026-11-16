import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TicketOut } from "@/services/support/support.service";
import { useTranslation } from "react-i18next";

export type SupportRequestListProps = {
  tickets: TicketOut[];
  isLoading: boolean;
  /** Ticket just submitted in this session — briefly called out in the list. */
  highlightId?: string | null;
};

/** Absolute local time, so "sent" and "resolved" are directly comparable. */
const fmt = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
};

const priorityVariant = (priority: string) => {
  if (priority === "critical") return "destructive" as const;
  if (priority === "high") return "default" as const;
  return "secondary" as const;
};

export default function SupportRequestList({
  tickets,
  isLoading,
  highlightId,
}: SupportRequestListProps) {
  const { t } = useTranslation("accountUi")
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4">
      <div className="text-left mb-3 font-semibold">{t("supportRequestList.yourRequests", { defaultValue: "Your requests" })}</div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <Skeleton className="h-4 w-40" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
              <Skeleton className="mt-2 h-10 w-full" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && tickets.length === 0 && (
        <div className="text-sm text-muted-foreground">
          {t("supportRequestList.youHaveNotPostedAnySupport", { defaultValue: "You have not posted any support requests yet." })}
        </div>
      )}

      {!isLoading && tickets.length > 0 && (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className={cn(
                "border rounded-lg p-3",
                ticket.id === highlightId && "border-blue-300 bg-blue-50/40",
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="font-medium">
                  {ticket.ticket_number ? (
                    <span className="mr-2 text-muted-foreground tabular-nums">
                      #{ticket.ticket_number}
                    </span>
                  ) : null}
                  {ticket.subject}
                </div>
                <div className="flex items-center gap-2">
                  {ticket.source === "assistant" && (
                    <Badge variant="outline">{t("supportRequestList.supportChat", { defaultValue: "Support chat" })}</Badge>
                  )}
                  <Badge variant={ticket.status === "open" ? "secondary" : "default"}>
                    {ticket.status}
                  </Badge>
                  <Badge variant={priorityVariant(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                </div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground line-clamp-3 whitespace-pre-line">
                {ticket.description}
              </div>

              {/* Sent / resolved provenance. `resolved_at` is null both while
                  a request is open and for requests closed before we began
                  recording it, so the closed-without-a-time case is stated
                  rather than left looking like an open request. */}
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <dt className="font-medium">{t("supportRequestList.sent", { defaultValue: "Sent" })}</dt>
                <dd>{fmt(ticket.created_at) ?? "—"}</dd>

                <dt className="font-medium">{t("supportRequestList.assigned", { defaultValue: "Assigned" })}</dt>
                <dd>
                  {ticket.assigned_to
                    ? `${ticket.assigned_to_name ?? ticket.assigned_to}${
                        fmt(ticket.assigned_at) ? ` — ${fmt(ticket.assigned_at)}` : ""
                      }`
                    : t("supportRequestList.awaitingAssignment", { defaultValue: "Awaiting assignment" })}
                </dd>

                {ticket.resolved_at ? (
                  <>
                    <dt className="font-medium">{t("supportRequestList.resolved", { defaultValue: "Resolved" })}</dt>
                    <dd>{fmt(ticket.resolved_at)}</dd>
                    <dt className="font-medium">{t("supportRequestList.resolvedBy", { defaultValue: "Resolved by" })}</dt>
                    <dd>{ticket.resolved_by ?? t("supportRequestList.notRecorded", { defaultValue: "Not recorded" })}</dd>
                  </>
                ) : ticket.status === "closed" ? (
                  <>
                    <dt className="font-medium">{t("supportRequestList.resolved", { defaultValue: "Resolved" })}</dt>
                    <dd>{t("supportRequestList.closedTimeNotRecorded", { defaultValue: "Closed — time not recorded" })}</dd>
                  </>
                ) : (
                  <>
                    <dt className="font-medium">{t("supportRequestList.resolved", { defaultValue: "Resolved" })}</dt>
                    <dd>{t("supportRequestList.notYetResolved", { defaultValue: "Not yet resolved" })}</dd>
                  </>
                )}
              </dl>

              {ticket.attachments?.length ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  {ticket.attachments.length === 1
                    ? t("supportRequestList.screenshotAttachedOne", { defaultValue: "{{n}} screenshot attached", n: ticket.attachments.length })
                    : t("supportRequestList.screenshotsAttachedOther", { defaultValue: "{{n}} screenshots attached", n: ticket.attachments.length })}
                </div>
              ) : null}

              {ticket.contact_email ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  {t("supportRequestList.weWillReplyTo", { defaultValue: "We will reply to {{email}}", email: ticket.contact_email })}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
