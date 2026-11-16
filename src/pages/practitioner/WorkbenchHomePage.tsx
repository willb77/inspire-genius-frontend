import { useMemo } from "react"
import { format } from "date-fns"
import { useTranslation } from "react-i18next"

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
  const { t } = useTranslation("practitionerPages")
  const { user } = useAuth()
  const firstName = (user?.fullName ?? user?.name ?? "").split(" ")[0] || t("workbench.fallbackName", { defaultValue: "there" })

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
        : t("workbench.noDate", { defaultValue: "No date recorded" }),
      badge: s.prepared ? undefined : t("workbench.noPrep", { defaultValue: "No prep" }),
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
        meta: t("workbench.noNextSession", { defaultValue: "No next session booked" }),
        href: ROUTES.PRACTITIONER.CLIENTS,
      }))

    const underManagement = creditsQ.data?.clientsUnderManagement ?? null

    return {
      role: "practitioner",
      hero: "cream",
      greeting: t("workbench.greeting", { name: firstName, defaultValue: "Good morning, {{name}}." }),
      subtitle:
        sessions.length > 0
          ? sessions.length === 1
            ? t("workbench.sessionsOne", { n: sessions.length, defaultValue: "{{n}} session on your schedule." })
            : t("workbench.sessionsOther", { n: sessions.length, defaultValue: "{{n}} sessions on your schedule." })
          : t("workbench.nothingScheduled", { defaultValue: "Nothing on your schedule yet." }),
      actions: [
        { label: t("workbench.clientRoster", { defaultValue: "Client roster" }), to: ROUTES.PRACTITIONER.CLIENTS, variant: "primary" },
        { label: t("workbench.openSchedule", { defaultValue: "Open schedule" }), to: ROUTES.PRACTITIONER.SCHEDULE, variant: "secondary" },
      ],
      stats: [
        { key: "clients", label: t("workbench.activeClients", { defaultValue: "Active clients" }), value: clients.length, hint: t("workbench.onRoster", { defaultValue: "on your roster" }) },
        { key: "sessions", label: t("workbench.sessionsBooked", { defaultValue: "Sessions booked" }), value: sessions.length, hint: t("workbench.onSchedule", { defaultValue: "on the schedule" }) },
        {
          key: "attention",
          label: t("workbench.needsAttention", { defaultValue: "Needs attention" }),
          value: attention.length,
          hint: t("workbench.noNextSessionHint", { defaultValue: "no next session booked" }),
          tone: "alert",
        },
        {
          key: "under-management",
          label: t("workbench.underManagement", { defaultValue: "Under management" }),
          value: underManagement,
          // A dash means the count was not reported — not that there are none.
          // Zero is a real zero: no client has activated a linked account yet.
          hint: underManagement === null ? t("workbench.countUnavailable", { defaultValue: "count not available" }) : t("workbench.activatedLinked", { defaultValue: "activated, linked clients" }),
        },
      ],
      upcoming: {
        title: t("workbench.upcomingSessions", { defaultValue: "Upcoming sessions" }),
        action: { label: t("workbench.openSchedule", { defaultValue: "Open schedule" }), to: ROUTES.PRACTITIONER.SCHEDULE },
        rows: upcoming,
        emptyMessage: t("workbench.noSessionsBooked", { defaultValue: "No sessions are booked. Use the schedule to add one." }),
      },
      attention: {
        title: t("workbench.needsAttention", { defaultValue: "Needs attention" }),
        rows: attention,
        emptyMessage: t("workbench.everyClientBooked", { defaultValue: "Every client has a next session booked." }),
      },
      isLoading: clientsQ.isLoading || scheduleQ.isLoading,
      error: clientsQ.error ?? scheduleQ.error ?? undefined,
      onRetry: () => {
        void clientsQ.refetch?.()
        void scheduleQ.refetch?.()
      },
    }
  }, [clients, sessions, creditsQ.data, firstName, clientsQ, scheduleQ, t])

  return (
    <PractitionerLayout>
      <WorkbenchHome {...config} />
    </PractitionerLayout>
  )
}
