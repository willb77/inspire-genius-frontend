// Job-Fit report serializers — pure, dependency-free, unit-testable.
//
// Turn a FitDetail (+ the derived fit %) into a shareable report in several
// formats. Deliberately NON-BINARY: describes alignment, strengths, and growth
// areas — never a fit/no-fit, pass/fail, or hiring verdict. The optional
// `overview` (the agent-engine narrative) is included when available.

import type { FitDetail } from "@/types/job-fit"
import {
  NOT_MEASURED,
  isMeasured,
  partialCoverage,
  partialProfileDetail,
  partialProfileLabel,
} from "./coverage"
import { fitCardGroups, type FitCardGroup } from "@/components/fit/FitCardsModel"
import { FIT_CARD_GROUP_LABELS, FIT_CARD_STATUS_LABELS } from "@/constants/fit-definitions"
import type { OccupationDetail, OccupationPay, OccupationRead } from "@/types/job-fit/occupations"

export type FitReportInput = {
  data: FitDetail
  pct: number
  overview?: string
  /**
   * JF-6 — the Careers and Jobs sections, present only when the page drew its
   * `job_fit_v2` layout (a priority-scored read). Absent = today's report,
   * byte for byte.
   */
  v2?: FitV2Report
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

/**
 * One row per dimension, already formatted. BP-F5: a dimension the person was
 * never measured on reads "Not measured" with no difference — never "you 0".
 */
function gapLines(data: FitDetail): Array<{ name: string; you: string; role: number; sign: string }> {
  return data.perDimension.map((d) => {
    const role = Math.round(d.benchmarkScore)
    if (!isMeasured(d) || d.candidateScore === null || d.gap === null) {
      return { name: d.dimensionName, you: NOT_MEASURED, role, sign: "—" }
    }
    const gap = Math.round(d.gap)
    return {
      name: d.dimensionName,
      you: String(Math.round(d.candidateScore)),
      role,
      sign: gap > 0 ? `+${gap}` : `${gap}`,
    }
  })
}

/** BP-F5: the partial-profile line for a report, or null for a full read. */
function partialLine(data: FitDetail): string | null {
  const p = partialCoverage(data)
  return p ? `${partialProfileLabel(p)}. ${partialProfileDetail(p)}` : null
}

/** Plain-text report. */
export function buildFitReportText({ data, pct, overview }: FitReportInput): string {
  const L: string[] = []
  L.push(`Job Fit — ${data.roleTitle}`)
  L.push("")
  L.push(`Overall fit: ${pct}% aligned`)
  const partial = partialLine(data)
  if (partial) L.push(partial)
  if (overview) L.push("", overview)
  L.push("", "Where you stand, dimension by dimension:")
  for (const g of gapLines(data)) {
    L.push(
      g.you === NOT_MEASURED
        ? `  - ${g.name}: ${NOT_MEASURED.toLowerCase()} (role ${g.role})`
        : `  - ${g.name}: you ${g.you} vs role ${g.role} (${g.sign})`
    )
  }
  if (data.coachingGaps.length) {
    L.push("", "Growth focus:")
    for (const g of data.coachingGaps) {
      L.push(`  - ${g.dimensionName}: ${Math.abs(Math.round(g.gap))} points below the role's blueprint`)
    }
  }
  if (data.interviewSelfAdvocacy.length) {
    L.push("", "How to speak to your strengths:")
    for (const s of data.interviewSelfAdvocacy) L.push(`  - ${s}`)
  }
  L.push(
    "",
    "This is a self-guided development aid, not a hiring decision. It compares your",
    "behavioral profile to a role's published blueprint to help you focus your growth."
  )
  return L.join("\n")
}

/** Markdown report. */
export function buildFitReportMarkdown({ data, pct, overview }: FitReportInput): string {
  const L: string[] = []
  L.push(`# Job Fit — ${data.roleTitle}`, "")
  L.push(`**Overall fit: ${pct}% aligned**`, "")
  const partial = partialLine(data)
  if (partial) L.push(`_${partial}_`, "")
  if (overview) L.push(overview, "")
  L.push("## Where you stand", "", "| Dimension | You | Role blueprint | Difference |", "| --- | --- | --- | --- |")
  for (const g of gapLines(data)) {
    L.push(`| ${g.name} | ${g.you} | ${g.role} | ${g.sign} |`)
  }
  if (data.coachingGaps.length) {
    L.push("", "## Growth focus", "")
    for (const g of data.coachingGaps) {
      L.push(`- **${g.dimensionName}** — ${Math.abs(Math.round(g.gap))} points below the role's blueprint`)
    }
  }
  if (data.interviewSelfAdvocacy.length) {
    L.push("", "## How to speak to your strengths", "")
    for (const s of data.interviewSelfAdvocacy) L.push(`- ${s}`)
  }
  L.push(
    "",
    "> This is a self-guided development aid, not a hiring decision. It compares your",
    "> behavioral profile to a role's published blueprint to help you focus your growth."
  )
  return L.join("\n")
}

/** Self-contained HTML report (used for the client PDF + the .html export). */
export function buildFitReportHtml({ data, pct, overview, v2 }: FitReportInput): string {
  if (v2) return buildFitReportHtmlV2({ data, pct, v2 })
  const rows = gapLines(data)
    .map(
      (g) =>
        `<tr><td>${esc(g.name)}</td><td>${esc(g.you)}</td><td>${g.role}</td><td>${esc(g.sign)}</td></tr>`
    )
    .join("")
  const partial = partialLine(data)
  const growth = data.coachingGaps.length
    ? `<h2>Growth focus</h2><ul>${data.coachingGaps
        .map(
          (g) =>
            `<li><strong>${esc(g.dimensionName)}</strong> — ${Math.abs(
              Math.round(g.gap)
            )} points below the role's blueprint</li>`
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
    ${partial ? `<p style="color:#b45309;font-size:12px">${esc(partial)}</p>` : ""}
    ${overview ? `<p>${esc(overview)}</p>` : ""}
    <h2>Where you stand</h2>
    <table><thead><tr><th>Dimension</th><th>You</th><th>Role blueprint</th><th>Difference</th></tr></thead>
    <tbody>${rows}</tbody></table>
    ${growth}
    ${advocacy}
    <p class="note">This is a self-guided development aid, not a hiring decision. It compares your
    behavioral profile to a role's published blueprint to help you focus your growth and interview prep.</p>
  </body></html>`
}

// ─── JF-6 — the Careers and Jobs job page (job_fit_v2) ──────────────────────
//
// One set of pure helpers feeds both the page and its PDF, so the PDF carries
// the same sections, in the same order, with the same words. Every helper
// returns at least one line: a section is never blank, and a missing figure is
// said plainly, never filled in.

/** One growth area: a priority dimension where the person sits below the job. */
export type RankedGrowthArea = {
  key: string
  dimensionName: string
  groupLabel: string
  personRating: number
  jobRating: number
  /** personRating − jobRating; always negative here. */
  difference: number
  coaching: string
}

/**
 * D3 — the ranked growth areas: priority dimensions below what the job asks
 * for, largest shortfall first (ties by name). The headline growth area is
 * the first of this list; "Your profile versus the role" shows the first
 * three. Empty on any read without priority rows.
 */
export function rankedGrowthAreas(data: FitDetail): RankedGrowthArea[] {
  const groups = fitCardGroups(data)
  if (!groups) return []
  const coaching = new Map(data.perDimension.map((d) => [`${d.category}-${d.dimensionId}`, d.coaching]))
  const out: RankedGrowthArea[] = []
  for (const g of groups) {
    for (const item of g.items) {
      if (item.difference === null || item.personRating === null || item.difference >= 0) continue
      out.push({
        key: item.key,
        dimensionName: item.dimensionName,
        groupLabel: FIT_CARD_GROUP_LABELS[g.category],
        personRating: item.personRating,
        jobRating: item.jobRating,
        difference: item.difference,
        coaching: coaching.get(item.key) || "",
      })
    }
  }
  return out.sort((a, b) => a.difference - b.difference || a.dimensionName.localeCompare(b.dimensionName))
}

/** How many growth areas "Your profile versus the role" explains (D3). */
export const PROFILE_VS_ROLE_COUNT = 3

/** The line that stands in for a headline growth area when there is none. */
export const NO_GROWTH_AREA_TEXT =
  "No priority dimension is below what this role asks for — you meet or exceed it on every one you were measured on."

/** One growth area as a sentence, e.g. "Coordinating: you 55, this role 78 (−23)." */
export function growthAreaLine(g: RankedGrowthArea): string {
  return `${g.dimensionName}: you ${g.personRating}, this role ${g.jobRating} (${g.difference}).`
}

/** SOC / O*NET codes as the Job DNA read carries them (JF-3). */
export type JobReference = { socCode: string | null; onetSocCode: string | null }

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null)

/** Read JF-3's reference codes off a Job DNA response; anything else is null. */
export function readJobReference(job: unknown): JobReference {
  const j = (job ?? {}) as { socCode?: unknown; onetSocCode?: unknown }
  return { socCode: str(j.socCode), onetSocCode: str(j.onetSocCode) }
}

/** The code the occupation reads use: O*NET-SOC first, else SOC, else null. */
export function occupationCode(ref: JobReference): string | null {
  return ref.onetSocCode ?? ref.socCode
}

/** A read as the page holds it: still loading, failed, or answered. */
export type ReadOf<T> = { loading: boolean; failed: boolean; read?: OccupationRead<T> | null }

/** A section's text: its lines (never empty) and whether it is an empty state. */
export type SectionText = { lines: string[]; empty: boolean }

const NO_CODE = "No SOC or O*NET code is on file for this role yet."

/**
 * Loading or failed, said as such. Checked BEFORE the no-code case, because
 * the code itself arrives with a read (the Job DNA) the page folds into `r`.
 * With no code and nothing in flight there is nothing pending.
 */
function notReady<T>(r: ReadOf<T>, what: string, code: string | null): SectionText | null {
  if (r.loading) return { lines: [`Loading ${what}…`], empty: true }
  if (r.failed || (code && !r.read)) {
    return { lines: [`${what[0].toUpperCase()}${what.slice(1)} could not be read just now.`], empty: true }
  }
  return null
}

/**
 * `job` is the Job DNA read the codes come from; while it loads or after it
 * fails the section says that, never "no code on file".
 */
export function referenceSection(
  ref: JobReference,
  job: { loading: boolean; failed: boolean },
  occ: ReadOf<OccupationDetail>,
): SectionText {
  if (job.loading) return { lines: ["Loading this role's SOC / O*NET codes…"], empty: true }
  if (job.failed) return { lines: ["This role's SOC / O*NET codes could not be read just now."], empty: true }
  if (!occupationCode(ref)) return { lines: [NO_CODE], empty: true }
  const lines = [`SOC code: ${ref.socCode ?? "not on file"}`, `O*NET-SOC code: ${ref.onetSocCode ?? "not on file"}`]
  const title = occ.read?.state === "ready" ? occ.read.data?.title : null
  if (title) lines.push(`O*NET occupation: ${title}`)
  return { lines, empty: false }
}

/** How many O*NET skills the page and the PDF list (most important first). */
export const ONET_SKILL_COUNT = 10

export function skillsSection(code: string | null, occ: ReadOf<OccupationDetail>): SectionText {
  const pending = notReady(occ, "O*NET skills", code)
  if (pending) return pending
  if (!code) return { lines: [`O*NET skills need this role's SOC or O*NET code. ${NO_CODE}`], empty: true }
  const read = occ.read as OccupationRead<OccupationDetail>
  const skills = read.state === "ready" ? (read.data?.skills ?? []) : []
  if (skills.length === 0) {
    return {
      lines: [`No O*NET skills are loaded for this occupation yet.${read.reason ? ` ${read.reason}` : ""}`],
      empty: true,
    }
  }
  return { lines: skills.slice(0, ONET_SKILL_COUNT).map((s) => s.name), empty: false }
}

/**
 * D13 — no profile ZIP or state exists to send, so pay is asked for nationally
 * and the page says so, rather than implying a local figure.
 */
export const NO_PROFILE_LOCATION_TEXT =
  "Your profile has no ZIP code or state on file, so pay is shown for the United States as a whole."

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`

export type PaySection = SectionText & { areaLabel: string }

export function localPaySection(code: string | null, pay: ReadOf<OccupationPay>): PaySection {
  const national = "United States"
  const pending = notReady(pay, "pay figures", code)
  if (pending) return { ...pending, areaLabel: national }
  if (!code) return { areaLabel: national, lines: [`Pay needs this role's SOC or O*NET code. ${NO_CODE}`], empty: true }
  const read = pay.read as OccupationRead<OccupationPay>
  const d = read.state === "ready" ? read.data : null
  if (!d || d.median === null) {
    return {
      areaLabel: d?.areaLabel || national,
      lines: [
        `No published pay figure for this role in ${d?.areaLabel || national} yet.${read.reason ? ` ${read.reason}` : ""}`,
        NO_PROFILE_LOCATION_TEXT,
      ],
      empty: true,
    }
  }
  const lines = [`Median pay: ${usd(d.median)} a year`]
  if (d.pct10 !== null && d.pct90 !== null) {
    lines.push(`Most people in this role earn ${usd(d.pct10)} to ${usd(d.pct90)} a year (10th to 90th percentile).`)
  }
  if (d.fallbackReason) lines.push(`Shown for ${d.areaLabel}: ${d.fallbackReason}.`)
  if (d.requestedLevel === "national") lines.push(NO_PROFILE_LOCATION_TEXT)
  if (d.source) lines.push(`Source: ${d.source}.`)
  return { areaLabel: d.areaLabel, lines, empty: false }
}

