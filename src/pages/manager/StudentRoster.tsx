import { useMemo, useState } from "react"
import { AlertTriangle, Info, Lock, ShieldQuestion } from "lucide-react"

import ManagerLayout from "@/layouts/ManagerLayout"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useStudentRoster } from "@/hooks/manager/useStudentRoster"
import { isShared } from "@/types/manager/studentRoster"
import type {
  RosterEngagement,
  RosterPrism,
  StudentRosterRow,
} from "@/types/manager/studentRoster"

/**
 * Student Oversight — the manager's roster, gated by student consent.
 *
 * ## The rule this page exists to keep
 *
 * Three states look identical if you let them, and they mean opposite things:
 *
 *   "Not shared"   — the student did not grant this. We may hold it.
 *   "Not recorded" — nobody holds it. It was never measured.
 *   an error       — we could not find out.
 *
 * Rendering all three as "—" or, worse, as `0`, tells a manager a student is
 * disengaged when the student merely exercised a right. Every cell below picks
 * one of the three deliberately.
 *
 * ## Why the order is what it is
 *
 * Rows are sorted by attention score, computed by the backend from ONLY the
 * fields that survived the consent gate. Sorting on ungranted data would leak
 * it — a manager would read dormancy off the order without ever seeing the
 * column. The `reasons` are shown on the row so the ranking can be questioned.
 */

const CATEGORY_LABELS: Record<string, string> = {
  prism: "PRISM",
  engagement: "Engagement",
  topics: "Topics",
  artefacts: "Documents",
  goals: "Goals",
  assessments: "Assessments",
}

const CONSENT_COPY: Record<string, { label: string; tone: string; hint: string }> = {
  none: {
    label: "Not requested",
    tone: "bg-slate-100 text-slate-700",
    hint: "You have not asked this student for access yet.",
  },
  pending: {
    label: "Awaiting reply",
    tone: "bg-amber-100 text-amber-800",
    hint: "The student has been asked and has not answered. Asking again is not available.",
  },
  granted: {
    label: "Shared",
    tone: "bg-emerald-100 text-emerald-800",
    hint: "The student has granted the categories listed.",
  },
  declined: {
    label: "Declined",
    tone: "bg-slate-100 text-slate-600",
    hint: "The student declined. This carries no consequence for them and no action for you.",
  },
  revoked: {
    label: "Withdrawn",
    tone: "bg-slate-100 text-slate-600",
    hint: "The student withdrew access they had previously granted.",
  },
  expired: {
    label: "Term ended",
    tone: "bg-slate-100 text-slate-600",
    hint: "The grant ran to the end of its term. Access ends automatically.",
  },
}

function NotShared({ what }: { what: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-slate-400"
      title={`${what} is not shared. The student has not granted this category — this is not a statement about their activity.`}
    >
      <Lock className="h-3 w-3" aria-hidden />
      Not shared
    </span>
  )
}

/** A measurement nobody has. Distinct from "not shared" on purpose. */
function NotRecorded({ why }: { why: string }) {
  return (
    <span className="text-slate-400" title={why}>
      Not recorded
    </span>
  )
}

function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / 86_400_000)
}

function PrismCell({ prism }: { prism: StudentRosterRow["prism"] }) {
  if (!isShared<RosterPrism>(prism)) return <NotShared what="PRISM status" />

  const when = formatDate(prism.at)
  const label =
    prism.state === "completed"
      ? when
        ? `Completed ${when}`
        : "Completed"
      : prism.state === "in_progress"
        ? when
          ? `Sent ${when}`
          : "Sent"
        : "Not started"

  return (
    <div className="flex flex-col gap-0.5">
      <span className={prism.state === "completed" ? "text-slate-900" : "text-slate-600"}>
        {label}
      </span>
      {prism.disagreement && (
        <span
          className="inline-flex items-start gap-1 text-xs text-amber-700"
          title={prism.disagreement}
        >
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          Sources disagree
        </span>
      )}
    </div>
  )
}

function EngagementCell({ engagement }: { engagement: StudentRosterRow["engagement"] }) {
  if (!isShared<RosterEngagement>(engagement)) return <NotShared what="Engagement" />

  const since = daysSince(engagement.lastLoginAt ?? engagement.lastSeenAt)
  const visits = engagement.visitDays4w

  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <span>
        {since === null ? (
          <NotRecorded why="We have no sign-in event for this student. That is not the same as never signing in." />
        ) : since === 0 ? (
          "Seen today"
        ) : (
          `${since} day${since === 1 ? "" : "s"} ago`
        )}
      </span>
      <span className="text-xs text-slate-500">
        {visits === null ? (
          <NotRecorded why="No activity has been recorded for this student, so visits cannot be counted. This is not a count of zero." />
        ) : (
          `${visits} day${visits === 1 ? "" : "s"} active in ${engagement.cadenceWindowDays / 7} weeks`
        )}
      </span>
    </div>
  )
}

