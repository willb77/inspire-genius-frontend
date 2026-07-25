import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { toast } from "sonner"
import { Dna, Pencil, Save, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

const TIERS: JobTier[] = ["front-line", "professional", "executive"]

/**
 * Job DNA detail — reads the live record (`GET /v1/blueprint/job-dna/:id`) and
 * renders the calibrated benchmark as a radar + per-pillar bar charts. Role
 * details (title, department, tier) can be edited inline and saved via
 * `PUT /v1/blueprint/job-dna/:id` (useUpdateJobDna).
 */
export default function JobBlueprintDnaDetailPage() {
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

  if (isLoading) return <JobDnaLoading label="Loading Job DNA…" />
  if (isError || !jobDna)
    return (
      <div className="max-w-2xl">
        <JobDnaError message="Failed to load this Job DNA." onRetry={() => void refetch()} />
        <Link to={ROUTES.JOB_DNA.DASHBOARD} className="mt-3 inline-block text-sm text-[#7C3AED] underline">
          Back to dashboard
        </Link>
      </div>
    )

  const handleSave = async () => {
    try {
      await updateJobDna.mutateAsync({
        id,
        data: { roleTitle: form.roleTitle, department: form.department, tier: form.tier },
      })
      toast.success("Job DNA updated.")
      setEditing(false)
    } catch {
      toast.error("Failed to update Job DNA.")
    }
  }

  return (
    <div className="max-w-6xl">
      <JobDnaPageHeader
        icon={Dna}
        title={jobDna.roleTitle}
        description={`${jobDna.department} · ${jobDna.tier} · v${jobDna.version}`}
        action={
          !editing ? (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-4 w-4" />
              Edit details
            </Button>
          ) : null
        }
      />

      {editing ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Edit role details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="roleTitle">Role title</Label>
                <Input
                  id="roleTitle"
                  value={form.roleTitle}
                  onChange={(e) => setForm((p) => ({ ...p, roleTitle: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={form.department}
                  onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier">Tier</Label>
                <select
                  id="tier"
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={form.tier}
                  onChange={(e) => setForm((p) => ({ ...p, tier: e.target.value as JobTier }))}
                >
                  {TIERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={updateJobDna.isPending}>
                <Save className="mr-1 h-4 w-4" />
                {updateJobDna.isPending ? "Saving…" : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm text-[#6b7280]">Status:</span>
        <span className="rounded-full bg-[rgba(124,58,237,0.1)] px-2.5 py-0.5 text-xs font-medium text-[#7C3AED]">
          {jobDna.status}
        </span>
        {jobDna.counterProductiveBehaviors.length > 0 ? (
          <ClassificationBadge tier="misalignment" size="sm" />
        ) : null}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Benchmark profile</CardTitle>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Behaviours</CardTitle>
          </CardHeader>
          <CardContent>
            <BenchmarkBarChart benchmarks={jobDna.behaviors} height={250} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Aptitudes</CardTitle>
          </CardHeader>
          <CardContent>
            <BenchmarkBarChart benchmarks={jobDna.aptitudes} height={250} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Core traits</CardTitle>
          </CardHeader>
          <CardContent>
            <BenchmarkBarChart benchmarks={jobDna.coreTraits} height={200} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
