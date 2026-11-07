/**
 * Copy `text` to the clipboard. Tries the async Clipboard API first and falls
 * back to a hidden textarea + `execCommand("copy")` (older browsers, and
 * non-secure contexts where `navigator.clipboard` is undefined).
 *
 * Resolves `true` only when one of the two paths reports success, so the
 * caller never tells the user "copied" when nothing was.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path
  }
  if (typeof document === "undefined") return false
  const area = document.createElement("textarea")
  area.value = text
  area.setAttribute("readonly", "")
  area.style.position = "fixed"
  area.style.opacity = "0"
  document.body.appendChild(area)
  try {
    area.select()
    return typeof document.execCommand === "function" && document.execCommand("copy")
  } catch {
    return false
  } finally {
    document.body.removeChild(area)
  }
}
