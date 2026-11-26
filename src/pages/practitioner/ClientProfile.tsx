import { useNavigate, useParams } from "react-router-dom"
import { useTranslation } from "react-i18next"
import {
  ArrowLeft,
  Calendar,
  MessageSquare,
  MessagesSquare,
  Target,
} from "lucide-react"
import PractitionerLayout from "@/layouts/PractitionerLayout"
import DataCard from "@/components/dashboard/DataCard"
import ArtifactStatusMatrix from "@/components/practitioner/ArtifactStatusMatrix"
import ClientPrismPanel from "@/components/practitioner/ClientPrismPanel"
import ClientPrismImport from "@/components/practitioner/ClientPrismImport"
import { prismImportOffered } from "@/components/practitioner/clientPrismImportHelpers"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useClientPrism, useCoachClient } from "@/hooks/practitioner/useCoachClient"
import { withPrism } from "@/lib/withPrism"

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export default function PractitionerClientProfile() {
  const { t } = useTranslation("practitionerPages")
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useCoachClient(clientId)
  const prismQuery = useClientPrism(clientId)

  const backLink = (
    <button
      type="button"
      onClick={() => navigate("/practitioner/clients")}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#3B5BFF] hover:text-[#2A47CC]"
    >
      <ArrowLeft className="h-4 w-4" />
      {t("clientProfile.backToClients", { defaultValue: "Back to My Clients" })}
    </button>
  )

  if (isLoading) {
    return (
      <PractitionerLayout>
        <div className="space-y-6">
          {backLink}
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </PractitionerLayout>
    )
  }

  if (!data) {
    return (
      <PractitionerLayout>
        <div className="space-y-6">
          {backLink}
          <div className="rounded-lg border border-[#e5e7eb] bg-white py-16 text-center">
            <p className="text-sm text-[#6b7280]">{t("clientProfile.notFound", { defaultValue: "Client not found." })}</p>
          </div>
        </div>
      </PractitionerLayout>
    )
  }

  const statusLabel =
    data.status === "active" ? t("clientProfile.statusActive", { defaultValue: "Active" }) : t("clientProfile.statusNew", { defaultValue: "New" })
  const statusClass =
    data.status === "active"
      ? "bg-[#D1FAE5] text-[#065F46]"
      : "bg-[#DBEAFE] text-[#1E40AF]"

  return (
    <PractitionerLayout>
      <div className="space-y-6">
        {backLink}

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#111827]">{data.name}</h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}>
                {statusLabel}
              </span>
            </div>
            <p className="text-sm text-[#6b7280]">
              {data.org || "—"} · {data.email}
            </p>
          </div>
        </div>

        {/* Sessions */}
        <DataCard
          title={t("clientProfile.sessions", { defaultValue: "Sessions" })}
          badge={t("clientProfile.sessionsBadge", { sessions: data.sessions, defaultValue: "{{sessions}} sessions" })}
        >
          {data.sessionsList.length ? (
            <ul className="divide-y divide-[#e5e7eb]">
              {data.sessionsList.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="h-4 w-4 text-[#9ca3af]" />
                    <div>
                      <div className="text-sm font-medium text-[#111827]">{s.topic}</div>
                      <div className="text-xs text-[#6b7280]">{formatDate(s.date)}</div>
                    </div>
                  </div>
                  <span className="text-xs tabular-nums text-[#6b7280]">{t("clientProfile.minutes", { min: s.durationMin, defaultValue: "{{min}} min" })}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#6b7280]">{t("clientProfile.noSessions", { defaultValue: "No sessions logged yet." })}</p>
          )}
        </DataCard>

        {/* Goals */}
        <DataCard title={t("clientProfile.goals", { defaultValue: "Top Goals & Objectives" })} badge={data.goals.length}>
          {data.goals.length ? (
            <ul className="space-y-3">
              {data.goals.map((g) => (
                <li key={g.id} className="flex gap-2.5">
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-[#3B5BFF]" />
                  <div>
                    <div className="text-sm font-medium text-[#111827]">{g.title}</div>
                    <div className="text-xs text-[#6b7280]">{g.objective}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#6b7280]">{t("clientProfile.noGoals", { defaultValue: "No goals defined yet." })}</p>
          )}
        </DataCard>

        {/* PRISM */}
        <DataCard
          ariaLabel={t("clientProfile.prismScores", { defaultValue: "PRISM Scores" })}
          title={withPrism(t("clientProfile.prismScores", { defaultValue: "PRISM Scores" }))}
        >
          <div className="space-y-3">
            {prismQuery.isError ? (
              <p role="alert" className="text-sm text-[#B91C1C]">
                {withPrism(t("clientProfile.prismLoadFailed", { defaultValue: "PRISM couldn’t be loaded just now. This is a failure, not an empty profile — try again shortly." }))}
              </p>
            ) : prismQuery.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : prismQuery.data ? (
              <ClientPrismPanel prism={prismQuery.data} clientName={data.name} />
            ) : data.prismScores.length ? (
              <div className="space-y-2">
                {data.prismScores.map((p) => (
                  <div key={p.dimension} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-sm font-medium text-[#111827]">{p.dimension}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#e5e7eb]">
                      <div
                        className="h-full rounded-full bg-[#3B5BFF]"
                        style={{ width: `${Math.min(100, p.score)}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-sm tabular-nums text-[#6b7280]">{p.score}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#6b7280]">{withPrism(t("clientProfile.noPrism", { defaultValue: "No PRISM scores on file for this client yet." }))}</p>
            )}
            {/* TDS U12: the import writes to the linked client's own profile (coach route, CSA #2210). */}
            {prismImportOffered(prismQuery.data) && <ClientPrismImport clientId={data.id} clientName={data.name} />}
          </div>
        </DataCard>

        {/* Resources */}
        <DataCard title={t("clientProfile.resources", { defaultValue: "Resources" })}>
          <ArtifactStatusMatrix
            resources={data.resources}
            unchecked={data.resourcesUnchecked}
            clientId={data.id}
          />
        </DataCard>

        {/* Follow-Ups & Topics */}
        <DataCard title={t("clientProfile.followUpsTopics", { defaultValue: "Follow-Ups & Topics" })}>
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">{t("clientProfile.followUps", { defaultValue: "Follow-ups" })}</div>
              {data.followUps.length ? (
                <ul className="divide-y divide-[#e5e7eb]">
                  {data.followUps.map((f) => (
                    <li key={f.id} className="flex items-center justify-between py-2">
                      <span className="text-sm text-[#111827]">{f.note}</span>
                      <span className="text-xs text-[#6b7280]">{formatDate(f.date)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[#6b7280]">{t("clientProfile.noFollowUps", { defaultValue: "No follow-ups scheduled." })}</p>
              )}
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">{t("clientProfile.topics", { defaultValue: "Topics" })}</div>
              {data.topics.length ? (
                <div className="flex flex-wrap gap-2">
                  {data.topics.map((topic) => (
                    <span
                      key={topic}
                      className="inline-flex items-center rounded-full bg-[#eef1ff] px-2.5 py-0.5 text-xs font-medium text-[#3B5BFF]"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6b7280]">{t("clientProfile.noTopics", { defaultValue: "No topics recorded." })}</p>
              )}
            </div>
          </div>
        </DataCard>

        {/* Past conversations */}
        <DataCard title={t("clientProfile.pastConversations", { defaultValue: "Past Conversations" })} badge={data.conversations.length}>
          {data.conversations.length ? (
            <ul className="divide-y divide-[#e5e7eb]">
              {data.conversations.map((c) => (
                <li key={c.id} className="flex items-start gap-2.5 py-2.5">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#9ca3af]" />
                  <div className="min-w-0">
                    <div className="truncate text-sm text-[#111827]">{c.preview}</div>
                    <div className="text-xs text-[#6b7280]">{formatDate(c.date)}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#6b7280]">{t("clientProfile.noConversations", { defaultValue: "No past conversations." })}</p>
          )}
        </DataCard>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-[#3B5BFF] text-white hover:bg-[#2A47CC]"
            onClick={() => navigate("/practitioner/meridian-chat")}
          >
            <MessagesSquare className="mr-1.5 h-4 w-4" />
            {t("clientProfile.chatWithMeridian", { defaultValue: "Chat with Meridian" })}
          </Button>
        </div>
      </div>

    </PractitionerLayout>
  )
}
