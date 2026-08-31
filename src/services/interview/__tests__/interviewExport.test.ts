/**
 * @jest-environment jsdom
 */
import { buildInterviewMarkdown, type InterviewSession } from "../interviewExport"
import type { InterviewFrame } from "../practice.service"

const FRAME: InterviewFrame = {
  company: "Acme Corp", industry: "Fintech", roleTitle: "VP Engineering",
  reportingLine: "CTO", scope: "40 engineers", numQuestions: 3, lengthMinutes: 10,
}

const SESSION: InterviewSession = {
  frame: FRAME,
  exchanges: [
    { number: 1, sectionTitle: "Vision & Strategic Alignment", competency: "Strategic Vision", question: "Q1?", answer: "A1" },
    { number: 2, sectionTitle: "Behavioral", competency: "Conflict Resolution", question: "Q2?", answer: "A2" },
  ],
  coaching: { 1: "Coaching for 1", 2: "Coaching for 2" },
  findings: "Key Strengths: strong.",
  planned: 3,
  userLabel: "Will Brown",
}

describe("buildInterviewMarkdown", () => {
  it("includes the frame, findings, and every Q/A/coaching", () => {
    const md = buildInterviewMarkdown(SESSION)
    expect(md).toContain("VP Engineering")
    expect(md).toContain("Acme Corp")
    expect(md).toContain("2 of 3")
    expect(md).toContain("## Coaching Summary")
    expect(md).toContain("Key Strengths: strong.")
    expect(md).toContain("## Full Transcript")
    expect(md).toContain("Question 1 — Vision & Strategic Alignment · Strategic Vision")
    expect(md).toContain("A1")
    expect(md).toContain("Coaching for 2")
  })

  it("handles a missing findings summary gracefully", () => {
    const md = buildInterviewMarkdown({ ...SESSION, findings: null })
    expect(md).toContain("No summary was generated")
  })
})
