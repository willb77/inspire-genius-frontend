/**
 * Administration → Client Sign-Up — the pipeline.
 *
 * The landing surface for
 * `docs/operations/IG_Client_Signup_and_SOW_Process.docx`: every open
 * opportunity, what stage it is at, what its next action is, and which ones
 * have gone quiet.
 *
 * Two things this page deliberately does NOT do:
 *
 * 1. It does not hard-code the stages. They come from
 *    `GET /v1/client-signup/process`, so the document has one implementation.
 * 2. It does not compute `at_risk` or the roll-up in the browser. Both are
 *    derived server-side from the same rules that gate the stage changes — a
 *    second implementation here would eventually disagree with the gate, and
 *    the screen would be the convincing half.
 */
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Briefcase,
  CalendarClock,
  Plus,
  RefreshCw,
  TrendingUp,
} from "lucide-react"

import {
  refusalMessages,
  useCreateEngagement,
  usePipeline,
  useProcessReference,
} from "@/hooks/super-admin/useClientSignup"
import type { EngagementListItem } from "@/types/client-signup"
import { formatMoney } from "@/lib/clientSignupMoney"

function stageTone(stage: string): string {
  if (stage === "closed_lost") return "bg-slate-100 text-slate-600"
  if (stage === "closed_won" || stage === "delivery" || stage === "complete") {
    return "bg-emerald-100 text-emerald-800"
  }
  if (stage === "proposal" || stage === "negotiation") {
    return "bg-amber-100 text-amber-800"
  }
  return "bg-sky-100 text-sky-800"
}

function isOverdue(due: string | null): boolean {
  if (!due) return false
  return due < new Date().toISOString().slice(0, 10)
}

