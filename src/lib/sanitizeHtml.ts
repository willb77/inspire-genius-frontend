/**
 * HTML sanitization for broadcast alert bodies.
 *
 * Super-admins author arbitrary HTML in the rich-text editor; it is rendered
 * back to other users, so it MUST be sanitized to strip scripts, event
 * handlers, and other injection vectors. DOMPurify with an allowlist of
 * formatting tags/attributes is applied both on compose (before send) and on
 * render (defense in depth).
 */
import DOMPurify from "dompurify"

const ALLOWED_TAGS = [
  "p", "br", "b", "strong", "i", "em", "u", "s", "strike",
  "h1", "h2", "h3", "h4", "ul", "ol", "li", "blockquote",
  "a", "span", "div", "hr", "code", "pre", "table", "thead",
  "tbody", "tr", "td", "th", "img",
]

const ALLOWED_ATTR = ["href", "target", "rel", "style", "src", "alt", "title", "colspan", "rowspan"]

/** Sanitize a fragment of body HTML (no <html>/<head> wrapper). */
export function sanitizeBodyHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Never allow scripts/objects; force safe link handling.
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
    ALLOW_DATA_ATTR: false,
  })
}
