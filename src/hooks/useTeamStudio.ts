import { useMutation } from '@tanstack/react-query'
import { QUADRANT_CONFIG } from '@/constants/prism'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'
import {
  analyseSubject,
  askAboutSubjects,
  compareSubjects,
  exportSubject,
  fetchStarterQuestions,
  runScenario,
  type ScoreByType,
  type StudioSubject,
} from '@/services/team-studio/teamStudio.service'
import {
  toAnalysisPart,
  toAskResult,
  toComparisonPart,
  toScenarioPart,
  toStarterQuestions,
} from '@/services/team-studio/adapt'
import { COLLABORATIVE } from '@/types/character-lab'
import type {
  ComparePort,
  ScenarioPort,
  SubjectListPort,
} from '@/components/prism/studio/ports'
import type {
  BehavioralProfile,
  FullPrismProfileResponse,
  PrismDimensionId,
} from '@/types/development'

/**
 * Team Development Studio — PRISM narrative about a real direct report.
 *
 * These hooks return the PORTS the shared studio panels take (see
 * `@/components/prism/studio/ports`), already bound to the Team Studio
 * endpoints. The panels themselves import no hook and no service, so this file
 * and the Character Lab's own hooks are the only two things in the app that
 * can reach a narrative backend — and neither can be talked into being the
 * other.
 *
 * This is NOT a copy of `useCharacterLab`, and the shapes differ where the
 * backends differ:
 *
 *   - Character Lab addresses saved profiles by id and has a library, a
 *     scenario store and an importer. Team Studio has none of those: every
 *     call carries the whole subject, because a real person's PRISM record
 *     already lives in the PRISM stores and this surface must not keep a
 *     second copy of it.
 *   - There are therefore no `useQuery` caches to invalidate here. Everything
 *     is a mutation over data the caller already holds.
 *
 * @see src/services/team-studio/teamStudio.service.ts for the `/v1/agents/`
 * prefix rule these endpoints depend on.
 */

/** How many narrative parts to have in flight at once. See mapWithConcurrency. */
const PART_CONCURRENCY = 3

/**
 * PRISM dimension id → the CANONICAL key the server indexes scores by.
 *
 * Stated explicitly rather than derived from the label. `"Innovating"
 * .toLowerCase()` happens to equal `"innovating"`, and that coincidence holds
 * for all eight behaviours and for Introversion/Extroversion — which is exactly
 * what makes it dangerous. It does NOT hold for the other 78 scales:
 * `"Practical and mechanical"` is keyed `practical_mechanical`, not
 * `"practical and mechanical"`. A `.toLowerCase()` here would work today, keep
 * working through review, and start silently dropping scales the moment this
 * surface reads more than the behaviour radar — the same failure it is being
 * written to fix.
 *
 * A map means an unmapped id yields no key and the scale is left out visibly
 * (`Scales on file` drops, `hasScores` can go false) instead of being sent
 * under a key the server will never look up.
 *
 * Source of truth: `packages/ig-prism/ig_prism/rubric.py` — the `key` field of
 * `BEHAVIOUR_DIMENSIONS`, which is what `score_digest` reads.
 */
const CANONICAL_KEY_BY_ID: Record<PrismDimensionId, string> = {
  1: 'innovating',
  2: 'initiating',
  3: 'supporting',
  4: 'coordinating',
  5: 'focusing',
  6: 'delivering',
  7: 'finishing',
  8: 'evaluating',
}

/**
 * Turns the ids the shared panels work in into whole subjects.
 *
 * Allowed to be async: Team Studio has no stored profile to address, so a
 * subject the caller has not already loaded has to be fetched. Resolving on
 * demand rather than up front matters — the roster can be large and each
 * member's dossier is a ~60s agent job, so pre-loading the whole team to
 * populate a picker would be a minute of work per name nobody chose.
 */
export type SubjectResolver = (ids: string[]) => StudioSubject[] | Promise<StudioSubject[]>

