import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, RotateCcw, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BulkInviteData } from "@/services/super-admin/user-management/user-management.service"

type DemoImportResultProps = {
  isLoading: boolean
  data: BulkInviteData | undefined
  onReset: () => void
}

/**
 * Terminal result for the bulk importer's "Skip onboarding" path. The
 * auth-service bulk endpoint already created each user active + onboarded and
 * emailed a one-click magic sign-in link, so there are no separate
 * compose/send/track steps — this just reports per-row success/failure.
 */
export function DemoImportResult({ isLoading, data, onReset }: DemoImportResultProps) {
  const total = data?.summary.total ?? 0
  const succeeded = data?.summary.successful ?? 0
  const failed = data?.summary.failed ?? 0
  const rows = [
    ...(data?.successful_invitations ?? []).map((r) => ({
      email: r.email,
      ok: true,
      note: r.result?.email_sent === false ? "created — magic email not sent" : "magic link sent",
    })),
    ...(data?.failed_invitations ?? []).map((r) => ({
      email: r.email,
      ok: false,
      note: r.error ?? "failed",
    })),
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Sparkles className="h-5 w-5 text-primary" />
          )}
          Demo accounts — onboarding skipped
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="mb-2 text-sm text-muted-foreground">
          Each user was provisioned active and already-onboarded, and emailed a
          one-click magic sign-in link — no password setup and no onboarding.
          The compose / send / track steps don't apply to this path.
        </p>

        {isLoading && !data ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Provisioning demo accounts…
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm">
                Total: {total}
              </Badge>
              <Badge
                className={cn(
                  "text-sm",
                  succeeded > 0
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                Provisioned: {succeeded}
              </Badge>
              <Badge
                className={cn(
                  "text-sm",
                  failed > 0
                    ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                Failed: {failed}
              </Badge>
            </div>

            {rows.length > 0 && (
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
                {rows.map((r, i) => (
                  <div
                    key={`${r.email}-${i}`}
                    className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      {r.ok ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                      )}
                      <span className="truncate">{r.email}</span>
                    </div>
                    <span
                      className={cn(
                        "ml-2 truncate text-xs",
                        r.ok ? "text-muted-foreground" : "text-red-600",
                      )}
                    >
                      {r.note}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button variant="outline" onClick={onReset}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Start Over
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
