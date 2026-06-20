// Entry point for the dual-PDF transcript export.
//
// Given the chat messages currently in state plus session metadata,
// produces two PDFs that share the §7 locked brand CSS:
//   1. <slug>_log.pdf    — chronological Conversation Log (V1)
//   2. <slug>_report.pdf — Meridian-unified Structured Report (V2)
//
// The caller is responsible for triggering download — `downloadBlob`
// is exported for convenience.

import type { ChatMessage } from "@/types/chat";
import { buildLogHtml } from "./buildLogHtml";
import { buildReportHtml } from "./buildReportHtml";
import { parseMessages } from "./parseMessages";
import { renderHtmlToPdf } from "./renderPdf";
import type { RenderedPdf, TranscriptMeta } from "./types";

export type ExportTranscriptInput = {
  messages: ChatMessage[];
  meta: TranscriptMeta;
};

export async function exportTranscriptPdfs(
  input: ExportTranscriptInput,
): Promise<RenderedPdf[]> {
  const { messages, meta } = input;
  const turns = parseMessages(messages, meta.userLabel);
  if (turns.length === 0) {
    throw new Error("No messages to export in the selected range.");
  }

  const logHtml = buildLogHtml(turns, meta);
  const reportHtml = buildReportHtml(turns, meta);

  const [logBlob, reportBlob] = await Promise.all([
    renderHtmlToPdf(logHtml),
    renderHtmlToPdf(reportHtml),
  ]);

  return [
    { fileName: `${meta.slug}_log.pdf`, blob: logBlob },
    { fileName: `${meta.slug}_report.pdf`, blob: reportBlob },
  ];
}

export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type { TranscriptMeta, RenderedPdf } from "./types";
