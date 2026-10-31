/**
 * "Join a manager's team" — a member asks a manager, by exact email, to add
 * them to that manager's team (MMLR-5). Rendered inside the sharing panel, so
 * it appears on the Goals sharing page and in Settings → Privacy alike.
 *
 * The server decides whether the feature exists for this member: the list
 * answers 404 when it does not, and then this card renders nothing at all.
 * So does any other failure of the FIRST read — a note about a feature most
 * people do not have would sit on every sharing page. Once the list has been
 * read, a failed refresh keeps it on screen and says so, so a member who does
 * have the feature is never shown a silent empty list.
 *
 * Every send gets the same answer, whoever the address belongs to: the list
 * never says whether an address is a manager's, and neither does this card.
 * Nothing is shared by asking; what is ticked is shared only if they accept.
 *
 * The card sits in its own error boundary: a fault here blanks the card, never
 * the sharing panel around it.
 */
import { useContext, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Users } from "lucide-react"
import { Card } from "@/pages/summit/components/ui"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { AuthContext } from "@/context/auth-context"
import { ROLES } from "@/constants/routes"
import { usePeople, useRevokeGrant } from "@/hooks/consent/useVisibility"
import {
  useCreateLinkRequest,
  useLeaveTeam,
  useLinkRequestAction,
  useMyLinkRequests,
} from "@/hooks/summit/useLinkRequests"
import type { MemberLinkRequest } from "@/services/manager/development/growthService"
import {
  codeOf,
  LINK_REQUEST_CATEGORIES as OFFER_CATEGORIES,
  memberStatusLabel,
  NO_SHARE_FOUND,
  REFRESH_FAILED,
  SENT_MESSAGE,
  shortDate as formatDate,
  statusOf,
} from "./linkRequestCopy"

const OFFER_KEYS = OFFER_CATEGORIES.map((c) => c.key) as [string, ...string[]]

const askSchema = z.object({
  managerEmail: z.string().trim().pipe(z.email("Enter their exact email address.")),
  categories: z.array(z.enum(OFFER_KEYS)),
})
type AskInput = z.input<typeof askSchema>
type AskOutput = z.output<typeof askSchema>

function askErrorText(err: unknown): string {
  const code = codeOf(err)
  if (code === "already_on_a_team") return "You're already on a team. Leave it first to join another."
  if (code === "members_only") return "Only members can ask to join a team."
  if (statusOf(err) === 422) return "One of those choices can't be shared. Nothing was sent."
  if (statusOf(err) === 404) return "Asking to join a team isn't available for your account right now. Nothing was sent."
  return "That didn't send. Nothing was sent — try again."
}

type Notice = { tone: "ok" | "error"; text: string }

function NoticeLine({ notice }: { notice: Notice | null }) {
  if (!notice) return null
  return (
    <p
      role={notice.tone === "ok" ? "status" : "alert"}
      className={notice.tone === "ok" ? "mt-2 text-[12.5px] text-[#5B8A72]" : "mt-2 text-[12.5px] text-[#C2614F]"}
    >
      {notice.text}
    </p>
  )
}

