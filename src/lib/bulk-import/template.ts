/**
 * The canonical import template.
 *
 * The uploader used to describe the required columns in prose ("First Name,
 * Last Name, Email") while the parser accepted a different, wider set of
 * aliases. Prose cannot be uploaded, so operators built their own headers —
 * "ECPS Gmail" and the like — and got a validation error naming `email1`, a
 * field they had never heard of. Handing them a file removes the guesswork.
 */

/** Headers in the order they appear in the downloaded file.
 *
 *  `Manager` carries an EMAIL, not a name — it is resolved against existing
 *  accounts to build the reporting line (`employee_profiles.manager_id`), and
 *  a name cannot be resolved unambiguously. It is optional, but an import
 *  without it produces users who belong to no manager, which is why the
 *  template ships with the column filled in rather than merely permitted. */
export const TEMPLATE_HEADERS = [
  "First Name",
  "Last Name",
  "Email",
  "Email 2",
  "Role",
  "Manager",
  "Department",
  "Position",
] as const

/** Illustrative rows. Kept obviously fake so nobody imports them by accident,
 *  and they double as documentation of the accepted Role values.
 *
 *  Row 2 is the manager row 1 reports to, and it is listed FIRST in reality:
 *  a manager must already exist as an account before anyone can be attached to
 *  them. Importing reports and their manager in one file works — the manager
 *  is created in the same batch — but only if the manager's own row precedes
 *  the rows pointing at it. */
export const TEMPLATE_ROWS: string[][] = [
  ["Sam", "Rivera", "sam.rivera@example.com", "sam.personal@example.com", "manager", "", "Operations", "Team Lead"],
  ["Jane", "Doe", "jane.doe@example.com", "", "user", "sam.rivera@example.com", "Operations", "Analyst"],
]

export const TEMPLATE_FILENAME = "inspire-genius-bulk-import-template.csv"

function escapeCell(value: string): string {
  // Quote only when required, so the file stays readable opened as plain text.
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Build the template as CSV text. */
export function buildTemplateCsv(): string {
  const lines = [TEMPLATE_HEADERS.map(escapeCell).join(",")]
  for (const row of TEMPLATE_ROWS) {
    lines.push(row.map(escapeCell).join(","))
  }
  // Trailing newline: some spreadsheet tools drop the last row without one.
  return lines.join("\r\n") + "\r\n"
}

/**
 * Trigger a browser download of the template.
 *
 * A BOM is prepended because Excel on Windows otherwise reads a UTF-8 CSV as
 * the local ANSI codepage and mangles accented names on open. The parser
 * tolerates it — `trimCell` strips U+FEFF from the first header.
 */
export function downloadTemplateCsv(): void {
  const blob = new Blob(["\uFEFF" + buildTemplateCsv()], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = TEMPLATE_FILENAME
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  // Revoke on the next tick — revoking synchronously can cancel the download
  // in Safari before it starts.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
