/**
 * Export a Team Development Studio Meridian conversation to Word, PDF, Excel,
 * print, or a mail draft.
 *
 * Built only from the transcript already on the manager's screen — nothing is
 * fetched and nothing is sent from a server. The "Email" action opens the
 * manager's own mail client (`mailto:`), as every email action in this app does.
 *
 * Every artefact is headed by `developmentNotice`: the conversation is derived
 * from the member's PRISM, shared goals and documents, and an export outlives
 * the screen that was entitled to show it.
 *
 * The renderers are the shared ones — `markdownToHtml` + `BRAND_CSS` +
 * `renderHtmlToPdf` (transcript export), `markdownToDocxParagraphs`
 * (research export), `printHtml` (turn printing) — and the heavy libraries are
 * imported lazily, so this adds nothing to the entry bundle.
 */
import { downloadBlob } from "@/lib/exportTranscript"
import { markdownToHtml } from "@/lib/exportTranscript/markdown"
import { BRAND_CSS } from "@/lib/exportTranscript/brandCss"
import { printHtml } from "@/lib/exportTranscript/printTurn"
import { markdownToDocxParagraphs } from "@/lib/exportResearch"

export type DevelopmentChatTurn = { role: "user" | "assistant"; content: string }

export interface DevelopmentChatExportPayload {
  memberName: string
  managerName: string
  turns: DevelopmentChatTurn[]
  generatedAt: Date
}

/** The data notice every export starts with. */
export function developmentNotice(memberName: string): string {
  const who = memberName.trim() || "This member"
  return `Contains ${who}'s development information — share only with people entitled to see it.`
}

/** `Meridian_Development_ben-b_2026-10-13` — safe on every filesystem. */
export function developmentChatFileStem(payload: DevelopmentChatExportPayload): string {
  const slug = payload.memberName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
  const date = payload.generatedAt.toISOString().slice(0, 10)
  return `Meridian_Development_${slug || "member"}_${date}`
}

function speaker(turn: DevelopmentChatTurn, payload: DevelopmentChatExportPayload): string {
  return turn.role === "assistant" ? "Meridian" : payload.managerName.trim() || "Manager"
}

function metaRows(payload: DevelopmentChatExportPayload): Array<[string, string]> {
  return [
    ["Member", payload.memberName.trim() || "—"],
    ["Manager", payload.managerName.trim() || "—"],
    ["Exported", payload.generatedAt.toLocaleString()],
    ["Messages", String(payload.turns.length)],
  ]
}

