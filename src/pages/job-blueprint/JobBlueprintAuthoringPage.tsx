import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, PencilRuler, Sparkles, Wand2 } from "lucide-react"
import { JobDnaWizard, JobDnaDraftFlow } from "@/components/job-blueprint/job-dna"
import { useCreateJobDna, useFinalizeBenchmark } from "@/hooks/job-blueprint/useJobDna"
import type { DimensionBenchmark, JobTier } from "@/types/job-blueprint"
import { ROUTES } from "@/constants/routes"
import { JobDnaPageHeader, JobDnaCardSurface } from "./_shared"

type WizardData = {
  roleTitle: string
  department: string
  tier: JobTier
  behaviors: DimensionBenchmark[]
  aptitudes: DimensionBenchmark[]
  coreTraits: DimensionBenchmark[]
  roleContext: {
    workPressures: string[]
    requiredWorkStyles: string[]
    environmentalFactors: string[]
    culturalFactors: string[]
  }
}

// The authoring surface offers two front-doors: draft a blueprint from a role
// (LLM benchmarks all 22 dimensions, you edit + save) or build one by hand with
// the step-by-step wizard. A chooser lands first so neither path is buried.
type Mode = "chooser" | "draft" | "manual"

/**
 * Authoring surface — the create → benchmark → save → reload flow against the
 * live blueprint backend.
 *
 * The manual wizard collects role info, the three benchmark pillars and the
 * workplace context survey. On submit:
 *   1. `POST /v1/blueprint/job-dna` (useCreateJobDna) creates the record.
 *   2. `PUT /v1/blueprint/job-dna/:id/benchmark` (useFinalizeBenchmark) persists it.
 *   3. We navigate to the detail page, which re-reads the record — the reload.
 *
 * The draft flow ({@link JobDnaDraftFlow}) shares the same create + finalize
 * persistence but seeds the benchmark from an LLM draft.
 */
export default function JobBlueprintAuthoringPage() {
  const navigate = useNavigate()
  const createJobDna = useCreateJobDna()
  const finalizeBenchmark = useFinalizeBenchmark()
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<Mode>("chooser")

  const handleSubmit = async (data: WizardData) => {
    setSubmitting(true)
    try {
      const created = await createJobDna.mutateAsync({
        roleTitle: data.roleTitle,
        department: data.department,
        tier: data.tier,
        behaviors: data.behaviors,
        aptitudes: data.aptitudes,
        coreTraits: data.coreTraits,
        roleContext: data.roleContext,
      })

      if (!created?.id) {
        toast.error("Job DNA was created but no id was returned.")
        return
      }

      await finalizeBenchmark.mutateAsync({
        id: created.id,
        benchmark: {
          behaviors: data.behaviors,
          aptitudes: data.aptitudes,
          coreTraits: data.coreTraits,
        },
      })

      toast.success("Job DNA created and benchmarked.")
      navigate(ROUTES.JOB_DNA.dnaDetail(created.id))
    } catch {
      toast.error("Failed to save Job DNA. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl">
      <JobDnaPageHeader
        icon={PencilRuler}
        title="Create a Job DNA"
        description="Draft a benchmark from a role, or build one by hand across behaviours, aptitudes and core traits."
        action={
          mode !== "chooser" ? (
            <button
              type="button"
              onClick={() => setMode("chooser")}
              className="inline-flex items-center gap-2 rounded-lg border border-[#e5e7eb] bg-white px-3 py-2 text-sm font-medium text-[#374151] transition hover:border-[#7C3AED]"
            >
              <ArrowLeft className="h-4 w-4" /> Change method
            </button>
          ) : undefined
        }
      />

      {mode === "chooser" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("draft")}
            className="flex flex-col items-start gap-3 rounded-xl border border-[#e5e7eb] bg-white p-6 text-left transition hover:border-[#7C3AED] hover:shadow-sm"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(124,58,237,0.1)]">
              <Sparkles className="h-5 w-5 text-[#7C3AED]" />
            </span>
            <span className="text-base font-semibold text-[#1f2937]">Draft from a role</span>
            <span className="text-sm text-[#6b7280]">
              Give a title or upload a job description and we benchmark all 22 dimensions for you to
              review and edit. Fastest way to a first draft.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode("manual")}
            className="flex flex-col items-start gap-3 rounded-xl border border-[#e5e7eb] bg-white p-6 text-left transition hover:border-[#7C3AED] hover:shadow-sm"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(124,58,237,0.1)]">
              <Wand2 className="h-5 w-5 text-[#7C3AED]" />
            </span>
            <span className="text-base font-semibold text-[#1f2937]">Build manually</span>
            <span className="text-sm text-[#6b7280]">
              Rank and rate every behaviour, aptitude and core trait yourself with the step-by-step
              wizard. Full control.
            </span>
          </button>
        </div>
      )}

      {mode === "draft" && <JobDnaDraftFlow />}

      {mode === "manual" && (
        <JobDnaCardSurface>
          <JobDnaWizard onSubmit={handleSubmit} isSubmitting={submitting} />
        </JobDnaCardSurface>
      )}
    </div>
  )
}