export type { StudioSubject }

/**
 * Turn a member's reconciled behavioural profile into a subject.
 *
 * Scores are keyed by the PRISM behaviour LABEL rather than its numeric id, so
 * the request is readable and cannot silently mean a different scale if the
 * ids are ever renumbered. Quadrant roll-ups are derived from
 * `QUADRANT_CONFIG` — never from a colour name read off a hex value, which is
 * the specific mistake `@/constants/prism` documents at length.
 *
 * A member with no PRISM dimensions yields empty `scores`, and the caller is
 * expected to refuse to send it rather than ask for a narrative about nothing.
 */
export function subjectFromProfile(
  name: string,
  profile: Pick<BehavioralProfile, 'prism'>,
  notes?: string,
): StudioSubject {
  const scores: Record<string, ScoreByType> = {}
  for (const d of profile.prism ?? []) {
    const key = CANONICAL_KEY_BY_ID[d.id]
    if (key) scores[key] = { Underlying: d.score }
  }

  const colours = coloursFromBehaviours(profile)
  return {
    name,
    scores,
    ...(Object.keys(colours).length ? { colours } : {}),
    ...(notes?.trim() ? { notes: notes.trim() } : {}),
  }
}

/**
 * The four quadrant means, from the eight behaviours.
 *
 * Split out so the FULL-profile path can reuse it rather than read the
 * server's own `colours` map. That map is keyed by the canon's COLUMN names —
 * `gold`, `green`, `blue`, and the legacy `orange` — and PRISM has no orange
 * quadrant. Passing it straight through would put "orange 40" into a prompt
 * and, from there, into prose a manager reads. `COLUMN_TO_QUADRANT` is the
 * only correct translation and it lives on the server; rather than copy it
 * here, the brain map keeps being derived the way it already was, from the
 * behaviours and `QUADRANT_CONFIG`.
 *
 * Never from a colour name read off a hex value — see `@/constants/prism`.
 */
function coloursFromBehaviours(
  profile: Pick<BehavioralProfile, 'prism'>,
): Record<string, number> {
  const totals: Record<string, { sum: number; n: number }> = {}
  for (const d of profile.prism ?? []) {
    const quadrant = QUADRANT_CONFIG[d.quadrant]?.label
    if (!quadrant) continue
    const bucket = (totals[quadrant] ??= { sum: 0, n: 0 })
    bucket.sum += d.score
    bucket.n += 1
  }
  const colours: Record<string, number> = {}
  for (const [quadrant, { sum, n }] of Object.entries(totals)) {
    colours[quadrant] = Math.round((sum / n) * 10) / 10
  }
  return colours
}

/**
 * Raised when a member's PRISM records cannot all belong to one person.
 *
 * A distinct type because the caller must not treat it as "this member has no
 * scores". Two assessments under one user disagreeing meant, on dev, two
 * different people's reports filed under one account — so the honest response
 * is to say why nothing is being shown, not to fall back to a thinner profile
 * built from the same untrustworthy rows.
 */
export class ConflictedProfileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictedProfileError'
  }
}

/**
 * Turn the FULL PRISM profile into a subject — every scale on file, every
 * score type on file.
 *
 * This is the read the write-up was always supposed to have. `subjectFromProfile`
 * builds from the dossier's behaviour radar, which is eight scales and
 * Underlying only: `long_term._load_prism_from_assessments` filters its query to
 * `score_type = 'Underlying'`, so no Adapted value has ever reached this surface
 * through it. The consequence was not a missing section but a WRONG one — the
 * write-up told a manager "there is no meaningful adaptation gap here" about a
 * person with ten Adapted rows on file. Measured on staging-b: 392 Adapted rows
 * across 41 people, none of them reaching the narrative.
 *
 * `scale.scores` is passed through verbatim. It is already `{Underlying, Adapted}`
 * keyed by rubric key — the exact shape `score_digest` indexes — so there is no
 * mapping step here to get wrong, and no place for a `.toLowerCase()` to creep
 * back in. That matters beyond Adapted: the behaviour radar is 8 of the ~87
 * scales a real person has on file, so every write-up so far was generated from
 * under a tenth of the profile.
 *
 * Colours are still derived from the behaviours — see `coloursFromBehaviours`.
 *
 * @throws ConflictedProfileError when the profile is conflicted. NOT optional:
 * `scales` already drops the disagreeing entries, but the agreeing remainder is
 * not trustworthy either, and narrating it would put a blend of two people's
 * psychometrics in front of a manager.
 */
