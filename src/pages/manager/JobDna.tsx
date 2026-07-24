import ManagerLayout from "@/layouts/ManagerLayout"
import DataCard from "@/components/dashboard/DataCard"
import { ScoreBar } from "@/components/job-blueprint/shared/ScoreBar"
import { Skeleton } from "@/components/ui/skeleton"
import { useJobDnaList } from "@/hooks/job-blueprint/useJobDna"
import type { DimensionBenchmark } from "@/types/job-blueprint"
import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

/** Top-N benchmark dimensions by rank, used for the collapsed "key traits" line. */
function topDimensions(dims: DimensionBenchmark[], n: number): DimensionBenchmark[] {
  return [...dims].sort((a, b) => a.rankPosition - b.rankPosition).slice(0, n)
}

/**
 * Manager Job DNA view — reads the live blueprint backend
 * (`GET /v1/blueprint/job-dna` via useJobDnaList). Each row expands to show the
 * role's benchmarked behaviour profile.
 */
export default function ManagerJobDna() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { data: jobs, isLoading, error, refetch } = useJobDnaList()

  const rows = jobs ?? []

  return (
    <ManagerLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Job DNA</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">
        PRISM-based job profiles and candidate matching criteria.
      </p>

      <DataCard title="Job DNA Profiles" badge={rows.length}>
        {error && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load Job DNA profiles.
            <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : rows.length === 0 && !error ? (
          <div className="py-6 text-center text-[13px] text-[#9ca3af]">
            No Job DNA profiles yet.
          </div>
        ) : (
          <div className="space-y-0">
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_90px_80px] gap-4 text-[11px] text-[#6b7280] font-medium pb-2 border-b border-[#e5e7eb] px-1">
              <div className="w-5" />
              <div>Role</div>
              <div>Department</div>
              <div>Top Behaviours</div>
              <div className="text-center">Tier</div>
              <div className="text-center">Status</div>
            </div>
            {rows.map((job) => {
              const topBehaviours = topDimensions(job.behaviors, 2)
              return (
                <div key={job.id}>
                  <button
                    onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                    className="w-full grid grid-cols-[auto_1fr_1fr_1fr_90px_80px] gap-4 items-center text-[13px] py-2.5 border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors px-1 text-left"
                  >
                    <div className="w-5 text-[#6b7280]">
                      {expandedId === job.id ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="font-medium text-[#111827]">{job.roleTitle}</div>
                    <div className="text-[#6b7280]">{job.department}</div>
                    <div className="flex gap-1 flex-wrap">
                      {topBehaviours.map((b) => (
                        <span
                          key={b.dimensionId}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[rgba(59,91,255,0.12)] text-[#3B5BFF]"
                        >
                          {b.dimensionName}
                        </span>
                      ))}
                    </div>
                    <div className="text-center text-[#6b7280] capitalize">{job.tier}</div>
                    <div className="text-center font-semibold text-[#3B5BFF] capitalize">
                      {job.status}
                    </div>
                  </button>
                  {expandedId === job.id && (
                    <div className="bg-[#f9fafb] p-4 border-b border-[#e5e7eb]">
                      <div className="text-[11px] font-semibold text-[#6b7280] mb-3">
                        Behaviour Benchmark
                      </div>
                      <div className="space-y-2 max-w-md">
                        {topDimensions(job.behaviors, 8).map((d) => (
                          <ScoreBar
                            key={d.dimensionId}
                            score={d.finalBenchmarkPercent}
                            label={d.dimensionName}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </DataCard>
    </ManagerLayout>
  )
}
