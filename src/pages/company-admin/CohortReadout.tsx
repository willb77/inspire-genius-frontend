import { useState } from "react"
import { useTranslation } from "react-i18next"
import { isAxiosError } from "axios"
import { AlertCircle, Download, FileText, Users } from "lucide-react"
import { toast } from "sonner"
import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCohortReadout, useCohortReadoutExport } from "@/hooks/company-admin/useCohortReadout"
import { useOrgDirectory } from "@/hooks/super-admin/organization-management/useOrganizationManagement"
import type { CohortCell, CohortExportFormat, CohortMetric, CohortReadoutFull } from "@/types/cohortReadout"

/**
 * N-3 — the cohort read-out: the organisation's PRISM coverage, Job Fit
 * distribution, goals and practice, as counts and percentages. Every number is
 * an aggregate; groups under 5 people arrive from the server as "<5" and are
 * shown exactly so. The page never computes a count itself.
 *
 * Two audiences share this body. A company-admin (the default) reads their own
 * org: no picker, and the calls carry no `org_id`. A super-admin
 * (`/super-admin/cohort-readout`) must pick an organisation first — the server
 * answers 422 without one — and nothing is fetched until they do.
 */
export type CohortReadoutAudience = "company-admin" | "super-admin"

export default function CohortReadout({ audience = "company-admin" }: { audience?: CohortReadoutAudience }) {
  const { t } = useTranslation("companyAdminPages")
  const isSuperAdmin = audience === "super-admin"
  const [since, setSince] = useState("")
  const [orgId, setOrgId] = useState("")
  const { data, isLoading, error } = useCohortReadout(
    since || undefined,
    isSuperAdmin ? { orgId: orgId || undefined } : undefined,
  )
  const exportMutation = useCohortReadoutExport()
  const Layout = isSuperAdmin ? SuperAdminLayout : CompanyAdminLayout

  const handleExport = (format: CohortExportFormat) => {
    exportMutation.mutate(
      isSuperAdmin ? { format, since: since || undefined, orgId } : { format, since: since || undefined },
      {
        onSuccess: (blob) => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `cohort-readout.${format}`
          a.click()
          URL.revokeObjectURL(url)
        },
        onError: () => toast.error(t("cohortExportFailed", { defaultValue: "The export failed. Please try again." })),
      },
    )
  }

  const forbidden = isAxiosError(error) && error.response?.status === 403
  const detail =
    isAxiosError(error) && typeof error.response?.data?.detail === "string" ? error.response.data.detail : null

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{t("cohortTitle", { defaultValue: "Cohort read-out" })}</h1>
            <p className="text-sm text-muted-foreground">
              {isSuperAdmin
                ? t("cohortIntroSuperAdmin", { defaultValue: "An organisation at a glance — counts and percentages only, never an individual's result." })
                : t("cohortIntroOwn", { defaultValue: "Your organisation at a glance — counts and percentages only, never an individual's result." })}
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            {isSuperAdmin && <OrgPicker value={orgId} onChange={setOrgId} />}
            <label className="flex flex-col text-xs text-muted-foreground">
              {t("cohortActivitySinceLabel", { defaultValue: "Activity since" })}
              <input
                type="date"
                aria-label={t("cohortActivitySinceLabel", { defaultValue: "Activity since" })}
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="mt-1 rounded-md border px-2 py-1 text-sm text-foreground"
              />
            </label>
            <Button
              variant="outline"
              onClick={() => handleExport("csv")}
              disabled={!data || exportMutation.isPending}
            >
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button onClick={() => handleExport("docx")} disabled={!data || exportMutation.isPending}>
              <FileText className="mr-2 h-4 w-4" /> {t("cohortWordDay90", { defaultValue: "Word (day-90)" })}
            </Button>
          </div>
        </header>

        {isSuperAdmin && !orgId && (
          <p className="rounded-md border p-4 text-sm text-muted-foreground">
            {t("cohortPickOrgPrompt", { defaultValue: "Pick an organisation to see its read-out." })}
          </p>
        )}

        {isLoading && <Skeleton className="h-48 w-full" />}

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/40 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
            <span>
              {forbidden
                ? (detail ??
                  (isSuperAdmin
                    ? t("cohortNotEnabledSuperAdmin", { defaultValue: "The cohort read-out is not enabled for this organisation." })
                    : t("cohortNotEnabledOwn", { defaultValue: "The cohort read-out is not enabled for your organisation." })))
                : t("cohortLoadFailed", { defaultValue: "The cohort read-out could not be loaded. Please try again." })}
            </span>
          </div>
        )}

        {data?.suppressed && (
          <div role="status" className="rounded-md border p-4 text-sm">
            {isSuperAdmin
              ? t("cohortSuppressedSuperAdmin", { threshold: data.threshold, defaultValue: "This organisation has fewer than {{threshold}} members, so no figures are shown — any number would describe individual people." })
              : t("cohortSuppressedOwn", { threshold: data.threshold, defaultValue: "Your organisation has fewer than {{threshold}} members, so no figures are shown — any number would describe individual people." })}
          </div>
        )}

        {data && !data.suppressed && <ReadoutBody data={data} />}

        <p className="text-xs text-muted-foreground">
          {t("cohortFooterNote", { defaultValue: "Any group of fewer than 5 people is shown as <5. Where a hidden number could be worked out from the total, a second number is hidden too. \"Confirmed at least one goal\" counts members who confirmed a goal they set." })}
        </p>
      </div>
    </Layout>
  )
}

