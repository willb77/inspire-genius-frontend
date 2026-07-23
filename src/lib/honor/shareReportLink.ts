/**
 * Honor report link-sharing helpers (Feature 3 — export polish).
 *
 * "Email a link" opens the coach's OWN mail client (mailto:) pre-filled with a
 * short-lived presigned download URL — the coach sends it themselves. This is
 * deliberately NOT a server-side SES send: it needs no `honor_report_email` flag,
 * no confirmation, and never routes a Fellow's document through our mail path.
 * "Copy link" puts the same URL on the clipboard.
 */

/** Copy a URL to the clipboard. Returns false when the clipboard API is blocked. */
export async function copyReportLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url)
    return true
  } catch {
    return false
  }
}

export type EmailLinkOpts = {
  to?: string
  subject: string
  intro: string
  url: string
}

/**
 * Build the `mailto:` href for a report download link (pure — no side effects,
 * so it's unit-testable without touching window.location).
 */
export function buildMailtoLink(opts: EmailLinkOpts): string {
  const body = `${opts.intro}\n\n${opts.url}\n\nThis is a secure, time-limited download link.`
  return (
    `mailto:${encodeURIComponent(opts.to || "")}` +
    `?subject=${encodeURIComponent(opts.subject)}` +
    `&body=${encodeURIComponent(body)}`
  )
}

/**
 * Open the coach's mail client with the download link in the body. `to` is
 * optional (defaults to an empty recipient the coach fills in). The link is
 * described as time-limited so the recipient knows it expires.
 */
export function emailReportLink(opts: EmailLinkOpts): void {
  window.location.href = buildMailtoLink(opts)
}
