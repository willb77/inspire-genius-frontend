/** Comma- or line-separated interests → a list. The server trims and caps them too. */
export function splitInterests(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}
