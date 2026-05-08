import { useQuery } from "@tanstack/react-query"
import type { PrismAssessment } from "@/types/prism/assessment-types"

export type ManagerTeamPrismData = {
  assessments: PrismAssessment[]
  total: number
}

// TODO(phase-d-r7-followup): wire to backend endpoint that returns PRISM
// assessments for the manager's direct reports. Likely shape:
//   GET /api/manager/team/prism-assessments
//     → { assessments: PrismAssessment[]; total: number }
// Until that endpoint exists, this hook returns an empty list so the
// page renders its empty-state UI without throwing.
const EMPTY: ManagerTeamPrismData = { assessments: [], total: 0 }

export function useManagerTeamPrism() {
  return useQuery<ManagerTeamPrismData>({
    queryKey: ["manager-team-prism"],
    queryFn: async () => EMPTY,
    initialData: EMPTY,
    staleTime: Infinity,
  })
}
