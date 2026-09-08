/**
 * Rehydration for a reopened or resumed interview — package IS-C Lane B.
 *
 * Three of these pin defects that were found by reading the wire rather than
 * the types, and every one of them fails as an honest-looking screen rather
 * than an error:
 *
 *  - the detail route returns the session FLAT with `answers` nested, not
 *    `{session, answers}` as the service type claimed;
 *  - it names the answer id `id`, while `POST /answer` names it `answer_id`
 *    and the app reads `answer_id` — an undefined id makes the rating PATCH
 *    return early, saving nothing and reporting nothing;
 *  - the plan is stored `{items: [...]}` though create returns a bare array.
 */
import {
  finalizeResultFromDetail,
  rehydrateSession,
} from "../liveSessionResume"
import { normalizeSessionDetail } from "../live.service"
import type { SessionDetailWire } from "../live.service"

const STAR = {
  S: { present: true },
  T: { present: true },
  A: { present: true },
  R: { present: false },
}

const WIRE = (over: Partial<SessionDetailWire> = {}): SessionDetailWire => ({
  id: "sess-1",
  candidate_ref: { display_name: "Dana Reyes", candidate_hash: "abcdef1234567890" },
  requisition_id: "REQ-7",
  requisition_label: "Regional Manager — North",
  frame: {
    company: "Acme",
    industry: "logistics",
    roleTitle: "Regional Manager",
    reportingLine: "COO",
    scope: "3 depots",
  },
  plan: {
    items: [
      { competency_id: "c1", section: "vision", question: "Q1" },
      { competency_id: "c2", section: "vision", question: "Q2" },
      { competency_id: "c3", section: "drive", question: "Q3" },
    ],
  },
  consent: { captured: true, mode: "no_audio" },
  status: "in_progress",
  overall_score: null,
  recommendation: null,
  answers: [
    {
      // The wire spells it `id`. `answer_id` is absent — exactly as the route sends it.
      id: "ans-1",
      competency_id: "c1",
      question_text: "Q1",
      captured_answer: "…",
      suggested_score: 3,
      star_evidence: STAR,
      final_score: 4,
      final_source: "human",
      interviewer_notes: "solid",
    } as never,
    {
      id: "ans-2",
      competency_id: "c2",
      question_text: "Q2",
      captured_answer: "…",
      suggested_score: 3,
      star_evidence: STAR,
      // Seeded, never decided — a pre-IS-4 row looks exactly like this.
      final_score: 3,
      final_source: null,
    } as never,
  ],
  ...over,
})

describe("normalizeSessionDetail", () => {
  it("reads the FLAT wire shape, not {session, answers}", () => {
    const d = normalizeSessionDetail(WIRE())
    expect(d.session.session_id).toBe("sess-1")
    expect(d.session.frame?.roleTitle).toBe("Regional Manager")
    expect(d.answers).toHaveLength(2)
    expect(d.status).toBe("in_progress")
  })

  it("gives every answer an answer_id, taken from the wire's `id`", () => {
    const d = normalizeSessionDetail(WIRE())
    // Without this the rating PATCH has no id to send and returns early —
    // no request, no error, the interviewer's score silently discarded.
    expect(d.answers.map((a) => a.answer_id)).toEqual(["ans-1", "ans-2"])
  })

  it("unwraps the plan from {items: []}", () => {
    expect(normalizeSessionDetail(WIRE()).plan).toHaveLength(3)
  })

  it("accepts a bare-array plan too, so either backend works", () => {
    const wire = WIRE({ plan: [{ competency_id: "c9", section: "s", question: "Q" }] })
    expect(normalizeSessionDetail(wire).plan).toEqual([
      { competency_id: "c9", section: "s", question: "Q" },
    ])
  })

  it("treats a missing plan as empty rather than throwing", () => {
    expect(normalizeSessionDetail(WIRE({ plan: null })).plan).toEqual([])
  })
})

describe("rehydrateSession", () => {
  it("continues at the first question with no answer", () => {
    const r = rehydrateSession(normalizeSessionDetail(WIRE()))
    expect(r.startIndex).toBe(2)
    expect(r.complete).toBe(false)
  })

  it("keeps the answer id so a resumed rating can be saved", () => {
    const r = rehydrateSession(normalizeSessionDetail(WIRE()))
    expect(r.answers.c1.suggestion?.answer_id).toBe("ans-1")
    expect(r.answers.c2.suggestion?.answer_id).toBe("ans-2")
  })

  it("counts an answer as rated only when final_source says who decided", () => {
    const r = rehydrateSession(normalizeSessionDetail(WIRE()))
    expect(r.answers.c1.scored).not.toBeNull()
    // c2 carries final_score 3 — the INSERT seed, not a judgement. Trusting the
    // number would show a resumed interview as rated when nobody rated it.
    expect(r.answers.c2.scored).toBeNull()
  })

  it("reports complete when every planned question has an answer", () => {
    const wire = WIRE({ plan: { items: [{ competency_id: "c1", section: "v", question: "Q1" }] } })
    const r = rehydrateSession(normalizeSessionDetail(wire))
    expect(r.complete).toBe(true)
    expect(r.startIndex).toBe(0)
  })
})

describe("finalizeResultFromDetail", () => {
  it("shows the STORED roll-up, never a recomputation", () => {
    const wire = WIRE({ status: "finalized", overall_score: 4.25, recommendation: "Hire" })
    const f = finalizeResultFromDetail(normalizeSessionDetail(wire))
    // The mean of the rated answers is 4. The stored score is 4.25 — the
    // number the hiring decision was actually made on.
    expect(f.overall_score).toBe(4.25)
    expect(f.recommendation).toBe("Hire")
  })

  it("reports NULL rather than 0 when nothing was ever scored", () => {
    const f = finalizeResultFromDetail(normalizeSessionDetail(WIRE({ status: "abandoned" })))
    // 0.00 / 5 on an abandoned interview reads as "the candidate scored zero".
    expect(f.overall_score).toBeNull()
  })

  it("names the undecided answers rather than counting them", () => {
    const f = finalizeResultFromDetail(normalizeSessionDetail(WIRE()))
    expect(f.rated_count).toBe(1)
    expect(f.answer_count).toBe(2)
    expect(f.unrated).toEqual([
      { answer_id: "ans-2", competency_id: "c2", question_text: "Q2" },
    ])
  })

  it("reopens a wholly pre-IS-4 session with every answer undecided", () => {
    const wire = WIRE({
      status: "finalized",
      overall_score: 3.5,
      recommendation: "Hire",
      answers: [
        { id: "a", competency_id: "c1", captured_answer: "x", suggested_score: 3, star_evidence: STAR, final_score: 3, final_source: null },
        { id: "b", competency_id: "c2", captured_answer: "y", suggested_score: 4, star_evidence: STAR, final_score: 4, final_source: null },
      ] as never,
    })
    const f = finalizeResultFromDetail(normalizeSessionDetail(wire))
    // This is staging-b's three legacy sessions. The stored roll-up stands;
    // the answers say nobody is recorded as having decided them. Back-filling
    // `final_source` would invent the very fact the column exists to record.
    expect(f.overall_score).toBe(3.5)
    expect(f.rated_count).toBe(0)
    expect(f.unrated).toHaveLength(2)
  })
})
