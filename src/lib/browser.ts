/**
 * Thin browser-side helpers that wrap globals like `window.location`.
 *
 * Exists primarily so tests can mock these without fighting jsdom's
 * read-only location object.
 */
export function reloadPage(): void {
  if (typeof window !== "undefined") {
    window.location.reload()
  }
}
