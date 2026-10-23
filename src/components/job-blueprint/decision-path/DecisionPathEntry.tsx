import { Link } from "react-router-dom"
import { Scale } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useDecisionPathStatus } from "@/hooks/job-blueprint/useDecisionPath"

/**
 * The decision path's one entry point on the Job DNA dashboard. Renders
 * NOTHING unless the server says the switch applies to the caller, so with the
 * switch off the dashboard is exactly what it was.
 */
export function DecisionPathEntry() {
  const status = useDecisionPathStatus()
  if (!status) return null
  return (
    <Link
      to={ROUTES.JOB_DNA.DECISION_PATH}
      className="mb-6 flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white p-4 text-sm text-[#374151] hover:border-[#7C3AED]"
    >
      <Scale className="h-5 w-5 text-[#7C3AED]" />
      <span>
        <span className="font-medium text-[#1f2937]">Decision path</span> — check candidates against your written
        minimum standard and record each decision with its reason.
      </span>
    </Link>
  )
}
