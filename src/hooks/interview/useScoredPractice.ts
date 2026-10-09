/**
 * Scored Interview Practice (3.4 Phase 4) beside the coached interview.
 *
 * The coached flow (Alex over useMeridianJob) is unchanged and never waits on
 * this: a session that cannot be created or an answer that cannot be scored
 * is reported in `error`, which the page renders — the interview carries on
 * and the read-out says the result was not saved. Off (the tier's switch, or a
 * role-pack set the scorer cannot score), every call is a no-op.
 */
import { useCallback, useRef, useState } from "react"
import { usePracticeScoredEnabled } from "@/hooks/switches/usePracticeScoredEnabled"

import {
  createScoredPractice,
  finalizeScoredPractice,
  postScoredPracticeAnswer,
  type ScoredPracticeItem,
  type ScoredPracticeResult,
} from "@/services/interview/scoredPractice.service"

export type ScoredPracticeMeta = {
  roleTitle?: string
  company?: string
  industry?: string
  goalId?: string
}

export function useScoredPractice() {
  const enabled = usePracticeScoredEnabled()

  const sessionRef = useRef<Promise<string | null> | null>(null)
  const pendingRef = useRef<Promise<unknown>[]>([])
  const [active, setActive] = useState(false)
  const [result, setResult] = useState<ScoredPracticeResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [finishing, setFinishing] = useState(false)

  const reset = useCallback(() => {
    sessionRef.current = null
    pendingRef.current = []
    setActive(false); setResult(null); setError(null); setFinishing(false)
  }, [])

  const start = useCallback(
    (items: ScoredPracticeItem[], meta: ScoredPracticeMeta) => {
      reset()
      if (!enabled || items.length === 0) return
      setActive(true)
      sessionRef.current = createScoredPractice({ items, ...meta })
        .then((r) => r.session_id)
        .catch(() => {
          setError("This practice couldn't be saved, so it won't be scored. Your coaching is unaffected.")
          return null
        })
    },
    [enabled, reset],
  )

  const record = useCallback((competencyId: string, answer: string) => {
    const created = sessionRef.current
    if (!created) return
    const p = created.then((sid) =>
      sid
        ? postScoredPracticeAnswer(sid, competencyId, answer).catch(() => {
            setError("One of your answers couldn't be scored. The result will cover the others.")
          })
        : undefined,
    )
    pendingRef.current.push(p)
  }, [])

  const finish = useCallback(async () => {
    const created = sessionRef.current
    if (!created) return
    setFinishing(true)
    try {
      await Promise.all(pendingRef.current)
      const sid = await created
      if (!sid) return
      setResult(await finalizeScoredPractice(sid))
    } catch {
      setError("Your simulated result couldn't be produced. Your written feedback is below.")
    } finally {
      setFinishing(false)
    }
  }, [])

  return { enabled, active, result, error, finishing, start, record, finish, reset }
}
