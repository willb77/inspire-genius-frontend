import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ProfileMarkdown from "@/components/prism/narrative/ProfileMarkdown"
import NarrativeExportButtons from "@/components/prism/narrative/NarrativeExportButtons"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { hasScores, subjectFromProfile, useSubjectNarrative } from "@/hooks/useTeamStudio"
import type { NarrativeDoc } from "@/lib/exportNarrative"
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
      notice,
      meta: [{ label: "Scales on file", value: String(Object.keys(subject.scores).length) }],
      sections: [{ body: text }],
    }
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
