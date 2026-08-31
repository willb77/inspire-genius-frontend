/**
 * Client-side text extraction for an uploaded role document (job description,
 * role charter, etc.). Feeds the extracted text into the KCE blueprint generator
 * as `context`. Runs entirely in the browser — no upload round-trip — so the
 * user gets an immediate result.
 *
 * - `.txt` / `.md` / plain text → read directly
 * - `.docx` / `.doc` → `mammoth` (raw text)
 * - `.pdf` → `pdfjs-dist` (concatenated text of every page)
 *
 * The heavy parsers are lazy-imported so they only load when a matching file is
 * actually chosen (keeps the initial bundle small; keeps them out of unit tests).
 */

/** `accept` attribute for the file input. */
export const ACCEPTED_ROLE_FILE_TYPES =
  ".txt,.text,.md,.markdown,.pdf,.doc,.docx"

/** Extracted context is capped so a huge JD doesn't blow the LLM context budget. */
export const MAX_EXTRACTED_CHARS = 8000

export type ExtractedRole = {
  /** The document's text (trimmed + capped to {@link MAX_EXTRACTED_CHARS}). */
  text: string
  /** A role title guessed from the filename (user can override). */
  suggestedTitle: string
}

export class RoleExtractionError extends Error {}

function titleFromFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function cap(text: string): string {
  const t = text.trim()
  return t.length > MAX_EXTRACTED_CHARS ? t.slice(0, MAX_EXTRACTED_CHARS) : t
}

async function extractDocx(file: File): Promise<string> {
  const mammoth = await import("mammoth")
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value ?? ""
}

async function extractPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist")
  // Vite bundles the worker and hands us its URL; set it once.
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const arrayBuffer = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const pages: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const line = content.items
      .map((item) => (typeof (item as { str?: unknown }).str === "string" ? (item as { str: string }).str : ""))
      .join(" ")
    pages.push(line)
  }
  return pages.join("\n")
}

/** Extract text + a suggested title from a role document. Throws {@link RoleExtractionError}. */
export async function extractRoleText(file: File): Promise<ExtractedRole> {
  const suggestedTitle = titleFromFilename(file.name)
  const lower = file.name.toLowerCase()
  try {
    let text: string
    if (lower.endsWith(".pdf")) {
      text = await extractPdf(file)
    } else if (lower.endsWith(".docx") || lower.endsWith(".doc")) {
      text = await extractDocx(file)
    } else {
      // txt / md / anything else we treat as plain text
      text = await file.text()
    }
    const capped = cap(text)
    if (!capped) {
      throw new RoleExtractionError("No readable text found in that file.")
    }
    return { text: capped, suggestedTitle }
  } catch (err) {
    if (err instanceof RoleExtractionError) throw err
    throw new RoleExtractionError(
      "Couldn't read that file. Try a .txt, .pdf, or Word (.docx) document.",
    )
  }
}
