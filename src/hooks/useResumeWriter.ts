import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  askResumeQuestions,
  fetchSavedJobFile,
  generateMyResumeJob,
  getResumeWriterSources,
  listSavedJobDescriptions,
  type SavedJobDescription,
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
  savedJobs: ["documents", "resume-writer", "saved-job-descriptions"] as const,
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

/** RWO-8 §9 — the caller's stored job descriptions. Only fetched while the
 * server sends `jobFileStorageEnabled`. Under ["documents"], so an upload's
 * invalidation refreshes it. */
export function useSavedJobDescriptions(enabled: boolean) {
  return useQuery<SavedJobDescription[], Error>({
    queryKey: resumeWriterKeys.savedJobs,
    queryFn: listSavedJobDescriptions,
    enabled,
    staleTime: 30_000,
  })
}

/** RWO-8 §9 — the file of a saved job description, to read on the device again. */
export function useSavedJobFile() {
  return useMutation<File, Error, SavedJobDescription>({
    mutationFn: (saved) => fetchSavedJobFile(saved),
  })
}
