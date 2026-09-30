import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  getMyTargets,
  getRoadmap,
  makeTarget,
  rebuildRoadmap,
  removeTarget,
} from "@/services/goals/targets.service"
import { myGoalsKeys } from "@/hooks/summit/useMyGoals"
import type { MakeTargetIn } from "@/types/goals/targets"

export const goalTargetKeys = {
  mine: ["goal-targets", "mine"] as const,
  roadmap: (goalId: string) => ["goal-targets", "roadmap", goalId] as const,
}

/** My targets, each with its current roadmap. Idle while `enabled` is false. */
export function useMyTargets(enabled: boolean) {
  return useQuery({
    queryKey: goalTargetKeys.mine,
    queryFn: getMyTargets,
    enabled,
    staleTime: 30_000,
    retry: false,
  })
}

export function useRoadmap(goalId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: goalTargetKeys.roadmap(goalId ?? ""),
    queryFn: () => getRoadmap(goalId as string),
    enabled: enabled && !!goalId,
    retry: false,
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return (goalId?: string) =>
    Promise.all([
      qc.invalidateQueries({ queryKey: goalTargetKeys.mine }),
      qc.invalidateQueries({ queryKey: myGoalsKeys.mine }),
      goalId ? qc.invalidateQueries({ queryKey: goalTargetKeys.roadmap(goalId) }) : null,
    ])
}

export function useMakeTarget() {
  const invalidate = useInvalidate()
  return useMutation<Awaited<ReturnType<typeof makeTarget>>, AxiosError, MakeTargetIn>({
    mutationFn: makeTarget,
    onSuccess: (out) => invalidate(out.goal.goalId),
  })
}

export function useRebuildRoadmap() {
  const invalidate = useInvalidate()
  return useMutation<Awaited<ReturnType<typeof rebuildRoadmap>>, AxiosError, string>({
    mutationFn: rebuildRoadmap,
    onSuccess: (_out, goalId) => invalidate(goalId),
  })
}

export function useRemoveTarget() {
  const invalidate = useInvalidate()
  return useMutation<Awaited<ReturnType<typeof removeTarget>>, AxiosError, string>({
    mutationFn: removeTarget,
    onSuccess: (_out, goalId) => invalidate(goalId),
  })
}
