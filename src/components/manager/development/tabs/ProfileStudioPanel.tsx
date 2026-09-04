import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ProfileMarkdown from "@/components/prism/narrative/ProfileMarkdown"
import NarrativeExportButtons from "@/components/prism/narrative/NarrativeExportButtons"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import {
  ConflictedProfileError,
  bestSubject,
  hasScores,
  useSubjectNarrative,
} from "@/hooks/useTeamStudio"
import { useMemberFullPrism } from "@/hooks/manager/development/useMemberFullPrism"
import { narrativeFileStem, type NarrativeDoc } from "@/lib/exportNarrative"
import {
  REAL_PERSON_FILE_PREFIX,
  REAL_PERSON_NOTICE,
  realPersonFooter,
} from "@/lib/prismExportLabels"
import type { BehavioralProfile } from "@/types/development"
import { NOT_A_JUDGEMENT } from "./studioCopy"

/**
 * The narrative write-up for one team member.
 *
 * The Behavioral Profile tab shows the scores; this one asks the agent-engine
 * to read them back in prose. The write-up arrives in sections and is stitched
 * by `useSubjectNarrative` — a section that fails leaves a visible marker
 * rather than a silently shorter document.
 *
 * Nothing is generated until the manager asks. The request costs several model
 * calls and the tab is reachable by anyone who opens the workspace.
 */
export function ProfileStudioPanel({
  memberId,
  memberName,
  profile,
}: {
  memberId: string
  memberName: string
  profile: BehavioralProfile
}) {
  const narrative = useSubjectNarrative()
  const [text, setText] = useState("")
  const [notice, setNotice] = useState("")

  // Every scale on file, not the eight-behaviour radar the dossier carries —
  // and the only read that returns Adapted scores. See `subjectFromFullPrism`.
  const full = useMemberFullPrism(memberId)

  // `bestSubject` THROWS on a conflicted profile rather than returning a
  // thinner one, so the build is wrapped and the error kept for the refusal
  // below. Rendering must not be the thing that decides whether a person's
  // psychometrics are trustworthy.
  const { subject, conflict } = useMemo(() => {
    try {
      return {
        subject: bestSubject(memberName, full.data ?? null, profile),
        conflict: null as string | null,
      }
    } catch (err) {
      if (err instanceof ConflictedProfileError) {
        return { subject: null, conflict: err.message }
      }
      throw err
    }
  }, [memberName, full.data, profile])

  const scored = Boolean(subject && hasScores(subject))

  async function onGenerate() {
    if (!subject) return
    setText("")
    try {
      const out = await narrative.run(subject)
      setText(out.text)
      setNotice(out.notice)
      if (out.failed) toast.warning(`${out.failed} of ${out.parts} sections failed`)
    } catch (err) {
      toast.error(apiErrorMessage(err, "The write-up could not be generated"))
    }
  }

  function doc(): NarrativeDoc {
    return {
      title: memberName,
      subtitle: "PRISM behavioural write-up",
      // The server's notice when it sends one, the real-person notice when it
      // does not. An export about a named colleague must never leave without
      // one — the PDF outlives the tab, and whoever opens it never saw the
      // caveat on screen.
      notice: notice || REAL_PERSON_NOTICE,
      meta: [
        {
          label: "Scales on file",
          value: String(Object.keys(subject?.scores ?? {}).length),
        },
      ],
      sections: [{ body: text }],
      fileStem: narrativeFileStem(memberName, REAL_PERSON_FILE_PREFIX),
      footer: realPersonFooter(memberName),
    }
  }

  // Identity before scores: a write-up is ABOUT someone, and the server
  // rejects a nameless subject outright (`subject.name` has `min_length=1`, so
  // it is a 422, not a soft failure). The dossier's name comes from
  // growth-service's `_resolve_member_meta`, which falls back to
  // `public.team_members` — a table with no writer and zero rows on both dev
  // and staging-b — and then to "". So this is reachable for real members
  // today, and it presented as a raw validation error on staging-b on
  // 2026-09-03. Every other string on this panel interpolates the name, so
  // without this guard the "no scores" message below renders headless too.
  //
  // Deliberately NOT papered over with a placeholder: "This member has no
  // PRISM on file" over a real colleague's export is a false document. Naming
  // the cause gives whoever sees it something to act on.
  if (!memberName.trim()) {
    return (
      <p className="text-sm text-slate-500">
        This member has no name on their record, so a write-up cannot be attributed to them. The
        roster shows names correctly — it reads a different source — so this is a data gap on the
        member record rather than something you did.
      </p>
    )
  }

  // A conflicted profile is a REFUSAL, and it comes before the "no scores"
  // branch deliberately. It means two assessments under this person disagree,
  // which on dev turned out to be two different people's PRISM reports filed
  // under one account. Reporting that as "no scores on file" would hide a data
  // fault behind an ordinary-looking empty state, and offering to generate a
  // write-up from the agreeing remainder would narrate a blend of two humans to
  // their manager. The server withholds the disagreeing scales; the agreeing
  // ones are not trustworthy either, because the overlap that reveals a
  // conflict is only a lower bound.
  if (conflict) {
    return (
      <p className="text-sm text-slate-500">
        {conflict} Nothing can be written up until the records are separated — this is a data
        fault on the member record, not something you did.
      </p>
    )
  }

  // Still loading the full profile. Without this, the first render sees no
  // scales, falls into "no PRISM on file", and tells the manager their report
  // has nothing — which is the dishonest empty state this surface keeps having
  // to defend against.
  if (full.isLoading) {
    return <p className="text-sm text-slate-500">Loading {memberName}&apos;s PRISM scores…</p>
  }

  // No scores means no write-up worth having. Saying so beats generating
  // confident prose about nothing, which would be indistinguishable from a
  // real reading.
  if (!scored) {
    return (
      <p className="text-sm text-slate-500">
        {memberName} has no PRISM scores on file, so there is nothing to write up yet. Invite them
        to complete PRISM from the header above.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" aria-hidden /> Behavioural write-up
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Read back from {memberName}&apos;s own PRISM scores. {NOT_A_JUDGEMENT}
            </p>
          </div>
          {text && <NarrativeExportButtons build={doc} label="a write-up" />}
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={onGenerate} disabled={narrative.pending}>
            {narrative.pending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Writing…
              </>
            ) : text ? (
              "Write it again"
            ) : (
              "Write it up"
            )}
          </Button>
          {text ? <ProfileMarkdown text={text} /> : null}
        </CardContent>
      </Card>
    </div>
  )
}

export default ProfileStudioPanel
