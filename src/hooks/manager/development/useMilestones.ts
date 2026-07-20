import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  createMilestone,
  getMilestones,
  updateMilestone,
  type CreateMilestoneInput,
  type UpdateMilestoneInput,
} from "@/services/manager/development/growthService"
import type { Milestone } from "@/types/development"
import { developmentKeys } from "./queryKeys"

/** Read a member's roadmap milestones. */
export function useMilestones(memberId: string | undefined) {
  return useQuery<Milestone[]>({
    queryKey: developmentKeys.milestones(memberId ?? ""),
    queryFn: async () => {
      const r = await getMilestones(memberId as string)
      return r.data?.data ?? []
    },
    enabled: Boolean(memberId),
    staleTime: 60_000,
  })
}

function useInvalidateMilestones(memberId: string | undefined) {
  const qc = useQueryClient()
  return () => {
    if (!memberId) return
    qc.invalidateQueries({ queryKey: developmentKeys.milestones(memberId) })
    qc.invalidateQueries({ queryKey: developmentKeys.dossier(memberId) })
  }
}

/** Create a milestone (e.g. seeded when closing a gap). */
export function useCreateMilestone(memberId: string | undefined) {
  const invalidate = useInvalidateMilestones(memberId)
  return useMutation<Milestone, Error, CreateMilestoneInput>({
    mutationFn: async (input) => {
      const r = await createMilestone(memberId as string, input)
      const data = r.data?.data
      if (!data) throw new Error("Create milestone failed")
      return data
    },
    onSuccess: invalidate,
  })
}

/** Update a milestone's status / details. */
export function useUpdateMilestone(memberId: string | undefined) {
  const invalidate = useInvalidateMilestones(memberId)
  return useMutation<Milestone, Error, UpdateMilestoneInput>({
    mutationFn: async (input) => {
      const r = await updateMilestone(memberId as string, input)
      const data = r.data?.data
      if (!data) throw new Error("Update milestone failed")
      return data
    },
    onSuccess: invalidate,
  })
}