export function subjectFromFullPrism(
  name: string,
  full: FullPrismProfileResponse,
  behavioural: Pick<BehavioralProfile, 'prism'>,
  notes?: string,
): StudioSubject {
  if (full.isConflicted) {
    throw new ConflictedProfileError(
      full.conflictMessage ||
        `${name}'s assessment records disagree with each other, so their profile cannot be shown.`,
    )
  }

  const scores: Record<string, ScoreByType> = {}
  for (const scale of full.scales ?? []) {
    // A scale the server sent with no score types is not a zero; it is a row
    // that carried nothing. Sending `{}` would make `hasScores` true off a
    // profile with no numbers in it.
    if (scale.key && scale.scores && Object.keys(scale.scores).length) {
      scores[scale.key] = scale.scores as ScoreByType
    }
  }

  const colours = coloursFromBehaviours(behavioural)
  return {
    name,
    scores,
    ...(Object.keys(colours).length ? { colours } : {}),
    ...(notes?.trim() ? { notes: notes.trim() } : {}),
  }
}

/**
 * The full profile when it exists, the behaviour radar when it does not.
 *
 * `hasData: false` is an ordinary state — a member whose scores live only in
 * the legacy `prism_results` row, which the dossier can still see. Falling back
 * keeps today's behaviour for them rather than emptying a surface that works.
 * A conflicted profile is NOT that case and is re-thrown.
 */
export function bestSubject(
  name: string,
  full: FullPrismProfileResponse | null,
  behavioural: Pick<BehavioralProfile, 'prism'>,
  notes?: string,
): StudioSubject {
  if (full?.hasData) return subjectFromFullPrism(name, full, behavioural, notes)
  return subjectFromProfile(name, behavioural, notes)
}

/** True when there is enough on file to ask for a narrative at all. */
export function hasScores(subject: StudioSubject): boolean {
  return Object.keys(subject.scores).length > 0
}

/**
 * The names the panels title a result with.
 *
 * Taken from the subjects actually SENT, never from the roster rows or the
 * selection — so a heading can only ever name the people the answer was
 * generated from. A comparison titled with four names built from three
 * subjects is the specific defect this avoids.
 */
function names(subjects: StudioSubject[]): string[] {
  return subjects.map((s) => s.name)
}

/**
 * The multi-part write-up for one person, stitched.
 *
 * Part 0 is fetched first because it reports how many parts there are; the rest
 * run at a bounded concurrency. A part that fails leaves a visible marker
 * rather than a silently short write-up — a missing section reads as "there was
 * nothing to say", which is the opposite of "we could not generate it".
 */
export function useSubjectNarrative() {
  const mutation = useMutation({
    mutationFn: async (subject: StudioSubject) => {
      const first = toAnalysisPart(await analyseSubject({ subject, part: 0 }), subject.name)
      if (first.parts <= 1) {
        return { text: first.analysis, notice: first.notice, failed: 0, parts: first.parts }
      }

      const rest = await mapWithConcurrency(
        Array.from({ length: first.parts - 1 }, (_, i) => i + 1),
        PART_CONCURRENCY,
        (part) => analyseSubject({ subject, part }),
      )
      const chunks = [first.analysis]
      rest.forEach((outcome, i) => {
        chunks.push(
          outcome.status === 'fulfilled'
            ? toAnalysisPart(outcome.value, subject.name).analysis
            : `_Section ${i + 2} of ${first.parts} could not be generated._`,
        )
      })
      return {
        text: chunks.join('\n\n'),
        notice: first.notice,
        failed: rest.filter((o) => o.status === 'rejected').length,
        parts: first.parts,
      }
    },
  })
  return { run: mutation.mutateAsync, pending: mutation.isPending }
}

