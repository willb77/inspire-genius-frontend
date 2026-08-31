import {
  buildClientMemoir,
  groupEpisodesByModule,
  moduleLabel,
  orderEpisodes,
} from "../clientMemoir"
import type { BioEpisode, MemberNarrative } from "@/types/bio"

function ep(overrides: Partial<BioEpisode>): BioEpisode {
  return {
    episodeId: overrides.episodeId ?? "e1",
    moduleType: overrides.moduleType ?? "life_story",
    title: overrides.title ?? "Untitled",
    facts: overrides.facts ?? "",
    feelingThen: overrides.feelingThen ?? "",
    feelingNow: overrides.feelingNow ?? "",
    impactSelf: overrides.impactSelf ?? "",
    impactOthers: overrides.impactOthers ?? "",
    meaning: overrides.meaning ?? "",
    charge: overrides.charge ?? 0,
    openThread: overrides.openThread ?? false,
    prismTags: overrides.prismTags ?? null,
    quotes: overrides.quotes ?? null,
    ageAt: overrides.ageAt ?? null,
    era: overrides.era ?? "",
  }
}

function narrative(episodes: BioEpisode[]): MemberNarrative {
  return {
    memberId: "member-1",
    modules: [],
    episodes,
    coverage: [],
    bioStarted: episodes.length > 0,
    nextSuggestedModule: null,
  }
}

describe("clientMemoir", () => {
  test("moduleLabel titleises unknown module types", () => {
    expect(moduleLabel("life_story")).toBe("Life Story")
    expect(moduleLabel("something_new")).toBe("Something New")
  })

  test("orderEpisodes sorts by ageAt with nulls last", () => {
    const ordered = orderEpisodes([
      ep({ episodeId: "a", ageAt: null }),
      ep({ episodeId: "b", ageAt: 30 }),
      ep({ episodeId: "c", ageAt: 8 }),
    ])
    expect(ordered.map((e) => e.episodeId)).toEqual(["c", "b", "a"])
  })

  test("groupEpisodesByModule follows canonical order and drops empty modules", () => {
    const groups = groupEpisodesByModule([
      ep({ episodeId: "1", moduleType: "culture" }),
      ep({ episodeId: "2", moduleType: "life_story" }),
    ])
    // life_story precedes culture in the canonical order
    expect(groups.map((g) => g.moduleType)).toEqual(["life_story", "culture"])
  })

  test("groupEpisodesByModule keeps unrecognised module types (after canonical)", () => {
    const groups = groupEpisodesByModule([
      ep({ episodeId: "1", moduleType: "mystery_module" }),
      ep({ episodeId: "2", moduleType: "background" }),
    ])
    expect(groups.map((g) => g.moduleType)).toEqual([
      "background",
      "mystery_module",
    ])
  })

  test("buildClientMemoir renders title, module headings, and episode content", () => {
    const memoir = buildClientMemoir(
      narrative([
        ep({
          episodeId: "1",
          moduleType: "life_story",
          title: "Born in a small town",
          era: "Childhood",
          facts: "I grew up by the sea.",
          meaning: "It taught me patience.",
          quotes: ["The tide always comes back."],
          ageAt: 6,
        }),
      ]),
    )
    expect(memoir.generated).toBe(false)
    expect(memoir.episodeCount).toBe(1)
    expect(memoir.moduleCount).toBe(1)
    expect(memoir.markdown).toContain("# A Life in Chapters")
    expect(memoir.markdown).toContain("## Life Story")
    expect(memoir.markdown).toContain("### Born in a small town — Childhood")
    expect(memoir.markdown).toContain("I grew up by the sea.")
    expect(memoir.markdown).toContain("> The tide always comes back.")
  })

  test("buildClientMemoir respects a moduleTypes filter", () => {
    const memoir = buildClientMemoir(
      narrative([
        ep({ episodeId: "1", moduleType: "life_story", title: "A" }),
        ep({ episodeId: "2", moduleType: "career_story", title: "B" }),
      ]),
      { moduleTypes: ["career_story"] },
    )
    expect(memoir.episodeCount).toBe(1)
    expect(memoir.markdown).toContain("## Career Story")
    expect(memoir.markdown).not.toContain("## Life Story")
  })

  test("buildClientMemoir on an empty narrative still returns a usable document", () => {
    const memoir = buildClientMemoir(narrative([]))
    expect(memoir.moduleCount).toBe(0)
    expect(memoir.markdown).toContain("# A Life in Chapters")
    expect(memoir.markdown).toContain("still empty")
  })
})
