import { liveVersionOf, sameYearDraft } from "../catalogVersions"
import type { Catalog } from "@/types/curriculum"

const base: Catalog = {
  id: "cat-1",
  institutionId: "inst-1",
  catalogYear: "2026-2027",
  version: 1,
  status: "published",
  publishedAt: "2026-10-01T00:00:00Z",
}
const c = (o: Partial<Catalog>): Catalog => ({ ...base, ...o })

describe("sameYearDraft", () => {
  it("finds the draft of the same school and year", () => {
    const draft = c({ id: "cat-2", version: 2, status: "draft", publishedAt: null })
    expect(sameYearDraft([base, draft], base)).toBe(draft)
  })

  it("picks the newest when there are two drafts", () => {
    const d2 = c({ id: "cat-2", version: 2, status: "draft" })
    const d3 = c({ id: "cat-3", version: 3, status: "draft" })
    expect(sameYearDraft([base, d3, d2], base)).toBe(d3)
    expect(sameYearDraft([base, d2, d3], base)).toBe(d3)
  })

  it("ignores other years, other schools, non-drafts and the catalog itself", () => {
    const list = [
      base,
      c({ id: "y", catalogYear: "2027-2028", status: "draft" }),
      c({ id: "s", institutionId: "inst-2", status: "draft" }),
      c({ id: "p", version: 0, status: "superseded" }),
    ]
    expect(sameYearDraft(list, base)).toBeNull()
    const self = c({ status: "draft" })
    expect(sameYearDraft([self], self)).toBeNull()
  })
})

describe("liveVersionOf", () => {
  it("finds the published version of a draft's year", () => {
    const draft = c({ id: "cat-2", version: 2, status: "draft" })
    expect(liveVersionOf([base, draft, c({ id: "old", version: 0, status: "superseded" })], draft)).toBe(base)
  })

  it("counts only a published sibling — not a superseded one or another draft", () => {
    const draft = c({ id: "cat-2", version: 2, status: "draft" })
    const list = [draft, c({ id: "old", version: 1, status: "superseded" }), c({ id: "d3", version: 3, status: "draft" })]
    expect(liveVersionOf(list, draft)).toBeNull()
  })

  it("is null when the year has never been published", () => {
    const draft = c({ id: "cat-2", version: 1, status: "draft" })
    expect(liveVersionOf([draft, c({ id: "o", catalogYear: "2025-2026" })], draft)).toBeNull()
  })
})
