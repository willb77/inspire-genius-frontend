/**
 * N-4 — the Blueprint Rationale Report, as a Word document built in the browser.
 *
 * The server (`GET /v1/blueprint/validation/{id}/rationale`) is the single
 * assembler: every sentence in the report is stored data, a fixed sentence
 * about the method, or "No recorded evidence". This file only lays it out —
 * it must never add a reason, a score or a claim of its own. The outline is a
 * plain array so a test can read exactly what the document will say.
 *
 * `docx` is imported dynamically (as `exportCharacterProfile` does): it is
 * large, and a static import would put it in the entry bundle for every user.
 */
import { downloadBlob } from "@/lib/exportTranscript"
import type { RationaleReport } from "@/types/job-blueprint"

export type OutlineBlock =
  | { kind: "title"; text: string }
  | { kind: "subtitle"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "subheading"; text: string }
  | { kind: "para"; text: string; bold?: boolean }
  | { kind: "bullets"; items: string[] }
  | { kind: "table"; header: string[]; rows: string[][] }

const NONE = "None recorded."

function day(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "not recorded"
}

function bulletsOr(items: string[]): OutlineBlock {
  return items.length ? { kind: "bullets", items } : { kind: "para", text: NONE }
}

/** `Ops Lead` v3 → `Blueprint_Rationale_Ops_Lead_v3`. */
export function rationaleFileStem(report: RationaleReport): string {
  const slug = report.role.roleTitle.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "")
  return `Blueprint_Rationale_${slug || "role"}_v${report.role.version}`
}

