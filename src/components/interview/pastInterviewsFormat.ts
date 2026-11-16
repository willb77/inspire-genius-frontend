/**
 * Display helpers for the Past interviews panel — package IS-C Lane B.
 *
 * Their own module because a component file that also exports functions breaks
 * fast refresh (`react-refresh/only-export-components`), and because these two
 * are the panel's only pure logic and are worth testing on their own.
 */
import type { LiveSessionSummary } from "@/services/interview/live.service"
import { englishT, type TFn } from "@/components/interview/tFallback"

/**
 * Who the interview was with.
 *
 * `candidate_ref` holds `{display_name, external_id?, candidate_hash}`. The
 * hash is the stable blind key; the display name is the unblinding, and it is
 * stored on the same row rather than behind a separate map, so "unlocked" today
 * means simply that a name was recorded. Sessions created without one show the
 * hash rather than an em-dash — an anonymous row is still a real interview, and
 * a blank reads as a broken record.
 */
export function candidateLabel(s: LiveSessionSummary, t: TFn = englishT): string {
  const name = s.candidate_ref?.display_name?.trim()
  if (name) return name
  const hash = s.candidate_ref?.candidate_hash
  if (hash) return t("past.candidateHash", { defaultValue: "Candidate {{hash}}", hash: hash.slice(0, 8) })
  return t("past.candidateNotRecorded", "Candidate not recorded")
}

/** A date the interviewer can read, or nothing at all if the row has none. */
export function formatWhen(iso?: string | null, t: TFn = englishT): string {
  if (!iso) return t("past.dateNotRecorded", "date not recorded")
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return t("past.dateNotRecorded", "date not recorded")
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
