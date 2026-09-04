import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"
import {
  ConflictedProfileError,
  bestSubject,
  hasScores,
  subjectFromFullPrism,
  subjectFromProfile,
  useSubjectNarrative,
  useTeamStudioCompare,
  useTeamStudioScenario,
} from "../useTeamStudio"
import type { StudioSubject } from "@/services/team-studio/teamStudio.service"
import { COLLABORATIVE } from "@/types/character-lab"
import type { FullPrismProfileResponse, PrismDimension } from "@/types/development"

const analyse = jest.fn()
const compare = jest.fn()
const questions = jest.fn()
const ask = jest.fn()
const scenario = jest.fn()

jest.mock("@/services/team-studio/teamStudio.service", () => ({
  analyseSubject: (...a: unknown[]) => analyse(...a),
  compareSubjects: (...a: unknown[]) => compare(...a),
  fetchStarterQuestions: (...a: unknown[]) => questions(...a),
  askAboutSubjects: (...a: unknown[]) => ask(...a),
  runScenario: (...a: unknown[]) => scenario(...a),
  exportSubject: jest.fn(),
}))

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const dim = (id: number, label: string, score: number, quadrant: number): PrismDimension =>
  ({ id, label, score, quadrant }) as PrismDimension

beforeEach(() => jest.clearAllMocks())

// ─── subjectFromProfile ─────────────────────────────────────────────────

describe("subjectFromProfile", () => {
  it("keys scores by the CANONICAL dimension key, per score type", () => {
    // The server indexes `scores.get(d.key)` where `d.key` is the lowercase
    // canonical key from ig_prism's rubric, and reads a per-score-type object
    // off it. A label key ("Innovating") misses every lookup, so every scale is
    // skipped and the model sees only the four quadrant colours — 200 OK, real
    // prose, grounded in the wrong thing. Measured on dev 2026-09-03: the flat
    // payload produced "(Gold 92 — Finishing + Evaluating)" where the nested
    // one produced "(Finishing 96)".
    const s = subjectFromProfile("A. Member", {
      prism: [dim(1, "Innovating", 71, 1), dim(5, "Focusing", 40, 3)],
    })
    expect(s.scores).toEqual({
      innovating: { Underlying: 71 },
      focusing: { Underlying: 40 },
    })
    expect(s.name).toBe("A. Member")
  })

  it("emits keys the server's own rubric contains — not a lowercased label", () => {
    // The eight behaviour labels lowercase to their canonical keys by
    // coincidence, which is what makes `.toLowerCase()` dangerous: it would
    // pass this suite and start dropping scales the moment the surface reads
    // one of the 78 scales whose key is snake_case
    // ("Practical and mechanical" -> practical_mechanical).
    //
    // Pinned against the rubric's own key list rather than restating it here,
    // so a rename on the server side fails HERE rather than in front of a
    // manager.
    const CANONICAL = [
      "innovating",
      "initiating",
      "supporting",
      "coordinating",
      "focusing",
      "delivering",
      "finishing",
      "evaluating",
    ]
    const s = subjectFromProfile("A. Member", {
      prism: [
        dim(1, "Innovating", 1, 1),
        dim(2, "Initiating", 2, 1),
        dim(3, "Supporting", 3, 2),
        dim(4, "Coordinating", 4, 2),
        dim(5, "Focusing", 5, 3),
        dim(6, "Delivering", 6, 3),
        dim(7, "Finishing", 7, 4),
        dim(8, "Evaluating", 8, 4),
      ],
    })
    expect(Object.keys(s.scores).sort()).toEqual([...CANONICAL].sort())
    for (const k of Object.keys(s.scores)) {
      expect(k).toBe(k.toLowerCase())
      expect(k).not.toMatch(/\s/)
    }
  })

  it("drops a dimension it cannot map rather than inventing a key for it", () => {
    // An unmapped id must be visibly absent — "Scales on file" falls, and
    // `hasScores` can go false — not sent under a key the server never looks
    // up, which is indistinguishable from a scale the person did not score.
    const s = subjectFromProfile("A. Member", {
      prism: [dim(1, "Innovating", 71, 1), dim(99 as never, "Invented", 50, 1)],
    })
    expect(Object.keys(s.scores)).toEqual(["innovating"])
  })

  it("rolls quadrants up from the dimension's own quadrant id", () => {
    // Never from a colour read off a hex value — six of the eight behaviours
    // carried the wrong quadrant's colour until 2026-08-01.
    const s = subjectFromProfile("A. Member", {
      prism: [dim(1, "Innovating", 70, 1), dim(2, "Initiating", 80, 1), dim(7, "Finishing", 30, 4)],
    })
    expect(s.colours).toEqual({ Green: 75, Gold: 30 })
  })

  it("omits colours and notes rather than sending empty ones", () => {
    const s = subjectFromProfile("A. Member", { prism: [] }, "   ")
    expect(s.scores).toEqual({})
    expect("colours" in s).toBe(false)
    expect("notes" in s).toBe(false)
  })

  it("carries manager notes through when there are any", () => {
    const s = subjectFromProfile("A. Member", { prism: [] }, " ran the migration ")
    expect(s.notes).toBe("ran the migration")
  })

  it("hasScores refuses a subject with nothing on file", () => {
    // The caller is expected to check: asking for a narrative about no scores
    // produces confident prose about nothing.
    expect(hasScores({ name: "x", scores: {} })).toBe(false)
    expect(hasScores({ name: "x", scores: { innovating: { Underlying: 1 } } })).toBe(true)
  })
})

