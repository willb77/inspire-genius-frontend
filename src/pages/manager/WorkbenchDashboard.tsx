import { useMemo } from "react"

import ManagerLayout from "@/layouts/ManagerLayout"
import { WorkbenchHome } from "@/components/workbench/WorkbenchHome"
import type { WorkbenchConfig, WorkbenchPerson } from "@/components/workbench/types"
import { useAuth } from "@/context/useAuth"
import { ROUTES } from "@/constants/routes"
import { useManagerTeam, useManagerInterviews } from "@/hooks/manager/useManagerTeam"
import type { ManagerTeamMember, ManagerTeamResponse } from "@/types/manager/team"

/**
 * Manager Workbench dashboard — the V2 surface from the manager-workbench
 * wireframe, built on the shared {@link WorkbenchHome}.
 *
 * ## "Needs attention" is deliberately NOT computed
 *
 * The wireframe shows a red "Needs attention" count. The obvious way to fill it
 * is from `last_active` — but `ManagerTeamMember.last_active` is documented in
 * its own type as null for everyone, because the backend has no measurement for
 * it against the live relation. Deriving "never seen" from an absent
 * measurement would flag every student on every roster as at-risk on day one,
 * which is worse than an empty tile: it is a confident, alarming, false claim
 * about real children, and a manager acting on it would be acting on nothing.
 *
 * So the tile renders `null` — an em dash with "not measured yet" — until
 * something actually measures engagement. PRISM outstanding, by contrast, IS
 * real: `prism_color` is null exactly when no PRISM result exists.
 */
export default function ManagerWorkbenchDashboard() {
  const { user } = useAuth()
  const firstName = (user?.fullName ?? user?.name ?? "").split(" ")[0] || "there"

  const teamQ = useManagerTeam()
  const interviewsQ = useManagerInterviews()

  const team = teamQ.data as ManagerTeamResponse | undefined
  const members = useMemo<ManagerTeamMember[]>(() => team?.members ?? [], [team])

  const config = useMemo<WorkbenchConfig>(() => {
    const interviews = ((interviewsQ.data as { interviews?: unknown[] } | undefined)?.interviews ?? []) as Array<{
      id?: string
      candidate_name?: string | null
      scheduled_at?: string | null
      position?: string | null
    }>

    const upcoming: WorkbenchPerson[] = interviews.slice(0, 5).map((iv, i) => ({
      id: iv.id ?? `interview-${i}`,
      name: iv.candidate_name?.trim() || null,
      meta: [iv.scheduled_at, iv.position].filter(Boolean).join(" · ") || "No date recorded",
      href: ROUTES.MANAGER.INTERVIEWS,
    }))

    const prismOutstanding = members.filter((m) => m.prism_color === null)
    const attention: WorkbenchPerson[] = prismOutstanding.slice(0, 5).map((m) => ({
      id: m.id,
      name: m.name?.trim() || null,
      meta: "No PRISM result on file",
      badge: "PRISM outstanding",
      badgeTone: "muted" as const,
      href: ROUTES.MANAGER.TEAM,
    }))

    // Distinguish "this manager owns nobody" from "the load failed" — the
    // backend tells us which, and collapsing them is how a broken query comes
    // to look like an empty team.
    const emptyMessage =
      team?.empty_reason === "no_assignments"
        ? "Nobody is assigned to you yet. An administrator assigns direct reports."
        : "No one on your roster is missing a PRISM result."

    return {
      role: "manager",
      hero: "gradient",
      greeting: `Good morning, ${firstName}`,
      subtitle: `${members.length} on your roster · ${prismOutstanding.length} without a PRISM result.`,
      actions: [
        { label: "View roster", to: ROUTES.MANAGER.TEAM, variant: "primary" },
        { label: "Team import", to: ROUTES.MANAGER.BULK_IMPORT, variant: "secondary" },
      ],
      stats: [
        { key: "roster", label: "On your roster", value: members.length, hint: "direct reports" },
        {
          key: "checkins",
          label: "Check-ins booked",
          value: interviews.length,
          hint: "on the schedule",
        },
        {
          key: "attention",
          label: "Needs attention",
          // See the module note. Not measured — never rendered as 0.
          value: null,
          hint: "not measured yet",
          tone: "alert",
        },
        {
          key: "prism",
          label: "PRISM outstanding",
          value: prismOutstanding.length,
          hint: "not yet scored",
        },
      ],
      upcoming: {
        title: "Upcoming check-ins",
        action: { label: "Open roster", to: ROUTES.MANAGER.TEAM },
        rows: upcoming,
        emptyMessage: "Nothing is scheduled.",
      },
      attention: {
        title: "PRISM outstanding",
        rows: attention,
        emptyMessage,
      },
      isLoading: teamQ.isLoading || interviewsQ.isLoading,
      error: teamQ.error ?? interviewsQ.error ?? undefined,
      onRetry: () => {
        void teamQ.refetch?.()
        void interviewsQ.refetch?.()
      },
    }
  }, [members, team, interviewsQ, teamQ, firstName])

  return (
    <ManagerLayout>
      <WorkbenchHome {...config} />
    </ManagerLayout>
  )
}
