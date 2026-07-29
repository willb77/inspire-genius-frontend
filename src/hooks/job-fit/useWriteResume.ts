import { useMutation } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { resumeService, type WriteResumeBody } from "@/services/job-fit/resume.service"
import type { WriteResumeResult } from "@/types/job-fit"

/** Draft a role-aligned résumé (POST /v1/agents/blueprint/write-resume). */
export function useWriteResume() {
  return useMutation<WriteResumeResult, AxiosError, WriteResumeBody>({
    mutationKey: ["job-fit", "write-resume"],
    mutationFn: (body) => resumeService.write(body),
  })
}
