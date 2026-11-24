import { useEffect, useState } from "react"
import type { JobDNA } from "@/types/job-blueprint"
import { useParams, Link } from "react-router-dom"
import { toast } from "sonner"
import type { TFunction } from "i18next"
import { useTranslation } from "react-i18next"
import { Dna, Pencil, Save, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useJobDnaDetail, useUpdateJobDna } from "@/hooks/job-blueprint/useJobDna"
import { BenchmarkRadarChart } from "@/components/job-blueprint/job-dna/BenchmarkRadarChart"
import { BenchmarkBarChart } from "@/components/job-blueprint/job-dna/BenchmarkBarChart"
import { ClassificationBadge } from "@/components/job-blueprint/shared/ClassificationBadge"
import type { JobTier } from "@/types/job-blueprint"
import { ROUTES } from "@/constants/routes"
import { JobDnaPageHeader, JobDnaLoading, JobDnaError } from "./_shared"
import { BlueprintValidationPanel } from "@/components/job-blueprint/validation/BlueprintValidationPanel"
import { noteDimensions } from "@/components/job-blueprint/validation/noteDimensions"
import { withPrism } from "@/lib/withPrism"

const TIERS: JobTier[] = ["front-line", "professional", "executive"]

/**
 * Job DNA detail — reads the live record (`GET /v1/blueprint/job-dna/:id`) and
 * renders the calibrated benchmark as a radar + per-pillar bar charts. Role
 * details (title, department, tier) can be edited inline and saved via
 * `PUT /v1/blueprint/job-dna/:id` (useUpdateJobDna).
 */
function sourceLabels(t: TFunction): Record<string, string> {
  return {
    "llm-draft": t("dnaDetail.source.llmDraft", { defaultValue: "drafted by the Job DNA engine" }),
    manual: t("dnaDetail.source.manual", { defaultValue: "built by hand" }),
    "jd-extract": t("dnaDetail.source.jdExtract", { defaultValue: "extracted from a job description" }),
    "incumbent-contrast": t("dnaDetail.source.incumbentContrast", { defaultValue: "proposed from incumbent interviews" }),
    unknown: t("dnaDetail.source.unknown", { defaultValue: "source not recorded" }),
  }
}

/** V2 — " · drafted by the Job DNA engine · reviewed 21 Sep 2026" or " · source not recorded". */
function provenanceLine(jobDna: JobDNA, t: TFunction): string {
  const labels = sourceLabels(t)
  const source = labels[jobDna.benchmarkSource ?? "unknown"] ?? labels.unknown
  const reviewed = jobDna.reviewedAt
    ? ` · ${t("dnaDetail.provenance.reviewed", {
        defaultValue: "reviewed {{date}}",
        date: new Date(jobDna.reviewedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }),
      })}`
    : jobDna.status === "active"
      ? ` · ${t("dnaDetail.provenance.reviewerNotRecorded", { defaultValue: "reviewer not recorded" })}`
      : ""
  return ` · ${source}${reviewed}`
}