// ─── useSubjectNarrative ────────────────────────────────────────────────

describe("useSubjectNarrative", () => {
  const subject: StudioSubject = { name: "A. Member", scores: { innovating: { Underlying: 71 } } }

  it("fetches every part and stitches them in order", async () => {
    analyse.mockImplementation(({ part }: { part: number }) =>
      Promise.resolve({ part, parts: 4, markdown: `section-${part}`, notice: "REAL PERSON" }),
    )
    const { result } = renderHook(() => useSubjectNarrative(), { wrapper })
    const out = await result.current.run(subject)

    expect(analyse.mock.calls.map((c) => c[0].part)).toEqual([0, 1, 2, 3])
    expect(out.text).toBe("section-0\n\nsection-1\n\nsection-2\n\nsection-3")
    expect(out.notice).toBe("REAL PERSON")
    expect(out.failed).toBe(0)
  })

  it("marks a failed section instead of silently shortening the write-up", async () => {
    // A missing section reads as "there was nothing to say" — the opposite of
    // "we could not generate it".
    analyse.mockImplementation(({ part }: { part: number }) =>
      part === 2
        ? Promise.reject(new Error("503"))
        : Promise.resolve({ part, parts: 3, markdown: `section-${part}`, notice: "" }),
    )
    const { result } = renderHook(() => useSubjectNarrative(), { wrapper })
    const out = await result.current.run(subject)

    expect(out.text).toContain("Section 3 of 3 could not be generated")
    expect(out.failed).toBe(1)
  })

  it("does not fetch a second part when the server says there is only one", async () => {
    analyse.mockResolvedValue({ part: 0, parts: 1, markdown: "all of it", notice: "" })
    const { result } = renderHook(() => useSubjectNarrative(), { wrapper })
    const out = await result.current.run(subject)
    expect(analyse).toHaveBeenCalledTimes(1)
    expect(out.text).toBe("all of it")
  })
})

// ─── Ports ──────────────────────────────────────────────────────────────

