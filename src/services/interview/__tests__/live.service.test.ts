/**
 * Live Interview service — the six calls that run a REAL scored interview.
 *
 * Package IS-9 of docs/plans/Three_Studios_Completion_Build_Plan.md. Before
 * this file the module was at 44% functions: `normalizeSectionScores` had its
 * own suite and not one of the six service methods was touched, so a wrong URL
 * or a swapped argument reached the browser unchallenged.
 *
 * These assert the URL, the verb and the argument ORDER, because that is where
 * this shape of module actually breaks — `scoreAnswer(sessionId, answerId)`
 * takes two ids of the same type, and transposing them is invisible to
 * TypeScript and to any test that only checks the response is returned.
 */
import { liveInterviewService } from "../live.service"
import type {
  CreateLiveSessionPayload,
  ScoreAnswerPayload,
  SubmitAnswerPayload,
} from "../live.service"

const post = jest.fn()
const patch = jest.fn()
const get = jest.fn()

jest.mock("@/lib/agentApi", () => ({
  agentApi: {
    post: (...args: unknown[]) => post(...args),
    patch: (...args: unknown[]) => patch(...args),
    get: (...args: unknown[]) => get(...args),
  },
}))

const BASE = "/v1/agents/interview/live/session"
const SID = "sess-1111"
const AID = "ans-2222"

const FRAME = {
  role_title: "Regional Manager",
  seniority: "mid",
  sector: "logistics",
} as unknown as CreateLiveSessionPayload["frame"]

const CREATE: CreateLiveSessionPayload = {
  frame: FRAME,
  candidate: { display_name: "Candidate A", external_id: "ext-9" },
  consent: { captured: true, mode: "no_audio", method: "in_app_ack" },
}

beforeEach(() => {
  post.mockReset()
  patch.mockReset()
  get.mockReset()
})

describe("liveInterviewService — routes and verbs", () => {
  it("createSession POSTs the base route and returns the plan", async () => {
    post.mockResolvedValue({
      data: { session_id: SID, plan: [{ competency_id: "c1", section: "vision", question: "Q?" }] },
    })

    const out = await liveInterviewService.createSession(CREATE)

    expect(post).toHaveBeenCalledWith(BASE, CREATE)
    expect(out.session_id).toBe(SID)
    expect(out.plan).toHaveLength(1)
  })

  it("submitAnswer POSTs under the session id", async () => {
    const payload: SubmitAnswerPayload = {
      competency_id: "c1",
      captured_answer: "I led the migration.",
      question_text: "Tell me about a migration.",
    }
    post.mockResolvedValue({
      data: {
        answer_id: AID,
        suggested_score: 3,
        star_evidence: {
          S: { present: true },
          T: { present: true },
          A: { present: true },
          R: { present: false },
        },
        capped: true,
      },
    })

    const out = await liveInterviewService.submitAnswer(SID, payload)

    expect(post).toHaveBeenCalledWith(`${BASE}/${SID}/answer`, payload)
    expect(out.answer_id).toBe(AID)
    expect(out.capped).toBe(true)
  })

  it("scoreAnswer PATCHes, and puts the two ids in the right order", async () => {
    // Both ids are strings. Transposing them type-checks and 404s at runtime,
    // which is exactly why the URL is asserted rather than just the result.
    const payload: ScoreAnswerPayload = { final_score: 4, interviewer_notes: "Strong R." }
    patch.mockResolvedValue({ data: { answer_id: AID, final_score: 4 } })

    await liveInterviewService.scoreAnswer(SID, AID, payload)

    expect(patch).toHaveBeenCalledWith(`${BASE}/${SID}/answer/${AID}`, payload)
    const url = patch.mock.calls[0][0] as string
    expect(url.indexOf(SID)).toBeLessThan(url.indexOf(AID))
  })

  it("scoreAnswer is the only write that uses PATCH", async () => {
    // The interviewer's rating is an update to an existing answer, not a new
    // one. A POST here would create duplicates rather than overwrite.
    patch.mockResolvedValue({ data: { answer_id: AID, final_score: 2 } })
    await liveInterviewService.scoreAnswer(SID, AID, { final_score: 2 })
    expect(post).not.toHaveBeenCalled()
    expect(patch).toHaveBeenCalledTimes(1)
  })

  it("finalize POSTs with no body", async () => {
    post.mockResolvedValue({
      data: {
        session: { session_id: SID },
        answers: [],
        section_scores: { vision: { mean: 3.5 } },
        overall_score: 3.5,
        overall_mean: 3.5,
        recommendation: "hire",
      },
    })

    const out = await liveInterviewService.finalize(SID)

    expect(post).toHaveBeenCalledWith(`${BASE}/${SID}/finalize`)
    expect(post.mock.calls[0]).toHaveLength(1)
    expect(out.recommendation).toBe("hire")
  })

  it("getSession GETs the session and returns its answers", async () => {
    get.mockResolvedValue({
      data: { session: { session_id: SID, status: "in_progress" }, answers: [{ answer_id: AID }] },
    })

    const out = await liveInterviewService.getSession(SID)

    expect(get).toHaveBeenCalledWith(`${BASE}/${SID}`)
    expect(out.session.status).toBe("in_progress")
    expect(out.answers).toHaveLength(1)
  })
})

