import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  getPrompts,
  savePrompt,
  updatePrompt,
  getPromptVersions,
  type PromptResponse,
  type PromptListResponse,
  type PromptVersionResponse,
} from "@/services/prompt-builder/prompt-builder.service"
import { logAuditEvent } from "@/services/audit/audit.service"
import type { SavePromptPayload } from "@/types/prompt-builder"
import type { BaseApiResponse } from "@/types/api"
import { toast } from "sonner"

const QK = {
  list: () => ["prompts", "list"] as const,
  versions: (coachId: string) => ["prompts", "versions", coachId] as const,
}

export function usePrompts() {
  return useQuery<PromptListResponse, AxiosError<BaseApiResponse<null>>>({
    queryKey: QK.list(),
    queryFn: () => getPrompts(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useSavePrompt() {
  const queryClient = useQueryClient()

  return useMutation<
    PromptResponse,
    AxiosError<BaseApiResponse<null>>,
    SavePromptPayload
  >({
    mutationFn: (payload) => savePrompt(payload),
    onSuccess: (_resp, variables) => {
      toast.success("System prompt saved")
      queryClient.invalidateQueries({ queryKey: ["prompts"], exact: false })
      logAuditEvent({
        action: "prompt_saved",
        actor_email: variables.coach_id,
        target_type: "system_prompt",
        extra_data: { coach_id: variables.coach_id },
      })
    },
    onError: (error) => {
      const msg = error.response?.data?.message || "Failed to save prompt"
      toast.error(msg)
    },
  })
}

export function useUpdatePrompt() {
  const queryClient = useQueryClient()

  return useMutation<
    PromptResponse,
    AxiosError<BaseApiResponse<null>>,
    { id: string; payload: SavePromptPayload }
  >({
    mutationFn: ({ id, payload }) => updatePrompt(id, payload),
    onSuccess: (_resp, variables) => {
      toast.success("System prompt updated")
      queryClient.invalidateQueries({ queryKey: ["prompts"], exact: false })
      logAuditEvent({
        action: "prompt_updated",
        actor_email: variables.payload.coach_id,
        target_type: "system_prompt",
        target_id: variables.id,
        extra_data: { coach_id: variables.payload.coach_id },
      })
    },
    onError: (error) => {
      const msg = error.response?.data?.message || "Failed to update prompt"
      toast.error(msg)
    },
  })
}

export function usePromptVersions(coachId: string) {
  return useQuery<PromptVersionResponse, AxiosError<BaseApiResponse<null>>>({
    queryKey: QK.versions(coachId),
    queryFn: () => getPromptVersions(coachId),
    enabled: !!coachId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