function ConsentCell({ row }: { row: StudentRosterRow }) {
  const copy = CONSENT_COPY[row.consent.state] ?? CONSENT_COPY.none
  const cats = row.consent.grantedCategories
  return (
    <div className="flex flex-col items-start gap-1">
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${copy.tone}`}
        title={copy.hint}
      >
        {copy.label}
      </span>
      {cats.length > 0 && (
        <span className="text-xs text-slate-500">
          {cats.map((c) => CATEGORY_LABELS[c] ?? c).join(", ")}
        </span>
      )}
      {row.consent.state === "granted" && row.consent.expiresAt && (
        <span className="text-xs text-slate-400">
          Ends {formatDate(row.consent.expiresAt)}
        </span>
      )}
    </div>
  )
}

export default function StudentRoster() {
  const { data, isLoading, isError, error, refetch } = useStudentRoster()
  const [showReasons, setShowReasons] = useState(false)

  const rows = useMemo(() => data?.students ?? [], [data])

  return (
    <ManagerLayout>
      <div className="space-y-6 p-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">Student oversight</h1>
          <p className="max-w-3xl text-sm text-slate-600">
            Your direct reports. What you can see about each of them is decided by
            them — a student who has not shared a category is shown as{" "}
            <span className="font-medium">Not shared</span>, which says nothing
            about how engaged they are.
          </p>
        </header>

        {/* Loading, error and empty are three separate states with three
            separate renderings. Collapsing any pair of them is how a broken
            fetch comes to look like a manager with no students. */}
        {isLoading && (
          <div className="space-y-2" role="status" aria-label="Loading roster">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-red-600" aria-hidden />
              <div className="space-y-2">
                <p className="text-sm font-medium text-red-900">
                  The roster could not be loaded.
                </p>
                <p className="text-sm text-red-800">
                  {(error as Error)?.message ??
                    "The roster service did not respond."}{" "}
                  This is an error, not an empty roster — no conclusion should be
                  drawn about your students from this screen.
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Try again
                </Button>
              </div>
            </div>
          </div>
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-6">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 text-slate-500" aria-hidden />
              <div className="space-y-1">
                {data?.rosterEmptyReason === "no_profile" ? (
                  <>
                    <p className="text-sm font-medium text-slate-900">
                      We could not resolve your profile.
                    </p>
                    <p className="text-sm text-slate-600">
                      Your account has no profile record, so we cannot work out
                      who reports to you. This is a set-up problem on our side,
                      not an empty team — please contact support.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-900">
                      No students are assigned to you yet.
                    </p>
                    <p className="text-sm text-slate-600">
                      Your profile resolved correctly and the roster came back
                      empty, which means nobody has you set as their manager.
                      An administrator assigns direct reports.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                {data?.counts?.total ?? rows.length} student
                {(data?.counts?.total ?? rows.length) === 1 ? "" : "s"}
                {typeof data?.counts?.withAnyGrant === "number" && (
                  <> · {data.counts.withAnyGrant} sharing something with you</>
                )}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReasons((v) => !v)}
              >
                <ShieldQuestion className="mr-1 h-4 w-4" aria-hidden />
                {showReasons ? "Hide" : "Why this order?"}
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th scope="col" className="px-4 py-3">Student</th>
                    <th scope="col" className="px-4 py-3">Sharing</th>
                    <th scope="col" className="px-4 py-3">PRISM</th>
                    <th scope="col" className="px-4 py-3">Engagement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.studentUserId} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {row.name ?? "Name not on file"}
                        </div>
                        {row.email && (
                          <div className="text-xs text-slate-500">{row.email}</div>
                        )}
                        {showReasons && row.attention.reasons.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {row.attention.reasons.map((r) => (
                              <li key={r} className="text-xs text-slate-500">
                                • {r}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td className="px-4 py-3"><ConsentCell row={row} /></td>
                      <td className="px-4 py-3"><PrismCell prism={row.prism} /></td>
                      <td className="px-4 py-3">
                        <EngagementCell engagement={row.engagement} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </ManagerLayout>
  )
}
