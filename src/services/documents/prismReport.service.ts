import { api } from "@/lib/axios";

/**
 * The PRISM report, rendered server-side as a viewable document.
 *
 * **Why this exists rather than `latest-prism` + `getDownloadUrl`.** That pair
 * is what "View PRISM Report" used to call, and it could not work. For anyone
 * whose PRISM arrived by import, the document it resolves to is a synthesised
 * row: filename `prism_report_<date>.csv`, content-type `text/csv`, at an S3
 * key under `prism-virtual/` that **no object is ever written to**. So the
 * viewer fell through to "this file type can't be previewed here", and its
 * "open in a new tab" escape hatch 404'd. Both confirmed against dev.
 *
 * Teaching the viewer to render CSV would not have fixed it: the CSV is an
 * import artefact — raw score columns — and someone clicking for their report
 * wants the report.
 *
 * The backend renders the Self-Portrait (the platform's existing PRISM-led
 * read) through the shared docgen engine and returns a presigned URL with
 * `inline` disposition, so it renders in an iframe instead of downloading.
 */

export interface PrismReport {
  /** Presigned, inline-dispositioned, short-lived. Mint per view. */
  downloadUrl: string;
  fileName: string;
  format: string;
  contentType: string;
  expiresIn: number;
  /**
   * False when the user has no PRISM on file. The document still renders — it
   * is built from the rest of their profile and says so — but the caller can
   * warn before opening it.
   */
  hasPrism: boolean;
}

/** The wire shape (snake_case), which is not what the app speaks. */
interface PrismReportWire {
  download_url?: string;
  file_name?: string;
  format?: string;
  content_type?: string;
  expires_in?: number;
  has_prism?: boolean;
}

/**
 * POST /v1/agents/documents/prism-report — build the report, return a URL.
 *
 * **The prefix is load-bearing.** This first shipped on `/v1/documents/...`,
 * reasoning that `latest-prism` lives there and returns 200. That inference was
 * wrong: API Gateway maps `/v1/documents/*` to the **document-service Lambda**,
 * so a new path added there is served by a process that does not implement it
 * and answers 405. `POST /v1/agents/{proxy+}` → the agent-engine ALB, which is
 * where this endpoint actually lives.
 *
 * Minted per view rather than cached: the URL expires, and handing someone a
 * dead link from a page that has been open a while is the failure mode this
 * whole change exists to remove.
 */
export async function generatePrismReport(
  format: string = "pdf"
): Promise<PrismReport> {
  const resp = await api.post("/v1/agents/documents/prism-report", { format });
  // Tolerate both the bare body and an `ok()`-style envelope — this route
  // returns the former today, but reading both means an envelope added later
  // degrades to working rather than to `undefined`.
  const body = ((resp.data as Record<string, unknown>)?.data ??
    resp.data) as PrismReportWire;

  const url = body?.download_url;
  if (typeof url !== "string" || !url) {
    throw new Error("The PRISM report did not come back with a link.");
  }

  return {
    downloadUrl: url,
    fileName: body.file_name ?? "prism-report.pdf",
    format: body.format ?? "pdf",
    contentType: body.content_type ?? "application/pdf",
    expiresIn: body.expires_in ?? 3600,
    hasPrism: body.has_prism === true,
  };
}
