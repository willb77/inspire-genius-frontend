import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"
import {
  hasScores,
  subjectFromProfile,
  useSubjectNarrative,
  useTeamStudioCompare,
  useTeamStudioScenario,
} from "../useTeamStudio"
import type { StudioSubject } from "@/services/team-studio/teamStudio.service"
import type { PrismDimension } from "@/types/development"

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
  it("keys scores by behaviour label, not by numeric id", () => {
    // A payload of {"1": 71} means nothing to a reader and would silently mean
    // a different scale if the ids were ever renumbered.
    const s = subjectFromProfile("A. Member", {
      prism: [dim(1, "Innovating", 71, 1), dim(5, "Focusing", 40, 3)],
    })
    expect(s.scores).toEqual({ Innovating: 71, Focusing: 40 })
    expect(s.name).toBe("A. Member")
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
    expect(hasScores({ name: "x", scores: { Innovating: 1 } })).toBe(true)
  })
})

// ─── useSubjectNarrative ────────────────────────────────────────────────

describe("useSubjectNarrative", () => {
  const subject: StudioSubject = { name: "A. Member", scores: { Innovating: 71 } }

  it("fetches every part and stitches them in order", async () => {
    analyse.mockImplementation(({ part }: { part: number }) =>
      Promise.resolve({ part, parts: 4, analysis: `section-${part}`, notice: "REAL PERSON" }),
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
        : Promise.resolve({ part, parts: 3, analysis: `section-${part}`, notice: "" }),
    )
    const { result } = renderHook(() => useSubjectNarrative(), { wrapper })
    const out = await result.current.run(subject)

    expect(out.text).toContain("Section 3 of 3 could not be generated")
    expect(out.failed).toBe(1)
  })

  it("does not fetch a second part when the server says there is only one", async () => {
    analyse.mockResolvedValue({ part: 0, parts: 1, analysis: "all of it", notice: "" })
    const { result } = renderHook(() => useSubjectNarrative(), { wrapper })
    const out = await result.current.run(subject)
    expect(analyse).toHaveBeenCalledTimes(1)
    expect(out.text).toBe("all of it")
  })
})

// ─── Ports ──────────────────────────────────────────────────────────────

describe("the ports handed to the shared panels", () => {
  const cast = { subjects: [], isLoading: false }
  const resolve = (ids: string[]) => ids.map((id) => ({ name: id, scores: { Innovating: 1 } }))

  it("translates the panel's ids into whole subjects before sending them", async () => {
    // The panel works in ids because Character Lab does. Team Studio has no
    // stored profile to address, so the adapter resolves them here and the
    // panel never learns which backend it is talking to.
    compare.mockResolvedValue({ part: 0, parts: 1, comparison: "c", notice: "" })
    const { result } = renderHook(() => useTeamStudioCompare(cast, resolve), { wrapper })
    await result.current.compare.run(["ann", "bo"], 0)

    expect(compare).toHaveBeenCalledWith({
      subjects: [
        { name: "ann", scores: { Innovating: 1 } },
        { name: "bo", scores: { Innovating: 1 } },
      ],
      part: 0,
    })
  })

  it("sends questions and answers over the resolved subjects too", async () => {
    questions.mockResolvedValue({ questions: [], names: [], notice: "" })
    ask.mockResolvedValue({ answer: "a", question: "", names: [], notice: "" })
    const { result } = renderHook(() => useTeamStudioCompare(cast, resolve), { wrapper })

    await result.current.questions.run(["ann"])
    await result.current.ask.run(["ann"], "who?")

    expect(questions.mock.calls[0][0].subject).toHaveLength(1)
    expect(ask.mock.calls[0][0]).toMatchObject({ question: "who?" })
  })

  it("offers no scenario store, so no 'Keep this run' button can appear", async () => {
    // Team Studio has nowhere to keep a run. An optional store means the panel
    // hides the button rather than showing one that reports success and saves
    // nothing.
    scenario.mockResolvedValue({ behaviour: "b", focus: "f", heading: "", names: [], notice: "" })
    const { result } = renderHook(() => useTeamStudioScenario(cast, resolve), { wrapper })
    expect(result.current.store).toBeUndefined()

    await result.current.run.run(["ann"], "a hard week", "ann")
    expect(scenario).toHaveBeenCalledWith({
      subject: [{ name: "ann", scores: { Innovating: 1 } }],
      situation: "a hard week",
      focus: "ann",
    })
  })
})
