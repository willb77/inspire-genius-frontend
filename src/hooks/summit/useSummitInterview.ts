/**
 * The Summit interview — a directed session that drives to the why of a goal.
 *
 * This is the driver the backend never had. `/ask`, `/why-ladder` and
 * `/synthesize` were built, deployed and working; nothing in the product called
 * them. The Summit surface offered generic Meridian chat instead and hoped
 * intent routing landed on the right specialist, which is why a live session
 * could hold seven goals and zero WHY roots — the goals had been typed, not
 * excavated.
 *
 * **The loop is deterministic on purpose.** At every point this hook knows
 * which category it is on, which question within it, and which rung of the
 * ladder it has reached. That is the entire argument for driving the structured
 * routes directly rather than posting free text at a classifier: there is
 * nothing left for intent inference to get wrong. Free-text chat still has a
 * place — it is what the person types *into* the interview — but it is an
 * answer to a known question, not a guess at an unknown intent.
 *
 * The shape of a session:
 *
 *   discovery      five categories, 3–4 questions each, asked one at a time
 *   ↓
 *   stated goal    one plain-language sentence, asked by us, not the model
 *   ↓
 *   WHY ladder     3–5 rungs to a value, identity or emotional root
 *   ↓
 *   synthesis      captured answers + PRISM + roots → structured goals
 *
 * Two decisions worth keeping:
 *
 * 1. **We ask for the stated goal ourselves.** The ladder needs one sentence to
 *    ladder. Picking it out of the model's own ambitions questions would mean
 *    guessing which generated question was the goal one — so we ask a fixed
 *    question of our own and ladder the answer. Deterministic beats clever.
 * 2. **The rung cap is enforced here as well as server-side.** The backend
 *    hard-caps at five and forces `is_root`. Trusting a remote loop bound to be
 *    enforced remotely is how an interview becomes an interrogation, so the
 *    client counts too.
 */
import { useCallback, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  askCategory,
  saveDiscovery,
  synthesizeGoals,
  whyLadder,
} from "@/services/summit/goals.service"
import { summitKeys } from "@/hooks/summit/useGoalSession"
import {
  SUMMIT_CATEGORY_KEYS,
  type SummitAnswer,
  type SummitCategoryKey,
  type SummitSession,
  type SummitWhyExchange,
} from "@/types/summit"

/** Where the interview is. Drives what an incoming answer means. */
export type InterviewPhase =
  | "idle"
  | "opening"
  | "question"
  | "stating-goal"
  | "ladder"
  | "synthesizing"
  | "complete"

export type InterviewTurnKind =
  | "intro"
  | "question"
  | "why"
  | "root"
  | "note"
  | "error"

export type InterviewTurn = {
  id: string
  role: "summit" | "user"
  text: string
  kind?: InterviewTurnKind
}

/**
 * The sentence we ladder. Ours, not the model's — see the header note.
 * Deliberately about change rather than ambition: "what do you want to be"
 * invites a job title, and a job title has no why underneath it.
 */
export const STATED_GOAL_PROMPT =
  "Before we turn this into goals — in one sentence, what do you actually want to change?"

/** Client-side ladder bound. The backend caps too; both is the point. */
export const MAX_LADDER_RUNGS = 5

let seq = 0
function nextId(prefix: string): string {
  seq += 1
  return `${prefix}-${seq}`
}

/**
 * Which category to work on next.
 *
 * The first in the backend's fixed order that is not yet explored. Order comes
 * from `SUMMIT_CATEGORY_KEYS` rather than `Object.keys`, because JSON key order
 * is not something to sequence an interview on.
 */
export function nextCategory(
  session: SummitSession | undefined,
  after?: SummitCategoryKey
): SummitCategoryKey | null {
  const startAt = after ? SUMMIT_CATEGORY_KEYS.indexOf(after) + 1 : 0
  for (let i = startAt; i < SUMMIT_CATEGORY_KEYS.length; i += 1) {
    const key = SUMMIT_CATEGORY_KEYS[i]
    if (session?.categories?.[key]?.status !== "explored") return key
  }
  return null
}

export type UseSummitInterviewOptions = {
  session: SummitSession | undefined
  /** Called once goals have been synthesised, so the surface can react. */
  onGoalsSynthesised?: (count: number) => void
}

