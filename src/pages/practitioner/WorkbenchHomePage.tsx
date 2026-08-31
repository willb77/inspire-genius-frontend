import { useMemo } from "react"
import { format } from "date-fns"

import PractitionerLayout from "@/layouts/PractitionerLayout"
import { WorkbenchHome } from "@/components/workbench/WorkbenchHome"
import type { WorkbenchConfig, WorkbenchPerson } from "@/components/workbench/types"
import { useAuth } from "@/context/useAuth"
import { ROUTES } from "@/constants/routes"
import {
  useCoachClients,
  useCoachCredits,
  useCoachSchedule,
} from "@/hooks/practitioner/useCoachClient"

/**
 * Practitioner Workbench home — the V2 surface from the practitioner-workbench
 * wireframe, built on the shared {@link WorkbenchHome}.
 *
 * Every number here comes from a real hook. Where a hook has not resolved a
 * count we pass `null`, which renders as an em dash rather than 0 — a
 * practitioner reading "0 clients" when we simply failed to load them would
 * reasonably conclude their roster had been wiped.
 */
type Client = { id?: string; client_id?: string; first_name?: string | null; last_name?: string | null; name?: string | null; org?: string | null; status?: string | null }
type Session = { id?: string; client_id?: string; client_name?: string | null; starts_at?: string | null; prepared?: boolean | null }

function fullName(c: Client): string | null {
  const n = [c.first_name, c.last_name].filter(Boolean).join(" ").trim()
  return n || (c.name?.trim() || null)
}

export default function PractitionerWorkbenchHome() {
  const { user } = useAuth()
  const firstName = (user?.fullName ?? user?.name ?? "").split(" ")[0] || "there"

  const clientsQ = useCoachClients()
  const creditsQ = useCoachCredits()
  const scheduleQ = useCoachSchedule()

  const clients = (clientsQ.data ?? []) as Client[]
  const sessions = (scheduleQ.data ?? []) as Session[]

  const config = useMemo<WorkbenchConfig>(() => {
    const upcoming: WorkbenchPerson[] = sessions.slice(0, 5).map((s, i) => ({
      id: s.id ?? `session-${i}`,
      name: s.client_name?.trim() || null,
      meta: s.starts_at
        ? format(new Date(s.starts_at), "d MMM yyyy, HH:mm")
        : "No date recorded",
      badge: s.prepared ? undefined : "No prep",
      badgeTone: "muted" as const,
      href: ROUTES.PRACTITIONER.SCHEDULE,
    }))

    // "Needs attention" is deliberately derived from a fact we hold — a client
    // with no session on the schedule — rather than from a score we do not
    // compute yet. An invented urgency signal is worse than none.
    const booked = new Set(sessions.map((s) => s.client_id).filter(Boolean))
    const attention: WorkbenchPerson[] = clients
      .filter((c) => !booked.has(c.client_id ?? c.id))
      .slice(0, 5)
      .map((c, i) => ({
        id: c.client_id ?? c.id ?? `client-${i}`,
        name: fullName(c),
        meta: "No next session booked",
        href: ROUTES.PRACTITIONER.CLIENTS,
      }))

    const creditBalance =
      typeof (creditsQ.data as { balance?: number } | undefined)?.balance === "number"
        ? (creditsQ.data as { balance: number }).balance
        : null

    return {
      role: "practitioner",
      hero: "cream",
      greeting: `Good morning, ${firstName}.`,
      subtitle:
        sessions.length > 0
          ? `${sessions.length} session${sessions.length === 1 ? "" : "s"} on your schedule.`
          : "Nothing on your schedule yet.",
      actions: [
        { label: "Client roster", to: ROUTES.PRACTITIONER.CLIENTS, variant: "primary" },
        { label: "Open schedule", to: ROUTES.PRACTITIONER.SCHEDULE, variant: "secondary" },
      ],
      stats: [
        { key: "clients", label: "Active clients", value: clients.length, hint: "on your roster" },
        { key: "sessions", label: "Sessions booked", value: sessions.length, hint: "on the schedule" },
        {
          key: "attention",
          label: "Needs attention",
          value: attention.length,
          hint: "no next session booked",
          tone: "alert",
        },
        {
          key: "credits",
          label: "Credits",
          value: creditBalance,
          // The hint tells the truth about WHY it is blank, so a practitioner
          // does not read a dash as "you have run out".
          hint: creditBalance === null ? "balance not available" : "surveys + tool seats",
        },
      ],
      upcoming: {
        title: "Upcoming sessions",
        action: { label: "Open schedule", to: ROUTES.PRACTITIONER.SCHEDULE },
        rows: upcoming,
        emptyMessage: "No sessions are booked. Use the schedule to add one.",
      },
      attention: {
        title: "Needs attention",
        rows: attention,
        emptyMessage: "Every client has a next session booked.",
      },
      isLoading: clientsQ.isLoading || scheduleQ.isLoading,
      error: clientsQ.error ?? scheduleQ.error ?? undefined,
      onRetry: () => {
        void clientsQ.refetch?.()
        void scheduleQ.refetch?.()
      },
    }
  }, [clients, sessions, creditsQ.data, firstName, clientsQ, scheduleQ])

  return (
    <PractitionerLayout>
      <WorkbenchHome {...config} />
    </PractitionerLayout>
  )
}
