// Résumé Writer — platform-branded résumé HTML (2026-10-19).
//
// The model writes the field CONTENT; this module owns the structure and the
// look. Platform palette (navy / teal / gold), no cover page, no third-party
// branding. Every model-written string goes through `esc` — the draft is
// untrusted text and must never become markup.

import type { GeneratedResume } from "@/types/resumeWriter"

export const RESUME_PALETTE = { navy: "#0B1F3A", teal: "#127A8A", gold: "#C88B1B" } as const

export function esc(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

const CSS = `
*{box-sizing:border-box;}
body{margin:0;font-family:Helvetica,Arial,sans-serif;color:#1f2933;background:#fff;}
.page{padding:16mm 16mm 18mm 16mm;}
.name{font-size:22pt;font-weight:bold;color:${RESUME_PALETTE.navy};margin:0;}
.headline{font-size:12.5pt;color:${RESUME_PALETTE.teal};font-weight:bold;margin:1.5mm 0 0 0;}
.target{font-size:8.5pt;color:${RESUME_PALETTE.gold};text-transform:uppercase;letter-spacing:1.5px;font-weight:bold;margin:2mm 0 4mm 0;}
.rule{height:2px;background:${RESUME_PALETTE.teal};margin:0 0 4mm 0;}
.sec{color:${RESUME_PALETTE.navy};font-size:12pt;font-weight:bold;border-bottom:1px solid #d9e2ec;padding-bottom:1.2mm;margin:5mm 0 2.5mm 0;}
.summary{font-size:10.5pt;line-height:1.45;margin:0;}
.comp{display:flex;flex-wrap:wrap;gap:1.5mm;}
.comp span{display:inline-block;border:1px solid ${RESUME_PALETTE.teal};color:${RESUME_PALETTE.navy};border-radius:2px;font-size:9pt;padding:0.6mm 2.4mm;}
.exp{margin:0 0 3.5mm 0;page-break-inside:avoid;}
.exp .top{display:flex;justify-content:space-between;align-items:baseline;}
.exp .role{font-weight:bold;color:${RESUME_PALETTE.navy};font-size:10.5pt;}
.exp .dates{color:#6b7785;font-size:9pt;}
.exp .org{color:${RESUME_PALETTE.teal};font-size:9.5pt;font-weight:bold;margin-bottom:1mm;}
ul{margin:1mm 0 0 0;padding-left:5mm;}
li{margin-bottom:1mm;font-size:10pt;line-height:1.35;}
.sources{font-size:8pt;color:#6b7785;margin-top:6mm;border-top:1px solid #d9e2ec;padding-top:2mm;}
`

function list(title: string, items: string[]): string {
  if (!items.length) return ""
  return `<div class="sec">${esc(title)}</div><ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`
}

function experience(resume: GeneratedResume): string {
  if (!resume.experience.length) return ""
  const rows = resume.experience
    .map(
      (e) => `<div class="exp">
  <div class="top"><span class="role">${esc(e.title)}</span><span class="dates">${esc(e.dates)}</span></div>
  <div class="org">${esc(e.organization)}</div>
  ${e.bullets.length ? `<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
</div>`,
    )
    .join("")
  return `<div class="sec">Experience</div>${rows}`
}

/** The full print-ready résumé document for `renderHtmlToPdf`. */
export function buildResumeHtml(resume: GeneratedResume, name: string): string {
  const summary = resume.summary
    ? `<div class="sec">Professional Summary</div><p class="summary">${esc(resume.summary)}</p>`
    : ""
  const competencies = resume.competencies.length
    ? `<div class="sec">Core Competencies</div><div class="comp">${resume.competencies
        .map((c) => `<span>${esc(c)}</span>`)
        .join("")}</div>`
    : ""
  const sources = resume.sources.length
    ? `Drafted from: ${resume.sources.map(esc).join(" · ")}. ${esc(resume.disclaimer)}`
    : esc(resume.disclaimer)
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>${esc(name)} — Résumé</title>
<style>${CSS}</style>
</head><body>
<div class="page">
  <div class="name">${esc(name)}</div>
  ${resume.headline ? `<div class="headline">${esc(resume.headline)}</div>` : ""}
  ${resume.target ? `<div class="target">Target — ${esc(resume.target)}</div>` : ""}
  <div class="rule"></div>
  ${summary}
  ${competencies}
  ${experience(resume)}
  ${list("Education", resume.education)}
  ${list("Certifications", resume.certifications)}
  <p class="sources">${sources}</p>
</div>
</body></html>`
}

/** Plain text for the Copy action — the same sections, no markup. */
export function resumeToPlainText(resume: GeneratedResume, name: string): string {
  const out: string[] = [name]
  if (resume.headline) out.push(resume.headline)
  if (resume.summary) out.push("", "PROFESSIONAL SUMMARY", resume.summary)
  if (resume.competencies.length) out.push("", "CORE COMPETENCIES", resume.competencies.join(" · "))
  if (resume.experience.length) {
    out.push("", "EXPERIENCE")
    for (const e of resume.experience) {
      out.push([e.title, e.organization, e.dates].filter(Boolean).join(" — "))
      for (const b of e.bullets) out.push(`• ${b}`)
    }
  }
  if (resume.education.length) out.push("", "EDUCATION", ...resume.education.map((x) => `• ${x}`))
  if (resume.certifications.length)
    out.push("", "CERTIFICATIONS", ...resume.certifications.map((x) => `• ${x}`))
  return out.join("\n")
}