export function buildRationaleOutline(report: RationaleReport): OutlineBlock[] {
  const { role, validation, provenance, evidence, ugesp } = report
  const out: OutlineBlock[] = [
    { kind: "title", text: `Blueprint Rationale Report — ${role.roleTitle}` },
    { kind: "subtitle", text: `Version ${role.version} · generated ${day(report.generatedAt)}` },
  ]

  out.push({ kind: "heading", text: "1. Role" })
  out.push({
    kind: "table",
    header: ["Field", "Value"],
    rows: [
      ["Title", role.roleTitle],
      ["Department", role.department || "not recorded"],
      ["Tier", role.tier || "not recorded"],
      ["Version", String(role.version)],
      ["Status", role.status],
      ["Supersedes", role.supersedesVersion != null ? `version ${role.supersedesVersion}` : "none"],
      ["Created", day(role.createdAt)],
      ["Published", day(role.publishedAt)],
    ],
  })

  out.push({ kind: "heading", text: "2. Validation" })
  if (validation.statement) {
    out.push({ kind: "para", text: validation.statement, bold: true })
  } else if (validation.validatedBy) {
    out.push({ kind: "para", text: `Validated: ${validation.validatedBy}`, bold: true })
    const cur = validation.current
    if (cur) {
      out.push({
        kind: "table",
        header: ["Field", "Value"],
        rows: [
          ["Method", cur.method === "recorded" ? "Recorded attestation" : "Signed in IG"],
          ["Name", cur.validatorName ?? "no longer held (retention)"],
          ["Organisation", cur.validatorOrg ?? "no longer held (retention)"],
          ["Title", cur.validatorTitle ?? "not recorded"],
          ["Date", cur.validatedOn ?? day(cur.at)],
          ["Comments", cur.comments ?? NONE],
        ],
      })
    }
  }
  if (validation.history.length) {
    out.push({ kind: "subheading", text: "History" })
    out.push({
      kind: "table",
      header: ["Date", "Event", "Method", "By", "Comments"],
      rows: validation.history.map((e) => [
        day(e.at),
        e.event.replace("_", " "),
        e.method ?? "",
        e.actorName,
        e.comments ?? "",
      ]),
    })
  }

  out.push({ kind: "heading", text: "3. Provenance" })
  out.push({
    kind: "table",
    header: ["Field", "Value"],
    rows: [
      ["Benchmark source", provenance.benchmarkSourceLabel],
      ["Made from", provenance.sourceRef ?? "not recorded"],
      ["Internal reviewer (publisher)", provenance.internalReviewer],
      ["Reviewed", day(provenance.reviewedAt)],
    ],
  })

  out.push({ kind: "heading", text: "4. The 22 dimensions" })
  out.push({ kind: "para", text: evidence.perDimension })
  let category = ""
  for (const d of report.dimensions) {
    if (d.categoryLabel !== category) {
      category = d.categoryLabel
      out.push({ kind: "subheading", text: category })
    }
    out.push({
      kind: "para",
      bold: true,
      text: `${d.dimensionName} — target ${d.targetPercent}% · ${d.importanceTier}${
        d.rankPosition != null ? ` · rank ${d.rankPosition}` : ""
      }${d.rateValue != null ? ` · rate ${d.rateValue}/${d.maxRate}` : ""}`,
    })
    out.push({ kind: "para", text: `Why it is in: ${d.method}` })
    out.push({
      kind: "para",
      text: `Competencies it evidences: ${d.competencies.length ? d.competencies.join(", ") : NONE}`,
    })
    out.push({
      kind: "para",
      text: d.smeNote ? `Validator's note: ${d.smeNote}` : `Evidence: ${d.recordedEvidence}`,
    })
  }

  out.push({ kind: "heading", text: "5. Evidence on file for the role" })
  const lists: [string, string[]][] = [
    ["Critical activities", evidence.criticalActivities],
    ["KPIs", evidence.kpis],
    ["Key interactions", evidence.keyInteractions],
    ["Work pressures", evidence.workPressures],
    ["Required work styles", evidence.requiredWorkStyles],
    ["Environmental factors", evidence.environmentalFactors],
    ["Cultural factors", evidence.culturalFactors],
  ]
  for (const [label, items] of lists) {
    out.push({ kind: "subheading", text: label })
    out.push(bulletsOr(items))
  }

  out.push({ kind: "heading", text: `6. ${ugesp.section}` })
  out.push({
    kind: "table",
    header: ["Element", "Recorded"],
    rows: [
      ["Job analysis", ugesp.jobAnalysis],
      ["Version analysed", String(ugesp.version)],
      ["Published by", ugesp.publishedBy],
      ["Published", day(ugesp.publishedAt)],
      ["Validated by", ugesp.validatedBy],
      ["Work behaviours", ugesp.workBehaviours],
    ],
  })

  out.push({ kind: "heading", text: "7. Limits" })
  out.push({ kind: "bullets", items: report.limits })
  return out
}

export async function exportRationaleWord(report: RationaleReport): Promise<void> {
  const {
    Document,
    Packer,
    Paragraph,
    HeadingLevel,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
  } = await import("docx")

  const cell = (text: string, bold = false) =>
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold, size: 18 })] })] })

  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = []
  for (const block of buildRationaleOutline(report)) {
    switch (block.kind) {
      case "title":
        children.push(new Paragraph({ text: block.text, heading: HeadingLevel.TITLE }))
        break
      case "subtitle":
        children.push(new Paragraph({ children: [new TextRun({ text: block.text, italics: true })] }))
        break
      case "heading":
        children.push(new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_1 }))
        break
      case "subheading":
        children.push(new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_3 }))
        break
      case "para":
        children.push(new Paragraph({ children: [new TextRun({ text: block.text, bold: block.bold })] }))
        break
      case "bullets":
        for (const item of block.items) children.push(new Paragraph({ text: item, bullet: { level: 0 } }))
        break
      case "table":
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: block.header.map((h) => cell(h, true)) }),
              ...block.rows.map((r) => new TableRow({ children: r.map((c) => cell(c)) })),
            ],
          }),
        )
        children.push(new Paragraph({ text: "" }))
        break
    }
  }

  const doc = new Document({ sections: [{ children }] })
  downloadBlob(`${rationaleFileStem(report)}.docx`, await Packer.toBlob(doc))
}
