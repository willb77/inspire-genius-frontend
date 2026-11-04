// RWO-8 — "Upload the job description", read in the browser (Bill, Lane 814,
// 2026-11-04: "Read it in the browser", replacing CSA Q6's upload path).
//
// The file never leaves the person's device: its text goes into "Describe the
// role", exactly as if they had pasted it, and the file itself is not uploaded,
// stored or indexed into anyone's chat search. So there is nothing kept to scan,
// and the page makes no virus claim (CSA Q7).
//
// Programs are refused before anything reads the file: only PDF, Word (.docx) and
// text (.txt) by name, and the first bytes must match — a PDF starts "%PDF", a
// .docx is a zip ("PK"), and a text file has no NUL bytes. A renamed program fails
// one of those. The parsers are the ones the app already uses (`extractRoleText`).

import { extractRoleText, RoleExtractionError } from "@/lib/extractRoleText"

export const JOB_FILE_ACCEPT =
  ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
export const JOB_FILE_MAX_BYTES = 10 * 1024 * 1024

export class JobFileRefused extends Error {}

type Kind = "pdf" | "docx" | "txt"

function kindOf(name: string): Kind | null {
  const lower = name.toLowerCase()
  if (lower.endsWith(".pdf")) return "pdf"
  if (lower.endsWith(".docx")) return "docx"
  if (lower.endsWith(".txt")) return "txt"
  return null
}

function readBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(blob)
  })
}

async function head(file: File, n: number): Promise<Uint8Array> {
  return new Uint8Array(await readBuffer(file.slice(0, n)))
}

/** True when the first bytes are what the file's name says it is. */
export async function contentMatches(file: File, kind: Kind): Promise<boolean> {
  const b = await head(file, 8192)
  if (kind === "pdf") return b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46
  if (kind === "docx") return b.length >= 2 && b[0] === 0x50 && b[1] === 0x4b
  return !b.includes(0)
}

/** The job description's text, or a `JobFileRefused` saying why not. */
export async function readJobFile(file: File): Promise<string> {
  const kind = kindOf(file.name)
  if (!kind) throw new JobFileRefused("Only PDF, Word (.docx) or text (.txt) files can be read. Programs and other files are refused.")
  if (file.size > JOB_FILE_MAX_BYTES) throw new JobFileRefused("That file is over 10 MB. Paste the text instead.")
  if (!(await contentMatches(file, kind))) {
    throw new JobFileRefused("That file isn't what its name says, so it wasn't opened.")
  }
  try {
    return (await extractRoleText(file)).text
  } catch (err) {
    if (err instanceof RoleExtractionError) throw new JobFileRefused(err.message)
    throw new JobFileRefused("Couldn't read that file. Paste the text instead.")
  }
}