describe("the ports handed to the shared panels", () => {
  const cast = { subjects: [], isLoading: false }
  const resolve = (ids: string[]) => ids.map((id) => ({ name: id, scores: { innovating: { Underlying: 1 } } }))

  it("translates the panel's ids into whole subjects before sending them", async () => {
    // The panel works in ids because Character Lab does. Team Studio has no
    // stored profile to address, so the adapter resolves them here and the
    // panel never learns which backend it is talking to.
    compare.mockResolvedValue({ part: 0, parts: 1, markdown: "c", notice: "" })
    const { result } = renderHook(() => useTeamStudioCompare(cast, resolve), { wrapper })
    await result.current.compare.run(["ann", "bo"], 0)

    expect(compare).toHaveBeenCalledWith({
      subjects: [
        { name: "ann", scores: { innovating: { Underlying: 1 } } },
        { name: "bo", scores: { innovating: { Underlying: 1 } } },
      ],
      part: 0,
    })
  })

  it("sends questions and answers over the resolved subjects too", async () => {
    questions.mockResolvedValue({ markdown: "- Q one? (Innovating 1)", notice: "" })
    ask.mockResolvedValue({ markdown: "a", notice: "" })
    const { result } = renderHook(() => useTeamStudioCompare(cast, resolve), { wrapper })

    await result.current.questions.run(["ann"])
    await result.current.ask.run(["ann"], "who?")

    expect(questions.mock.calls[0][0].subjects).toHaveLength(1)
    expect(ask.mock.calls[0][0]).toMatchObject({ question: "who?" })
  })

  it("offers no scenario store, so no 'Keep this run' button can appear", async () => {
    // Team Studio has nowhere to keep a run. An optional store means the panel
    // hides the button rather than showing one that reports success and saves
    // nothing.
    scenario.mockResolvedValue({ markdown: "b", notice: "" })
    const { result } = renderHook(() => useTeamStudioScenario(cast, resolve), { wrapper })
    expect(result.current.store).toBeUndefined()

    await result.current.run.run(["ann"], "a hard week", "ann")
    expect(scenario).toHaveBeenCalledWith({
      subjects: [{ name: "ann", scores: { innovating: { Underlying: 1 } } }],
      situation: "a hard week",
    })
  })

  /**
   * The focus is applied by CHOOSING WHO TO SEND, not by a `focus` field.
   *
   * The server has no such argument — it reads however many subjects it is
   * given. Sending everyone and naming a focus would have the server answer
   * about the group while the panel filed it under one person's heading.
   */
  it("sends only the person in focus for an individual read", async () => {
    scenario.mockResolvedValue({ markdown: "b", notice: "" })
    const { result } = renderHook(() => useTeamStudioScenario(cast, resolve), { wrapper })

    const out = await result.current.run.run(["ann", "bo"], "a hard week", "bo")

    expect(scenario.mock.calls[0][0].subjects).toEqual([{ name: "bo", scores: { innovating: { Underlying: 1 } } }])
    expect(out.focus).toBe("bo")
    expect(out.behaviour).toBe("b")
  })

  it("sends everyone for the collaborative read", async () => {
    scenario.mockResolvedValue({ markdown: "together", notice: "" })
    const { result } = renderHook(() => useTeamStudioScenario(cast, resolve), { wrapper })

    const out = await result.current.run.run(["ann", "bo"], "a hard week", COLLABORATIVE)

    expect(scenario.mock.calls[0][0].subjects).toHaveLength(2)
    expect(out.focus).toBe(COLLABORATIVE)
    expect(out.behaviour).toBe("together")
  })

  it("refuses a focus naming nobody rather than answering about the wrong person", async () => {
    scenario.mockResolvedValue({ markdown: "b", notice: "" })
    const { result } = renderHook(() => useTeamStudioScenario(cast, resolve), { wrapper })

    await expect(
      result.current.run.run(["ann", "bo"], "a hard week", "someone-else"),
    ).rejects.toThrow(/no longer in the selection/)
    expect(scenario).not.toHaveBeenCalled()
  })
})

// ─── The adapted shape the panels actually read ─────────────────────────

