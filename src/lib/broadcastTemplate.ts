/**
 * Branded, severity-tiered HTML wrapper for broadcast alerts.
 *
 * The super-admin authors the message body in the rich-text editor; this wraps
 * that (already-sanitized) body in a branded shell — a severity-colored header
 * bar with the Inspire Genius logo, the alert title, and a footer — using the
 * in-app brand tokens from `index.css`. The result is what recipients see in
 * the notification center / banner and what is stored as `html_body`.
 */
import type { Severity } from "@/types/broadcast"

export type SeverityMeta = {
  label: string
  /** Solid accent (header bar, badge). */
  color: string
  /** Tint for banner/toast backgrounds. */
  tint: string
  /** Readable text-on-tint. */
  text: string
  emoji: string
}

export const SEVERITY_META: Record<Severity, SeverityMeta> = {
  info: { label: "Information", color: "#3B5BFF", tint: "#EEF2FF", text: "#1E3A8A", emoji: "ℹ️" },
  success: { label: "Success", color: "#10B981", tint: "#ECFDF5", text: "#065F46", emoji: "✅" },
  warning: { label: "Warning", color: "#D97706", tint: "#FFFBEB", text: "#92400E", emoji: "⚠️" },
  critical: { label: "Critical", color: "#EF4444", tint: "#FEF2F2", text: "#991B1B", emoji: "🚨" },
}

/**
 * Wrap sanitized body HTML in the branded email/notification shell.
 * `logoUrl` is optional so previews work before deploy; defaults to the
 * app's dark logo served from /public.
 */
export function buildBrandedHtml(
  severity: Severity,
  title: string,
  bodyHtml: string,
  logoUrl = "/Logo-Dark.png",
): string {
  const meta = SEVERITY_META[severity]
  const safeTitle = escapeHtml(title)
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${safeTitle}</title></head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:'Manrope','Poppins',Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.08);">
        <tr><td style="background-color:${meta.color};padding:18px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;"><img src="${logoUrl}" alt="Inspire Genius" height="26" style="display:block;height:26px;filter:brightness(0) invert(1);" /></td>
            <td align="right" style="vertical-align:middle;"><span style="display:inline-block;background:rgba(255,255,255,0.22);color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;padding:5px 12px;border-radius:999px;">${meta.emoji}&nbsp;${meta.label}</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 28px 8px;">
          <h1 style="color:#111827;font-size:22px;line-height:1.3;margin:0 0 4px;">${safeTitle}</h1>
          <div style="height:3px;width:44px;background:${meta.color};border-radius:2px;margin:10px 0 18px;"></div>
        </td></tr>
        <tr><td style="padding:0 28px 28px;color:#374151;font-size:15px;line-height:1.65;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="background-color:#f8fafc;padding:18px 28px;border-top:1px solid #e5e7eb;">
          <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">Sent via the Inspire Genius platform alert system.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
