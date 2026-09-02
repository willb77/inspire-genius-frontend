import { useMutation, useQuery } from "@tanstack/react-query"
import {
  fetchRubric,
  getSubject,
  listConversations,
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

export function usePrismSubjects(limit = 50, search = "") {
  return useQuery({
    queryKey: ["prism-accuracy", "subjects", limit, search.trim()],
    queryFn: () => listSubjects(limit, search),
    staleTime: 60_000,
  })
}

export function usePrismConversations(params: { user_id?: string; search?: string; limit?: number } = {}) {
  return useQuery({
    queryKey: ["prism-accuracy", "conversations", params.user_id ?? "", (params.search ?? "").trim(), params.limit ?? 30],
    queryFn: () => listConversations(params),
    staleTime: 30_000,
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
