import { useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowLeft,
  Calendar,
  MessageSquare,
  MessagesSquare,
  Target,
  Upload,
  Loader2,
} from "lucide-react"
import PractitionerLayout from "@/layouts/PractitionerLayout"
import DataCard from "@/components/dashboard/DataCard"
import ArtifactStatusMatrix from "@/components/practitioner/ArtifactStatusMatrix"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCoachClient } from "@/hooks/practitioner/useCoachClient"
import { usePrismImport } from "@/hooks/prism/usePrismImport"

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export default function PractitionerClientProfile() {
  const { clientId } = useParams<{ clientId: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useCoachClient(clientId)
  const prismImport = usePrismImport()

  const [prismOpen, setPrismOpen] = useState(false)
  const prismFileRef = useRef<HTMLInputElement>(null)

  function handlePrismUpload() {
    const file = prismFileRef.current?.files?.[0]
    if (!file || !clientId) return
    prismImport.mutate(
      { userId: clientId, file },
      {
        onSuccess: () => {
          setPrismOpen(false)
          if (prismFileRef.current) prismFileRef.current.value = ""
        },
      },
    )
  }

  const backLink = (
    <button
      type="button"
      onClick={() => navigate("/practitioner/clients")}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#3B5BFF] hover:text-[#2A47CC]"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to My Clients
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
            <p className="text-sm text-[#6b7280]">Client not found.</p>
          </div>
        </div>
      </PractitionerLayout>
    )
  }

  const statusLabel = data.status === "active" ? "Active" : "New"
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
        <DataCard title="Sessions" badge={`${data.sessions} sessions`}>
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
                  <span className="text-xs tabular-nums text-[#6b7280]">{s.durationMin} min</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#6b7280]">No sessions logged yet.</p>
          )}
        </DataCard>

        {/* Goals */}
        <DataCard title="Top Goals & Objectives" badge={data.goals.length}>
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
            <p className="text-sm text-[#6b7280]">No goals defined yet.</p>
          )}
        </DataCard>

        {/* PRISM */}
        <DataCard title="PRISM Scores">
          <div className="space-y-3">
            {data.prismScores.length ? (
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
              <p className="text-sm text-[#6b7280]">No PRISM scores on file for this client yet.</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="border-[#e5e7eb] text-[#3B5BFF] hover:bg-[#eef1ff] hover:text-[#2A47CC]"
              onClick={() => setPrismOpen(true)}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              Upload PRISM .csv
            </Button>
          </div>
        </DataCard>

        {/* Resources */}
        <DataCard title="Resources">
          <ArtifactStatusMatrix resources={data.resources} clientId={data.id} />
        </DataCard>

        {/* Follow-Ups & Topics */}
        <DataCard title="Follow-Ups & Topics">
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Follow-ups</div>
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
                <p className="text-sm text-[#6b7280]">No follow-ups scheduled.</p>
              )}
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Topics</div>
              {data.topics.length ? (
                <div className="flex flex-wrap gap-2">
                  {data.topics.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center rounded-full bg-[#eef1ff] px-2.5 py-0.5 text-xs font-medium text-[#3B5BFF]"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6b7280]">No topics recorded.</p>
              )}
            </div>
          </div>
        </DataCard>

        {/* Past conversations */}
        <DataCard title="Past Conversations" badge={data.conversations.length}>
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
            <p className="text-sm text-[#6b7280]">No past conversations.</p>
          )}
        </DataCard>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-[#3B5BFF] text-white hover:bg-[#2A47CC]"
            onClick={() => navigate("/practitioner/meridian-chat")}
          >
            <MessagesSquare className="mr-1.5 h-4 w-4" />
            Chat with Meridian
          </Button>
        </div>
      </div>

      {/* PRISM upload dialog */}
      <Dialog open={prismOpen} onOpenChange={setPrismOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload PRISM .csv</DialogTitle>
            <DialogDescription>
              Import a PRISM score export for {data.name}. The parsed scores attach to this client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            <Label htmlFor="prism-csv-file">PRISM CSV file</Label>
            <input
              ref={prismFileRef}
              id="prism-csv-file"
              type="file"
              accept=".csv,.xls,.xlsx"
              className="block w-full text-sm text-[#6b7280] file:mr-3 file:rounded file:border-0 file:bg-[#3B5BFF] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-[#2A47CC]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrismOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#3B5BFF] text-white hover:bg-[#2A47CC]"
              disabled={prismImport.isPending}
              onClick={handlePrismUpload}
            >
              {prismImport.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PractitionerLayout>
  )
}
