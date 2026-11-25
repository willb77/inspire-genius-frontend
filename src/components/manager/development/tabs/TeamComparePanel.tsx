import { useRef, useState } from "react"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ComparePanel from "@/components/prism/studio/ComparePanel"
import SavedRunsCard from "@/components/manager/development/SavedRunsCard"
import ProfileMarkdown from "@/components/prism/narrative/ProfileMarkdown"
import NarrativeExportButtons from "@/components/prism/narrative/NarrativeExportButtons"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { narrativeFileStem, type NarrativeDoc } from "@/lib/exportNarrative"
import type { SavedRun } from "@/lib/savedAnalysis"
import { SAVED_ANALYSIS_COPY } from "@/constants/development"
import { useStudioCast } from "@/hooks/manager/development/useStudioCast"
import { useSavedRuns, useTeamViewSavedRuns } from "@/hooks/manager/development/useSavedRuns"
import { useTeamCast } from "@/hooks/manager/development/useTeamCast"
import { useTeamStudioCompare } from "@/hooks/useTeamStudio"
import type { ComparePort } from "@/components/prism/studio/ports"
import { withPrism } from "@/lib/withPrism"
import { TEAM_STUDIO_COMPARE_COPY } from "./studioCopy"
import { useTranslation } from "react-i18next"

/**
 * Team Development Studio's binding of the shared compare panel.
 *
 * The only file on this side that knows the comparison runs against
 * `/v1/agents/team-studio`. The panel itself takes a port and its words and can
 * reach nothing on its own — which is the point: the same component serves the
 * super-admin Character Lab, and neither caller can reach the other's backend.
 *
 * TDS-3 adds keeping and re-opening, and it is wired HERE rather than inside
 * ComparePanel. The store is `growth.team_studio_analyses`, scoped
 * `(manager_sub, member_id)` — a manager surface over a real colleague — and
 * the Character Lab must stay unable to reach it. So ComparePanel gained one
 * optional render slot for the document it is holding, and everything that
 * decides what may be done with that document lives on this side.
 */
