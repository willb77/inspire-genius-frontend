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
 * 3. **Every answer is safety-screened before the next question (D-08).** The
 *    questions in a category are fetched up front, so nothing server-side used
 *    to see an answer before the next question appeared. A discovery answer
 *    now goes to `screenAnswer` first; the stated goal and the ladder answers
 *    are screened inside `/why-ladder`, where they go anyway. Each answer is
 *    screened ONCE — a flag is a recorded event and can alert people. If the
 *    server returns its crisis reply, that reply is shown, the answer is not
 *    banked, and the interview pauses until the person chooses to carry on.
 *    A screen that cannot be reached does not hold the interview.
 * 4. **Every discovery answer is saved as it is given (D-16).** It used to be
 *    held in the tab until the category closed, so a reload or a second tab
 *    lost it silently. Each save carries `expected_rev`, the session revision
 *    the interview's position was read from; the next question is not shown
 *    until the save lands. A 409 means the session moved — another window, or
 *    our own retry that had already landed. Ours is treated as saved. Anyone
 *    else's is NEVER re-sent automatically: the interview says so, catches up
 *    from the stored session, and puts the unsent text back in the box.
 *    Re-sending could bank the answer against the other window's question or
 *    overwrite its stored thread.
 */
import { useCallback, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  askCategory,
  getGoalSession,
  saveDiscovery,
  screenAnswer,
  synthesizeGoals,
  whyLadder,
} from "@/services/summit/goals.service"
import { summitKeys } from "@/hooks/summit/useGoalSession"
import {
  SUMMIT_CATEGORY_KEYS,
  type SummitAnswer,
  type SummitCategoryKey,
  type SummitCrisis,
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
  /** D-08: the server's crisis reply is on screen; no question is open. */
  | "paused"

export type InterviewTurnKind =
  | "intro"
  | "question"
  | "why"
  | "root"
  | "note"
  | "error"
  /** D-08: the platform's fixed crisis reply, shown as the server sent it. */
  | "crisis"

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

/** The server stores at most this many questions in a category's thread. */
export const MAX_THREAD_QUESTIONS = 6

/** Shown when a save is refused because the session moved in another window. */
export const SESSION_CHANGED_NOTE =
  "This conversation was updated in another window, so I've caught up with where you are. Your last answer wasn't saved — it's back in the box if you still want to send it."

/** Shown when a second save in a row is refused for the same reason. */
export const SESSION_CHANGED_AGAIN_ERROR =
  "This conversation keeps changing in another window, so I couldn't save that answer. Close the other window, then send it again — it's back in the box."

/** Shown when a save fails for any other reason. The answer is not lost. */
export const ANSWER_NOT_SAVED_ERROR =
  "I couldn't save that answer — send it again. It's still in the box."

/**
 * Is this the server refusing a discovery save because the session has moved
 * on since `expected_rev`? 409 with `detail.code === "goal_session_conflict"`.
 */
export function isSessionConflict(err: unknown): boolean {
  const response = (err as { response?: { status?: number; data?: unknown } } | null)
    ?.response
  if (response?.status !== 409) return false
  const detail = (response.data as { detail?: { code?: unknown } } | undefined)?.detail
  return detail?.code === "goal_session_conflict"
}

/**
 * Where to resume a category from its stored thread, or null to ask afresh.
 *
 * The next question is `answers.length - thread.start`. A category with no
 * stored thread (saved before threads existed) returns null and goes through
 * `/ask`, which feeds the earlier answers back so it continues rather than
 * repeats.
 */
export function resumePoint(
  session: SummitSession | undefined,
  key: SummitCategoryKey
): { questions: string[]; index: number } | null {
  const cat = session?.categories?.[key]
  if (!cat || cat.status !== "active") return null
  const questions = cat.thread?.questions?.filter(Boolean) ?? []
  if (questions.length === 0) return null
  const index = (cat.answers?.length ?? 0) - (cat.thread?.start ?? 0)
  if (index < 0 || index >= questions.length) return null
  return { questions, index }
}

/**
 * Does `key` read the same in both sessions — same status, same answers, same
 * stored thread? Used after a 409 to tell "something else in the session
 * moved" from "this category moved".
 */
export function categoryUnchanged(
  before: SummitSession | undefined,
  after: SummitSession | undefined,
  key: SummitCategoryKey
): boolean {
  const a = before?.categories?.[key]
  const b = after?.categories?.[key]
  if (!a || !b) return false
  return (
    a.status === b.status &&
    JSON.stringify(a.answers ?? []) === JSON.stringify(b.answers ?? []) &&
    JSON.stringify(a.thread ?? null) === JSON.stringify(b.thread ?? null)
  )
}

export type UseSummitInterviewOptions = {
  session: SummitSession | undefined
  /** Called once goals have been synthesised, so the surface can react. */
  onGoalsSynthesised?: (count: number) => void
  /**
   * Called with an answer the interview could not save, so the surface can
   * put it back in the input. Nothing the person typed is dropped.
   */
  onRestoreAnswer?: (text: string) => void
}

export function useSummitInterview({
  session,
  onGoalsSynthesised,
  onRestoreAnswer,
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
  // D-16: the session revision the position above was read from, sent as
  // `expected_rev` with every discovery save. Only a save response or a
  // deliberate re-read moves it — never a background refetch, which would
  // pair a fresh rev with a stale position and defeat the check.
  const revRef = useRef(0)
  // The newest session the interview itself has seen from the server.
  const knownSessionRef = useRef<SummitSession | undefined>(undefined)
  // An answer handed back after a failed save. It was screened once already
  // (D-08), so sending it unchanged does not screen it again.
  const restoredRef = useRef<string | null>(null)
  // Consecutive saves refused because the session moved elsewhere.
  const conflictStreakRef = useRef(0)
  const statedGoalRef = useRef("")
  const exchangesRef = useRef<SummitWhyExchange[]>([])
  const currentWhyRef = useRef("")
  // D-08: the step a pause interrupted, so "carry on" can reopen it.
  const pausedFromRef = useRef<"question" | "stating-goal" | "ladder" | null>(null)

  const push = useCallback((turn: Omit<InterviewTurn, "id">) => {
    setTurns((prev) => [...prev, { ...turn, id: nextId(turn.role) }])
  }, [])

  const pushError = useCallback(
    (text: string) => push({ role: "summit", text, kind: "error" }),
    [push]
  )

  /**
   * D-08: show the server's crisis reply and stop asking. The answer that
   * raised it is not banked by the caller, so it never reaches synthesis.
   */
  const pauseForCrisis = useCallback(
    (crisis: SummitCrisis, from: "question" | "stating-goal" | "ladder") => {
      pausedFromRef.current = from
      push({ role: "summit", text: crisis.content, kind: "crisis" })
      setPhase("paused")
    },
    [push]
  )

  /**
   * D-08: screen one discovery answer. Fails OPEN — a screen that errors or
   * times out resolves to null and the interview carries on, because a safety
   * call that is down must not strand every person mid-interview. The cost is
   * that such an answer goes unscreened, as every answer did before this.
   */
  const screenDiscoveryAnswer = useCallback(async (text: string) => {
    try {
      return await screenAnswer(text)
    } catch {
      return null
    }
  }, [])

  /**
   * Open a category, or move to the stated goal when there are none.
   *
   * `base` is the session the position is read from; its `rev` becomes the
   * `expected_rev` of the next save. A category with a stored thread resumes
   * at its next unanswered question without calling `/ask` (D-16).
   */
  const openCategory = useCallback(
    async (key: SummitCategoryKey | null, base: SummitSession | undefined) => {
      knownSessionRef.current = base
      revRef.current = base?.rev ?? 0
      if (!key) {
        // Discovery is done. Ask for the sentence the ladder will work on.
        categoryRef.current = null
        setPhase("stating-goal")
        push({ role: "summit", text: STATED_GOAL_PROMPT, kind: "question" })
        return
      }
      const resumeAt = resumePoint(base, key)
      if (resumeAt) {
        categoryRef.current = key
        questionsRef.current = resumeAt.questions
        qIndexRef.current = resumeAt.index
        push({
          role: "summit",
          text: resumeAt.questions[resumeAt.index],
          kind: "question",
        })
        setPhase("question")
        return
      }
      setPhase("opening")
      setBusy(true)
      try {
        const asked = await askCategory(key)
        categoryRef.current = key
        questionsRef.current = asked.questions
          .filter(Boolean)
          .slice(0, MAX_THREAD_QUESTIONS)
        qIndexRef.current = 0

        if (asked.intro) push({ role: "summit", text: asked.intro, kind: "intro" })
        if (questionsRef.current.length === 0) {
          // Nothing to ask — do not strand the person on an empty category.
          await openCategory(nextCategory(base, key), base)
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
    [push, pushError]
  )

  /** Hand an unsaved answer back to the surface, already screened. */
  const restoreAnswer = useCallback(
    (text: string) => {
      restoredRef.current = text
      onRestoreAnswer?.(text)
    },
    [onRestoreAnswer]
  )

  /**
   * An answer is stored. Take the new revision, seed the cache, and only now
   * show the next question — or open the next category after the last one.
   */
  const advanceAfterSave = useCallback(
    async (saved: SummitSession, key: SummitCategoryKey, expected: number) => {
      conflictStreakRef.current = 0
      knownSessionRef.current = saved
      revRef.current = typeof saved?.rev === "number" ? saved.rev : expected + 1
      qc.setQueryData(summitKeys.session, saved)
      const next = qIndexRef.current + 1
      if (next < questionsRef.current.length) {
        qIndexRef.current = next
        push({ role: "summit", text: questionsRef.current[next], kind: "question" })
        return
      }
      await openCategory(nextCategory(saved, key), saved)
    },
    [qc, push, openCategory]
  )

  /**
   * A save came back 409: the session moved since `expected`. Re-read it.
   *
   * If the move is our own retry that already landed — rev is exactly one on
   * and the newest stored answer is the one just sent — the answer IS saved.
   * Anything else is another window. Never re-send in that case: say so,
   * re-derive the position from the stored session (the next area, if the
   * other window finished this one), and give the text back.
   */
  const handleConflict = useCallback(
    async (key: SummitCategoryKey, sent: SummitAnswer, expected: number) => {
      let fresh: SummitSession
      try {
        fresh = await getGoalSession()
      } catch {
        pushError(ANSWER_NOT_SAVED_ERROR)
        restoreAnswer(sent.answer)
        return
      }
      const answers = fresh?.categories?.[key]?.answers ?? []
      const newest = answers[answers.length - 1]
      if (
        fresh?.rev === expected + 1 &&
        newest?.answer === sent.answer &&
        newest?.question === sent.question
      ) {
        await advanceAfterSave(fresh, key, expected)
        return
      }
      qc.setQueryData(summitKeys.session, fresh)
      conflictStreakRef.current += 1
      if (conflictStreakRef.current >= 2) {
        pushError(SESSION_CHANGED_AGAIN_ERROR)
      } else {
        push({ role: "summit", text: SESSION_CHANGED_NOTE, kind: "note" })
      }
      restoreAnswer(sent.answer)
      // Re-derive the position. When the move was somewhere else entirely — a
      // goal confirmed, another area — this category reads exactly as it did,
      // so the position stands: ask the same question again against the new
      // revision, rather than fetching a differently-worded thread.
      if (categoryUnchanged(knownSessionRef.current, fresh, key)) {
        knownSessionRef.current = fresh
        revRef.current = fresh?.rev ?? 0
        push({
          role: "summit",
          text: questionsRef.current[qIndexRef.current] ?? sent.question,
          kind: "question",
        })
        setPhase("question")
        return
      }
      const stillOpen = fresh?.categories?.[key]?.status !== "explored"
      await openCategory(
        stillOpen ? key : nextCategory(fresh, key),
        fresh
      )
    },
    [qc, push, pushError, restoreAnswer, advanceAfterSave, openCategory]
  )

  /**
   * Save one discovery answer (D-16). The next question waits for the save.
   * `expected_rev` is always sent: without it the server appends blindly, and
   * a retry of a request that had already landed would bank the answer twice.
   */
  const saveAnswer = useCallback(
    async (text: string) => {
      const key = categoryRef.current
      if (!key) return
      const index = qIndexRef.current
      const sent: SummitAnswer = {
        question: questionsRef.current[index] ?? "",
        answer: text,
      }
      const isLast = index + 1 >= questionsRef.current.length
      const expected = revRef.current
      setBusy(true)
      try {
        let saved: SummitSession
        try {
          saved = await saveDiscovery(key, {
            answers: [sent],
            status: isLast ? "explored" : "active",
            expected_rev: expected,
            // The thread is stored with its first answer, so a reload can
            // resume at the right question.
            questions:
              index === 0
                ? questionsRef.current.slice(0, MAX_THREAD_QUESTIONS)
                : undefined,
          })
        } catch (err) {
          if (isSessionConflict(err)) {
            await handleConflict(key, sent, expected)
            return
          }
          // Not banked, and saying so is the only honest option. The position
          // does not move, so a retry sends the same `expected_rev` — and if
          // this one did land after all, the 409 it gets is recognised as ours.
          pushError(ANSWER_NOT_SAVED_ERROR)
          restoreAnswer(text)
          return
        }
        await advanceAfterSave(saved, key, expected)
      } finally {
        setBusy(false)
      }
    },
    [pushError, restoreAnswer, handleConflict, advanceAfterSave]
  )

  /** One rung of the ladder. */
  const stepLadder = useCallback(
    async (exchanges: SummitWhyExchange[]) => {
      setBusy(true)
      try {
        // Client-side bound as well as the server's — see the header note.
        if (exchanges.length >= MAX_LADDER_RUNGS) {
          // D-08: this last answer never goes to /why-ladder, so it is the one
          // ladder answer that has to be screened by its own call.
          const last = exchanges[exchanges.length - 1]?.answer ?? ""
          const crisis = last ? await screenDiscoveryAnswer(last) : null
          if (crisis) {
            exchangesRef.current = exchanges.slice(0, -1)
            pauseForCrisis(crisis, "ladder")
            return false
          }
          push({
            role: "summit",
            text: "That's the root of it. Let me turn what you've told me into goals.",
            kind: "root",
          })
          await qc.invalidateQueries({ queryKey: summitKeys.session })
          return true
        }
        const rung = await whyLadder(statedGoalRef.current, exchanges)
        if (rung.crisis) {
          // D-08: the server screened the newest words and its crisis reply
          // replaces the rung. Un-bank them, and pause.
          if (exchanges.length === 0) {
            statedGoalRef.current = ""
            pauseForCrisis(rung.crisis, "stating-goal")
          } else {
            exchangesRef.current = exchanges.slice(0, -1)
            pauseForCrisis(rung.crisis, "ladder")
          }
          return false
        }
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
    [push, pushError, qc, pauseForCrisis, screenDiscoveryAnswer]
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
    void openCategory(nextCategory(session), session)
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
        // D-08: screen before the next (already fetched) question is shown —
        // once per answer. An answer handed back after a failed save was
        // screened already, so sent unchanged it is not screened again.
        const alreadyScreened = restoredRef.current === text
        restoredRef.current = null
        if (!alreadyScreened) {
          setBusy(true)
          const crisis = await screenDiscoveryAnswer(text)
          setBusy(false)
          if (crisis) {
            pauseForCrisis(crisis, "question")
            return
          }
        }
        // D-16: saved now, not when the category closes.
        await saveAnswer(text)
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
    [
      busy,
      phase,
      push,
      saveAnswer,
      stepLadder,
      synthesise,
      pauseForCrisis,
      screenDiscoveryAnswer,
    ]
  )

  /**
   * D-08: the person chose to carry on after a crisis reply. Reopens the step
   * the pause interrupted by asking its question again; nothing is skipped and
   * the answer that raised the reply stays un-banked.
   */
  const resume = useCallback(() => {
    if (busy || phase !== "paused") return
    const from = pausedFromRef.current
    pausedFromRef.current = null
    if (from === "question" && questionsRef.current[qIndexRef.current]) {
      push({
        role: "summit",
        text: questionsRef.current[qIndexRef.current],
        kind: "question",
      })
      setPhase("question")
      return
    }
    if (from === "ladder" && currentWhyRef.current) {
      push({ role: "summit", text: currentWhyRef.current, kind: "why" })
      setPhase("ladder")
      return
    }
    push({ role: "summit", text: STATED_GOAL_PROMPT, kind: "question" })
    setPhase("stating-goal")
  }, [busy, phase, push])

  /** Pass on the current category without answering the rest of it. */
  const skipCategory = useCallback(async () => {
    if (busy || phase !== "question") return
    const key = categoryRef.current
    push({ role: "summit", text: "No problem — we can come back to this.", kind: "note" })
    // Nothing to send: every answer given here was saved as it was given, and
    // the category is stored as `active`, not explored — it was not. Sending
    // them again would append every one a second time.
    const base = knownSessionRef.current ?? session
    await openCategory(nextCategory(base, key ?? undefined), base)
  }, [busy, phase, push, openCategory, session])

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
    /** D-08: carry on after a crisis reply. A no-op unless paused. */
    resume,
    /** Draft goals from whatever has been captured so far. */
    synthesise,
  }
}
