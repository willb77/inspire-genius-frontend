// Honor evaluation → branded PDF (Phase 4).
//
// Composes the branded report HTML with the exportTranscript renderer, stamping
// the §4 confidentiality notice bottom-left on every page (including the cover).
// No new PDF dependency — reuses jsPDF + html2canvas via renderHtmlToPdf.

import { renderHtmlToPdf } from "@/lib/exportTranscript/renderPdf"
import type { HonorEvaluation } from "@/types/honor"
import { buildHonorReportHtml, confidentialFooter, type HonorReportMeta } from "./buildHonorReportHtml"

export type { HonorReportMeta } from "./buildHonorReportHtml"

/** URL/file-safe slug from a fellow name (e.g. "marcus-reyes"). */
export function reportSlug(fellowName: string): string {
  const base =
    fellowName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "fellow"
  return `honor-evaluation-${base}`
}

/** Format a Date as "Month Day, Year" (spec's cover date). */
export function formatReportDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
}

export type RenderedHonorReport = {
  fileName: string
  blob: Blob
}

/** Render the branded evaluation PDF. Returns the blob + a suggested filename. */
export async function renderHonorReportPdf(
  report: HonorEvaluation,
  meta: HonorReportMeta,
  nameById: Record<string, string> = {},
): Promise<RenderedHonorReport> {
  const html = buildHonorReportHtml(report, meta, nameById)
  const blob = await renderHtmlToPdf(html, {
    footerLeft: confidentialFooter(meta.fellowName, meta.fellowTitle),
    footerLeftFromPage: 1,
    footerRight: "Page {page}",
    footerRightFromPage: 2,
  })
  return { fileName: `${reportSlug(meta.fellowName)}.pdf`, blob }
}