export function TeamComparePanel({
  memberId,
  memberName,
}: {
  memberId: string
  memberName: string
}) {
  const { t } = useTranslation("managerPages")
  const cast = useStudioCast()
  const port = useTeamStudioCompare(cast.port, cast.resolve)
  const store = useSavedRuns(memberId, "compare", SAVED_ANALYSIS_COPY.comparisonFallbackTitle)

  /**
   * The kept comparison the manager re-opened.
   *
   * Rendered as its own document rather than pushed back into ComparePanel's
   * state. Restoring the cast picker would suggest the comparison could be
   * continued, and it cannot: the text is a stored generation and re-running it
   * produces a different document. What a manager needs from a kept comparison
   * is to read it and to export it, and both are here.
   */
  const [opened, setOpened] = useState<SavedRun | null>(null)

  async function keep(ctx: { names: string[]; comparison: string; notice: string }) {
    try {
      await store.save.run({
        title: ctx.names.join(" vs ") || SAVED_ANALYSIS_COPY.comparisonFallbackTitle,
        body: ctx.comparison,
        // Names, not ids, are what survives: a colleague who leaves the team
        // drops out of the cast list, and a row that recorded only ids would
        // then render as a comparison of nobody.
        subjectIds: [],
        subjectNames: ctx.names,
        notice: ctx.notice,
      })
      toast.success(SAVED_ANALYSIS_COPY.saved)
    } catch (err) {
      toast.error(apiErrorMessage(err, SAVED_ANALYSIS_COPY.saveFailed))
    }
  }

  async function remove(run: SavedRun) {
    try {
      await store.remove.run(run.id)
      if (opened?.id === run.id) setOpened(null)
      toast.success(SAVED_ANALYSIS_COPY.deleted)
    } catch (err) {
      // Deliberately NOT a permission message. The server answers 404 for
      // "no such analysis" and for "not yours" identically, on purpose.
      toast.error(apiErrorMessage(err, SAVED_ANALYSIS_COPY.deleteFailed))
    }
  }

  function openedDoc(): NarrativeDoc {
    const run = opened as SavedRun
    return {
      title: run.title,
      subtitle: TEAM_STUDIO_COMPARE_COPY.comparisonSubtitle,
      notice: run.notice || TEAM_STUDIO_COMPARE_COPY.fallbackNotice,
      meta: [
        { label: TEAM_STUDIO_COMPARE_COPY.metaLabel, value: run.subjectNames.join(", ") },
      ],
      sections: [{ body: run.body }],
      fileStem: narrativeFileStem(run.title, TEAM_STUDIO_COMPARE_COPY.filePrefix),
      footer: TEAM_STUDIO_COMPARE_COPY.footer(run.title),
    }
  }

  return (
    <div className="space-y-3">
      {cast.withoutPrism > 0 && (
        <p className="text-xs text-slate-500">{cast.withoutPrism === 1 ? t("teamComparePanel.withoutPrismOne", { defaultValue: "{{withoutPrism}} team member is not listed — they have no PRISM on file. Invite them from the roster.", withoutPrism: cast.withoutPrism }) : t("teamComparePanel.withoutPrismOther", { defaultValue: "{{withoutPrism}} team members are not listed — they have no PRISM on file. Invite them from the roster.", withoutPrism: cast.withoutPrism })}</p>
      )}
      <ComparePanel
        port={port}
        copy={TEAM_STUDIO_COMPARE_COPY}
        comparisonActions={(ctx) => (
          <Button
            variant="secondary"
            size="sm"
            disabled={store.save.pending || !ctx.comparison.trim()}
            onClick={() => keep(ctx)}
          >
            {store.save.pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="mr-2 h-4 w-4" aria-hidden />
            )}
            {SAVED_ANALYSIS_COPY.keepComparison}
          </Button>
        )}
      />

      {opened && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">{opened.title}</CardTitle>
            <NarrativeExportButtons build={openedDoc} label={t("teamComparePanel.aComparison", { defaultValue: "a comparison" })} />
          </CardHeader>
          <CardContent>
            <ProfileMarkdown text={opened.body} />
          </CardContent>
        </Card>
      )}

      <SavedRunsCard
        heading={SAVED_ANALYSIS_COPY.comparisonHeading}
        blurb={`${SAVED_ANALYSIS_COPY.privateToYou} ${SAVED_ANALYSIS_COPY.followsTheMember(memberName)}`}
        runs={store.runs}
        isLoading={store.isLoading}
        isError={store.isError}
        errorLabel={SAVED_ANALYSIS_COPY.loadError}
        emptyLabel={SAVED_ANALYSIS_COPY.empty}
        openLabel={SAVED_ANALYSIS_COPY.open}
        onOpen={setOpened}
        onDelete={remove}
        deletePending={store.remove.pending}
      />
    </div>
  )
}

/**
 * U5 — the same comparison, at Studio level (the Team view).
 *
 * Differences from the member-page binding above, and nothing else:
 *
 *   - the cast is `useTeamCast`: only people whose PRISM is shared with the
 *     caller (the roster's server `sharing` field), and a not-shared id is
 *     refused before any dossier is read;
 *   - a kept comparison records the ids that were COMPARED, and is filed under
 *     the first of them (see `useTeamViewSavedRuns`). The member-page binding
 *     records names only and files under its member; both are left as they are.
 *
 * The member-page binding is unchanged, so every comparison kept there before
 * this view existed is still listed there (decision D2).
 */
