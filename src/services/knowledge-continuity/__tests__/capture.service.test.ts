/**
 * @jest-environment node
 *
 * Exercises the guided-capture LLM service wrappers. These route through the
 * Agent Engine (`getApi()`/`agentApi`), NOT the trainer-service `api` instance
 * — locks in the `/v1/agents/kce/capture/*` paths and envelope unwrapping.
 */

const post = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  getApi: () => ({ post }),
}))

import { extractUnits, nextQuestion } from "../capture.service"
import type { ExtractRequest, NextQuestionRequest } from "@/types/knowledge-continuity"

const envelope = <T>(data: T) => ({ data: { status: true, data } })

beforeEach(() => {
  jest.clearAllMocks()
  post.mockResolvedValue(envelope(undefined))
})

describe("Knowledge Continuity capture service (Agent Engine)", () => {
  test("nextQuestion POSTs to /v1/agents/kce/capture/next-question with the body", async () => {
    const body: NextQuestionRequest = {
      role_title: "Senior Water Treatment Operator",
      node: { name: "Recover the plant after a power failure", node_type: "task" },
      transcript: [],
      is_first: true,
    }
    post.mockResolvedValueOnce(envelope({ question: "Walk me through it.", coverage_note: null }))
    const res = await nextQuestion(body)
    expect(post).toHaveBeenCalledWith("/v1/agents/kce/capture/next-question", body)
    expect(res.data).toEqual({ question: "Walk me through it.", coverage_note: null })
  })

  test("extractUnits POSTs to /v1/agents/kce/capture/extract with the body", async () => {
    const body: ExtractRequest = {
      role_title: "Senior Water Treatment Operator",
      node: { name: "Recover the plant after a power failure", node_type: "task" },
      taxonomy_node_id: "tax-1",
      transcript: [{ question: "Q1", answer: "A1" }],
    }
    post.mockResolvedValueOnce(envelope({ units: [{ title: "Restart pumps" }] }))
    const res = await extractUnits(body)
    expect(post).toHaveBeenCalledWith("/v1/agents/kce/capture/extract", body)
    expect(res.data).toEqual({ units: [{ title: "Restart pumps" }] })
  })
})
