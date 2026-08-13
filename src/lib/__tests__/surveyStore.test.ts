/**
 * @jest-environment jsdom
 */
import {
  countResponses,
  createDraftQuestion,
  createDraftSurvey,
  deleteSurvey,
  ensureSeeded,
  getSurvey,
  listResponses,
  listSurveys,
  newId,
  saveResponse,
  saveSurvey,
} from "@/lib/surveyStore"
import type { Survey } from "@/types/survey"

beforeEach(() => {
  localStorage.clear()
})

function makeSurvey(overrides: Partial<Survey> = {}): Survey {
  const ts = new Date().toISOString()
  return {
    id: newId("survey"),
    title: "Test survey",
    description: "desc",
    questions: [createDraftQuestion("text")],
    createdAt: ts,
    updatedAt: ts,
    ...overrides,
  }
}

describe("surveyStore seeding", () => {
  it("seeds two example surveys on first access", () => {
    ensureSeeded()
    const surveys = listSurveys()
    expect(surveys.length).toBe(2)
    expect(surveys.map((s) => s.title)).toEqual(
      expect.arrayContaining(["Team Pulse Check", "Coaching Intake"]),
    )
  })

  it("does not re-seed after the samples are deleted", () => {
    listSurveys() // triggers seed
    const first = listSurveys()
    for (const s of first) deleteSurvey(s.id)
    expect(listSurveys().length).toBe(0)
  })
})

describe("surveyStore CRUD", () => {
  it("saves, reads, and deletes a survey", () => {
    localStorage.setItem("ig.surveys.seeded.v1", "1") // skip seed noise
    const s = makeSurvey({ title: "Onboarding" })
    saveSurvey(s)
    expect(getSurvey(s.id)?.title).toBe("Onboarding")

    saveSurvey({ ...s, title: "Onboarding v2" })
    expect(getSurvey(s.id)?.title).toBe("Onboarding v2")
    // No duplicate row on upsert.
    expect(listSurveys().filter((x) => x.id === s.id).length).toBe(1)

    deleteSurvey(s.id)
    expect(getSurvey(s.id)).toBeUndefined()
  })

  it("createDraftQuestion sets type-appropriate defaults", () => {
    expect(createDraftQuestion("single").options).toEqual(["", ""])
    expect(createDraftQuestion("multi").options).toEqual(["", ""])
    expect(createDraftQuestion("rating").scaleMax).toBe(5)
    expect(createDraftQuestion("text").options).toBeUndefined()
  })

  it("createDraftSurvey produces an empty, id'd draft", () => {
    const d = createDraftSurvey()
    expect(d.id).toMatch(/^survey_/)
    expect(d.questions).toEqual([])
    expect(d.title).toBe("")
  })
})

describe("surveyStore responses", () => {
  it("records and counts responses per survey", () => {
    localStorage.setItem("ig.surveys.seeded.v1", "1")
    const s = makeSurvey()
    saveSurvey(s)

    saveResponse(s.id, { [s.questions[0].id]: "hello" })
    saveResponse(s.id, { [s.questions[0].id]: "world" })

    expect(countResponses(s.id)).toBe(2)
    expect(listResponses(s.id).length).toBe(2)
    expect(listResponses("other")).toEqual([])
  })
})

describe("newId", () => {
  it("returns unique prefixed ids", () => {
    const a = newId("q")
    const b = newId("q")
    expect(a).toMatch(/^q_/)
    expect(a).not.toBe(b)
  })
})
