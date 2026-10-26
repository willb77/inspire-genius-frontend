/**
 * What the Powered by PRISM card's "Latest report:" shows (PRISM-RR P3, D4):
 * the uploaded report PDF's and PRISM CSV's own names when document-service
 * sends them (`pdf_file_name`, `csv_file_name`), otherwise the one `file_name`
 * it has always sent — so an older document-service renders exactly as before.
 *
 * Its own module, not beside `useLatestPrism`: several HomeV2 tests mock that
 * hook module wholesale, which would leave this helper undefined.
 */
export type LatestPrismNames = {
  file_name?: string | null
  pdf_file_name?: string | null
  csv_file_name?: string | null
}

export function latestPrismDisplayName(
  doc: LatestPrismNames | null | undefined,
): string | undefined {
  if (!doc) return undefined
  const names = [doc.pdf_file_name, doc.csv_file_name].filter(
    (n): n is string => typeof n === "string" && n.trim().length > 0,
  )
  return names.length ? names.join(" · ") : doc.file_name || undefined
}
