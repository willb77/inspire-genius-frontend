/**
 * Administration → Client Sign-Up → one engagement.
 *
 * Five tabs, one per artefact the process produces: the CRM record (§3–§4), the
 * activity log (§4), the SOW (§6, Appendix A), the invoicing hand-off (§8,
 * Appendix B) and the one-page checklist (§10).
 *
 * The page's job is to make the gate LEGIBLE. Every refusal the server returns
 * carries the full outstanding list, and this surface renders all of it — the
 * failed gates, the missing fields, the empty SOW sections, the reconciliation
 * difference. A gate that says only "forbidden" is one people learn to resent
 * and then ask to have removed; a gate that says exactly what is missing is a
 * checklist that happens to be enforced.
 */
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import LoadingSkeleton from "@/components/shared/LoadingSkeleton"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileText,
  Receipt,
  Send,
} from "lucide-react"

import {
  refusalMessages,
  refusalWarnings,
  useActivities,
  useAddActivity,
  useChangeOrders,
  useChangeStage,
  useConfirmInvoicingSummary,
  useCreateChangeOrder,
  useDraftInvoicingSummary,
  useEngagement,
  useInvoicingSummary,
  useProcessReference,
  useSaveInvoicingSummary,
  useSaveSow,
  useSendInvoicingSummary,
  useSendSow,
  useSignChangeOrder,
  useSignSow,
  useSow,
  useUpdateEngagement,
} from "@/hooks/super-admin/useClientSignup"
import type {
  Engagement,
  InvoicingDocument,
  ProcessReference,
  SowDocument,
} from "@/types/client-signup"
import { centsToInput, formatMoney, toCents } from "@/lib/clientSignupMoney"

