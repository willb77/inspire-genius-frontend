import { MY_REPORTS_COPY, SAVED_ANALYSIS_COPY, DEV_TEXT } from "../development"

/**
 * The two counted sentences in the My Reports copy, in both numbers, plus the
 * claims that must not drift out of the scope statements (TDS-10) and the
 * saved-analysis copy (TDS-3).
 *
 * Pluralisation is here because "1 people report to you" reads as broken, and
 * because the honest empty state is the entire point of TDS-10: for the manager
 * measured on staging-b the correct answer is zero reports, so every sentence
 * around that has to be right or the page looks faulty when it is correct.
 */

describe("MY_REPORTS_COPY — the counted sentences agree with their number", () => {
  it("one report off the roster reads in the singular", () => {
    const said = MY_REPORTS_COPY.offRoster(1)
    expect(said).toContain("1 person reports to you")
    expect(said).toContain("they are on this roster")
    expect(said).not.toMatch(/people report|none of them/)
  })

  it("several reports off the roster read in the plural", () => {
    const said = MY_REPORTS_COPY.offRoster(4)
    expect(said).toContain("4 people report to you")
    expect(said).toContain("none of them are on this roster")
    expect(said).not.toMatch(/person reports/)
  })

  it("one unresolved edge reads in the singular", () => {
    const said = MY_REPORTS_COPY.unmatchedNote(1)
    expect(said).toContain("1 further person reports to you")
    expect(said).toContain("is not on this roster")
    expect(said).not.toMatch(/people report/)
  })

  it("several unresolved edges read in the plural", () => {
    const said = MY_REPORTS_COPY.unmatchedNote(3)
    expect(said).toContain("3 further people report to you")
    expect(said).toContain("are not on this roster")
  })

  /**
   * Every non-ready branch must say it is not an empty team. A sentence that
   * drops that is indistinguishable from the zero-reports answer, which is what
   * the whole package exists to make readable.
   */
  it("every failure sentence denies being an empty team", () => {
    for (const key of [
      "chartError",
      "rosterError",
      "orgUnresolved",
      "viewerUnknown",
      "viewerAbsent",
    ] as const) {
      expect(MY_REPORTS_COPY[key]).toMatch(/not an empty team|rather than an empty team/i)
    }
    expect(MY_REPORTS_COPY.offRoster(2)).toMatch(/not an empty team/i)
  })

  it("the zero-reports sentence names the organisation boundary and where to look", () => {
    expect(MY_REPORTS_COPY.none).toMatch(/different organisation/i)
    expect(MY_REPORTS_COPY.none).toMatch(/Org Chart/)
  })
})

describe("the scope statements say which set each view answers", () => {
  it("the roster is not described as the reporting line", () => {
    expect(DEV_TEXT["dev.studio.scope.team"]).toMatch(/not your reporting line/i)
    // `list_roster` unions the org query with `growth.roster_members` and with
    // anyone holding a dossier, so "your organisation" alone would be false.
    expect(DEV_TEXT["dev.studio.scope.team"]).toMatch(/plus anyone added here/i)
  })

  it("My reports is scoped to the caller's own organisation, out loud", () => {
    expect(DEV_TEXT["dev.studio.scope.reports"]).toMatch(/your own organisation/i)
    expect(DEV_TEXT["dev.studio.scope.reports"]).toMatch(/different organisation is not here/i)
  })

  it("the org chart is described as the lines, not the people", () => {
    expect(DEV_TEXT["dev.studio.scope.org"]).toMatch(/reporting lines/i)
  })
})

describe("SAVED_ANALYSIS_COPY — what it must and must not say", () => {
  it("says the kept work is this manager's alone, naming who cannot see it", () => {
    expect(SAVED_ANALYSIS_COPY.privateToYou).toMatch(/Only you can see/i)
    expect(SAVED_ANALYSIS_COPY.privateToYou).toMatch(/not shared with the member/i)
    expect(SAVED_ANALYSIS_COPY.privateToYou).toMatch(/other coaches/i)
  })

  it("states D-TDS3 out loud: a kept run stays with the member it was taken under", () => {
    const said = SAVED_ANALYSIS_COPY.followsTheMember("Dana Whitfield")
    expect(said).toContain("Kept in Dana Whitfield's workspace")
    expect(said).toMatch(/other colleagues/i)
  })

  /**
   * The server's 404 covers "no such analysis" AND "not yours",
   * indistinguishably and on purpose. A permission message here would confirm
   * that another manager's analysis exists.
   */
  it("never frames a failure as a permission problem", () => {
    for (const said of [SAVED_ANALYSIS_COPY.deleteFailed, SAVED_ANALYSIS_COPY.saveFailed]) {
      expect(said).not.toMatch(/permission|not allowed|forbidden|another manager|403|404/i)
    }
  })

  it("distinguishes a list that failed to load from a list with nothing in it", () => {
    expect(SAVED_ANALYSIS_COPY.loadError).toMatch(/load failure, not an empty list/i)
    expect(SAVED_ANALYSIS_COPY.loadError).not.toBe(SAVED_ANALYSIS_COPY.empty)
  })
})
