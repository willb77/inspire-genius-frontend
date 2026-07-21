// The Honor Foundation — branded evaluation report HTML (Phase 4).
//
// Renders a deterministic HonorEvaluation into the print-ready HTML the
// exportTranscript renderer rasterizes to a branded PDF. Nothing here computes
// or reformats a score — every number/citation is rendered verbatim from the
// server-side deterministic evaluation (the UI's contract with the scorer).
//
// The §4 cover follows the THF spec exactly:
//   • "The Honor Foundation"  (large, bold)
//   • "Powered by InspiresGenius.com"  (smaller)
//   • two lines down: "Prepared for: {Fellow full name, title, email}" (large)
//   • "By: {coach full name, title, email}" (smaller)
//   • "{Month Day, Year}"
// The per-page confidentiality footer is NOT baked here — html2canvas slices one
// tall canvas, so a footer in the HTML would land on the last page only. The
// renderer stamps it on every page via `footerLeft` (see exportHonorReport.ts).

import { BRAND_CSS } from "@/lib/exportTranscript/brandCss"
import type {
  HonorCareerFit,
  HonorCitedClaim,
  HonorComparative,
  HonorEvaluation,
  HonorFitFactor,
  HonorGoalFit,
} from "@/types/honor"

/** Header identities + date for the cover and confidentiality footer. */
export type HonorReportMeta = {
  fellowName: string
  fellowTitle: string
  fellowEmail: string
  coachName: string
  coachTitle: string
  coachEmail: string
  /** Pre-formatted "Month Day, Year". */
  dateLabel: string
  /** Optional sanitized Meridian narrative HTML (already <p>…</p> wrapped). */
  narrativeHtml?: string
}