/** Super-admin only: every live organisation, from org-service's directory. */
function OrgPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useTranslation("companyAdminPages")
  const { data: orgs, isLoading, isError } = useOrgDirectory()
  return (
    <label className="flex flex-col text-xs text-muted-foreground">
      {t("cohortOrganisationLabel", { defaultValue: "Organisation" })}
      <select
        aria-label={t("cohortOrganisationLabel", { defaultValue: "Organisation" })}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading || isError}
        className="mt-1 min-w-48 rounded-md border px-2 py-1 text-sm text-foreground"
      >
        <option value="">
          {isLoading ? t("cohortOrgsLoading", { defaultValue: "Loading organisations…" }) : isError ? t("cohortOrgsLoadFailed", { defaultValue: "Organisations could not be loaded" }) : t("cohortPickOrganisation", { defaultValue: "Pick an organisation" })}
        </option>
        {(orgs ?? []).map((o) => (
          <option key={o.id} value={o.id}>
            {o.name || o.id}
          </option>
        ))}
      </select>
    </label>
  )
}

function pct(cell: CohortCell): string {
  return cell.suppressed || cell.percent === null ? "" : `${cell.percent.toFixed(1)}%`
}

function MetricCard({ title, metric, extra }: { title: string; metric: CohortMetric; extra?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{metric.display}</div>
      <div className="text-sm text-muted-foreground">
        {metric.label}
        {pct(metric) && ` · ${pct(metric)}`}
      </div>
      {extra && <div className="mt-1 text-xs text-muted-foreground">{extra}</div>}
    </div>
  )
}

function ReadoutBody({ data }: { data: CohortReadoutFull }) {
  const { t } = useTranslation("companyAdminPages")
  const m = data.metrics
  const sessions = m.practice.sessions === null ? "<5" : String(m.practice.sessions)
  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        <Users className="h-4 w-4" />
        <span>
          <strong>{data.members}</strong> {t("cohortMembers", { defaultValue: "members" })}
          {data.since && ` · ${t("cohortActivitySince", { since: data.since, defaultValue: "activity since {{since}}" })}`}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard title={t("cohortPrismCoverage", { defaultValue: "PRISM coverage" })} metric={m.prismCoverage} />
        <MetricCard title={t("cohortGoalsSet", { defaultValue: "Goals set" })} metric={m.goalsSet} />
        <MetricCard title={t("cohortGoalsProgressed", { defaultValue: "Goals progressed" })} metric={m.goalsProgressed} />
        <MetricCard title={t("cohortPractice", { defaultValue: "Practice" })} metric={m.practice} extra={t("cohortPracticeSessionsTotal", { sessions, defaultValue: "Practice sessions in total: {{sessions}}" })} />
      </div>
      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-medium">{t("cohortJobFitDistribution", { defaultValue: "Job Fit distribution" })}</h2>
        {data.jobFit.withheld && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("cohortWithheld", { defaultValue: "Withheld: every member is in the same tier, so the breakdown would state each person's result." })}
          </p>
        )}
        <table className="mt-2 w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">{t("cohortColTier", { defaultValue: "Tier" })}</th>
              <th className="py-1">{t("cohortColPeople", { defaultValue: "People" })}</th>
              <th className="py-1">{t("cohortColPercent", { defaultValue: "Percent of members" })}</th>
            </tr>
          </thead>
          <tbody>
            {data.jobFit.cells.map((c) => (
              <tr key={c.tier} className="border-t">
                <td className="py-1">{c.label}</td>
                <td className="py-1">{c.display}</td>
                <td className="py-1">{pct(c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  )
}