export function useSummitInterview({
  session,
  onGoalsSynthesised,
}: UseSummitInterviewOptions) {
  const qc = useQueryClient()

  const [turns, setTurns] = useState<InterviewTurn[]>([])
  const [phase, setPhase] = useState<InterviewPhase>("idle")
  const [busy, setBusy] = useState(false)

  // Interview position. Refs, not state: an answer handler needs to read and
  // advance these within one turn, and a stale closure over `useState` would
  // re-ask the question just answered.
  const categoryRef = useRef<SummitCategoryKey | null>(null)
  const questionsRef = useRef<string[]>([])
  const qIndexRef = useRef(0)
  const answersRef = useRef<SummitAnswer[]>([])
  const statedGoalRef = useRef("")
  const exchangesRef = useRef<SummitWhyExchange[]>([])
  const currentWhyRef = useRef("")

  const push = useCallback((turn: Omit<InterviewTurn, "id">) => {
    setTurns((prev) => [...prev, { ...turn, id: nextId(turn.role) }])
  }, [])

  const pushError = useCallback(
    (text: string) => push({ role: "summit", text, kind: "error" }),
    [push]
  )

  /** Ask the next category, or move to the stated goal when there are none. */
  const openCategory = useCallback(
    async (key: SummitCategoryKey | null) => {
      if (!key) {
        // Discovery is done. Ask for the sentence the ladder will work on.
        categoryRef.current = null
        setPhase("stating-goal")
        push({ role: "summit", text: STATED_GOAL_PROMPT, kind: "question" })
        return
      }
      setPhase("opening")
      setBusy(true)
      try {
        const asked = await askCategory(key)
        categoryRef.current = key
        questionsRef.current = asked.questions.filter(Boolean)
        qIndexRef.current = 0
        answersRef.current = []

        if (asked.intro) push({ role: "summit", text: asked.intro, kind: "intro" })
        if (questionsRef.current.length === 0) {
          // Nothing to ask — do not strand the person on an empty category.
          await openCategory(nextCategory(session, key))
          return
        }
        push({
          role: "summit",
          text: questionsRef.current[0],
          kind: "question",
        })
        setPhase("question")
      } catch {
        pushError(
          "I couldn't load the next part of the conversation. Try again in a moment — nothing you've told me is lost."
        )
        setPhase("idle")
      } finally {
        setBusy(false)
      }
    },
    [push, pushError, session]
  )

  /** Bank a finished category, then move on. */
  const closeCategory = useCallback(async () => {
    const key = categoryRef.current
    if (!key) return
    try {
      await saveDiscovery(key, {
        answers: answersRef.current,
        status: "explored",
      })
      await qc.invalidateQueries({ queryKey: summitKeys.session })
    } catch {
      // The answers are lost server-side, and saying so is the only honest
      // option — silently continuing would show "explored" for a category the
      // backend never received.
      pushError(
        "I couldn't save that section. Your answers here may not have been kept — worth revisiting this category later."
      )
    }
    await openCategory(nextCategory(session, key))
  }, [qc, openCategory, pushError, session])

  /** One rung of the ladder. */
  const stepLadder = useCallback(
    async (exchanges: SummitWhyExchange[]) => {
      setBusy(true)
      try {
        // Client-side bound as well as the server's — see the header note.
        if (exchanges.length >= MAX_LADDER_RUNGS) {
          push({
            role: "summit",
            text: "That's the root of it. Let me turn what you've told me into goals.",
            kind: "root",
          })
          await qc.invalidateQueries({ queryKey: summitKeys.session })
          return true
        }
        const rung = await whyLadder(statedGoalRef.current, exchanges)
        if (rung.is_root) {
          push({
            role: "summit",
            text: rung.root
              ? `That's the root of it: ${rung.root}`
              : "That's the root of it.",
            kind: "root",
          })
          // The backend persists the root against the stated goal here, so the
          // session in cache is now stale in a way that matters.
          await qc.invalidateQueries({ queryKey: summitKeys.session })
          return true
        }
        currentWhyRef.current = rung.question
        push({ role: "summit", text: rung.question, kind: "why" })
        setPhase("ladder")
        return false
      } catch {
        pushError(
          "I lost my thread there. Say that again and I'll pick it back up."
        )
        return false
      } finally {
        setBusy(false)
      }
    },
    [push, pushError, qc]
  )

  /** Turn everything captured into goals. */
  const synthesise = useCallback(async () => {
    setPhase("synthesizing")
    setBusy(true)
    try {
      const result = await synthesizeGoals()
      const count = result.goals?.length ?? 0
      // Seed the cache from the response rather than re-reading: the session
      // comes back whole, and My Goals should already be right when the person
      // navigates to it.
      if (result.session) {
        qc.setQueryData(summitKeys.session, result.session)
      }
      await qc.invalidateQueries({ queryKey: summitKeys.session })
      push({
        role: "summit",
        text:
          count > 0
            ? `I've drafted ${count} goal${count === 1 ? "" : "s"} from what you've told me, each with the reason underneath it. They're in My Goals — nothing is fixed until you confirm it.`
            : "There isn't enough here to draft goals yet. Tell me a little more and I'll try again.",
        kind: "note",
      })
      onGoalsSynthesised?.(count)
      setPhase("complete")
    } catch {
      pushError(
        "I couldn't draft the goals just now. Everything you've told me is saved — try again in a moment."
      )
      setPhase("complete")
    } finally {
      setBusy(false)
    }
  }, [push, pushError, qc, onGoalsSynthesised])

  /** Begin, or resume at the first unexplored category. */
  const start = useCallback(() => {
    if (busy) return
    void openCategory(nextCategory(session))
  }, [busy, openCategory, session])

  /**
   * The person said something. What it means depends on where we are — which
   * is exactly why the loop is a state machine and not a chat window.
   */
  const answer = useCallback(
    async (raw: string) => {
      const text = raw.trim()
      if (!text || busy) return
      push({ role: "user", text })

      if (phase === "question") {
        answersRef.current = [
          ...answersRef.current,
          { question: questionsRef.current[qIndexRef.current] ?? "", answer: text },
        ]
        const next = qIndexRef.current + 1
        if (next < questionsRef.current.length) {
          qIndexRef.current = next
          push({
            role: "summit",
            text: questionsRef.current[next],
            kind: "question",
          })
          return
        }
        await closeCategory()
        return
      }

      if (phase === "stating-goal") {
        statedGoalRef.current = text
        exchangesRef.current = []
        const done = await stepLadder([])
        if (done) await synthesise()
        return
      }

      if (phase === "ladder") {
        exchangesRef.current = [
          ...exchangesRef.current,
          { question: currentWhyRef.current, answer: text },
        ]
        const done = await stepLadder(exchangesRef.current)
        if (done) await synthesise()
        return
      }

      // Anything said outside a known step is not dropped silently — the
      // interview simply has no question open for it.
      push({
        role: "summit",
        text: "Noted. Use the button below when you're ready to carry on.",
        kind: "note",
      })
    },
    [busy, phase, push, closeCategory, stepLadder, synthesise]
  )

  /** Pass on the current category without answering the rest of it. */
  const skipCategory = useCallback(async () => {
    if (busy || phase !== "question") return
    const key = categoryRef.current
    push({ role: "summit", text: "No problem — we can come back to this.", kind: "note" })
    // Whatever was answered before the skip is still worth keeping, but the
    // category is not marked explored: it was not.
    if (key && answersRef.current.length > 0) {
      try {
        await saveDiscovery(key, { answers: answersRef.current, status: "active" })
        await qc.invalidateQueries({ queryKey: summitKeys.session })
      } catch {
        /* best effort — the skip must not fail */
      }
    }
    await openCategory(nextCategory(session, key ?? undefined))
  }, [busy, phase, push, qc, openCategory, session])

  const categoryKey = categoryRef.current
  // Where this area sits in the run of five, 1-based. 0 when no area is open.
  const categoryNumber = categoryKey
    ? SUMMIT_CATEGORY_KEYS.indexOf(categoryKey) + 1
    : 0
  return {
    turns,
    phase,
    busy,
    /** Which category is open, if any. */
    categoryKey,
    /** 1-based position within the current category's questions. */
    questionNumber: qIndexRef.current + 1,
    questionCount: questionsRef.current.length,
    /** 1-based position of the open area among the five. 0 when none is open. */
    categoryNumber,
    /** How many areas the interview covers in total. Fixed at five. */
    categoryTotal: SUMMIT_CATEGORY_KEYS.length,
    /** Questions still unanswered in the open area, including the current one. */
    questionsRemaining: Math.max(
      0,
      questionsRef.current.length - qIndexRef.current
    ),
    /** How many rungs of the ladder have been climbed. */
    ladderRung: exchangesRef.current.length,
    statedGoal: statedGoalRef.current,
    start,
    answer,
    skipCategory,
    /** Draft goals from whatever has been captured so far. */
    synthesise,
  }
}
