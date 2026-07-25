import { useNavigate } from "react-router-dom"
import { Dna, Plus } from "lucide-react"
import { useJobDnaList } from "@/hooks/job-blueprint/useJobDna"
import { useBlueprintStats } from "@/hooks/job-blueprint/useAnalytics"
import { JobDnaCard } from "@/components/job-blueprint/job-dna/JobDnaCard"
import { StatsGrid } from "@/components/job-blueprint/analytics/StatsGrid"
import { ROUTES } from "@/constants/routes"
import {
  JobDnaPageHeader,
  JobDnaLinkButton,
  JobDnaEmptyState,
  JobDnaLoading,
  JobDnaError,
} from "./_shared"

/**
 * Job DNA vertical landing page.
 *
 * Reads the live blueprint backend: the list of authored Job DNAs
 * (`GET /v1/blueprint/job-dna`) and headline stats
 * (`GET /v1/blueprint/analytics/stats`). Each card links to its detail; the
 * primary action starts the authoring wizard.
 */
export default function JobBlueprintDashboardPage() {
  const navigate = useNavigate()
  const { data: jobDnas, isLoading, isError, refetch } = useJobDnaList()
  const { data: stats } = useBlueprintStats()

  return (
    <div className="max-w-6xl">
      <JobDnaPageHeader
        icon={Dna}
        title="Job DNA"
        description="Behavioral job blueprints — benchmark a role, then screen and rank candidates by fit."
        action={
          <JobDnaLinkButton to={ROUTES.JOB_DNA.AUTHORING}>
            <Plus className="h-4 w-4" />
            New Job DNA
          </JobDnaLinkButton>
        }
      />

      {stats ? (
        <div className="mb-6">
          <StatsGrid stats={stats} />
        </div>
      ) : null}

      <h2 className="mb-3 text-sm font-semibold text-[#374151]">Your Job DNAs</h2>

      {isLoading ? (
        <JobDnaLoading label="Loading Job DNAs…" />
      ) : isError ? (
        <JobDnaError message="Failed to load Job DNAs." onRetry={() => void refetch()} />
      ) : !jobDnas || jobDnas.length === 0 ? (
        <JobDnaEmptyState>
          <p className="mb-3">No Job DNAs yet.</p>
          <JobDnaLinkButton to={ROUTES.JOB_DNA.AUTHORING}>
            <Plus className="h-4 w-4" />
            Create your first Job DNA
          </JobDnaLinkButton>
        </JobDnaEmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobDnas.map((jobDna) => (
            <JobDnaCard
              key={jobDna.id}
              jobDna={jobDna}
              onClick={() => navigate(ROUTES.JOB_DNA.dnaDetail(jobDna.id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
