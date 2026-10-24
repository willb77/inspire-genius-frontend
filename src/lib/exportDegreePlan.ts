/**
 * DISC-5: the degree plan as a PDF, in the browser.
 *
 * Reuses the shared jsPDF writer (`@/lib/pdfWriter`) and `downloadBlob`, with
 * `jspdf` imported dynamically so it stays out of the entry bundle. Nothing is
 * sent anywhere: the PDF is built from the plan the page already holds.
 *
 * The content is `degreePlanBlocks` — a pure list of text blocks — so what the
 * PDF says is testable without a PDF, and the page and the PDF cannot disagree
 * about which courses are in which term.
 */
import { downloadBlob } from "@/lib/exportTranscript"
import { createPdfWriter, type PdfLike, type WriteOpts } from "@/lib/pdfWriter"
import type { DegreePlanReady } from "@/types/career-discovery"

export type PdfBlock = { text: string; opts?: WriteOpts; rule?: boolean }

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

const MUTED: [number, number, number] = [75, 85, 99]

/** Everything the PDF prints, in order. Pure. */
export function degreePlanBlocks(data: DegreePlanReady): PdfBlock[] {
  const plan = data.plan
  const out: PdfBlock[] = [
    { text: "Degree plan", opts: { size: 22, style: "bold", gap: 2 } },
    {
      text: `${data.catalog.catalogYear} catalog · ${
        plan.load.kind === "part_time" ? "part-time" : "full-time"
      }, up to ${plan.load.creditsPerTerm} credits a term · starting ${plan.start.label}${
        plan.summer ? " · summer terms included" : ""
      }`,
      opts: { size: 10, colour: MUTED, gap: 4 },
    },
    {
      text: `Programs: ${(plan.programs ?? [])
        .map((p) => `${p.title ?? p.code} (${[p.credential, p.code].filter(Boolean).join(", ")})`)
        .join("; ")}`,
      opts: { size: 10, gap: 10 },
    },
  ]

  if (plan.refused) {
    out.push({ text: "This plan can't be built yet", opts: { size: 14, style: "bold", gap: 4 }, rule: true })
    out.push({ text: plan.refused.statement, opts: { gap: 8 } })
    return out
  }

  const done = plan.creditsDone ?? 0
  const left = plan.creditsLeft ?? 0
  out.push({
    text: plan.alreadyComplete
      ? `Every course these programs need is done (${done} credits).`
      : `${done} credits done, ${left} to go. Expected to finish: ${plan.expectedCompletion?.label ?? "—"}.`,
    opts: { size: 12, style: "bold", gap: 8 },
  })

  for (const term of plan.terms ?? []) {
    out.push({
      text: `${term.label} — ${term.credits} credits${term.overLoad ? " (over your load)" : ""}`,
      opts: { size: 13, style: "bold", gap: 4 },
      rule: true,
    })
    if (term.courses.length === 0 && term.note) out.push({ text: term.note, opts: { colour: MUTED, gap: 4 } })
    for (const c of term.courses) {
      out.push({ text: `${c.code}  ${c.title ?? ""} · ${c.credits} credits`, opts: { style: "bold", gap: 1 } })
      out.push({ text: c.whyNow, opts: { size: 9, indent: 10, colour: MUTED, gap: 4 } })
    }
  }

  for (const note of plan.notes ?? []) out.push({ text: `•  ${note}`, opts: { size: 9, colour: MUTED, gap: 2 } })

  if (data.careers.length > 0) {
    out.push({ text: "Where it leads", opts: { size: 13, style: "bold", gap: 4 }, rule: true })
    for (const c of data.careers) {
      const fits = [
        c.overallFit !== null ? `Overall fit ${Math.round(c.overallFit)}%` : null,
        c.prismFit !== null ? `PRISM fit ${Math.round(c.prismFit)}%` : null,
      ].filter(Boolean)
      out.push({
        text: `${c.role?.title ?? c.roleFamily ?? "A career area"}${c.socCode ? ` (${c.socCode})` : ""}${
          fits.length ? ` — ${fits.join(", ")}` : ""
        }`,
        opts: { gap: 2 },
      })
    }
    if (!data.fit.available && data.fit.reason) {
      out.push({ text: data.fit.reason, opts: { size: 9, colour: MUTED, gap: 4 } })
    }
  }

  out.push({ text: "Cost to finish", opts: { size: 13, style: "bold", gap: 4 }, rule: true })
  const cost = data.costToFinish
  if (cost.available) {
    out.push({
      text:
        cost.terms === 0
          ? cost.note ?? "Nothing left to pay for."
          : `${money(cost.low)} to ${money(cost.high)} after grants, over ${cost.terms} term${
              cost.terms === 1 ? "" : "s"
            }.`,
      opts: { gap: 2 },
    })
    if (cost.basis) out.push({ text: cost.basis, opts: { size: 9, colour: MUTED, gap: 4 } })
  } else {
    out.push({ text: cost.note ?? "No cost to finish yet.", opts: { gap: 2 } })
    for (const s of cost.missingStatements) out.push({ text: s, opts: { size: 9, colour: MUTED, gap: 2 } })
  }

  out.push({ text: "Still to work on", opts: { size: 13, style: "bold", gap: 4 }, rule: true })
  const gaps = data.gaps
  if (!gaps.available) {
    out.push({ text: gaps.note, opts: { gap: 2 } })
  } else if (gaps.items.length === 0) {
    out.push({ text: gaps.note ?? "No behaviour or skill gaps are on file.", opts: { gap: 2 } })
  } else {
    for (const g of gaps.items) out.push({ text: `•  ${g.title ?? g.competency ?? ""}`, opts: { gap: 2 } })
  }
  return out
}

/** File name: the catalog year only — never the person's name. */
export function degreePlanFileName(data: DegreePlanReady): string {
  const year = data.catalog.catalogYear.replace(/[^0-9-]/g, "") || "plan"
  return `Degree_Plan_${year}.pdf`
}

export async function exportDegreePlanPdf(data: DegreePlanReady): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const w = createPdfWriter(new jsPDF({ unit: "pt", format: "a4" }) as unknown as PdfLike)
  for (const block of degreePlanBlocks(data)) {
    if (block.rule) w.rule()
    w.write(block.text, block.opts)
  }
  w.footer("Degree plan — built from your school's published catalog")
  downloadBlob(degreePlanFileName(data), (w.doc as unknown as { output: (t: string) => Blob }).output("blob"))
}