/** O*NET publishes education nationally only; the page names that, per D13. */
export const EDUCATION_AREA_LABEL = "United States (O*NET publishes education nationally, not by area)"

export function educationSection(code: string | null, occ: ReadOf<OccupationDetail>): SectionText {
  const pending = notReady(occ, "education data", code)
  if (pending) return pending
  if (!code) return { lines: [`Education needs this role's SOC or O*NET code. ${NO_CODE}`], empty: true }
  const read = occ.read as OccupationRead<OccupationDetail>
  const rows = (read.state === "ready" ? (read.data?.education ?? []) : []).filter(
    (e) => e.label && typeof e.percent === "number",
  )
  if (rows.length === 0) {
    return { lines: ["No O*NET education data is loaded for this occupation yet."], empty: true }
  }
  return {
    lines: [...rows]
      .sort((a, b) => (b.percent as number) - (a.percent as number))
      .slice(0, 3)
      .map((e) => `${e.label}: ${Math.round(e.percent as number)}% of people in this occupation`),
    empty: false,
  }
}

/** Everything the v2 page shows that the PDF must carry, already in words. */
export type FitV2Report = {
  groups: FitCardGroup[]
  growth: RankedGrowthArea[]
  reference: SectionText
  skills: SectionText
  pay: PaySection
  education: SectionText
}