describe("liveInterviewService — failures reach the caller", () => {
  // The module docstring promises the caller "degrades to an error state,
  // never a crash" when live_interview_scoring is off and every route 404s.
  // That contract only holds if the service REJECTS rather than resolving
  // undefined; a swallowed error is what produces a blank, honest-looking page.
  it("createSession rejects when the flag is off and the route 404s", async () => {
    post.mockRejectedValue(Object.assign(new Error("Not Found"), { response: { status: 404 } }))
    await expect(liveInterviewService.createSession(CREATE)).rejects.toThrow("Not Found")
  })

  it("finalize rejects rather than resolving an empty result", async () => {
    post.mockRejectedValue(new Error("boom"))
    await expect(liveInterviewService.finalize(SID)).rejects.toThrow("boom")
  })

  it("getSession rejects rather than resolving an empty result", async () => {
    get.mockRejectedValue(new Error("gone"))
    await expect(liveInterviewService.getSession(SID)).rejects.toThrow("gone")
  })
})

describe("the requisition crosses the wire in the shape the backend reads", () => {
  // `_CreateLiveSessionBody` reads requisition_id / requisition_label at the
  // TOP LEVEL, not inside `frame`. Putting them on the frame type-checks, sends
  // 200, and stores NULL — which is indistinguishable from an interviewer who
  // simply left the field blank. So the shape is asserted, not the round trip.
  it("sends snake_case at the top level, not inside the frame", async () => {
    post.mockResolvedValue({ data: { session_id: SID, plan: [] } })

    await liveInterviewService.createSession({
      ...CREATE,
      requisitionId: "REQ-2041",
      requisitionLabel: "Regional Manager — North",
    })

    const [, body] = post.mock.calls[0] as [string, Record<string, unknown>]
    expect(body.requisition_id).toBe("REQ-2041")
    expect(body.requisition_label).toBe("Regional Manager — North")
    expect(body).not.toHaveProperty("requisitionId")
    expect(body.frame).not.toHaveProperty("requisitionId")
  })

  it("omits the keys entirely when blank, rather than sending empty strings", async () => {
    // "" would group every un-keyed session together as though they shared one
    // opening — worse than NULL, which at least reads as "no opening".
    post.mockResolvedValue({ data: { session_id: SID, plan: [] } })
    await liveInterviewService.createSession({ ...CREATE, requisitionId: "   ", requisitionLabel: "" })

    const [, body] = post.mock.calls[0] as [string, Record<string, unknown>]
    expect(body).not.toHaveProperty("requisition_id")
    expect(body).not.toHaveProperty("requisition_label")
  })

  it("trims what the interviewer typed", async () => {
    post.mockResolvedValue({ data: { session_id: SID, plan: [] } })
    await liveInterviewService.createSession({ ...CREATE, requisitionId: "  REQ-7  " })
    const [, body] = post.mock.calls[0] as [string, Record<string, unknown>]
    expect(body.requisition_id).toBe("REQ-7")
  })

  it("still sends frame, candidate and consent unchanged", async () => {
    post.mockResolvedValue({ data: { session_id: SID, plan: [] } })
    await liveInterviewService.createSession({ ...CREATE, requisitionId: "REQ-1" })
    const [, body] = post.mock.calls[0] as [string, Record<string, unknown>]
    expect(body.frame).toEqual(CREATE.frame)
    expect(body.candidate).toEqual(CREATE.candidate)
    expect(body.consent).toEqual(CREATE.consent)
  })
})
