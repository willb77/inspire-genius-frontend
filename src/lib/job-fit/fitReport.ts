// Job-Fit report serializers — pure, dependency-free, unit-testable.
//
// Turn a FitDetail (+ the derived fit %) into a shareable report in several
// formats. Deliberately NON-BINARY: describes alignment, strengths, and growth
// areas — never a fit/no-fit, pass/fail, or hiring verdict. The optional
// `overview` (the agent-engine narrative) is included when available.

import type { FitDetail } from "@/types/job-fit"

export type FitReportInput = {
  data: FitDetail
  pct: number
  overview?: string
}

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/** A filesystem-safe base name, e.g. "job-fit_operations-program-manager". */
export function fitReportFileBase(data: FitDetail): string {
  const slug = (data.roleTitle || "role")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `job-fit_${slug || "role"}`
}

function gapLines(data: FitDetail): Array<{ name: string; you: number; role: number; gap: number }> {
  return data.perDimension.map((d) => ({
    name: d.dimensionName,
    you: Math.round(d.candidateScore),
    role: Math.round(d.benchmarkScore),
    gap: Math.round(d.gap),
  }))
}

/** Plain-text report. */
export function buildFitReportText({ data, pct, overview }: FitReportInput): string {
  const L: string[] = []
  L.push(`Job Fit — ${data.roleTitle}`)
  L.push("")
  L.push(`Overall fit: ${pct}% aligned`)
  if (overview) L.push("", overview)
  L.push("", "Where you stand, dimension by dimension:")
  for (const g of gapLines(data)) {
    const sign = g.gap > 0 ? `+${g.gap}` : `${g.gap}`
    L.push(`  - ${g.name}: you ${g.you} vs role ${g.role} (${sign})`)
  }
  if (data.coachingGaps.length) {
    L.push("", "Growth focus:")
    for (const g of data.coachingGaps) {
      L.push(`  - ${g.dimensionName}: ${Math.abs(Math.round(g.gap))} points below the role's benchmark`)
    }
  }
  if (data.interviewSelfAdvocacy.length) {
    L.push("", "How to speak to your strengths:")
    for (const s of data.interviewSelfAdvocacy) L.push(`  - ${s}`)
  }
  L.push(
    "",
    "This is a self-guided development aid, not a hiring decision. It compares your",
    "behavioral profile to a role's published benchmark to help you focus your growth."
  )
  return L.join("\n")
}

/** Markdown report. */
export function buildFitReportMarkdown({ data, pct, overview }: FitReportInput): string {
  const L: string[] = []
  L.push(`# Job Fit — ${data.roleTitle}`, "")
  L.push(`**Overall fit: ${pct}% aligned**`, "")
  if (overview) L.push(overview, "")
  L.push("## Where you stand", "", "| Dimension | You | Role benchmark | Difference |", "| --- | --- | --- | --- |")
  for (const g of gapLines(data)) {
    const sign = g.gap > 0 ? `+${g.gap}` : `${g.gap}`
    L.push(`| ${g.name} | ${g.you} | ${g.role} | ${sign} |`)
  }
  if (data.coachingGaps.length) {
    L.push("", "## Growth focus", "")
    for (const g of data.coachingGaps) {
      L.push(`- **${g.dimensionName}** — ${Math.abs(Math.round(g.gap))} points below the role's benchmark`)
    }
  }
  if (data.interviewSelfAdvocacy.length) {
    L.push("", "## How to speak to your strengths", "")
    for (const s of data.interviewSelfAdvocacy) L.push(`- ${s}`)
  }
  L.push(
    "",
    "> This is a self-guided development aid, not a hiring decision. It compares your",
    "> behavioral profile to a role's published benchmark to help you focus your growth."
  )
  return L.join("\n")
}

/** Self-contained HTML report (used for the client PDF + the .html export). */
export function buildFitReportHtml({ data, pct, overview }: FitReportInput): string {
  const rows = gapLines(data)
    .map((g) => {
      const sign = g.gap > 0 ? `+${g.gap}` : `${g.gap}`
      return `<tr><td>${esc(g.name)}</td><td>${g.you}</td><td>${g.role}</td><td>${sign}</td></tr>`
    })
    .join("")
  const growth = data.coachingGaps.length
    ? `<h2>Growth focus</h2><ul>${data.coachingGaps
        .map(
          (g) =>
            `<li><strong>${esc(g.dimensionName)}</strong> — ${Math.abs(
              Math.round(g.gap)
            )} points below the role's benchmark</li>`
        )
        .join("")}</ul>`
    : ""
  const advocacy = data.interviewSelfAdvocacy.length
    ? `<h2>How to speak to your strengths</h2><ul>${data.interviewSelfAdvocacy
        .map((s) => `<li>${esc(s)}</li>`)
        .join("")}</ul>`
    : ""
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;margin:32px;line-height:1.5}
    h1{color:#0f766e;font-size:22px;margin:0 0 4px}
    h2{color:#0D9488;font-size:15px;margin:20px 0 8px}
    .pct{font-size:40px;font-weight:700;color:#0f766e}
    table{border-collapse:collapse;width:100%;font-size:13px}
    th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left}
    th{background:#0D9488;color:#fff}
    .note{margin-top:24px;color:#6b7280;font-size:11px}
  </style></head><body>
    <h1>Job Fit — ${esc(data.roleTitle)}</h1>
    <div class="pct">${pct}% <span style="font-size:16px;color:#6b7280">aligned</span></div>
    ${overview ? `<p>${esc(overview)}</p>` : ""}
    <h2>Where you stand</h2>
    <table><thead><tr><th>Dimension</th><th>You</th><th>Role benchmark</th><th>Difference</th></tr></thead>
    <tbody>${rows}</tbody></table>
    ${growth}
    ${advocacy}
    <p class="note">This is a self-guided development aid, not a hiring decision. It compares your
    behavioral profile to a role's published benchmark to help you focus your growth and interview prep.</p>
  </body></html>`
}
