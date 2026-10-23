import { useEffect, useState } from "react"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ProfileView } from "@/components/career-pathways/ProfileView"
import { FitCard, FitEmptyState, FitLoading, FitPageHeader, FitSectionTitle } from "@/components/fit/primitives"
import {
  useApproveSnapshot,
  useCareerPathwaysDraft,
  useCareerPathwaysRecipients,
  useCareerPathwaysShares,
  useCareerPathwaysSnapshots,
  useCareerPathwaysStatus,
  useCreateShare,
  useCreateSnapshot,
  useDownloadSnapshot,
  useRevokeShare,
} from "@/hooks/career-pathways/useCareerPathways"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import type { FileFormat, SectionName, Share, Snapshot } from "@/types/careerPathways"

/**
 * N-8 — the candidate's Career Pathways Profile (dark behind the server's
 * `career_pathways_profile` switch; while it is off this page says so and
 * calls nothing else).
 *
 * Build it, tick what goes in, approve the frozen copy, download it, and share
 * it with a recipient from the list (never a typed address) after reading the
 * consent text, which comes from the server. Every share shows its opens and
 * refusals and can be withdrawn in one click.
 */

const SECTION_LABEL: Record<SectionName, string> = {
  identity: "Your name",
  prism: "PRISM highlights",
  fit: "Fit with validated roles",
  pathway: "Suggested roles and gaps to close",
  goals: "Goals you choose",
  practice: "Interview practice",
}

const OUTCOME_LABEL: Record<string, string> = {
  code_sent: "Code sent",
  opened: "Opened",
  downloaded: "Downloaded",
  bad_code: "Wrong code",
  code_expired: "Code expired",
  code_limit: "Too many codes",
  expired: "Refused: link expired",
  revoked: "Refused: link withdrawn",
  capped: "Refused: open limit reached",
  disabled: "Refused: sharing turned off",
}

const STATUS_LABEL: Record<Share["status"], string> = {
  live: "Live",
  revoked: "Withdrawn",
  expired: "Expired",
  used_up: "Open limit reached",
}

