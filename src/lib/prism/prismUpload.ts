/**
 * Rules for the PRISM Replace report upload (PRISM-RR P3), kept out of the
 * component files so they can be shared and tested on their own.
 */

export type PrismFileKind = "pdf" | "csv"

/** Which slot a file belongs in, by extension or MIME type — or `null`. */
export function prismFileKind(file: File): PrismFileKind | null {
  const name = file.name.toLowerCase()
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf"
  if (name.endsWith(".csv") || file.type === "text/csv") return "csv"
  return null
}

const MB = 1024 * 1024

// The server's caps while `prism_pdf_replace` is on (PRISM-RR P2). Checked in
// the dialog first so a too-big file is refused before a multi-MB upload, not
// after it. A PDF sent on its own is converted by a Lambda whose synchronous
// payload limit makes 4 MB the most it can take (amendment P2-F1).
export const PDF_CONVERT_MAX_BYTES = 4 * MB
export const PDF_WITH_CSV_MAX_BYTES = 10 * MB
export const CSV_MAX_BYTES = 2 * MB

/** A message when a file is over the server's cap, else `null`. Switch-on only. */
export function oversizeMessage(csv: File | null, pdf: File | null): string | null {
  if (csv && csv.size > CSV_MAX_BYTES) return "The CSV is larger than 2 MB."
  if (pdf && !csv && pdf.size > PDF_CONVERT_MAX_BYTES) {
    return "PDF reports up to 4 MB can be read. Upload the PRISM scores CSV instead, or a smaller PDF."
  }
  if (pdf && csv && pdf.size > PDF_WITH_CSV_MAX_BYTES) return "The PDF is larger than 10 MB."
  return null
}
