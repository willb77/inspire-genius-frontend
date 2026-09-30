import {
  liveInterviewCandidateLink,
  liveInterviewPathForRole,
  liveInterviewSessionLink,
} from "@/lib/interviewRoutes"

describe("interviewRoutes", () => {
  it("maps the three roles that have a Live Interview page", () => {
    expect(liveInterviewPathForRole("manager")).toBe("/manager/interview-live")
    expect(liveInterviewPathForRole("practitioner")).toBe("/practitioner/interview-live")
    expect(liveInterviewPathForRole("super-admin")).toBe("/super-admin/interview-live")
    expect(liveInterviewPathForRole("Manager")).toBe("/manager/interview-live")
  })

  it("returns null for roles with no route, so nothing links to a 404", () => {
    for (const role of ["user", "company-admin", "distributor", "", null, undefined]) {
      expect(liveInterviewPathForRole(role)).toBeNull()
      expect(liveInterviewCandidateLink(role, { blueprintId: "bp", candidateId: "c" })).toBeNull()
      expect(liveInterviewSessionLink(role, "s")).toBeNull()
    }
  })

  it("builds the candidate deep link with both ids, URL-encoded", () => {
    expect(liveInterviewCandidateLink("manager", { blueprintId: "bp 1", candidateId: "c&2" })).toBe(
      "/manager/interview-live?blueprintId=bp+1&candidateId=c%262",
    )
  })

  it("builds the session back-link, and refuses an empty session id", () => {
    expect(liveInterviewSessionLink("practitioner", "sess-9")).toBe("/practitioner/interview-live?session=sess-9")
    expect(liveInterviewSessionLink("practitioner", "")).toBeNull()
  })
})
