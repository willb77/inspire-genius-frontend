// The Honor Foundation — branded résumé HTML (Phase 5).
//
// Renders a generated HonorResume into the print-ready HTML the exportTranscript
// renderer rasterizes to a branded PDF. The model wrote the field *content*
// (grounded on the Fellow's own profile + résumé/bio, THF safe-translated); this
// module owns the deterministic structure + branding. Reuses the Phase-4
// `HonorReportMeta` + `confidentialFooter` (same THF cover + per-page footer).

import { BRAND_CSS } from "@/lib/exportTranscript/brandCss"
import type { HonorResume } from "@/types/honor"
import type { HonorReportMeta } from "./buildHonorReportHtml"

export type { HonorReportMeta } from "./buildHonorReportHtml"

function esc(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// Cover styles mirror the evaluation report's THF cover (kept local so the
// Phase-4 export file stays untouched); RESUME_* styles are résumé-specific.
const RESUME_CSS = `
.cover.honor{padding:48mm 16mm 20mm 16mm;}
.cover.honor .thf{font-size:34pt;font-weight:bold;line-height:1.08;color:#fff;margin-bottom:3mm;}
.cover.honor .powered{font-size:12pt;color:var(--orange);letter-spacing:1px;margin-bottom:6mm;}
.cover.honor .variant{display:inline-block;border:1px solid var(--orange);color:var(--orange);font-size:8.5pt;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;padding:1.5mm 3.5mm;border-radius:2px;margin-bottom:18mm;}
.cover.honor .prep{border-top:2px solid var(--orange);padding-top:8mm;}
.cover.honor .prep .lbl{font-size:9pt;text-transform:uppercase;letter-spacing:2px;color:#aeb9cc;margin-bottom:1.5mm;}
.cover.honor .prep .for{font-size:17pt;font-weight:bold;color:#fff;line-height:1.25;margin-bottom:6mm;}
.cover.honor .prep .for .em{display:block;font-size:10.5pt;font-weight:normal;color:#c9d2e0;margin-top:1mm;}
.cover.honor .prep .by{font-size:11.5pt;color:#e7ecf4;line-height:1.3;margin-bottom:6mm;}
.cover.honor .prep .by .em{display:block;font-size:9.5pt;color:#aeb9cc;margin-top:0.5mm;}
.cover.honor .prep .date{font-size:11pt;color:#aeb9cc;}
.rz-headline{font-size:20pt;color:var(--navy);font-weight:bold;margin:0 0 1mm 0;}
.rz-target{color:var(--orange);font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;font-size:9pt;margin-bottom:4mm;}
.rz-summary{font-size:11pt;color:var(--ink);margin:0 0 5mm 0;}
.rz-sec{color:var(--navy);font-size:12.5pt;font-weight:bold;border-bottom:1.5px solid var(--line);padding-bottom:1.5mm;margin:5mm 0 3mm 0;}
.rz-comp{display:flex;flex-wrap:wrap;gap:1.5mm;}
.rz-comp span{display:inline-block;background:var(--soft);border:1px solid var(--line);border-radius:2px;font-size:9pt;padding:0.6mm 2.4mm;color:var(--navy);}
.rz-exp{margin:0 0 4mm 0;page-break-inside:avoid;}
.rz-exp .top{display:flex;justify-content:space-between;align-items:baseline;}
.rz-exp .role{font-weight:bold;color:var(--navy);font-size:11pt;}
.rz-exp .dates{color:var(--muted);font-size:9pt;}
.rz-exp .org{color:var(--alice);font-size:10pt;font-weight:bold;margin-bottom:1mm;}
.rz-exp ul{margin:1mm 0 0 0;padding-left:5mm;}
.rz-exp li{margin-bottom:1mm;font-size:10pt;}
.rz-list{margin:0;padding-left:5mm;}
.rz-list li{margin-bottom:1mm;font-size:10pt;}
.rz-sources{font-size:8.5pt;color:var(--muted);margin-top:2mm;}
`

function coverBlock(m: HonorReportMeta): string {
  const fellowEm = [m.fellowTitle, m.fellowEmail].filter(Boolean).map(esc).join(" · ")
  const coachEm = [m.coachTitle, m.coachEmail].filter(Boolean).map(esc).join(" · ")
  return `
<div class="cover honor">
  <div class="thf">The Honor Foundation</div>
  <div class="powered">Powered by InspiresGenius.com</div>
  <div class="variant">Résumé</div>
  <div class="prep">
    <div class="lbl">Prepared for</div>
    <div class="for">${esc(m.fellowName)}${fellowEm ? `<span class="em">${fellowEm}</span>` : ""}</div>
    <div class="lbl">By</div>
    <div class="by">${esc(m.coachName)}${coachEm ? `<span class="em">${coachEm}</span>` : ""}</div>
    <div class="date">${esc(m.dateLabel)}</div>
  </div>
</div>`
}

function experienceBlock(resume: HonorResume): string {
  if (!resume.experience.length) return ""
  const rows = resume.experience
    .map(
      (e) => `
<div class="rz-exp">
  <div class="top"><span class="role">${esc(e.title)}</span><span class="dates">${esc(e.dates)}</span></div>
  <div class="org">${esc(e.organization)}</div>
  ${e.bullets.length ? `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
</div>`,
    )
    .join("")
  return `<div class="rz-sec">Experience</div>${rows}`
}

function listSection(title: string, items: string[]): string {
  if (!items.length) return ""
  return `<div class="rz-sec">${esc(title)}</div><ul class="rz-list">${items
    .map((i) => `<li>${esc(i)}</li>`)
    .join("")}</ul>`
}

/** Build the full branded résumé HTML for a generated HonorResume. */
export function buildHonorResumeHtml(resume: HonorResume, meta: HonorReportMeta): string {
  const competencies = resume.competencies.length
    ? `<div class="rz-sec">Core Competencies</div><div class="rz-comp">${resume.competencies
        .map((c) => `<span>${esc(c)}</span>`)
        .join("")}</div>`
    : ""

  const summary = resume.summary
    ? `<div class="rz-sec">Professional Summary</div><p class="rz-summary">${esc(resume.summary)}</p>`
    : ""

  const sources = resume.sources.length
    ? `<p class="rz-sources">Grounded in: ${resume.sources.map(esc).join(" · ")}. ${esc(resume.disclaimer)}</p>`
    : `<p class="rz-sources">${esc(resume.disclaimer)}</p>`

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>${esc(meta.fellowName)} — Résumé</title>
<style>${BRAND_CSS}${RESUME_CSS}</style>
</head><body>
${coverBlock(meta)}
<div class="body-page">
  <div class="rz-headline">${esc(resume.headline || meta.fellowName)}</div>
  <div class="rz-target">Target — ${esc(resume.target)}</div>
  ${summary}
  ${competencies}
  ${experienceBlock(resume)}
  ${listSection("Education", resume.education)}
  ${listSection("Certifications", resume.certifications)}
  ${sources}
</div>
</body></html>`
}
