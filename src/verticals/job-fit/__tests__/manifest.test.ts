/**
 * @jest-environment jsdom
 */
import { JOB_FIT } from "../manifest"
import { getVertical, listEntitledVerticals } from "@/verticals/core"

describe("job-fit manifest", () => {
  test("registers with the expected shape", () => {
    expect(JOB_FIT.key).toBe("job-fit")
    expect(JOB_FIT.title).toBe("Job Fit")
    expect(JOB_FIT.routePrefix).toBe("/vertical/job-fit")
    expect(JOB_FIT.homePath).toBe("/vertical/job-fit/matches")
  })

  test("uses an accent distinct from GRANT and Job-Blueprint", () => {
    expect(JOB_FIT.accent).toBe("#0D9488")
    expect(JOB_FIT.accent).not.toBe("#3B5BFF")
    expect(JOB_FIT.accent).not.toBe("#7C3AED")
  })

  test("is discoverable through the Core registry", () => {
    expect(getVertical("job-fit")?.title).toBe("Job Fit")
  })

  test("surfaces only when the entitlement is present", () => {
    expect(listEntitledVerticals(["job-fit"]).map((v) => v.key)).toContain("job-fit")
    expect(listEntitledVerticals([]).map((v) => v.key)).not.toContain("job-fit")
  })
})
