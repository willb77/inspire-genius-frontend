/**
 * Broadcast Alert composer (super-admin, allowlist-gated).
 *
 * Compose a branded, severity-tiered HTML message, target recipients by role
 * group and/or named individuals (include + exclude), preview the resolved
 * recipient count, and send — fanning the message out as in-app notifications.
 * The owner (willb77@3pp.com) additionally manages who else has access.
 */
import { useMemo, useState } from "react"
import { AlertTriangle, Send, Users, ShieldCheck, Trash2, Loader2, Mail } from "lucide-react"
import { toast } from "sonner"

import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/useAuth"
import RichHtmlEditor from "@/components/super-admin/broadcast/RichHtmlEditor"
import { buildBrandedHtml, SEVERITY_META } from "@/lib/broadcastTemplate"
import { sanitizeBodyHtml } from "@/lib/sanitizeHtml"
import {
  useAddBroadcastAdmin,
  useBroadcastAccess,
  useBroadcastAdmins,
  useBroadcastHistory,
  usePreviewAudience,
  useRemoveBroadcastAdmin,
  useSendBroadcast,
} from "@/hooks/super-admin/useBroadcast"
import {
  BROADCAST_ROLES,
  EMPTY_AUDIENCE,
  SEVERITIES,
  type AudienceSpec,
  type BroadcastRole,
  type Severity,
} from "@/types/broadcast"

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"))
}