function Composer() {
  const draft = useCareerPathwaysDraft(true)
  const create = useCreateSnapshot()
  const [sections, setSections] = useState<SectionName[] | null>(null)
  const [goalIds, setGoalIds] = useState<string[]>([])
  const [includeEmail, setIncludeEmail] = useState(false)

  useEffect(() => {
    if (draft.data && sections === null) setSections(draft.data.defaultSections)
  }, [draft.data, sections])

  if (draft.isLoading) return <FitLoading label="Gathering your profile…" />
  if (draft.isError || !draft.data)
    return <FitEmptyState>{apiErrorMessage(draft.error, "Your profile could not be gathered just now.")}</FitEmptyState>

  const chosen = sections ?? draft.data.defaultSections
  const goals = draft.data.profile.sections.goals
  const goalList = goals && goals.available ? goals.goals : []
  const toggle = (name: SectionName) =>
    setSections(chosen.includes(name) ? chosen.filter((s) => s !== name) : [...chosen, name])

  return (
    <FitCard className="mb-6">
      <FitSectionTitle>What goes in</FitSectionTitle>
      <p className="mb-3 text-sm text-[#6b7280]">
        Tick what you want in this profile. Only what you tick is saved; you see the exact copy before
        anything is shared.
      </p>
      <div className="mb-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {draft.data.sectionOrder
          .filter((n) => n !== "identity")
          .map((name) => (
            <label key={name} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={chosen.includes(name)} onChange={() => toggle(name)} />
              {SECTION_LABEL[name]}
            </label>
          ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={includeEmail} onChange={() => setIncludeEmail(!includeEmail)} />
          Include my email address
        </label>
      </div>
      {chosen.includes("goals") && (
        <div className="mb-3">
          <p className="mb-1 text-sm font-medium">Which goals</p>
          {goalList.length === 0 ? (
            <p className="text-sm text-[#6b7280]">You have no published goals yet.</p>
          ) : (
            goalList.map((g) => (
              <label key={g.goalId} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={goalIds.includes(g.goalId)}
                  onChange={() =>
                    setGoalIds(goalIds.includes(g.goalId) ? goalIds.filter((x) => x !== g.goalId) : [...goalIds, g.goalId])
                  }
                />
                {g.title}
              </label>
            ))
          )}
        </div>
      )}
      <details className="mb-3">
        <summary className="cursor-pointer text-sm text-[#0D9488]">Preview everything available</summary>
        <div className="mt-2">
          <ProfileView content={draft.data.profile} />
        </div>
      </details>
      {create.isError && (
        <p role="alert" className="mb-2 text-sm text-red-700">
          {apiErrorMessage(create.error, "The profile could not be saved.")}
        </p>
      )}
      <Button
        disabled={create.isPending}
        onClick={() => create.mutate({ sections: chosen, goalIds, includeEmail })}
      >
        Save this profile
      </Button>
    </FitCard>
  )
}

function ShareForm({ snapshot, onDone }: { snapshot: Snapshot; onDone: () => void }) {
  const list = useCareerPathwaysRecipients(true)
  const share = useCreateShare()
  const [recipientId, setRecipientId] = useState("")
  const [days, setDays] = useState<number | null>(null)
  const [opens, setOpens] = useState<number | null>(null)
  const [allowDownload, setAllowDownload] = useState(false)
  const [agreed, setAgreed] = useState(false)

  if (list.isLoading) return <FitLoading label="Loading recipients…" />
  if (list.isError || !list.data)
    return <p role="alert" className="text-sm text-red-700">{apiErrorMessage(list.error, "Recipients could not be loaded.")}</p>
  const { recipients, consent, limits } = list.data
  if (recipients.length === 0)
    return <p className="text-sm text-[#6b7280]">There is nobody you can share with yet.</p>

  const d = days ?? limits.defaultDays
  const o = opens ?? limits.defaultOpens
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-[#e5e7eb] p-3" data-testid="share-form">
      <label className="block text-sm">
        Share with
        <select
          className="mt-1 block w-full rounded border border-[#e5e7eb] p-1.5"
          value={recipientId}
          onChange={(e) => setRecipientId(e.target.value)}
        >
          <option value="">Choose a recipient</option>
          {recipients.map((r) => (
            <option key={r.id} value={r.id}>
              {r.organisation} — {r.contactName}
              {r.isTest ? " (test)" : ""}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-3">
        <label className="text-sm">
          Days the link works
          <input
            type="number"
            min={1}
            max={limits.maxDays}
            value={d}
            onChange={(e) => setDays(Math.max(1, Math.min(limits.maxDays, Number(e.target.value) || 1)))}
            className="ml-2 w-16 rounded border border-[#e5e7eb] p-1"
          />
        </label>
        <label className="text-sm">
          Opens allowed
          <input
            type="number"
            min={1}
            max={limits.maxOpens}
            value={o}
            onChange={(e) => setOpens(Math.max(1, Math.min(limits.maxOpens, Number(e.target.value) || 1)))}
            className="ml-2 w-16 rounded border border-[#e5e7eb] p-1"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={allowDownload} onChange={() => setAllowDownload(!allowDownload)} />
        Let them download a copy (a downloaded copy cannot be withdrawn)
      </label>
      <div className="rounded bg-[#f9fafb] p-2 text-xs text-[#374151]" data-testid="consent-text">
        {consent.text}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={agreed} onChange={() => setAgreed(!agreed)} />I agree
      </label>
      {share.isError && (
        <p role="alert" className="text-sm text-red-700">{apiErrorMessage(share.error, "Nothing was shared.")}</p>
      )}
      <Button
        disabled={!recipientId || !agreed || share.isPending}
        onClick={() =>
          share.mutate(
            {
              snapshotId: snapshot.id,
              recipientId,
              consentVersion: consent.version,
              consentAccepted: agreed,
              expiresInDays: d,
              maxOpens: o,
              allowDownload,
            },
            { onSuccess: onDone },
          )
        }
      >
        Share
      </Button>
    </div>
  )
}

function SnapshotCard({ snapshot }: { snapshot: Snapshot }) {
  const approve = useApproveSnapshot()
  const download = useDownloadSnapshot()
  const [sharing, setSharing] = useState(false)
  const [open, setOpen] = useState(false)

  const get = (format: FileFormat) =>
    download.mutate(
      { id: snapshot.id, format },
      { onSuccess: (r) => window.open(r.downloadUrl, "_blank", "noopener") },
    )

  return (
    <div className="rounded-lg border border-[#e5e7eb] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm">
          Saved {snapshot.createdAt?.slice(0, 10)} ·{" "}
          {snapshot.approvedAt ? "Approved" : "Not yet approved"}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(!open)}>
            {open ? "Hide" : "View"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => get("docx")} disabled={download.isPending}>
            Word
          </Button>
          <Button variant="outline" size="sm" onClick={() => get("pdf")} disabled={download.isPending}>
            PDF
          </Button>
          {snapshot.approvedAt ? (
            <Button size="sm" onClick={() => setSharing(!sharing)}>
              Share
            </Button>
          ) : (
            <Button size="sm" onClick={() => approve.mutate(snapshot.id)} disabled={approve.isPending}>
              Approve this copy
            </Button>
          )}
        </div>
      </div>
      {(approve.isError || download.isError) && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {apiErrorMessage(approve.error ?? download.error, "That did not work.")}
        </p>
      )}
      {open && (
        <div className="mt-3">
          <ProfileView content={snapshot.content} />
        </div>
      )}
      {sharing && <ShareForm snapshot={snapshot} onDone={() => setSharing(false)} />}
    </div>
  )
}

function Shares() {
  const shares = useCareerPathwaysShares(true)
  const revoke = useRevokeShare()
  if (shares.isLoading) return <FitLoading label="Loading your shares…" />
  if (shares.isError)
    return <p role="alert" className="text-sm text-red-700">{apiErrorMessage(shares.error, "Your shares could not be loaded.")}</p>
  const list = shares.data ?? []
  return (
    <FitCard className="mb-6">
      <FitSectionTitle>Who you have shared with</FitSectionTitle>
      {list.length === 0 ? (
        <p className="text-sm text-[#6b7280]">You have not shared your profile with anyone.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((s) => (
            <li key={s.id} className="rounded-lg border border-[#e5e7eb] p-3" data-testid="share-row">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <span className="font-medium">{s.recipient?.organisation ?? "A recipient"}</span>
                  {s.recipient?.contactName ? ` — ${s.recipient.contactName}` : ""} · {STATUS_LABEL[s.status]} ·{" "}
                  {s.opens} of {s.maxOpens} opens · until {s.expiresAt?.slice(0, 10)}
                </span>
                {s.status === "live" && (
                  <Button variant="outline" size="sm" onClick={() => revoke.mutate(s.id)} disabled={revoke.isPending}>
                    Withdraw
                  </Button>
                )}
              </div>
              {s.accessLog.length > 0 && (
                <ul className="mt-2 text-xs text-[#6b7280]">
                  {s.accessLog.map((a, i) => (
                    <li key={i}>
                      {a.at?.replace("T", " ").slice(0, 16)} · {OUTCOME_LABEL[a.outcome] ?? a.outcome}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
      {revoke.isError && (
        <p role="alert" className="mt-2 text-sm text-red-700">{apiErrorMessage(revoke.error, "It was not withdrawn.")}</p>
      )}
    </FitCard>
  )
}

function Saved() {
  const snaps = useCareerPathwaysSnapshots(true)
  if (snaps.isLoading) return <FitLoading label="Loading your saved profiles…" />
  if (snaps.isError)
    return <p role="alert" className="text-sm text-red-700">{apiErrorMessage(snaps.error, "Saved profiles could not be loaded.")}</p>
  const list = snaps.data ?? []
  return (
    <FitCard className="mb-6">
      <FitSectionTitle>Your saved profiles</FitSectionTitle>
      {list.length === 0 ? (
        <p className="text-sm text-[#6b7280]">Nothing saved yet.</p>
      ) : (
        <div className="space-y-3">
          {list.map((s) => (
            <SnapshotCard key={s.id} snapshot={s} />
          ))}
        </div>
      )}
    </FitCard>
  )
}

export default function CareerProfilePage() {
  const status = useCareerPathwaysStatus()
  return (
    <div className="mx-auto max-w-4xl">
      <FitPageHeader
        icon={FileText}
        title="Career Pathways Profile"
        description="A profile of you that you own: what you prefer, the roles within reach, and how to close the gaps."
      />
      {status.isLoading ? (
        <FitLoading label="Checking…" />
      ) : !status.enabled ? (
        <FitEmptyState>The Career Pathways Profile is not available for you yet.</FitEmptyState>
      ) : (
        <>
          <Composer />
          <Saved />
          <Shares />
        </>
      )}
    </div>
  )
}
