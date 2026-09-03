import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ProfileMarkdown from "@/components/prism/narrative/ProfileMarkdown"
import NarrativeExportButtons from "@/components/prism/narrative/NarrativeExportButtons"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { hasScores, subjectFromProfile, useSubjectNarrative } from "@/hooks/useTeamStudio"
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
  memberName,
  profile,
}: {
  memberName: string
  profile: BehavioralProfile
}) {
  const narrative = useSubjectNarrative()
  const [text, setText] = useState("")
  const [notice, setNotice] = useState("")

  const subject = useMemo(
    () => subjectFromProfile(memberName, profile),
    [memberName, profile],
  )
  const scored = hasScores(subject)

  async function onGenerate() {
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
      meta: [{ label: "Scales on file", value: String(Object.keys(subject.scores).length) }],
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