describe("the ports hand back the panel's field names, not the wire's", () => {
  const cast = { subjects: [], isLoading: false }
  const resolve = (ids: string[]) => ids.map((id) => ({ name: id, scores: { innovating: { Underlying: 1 } } }))

  it("compare exposes `comparison`, so the panel renders prose the server sent", async () => {
    // 13 × 200 OK with nothing on screen was this exact gap on staging-b.
    compare.mockResolvedValue({ part: 0, parts: 2, markdown: "## Friction\nProse.", notice: "N" })
    const { result } = renderHook(() => useTeamStudioCompare(cast, resolve), { wrapper })

    const out = await result.current.compare.run(["ann", "bo"], 0)

    expect(out.comparison).toBe("## Friction\nProse.")
    expect(out.parts).toBe(2)
    expect(out.names).toEqual(["ann", "bo"])
  })

  it("questions exposes parsed objects, not the raw markdown list", async () => {
    questions.mockResolvedValue({
      markdown: "- When does planning feel like delay? (Finishing 96)",
      notice: "N",
    })
    const { result } = renderHook(() => useTeamStudioCompare(cast, resolve), { wrapper })

    const out = await result.current.questions.run(["ann"])

    expect(out.questions).toEqual([
      { question: "When does planning feel like delay?", why: "Finishing 96" },
    ])
  })

  it("ask exposes `answer` and echoes the question", async () => {
    ask.mockResolvedValue({ markdown: "Grounded answer.", notice: "N" })
    const { result } = renderHook(() => useTeamStudioCompare(cast, resolve), { wrapper })

    const out = await result.current.ask.run(["ann"], "who leads?")

    expect(out.answer).toBe("Grounded answer.")
    expect(out.question).toBe("who leads?")
  })

  it("names a result only from the subjects actually sent", async () => {
    compare.mockResolvedValue({ part: 0, parts: 1, markdown: "c", notice: "" })
    const { result } = renderHook(() => useTeamStudioCompare(cast, resolve), { wrapper })

    const out = await result.current.compare.run(["ann", "bo", "cy"], 0)

    expect(out.names).toEqual(["ann", "bo", "cy"])
    expect(out.names).toHaveLength(compare.mock.calls[0][0].subjects.length)
  })
})

// ─── subjectFromFullPrism ───────────────────────────────────────────────
//
// The dossier's behaviour radar is 8 scales and `Underlying` only:
// `long_term._load_prism_from_assessments` filters its query to
// `score_type = 'Underlying'`. So no Adapted value has ever reached this
// surface through `subjectFromProfile`, and the write-up told a manager
// "there is no meaningful adaptation gap here" about a person with ten Adapted
// rows on file. Measured on staging-b 2026-09-03: 392 Adapted rows across 41
// people, none of them reaching the narrative.

const BEHAVIOURS: PrismDimension[] = [
  dim(1, "Innovating", 95, 1),
  dim(2, "Initiating", 75, 1),
  dim(3, "Supporting", 80, 2),
  dim(4, "Coordinating", 8, 2),
  dim(5, "Focusing", 40, 3),
  dim(6, "Delivering", 60, 3),
  dim(7, "Finishing", 96, 4),
  dim(8, "Evaluating", 88, 4),
]

const fullProfile = (
  over: Partial<FullPrismProfileResponse> = {},
): FullPrismProfileResponse => ({
  hasData: true,
  scales: [
    { key: "innovating", label: "Innovating", group: "Behavior Preferences", scores: { Underlying: 95, Adapted: 61 } },
    { key: "practical_mechanical", label: "Practical and mechanical", group: "Work Preference Profile", scores: { Underlying: 44 } },
  ],
  colours: { gold: 92, green: 30.5, blue: 76.5, orange: 40 },
  missing: [],
  coverage: 2,
  fromLegacyRows: false,
  isConflicted: false,
  conflicts: [],
  conflictMessage: null,
  ...over,
})