/** The wide/long CSV the server produces. Nothing here invents a score. */
export function useSubjectExport() {
  const mutation = useMutation({
    mutationFn: (req: { subject: StudioSubject; fmt: 'wide' | 'long' }) => exportSubject(req),
  })
  return { run: mutation.mutateAsync, pending: mutation.isPending }
}

/**
 * A ready {@link ComparePort} for the shared compare panel.
 *
 * `resolve` turns the ids the panel works in into the subjects this backend
 * wants. The panel never learns that the translation happened, which is the
 * whole point: it holds no idea of which endpoint it is talking to.
 */
export function useTeamStudioCompare(
  cast: SubjectListPort,
  resolve: SubjectResolver,
): ComparePort {
  const compare = useMutation({
    mutationFn: (req: { subjects: StudioSubject[]; part: number }) => compareSubjects(req),
  })

  const questions = useMutation({
    mutationFn: (req: { subjects: StudioSubject[] }) => fetchStarterQuestions(req),
  })
  const ask = useMutation({
    mutationFn: (req: { subjects: StudioSubject[]; question: string }) => askAboutSubjects(req),
  })

  return {
    cast,
    compare: {
      run: async (ids, part) => {
        const subjects = await resolve(ids)
        const wire = await compare.mutateAsync({ subjects, part })
        return toComparisonPart(wire, names(subjects))
      },
      pending: compare.isPending,
    },
    questions: {
      run: async (ids) => {
        const subjects = await resolve(ids)
        const wire = await questions.mutateAsync({ subjects })
        return toStarterQuestions(wire, names(subjects))
      },
      pending: questions.isPending,
    },
    ask: {
      run: async (ids, question) => {
        const subjects = await resolve(ids)
        const wire = await ask.mutateAsync({ subjects, question })
        return toAskResult(wire, question, names(subjects))
      },
      pending: ask.isPending,
    },
  }
}

/**
 * A ready {@link ScenarioPort}.
 *
 * No `store`: Team Studio has nowhere to keep a run. The panel therefore shows
 * neither "Keep this run" nor a saved list, rather than a button that reports
 * success and saves nothing.
 */
export function useTeamStudioScenario(
  cast: SubjectListPort,
  resolve: SubjectResolver,
): ScenarioPort {
  const scenario = useMutation({
    mutationFn: (req: { subjects: StudioSubject[]; situation: string }) => runScenario(req),
  })

  return {
    cast,
    run: {
      /**
       * The panel asks for one focus at a time: each chosen person, then the
       * group. The server has no `focus` argument — it reads however many
       * subjects it is given — so the focus is applied HERE by choosing who to
       * send, and the collaborative read is simply all of them.
       *
       * A focus that names nobody in the cast is an error rather than a
       * fallback to the first person: answering about the wrong colleague under
       * someone else's heading is the failure this surface exists to avoid.
       */
      run: async (ids, situation, focus) => {
        const subjects = await resolve(ids)
        if (focus === COLLABORATIVE) {
          const wire = await scenario.mutateAsync({ subjects, situation })
          return toScenarioPart(wire, focus, names(subjects))
        }
        const i = ids.indexOf(focus)
        if (i < 0 || !subjects[i]) {
          throw new Error('That person is no longer in the selection.')
        }
        const one = [subjects[i]]
        const wire = await scenario.mutateAsync({ subjects: one, situation })
        return toScenarioPart(wire, focus, names(one))
      },
      pending: scenario.isPending,
    },
  }
}