export default function BroadcastAlert() {
  const { user } = useAuth()
  const access = useBroadcastAccess()
  const authorized = access.data?.authorized ?? false
  const isOwner = access.data?.is_owner ?? false

  if (access.isLoading) {
    return (
      <SuperAdminLayout>
        <div className="flex h-64 items-center justify-center text-[#6b7280]">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Checking access…
        </div>
      </SuperAdminLayout>
    )
  }

  if (!authorized) {
    return (
      <SuperAdminLayout>
        <div className="mx-auto mt-10 max-w-lg rounded-xl border border-[#e5e7eb] bg-white p-8 text-center">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-[#9ca3af]" />
          <h1 className="mb-2 text-lg font-semibold text-[#111827]">Broadcast Alerts</h1>
          <p className="text-sm text-[#6b7280]">
            You don&apos;t have access to the platform alert tool. Access is granted by the
            platform owner (<span className="font-medium">willb77@3pp.com</span>).
          </p>
          {user?.email && (
            <p className="mt-3 text-xs text-[#9ca3af]">Signed in as {user.email}</p>
          )}
        </div>
      </SuperAdminLayout>
    )
  }

  return (
    <SuperAdminLayout>
      <Composer isOwner={isOwner} />
    </SuperAdminLayout>
  )
}

function Composer({ isOwner }: { isOwner: boolean }) {
  const [title, setTitle] = useState("")
  const [severity, setSeverity] = useState<Severity>("info")
  const [body, setBody] = useState("")
  const [audience, setAudience] = useState<AudienceSpec>(EMPTY_AUDIENCE)
  const [includeEmailsRaw, setIncludeEmailsRaw] = useState("")
  const [excludeEmailsRaw, setExcludeEmailsRaw] = useState("")
  const [sendEmail, setSendEmail] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const previewMut = usePreviewAudience()
  const sendMut = useSendBroadcast()
  const history = useBroadcastHistory(true)

  const resolvedAudience: AudienceSpec = useMemo(
    () => ({
      ...audience,
      include_emails: parseEmails(includeEmailsRaw),
      exclude_emails: parseEmails(excludeEmailsRaw),
    }),
    [audience, includeEmailsRaw, excludeEmailsRaw],
  )

  const audienceEmpty =
    !resolvedAudience.all &&
    resolvedAudience.include_roles.length === 0 &&
    resolvedAudience.include_emails.length === 0

  const brandedHtml = useMemo(
    () => buildBrandedHtml(severity, title || "Untitled alert", sanitizeBodyHtml(body || "<p></p>")),
    [severity, title, body],
  )

  function toggleRole(list: "include_roles" | "exclude_roles", role: BroadcastRole) {
    setAudience((a) => {
      const has = a[list].includes(role)
      return { ...a, [list]: has ? a[list].filter((r) => r !== role) : [...a[list], role] }
    })
  }

  async function runPreview() {
    try {
      await previewMut.mutateAsync(resolvedAudience)
    } catch {
      toast.error("Could not resolve recipients")
    }
  }

  function openConfirm() {
    if (!title.trim()) return toast.error("Add a title")
    if (!sanitizeBodyHtml(body).replace(/<[^>]*>/g, "").trim()) return toast.error("Add a message body")
    if (audienceEmpty) return toast.error("Select at least one recipient group or individual")
    setConfirmOpen(true)
  }

  async function doSend() {
    setConfirmOpen(false)
    try {
      const res = await sendMut.mutateAsync({
        title: title.trim(),
        severity,
        html_body: brandedHtml,
        audience: resolvedAudience,
        send_email: sendEmail,
      })
      const emailNote =
        res.email_requested && typeof res.email_sent_count === "number"
          ? ` · ${res.email_sent_count} email${res.email_sent_count === 1 ? "" : "s"} sent`
          : ""
      toast.success(
        `Alert sent to ${res.recipient_count} recipient${res.recipient_count === 1 ? "" : "s"}${emailNote}`,
      )
      setTitle("")
      setBody("")
      setAudience(EMPTY_AUDIENCE)
      setIncludeEmailsRaw("")
      setExcludeEmailsRaw("")
      setSendEmail(false)
      previewMut.reset()
    } catch {
      toast.error("Failed to send alert")
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#111827]">Broadcast Alerts</h1>
        <p className="text-sm text-[#6b7280]">
          Send a branded, severity-tiered alert to any set of platform users.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ─── Left: compose ─── */}
        <div className="space-y-4">
          <Card className="space-y-4 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scheduled maintenance tonight"
                maxLength={200}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#374151]">Severity</label>
              <div className="flex flex-wrap gap-2">
                {SEVERITIES.map((s) => {
                  const meta = SEVERITY_META[s]
                  const active = severity === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeverity(s)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                        active ? "text-white" : "bg-white text-[#374151] hover:bg-[#f9fafb]",
                      )}
                      style={active ? { backgroundColor: meta.color, borderColor: meta.color } : { borderColor: "#e5e7eb" }}
                    >
                      <span>{meta.emoji}</span>
                      {meta.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-[#374151]">Message</label>
              <RichHtmlEditor value={body} onChange={setBody} />
            </div>
          </Card>

          <AudienceBuilder
            audience={audience}
            resolved={resolvedAudience}
            includeEmailsRaw={includeEmailsRaw}
            excludeEmailsRaw={excludeEmailsRaw}
            onToggleAll={(v) => setAudience((a) => ({ ...a, all: v }))}
            onToggleRole={toggleRole}
            onIncludeEmails={setIncludeEmailsRaw}
            onExcludeEmails={setExcludeEmailsRaw}
            onPreview={runPreview}
            previewing={previewMut.isPending}
            previewCount={previewMut.data?.count}
            previewSample={previewMut.data?.sample}
          />

          <Card className="p-4">
            <label className="flex items-start gap-2 text-sm text-[#374151]">
              <Checkbox checked={sendEmail} onCheckedChange={(v) => setSendEmail(Boolean(v))} className="mt-0.5" />
              <span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Mail className="h-4 w-4 text-[#6b7280]" /> Also send as email
                </span>
                <span className="mt-0.5 block text-xs text-[#9ca3af]">
                  Emails the same branded message to each recipient via SES (in addition to the in-app alert).
                </span>
              </span>
            </label>
          </Card>

          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9ca3af]">
              {previewMut.data ? `${previewMut.data.count} recipient(s) resolved` : "Preview to see recipient count"}
            </p>
            <Button onClick={openConfirm} disabled={sendMut.isPending} className="gap-2">
              {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send alert
            </Button>
          </div>
        </div>

        {/* ─── Right: preview + history (+ access) ─── */}
        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-[#e5e7eb] px-4 py-2 text-sm font-medium text-[#374151]">
              Live preview
            </div>
            <iframe
              title="Alert preview"
              srcDoc={brandedHtml}
              sandbox=""
              className="h-[420px] w-full border-0 bg-[#f4f5f7]"
            />
          </Card>

          {isOwner && <AccessPanel />}

          <Card className="p-4">
            <h2 className="mb-2 text-sm font-semibold text-[#374151]">Recent broadcasts</h2>
            {history.data && history.data.length > 0 ? (
              <ul className="divide-y divide-[#f3f4f6]">
                {history.data.map((b) => (
                  <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span>{SEVERITY_META[b.severity]?.emoji}</span>
                      <span className="font-medium text-[#111827]">{b.title}</span>
                    </div>
                    <span className="text-xs text-[#9ca3af]">{b.recipient_count} sent</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#9ca3af]">No broadcasts yet.</p>
            )}
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" style={{ color: SEVERITY_META[severity].color }} />
              Send this alert?
            </AlertDialogTitle>
            <AlertDialogDescription>
              A <strong>{SEVERITY_META[severity].label}</strong> alert titled &ldquo;{title}&rdquo; will be
              delivered to{" "}
              <strong>{previewMut.data ? `${previewMut.data.count} recipient(s)` : "the selected audience"}</strong>
              {sendEmail ? " as an in-app alert and an email" : " as an in-app alert"}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doSend}>Send now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

type AudienceBuilderProps = {
  audience: AudienceSpec
  resolved: AudienceSpec
  includeEmailsRaw: string
  excludeEmailsRaw: string
  onToggleAll: (v: boolean) => void
  onToggleRole: (list: "include_roles" | "exclude_roles", role: BroadcastRole) => void
  onIncludeEmails: (v: string) => void
  onExcludeEmails: (v: string) => void
  onPreview: () => void
  previewing: boolean
  previewCount?: number
  previewSample?: { email: string; role: string }[]
}

function AudienceBuilder(props: AudienceBuilderProps) {
  const { audience } = props
  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-[#6b7280]" />
        <h2 className="text-sm font-semibold text-[#374151]">Recipients</h2>
      </div>

      <label className="flex items-center gap-2 text-sm text-[#374151]">
        <Checkbox checked={audience.all} onCheckedChange={(v) => props.onToggleAll(Boolean(v))} />
        <span className="font-medium">Everyone on the platform</span>
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">
            {audience.all ? "Groups (already included)" : "Include groups"}
          </p>
          <div className="space-y-1.5">
            {BROADCAST_ROLES.map((r) => (
              <label key={r.value} className={cn("flex items-center gap-2 text-sm", audience.all && "opacity-50")}>
                <Checkbox
                  checked={audience.include_roles.includes(r.value)}
                  disabled={audience.all}
                  onCheckedChange={() => props.onToggleRole("include_roles", r.value)}
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">Exclude groups</p>
          <div className="space-y-1.5">
            {BROADCAST_ROLES.map((r) => (
              <label key={r.value} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={audience.exclude_roles.includes(r.value)}
                  onCheckedChange={() => props.onToggleRole("exclude_roles", r.value)}
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">
            Include individuals (emails)
          </label>
          <Textarea
            value={props.includeEmailsRaw}
            onChange={(e) => props.onIncludeEmails(e.target.value)}
            placeholder="jane@acme.com, john@acme.com"
            className="h-20 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">
            Exclude individuals (emails)
          </label>
          <Textarea
            value={props.excludeEmailsRaw}
            onChange={(e) => props.onExcludeEmails(e.target.value)}
            placeholder="ceo@acme.com"
            className="h-20 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={props.onPreview} disabled={props.previewing}>
          {props.previewing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
          Preview recipients
        </Button>
        {typeof props.previewCount === "number" && (
          <Badge variant="secondary" className="text-xs">
            {props.previewCount} recipient(s)
          </Badge>
        )}
      </div>

      {props.previewSample && props.previewSample.length > 0 && (
        <div className="rounded-md bg-[#f9fafb] p-2 text-xs text-[#6b7280]">
          {props.previewSample.slice(0, 8).map((s) => s.email).join(", ")}
          {props.previewCount && props.previewCount > 8 ? ` +${props.previewCount - 8} more` : ""}
        </div>
      )}
    </Card>
  )
}

function AccessPanel() {
  const admins = useBroadcastAdmins(true)
  const addMut = useAddBroadcastAdmin()
  const removeMut = useRemoveBroadcastAdmin()
  const [email, setEmail] = useState("")

  async function add() {
    const e = email.trim().toLowerCase()
    if (!e.includes("@")) return toast.error("Enter a valid email")
    try {
      await addMut.mutateAsync(e)
      setEmail("")
      toast.success(`Granted access to ${e}`)
    } catch {
      toast.error("Could not grant access")
    }
  }

  async function remove(e: string) {
    try {
      await removeMut.mutateAsync(e)
      toast.success(`Revoked access for ${e}`)
    } catch {
      toast.error("Could not revoke access")
    }
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[#6b7280]" />
        <h2 className="text-sm font-semibold text-[#374151]">Manage access (owner only)</h2>
      </div>
      <ul className="divide-y divide-[#f3f4f6]">
        {admins.data?.map((a) => (
          <li key={a.email} className="flex items-center justify-between py-2 text-sm">
            <span className="text-[#111827]">{a.email}</span>
            {a.is_owner ? (
              <Badge variant="secondary" className="text-xs">
                owner
              </Badge>
            ) : (
              <button
                type="button"
                onClick={() => remove(a.email)}
                className="flex items-center gap-1 text-xs text-[#EF4444] hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" /> Revoke
              </button>
            )}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="super-admin email to grant"
          className="text-sm"
        />
        <Button type="button" size="sm" onClick={add} disabled={addMut.isPending}>
          Grant
        </Button>
      </div>
    </Card>
  )
}