export default function JobBlueprintDnaDetailPage() {
  const { t } = useTranslation("jobBlueprintPages")
  const { id = "" } = useParams<{ id: string }>()
  const { data: jobDna, isLoading, isError, refetch } = useJobDnaDetail(id)
  const updateJobDna = useUpdateJobDna()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<{ roleTitle: string; department: string; tier: JobTier }>({
    roleTitle: "",
    department: "",
    tier: "professional",
  })

  useEffect(() => {
    if (jobDna) {
      setForm({ roleTitle: jobDna.roleTitle, department: jobDna.department, tier: jobDna.tier })
    }
  }, [jobDna])

  if (isLoading) return <JobDnaLoading label={t("dnaDetail.loading", { defaultValue: "Loading Job DNA…" })} />
  if (isError || !jobDna)
    return (
      <div className="max-w-2xl">
        <JobDnaError message={t("dnaDetail.loadFailed", { defaultValue: "Failed to load this Job DNA." })} onRetry={() => void refetch()} />
        <Link to={ROUTES.JOB_DNA.DASHBOARD} className="mt-3 inline-block text-sm text-[#7C3AED] underline">
          {t("dnaDetail.backToDashboard", { defaultValue: "Back to dashboard" })}
        </Link>
      </div>
    )

  const handleSave = async () => {
    try {
      await updateJobDna.mutateAsync({
        id,
        data: { roleTitle: form.roleTitle, department: form.department, tier: form.tier },
      })
      toast.success(t("dnaDetail.updated", { defaultValue: "Job DNA updated." }))
      setEditing(false)
    } catch {
      toast.error(t("dnaDetail.updateFailed", { defaultValue: "Failed to update Job DNA." }))
    }
  }

  return (
    <div className="max-w-6xl">
      <JobDnaPageHeader
        icon={Dna}
        title={jobDna.roleTitle}
        description={`${jobDna.department} · ${jobDna.tier} · v${jobDna.version}${provenanceLine(jobDna, t)}`}
        action={
          !editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-4 w-4" />
              {t("dnaDetail.editDetails", { defaultValue: "Edit details" })}
            </Button>
          ) : null
        }
      />

      {editing ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">{t("dnaDetail.editTitle", { defaultValue: "Edit role details" })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="roleTitle">{t("dnaDetail.roleTitle", { defaultValue: "Role title" })}</Label>
                <Input
                  id="roleTitle"
                  value={form.roleTitle}
                  onChange={(e) => setForm((p) => ({ ...p, roleTitle: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department">{t("dnaDetail.department", { defaultValue: "Department" })}</Label>
                <Input
                  id="department"
                  value={form.department}
                  onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier">{t("dnaDetail.tier", { defaultValue: "Tier" })}</Label>
                <select
                  id="tier"
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={form.tier}
                  onChange={(e) => setForm((p) => ({ ...p, tier: e.target.value as JobTier }))}
                >
                  {TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={updateJobDna.isPending}>
                <Save className="mr-1 h-4 w-4" />
                {updateJobDna.isPending ? t("dnaDetail.saving", { defaultValue: "Saving…" }) : t("dnaDetail.save", { defaultValue: "Save" })}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                <X className="mr-1 h-4 w-4" />
                {t("dnaDetail.cancel", { defaultValue: "Cancel" })}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-[#6b7280]">{t("dnaDetail.status", { defaultValue: "Status:" })}</span>
        <span className="rounded-full bg-[rgba(124,58,237,0.1)] px-2.5 py-0.5 text-xs font-medium text-[#7C3AED]">
          {jobDna.status}
        </span>
        {jobDna.counterProductiveBehaviors.length > 0 ? (
          <ClassificationBadge tier="misalignment" size="sm" />
        ) : null}
      </div>

      {/* N-4: renders nothing unless blueprint_validation is on for the caller */}
      <BlueprintValidationPanel blueprintId={jobDna.id} dims={noteDimensions(jobDna)} />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{t("dnaDetail.benchmarkProfile", { defaultValue: "Benchmark profile" })}</CardTitle>
          <CardDescription>
            {withPrism(t("dnaDetail.benchmarkNote", { defaultValue: "Authored here — drafted by the Job DNA engine or built by hand — and reviewed by a person. Candidates' PRISM profiles are scored against it. It is not a PRISM-validated job benchmark." }))}
          </CardDescription>
          {jobDna.shape ? (
            jobDna.shape.conforms ? (
              <p className="text-xs text-emerald-700" data-testid="shape-report">
                {t("dnaDetail.shapeConforms", { defaultValue: "Tier shape conforms to the methodology: 3 critical per block, 2 counter-productive behaviours." })}
              </p>
            ) : (
              <p className="text-xs text-amber-700" role="alert" data-testid="shape-report">
                {t("dnaDetail.shapeDiffers", { defaultValue: "Tier shape differs from the methodology: {{violations}}.", violations: jobDna.shape.violations.join("; ") })}
              </p>
            )
          ) : null}
        </CardHeader>
        <CardContent>
          <BenchmarkRadarChart
            behaviors={jobDna.behaviors}
            aptitudes={jobDna.aptitudes}
            coreTraits={jobDna.coreTraits}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-sm">{t("dnaDetail.behaviours", { defaultValue: "Behaviours" })}</CardTitle>
          </CardHeader>
          <CardContent>
            <BenchmarkBarChart benchmarks={jobDna.behaviors} height={250} />
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-sm">{t("dnaDetail.aptitudes", { defaultValue: "Aptitudes" })}</CardTitle>
          </CardHeader>
          <CardContent>
            <BenchmarkBarChart benchmarks={jobDna.aptitudes} height={250} />
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-sm">{t("dnaDetail.coreTraits", { defaultValue: "Core traits" })}</CardTitle>
          </CardHeader>
          <CardContent>
            <BenchmarkBarChart benchmarks={jobDna.coreTraits} height={200} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