describe("subjectFromFullPrism", () => {
  it("carries the Adapted score the dossier path structurally cannot", () => {
    // The regression, stated as data. Without this the gap section is asked to
    // read a comparison it was never given.
    const s = subjectFromFullPrism("Ben", fullProfile(), { prism: BEHAVIOURS })
    expect(s.scores.innovating).toEqual({ Underlying: 95, Adapted: 61 })
  })

  it("passes the server's own rubric keys through verbatim", () => {
    // Including a snake_case one. This is the whole reason the shape is a
    // pass-through rather than a mapping: `"Practical and mechanical"` is keyed
    // `practical_mechanical`, so any client-side derivation from the label is
    // wrong for 78 of the 88 scales.
    const s = subjectFromFullPrism("Ben", fullProfile(), { prism: BEHAVIOURS })
    expect(Object.keys(s.scores).sort()).toEqual(["innovating", "practical_mechanical"])
  })

  it("reads more than the eight behaviours the radar carries", () => {
    // The quieter half of the same defect: every write-up so far was generated
    // from 8 of the ~87 scales a real person has on file.
    const many = fullProfile({
      scales: Array.from({ length: 40 }, (_, i) => ({
        key: `scale_${i}`,
        label: `Scale ${i}`,
        group: "Work Preference Profile",
        scores: { Underlying: i },
      })),
    })
    const s = subjectFromFullPrism("Ben", many, { prism: BEHAVIOURS })
    expect(Object.keys(s.scores).length).toBeGreaterThan(BEHAVIOURS.length)
  })

  it("derives the brain map from the behaviours, never from the server's colour map", () => {
    // `full.colours` is keyed by the canon's COLUMN names, which include the
    // legacy `orange` for what PRISM calls Red. Passing it through would put
    // "orange 40" into a prompt and from there into prose a manager reads.
    // PRISM has no orange quadrant.
    const s = subjectFromFullPrism("Ben", fullProfile(), { prism: BEHAVIOURS })
    expect(Object.keys(s.colours ?? {})).not.toContain("orange")
    expect(Object.keys(s.colours ?? {}).sort()).toEqual(["Blue", "Gold", "Green", "Red"])
    // And the values are the behaviour means, not the server's numbers.
    expect(s.colours?.Gold).toBe(92)
    expect(s.colours?.Green).toBe(85)
  })

  it("skips a scale the server sent with no score types", () => {
    // `{}` is a row that carried nothing, not a zero. Storing it would make
    // `hasScores` true off a profile with no numbers in it.
    const s = subjectFromFullPrism(
      "Ben",
      fullProfile({ scales: [{ key: "innovating", label: "", group: "", scores: {} }] }),
      { prism: BEHAVIOURS },
    )
    expect(s.scores).toEqual({})
    expect(hasScores(s)).toBe(false)
  })

  it("REFUSES a conflicted profile instead of narrating the agreeing remainder", () => {
    // Two assessments under one person disagreeing meant, on dev, two different
    // people's PRISM reports filed under one account. `scales` already excludes
    // the disagreeing entries, but the overlap that reveals a conflict is a
    // lower bound — so the remainder is unverifiable too, and narrating it
    // would put a blend of two humans in front of a manager.
    const conflicted = fullProfile({
      isConflicted: true,
      conflicts: ["innovating"],
      conflictMessage: "These records disagree.",
    })
    expect(() => subjectFromFullPrism("Ben", conflicted, { prism: BEHAVIOURS })).toThrow(
      ConflictedProfileError,
    )
    expect(() => subjectFromFullPrism("Ben", conflicted, { prism: BEHAVIOURS })).toThrow(
      "These records disagree.",
    )
  })

  it("still refuses when the server sends no conflict message", () => {
    // The refusal may not depend on prose the server happened to include.
    const conflicted = fullProfile({ isConflicted: true, conflictMessage: null })
    expect(() => subjectFromFullPrism("Ben", conflicted, { prism: BEHAVIOURS })).toThrow(
      ConflictedProfileError,
    )
  })
})

describe("bestSubject", () => {
  it("prefers the full profile when there is one", () => {
    const s = bestSubject("Ben", fullProfile(), { prism: BEHAVIOURS })
    expect(s.scores.innovating).toEqual({ Underlying: 95, Adapted: 61 })
  })

  it("falls back to the behaviour radar when the person has no assessment row", () => {
    // `hasData: false` is an ordinary state — scores that live only in the
    // legacy `prism_results` row, which the dossier can still see. Emptying a
    // working surface for them would be a regression dressed as a fix.
    for (const full of [null, fullProfile({ hasData: false, scales: [] })]) {
      const s = bestSubject("Ben", full, { prism: BEHAVIOURS })
      expect(Object.keys(s.scores).length).toBe(8)
      expect(s.scores.innovating).toEqual({ Underlying: 95 })
    }
  })

  it("does NOT fall back on a conflict — it re-throws", () => {
    // The one case where falling back would be actively harmful: the behaviour
    // radar is derived from the same untrustworthy rows.
    const conflicted = fullProfile({ isConflicted: true, conflictMessage: "Records disagree." })
    expect(() => bestSubject("Ben", conflicted, { prism: BEHAVIOURS })).toThrow(
      ConflictedProfileError,
    )
  })
})
