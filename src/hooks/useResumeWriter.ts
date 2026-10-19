import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { generateMyResume, getResumeWriterSources } from "@/services/resumeWriter/resumeWriter.service"
import type { ResumeWriterRequest, ResumeWriterResult, ResumeWriterSources } from "@/types/resumeWriter"

export const resumeWriterKeys = {
  sources: ["resume-writer", "me", "sources"] as const,
}

/** The caller's sources, the switch state and today's usage. */
export function useResumeWriterSources() {
  return useQuery<ResumeWriterSources, Error>({
    queryKey: resumeWriterKeys.sources,
    queryFn: getResumeWriterSources,
    staleTime: 30_000,
  })
}

/** Draft the caller's résumé; refreshes the sources so "left today" updates. */
export function useGenerateResume() {
  const qc = useQueryClient()
  return useMutation<ResumeWriterResult, Error, ResumeWriterRequest>({
    mutationFn: (body) => generateMyResume(body),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: resumeWriterKeys.sources })
    },
  })
}
