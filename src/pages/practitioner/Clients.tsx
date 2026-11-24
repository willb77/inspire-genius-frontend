import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { Plus, Upload, Search, Loader2, AlertCircle, Link2 } from "lucide-react"
import PractitionerLayout from "@/layouts/PractitionerLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  useCoachClients,
  useAddCoachClient,
  useBulkImportCoachClients,
} from "@/hooks/practitioner/useCoachClient"
import type { ClientSummary } from "@/types/practitioner/coachClient"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useClientInvites, useCreateClientInvite } from "@/hooks/practitioner/useClientInvites"
import { inviteErrorMessage } from "@/services/practitioner-invites/clientInvites.service"
import { InviteLinkDialog } from "@/components/practitioner/invites/InviteLinkDialog"
import {
  ClientInvitesLoadError,
  ClientInvitesPanel,
} from "@/components/practitioner/invites/ClientInvitesPanel"
import { withPrism } from "@/lib/withPrism"

const TOTAL_RESOURCES = 10

function PrismCell({ client }: { client: ClientSummary }) {
  const { t } = useTranslation("practitionerPages")
  if (client.prismStatus === "ready" && client.prismScore !== null) {
    return (
      <span className="inline-flex items-center rounded-full bg-[#D1FAE5] px-2.5 py-0.5 text-xs font-semibold text-[#065F46]">
        {client.prismScore}
      </span>
    )
  }
  if (client.prismStatus === "in_progress") {
    return (
      <span className="inline-flex items-center rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-xs font-medium text-[#92400E]">
        {t("clients.inProgress", { defaultValue: "In progress" })}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-[#F3F4F6] px-2.5 py-0.5 text-xs font-medium text-[#6b7280]">
      {t("clients.none", { defaultValue: "None" })}
    </span>
  )
}

function ResourceMeter({ present }: { present: number }) {
  const pct = Math.round((present / TOTAL_RESOURCES) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#e5e7eb]">
        <div className="h-full rounded-full bg-[#3B5BFF]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-[#6b7280]">
        {present}/{TOTAL_RESOURCES}
      </span>
    </div>
  )
}

export default function PractitionerClients() {
  const { t } = useTranslation("practitionerPages")
  const navigate = useNavigate()
  const { data, isLoading, error, refetch } = useCoachClients()
  const addClient = useAddCoachClient()
  const bulkImport = useBulkImportCoachClients()
  // PI-4 (S4/S5). The list read answers `off` while the invite routes do not
  // apply to this practitioner; then nothing below renders and the page is
  // exactly the roster it was.
  const invitesQ = useClientInvites()
  const createInvite = useCreateClientInvite()
  const invitesLive = invitesQ.data?.state === "live"
  const showInvites = invitesLive || invitesQ.isError
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get("tab") === "invites" ? "invites" : "clients"
  const [issued, setIssued] = useState<{ path: string; label: string } | null>(null)
  const [invitingId, setInvitingId] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [addOpen, setAddOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)

  // add-client form
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [org, setOrg] = useState("")

  // bulk-import form
  const [csvText, setCsvText] = useState("")

  const clients = useMemo<ClientSummary[]>(() => data ?? [], [data])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.org.toLowerCase().includes(q),
    )
  }, [clients, search])

  function resetAdd() {
    setName("")
    setEmail("")
    setOrg("")
  }

  function handleAdd() {
    if (!name.trim() || !email.trim()) {
      toast.error(t("clients.nameEmailRequired", { defaultValue: "Name and email are required." }))
      return
    }
    addClient.mutate(
      { name: name.trim(), email: email.trim(), org: org.trim() || undefined },
      {
        onSuccess: (c) => {
          toast.success(t("clients.added", { name: c.name, defaultValue: "Added {{name}} to your client roster." }))
          resetAdd()
          setAddOpen(false)
        },
      },
    )
  }

  function handleInvite(c: ClientSummary) {
    setInvitingId(c.id)
    createInvite.mutate(c.id, {
      onSuccess: (res) => setIssued({ path: res.invitePath, label: c.name }),
      onError: (err) =>
        toast.error(inviteErrorMessage(err) ?? t("clients.inviteFailed", { defaultValue: "Could not create the invite link. Please try again." })),
      onSettled: () => setInvitingId(null),
    })
  }

  function handleTab(next: string) {
    const params = new URLSearchParams(searchParams)
    if (next === "invites") params.set("tab", "invites")
    else params.delete("tab")
    setSearchParams(params, { replace: true })
  }

  const clientNames = useMemo(
    () => Object.fromEntries(clients.map((c) => [c.id, c.name])) as Record<string, string>,
    [clients],
  )

  function parseCsv(text: string): Array<{ name: string; email: string; org?: string }> {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [n, e, o] = line.split(",").map((p) => p.trim())
        return { name: n ?? "", email: e ?? "", org: o || undefined }
      })
      .filter((r) => r.name && r.email)
  }

  function handleBulk(fileText?: string) {
    const source = fileText ?? csvText
    const rows = parseCsv(source)
    if (rows.length === 0) {
      toast.error(t("clients.noValidRows", { defaultValue: "No valid rows found. Use: name,email,org" }))
      return
    }
    bulkImport.mutate(rows, {
      onSuccess: (res) => {
        toast.success(
          res.imported === 1
            ? t("clients.importedOne", { n: res.imported, defaultValue: "Imported {{n}} client." })
            : t("clients.importedOther", { n: res.imported, defaultValue: "Imported {{n}} clients." }),
        )
        setCsvText("")
        setBulkOpen(false)
      },
    })
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => handleBulk(String(reader.result ?? ""))
    reader.readAsText(file)
  }

  const rosterSection = (
    <>
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9ca3af]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("clients.searchPlaceholder", { defaultValue: "Search by name, email, or organization…" })}
            className="pl-9"
          />
        </div>

        {/* Roster */}
        <div className="rounded-lg border border-[#e5e7eb] bg-white">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <AlertCircle className="h-8 w-8 text-[#dc2626]" />
              <p className="text-sm text-[#6b7280]">{t("clients.loadFailed", { defaultValue: "Failed to load your client roster." })}</p>
              <Button variant="outline" onClick={() => refetch()}>
                {t("retry", { defaultValue: "Retry" })}
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-[#6b7280]">
              {clients.length === 0
                ? t("clients.noClients", { defaultValue: "No clients yet — add your first one." })
                : t("clients.noMatch", { defaultValue: "No clients match your search." })}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("clients.colClient", { defaultValue: "Client" })}</TableHead>
                  <TableHead>{t("clients.colOrganization", { defaultValue: "Organization" })}</TableHead>
                  <TableHead className="text-center">{t("clients.colSessions", { defaultValue: "# Sessions" })}</TableHead>
                  <TableHead>{t("clients.colTopGoals", { defaultValue: "Top Goals" })}</TableHead>
                  <TableHead>{withPrism(t("clients.colPrism", { defaultValue: "PRISM" }))}</TableHead>
                  <TableHead>{t("clients.colResources", { defaultValue: "Resources" })}</TableHead>
                  {invitesLive && <TableHead className="text-right">{t("clients.colInvite", { defaultValue: "Invite" })}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-[#f9fafb]"
                    onClick={() => navigate(`/practitioner/clients/${c.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium text-[#111827]">{c.name}</div>
                      <div className="text-xs text-[#6b7280]">{c.email}</div>
                    </TableCell>
                    <TableCell className="text-[#374151]">{c.org || "—"}</TableCell>
                    <TableCell className="text-center tabular-nums text-[#374151]">{c.sessions}</TableCell>
                    <TableCell className="max-w-[220px] text-[#374151]">
                      {c.topGoals.length ? (
                        c.topGoals.join(", ")
                      ) : (
                        <span className="text-[#9ca3af]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <PrismCell client={c} />
                    </TableCell>
                    <TableCell>
                      <ResourceMeter present={c.resourcesPresent} />
                    </TableCell>
                    {invitesLive && (
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-11"
                          disabled={!c.email || invitingId !== null}
                          title={c.email ? undefined : t("clients.inviteNeedsEmail", { defaultValue: "Add an email address to invite this client" })}
                          aria-label={t("clients.inviteAria", { name: c.name, defaultValue: "Invite {{name}}" })}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleInvite(c)
                          }}
                        >
                          {invitingId === c.id ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Link2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
                          )}
                          {t("clients.invite", { defaultValue: "Invite" })}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
    </>
  )

  return (
    <PractitionerLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#111827]">{t("clients.title", { defaultValue: "My Clients" })}</h1>
            <p className="text-sm text-[#6b7280]">
              {withPrism(t("clients.subtitle", { defaultValue: "Your coaching roster — resources, PRISM, and session history at a glance." }))}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-[#e5e7eb] text-[#111827]"
              onClick={() => setBulkOpen(true)}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              {t("clients.bulkImport", { defaultValue: "Bulk Import" })}
            </Button>
            <Button
              className="bg-[#3B5BFF] text-white hover:bg-[#2A47CC]"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {t("clients.addClient", { defaultValue: "Add Client" })}
            </Button>
          </div>
        </div>

        {showInvites ? (
          <Tabs value={tab} onValueChange={handleTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="clients" className="min-h-11">{t("clients.tabClients", { defaultValue: "Clients" })}</TabsTrigger>
              <TabsTrigger value="invites" className="min-h-11">{t("clients.tabInvitations", { defaultValue: "Invitations" })}</TabsTrigger>
            </TabsList>
            <TabsContent value="clients" className="space-y-6">
              {rosterSection}
            </TabsContent>
            <TabsContent value="invites">
              {invitesQ.data?.state === "live" ? (
                <ClientInvitesPanel invites={invitesQ.data.invites} clientNames={clientNames} />
              ) : (
                <ClientInvitesLoadError onRetry={() => invitesQ.refetch()} />
              )}
            </TabsContent>
          </Tabs>
        ) : (
          rosterSection
        )}
      </div>

      <InviteLinkDialog
        invitePath={issued?.path ?? null}
        clientLabel={issued?.label ?? ""}
        onClose={() => setIssued(null)}
      />

      {/* Add Client dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("clients.addClient", { defaultValue: "Add Client" })}</DialogTitle>
            <DialogDescription>{t("clients.addDescription", { defaultValue: "Add a single client to your coaching roster." })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="add-name">{t("clients.name", { defaultValue: "Name" })}</Label>
              <Input id="add-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("clients.namePlaceholder", { defaultValue: "Jane Doe" })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-email">{t("clients.email", { defaultValue: "Email" })}</Label>
              <Input
                id="add-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("clients.emailPlaceholder", { defaultValue: "jane@company.com" })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-org">{t("clients.organization", { defaultValue: "Organization" })}</Label>
              <Input id="add-org" value={org} onChange={(e) => setOrg(e.target.value)} placeholder={t("clients.orgPlaceholder", { defaultValue: "Company Inc" })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              {t("clients.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              className="bg-[#3B5BFF] text-white hover:bg-[#2A47CC]"
              disabled={addClient.isPending}
              onClick={handleAdd}
            >
              {addClient.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("clients.addClient", { defaultValue: "Add Client" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("clients.bulkTitle", { defaultValue: "Bulk Import Clients" })}</DialogTitle>
            <DialogDescription>
              {t("clients.bulkDescriptionBefore", { defaultValue: "Paste one client per line as" })}{" "}
              <code className="rounded bg-[#f3f4f6] px-1">name,email,org</code>{t("clients.bulkDescriptionAfter", { defaultValue: ", or upload a CSV file." })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-csv">{t("clients.pasteRows", { defaultValue: "Paste rows" })}</Label>
              <Textarea
                id="bulk-csv"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={6}
                placeholder={
                  "Marcus Chen,marcus@techcorp.com,TechCorp Inc\nAisha Patel,aisha@globalhealth.com,GlobalHealth"
                }
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-file">{t("clients.uploadCsv", { defaultValue: "…or upload a CSV file" })}</Label>
              <input
                id="bulk-file"
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFile}
                className="block w-full text-sm text-[#6b7280] file:mr-3 file:rounded file:border-0 file:bg-[#3B5BFF] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-[#2A47CC]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>
              {t("clients.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              className="bg-[#3B5BFF] text-white hover:bg-[#2A47CC]"
              disabled={bulkImport.isPending}
              onClick={() => handleBulk()}
            >
              {bulkImport.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {t("clients.import", { defaultValue: "Import" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PractitionerLayout>
  )
}
