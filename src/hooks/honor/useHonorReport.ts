import { useMutation } from "@tanstack/react-query"
import {
  emailReport,
  recordReportExport,
  type EmailReportBody,
  type EmailReportResult,
  type HonorExportAction,
  type HonorReportKind,
} from "@/services/honor/coach.service"

/**
 * Record a client-side export (download / print) for the audit trail. Emits
 * `honor.report.exported` server-side. Fire-and-forget — a failure here never
 * blocks the user's download/print (the caller ignores rejections).
 */
export function useRecordReportExport() {
  return useMutation<
    { recorded: boolean } | undefined,
    Error,
    { fellowId: string; kind: HonorReportKind; action: HonorExportAction }
  >({
    mutationFn: async ({ fellowId, kind, action }) => {
      const res = await recordReportExport(fellowId, { kind, action })
      return res.data
    },
  })
}

/**
 * Email the branded PDF to the fellow (Phase 4). Gated by the server
 * `honor_report_email` flag (returns `{disabled:true}`) and confirmed in the UI
 * before send — email is always-confirm.
 */
export function useEmailHonorReport() {
  return useMutation<EmailReportResult | undefined, Error, { fellowId: string; body: EmailReportBody }>({
    mutationFn: async ({ fellowId, body }) => {
      const res = await emailReport(fellowId, body)
      return res.data
    },
  })
}
