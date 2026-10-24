import type { ReactNode } from "react"
import { AlertCircle, PowerOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useCurriculumStatus } from "@/hooks/curriculum/useCurriculumAdmin"
import { curriculumError } from "@/services/curriculum/curriculumErrors"

/**
 * Renders its children only when curriculum is switched on AND set up on this
 * tier; otherwise says which, in words.
 *
 * Reads `GET …/curriculum/admin/status`, the one curriculum route that answers
 * while the switch is off. This is not a security check — every curriculum
 * route enforces the role, the switch and the tables itself — it exists so the
 * page is never blank or a wall of 403s.
 */
export function CurriculumGate({ children }: { children: ReactNode }) {
  const { data, isLoading, error, refetch } = useCurriculumStatus()

  if (isLoading) {
    return (
      <div className="space-y-3" aria-label="Loading curriculum status">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (error) {
    const e = curriculumError(error, "Could not read the curriculum status.")
    const message =
      e.status === 404
        ? "The curriculum service isn't available on this tier yet."
        : e.status === 403
          ? `Only a super-admin can manage curriculum. ${e.message}`
          : e.message
    return (
      <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div className="space-y-2">
          <p className="text-sm text-red-800">{message}</p>
          <Button size="sm" variant="outline" onClick={() => void refetch()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (!data?.enabled) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <PowerOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="font-medium text-amber-900">Curriculum is not enabled</p>
          <p className="text-sm text-amber-800">
            The curriculum switch is off on this tier, so schools, catalogs and imports are unavailable.
            Nothing here is broken; it has not been turned on yet.
          </p>
        </div>
      </div>
    )
  }

  if (!data.tablesReady) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <PowerOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="font-medium text-amber-900">Curriculum isn't set up on this tier yet</p>
          <p className="text-sm text-amber-800">
            The switch is on, but the curriculum tables are not there yet (the database change has not
            been applied on this tier).
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default CurriculumGate
