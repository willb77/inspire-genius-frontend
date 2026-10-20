import { useState } from "react"
import { toast } from "sonner"
import { FileDown, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/useAuth"
import {
  useBlueprintValidation,
  useExportRationale,
  useValidationEnabled,
  useWithdrawValidation,
  validationErrorMessage,
} from "@/hooks/job-blueprint/useBlueprintValidation"
import type { BlueprintValidation, ValidationEvent } from "@/types/job-blueprint"
import {
  RecordAttestationForm,
  RequestValidationForm,
  VerdictForm,
  type NoteDimension,
} from "./ValidationForms"

const STATE_LABEL: Record<BlueprintValidation["state"], string> = {
  none: "Not validated",
  in_review: "In review",
  validated: "Validated",
  changes_requested: "Changes requested",
  withdrawn: "Request withdrawn",
}

const OPEN = new Set<BlueprintValidation["state"]>(["none", "withdrawn", "changes_requested"])

function eventLine(e: ValidationEvent): string {
  const when = e.at.slice(0, 10)
  switch (e.event) {
    case "requested":
      return `${when} — ${e.actorName} asked ${e.reviewerName ?? "a reviewer"} to validate`
    case "validated":
      return e.method === "recorded"
        ? `${when} — ${e.actorName} recorded an attestation by ${e.validatorName ?? "an SME (name no longer held)"}`
        : `${when} — validated by ${e.validatorName ?? e.actorName} in IG`
    case "changes_requested":
      return `${when} — ${e.actorName} asked for changes`
    case "withdrawn":
      return `${when} — ${e.actorName} withdrew the request`
  }
}

/** "Download the Rationale Report (.docx)" — the server assembles, the browser lays out. */
export function RationaleExportButton({ blueprintId }: { blueprintId: string }) {
  const exportReport = useExportRationale()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="space-y-1">
      <Button
        variant="outline"
        onClick={async () => {
          setError(null)
          try {
            await exportReport.mutateAsync(blueprintId)
          } catch (err) {
            setError(validationErrorMessage(err, "Could not build the Rationale Report."))
          }
        }}
        disabled={exportReport.isPending}
      >
        <FileDown className="mr-1 h-4 w-4" />
        {exportReport.isPending ? "Building…" : "Rationale Report (.docx)"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}

/**
 * N-4 — employer / SME validation of THIS version, on the Job DNA detail page.
 *
 * Renders nothing unless the server says the `blueprint_validation` switch is
 * on for the caller, so with the switch off the page is unchanged. Validation
 * is a second axis beside the lifecycle status and never changes it: a
 * validated role is matched exactly as before.
 */
export function BlueprintValidationPanel({
  blueprintId,
  dims,
}: {
  blueprintId: string
  dims: NoteDimension[]
}) {
  const enabled = useValidationEnabled()
  const { data, isLoading, isError } = useBlueprintValidation(blueprintId, enabled)
  const withdraw = useWithdrawValidation()
  const { user } = useAuth()
  const [form, setForm] = useState<"request" | "record" | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!enabled) return null

  const canWithdraw = !!data && data.state === "in_review" && (data.requestedByYou || user?.role === "super-admin")

  return (
    <Card className="mb-6" data-testid="validation-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" /> Employer / SME validation
        </CardTitle>
        <CardDescription>
          Whether an employer or subject-matter expert has confirmed this version&apos;s benchmark. Validation is
          per version and does not change how the role is matched.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? <p className="text-sm text-[#6b7280]">Loading validation…</p> : null}
        {isError ? (
          <p role="alert" className="text-sm text-red-600">
            Could not load this role&apos;s validation.
          </p>
        ) : null}
        {data ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full bg-[rgba(18,122,138,0.1)] px-2.5 py-0.5 text-xs font-medium text-[#127A8A]"
                data-testid="validation-state"
              >
                {STATE_LABEL[data.state]}
                {data.state === "validated" && data.current?.method === "recorded" ? " (recorded attestation)" : ""}
              </span>
              {data.state === "in_review" && data.reviewerName ? (
                <span className="text-sm text-[#6b7280]">awaiting {data.reviewerName}</span>
              ) : null}
            </div>

            {!data.eligible && data.ineligibleReason ? (
              <p className="text-sm text-[#6b7280]">{data.ineligibleReason}</p>
            ) : null}

            {data.state === "validated" && data.current ? (
              <p className="text-sm">
                {data.current.validatorName ?? "Name no longer held (90-day retention)"}
                {data.current.validatorOrg ? `, ${data.current.validatorOrg}` : ""}
                {data.current.validatedOn ? ` — ${data.current.validatedOn}` : ""}
                {data.current.method === "recorded" ? ` · recorded by ${data.current.actorName}` : ""}
              </p>
            ) : null}

            {data.awaitingYou ? (
              <div className="rounded-md border border-[#C88B1B] p-3">
                <p className="mb-2 text-sm font-medium">This role is awaiting your validation.</p>
                <VerdictForm blueprintId={blueprintId} dims={dims} />
              </div>
            ) : null}

            {data.eligible && OPEN.has(data.state) ? (
              <div className="flex flex-wrap gap-2">
                <Button variant={form === "request" ? "default" : "outline"} onClick={() => setForm(form === "request" ? null : "request")}>
                  Request validation
                </Button>
                <Button variant={form === "record" ? "default" : "outline"} onClick={() => setForm(form === "record" ? null : "record")}>
                  Record an attestation
                </Button>
              </div>
            ) : null}
            {data.eligible && OPEN.has(data.state) && form === "request" ? (
              <RequestValidationForm blueprintId={blueprintId} onDone={() => setForm(null)} />
            ) : null}
            {data.eligible && OPEN.has(data.state) && form === "record" ? (
              <RecordAttestationForm blueprintId={blueprintId} dims={dims} onDone={() => setForm(null)} />
            ) : null}

            {canWithdraw ? (
              <Button
                variant="outline"
                disabled={withdraw.isPending}
                onClick={async () => {
                  setError(null)
                  try {
                    await withdraw.mutateAsync({ id: blueprintId })
                    toast.success("Request withdrawn.")
                  } catch (err) {
                    setError(validationErrorMessage(err, "Could not withdraw the request."))
                  }
                }}
              >
                Withdraw the request
              </Button>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            ) : null}

            {data.history.length ? (
              <div>
                <p className="mb-1 text-xs font-medium text-[#6b7280]">History</p>
                <ul className="space-y-0.5 text-xs text-[#374151]" data-testid="validation-history">
                  {data.history.map((e) => (
                    <li key={e.id}>{eventLine(e)}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <RationaleExportButton blueprintId={blueprintId} />
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
