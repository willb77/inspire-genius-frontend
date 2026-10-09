/** @jest-environment jsdom */
/** 3.4 P4 — scored practice beside the coaching: off is a no-op, order holds, errors are said. */
import { act, renderHook, waitFor } from "@testing-library/react"
import { useScoredPractice } from "../useScoredPractice"

let on = true
jest.mock("@/hooks/switches/usePracticeScoredEnabled", () => ({ usePracticeScoredEnabled: () => on }))
const create = jest.fn()
const post = jest.fn()
const finalize = jest.fn()
jest.mock("@/services/interview/scoredPractice.service", () => ({
  createScoredPractice: (...a: unknown[]) => create(...a),
  postScoredPracticeAnswer: (...a: unknown[]) => post(...a),
  finalizeScoredPractice: (...a: unknown[]) => finalize(...a),
}))

const ITEMS = [{ id: "vision.strategic_vision", question: "Q" }]

beforeEach(() => {
  on = true
  jest.resetAllMocks()
  post.mockResolvedValue({})
  finalize.mockResolvedValue({ overall_score: 3 })
})

it("off: start, record and finish do nothing", async () => {
  on = false
  const { result } = renderHook(() => useScoredPractice())
  act(() => result.current.start(ITEMS, {}))
  act(() => result.current.record("vision.strategic_vision", "a"))
  await act(() => result.current.finish())
  expect(create).not.toHaveBeenCalled()
  expect(finalize).not.toHaveBeenCalled()
})

it("an answer recorded before the session exists is posted once it does, and finish waits for it", async () => {
  let resolveCreate: (v: { session_id: string }) => void = () => {}
  create.mockReturnValue(new Promise((r) => { resolveCreate = r }))
  const order: string[] = []
  // The post settles a few ticks AFTER it is called, so "finalize waits" is
  // about completion, not about call order (which holds either way).
  post.mockImplementation(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
    order.push("post-done")
  })
  finalize.mockImplementation(async () => { order.push("finalize"); return { overall_score: 3 } })
  const { result } = renderHook(() => useScoredPractice())
  act(() => result.current.start(ITEMS, { roleTitle: "Data Scientist" }))
  act(() => result.current.record("vision.strategic_vision", "my answer"))
  const done = act(() => result.current.finish())
  resolveCreate({ session_id: "ps-9" })
  await done
  expect(post).toHaveBeenCalledWith("ps-9", "vision.strategic_vision", "my answer")
  expect(order).toEqual(["post-done", "finalize"])
  await waitFor(() => expect(result.current.result).toEqual({ overall_score: 3 }))
})

it("a failed create says so and posts nothing", async () => {
  create.mockRejectedValue(new Error("403"))
  const { result } = renderHook(() => useScoredPractice())
  act(() => result.current.start(ITEMS, {}))
  act(() => result.current.record("vision.strategic_vision", "a"))
  await act(() => result.current.finish())
  expect(post).not.toHaveBeenCalled()
  expect(finalize).not.toHaveBeenCalled()
  expect(result.current.error).toMatch(/couldn't be saved/)
})