function esc(s: string | number | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** The confidentiality line stamped bottom-left of every page (spec §4). */
export function confidentialFooter(fellowName: string, fellowTitle: string): string {
  const who = fellowTitle ? `${fellowName}, ${fellowTitle}` : fellowName
  return `Confidential Data. Distribution to others only by permission of ${who}.`
}

// ── Honor-specific cover + component CSS (layered over BRAND_CSS) ──────────────
const HONOR_CSS = `
.cover.honor{padding:48mm 16mm 20mm 16mm;}
.cover.honor .thf{font-size:34pt;font-weight:bold;line-height:1.08;color:#fff;margin-bottom:3mm;}
.cover.honor .powered{font-size:12pt;color:var(--orange);letter-spacing:1px;margin-bottom:24mm;}
.cover.honor .prep{border-top:2px solid var(--orange);padding-top:8mm;}
.cover.honor .prep .lbl{font-size:9pt;text-transform:uppercase;letter-spacing:2px;color:#aeb9cc;margin-bottom:1.5mm;}
.cover.honor .prep .for{font-size:17pt;font-weight:bold;color:#fff;line-height:1.25;margin-bottom:6mm;}
.cover.honor .prep .for .em{display:block;font-size:10.5pt;font-weight:normal;color:#c9d2e0;margin-top:1mm;}
.cover.honor .prep .by{font-size:11.5pt;color:#e7ecf4;line-height:1.3;margin-bottom:6mm;}
.cover.honor .prep .by .em{display:block;font-size:9.5pt;color:#aeb9cc;margin-top:0.5mm;}
.cover.honor .prep .date{font-size:11pt;color:#aeb9cc;}
.claim{margin:0 0 2.2mm 0;padding-left:4mm;border-left:2px solid var(--line);}
.claim.dev{border-left-color:var(--orange);}
.claim .stmt{color:var(--ink);}
.claim .src{display:inline-block;font-size:8pt;color:var(--muted);background:var(--soft);border-radius:2px;padding:0.3mm 2mm;margin-left:1.5mm;white-space:nowrap;}
.fitrow{margin:0 0 3mm 0;page-break-inside:avoid;}
.fitrow .top{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1mm;}
.fitrow .nm{font-weight:bold;color:var(--navy);font-size:10.5pt;}
.fitrow .sc{font-weight:bold;color:var(--orange);font-size:11pt;}
.bar{height:2.4mm;background:var(--soft);border-radius:2px;overflow:hidden;}
.bar > span{display:block;height:100%;background:var(--navy);}
.bar > span.hi{background:var(--orange);}
.drv{font-size:8.5pt;color:var(--muted);margin-top:1mm;}
.drv b{color:var(--navy);font-weight:bold;}
.verdict{display:inline-block;font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;padding:0.5mm 2.2mm;border-radius:2px;color:#fff;}
.verdict.supported{background:var(--mary);}
.verdict.mixed{background:var(--navy);}
.verdict.attension{background:var(--alice);}
.verdict.unmapped{background:#9aa3b2;}
.chips .chip{display:inline-block;font-size:8.5pt;background:var(--soft);border:1px solid var(--line);border-radius:2px;padding:0.4mm 2mm;margin:0 1.5mm 1.5mm 0;}
.chips .chip.cov{border-color:var(--mary);color:var(--mary);}
.chips .chip.gap{border-color:var(--alice);color:var(--alice);}
.narrative-block{background:#eef1f6;border-radius:3px;padding:4mm 5mm;margin:0 0 5mm 0;color:var(--navy);}
.narrative-block p{margin:0 0 2.5mm 0;}
.narrative-block p:last-child{margin-bottom:0;}
`

function coverBlock(m: HonorReportMeta): string {
  const fellowEm = [m.fellowTitle, m.fellowEmail].filter(Boolean).map(esc).join(" · ")
  const coachEm = [m.coachTitle, m.coachEmail].filter(Boolean).map(esc).join(" · ")
  return `
<div class="cover honor">
  <div class="thf">The Honor Foundation</div>
  <div class="powered">Powered by InspiresGenius.com</div>
  <div class="prep">
    <div class="lbl">Prepared for</div>
    <div class="for">${esc(m.fellowName)}${fellowEm ? `<span class="em">${fellowEm}</span>` : ""}</div>
    <div class="lbl">By</div>
    <div class="by">${esc(m.coachName)}${coachEm ? `<span class="em">${coachEm}</span>` : ""}</div>
    <div class="date">${esc(m.dateLabel)}</div>
  </div>
</div>`
}

function claimList(claims: HonorCitedClaim[], dev = false): string {
  if (claims.length === 0) return `<p class="lead">None on file.</p>`
  return claims
    .map(
      (c) =>
        `<div class="claim${dev ? " dev" : ""}"><span class="stmt">${esc(c.statement)}</span><span class="src">${esc(c.source)}</span></div>`,
    )
    .join("")
}

function factorLine(label: string, factors: HonorFitFactor[]): string {
  if (!factors.length) return ""
  const parts = factors.map((f) => esc(f.source)).join(" · ")
  return `<div class="drv"><b>${esc(label)}:</b> ${parts}</div>`
}

function careerRows(fits: HonorCareerFit[]): string {
  return fits
    .map((f) => {
      const hi = f.score >= 80 ? " hi" : ""
      const w = Math.max(0, Math.min(100, f.score))
      return `
<div class="fitrow">
  <div class="top"><span class="nm">${esc(f.label)}</span><span class="sc">${esc(f.score)}</span></div>
  <div class="bar"><span class="${hi.trim()}" style="width:${w}%"></span></div>
  ${factorLine("Drivers", f.top_factors)}
  ${factorLine("Gaps", f.top_gaps)}
</div>`
    })
    .join("")
}

function goalRows(goals: HonorGoalFit[]): string {
  const vclass: Record<string, string> = {
    supported: "supported",
    mixed: "mixed",
    "at-tension": "attension",
    unmapped: "unmapped",
  }
  const body = goals
    .map((g) => {
      const vs = g.label && g.verdict !== "unmapped" ? esc(g.label) : "—"
      const score = g.score != null ? esc(g.score) : "—"
      return `<tr>
  <td>${esc(g.goal)}</td>
  <td><span class="verdict ${vclass[g.verdict] ?? "unmapped"}">${esc(g.verdict)}</span></td>
  <td class="num">${score}</td>
  <td>${vs}</td>
</tr>`
    })
    .join("")
  return `<table class="tbl-tight"><thead><tr><th>Goal</th><th>Verdict</th><th class="num">Fit</th><th>Mapped area</th></tr></thead><tbody>${body}</tbody></table>`
}

function comparativeBlock(cmp: HonorComparative, career: HonorCareerFit[], primaryName: string, nameById: Record<string, string>): string {
  const areaLabel: Record<string, string> = {}
  for (const c of career) areaLabel[c.area] = c.label
  const areas = cmp.areas.filter((a) => a !== "uploaded_position")
  const primaryScores: Record<string, number> = {}
  for (const c of career) primaryScores[c.area] = c.score

  const head = `<tr><th>Fellow</th>${areas.map((a) => `<th class="num">${esc(areaLabel[a] ?? a)}</th>`).join("")}</tr>`
  const rows: Array<{ name: string; scores: Record<string, number> }> = [
    { name: `${primaryName} (subject)`, scores: primaryScores },
    ...cmp.subjects.map((sid) => ({ name: nameById[sid] ?? sid, scores: cmp.per_subject_area_fit[sid] ?? {} })),
  ]
  const body = rows
    .map(
      (r) =>
        `<tr><td>${esc(r.name)}</td>${areas.map((a) => `<td class="num">${esc(r.scores[a] ?? 0)}</td>`).join("")}</tr>`,
    )
    .join("")

  let teamHtml = ""
  const tr = cmp.team_read
  if (tr) {
    const chips = (items: string[], cls: string) =>
      items.length
        ? items.map((i) => `<span class="chip ${cls}">${esc(i.split(":").pop() ?? i)}</span>`).join("")
        : `<span class="chip">—</span>`
    teamHtml = `
<h3>Team read — ${esc(tr.label)}</h3>
<div class="grid2">
  <div class="col"><h4>Covered</h4><div class="chips">${chips(tr.covered, "cov")}</div>
    <h4>Complementary</h4><div class="chips">${chips(tr.complementary, "")}</div></div>
  <div class="col"><h4>Gaps</h4><div class="chips">${chips(tr.gaps, "gap")}</div>
    <h4>Redundant</h4><div class="chips">${chips(tr.redundant, "")}</div></div>
</div>`
  }

  return `
<div class="part-label">Part 4</div>
<h2 class="part">Comparative &amp; Team Read</h2>
<p class="lead">Fit by area across the selected pod; the strongest fellow per area is shown by the score.</p>
<table class="tbl-tight"><thead>${head}</thead><tbody>${body}</tbody></table>
${teamHtml}`
}

/** Build the full branded report HTML for a deterministic evaluation. */
export function buildHonorReportHtml(
  report: HonorEvaluation,
  meta: HonorReportMeta,
  nameById: Record<string, string> = {},
): string {
  const narrative = meta.narrativeHtml
    ? `<div class="part-label">Summary</div><h2 class="part">Coach Narrative</h2><div class="narrative-block">${meta.narrativeHtml}</div>`
    : ""

  const objective = `
<div class="part-label">Part 1</div>
<h2 class="part">Objective Evaluation</h2>
<p class="lead">Behavioral strengths derived from ${esc(report.frameworks.join(", ") || "the fellow's profile")}, each tied to its source.</p>
${claimList(report.objective_evaluation)}
${report.development_areas.length ? `<h3>Development areas</h3>${claimList(report.development_areas, true)}` : ""}`

  const goals = report.goals_fit.length
    ? `
<div class="part-label">Part 2</div>
<h2 class="part">Goals &amp; Objectives — Fit</h2>
<p class="lead">Each stated goal scored against the behavioral profile (deterministic; 0–100).</p>
${goalRows(report.goals_fit)}`
    : ""

  const career = `
<div class="part-label">Part 3</div>
<h2 class="part">Career / Position Fit — Ranked</h2>
<p class="lead">Career areas (and any uploaded position) ranked by alignment with the profile.</p>
${careerRows(report.career_fit_ranked)}`

  const comparative = report.comparative
    ? comparativeBlock(report.comparative, report.career_fit_ranked, meta.fellowName, nameById)
    : ""

  const noScores = report.frameworks.length === 0
  const banner = noScores
    ? `<div class="disclaimer" style="border-left-color:var(--orange);margin:0 0 5mm 0;"><b>No scored assessments on file.</b> Fit scores below are imputed-neutral — import a PRISM report for a real evaluation.</div>`
    : ""

  const disclaimer = `
<div class="disclaimer"><b>Decision ownership.</b> This report provides structured, deterministic input from Inspires Genius for The Honor Foundation. It is designed to inform, not replace, coach judgment. ${esc(report.notes)}</div>`

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>${esc(meta.fellowName)} — Honor Evaluation</title>
<style>${BRAND_CSS}${HONOR_CSS}</style>
</head><body>
${coverBlock(meta)}
<div class="body-page">
  ${banner}
  ${narrative}
  ${objective}
  ${goals}
  ${career}
  ${comparative}
  ${disclaimer}
</div>
</body></html>`
}
