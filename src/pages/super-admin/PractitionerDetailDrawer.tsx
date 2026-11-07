import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { usePractitionerDetail } from "@/hooks/super-admin/usePractitionerDetail"
import { registryErrorSummary } from "@/services/super-admin/practitioner-registry/registryErrors"
import type { RegistryRow } from "@/types/practitioner-registry"

/**
 * S2 — super-admin practitioner detail drawer (PI-6, partial).
 *
 * Shows the registry row the operator already has, plus two counts from
 * GET .../{sub}/detail: linked clients, and surveys raised on this Site ID in
 * the last 30 days. Counts only — no client is named here.
 *
 * Not yet: open client invites (needs PI-3), the per-client list and the
 * per-survey list. The drawer says so rather than showing an empty table.
 */
export function PractitionerDetailDrawer({ row, onClose }: { row: RegistryRow; onClose: () => void }) {
  const detail = usePractitionerDetail(row.practitionerSub)
  const windowDays = detail.data?.surveyWindowDays ?? 30

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{row.displayName}</SheetTitle>
          <SheetDescription>
            {row.region} / {row.country}
          </SheetDescription>
          <div>
            <Badge variant={row.active ? "default" : "secondary"}>{row.active ? "Active" : "Deactivated"}</Badge>
          </div>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          <section aria-label="PRISM identifiers" className="space-y-1 text-sm">
            <h3 className="font-medium">PRISM identifiers</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt className="text-muted-foreground">Site ID</dt>
              <dd className="font-mono text-xs break-all">{row.siteId}</dd>
              <dt className="text-muted-foreground">Client ID</dt>
              <dd className="font-mono text-xs break-all">{row.clientId}</dd>
              <dt className="text-muted-foreground">IG Reference</dt>
              <dd className="font-mono text-xs break-all">{row.reference}</dd>
              <dt className="text-muted-foreground">ExternalIdent</dt>
              <dd className="font-mono text-xs break-all">{row.externalIdent}</dd>
              <dt className="text-muted-foreground">Code</dt>
              <dd className="font-mono text-xs">{row.practitionerCode ?? "—"}</dd>
            </dl>
          </section>

          <section aria-label="Activity" className="space-y-2 text-sm">
            <h3 className="font-medium">Activity</h3>
            {detail.isLoading ? (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading counts…
              </p>
            ) : detail.error ? (
              <p role="alert" className="text-destructive">
                {registryErrorSummary(detail.error, "Could not load this practitioner's counts")}
              </p>
            ) : detail.data ? (
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <dt className="text-xs text-muted-foreground">Linked clients</dt>
                  <dd className="text-2xl font-semibold" aria-label="Linked clients count">
                    {detail.data.linkedClients}
                  </dd>
                </div>
                <div className="rounded-md border p-3">
                  <dt className="text-xs text-muted-foreground">Surveys on this site ({windowDays} days)</dt>
                  <dd className="text-2xl font-semibold" aria-label="Surveys on this site count">
                    {detail.data.surveysOnSite30d}
                  </dd>
                </div>
              </dl>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Linked clients are client accounts connected to this practitioner. Surveys are counted by Site ID, so
              they include every survey raised on this PRISM site. Open client invites will appear here once client
              invite links are built.
            </p>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
