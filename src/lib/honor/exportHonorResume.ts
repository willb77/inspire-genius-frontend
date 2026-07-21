// Honor résumé → branded PDF (Phase 5).
//
// Composes the branded résumé HTML with the exportTranscript renderer, stamping
// the same §4 confidentiality notice bottom-left on every page. Reuses the
// Phase-4 jsPDF/html2canvas pipeline + confidentialFooter — no new dependency.

import { renderHtmlToPdf } from "@/lib/exportTranscript/renderPdf"
import type { HonorResume } from "@/types/honor"
import { confidentialFooter, type HonorReportMeta } from "./buildHonorReportHtml"
import { buildHonorResumeHtml } from "./buildHonorResumeHtml"

export type { HonorReportMeta } from "./buildHonorReportHtml"

/** URL/file-safe résumé slug, e.g. "honor-resume-marcus-reyes". */
export function resumeSlug(fellowName: string): string {
  const base =
    fellowName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "fellow"
  return `honor-resume-${base}`
}

export type RenderedHonorResume = {
  fileName: string
  blob: Blob
}

/** Render the branded résumé PDF. Returns the blob + a suggested filename. */
export async function renderHonorResumePdf(
  resume: HonorResume,
  meta: HonorReportMeta,
): Promise<RenderedHonorResume> {
  const html = buildHonorResumeHtml(resume, meta)
  const blob = await renderHtmlToPdf(html, {
    footerLeft: confidentialFooter(meta.fellowName, meta.fellowTitle),
    footerLeftFromPage: 1,
    footerRight: "Page {page}",
    footerRightFromPage: 2,
  })
  return { fileName: `${resumeSlug(meta.fellowName)}.pdf`, blob }
}
