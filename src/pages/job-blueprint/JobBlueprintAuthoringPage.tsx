import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { PencilRuler } from "lucide-react"
import { JobDnaWizard } from "@/components/job-blueprint/job-dna/JobDnaWizard"
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

/**
 * Authoring surface — the create → benchmark → save → reload flow against the
 * live blueprint backend.
 *
 * The wizard collects role info, the three benchmark pillars (behaviours,
 * aptitudes, core traits calibrated via rank + rate) and the workplace context
 * survey. On submit:
 *   1. `POST /v1/blueprint/job-dna` (useCreateJobDna) creates the record and
 *      returns its id.
 *   2. `PUT /v1/blueprint/job-dna/:id/benchmark` (useFinalizeBenchmark) persists
 *      the calibrated benchmark.
 *   3. We navigate to the detail page, which re-reads
 *      `GET /v1/blueprint/job-dna/:id` — the reload.
 */
export default function JobBlueprintAuthoringPage() {
  const navigate = useNavigate()
  const createJobDna = useCreateJobDna()
  const finalizeBenchmark = useFinalizeBenchmark()
  const [submitting, setSubmitting] = useState(false)

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
        description="Benchmark a role across behaviours, aptitudes and core traits, then capture its workplace context."
      />

      <JobDnaCardSurface>
        <JobDnaWizard onSubmit={handleSubmit} isSubmitting={submitting} />
      </JobDnaCardSurface>
    </div>
  )
}
