import { useMutation } from '@tanstack/react-query'
import { BEHAVIOUR_CONFIG, QUADRANT_CONFIG } from '@/constants/prism'
import { mapWithConcurrency } from '@/lib/mapWithConcurrency'
import {
  analyseSubject,
  askAboutSubjects,
  compareSubjects,
  exportSubject,
  fetchStarterQuestions,
  runScenario,
  type StudioSubject,
} from '@/services/team-studio/teamStudio.service'
import type {
  ComparePort,
  ScenarioPort,
  SubjectListPort,
} from '@/components/prism/studio/ports'
import type { BehavioralProfile } from '@/types/development'

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
  const scores: Record<string, number> = {}
  const totals: Record<string, { sum: number; n: number }> = {}

  for (const d of profile.prism ?? []) {
    const label = d.label || BEHAVIOUR_CONFIG[d.id]?.label
    if (label) scores[label] = d.score
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

  return {
    name,
    scores,
    ...(Object.keys(colours).length ? { colours } : {}),
    ...(notes?.trim() ? { notes: notes.trim() } : {}),
  }
}

/** True when there is enough on file to ask for a narrative at all. */
export function hasScores(subject: StudioSubject): boolean {
  return Object.keys(subject.scores).length > 0
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
      const first = await analyseSubject({ subject, part: 0 })
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
            ? outcome.value.analysis
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
    mutationFn: (req: { subject: StudioSubject[] }) => fetchStarterQuestions(req),
  })
  const ask = useMutation({
    mutationFn: (req: { subject: StudioSubject[]; question: string }) => askAboutSubjects(req),
  })

  return {
    cast,
    compare: {
      run: async (ids, part) =>
        compare.mutateAsync({ subjects: await resolve(ids), part }),
      pending: compare.isPending,
    },
    questions: {
      run: async (ids) => questions.mutateAsync({ subject: await resolve(ids) }),
      pending: questions.isPending,
    },
    ask: {
      run: async (ids, question) =>
        ask.mutateAsync({ subject: await resolve(ids), question }),
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
    mutationFn: (req: { subject: StudioSubject[]; situation: string; focus: string }) =>
      runScenario(req),
  })

  return {
    cast,
    run: {
      run: async (ids, situation, focus) =>
        scenario.mutateAsync({ subject: await resolve(ids), situation, focus }),
      pending: scenario.isPending,
    },
  }
}
