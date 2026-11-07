import { useCallback } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { getMinorConsentStatus, recordRosterAges } from "@/services/minorConsent.service"
import type { BulkUserRecord } from "@/types/bulk-import"
import type { RosterAgeRow } from "@/types/minorConsent"

const KEY = "minor-consent"

/** N-2: the caller's minor-gate status. Absent while loading or on error, and
 *  every consumer treats absent as "not gated" — the server enforces. */
export function useMinorConsentStatus(enabled = true) {
  return useQuery({
    queryKey: [KEY, "status"],
    queryFn: getMinorConsentStatus,
    staleTime: 60_000,
    retry: false,
    enabled,
  })
}

export function useRecordRosterAges() {
  return useMutation({
    mutationFn: (rows: RosterAgeRow[]) => recordRosterAges(rows),
  })
}

/** The roster rows to record from validated import records: only those that
 *  carry a normalised date of birth. */
export function rosterAgeRows(records: BulkUserRecord[]): RosterAgeRow[] {
  return records
    .filter((r) => typeof r.date_of_birth === "string" && r.date_of_birth !== "")
    .map((r) => ({
      email: r.email1,
      dateOfBirth: r.date_of_birth as string,
      ...(r.organization_id ? { organizationId: r.organization_id } : {}),
    }))
}

/**
 * N-2: roster age capture for a bulk-import page. `ageCaptureAllowed` is the
 * server's answer (false while loading, on error, or with the switch off — the
 * Date of birth column is then reported as ignored, as it was before).
 * `recordFrom` is a no-op unless capture is allowed and some row has a date.
 */
export function useRosterAgeCapture() {
  const { data } = useMinorConsentStatus()
  const ageCaptureAllowed = data?.rosterAgeCapture === true
  const mutation = useRecordRosterAges()
  const { mutate } = mutation
  const recordFrom = useCallback(
    (records: BulkUserRecord[]) => {
      if (!ageCaptureAllowed) return
      const rows = rosterAgeRows(records)
      if (rows.length > 0) mutate(rows)
    },
    [ageCaptureAllowed, mutate],
  )
  return { ageCaptureAllowed, recordFrom, mutation }
}