function AskForm() {
  const create = useCreateLinkRequest()
  const [notice, setNotice] = useState<Notice | null>(null)
  const form = useForm<AskInput, unknown, AskOutput>({
    resolver: zodResolver(askSchema),
    defaultValues: { managerEmail: "", categories: [] },
  })

  const onSubmit = form.handleSubmit((values) => {
    setNotice(null)
    create.mutate(values, {
      onSuccess: () => {
        setNotice({ tone: "ok", text: SENT_MESSAGE })
        form.reset({ managerEmail: "", categories: [] })
      },
      onError: (err) => setNotice({ tone: "error", text: askErrorText(err) }),
    })
  })

  const emailError = form.formState.errors.managerEmail?.message

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-3" noValidate>
      <Input
        type="email"
        placeholder="manager@example.com"
        aria-label="Manager's email address"
        className="h-9"
        {...form.register("managerEmail")}
      />
      {emailError && <p className="text-[12px] text-[#C2614F]">{emailError}</p>}
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-[12.5px] font-semibold text-[#13294B]">
          Share with them if they accept (optional)
        </legend>
        <Controller
          control={form.control}
          name="categories"
          render={({ field }) => (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {OFFER_CATEGORIES.map((c) => {
                const checked = (field.value ?? []).includes(c.key)
                return (
                  <label key={c.key} className="flex items-center gap-2 text-[12.5px] text-[#13294B]">
                    <Checkbox
                      checked={checked}
                      aria-label={`Share ${c.label} if they accept`}
                      onCheckedChange={(on) => {
                        const rest = (field.value ?? []).filter((k) => k !== c.key)
                        field.onChange(on === true ? [...rest, c.key] : rest)
                      }}
                    />
                    {c.label}
                  </label>
                )
              })}
            </div>
          )}
        />
        <p className="text-[12px] text-[#13294B]/70">Shared only if they accept.</p>
      </fieldset>
      <div>
        <Button type="submit" size="sm" className="h-9" disabled={create.isPending}>
          {create.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          Send request
        </Button>
      </div>
      <NoticeLine notice={notice} />
    </form>
  )
}

function RequestRow({ row }: { row: MemberLinkRequest }) {
  const act = useLinkRequestAction()
  const leave = useLeaveTeam()
  const revoke = useRevokeGrant()
  const people = usePeople()
  const [confirming, setConfirming] = useState(false)
  const [stopSharing, setStopSharing] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)

  const busy = act.isPending || leave.isPending || revoke.isPending
  const label = memberStatusLabel(row.status)
  const approved = row.status === "approved"
  const shareNotApplied =
    approved && row.categories.length > 0 && (row.grantOutcome === null || row.grantOutcome === "failed")
  const date =
    row.status === "pending" ? `Asked ${formatDate(row.createdAt)}` : approved && row.decidedAt ? `Added ${formatDate(row.decidedAt)}` : ""

  const run = (action: "withdraw" | "share") => {
    setNotice(null)
    act.mutate(
      { id: row.id, action },
      {
        onError: () =>
          setNotice({
            tone: "error",
            text: action === "share" ? "Sharing still wasn't applied — try again later." : "That didn't withdraw — try again.",
          }),
      },
    )
  }

  const confirmLeave = async () => {
    setNotice(null)
    // Find the share BEFORE leaving: leaving refreshes the people list, and
    // the team link may be the reason this person is on it.
    const typed = row.requestedEmail.toLowerCase()
    const person = (people.data?.people ?? []).find((p) => (p.email ?? "").toLowerCase() === typed)
    const grantId = person?.grant?.status === "granted" ? person.grant.id : null
    try {
      await leave.mutateAsync()
    } catch (err) {
      setNotice({
        tone: "error",
        text:
          codeOf(err) === "ask_your_manager"
            ? "Your manager added you to this team, so only they can remove you."
            : "That didn't work. You're still on the team — try again.",
      })
      return
    }
    setConfirming(false)
    if (!stopSharing) {
      setNotice({ tone: "ok", text: "You've left the team." })
      return
    }
    if (!grantId) {
      setNotice({ tone: "error", text: `You've left the team. ${NO_SHARE_FOUND}` })
      return
    }
    try {
      await revoke.mutateAsync(grantId)
      setNotice({ tone: "ok", text: "You've left the team and stopped sharing with them." })
    } catch {
      setNotice({ tone: "error", text: "You've left the team, but sharing wasn't stopped — use the switches above." })
    }
  }

  return (
    <li className="flex flex-col gap-1.5 border-b border-[#F1ECE2] py-3 last:border-b-0" data-testid={`link-request-${row.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[#0B1B33]">{row.requestedEmail}</span>
        <span className="rounded-full bg-[#1D3A66]/[0.07] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#13294B]" data-testid={`link-status-${row.id}`}>
          {label}
        </span>
        {date && <span className="text-[11.5px] text-[#7C93B5]">{date}</span>}
      </div>
      {shareNotApplied && <p className="text-[12.5px] text-[#A9720F]">Sharing wasn&apos;t applied.</p>}
      <div className="flex flex-wrap items-center gap-2">
        {row.status === "pending" && (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => run("withdraw")}>
            Withdraw
          </Button>
        )}
        {shareNotApplied && (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => run("share")}>
            Try again
          </Button>
        )}
        {approved && !confirming && (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setConfirming(true)}>
            Leave team
          </Button>
        )}
        {busy && <Loader2 className="h-4 w-4 animate-spin text-[#7C93B5]" aria-hidden />}
      </div>
      {approved && confirming && (
        <div className="flex flex-col gap-2 rounded-xl bg-[#FBF7F0] px-3 py-2.5">
          <label className="flex items-center gap-2 text-[12.5px] text-[#13294B]">
            <Checkbox checked={stopSharing} onCheckedChange={(on) => setStopSharing(on === true)} aria-label="Also stop sharing with them?" />
            Also stop sharing with them?
          </label>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={confirmLeave}>
              Leave team
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
              Keep
            </Button>
          </div>
        </div>
      )}
      <NoticeLine notice={notice} />
    </li>
  )
}

function LinkRequestCardBody() {
  const auth = useContext(AuthContext)
  const isMember = auth?.hasRole(ROLES.USER) === true
  const mine = useMyLinkRequests(isMember)

  if (!isMember) return null
  // 404: the feature is not on for this member. Hidden, whenever it arrives.
  if (mine.isError && statusOf(mine.error) === 404) return null
  // Still loading, or the first read failed: nothing — see the header comment.
  if (mine.data === undefined) return null

  const rows = mine.data
  const refreshFailed = mine.isError

  return (
    <Card className="!p-[19px]" testId="link-request-card">
      <div className="flex items-center gap-2 text-[15px] font-bold text-[#0B1B33]">
        <Users className="h-4 w-4 text-[#127A8A]" aria-hidden /> Join a manager&apos;s team
      </div>
      <p className="mt-1 text-[13px] text-[#13294B]/75">
        Ask a manager to add you to their team, by their exact email address. Nothing is shared by
        asking.
      </p>
      <AskForm />
      {refreshFailed && (
        <p className="mt-3 text-[12.5px] text-[#A9720F]" data-testid="link-request-refresh-failed">
          {REFRESH_FAILED}
        </p>
      )}
      {rows.length > 0 && (
        <div className="mt-3">
          <div className="text-[13px] font-bold text-[#0B1B33]">My requests</div>
          <ul className="mt-1">
            {rows.map((r) => (
              <RequestRow key={r.id} row={r} />
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

export function MemberLinkRequestCard() {
  return (
    <ErrorBoundary fallback={() => null}>
      <LinkRequestCardBody />
    </ErrorBoundary>
  )
}
