import ManagerLayout from "@/layouts/ManagerLayout"
import DataCard from "@/components/dashboard/DataCard"
import ProgressBar from "@/components/dashboard/ProgressBar"
import PlaceholderBanner from "@/components/dashboard/PlaceholderBanner"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@tanstack/react-query"
import { jobDnaService } from "@/services/job-blueprint/job-dna.service"
import { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

type JobDnaRow = {
  id: string
  position: string
  prismProfile: string
  keyTraits: string
  requiredScore: number
  openings: number
  prismBreakdown: { label: string; value: number; color: string }[]
}

const FALLBACK_JOBS: JobDnaRow[] = [
  { id: "1", position: "Frontend Developer", prismProfile: "High Blue, Medium Green", keyTraits: "Detail-oriented, Collaborative", requiredScore: 75, openings: 2, prismBreakdown: [{ label: "Gold", value: 45, color: "#E53E3E" }, { label: "Green", value: 65, color: "#38A169" }, { label: "Blue", value: 88, color: "#3182CE" }, { label: "Orange", value: 52, color: "#ECC94B" }] },
  { id: "2", position: "Product Manager", prismProfile: "High Gold, High Green", keyTraits: "Strategic, Communicative", requiredScore: 80, openings: 1, prismBreakdown: [{ label: "Gold", value: 90, color: "#E53E3E" }, { label: "Green", value: 85, color: "#38A169" }, { label: "Blue", value: 60, color: "#3182CE" }, { label: "Orange", value: 70, color: "#ECC94B" }] },
  { id: "3", position: "Data Analyst", prismProfile: "High Blue, High Orange", keyTraits: "Analytical, Steady", requiredScore: 70, openings: 1, prismBreakdown: [{ label: "Gold", value: 40, color: "#E53E3E" }, { label: "Green", value: 50, color: "#38A169" }, { label: "Blue", value: 92, color: "#3182CE" }, { label: "Orange", value: 80, color: "#ECC94B" }] },
  { id: "4", position: "UX Designer", prismProfile: "High Green, Medium Blue", keyTraits: "Creative, Empathetic", requiredScore: 72, openings: 1, prismBreakdown: [{ label: "Gold", value: 55, color: "#E53E3E" }, { label: "Green", value: 90, color: "#38A169" }, { label: "Blue", value: 70, color: "#3182CE" }, { label: "Orange", value: 65, color: "#ECC94B" }] },
  { id: "5", position: "DevOps Engineer", prismProfile: "High Blue, High Gold", keyTraits: "Systematic, Decisive", requiredScore: 78, openings: 1, prismBreakdown: [{ label: "Gold", value: 82, color: "#E53E3E" }, { label: "Green", value: 45, color: "#38A169" }, { label: "Blue", value: 88, color: "#3182CE" }, { label: "Orange", value: 60, color: "#ECC94B" }] },
]

const PRISM_COLORS: Record<string, string> = { Gold: "#E53E3E", Green: "#38A169", Blue: "#3182CE", Orange: "#ECC94B" }

export default function ManagerJobDna() {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { data: jobDnaData, isLoading, error, refetch } = useQuery({
    queryKey: ["manager-job-dna"],
    queryFn: async () => { const r = await jobDnaService.list(); return r.data?.data },
  })

  const jobs = (jobDnaData as JobDnaRow[] | undefined) ?? FALLBACK_JOBS

  return (
    <ManagerLayout>
      <PlaceholderBanner />
      <h1 className="text-xl font-bold text-[#111827] mb-1">Job DNA</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">PRISM-based job profiles and candidate matching criteria.</p>

      <DataCard title="Job DNA Profiles" badge={jobs.length}>
        {error && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load Job DNA profiles.
            <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="space-y-0">
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_80px_60px] gap-4 text-[11px] text-[#6b7280] font-medium pb-2 border-b border-[#e5e7eb] px-1">
              <div className="w-5" />
              <div>Position</div>
              <div>PRISM Profile</div>
              <div>Key Traits</div>
              <div className="text-center">Score</div>
              <div className="text-center">Open</div>
            </div>
            {jobs.map((job) => (
              <div key={job.id}>
                <button
                  onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                  className="w-full grid grid-cols-[auto_1fr_1fr_1fr_80px_60px] gap-4 items-center text-[13px] py-2.5 border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors px-1 text-left"
                >
                  <div className="w-5 text-[#6b7280]">
                    {expandedId === job.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </div>
                  <div className="font-medium text-[#111827]">{job.position}</div>
                  <div className="flex gap-1 flex-wrap">
                    {job.prismProfile.split(", ").map((p) => {
                      const color = Object.keys(PRISM_COLORS).find((c) => p.includes(c))
                      return (
                        <span key={p} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${PRISM_COLORS[color ?? "Blue"]}20`, color: PRISM_COLORS[color ?? "Blue"] }}>
                          {p}
                        </span>
                      )
                    })}
                  </div>
                  <div className="text-[#6b7280]">{job.keyTraits}</div>
                  <div className="text-center font-semibold text-[#3B5BFF]">{job.requiredScore}%</div>
                  <div className="text-center font-semibold text-[#111827]">{job.openings}</div>
                </button>
                {expandedId === job.id && (
                  <div className="bg-[#f9fafb] p-4 border-b border-[#e5e7eb]">
                    <div className="text-[11px] font-semibold text-[#6b7280] mb-3">PRISM Dimension Breakdown</div>
                    <div className="space-y-2 max-w-md">
                      {job.prismBreakdown.map((d) => (
                        <ProgressBar key={d.label} label={d.label} value={d.value} color={d.color} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DataCard>
    </ManagerLayout>
  )
}
