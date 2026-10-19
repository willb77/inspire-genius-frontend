// Résumé Writer → PDF (2026-10-19). The shared jsPDF/html2canvas renderer with
// a plain platform footer; no third-party branding, no confidentiality notice.
import { renderHtmlToPdf } from "@/lib/exportTranscript/renderPdf"
import type { GeneratedResume } from "@/types/resumeWriter"
import { buildResumeHtml } from "./buildResumeHtml"

/** File-safe name, e.g. "resume-test-member". */
export function resumeFileSlug(name: string): string {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "my"
  return `resume-${base}`
}

export async function renderResumePdf(
  resume: GeneratedResume,
  name: string,
): Promise<{ fileName: string; blob: Blob }> {
  const blob = await renderHtmlToPdf(buildResumeHtml(resume, name), {
    footerRight: "Inspires Genius  ·  Résumé  ·  {page}",
    footerRightFromPage: 1,
  })
  return { fileName: `${resumeFileSlug(name)}.pdf`, blob }
}
