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
                  <Badge variant={t.status === "open" ? "secondary" : "default"}>
                    {t.status}
                  </Badge>
                  <Badge variant={priorityVariant(t.priority)}>
                    {t.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="mt-1 text-sm text-muted-foreground line-clamp-3 whitespace-pre-line">
                {t.description}
              </div>
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