export default function ClientSignup() {
  const navigate = useNavigate()
  const [stageFilter, setStageFilter] = useState<string>("open")
  const [createOpen, setCreateOpen] = useState(false)

  const filters = useMemo(
    () =>
      stageFilter === "open"
        ? { includeClosed: false }
        : stageFilter === "all"
          ? { includeClosed: true }
          : { stage: stageFilter },
    [stageFilter],
  )

  const { data: process } = useProcessReference()
  const { data, isLoading, isError, error, refetch, isFetching } = usePipeline(filters)

  const engagements = data?.engagements ?? []
  const summary = data?.summary

  return (
    <SuperAdminLayout>
      <div className="space-y-6 p-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
              <Briefcase className="h-6 w-6" />
              Client Sign-Up
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              From first contact to a signed SOW and an invoice. Each stage is gated
              on the checklist in the operating procedure — an opportunity cannot
              advance until what that stage requires is actually on file.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New opportunity
            </Button>
          </div>
        </header>

        {/* Roll-up. Open pipeline EXCLUDES won and lost — see summarize(). */}
        {summary && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <SummaryCard
              label="Open pipeline"
              value={formatMoney(summary.open_value_cents)}
              hint="Forecast, excluding won and lost"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <SummaryCard
              label="Won"
              value={formatMoney(summary.won_value_cents)}
              hint="Signed SOW totals"
            />
            <SummaryCard
              label="At risk"
              value={String(summary.at_risk)}
              hint={`No contact for ${process?.at_risk_business_days ?? 10} business days`}
              tone={summary.at_risk > 0 ? "warn" : undefined}
              icon={<AlertTriangle className="h-4 w-4" />}
            />
            <SummaryCard
              label="Overdue actions"
              value={String(summary.overdue_actions)}
              hint="Next action past its due date"
              tone={summary.overdue_actions > 0 ? "warn" : undefined}
              icon={<CalendarClock className="h-4 w-4" />}
            />
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle className="text-base">
              Opportunities
              {engagements.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  {engagements.length}
                </span>
              )}
            </CardTitle>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open only</SelectItem>
                <SelectItem value="all">All, including closed</SelectItem>
                {process?.stages.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                    {summary?.by_stage?.[s.key] ? ` (${summary.by_stage[s.key]})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton />
            ) : isError ? (
              /* An error must never render as an empty list — an honest-looking
                 empty state is the failure mode that hides everything else. */
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                <p className="font-medium">The pipeline could not be loaded.</p>
                <ul className="mt-2 list-inside list-disc">
                  {refusalMessages(error).map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </div>
            ) : engagements.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                No opportunities{stageFilter === "open" ? " are open" : ""} yet. Open a
                record the same day a prospect is identified — before the first meeting
                is scheduled.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-4 font-medium">Opportunity</th>
                      <th className="py-2 pr-4 font-medium">Stage</th>
                      <th className="py-2 pr-4 text-right font-medium">Value</th>
                      <th className="py-2 pr-4 font-medium">Close</th>
                      <th className="py-2 pr-4 font-medium">Next action</th>
                      <th className="py-2 font-medium">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engagements.map((e) => (
                      <EngagementRow
                        key={e.id}
                        engagement={e}
                        onOpen={() => navigate(`/super-admin/client-signup/${e.id}`)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <NewEngagementDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => navigate(`/super-admin/client-signup/${id}`)}
      />
    </SuperAdminLayout>
  )
}

function SummaryCard({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string
  value: string
  hint: string
  tone?: "warn"
  icon?: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
          {icon}
          {label}
        </div>
        <p
          className={`mt-1 text-2xl font-semibold ${
            tone === "warn" ? "text-amber-700" : "text-slate-900"
          }`}
        >
          {value}
        </p>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      </CardContent>
    </Card>
  )
}

function EngagementRow({
  engagement,
  onOpen,
}: {
  engagement: EngagementListItem
  onOpen: () => void
}) {
  const overdue = isOverdue(engagement.next_action_due)
  return (
    <tr
      className="cursor-pointer border-b last:border-0 hover:bg-slate-50"
      onClick={onOpen}
    >
      <td className="py-3 pr-4">
        <div className="font-medium text-slate-900">{engagement.opportunity_name}</div>
        {engagement.at_risk && (
          <span className="mt-1 inline-flex items-center gap-1 text-xs text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            At risk — no contact logged
          </span>
        )}
      </td>
      <td className="py-3 pr-4">
        <Badge className={stageTone(engagement.stage)} variant="secondary">
          {engagement.stage_label}
        </Badge>
      </td>
      <td className="py-3 pr-4 text-right tabular-nums text-slate-700">
        {formatMoney(engagement.estimated_value_cents)}
      </td>
      <td className="py-3 pr-4 text-slate-600">
        {engagement.expected_close_date ?? "—"}
      </td>
      <td className="py-3 pr-4">
        {engagement.next_action ? (
          <>
            <div className="text-slate-700">{engagement.next_action}</div>
            {engagement.next_action_due && (
              <div className={`text-xs ${overdue ? "text-red-700" : "text-slate-500"}`}>
                due {engagement.next_action_due}
                {overdue ? " — overdue" : ""}
              </div>
            )}
          </>
        ) : (
          /* §3: "There is always a next action until Closed." */
          <span className="text-xs text-amber-700">No next action set</span>
        )}
      </td>
      <td className="py-3 text-xs text-slate-500">{engagement.owner_email}</td>
    </tr>
  )
}

/**
 * Opening a record asks only for the Lead-stage fields.
 *
 * §3 says the record is opened the same day a prospect is identified, before
 * the first meeting is scheduled. A create form demanding qualification data
 * would guarantee the record is opened late, or not at all — so the rest is
 * filled in on the record itself, and the stage gate is what insists on it.
 */
function NewEngagementDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
}) {
  const { data: process } = useProcessReference()
  const createEngagement = useCreateEngagement()
  const [form, setForm] = useState({
    company_name: "",
    company_website: "",
    primary_contact_name: "",
    primary_contact_email: "",
    industry: "",
    lead_source: "",
    service_line: "",
    next_action: "",
    next_action_due: "",
  })

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }))

  const submit = () => {
    createEngagement.mutate(
      {
        company_name: form.company_name.trim(),
        company_website: form.company_website || null,
        primary_contact_name: form.primary_contact_name || null,
        primary_contact_email: form.primary_contact_email || null,
        industry: form.industry || null,
        lead_source: form.lead_source || null,
        service_line: form.service_line || null,
        next_action: form.next_action || null,
        next_action_due: form.next_action_due || null,
      },
      {
        onSuccess: (engagement) => {
          toast.success(`Opened ${engagement.opportunity_name}`)
          onOpenChange(false)
          onCreated(engagement.id)
        },
        onError: (err) =>
          toast.error(refusalMessages(err).join(" · ")),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New opportunity</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Company name" required>
            <Input
              value={form.company_name}
              onChange={(e) => set("company_name")(e.target.value)}
              placeholder="Seaside Resort"
            />
          </Field>
          <Field label="Website">
            <Input
              value={form.company_website}
              onChange={(e) => set("company_website")(e.target.value)}
              placeholder="seasideresort.com"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Primary contact">
              <Input
                value={form.primary_contact_name}
                onChange={(e) => set("primary_contact_name")(e.target.value)}
              />
            </Field>
            <Field label="Contact email">
              <Input
                type="email"
                value={form.primary_contact_email}
                onChange={(e) => set("primary_contact_email")(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Industry">
              <Select value={form.industry} onValueChange={set("industry")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {(process?.industries ?? []).map((i) => (
                    <SelectItem key={i} value={i}>
                      {i.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Lead source">
              <Select value={form.lead_source} onValueChange={set("lead_source")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {(process?.lead_sources ?? []).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Product / service line">
            <Select value={form.service_line} onValueChange={set("service_line")}>
              <SelectTrigger>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {(process?.service_lines ?? []).map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Next action">
              <Input
                value={form.next_action}
                onChange={(e) => set("next_action")(e.target.value)}
                placeholder="Book the fit call"
              />
            </Field>
            <Field label="Due">
              <Input
                type="date"
                value={form.next_action_due}
                onChange={(e) => set("next_action_due")(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!form.company_name.trim() || createEngagement.isPending}
          >
            {createEngagement.isPending ? "Opening…" : "Open record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-600">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </Label>
      {children}
    </div>
  )
}
