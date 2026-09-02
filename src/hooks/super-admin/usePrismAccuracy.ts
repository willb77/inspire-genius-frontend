import { useMutation, useQuery } from "@tanstack/react-query"
import {
  fetchRubric,
  getSubject,
  listSubjects,
  scoreResponse,
  scoreSession,
} from "@/services/super-admin/prism-accuracy/prismAccuracy.service"

/** Static per deploy: the rubric the score is made against. */
export function usePrismAccuracyRubric() {
  return useQuery({
    queryKey: ["prism-accuracy", "rubric"],
    queryFn: fetchRubric,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function usePrismSubjects(limit = 50) {
  return useQuery({
    queryKey: ["prism-accuracy", "subjects", limit],
    queryFn: () => listSubjects(limit),
    staleTime: 60_000,
  })
}

export function usePrismSubject(userId: string | undefined, salientK = 6) {
  return useQuery({
    queryKey: ["prism-accuracy", "subject", userId ?? "", salientK],
    queryFn: () => getSubject(userId as string, salientK),
    enabled: !!userId,
    staleTime: 60_000,
    retry: false,
  })
}

export function useScoreResponse() {
  return useMutation({ mutationFn: scoreResponse })
}

export function useScoreSession() {
  return useMutation({ mutationFn: scoreSession })
}
