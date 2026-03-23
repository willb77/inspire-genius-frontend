import { api } from '@/lib/axios'
import type { BaseApiResponse } from '@/types/api'
import type { InterviewScorecard, InterviewGuide, ScorecardEntry } from '@/types/job-blueprint'

export const scorecardService = {
  submitScorecard(candidateId: string, data: {
    jobId: string
    interviewerId: string
    interviewDate: string
    behaviorScores: ScorecardEntry[]
    counterProductiveScores: ScorecardEntry[]
    aptitudeScores: ScorecardEntry[]
    coreTraitScores: ScorecardEntry[]
    notes: string
  }) {
    return api.post<BaseApiResponse<InterviewScorecard>>(`/v1/blueprint/scorecard/${candidateId}`, data)
  },

  getScorecard(candidateId: string) {
    return api.get<BaseApiResponse<InterviewScorecard>>(`/v1/blueprint/scorecard/${candidateId}`)
  },

  generateInterviewGuide(jobId: string, candidateId: string) {
    return api.post<BaseApiResponse<InterviewGuide>>(`/v1/blueprint/interview-guide/${jobId}`, { candidateId })
  },

  getInterviewGuide(jobId: string) {
    return api.get<BaseApiResponse<InterviewGuide>>(`/v1/blueprint/interview-guide/${jobId}`)
  },
}
