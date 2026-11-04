import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  askResumeQuestions,
  generateMyResumeJob,
  getResumeWriterSources,
} from "@/services/resumeWriter/resumeWriter.service"
import type {
  InterviewQuestion,
  ResumeQuestionsRequest,
  ResumeWriterDisabled,
  ResumeWriterRequest,
  ResumeWriterResult,
  ResumeWriterSources,
} from "@/types/resumeWriter"

export const resumeWriterKeys = {
  sources: ["resume-writer", "me", "sources"] as const,
}

/** The caller's sources, the switch state and today's usage. RW2: with a
 * `jobId`, also the chosen role (the server decides whether it may be named). */
export function useResumeWriterSources(jobId?: string) {
  return useQuery<ResumeWriterSources, Error>({
    queryKey: jobId ? [...resumeWriterKeys.sources, jobId] : resumeWriterKeys.sources,
    queryFn: () => getResumeWriterSources(jobId),
    staleTime: 30_000,
  })
}

/** Draft the caller's résumé; refreshes the sources so "left today" updates.
 * RW2: through the job pair, so a full résumé is not cut off by the gateway. */
export function useGenerateResume() {
  const qc = useQueryClient()
  return useMutation<ResumeWriterResult, Error, ResumeWriterRequest>({
    mutationFn: (body) => generateMyResumeJob(body),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: resumeWriterKeys.sources })
    },
  })
}

/** RWO-8 — the résumé interview's questions. Free; uses no draft. */
export function useResumeQuestions() {
  return useMutation<InterviewQuestion[] | ResumeWriterDisabled, Error, ResumeQuestionsRequest>({
    mutationFn: (body) => askResumeQuestions(body),
  })
}
