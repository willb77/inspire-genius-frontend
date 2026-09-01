import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TicketOut } from "@/services/support/support.service";

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
  return (
    <div className="bg-white rounded-2xl border shadow-sm p-4">
      <div className="text-left mb-3 font-semibold">Your requests</div>

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
          You have not posted any support requests yet.
        </div>
      )}

      {!isLoading && tickets.length > 0 && (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div
              key={t.id}
              className={cn(
                "border rounded-lg p-3",
                t.id === highlightId && "border-blue-300 bg-blue-50/40",
              )}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="font-medium">{t.subject}</div>
                <div className="flex items-center gap-2">
                  {t.source === "assistant" && (
                    <Badge variant="outline">Support chat</Badge>
                  )}
                  <Badge variant={t.status === "open" ? "secondary" : "default"}>
                    {t.status}
                  </Badge>
                  <Badge variant={priorityVariant(t.priority)}>
                    {t.priority}
                  </Badge>
                </div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground line-clamp-3 whitespace-pre-line">
                {t.description}
              </div>

              {/* Sent / resolved provenance. `resolved_at` is null both while
                  a request is open and for requests closed before we began
                  recording it, so the closed-without-a-time case is stated
                  rather than left looking like an open request. */}
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <dt className="font-medium">Sent</dt>
                <dd>{fmt(t.created_at) ?? "—"}</dd>

                {t.resolved_at ? (
                  <>
                    <dt className="font-medium">Resolved</dt>
                    <dd>{fmt(t.resolved_at)}</dd>
                    <dt className="font-medium">Resolved by</dt>
                    <dd>{t.resolved_by ?? "Not recorded"}</dd>
                  </>
                ) : t.status === "closed" ? (
                  <>
                    <dt className="font-medium">Resolved</dt>
                    <dd>Closed — time not recorded</dd>
                  </>
                ) : (
                  <>
                    <dt className="font-medium">Resolved</dt>
                    <dd>Not yet resolved</dd>
                  </>
                )}
              </dl>

              {t.attachments?.length ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  {t.attachments.length} screenshot
                  {t.attachments.length === 1 ? "" : "s"} attached
                </div>
              ) : null}

              {t.contact_email ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  We will reply to {t.contact_email}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