/**
 * The PDF section headings, in page order. The page renders the same headings
 * (see FitDetailPage); a test holds the two to one order.
 */
export const FIT_V2_SECTION_TITLES = [
  "Your fit",
  "Headline growth area",
  "Priority dimensions",
  "SOC / O*NET",
  "O*NET skills",
  "Your profile versus the role",
  "Local pay and education",
] as const

function listHtml(lines: string[]): string {
  return `<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>`
}

/** JF-6 — the PDF of the v2 job page: the same sections in the same order. */
function buildFitReportHtmlV2({ data, pct, v2 }: { data: FitDetail; pct: number; v2: FitV2Report }): string {
  const [tFit, tHeadline, tCards, tRef, tSkills, tProfile, tLocal] = FIT_V2_SECTION_TITLES
  const partial = partialLine(data)
  const headline = v2.growth[0] ? growthAreaLine(v2.growth[0]) : NO_GROWTH_AREA_TEXT
  const cardRows = v2.groups
    .flatMap((g) =>
      g.items.map(
        (i) =>
          `<tr><td>${esc(FIT_CARD_GROUP_LABELS[g.category])}</td><td>${esc(i.dimensionName)}</td><td>${i.jobRating}</td><td>${
            i.personRating === null ? esc(NOT_MEASURED) : i.personRating
          }</td><td>${i.difference === null ? "—" : i.difference > 0 ? `+${i.difference}` : i.difference}</td><td>${
            i.status ? esc(FIT_CARD_STATUS_LABELS[i.status]) : "—"
          }</td></tr>`,
      ),
    )
    .join("")
  const top = v2.growth.slice(0, PROFILE_VS_ROLE_COUNT)
  const profile = top.length
    ? `<ol>${top
        .map((g) => `<li><strong>${esc(growthAreaLine(g))}</strong>${g.coaching ? ` ${esc(g.coaching)}` : ""}</li>`)
        .join("")}</ol>`
    : `<p>${esc(NO_GROWTH_AREA_TEXT)}</p>`
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#1f2937;margin:32px;line-height:1.5}
    h1{color:#0f766e;font-size:22px;margin:0 0 4px}
    h2{color:#0D9488;font-size:15px;margin:20px 0 8px}
    h3{font-size:13px;margin:12px 0 4px}
    .pct{font-size:40px;font-weight:700;color:#0f766e}
    table{border-collapse:collapse;width:100%;font-size:13px}
    th,td{border:1px solid #e5e7eb;padding:6px 8px;text-align:left}
    th{background:#0D9488;color:#fff}
    .note{margin-top:24px;color:#6b7280;font-size:11px}
  </style></head><body>
    <h1>Careers and Jobs — ${esc(data.roleTitle)}</h1>
    <h2>${tFit}</h2>
    <div class="pct">${pct}% <span style="font-size:16px;color:#6b7280">fit</span></div>
    ${partial ? `<p style="color:#b45309;font-size:12px">${esc(partial)}</p>` : ""}
    <h2>${tHeadline}</h2>
    <p>${esc(headline)}</p>
    <h2>${tCards}</h2>
    <table><thead><tr><th>Group</th><th>Dimension</th><th>This job</th><th>You</th><th>Difference</th><th>Status</th></tr></thead>
    <tbody>${cardRows}</tbody></table>
    <h2>${tRef}</h2>
    ${listHtml(v2.reference.lines)}
    <h2>${tSkills}</h2>
    ${listHtml(v2.skills.lines)}
    <h2>${tProfile}</h2>
    ${profile}
    <h2>${tLocal}</h2>
    <h3>Pay — ${esc(v2.pay.areaLabel)}</h3>
    ${listHtml(v2.pay.lines)}
    <h3>Education — ${esc(EDUCATION_AREA_LABEL)}</h3>
    ${listHtml(v2.education.lines)}
    <p class="note">This is a self-guided development aid, not a hiring decision. It compares your
    behavioral profile to a role's published blueprint to help you focus your growth and interview prep.</p>
  </body></html>`
}