function assertHasTurns(payload: DevelopmentChatExportPayload): void {
  if (payload.turns.length === 0) {
    throw new Error("Nothing to export — the conversation is empty.")
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// ─── HTML (PDF and print) ──────────────────────────────────────────

export function buildDevelopmentChatHtml(payload: DevelopmentChatExportPayload): string {
  const rows = metaRows(payload)
    .map(
      ([k, v]) =>
        `<tr><th style="text-align:left;padding:4px 12px 4px 0;vertical-align:top;white-space:nowrap">${escapeHtml(
          k,
        )}</th><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`,
    )
    .join("")
  const turns = payload.turns
    .map(
      (t) =>
        `<div style="margin:0 0 14px"><p style="margin:0 0 4px;font-weight:600">${escapeHtml(
          speaker(t, payload),
        )}</p><div>${markdownToHtml(t.content)}</div></div>`,
    )
    .join("")
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BRAND_CSS}</style></head><body>
    <p style="border:1px solid #c88b1b;padding:8px 10px;font-size:12px;font-weight:600">${escapeHtml(
      developmentNotice(payload.memberName),
    )}</p>
    <h1>Meridian conversation</h1>
    <table style="border-collapse:collapse;margin-bottom:20px;font-size:12px">${rows}</table>
    <hr />
    ${turns}
  </body></html>`
}

export async function exportDevelopmentChatPdf(payload: DevelopmentChatExportPayload): Promise<void> {
  assertHasTurns(payload)
  const { renderHtmlToPdf } = await import("@/lib/exportTranscript/renderPdf")
  const blob = await renderHtmlToPdf(buildDevelopmentChatHtml(payload))
  downloadBlob(`${developmentChatFileStem(payload)}.pdf`, blob)
}

/** The transcript only — the app chrome never reaches the printer. */
export function printDevelopmentChat(payload: DevelopmentChatExportPayload): void {
  assertHasTurns(payload)
  printHtml(buildDevelopmentChatHtml(payload))
}

// ─── Word (.docx) ──────────────────────────────────────────────────

export async function exportDevelopmentChatWord(payload: DevelopmentChatExportPayload): Promise<void> {
  assertHasTurns(payload)
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import("docx")

  const meta = metaRows(payload).map(
    ([k, v]) =>
      new Paragraph({
        children: [new TextRun({ text: `${k}: `, bold: true }), new TextRun(v)],
        spacing: { after: 60 },
      }),
  )

  const body: InstanceType<typeof Paragraph>[] = []
  for (const turn of payload.turns) {
    body.push(new Paragraph({ text: speaker(turn, payload), heading: HeadingLevel.HEADING_3 }))
    body.push(...(await markdownToDocxParagraphs(turn.content)))
  }

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun({ text: developmentNotice(payload.memberName), bold: true })],
            spacing: { after: 200 },
          }),
          new Paragraph({ text: "Meridian conversation", heading: HeadingLevel.TITLE }),
          ...meta,
          new Paragraph({ text: "" }),
          ...body,
        ],
      },
    ],
  })

  downloadBlob(`${developmentChatFileStem(payload)}.docx`, await Packer.toBlob(doc))
}

// ─── Excel (.xlsx) ─────────────────────────────────────────────────

/** Two sheets: the notice and details, then one row per message. */
export async function exportDevelopmentChatExcel(payload: DevelopmentChatExportPayload): Promise<void> {
  assertHasTurns(payload)
  const XLSX = await import("xlsx")

  const summary = XLSX.utils.aoa_to_sheet([
    [developmentNotice(payload.memberName)],
    [],
    ["Field", "Value"],
    ...metaRows(payload),
  ])
  summary["!cols"] = [{ wch: 18 }, { wch: 100 }]

  const conversation = XLSX.utils.aoa_to_sheet([
    [developmentNotice(payload.memberName)],
    ["#", "Speaker", "Message"],
    ...payload.turns.map((t, i) => [i + 1, speaker(t, payload), t.content]),
  ])
  conversation["!cols"] = [{ wch: 6 }, { wch: 18 }, { wch: 120 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, summary, "Summary")
  XLSX.utils.book_append_sheet(wb, conversation, "Conversation")

  const array = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer
  downloadBlob(
    `${developmentChatFileStem(payload)}.xlsx`,
    new Blob([array], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  )
}

// ─── Email (mail client only) ──────────────────────────────────────

/** The `mailto:` URL: a short summary and an instruction to attach the file.
 *  The conversation itself is never put in the mail body. */
export function buildDevelopmentChatMailto(payload: DevelopmentChatExportPayload): string {
  const who = payload.memberName.trim() || "a team member"
  const subject = `Meridian development conversation — ${who}`
  const body = [
    developmentNotice(payload.memberName),
    "",
    `A Meridian development conversation about ${who}, exported ${payload.generatedAt.toLocaleString()} (${payload.turns.length} messages).`,
    "",
    `The conversation has been downloaded as ${developmentChatFileStem(payload)}.docx — please attach it to this email before sending.`,
  ].join("\n")
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/**
 * Download the Word copy, then open the manager's mail client with a summary
 * that asks them to attach it. There is no server send.
 */
export async function emailDevelopmentChat(payload: DevelopmentChatExportPayload): Promise<void> {
  await exportDevelopmentChatWord(payload)
  window.location.href = buildDevelopmentChatMailto(payload)
}