/** Renders a refusal. Never silent: an empty list still says something. */
function Refusal({ error, title }: { error: unknown; title: string }) {
  const messages = refusalMessages(error)
  const warnings = refusalWarnings(error)
  return (
    <div
      role="alert"
      className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      <p className="font-medium">{title}</p>
      <ul className="mt-1 list-inside list-disc">
        {messages.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
      {warnings.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-amber-800">
          {warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ClientEngagement() {
  const { engagementId } = useParams<{ engagementId: string }>()
  const navigate = useNavigate()
  const { data: process } = useProcessReference()
  const { data: engagement, isLoading, isError, error } = useEngagement(engagementId)

  if (isLoading) {
    return (
      <SuperAdminLayout>
        <div className="p-6">
          <LoadingSkeleton />
        </div>
      </SuperAdminLayout>
    )
  }

  if (isError || !engagement) {
    return (
      <SuperAdminLayout>
        <div className="space-y-4 p-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin/client-signup")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to the pipeline
          </Button>
          <Refusal error={error} title="This engagement could not be loaded." />
        </div>
      </SuperAdminLayout>
    )
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6 p-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/super-admin/client-signup")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to the pipeline
        </Button>

        <EngagementHeader engagement={engagement} process={process} />

        <Tabs defaultValue="record">
          <TabsList>
            <TabsTrigger value="record">Record</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="sow">Statement of Work</TabsTrigger>
            <TabsTrigger value="invoicing">Invoicing</TabsTrigger>
            <TabsTrigger value="checklist">Checklist</TabsTrigger>
          </TabsList>

          <TabsContent value="record" className="mt-4">
            <RecordTab engagement={engagement} process={process} />
          </TabsContent>
          <TabsContent value="activity" className="mt-4">
            <ActivityTab engagementId={engagement.id} />
          </TabsContent>
          <TabsContent value="sow" className="mt-4">
            <SowTab engagement={engagement} process={process} />
          </TabsContent>
          <TabsContent value="invoicing" className="mt-4">
            <InvoicingTab engagement={engagement} />
          </TabsContent>
          <TabsContent value="checklist" className="mt-4">
            <ChecklistTab engagement={engagement} />
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  )
}

// ─── Header: stage, the next move, and the invoicing contact's queue ─────────────

function EngagementHeader({
  engagement,
  process,
}: {
  engagement: Engagement
  process?: ProcessReference
}) {
  const changeStage = useChangeStage(engagement.id)
  const [lostReason, setLostReason] = useState("")
  const [lostNote, setLostNote] = useState("")
  const [showLost, setShowLost] = useState(false)

  const gate = engagement.can_advance
  const nextLabel = process?.stages.find((s) => s.key === engagement.next_stage)?.label

  const advance = () => {
    if (!engagement.next_stage) return
    changeStage.mutate(
      { target_stage: engagement.next_stage },
      {
        onSuccess: (e) => toast.success(`Moved to ${e.stage_label}`),
        onError: () => {
          /* rendered inline below — a toast alone would scroll away before it
             can be read, and this list is the instruction for what to fix */
        },
      },
    )
  }

  const close = () => {
    changeStage.mutate(
      {
        target_stage: "closed_lost",
        lost_reason_code: lostReason || undefined,
        lost_note: lostNote || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Closed as lost")
          setShowLost(false)
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {engagement.opportunity_name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <Badge variant="secondary">{engagement.stage_label}</Badge>
            <span>{formatMoney(engagement.estimated_value_cents)}</span>
            {engagement.expected_close_date && (
              <span>· closes {engagement.expected_close_date}</span>
            )}
            <span>· {engagement.owner_email}</span>
            {engagement.at_risk && (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                At risk
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {engagement.next_stage && (
            <Button onClick={advance} disabled={changeStage.isPending}>
              Advance to {nextLabel}
            </Button>
          )}
          {engagement.stage !== "closed_lost" && engagement.stage !== "complete" && (
            <Button variant="outline" onClick={() => setShowLost((v) => !v)}>
              Close as lost
            </Button>
          )}
        </div>
      </div>

      {/* What is outstanding for the NEXT stage — shown before the user tries,
          so the gate reads as a checklist rather than as a rejection. */}
      {gate && !gate.allowed && engagement.next_stage && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-medium">
            Outstanding before {nextLabel}:
          </p>
          <ul className="mt-1 list-inside list-disc">
            {gate.error && <li>{gate.error}</li>}
            {gate.failed_gates.map((g) => (
              <li key={g.key}>{g.label}</li>
            ))}
            {gate.missing_fields.map((f) => (
              <li key={f.name}>
                {f.label} is required
                {f.note ? ` — ${f.note}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {changeStage.isError && (
        <Refusal error={changeStage.error} title="The stage was not changed." />
      )}

      {/* §8 — things the invoicing contact must be told that they have not been told. */}
      {engagement.pending_invoicing.length > 0 && (
        <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
          <p className="font-medium">Invoicing hand-off outstanding</p>
          <ul className="mt-1 list-inside list-disc">
            {engagement.pending_invoicing.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {showLost && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-slate-600">
              A lost opportunity is never deleted — the history is how we learn what
              closes. A reason code and a short note are required.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Reason code</Label>
                <Select value={lostReason} onValueChange={setLostReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(process?.lost_reason_codes ?? []).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">What we would do differently</Label>
                <Input value={lostNote} onChange={(e) => setLostNote(e.target.value)} />
              </div>
            </div>
            <Button onClick={close} disabled={changeStage.isPending}>
              Close as lost
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Record tab (§3, §4) ─────────────────────────────────────────

function RecordTab({
  engagement,
  process,
}: {
  engagement: Engagement
  process?: ProcessReference
}) {
  const update = useUpdateEngagement(engagement.id)
  const [form, setForm] = useState(engagement)
  const [valueInput, setValueInput] = useState(
    centsToInput(engagement.estimated_value_cents),
  )

  // Re-seed when the server sends a newer record (e.g. after a stage change),
  // so the form never quietly holds a stale copy over the truth.
  useEffect(() => {
    setForm(engagement)
    setValueInput(centsToInput(engagement.estimated_value_cents))
  }, [engagement])

  const set = <K extends keyof Engagement>(k: K, v: Engagement[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const save = () => {
    update.mutate(
      {
        company_name: form.company_name,
        company_legal_name: form.company_legal_name,
        company_website: form.company_website,
        primary_contact_name: form.primary_contact_name,
        primary_contact_email: form.primary_contact_email,
        primary_contact_phone: form.primary_contact_phone,
        decision_maker_name: form.decision_maker_name,
        decision_maker_email: form.decision_maker_email,
        industry: form.industry,
        industry_subtype: form.industry_subtype,
        lead_source: form.lead_source,
        service_line: form.service_line,
        business_problem: form.business_problem,
        qualification_notes: form.qualification_notes,
        qualification_call_at: form.qualification_call_at,
        discovery_scheduled_at: form.discovery_scheduled_at,
        estimated_value_cents: toCents(valueInput),
        expected_close_date: form.expected_close_date,
        scope_summary: form.scope_summary,
        scope_summary_url: form.scope_summary_url,
        scope_summary_reviewed_with_client: form.scope_summary_reviewed_with_client,
        integrations_required: form.integrations_required,
        integrations_confirmed: form.integrations_confirmed,
        competitors: form.competitors,
        internal_estimate_approved: form.internal_estimate_approved,
        client_feedback_at: form.client_feedback_at,
        project_record_created: form.project_record_created,
        kickoff_scheduled_at: form.kickoff_scheduled_at,
        next_action: form.next_action,
        next_action_due: form.next_action_due,
        owner_email: form.owner_email,
      },
      { onSuccess: () => toast.success("Saved") },
    )
  }

  const missing = new Set(engagement.missing_fields.map((m) => m.name))
  const flag = (name: string) => (missing.has(name) ? "border-amber-400" : "")

  return (
    <div className="space-y-4">
      {update.isError && <Refusal error={update.error} title="Nothing was saved." />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client and contacts</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Text label="Company name" value={form.company_name} onChange={(v) => set("company_name", v)} className={flag("company_name")} />
          <Text label="Legal name (as it appears on the SOW)" value={form.company_legal_name ?? ""} onChange={(v) => set("company_legal_name", v)} />
          <Text label="Website" value={form.company_website ?? ""} onChange={(v) => set("company_website", v)} className={flag("company_website")} />
          <Text label="Owner (engagement lead)" value={form.owner_email} onChange={(v) => set("owner_email", v)} />
          <Text label="Primary contact" value={form.primary_contact_name ?? ""} onChange={(v) => set("primary_contact_name", v)} className={flag("primary_contact_name")} />
          <Text label="Contact email" value={form.primary_contact_email ?? ""} onChange={(v) => set("primary_contact_email", v)} className={flag("primary_contact_email")} />
          <Text label="Decision maker / signer" value={form.decision_maker_name ?? ""} onChange={(v) => set("decision_maker_name", v)} className={flag("decision_maker_name")} />
          <Text label="Signer email" value={form.decision_maker_email ?? ""} onChange={(v) => set("decision_maker_email", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Classification and value</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Choice label="Industry" value={form.industry ?? ""} options={(process?.industries ?? []).map((i) => ({ key: i, label: i.replace(/_/g, " ") }))} onChange={(v) => set("industry", v)} />
          <Text label="Sub-type (hotel, resort, CPA firm…)" value={form.industry_subtype ?? ""} onChange={(v) => set("industry_subtype", v)} />
          <Choice label="Lead source" value={form.lead_source ?? ""} options={(process?.lead_sources ?? []).map((s) => ({ key: s, label: s.replace(/_/g, " ") }))} onChange={(v) => set("lead_source", v)} />
          <Choice label="Product / service line" value={form.service_line ?? ""} options={process?.service_lines ?? []} onChange={(v) => set("service_line", v)} />
          <div className="space-y-1">
            <Label className="text-xs text-slate-600">Estimated value (USD)</Label>
            <Input value={valueInput} onChange={(e) => setValueInput(e.target.value)} inputMode="decimal" placeholder="48000" className={flag("estimated_value_usd")} />
            <p className="text-xs text-slate-500">
              On the win this is replaced by the signed SOW total.
            </p>
          </div>
          <Text label="Expected close date" type="date" value={form.expected_close_date ?? ""} onChange={(v) => set("expected_close_date", v)} className={flag("expected_close_date")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Qualification and discovery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Area label="Business problem, in the client's words" value={form.business_problem ?? ""} onChange={(v) => set("business_problem", v)} />
          <Area label="Qualification notes — need, budget range, authority, timing" value={form.qualification_notes ?? ""} onChange={(v) => set("qualification_notes", v)} />
          <div className="grid gap-4 md:grid-cols-2">
            <Text label="Qualification call held at" type="datetime-local" value={(form.qualification_call_at ?? "").slice(0, 16)} onChange={(v) => set("qualification_call_at", v ? new Date(v).toISOString() : null)} />
            <Text label="Discovery session scheduled for" type="datetime-local" value={(form.discovery_scheduled_at ?? "").slice(0, 16)} onChange={(v) => set("discovery_scheduled_at", v ? new Date(v).toISOString() : null)} />
          </div>
          <Area label="Scope summary" value={form.scope_summary ?? ""} onChange={(v) => set("scope_summary", v)} />
          <Text label="Scope summary link" value={form.scope_summary_url ?? ""} onChange={(v) => set("scope_summary_url", v)} />
          <List label="Integrations required" values={form.integrations_required} onChange={(v) => set("integrations_required", v)} placeholder="Opera PMS, RingCentral, QuickBooks" />
          <List label="Competitors and alternatives (include 'do nothing')" values={form.competitors} onChange={(v) => set("competitors", v)} placeholder="do nothing, incumbent vendor" />
          <div className="space-y-2 rounded-md border p-3">
            <Check label="Scope summary reviewed with the client" checked={form.scope_summary_reviewed_with_client} onChange={(v) => set("scope_summary_reviewed_with_client", v)} />
            <Check label="Integrations list confirmed" checked={form.integrations_confirmed} onChange={(v) => set("integrations_confirmed", v)} />
            <Check label="Internal estimate approved" checked={form.internal_estimate_approved} onChange={(v) => set("internal_estimate_approved", v)} />
            <Check label="Project record created" checked={form.project_record_created} onChange={(v) => set("project_record_created", v)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Next action</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Text label="Next action" value={form.next_action ?? ""} onChange={(v) => set("next_action", v)} className={flag("next_action")} />
          <Text label="Due" type="date" value={form.next_action_due ?? ""} onChange={(v) => set("next_action_due", v)} className={flag("next_action_due")} />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save record"}
        </Button>
      </div>
    </div>
  )
}

// ─── Activity tab (§4) ───────────────────────────────────────────

const ACTIVITY_KINDS = ["meeting", "call", "demo", "email", "document", "note"] as const

function ActivityTab({ engagementId }: { engagementId: string }) {
  const { data: activities, isLoading } = useActivities(engagementId)
  const add = useAddActivity(engagementId)
  const [kind, setKind] = useState<string>("call")
  const [summary, setSummary] = useState("")
  const [detail, setDetail] = useState("")

  const submit = () => {
    add.mutate(
      { kind: kind as (typeof ACTIVITY_KINDS)[number], summary, detail: detail || undefined },
      {
        onSuccess: () => {
          setSummary("")
          setDetail("")
          toast.success("Logged")
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log an activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Log a meeting, call or demo within 24 hours. Logging here is what clears
            the At Risk flag — editing a field does not.
          </p>
          {add.isError && <Refusal error={add.error} title="Nothing was logged." />}
          <div className="grid gap-3 md:grid-cols-[10rem_1fr]">
            <Choice label="Kind" value={kind} options={ACTIVITY_KINDS.map((k) => ({ key: k, label: k }))} onChange={setKind} />
            <Text label="Summary" value={summary} onChange={setSummary} placeholder="Intro call — Dana and Sam, walked the scope" />
          </div>
          <Area label="Detail (optional)" value={detail} onChange={setDetail} />
          <Button onClick={submit} disabled={!summary.trim() || add.isPending}>
            {add.isPending ? "Logging…" : "Log activity"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingSkeleton />
          ) : !activities || activities.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Nothing logged yet.</p>
          ) : (
            <ol className="space-y-3">
              {activities.map((a) => (
                <li key={a.id} className="border-l-2 border-slate-200 pl-3">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <Badge variant="outline" className="text-xs">
                      {a.kind.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-sm text-slate-800">{a.summary}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(a.occurred_at).toLocaleString()} · {a.actor_email}
                  </p>
                  {a.detail && <p className="mt-1 text-sm text-slate-600">{a.detail}</p>}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── SOW tab (§6, §7, Appendix A) ────────────────────────────────

function SowTab({
  engagement,
  process,
}: {
  engagement: Engagement
  process?: ProcessReference
}) {
  const { data: sow, isLoading } = useSow(engagement.id)
  const save = useSaveSow(engagement.id)
  const send = useSendSow(engagement.id)
  const sign = useSignSow(engagement.id)

  const [doc, setDoc] = useState<SowDocument>({})
  const [changeSummary, setChangeSummary] = useState("")

  useEffect(() => {
    if (sow) setDoc(sow.document ?? {})
    else if (engagement.company_legal_name || engagement.company_name) {
      setDoc((d) => ({
        client_legal_name: engagement.company_legal_name ?? engagement.company_name,
        client_signer_name: engagement.decision_maker_name ?? "",
        ...d,
      }))
    }
  }, [sow, engagement])

  const sections = process?.sow_sections ?? []
  const readOnly = sow?.status === "sent" || sow?.status === "signed"

  const setSection = (n: number, text: string) =>
    setDoc((d) => ({ ...d, sections: { ...(d.sections ?? {}), [String(n)]: text } }))

  const totals = useMemo(() => {
    const oneTime =
      (doc.fee_lines ?? []).reduce((s, l) => s + (l.amount_cents ?? 0), 0) +
      (doc.additional_services ?? [])
        .filter((a) => (a.inclusion ?? "").toLowerCase() === "included")
        .reduce((s, a) => s + (a.fee_cents ?? 0), 0)
    const scheduled = (doc.payment_schedule ?? []).reduce(
      (s, p) => s + (p.amount_cents ?? 0),
      0,
    )
    return { oneTime, scheduled }
  }, [doc])

  if (isLoading) return <LoadingSkeleton />

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            {sow ? `${sow.sow_number ?? "SOW"} — v${sow.version}` : "No SOW yet"}
            {sow && (
              <Badge variant="secondary" className="ml-2">
                {sow.status}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                save.mutate(
                  { document: doc, changeSummary: changeSummary || undefined },
                  {
                    onSuccess: (s) => {
                      setChangeSummary("")
                      toast.success(`Saved draft v${s.version}`)
                    },
                  },
                )
              }
              disabled={save.isPending}
            >
              {readOnly ? "Save as a new version" : "Save draft"}
            </Button>
            {sow?.status === "draft" && (
              <Button
                size="sm"
                onClick={() =>
                  send.mutate(undefined, {
                    onSuccess: () => toast.success("Marked as sent"),
                  })
                }
                disabled={send.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                Mark sent
              </Button>
            )}
            {sow?.status === "sent" && (
              <Button
                size="sm"
                onClick={() =>
                  sign.mutate(undefined, {
                    onSuccess: () => toast.success("Countersignature recorded"),
                  })
                }
                disabled={sign.isPending}
              >
                Record signature
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {readOnly && (
            <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              This version has been {sow?.status}. It is never edited in place — saving
              opens v{(sow?.version ?? 1) + 1} with your changes, and this one is kept
              as the record of what the client actually received.
            </p>
          )}
          {save.isError && <Refusal error={save.error} title="The draft was not saved." />}
          {send.isError && <Refusal error={send.error} title="The SOW was not sent." />}
          {sign.isError && <Refusal error={sign.error} title="The signature was not recorded." />}

          <div className="grid gap-4 md:grid-cols-2">
            <Text label="Client legal name" value={doc.client_legal_name ?? ""} onChange={(v) => setDoc((d) => ({ ...d, client_legal_name: v }))} />
            <Text label="Client signer" value={doc.client_signer_name ?? ""} onChange={(v) => setDoc((d) => ({ ...d, client_signer_name: v }))} />
            <Text label="Client address" value={doc.client_address ?? ""} onChange={(v) => setDoc((d) => ({ ...d, client_address: v }))} />
            <Text label="Payment terms" value={doc.payment_terms ?? "Net 30"} onChange={(v) => setDoc((d) => ({ ...d, payment_terms: v }))} />
            <Text label="Start date" type="date" value={doc.start_date ?? ""} onChange={(v) => setDoc((d) => ({ ...d, start_date: v }))} />
            <Text label="End date" type="date" value={doc.end_date ?? ""} onChange={(v) => setDoc((d) => ({ ...d, end_date: v }))} />
          </div>

          {changeSummaryNeeded(sow) && (
            <Text
              label="One-line change summary (required on every revision)"
              value={changeSummary}
              onChange={setChangeSummary}
              placeholder="Dropped the phase-3 integration; price down 8%"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">The fourteen sections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Nothing is omitted. A section that does not apply says “Not applicable”
            rather than disappearing — a blank one blocks sending.
          </p>
          {sections.map((s) => {
            const empty = !(doc.sections ?? {})[String(s.number)]?.trim()
            return (
              <div key={s.number} className="space-y-1">
                <Label className="text-sm font-medium text-slate-800">
                  {s.number}. {s.title}
                  {empty && <span className="ml-2 text-xs text-amber-700">empty</span>}
                </Label>
                <p className="text-xs text-slate-500">{s.guidance}</p>
                <Textarea
                  rows={3}
                  value={(doc.sections ?? {})[String(s.number)] ?? ""}
                  onChange={(e) => setSection(s.number, e.target.value)}
                  className={empty ? "border-amber-300" : ""}
                />
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Rows
            label="Core service fee lines"
            rows={doc.fee_lines ?? []}
            onChange={(rows) => setDoc((d) => ({ ...d, fee_lines: rows }))}
            columns={[
              { key: "label", label: "Item", width: "flex-1" },
              { key: "amount_cents", label: "Amount (USD)", money: true },
            ]}
            blank={{ label: "", amount_cents: 0 }}
          />
          <Rows
            label="Additional services — only those marked Included count toward the total"
            rows={doc.additional_services ?? []}
            onChange={(rows) => setDoc((d) => ({ ...d, additional_services: rows }))}
            columns={[
              { key: "service", label: "Service", width: "flex-1" },
              { key: "inclusion", label: "Included / Optional" },
              { key: "fee_cents", label: "Fee (USD)", money: true },
            ]}
            blank={{ service: "", inclusion: "Included", fee_cents: 0 }}
          />
          <Rows
            label="Payment schedule"
            rows={doc.payment_schedule ?? []}
            onChange={(rows) => setDoc((d) => ({ ...d, payment_schedule: rows }))}
            columns={[
              { key: "trigger", label: "Trigger", width: "flex-1" },
              { key: "amount_cents", label: "Amount (USD)", money: true },
            ]}
            blank={{ trigger: "", amount_cents: 0 }}
          />
          <Rows
            label="Recurring fees"
            rows={doc.recurring_lines ?? []}
            onChange={(rows) => setDoc((d) => ({ ...d, recurring_lines: rows }))}
            columns={[
              { key: "item", label: "Item", width: "flex-1" },
              { key: "amount_cents", label: "Amount (USD)", money: true },
              { key: "starts", label: "Starts" },
            ]}
            blank={{ item: "", amount_cents: 0, starts: "" }}
          />

          <div className="rounded-md border bg-slate-50 p-3 text-sm">
            <div className="flex justify-between">
              <span>One-time total (core + included additional)</span>
              <span className="font-medium tabular-nums">{formatMoney(totals.oneTime)}</span>
            </div>
            <div className="flex justify-between">
              <span>Payment schedule total</span>
              <span className="font-medium tabular-nums">{formatMoney(totals.scheduled)}</span>
            </div>
            {totals.oneTime !== totals.scheduled && (
              <p className="mt-2 text-amber-800">
                These differ by {formatMoney(Math.abs(totals.oneTime - totals.scheduled))}.
                The invoicing summary cannot be sent until the schedule matches the
                one-time total.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Rowsless deliverables={doc.deliverables ?? []} onChange={(rows) => setDoc((d) => ({ ...d, deliverables: rows }))} />
    </div>
  )
}

function changeSummaryNeeded(sow: { status?: string } | null | undefined): boolean {
  return sow?.status === "sent" || sow?.status === "signed"
}

/** Deliverables get their own block — each needs an acceptance criterion (§6 §4). */
function Rowsless({
  deliverables,
  onChange,
}: {
  deliverables: NonNullable<SowDocument["deliverables"]>
  onChange: (rows: NonNullable<SowDocument["deliverables"]>) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Deliverables</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">
          Every deliverable needs an acceptance criterion — the SOW cannot be sent
          without one, because it is how the client confirms the work is done.
        </p>
        {deliverables.map((d, i) => (
          <div key={i} className="grid gap-2 rounded-md border p-3 md:grid-cols-2">
            <Text label="Name" value={d.name ?? ""} onChange={(v) => onChange(deliverables.map((x, j) => (j === i ? { ...x, name: v } : x)))} />
            <Text label="Format" value={d.format ?? ""} onChange={(v) => onChange(deliverables.map((x, j) => (j === i ? { ...x, format: v } : x)))} />
            <Text label="Due (date or milestone)" value={d.due ?? ""} onChange={(v) => onChange(deliverables.map((x, j) => (j === i ? { ...x, due: v } : x)))} />
            <Text
              label="Acceptance criterion"
              value={d.acceptance_criterion ?? ""}
              onChange={(v) => onChange(deliverables.map((x, j) => (j === i ? { ...x, acceptance_criterion: v } : x)))}
              className={d.acceptance_criterion ? "" : "border-amber-300"}
            />
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...deliverables,
              { id: `D${deliverables.length + 1}`, name: "", acceptance_criterion: "" },
            ])
          }
        >
          Add deliverable
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Invoicing tab (§8, Appendix B) ──────────────────────────────

function InvoicingTab({ engagement }: { engagement: Engagement }) {
  const { data: summary, isLoading } = useInvoicingSummary(engagement.id)
  const draft = useDraftInvoicingSummary(engagement.id)
  const save = useSaveInvoicingSummary(engagement.id)
  const send = useSendInvoicingSummary(engagement.id)
  const confirm = useConfirmInvoicingSummary(engagement.id)
  const { data: sow } = useSow(engagement.id)

  const [doc, setDoc] = useState<InvoicingDocument>({})
  const [firstInvoice, setFirstInvoice] = useState("")

  useEffect(() => {
    if (summary) setDoc(summary.document ?? {})
  }, [summary])

  const scheduled = (doc.invoices ?? []).reduce((s, i) => s + (i.amount_cents ?? 0), 0)
  const sowTotal = sow?.total_one_time_cents ?? 0

  if (isLoading) return <LoadingSkeleton />

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4" />
            Invoicing summary
            {summary && <Badge variant="secondary">v{summary.version}</Badge>}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                draft.mutate(undefined, {
                  onSuccess: (d) => {
                    setDoc(d)
                    toast.success("Pre-filled from the signed SOW")
                  },
                })
              }
              disabled={draft.isPending}
            >
              Pre-fill from the SOW
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                save.mutate({ document: doc }, { onSuccess: () => toast.success("Saved") })
              }
              disabled={save.isPending}
            >
              Save
            </Button>
            <Button
              size="sm"
              onClick={() =>
                send.mutate(undefined, { onSuccess: () => toast.success("Sent to the invoicing contact") })
              }
              disabled={send.isPending || !summary}
            >
              <Send className="mr-2 h-4 w-4" />
              Send to the invoicing contact
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Invoices are raised from this summary, not from the SOW, so it must be complete
            and self-contained. It goes out the same day the SOW is countersigned.
          </p>

          {draft.isError && <Refusal error={draft.error} title="The draft could not be built." />}
          {save.isError && <Refusal error={save.error} title="Nothing was saved." />}
          {send.isError && <Refusal error={send.error} title="The summary was not sent." />}
          {confirm.isError && <Refusal error={confirm.error} title="Receipt was not recorded." />}

          <div className="grid gap-4 md:grid-cols-2">
            <Text label="Client legal name" value={doc.client_legal_name ?? ""} onChange={(v) => setDoc((d) => ({ ...d, client_legal_name: v }))} />
            <Text label="Billing address" value={doc.billing_address ?? ""} onChange={(v) => setDoc((d) => ({ ...d, billing_address: v }))} />
            <Text label="Billing contact (AP)" value={doc.billing_contact_name ?? ""} onChange={(v) => setDoc((d) => ({ ...d, billing_contact_name: v }))} />
            <Text label="Billing contact email" value={doc.billing_contact_email ?? ""} onChange={(v) => setDoc((d) => ({ ...d, billing_contact_email: v }))} />
            <Text label="PO number / vendor requirements" value={doc.po_number ?? ""} onChange={(v) => setDoc((d) => ({ ...d, po_number: v }))} />
            <Text label="Payment terms" value={doc.payment_terms ?? "Net 30"} onChange={(v) => setDoc((d) => ({ ...d, payment_terms: v }))} />
            <Text label="Signed SOW location (link)" value={doc.signed_sow_location ?? ""} onChange={(v) => setDoc((d) => ({ ...d, signed_sow_location: v }))} />
            <Text label="Notes for invoicing" value={doc.notes_for_invoicing ?? ""} onChange={(v) => setDoc((d) => ({ ...d, notes_for_invoicing: v }))} />
          </div>
          <Area
            label="One-line description of the work (this becomes the invoice narrative)"
            value={doc.work_description ?? ""}
            onChange={(v) => setDoc((d) => ({ ...d, work_description: v }))}
          />

          <Rows
            label="Invoice schedule"
            rows={doc.invoices ?? []}
            onChange={(rows) => setDoc((d) => ({ ...d, invoices: rows }))}
            columns={[
              { key: "trigger", label: "Trigger", width: "flex-1" },
              { key: "issue_date", label: "Issue date" },
              { key: "amount_cents", label: "Amount (USD)", money: true },
            ]}
            blank={{ trigger: "", issue_date: "", amount_cents: 0 }}
          />

          {/* The reconciliation, shown before the send is attempted. */}
          <div className="rounded-md border bg-slate-50 p-3 text-sm">
            <div className="flex justify-between">
              <span>Invoice schedule total</span>
              <span className="font-medium tabular-nums">{formatMoney(scheduled)}</span>
            </div>
            <div className="flex justify-between">
              <span>SOW one-time total</span>
              <span className="font-medium tabular-nums">{formatMoney(sowTotal)}</span>
            </div>
            {scheduled === sowTotal ? (
              <p className="mt-2 flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Reconciled.
              </p>
            ) : (
              <p className="mt-2 text-amber-800">
                These must be equal before the summary can be sent — they differ by{" "}
                {formatMoney(Math.abs(scheduled - sowTotal))}.
              </p>
            )}
          </div>

          {summary?.sent_at && !summary.confirmed_at && (
            <div className="flex flex-wrap items-end gap-3 rounded-md border border-sky-200 bg-sky-50 p-3">
              <div className="space-y-1">
                <Label className="text-xs">First invoice date (confirmed by invoicing)</Label>
                <Input
                  type="date"
                  value={firstInvoice}
                  onChange={(e) => setFirstInvoice(e.target.value)}
                />
              </div>
              <Button
                size="sm"
                onClick={() =>
                  confirm.mutate(firstInvoice || undefined, {
                    onSuccess: () => toast.success("Receipt recorded"),
                  })
                }
                disabled={confirm.isPending}
              >
                Record the confirmation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ChangeOrdersCard engagementId={engagement.id} />
    </div>
  )
}

function ChangeOrdersCard({ engagementId }: { engagementId: string }) {
  const { data: orders } = useChangeOrders(engagementId)
  const create = useCreateChangeOrder(engagementId)
  const signCo = useSignChangeOrder(engagementId)
  const [description, setDescription] = useState("")
  const [delta, setDelta] = useState("")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Change Orders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600">
          Any change to scope, deliverables, dates or fees needs a written Change
          Order signed by both parties <em>before</em> the changed work is done.
          Signing one puts a revised invoicing summary on the invoicing queue.
        </p>
        {create.isError && <Refusal error={create.error} title="The Change Order was not raised." />}

        {(orders ?? []).map((co) => (
          <div key={co.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
            <div>
              <span className="font-medium">{co.co_number}</span> — {co.description}
              <span className="ml-2 text-slate-500">
                {co.fee_delta_cents >= 0 ? "+" : ""}
                {formatMoney(co.fee_delta_cents)}
              </span>
            </div>
            {co.signed_at ? (
              <Badge variant="secondary">signed</Badge>
            ) : (
              <Button size="sm" variant="outline" onClick={() => signCo.mutate(co.id)}>
                Record signature
              </Button>
            )}
          </div>
        ))}

        <div className="grid gap-2 md:grid-cols-[1fr_12rem_auto]">
          <Text label="Description" value={description} onChange={setDescription} />
          <Text label="Fee delta (USD)" value={delta} onChange={setDelta} />
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() =>
                create.mutate(
                  { description, fee_delta_cents: toCents(delta) },
                  {
                    onSuccess: () => {
                      setDescription("")
                      setDelta("")
                      toast.success("Change Order raised")
                    },
                  },
                )
              }
              disabled={!description.trim() || create.isPending}
            >
              Raise
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Checklist tab (§10) ─────────────────────────────────────────

function ChecklistTab({ engagement }: { engagement: Engagement }) {
  const done = engagement.checklist.filter((c) => c.done).length
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          One-page checklist — {done} of {engagement.checklist.length}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-slate-600">
          Every row is computed from the record. Nothing here is hand-ticked — a
          checklist you can tick without doing the thing measures diligence, not
          progress.
        </p>
        <ul className="space-y-3">
          {engagement.checklist.map((row) => (
            <li key={row.key} className="flex items-start gap-3">
              {row.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
              )}
              <div>
                <p
                  className={`text-sm font-medium ${
                    row.done ? "text-slate-500 line-through" : "text-slate-900"
                  }`}
                >
                  {row.step}
                </p>
                <p className="text-xs text-slate-500">{row.done_when}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

// ─── Small field primitives ──────────────────────────────────────

function Text({
  label,
  value,
  onChange,
  type,
  placeholder,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  className?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">{label}</Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
    </div>
  )
}

function Area({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">{label}</Label>
      <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { key: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.key} value={o.key}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
      {label}
    </label>
  )
}

/** A comma-separated list, edited as text. */
function List({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">{label}</Label>
      <Input
        value={values.join(", ")}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      />
    </div>
  )
}

type RowColumn = { key: string; label: string; width?: string; money?: boolean }

/**
 * A small repeating-table editor for the SOW / invoicing line items.
 *
 * `T extends object` rather than `Record<string, unknown>`: the row types are
 * declared as interfaces (`SowFeeLine`, `InvoiceRow`, …), and a TypeScript
 * interface has no implicit index signature, so it is not assignable to a
 * `Record` constraint. Widening the constraint and reading through a narrow
 * helper keeps the call sites typed — the alternative, declaring the row types
 * as `type` aliases purely to satisfy this component, would bend the data model
 * around one editor.
 */
function Rows<T extends object>({
  label,
  rows,
  onChange,
  columns,
  blank,
}: {
  label: string
  rows: T[]
  onChange: (rows: T[]) => void
  columns: RowColumn[]
  blank: T
}) {
  const read = (row: T, key: string): unknown => (row as Record<string, unknown>)[key]
  const write = (row: T, key: string, value: unknown): T =>
    ({ ...row, [key]: value }) as T

  return (
    <div className="space-y-2">
      <Label className="text-xs text-slate-600">{label}</Label>
      {rows.map((row, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2">
          {columns.map((c) => (
            <div key={c.key} className={c.width ?? "w-40"}>
              <Input
                value={
                  c.money
                    ? centsToInput(read(row, c.key) as number)
                    : ((read(row, c.key) as string) ?? "")
                }
                placeholder={c.label}
                onChange={(e) =>
                  onChange(
                    rows.map((r, j) =>
                      j === i
                        ? write(
                            r,
                            c.key,
                            c.money ? toCents(e.target.value) : e.target.value,
                          )
                        : r,
                    ),
                  )
                }
              />
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...rows, { ...blank }])}>
        Add row
      </Button>
    </div>
  )
}
