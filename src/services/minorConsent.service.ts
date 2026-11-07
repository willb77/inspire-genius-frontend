import { agentApi } from "@/lib/agentApi"
import type { MinorConsentStatus, RosterAgeRow, RosterAgesResult } from "@/types/minorConsent"

const OFF: MinorConsentStatus = { enabled: false, rosterAgeCapture: false }

/**
 * N-2: the caller's own minor-gate status. For the page only — every gated
 * route refuses itself on the server. Anything but an explicit `true` reads as
 * off, so a missing route or an odd body changes nothing on the page.
 */
export async function getMinorConsentStatus(): Promise<MinorConsentStatus> {
  const { data } = await agentApi.get<{ status: boolean; data?: Partial<MinorConsentStatus> }>(
    "/v1/agents/minor-consent/status",
  )
  const body = data?.data
  if (!body) return OFF
  return {
    enabled: body.enabled === true,
    rosterAgeCapture: body.rosterAgeCapture === true,
    surfaces: body.enabled === true ? body.surfaces : undefined,
  }
}

/** The server's per-request row ceiling (`MAX_ROSTER_ROWS`). */
export const ROSTER_AGES_CHUNK = 500

/** Record the roster's dates of birth (source `roster`), in chunks the server
 *  accepts. The server answers per row by index and never echoes a row back;
 *  indexes here are re-based onto the whole list. */
export async function recordRosterAges(rows: RosterAgeRow[]): Promise<RosterAgesResult> {
  const merged: RosterAgesResult = {
    total: 0, recorded: 0, invalid_date: 0, not_permitted: 0, not_enabled: 0, results: [],
  }
  for (let start = 0; start < rows.length; start += ROSTER_AGES_CHUNK) {
    const chunk = rows.slice(start, start + ROSTER_AGES_CHUNK)
    const { data } = await agentApi.post<{ status: boolean; data: RosterAgesResult }>(
      "/v1/agents/minor-consent/roster-ages",
      { rows: chunk },
    )
    const part = data.data
    merged.total += part.total
    merged.recorded += part.recorded
    merged.invalid_date += part.invalid_date
    merged.not_permitted += part.not_permitted
    merged.not_enabled += part.not_enabled
    merged.results.push(...part.results.map((r) => ({ ...r, index: r.index + start })))
  }
  return merged
}