export function TeamViewComparePanel() {
  const { t } = useTranslation("managerPages")
  const notShared = t("teamStudioView.notSharedError", { defaultValue: "One of the people you chose does not share their PRISM with you, so they cannot be included." })
  const cast = useTeamCast(notShared)
  const base = useTeamStudioCompare(cast.port, cast.resolve)
  const store = useTeamViewSavedRuns(
    cast,
    "compare",
    SAVED_ANALYSIS_COPY.comparisonFallbackTitle,
    notShared,
  )

  /**
   * The ids the comparison on screen was generated for. ComparePanel's keep
   * slot is handed names only, and its names follow the CURRENT selection, so
   * the ids are captured where the run starts (part 0) instead.
   */
  const comparedIds = useRef<string[]>([])
  const port: ComparePort = {
    ...base,
    compare: {
      ...base.compare,
      run: (ids, part) => {
        if (part === 0) comparedIds.current = [...ids]
        return base.compare.run(ids, part)
      },
    },
  }

  const [opened, setOpened] = useState<SavedRun | null>(null)

  async function keep(ctx: { names: string[]; comparison: string; notice: string }) {
    try {
      await store.save.run({
        title: ctx.names.join(" vs ") || SAVED_ANALYSIS_COPY.comparisonFallbackTitle,
        body: ctx.comparison,
        subjectIds: comparedIds.current,
        subjectNames: ctx.names,
        notice: ctx.notice,
      })
      toast.success(SAVED_ANALYSIS_COPY.saved)
    } catch (err) {
      toast.error(apiErrorMessage(err, SAVED_ANALYSIS_COPY.saveFailed))
    }
  }

  async function remove(run: SavedRun) {
    try {
      await store.remove.run(run.id)
      if (opened?.id === run.id) setOpened(null)
      toast.success(SAVED_ANALYSIS_COPY.deleted)
    } catch (err) {
      toast.error(apiErrorMessage(err, SAVED_ANALYSIS_COPY.deleteFailed))
    }
  }

  const copy = {
    ...TEAM_STUDIO_COMPARE_COPY,
    castEmpty: withPrism(
      t("teamStudioView.castEmpty", { defaultValue: "Nobody on your roster shares their PRISM with you yet. Only people who have shared it can be picked here. You can ask from a person's page." }),
    ),
  }

  return (
    <div className="space-y-3">
      {cast.notShared > 0 && (
        <p className="text-xs text-slate-500" data-testid="team-view-not-shared">
          {withPrism(
            cast.notShared === 1
              ? t("teamStudioView.notSharedOne", { defaultValue: "{{n}} person with PRISM on file is not listed: they have not shared PRISM with you, or their sharing could not be checked.", n: cast.notShared,
                })
              : t("teamStudioView.notSharedOther", { defaultValue: "{{n}} people with PRISM on file are not listed: they have not shared PRISM with you, or their sharing could not be checked.", n: cast.notShared,
                }),
          )}
        </p>
      )}
      <ComparePanel
        port={port}
        copy={copy}
        comparisonActions={(ctx) => (
          <Button
            variant="secondary"
            size="sm"
            disabled={store.save.pending || !ctx.comparison.trim()}
            onClick={() => keep(ctx)}
          >
            {store.save.pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="mr-2 h-4 w-4" aria-hidden />
            )}
            {SAVED_ANALYSIS_COPY.keepComparison}
          </Button>
        )}
      />

      {opened && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">{opened.title}</CardTitle>
            <NarrativeExportButtons build={() => savedComparisonDoc(opened)} label={t("teamComparePanel.aComparison", { defaultValue: "a comparison" })} />
          </CardHeader>
          <CardContent>
            <ProfileMarkdown text={opened.body} />
          </CardContent>
        </Card>
      )}

      <SavedRunsCard
        heading={SAVED_ANALYSIS_COPY.comparisonHeading}
        blurb={t("teamStudioView.savedBlurb", { defaultValue: "Only you can see what you keep here. Each run is filed under the first person in it, and also shows on that person's page." })}
        runs={store.runs}
        isLoading={store.isLoading}
        isError={store.isError}
        errorLabel={SAVED_ANALYSIS_COPY.loadError}
        emptyLabel={SAVED_ANALYSIS_COPY.empty}
        openLabel={SAVED_ANALYSIS_COPY.open}
        onOpen={setOpened}
        onDelete={remove}
        deletePending={store.remove.pending}
      />
    </div>
  )
}

/** The export document for a kept comparison (Team view). */
function savedComparisonDoc(run: SavedRun): NarrativeDoc {
  return {
    title: run.title,
    subtitle: TEAM_STUDIO_COMPARE_COPY.comparisonSubtitle,
    notice: run.notice || TEAM_STUDIO_COMPARE_COPY.fallbackNotice,
    meta: [{ label: TEAM_STUDIO_COMPARE_COPY.metaLabel, value: run.subjectNames.join(", ") }],
    sections: [{ body: run.body }],
    fileStem: narrativeFileStem(run.title, TEAM_STUDIO_COMPARE_COPY.filePrefix),
    footer: TEAM_STUDIO_COMPARE_COPY.footer(run.title),
  }
}

export default TeamComparePanel
