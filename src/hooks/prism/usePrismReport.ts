import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { getAssessmentReport, vectorizePrismReport } from '@/services/prism/prism.service'
import type { PrismReportResponse } from '@/types/prism/assessment-types'

export function usePrismReport(assessmentId: string | null, enabled = true) {
  const query = useQuery({
    queryKey: ['prism-report', assessmentId],
    queryFn: () => getAssessmentReport(assessmentId!),
    enabled: enabled && !!assessmentId,
    staleTime: 5 * 60 * 1000,
  })

  // Track which assessments we've already triggered vectorization for
  const vectorizedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!query.data?.data || !assessmentId) return
    if (vectorizedRef.current.has(assessmentId)) return

    const report = query.data.data as PrismReportResponse
    if (!report.quadrants?.length) return

    // Mark as triggered before firing to prevent duplicates
    vectorizedRef.current.add(assessmentId)

    // Build PRISM data from the report quadrants
    const prismData: Record<string, unknown> = {
      gold: report.quadrants.find((q) => q.QuadID === 4)?.Value ?? 0,
      green: report.quadrants.find((q) => q.QuadID === 1)?.Value ?? 0,
      blue: report.quadrants.find((q) => q.QuadID === 2)?.Value ?? 0,
      orange: report.quadrants.find((q) => q.QuadID === 3)?.Value ?? 0,
      quadrants: report.quadrants,
      behaviours: report.behaviours ?? [],
      report_data: report.reportData ?? {},
      ei_data: report.reportEIData ?? {},
    }

    // Fire-and-forget — don't block the UI
    vectorizePrismReport(report.userId, prismData, assessmentId).catch((err) => {
      // Non-critical: vectorization can be retried later
      console.warn('[PRISM] Auto-vectorization failed:', err?.message ?? err)
    })
  }, [query.data, assessmentId])

  return query
}
