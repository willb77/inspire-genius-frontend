/**
 * Virus-scan outcomes of a document upload (DOC-AV-1), kept apart from the
 * document service so a test that mocks the service still gets the real
 * error classes.
 */
type ScanStatusFields = { status: string; status_detail: string | null };

// When a tier scans uploads asynchronously, /process answers at once with
// status "scanning" and this exact detail, and the server finishes the file
// once the scan result arrives. Nothing sends this marker unless the tier's
// scanner is switched on, so on every other tier triggerProcessing behaves
// exactly as before: one request, its response returned as-is.
export const SCAN_AWAITING_DETAIL = "Awaiting virus scan";
// The prefix the server puts on a document the scan refused (document-service
// SCAN_REJECTED_PREFIX). Such a document is never handed out.
export const SCAN_REJECTED_PREFIX = "Virus scan failed";

/** The scan refused the file (a threat, or a file it couldn't check). */
export class DocumentRejectedError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(`This file wasn't accepted: ${reason}`);
    this.reason = reason;
    this.name = "DocumentRejectedError";
  }
}

/** The scan hadn't answered within the wait. The file is not usable yet. */
export class DocumentStillCheckingError extends Error {
  constructor() {
    super("We're still checking this file for viruses. Try again in a minute.");
    this.name = "DocumentStillCheckingError";
  }
}

export function isAwaitingScan(doc: ScanStatusFields): boolean {
  return doc.status === "scanning" && doc.status_detail === SCAN_AWAITING_DETAIL;
}

/** The reason a document was refused by the scan, or null if it wasn't. */
export function scanRejection(doc: ScanStatusFields): string | null {
  const detail = doc.status_detail ?? "";
  if (doc.status !== "failed" || !detail.startsWith(SCAN_REJECTED_PREFIX)) return null;
  const reason = detail.slice(SCAN_REJECTED_PREFIX.length).replace(/^[:\s]+/, "").trim();
  return reason || "it didn't pass the virus check";
}
