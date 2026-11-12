/**
 * CX-5 — the pure parts: what a pay or education cell may show, the counselor
 * signal on a reply, the worksheet PDF and the error copy.
 */
import {
  NO_AREA,
  NO_VINTAGE,
  PAY_PENDING,
  cellLine,
  educationCell,
  payCell,
  roleCells,
} from "@/pages/career-exercise/factCells"
import { EXERCISE_SURFACE, turnSendsToCounselor } from "@/pages/career-exercise/exerciseTurn"
import {
  WORKSHEET_SECTIONS,
  buildWorksheetHtml,
  notesFor,
  pillarLabel,
  roleTitle,
  worksheetFileBase,
} from "@/pages/career-exercise/worksheetModel"
import { exerciseErrorMessage } from "@/pages/career-exercise/exerciseErrors"
import { chatMessageSchema } from "@/pages/career-exercise/chatMessage.schema"
import { currentSession } from "@/hooks/career-exercise/useCareerExercise"
import type { ExerciseSession, ReadState, RoleCard, PayWithVintage } from "@/types/career-exercise/student"
import type { OccupationDetail } from "@/types/job-fit/occupations"

const AREA = "Raleigh, NC metro area"

function role(over: Partial<RoleCard> = {}): RoleCard {
  return {
    onet_soc: "29-2061.00",
    title: "Licensed Practical Nurse",
    cluster: "Health",
    typical_education: "Postsecondary certificate",
    wage_p25: 48000,
    wage_median: 54000,
    wage_p75: 60000,
    wage_area: AREA,
    bucket: null,
    reason: null,
    ...over,
  }
}

function payRead(over: Partial<PayWithVintage> = {}, state: "ready" | "empty" | "unavailable" = "ready", reason: string | null = null): ReadState<PayWithVintage> {
  return {
    status: "success",
    data: {
      state,
      reason,
      data:
        state === "ready"
          ? {
              socCode: "29-2061",
              title: "LPN",
              level: "metro",
              requestedLevel: "national",
              areaLabel: AREA,
              fallbackReason: null,
              median: 54000,
              pct10: null,
              pct90: null,
              vintageLabel: "May 2024",
              source: "OEWS",
              ...over,
            }
          : null,
    },
  }
}

function detailRead(release: string | undefined, state: "ready" | "empty" = "ready", reason: string | null = null): ReadState<OccupationDetail> {
  return { status: "success", data: { state, reason, release, data: null } }
}

const hasNumber = (s: string) => /\$|\d{2,}/.test(s)

describe("payCell — never a number without its area and data year", () => {
  test("a stored figure whose area and published figure match carries the vintage", () => {
    const c = payCell(role(), payRead())
    expect(c).toEqual({
      kind: "value",
      text: "Median $54,000 a year, middle range $48,000–$60,000",
      area: AREA,
      vintage: "May 2024",
    })
  })

  test("falls back to asOf when there is no vintage label", () => {
    const c = payCell(role(), payRead({ vintageLabel: null, asOf: "2024" }))
    expect(c.kind === "value" && c.vintage).toBe("2024")
  })

  test("no stored median: the read's reason, no number", () => {
    const c = payCell(role({ wage_median: null }), payRead({}, "empty", "no published national median for 29-2061"))
    expect(c.kind).toBe("reason")
    expect(c.text).toContain("no published national median")
    expect(c.text).not.toMatch(/\$/)
  })

  test("no stored median and the read is ready: still no number (never taken from the read)", () => {
    const c = payCell(role({ wage_median: null }), payRead())
    expect(c.kind).toBe("reason")
    expect(hasNumber(c.text)).toBe(false)
  })

  test("a stored median with no area is not shown", () => {
    for (const area of [null, "", "   "]) {
      const c = payCell(role({ wage_area: area }), payRead())
      expect(c).toEqual({ kind: "reason", text: NO_AREA })
    }
  })

  test("data year unconfirmed — read failed, empty, other area, other figure, no vintage — not shown", () => {
    const cases: ReadState<PayWithVintage>[] = [
      { status: "error", data: undefined },
      payRead({}, "unavailable", "tables unreadable"),
      payRead({ areaLabel: "United States" }),
      payRead({ median: 55000 }),
      payRead({ vintageLabel: null, asOf: null }),
      payRead({ vintageLabel: "   " }),
    ]
    for (const read of cases) {
      const c = payCell(role(), read)
      expect(c).toEqual({ kind: "reason", text: NO_VINTAGE })
    }
  })

  test("while the data year is being checked: pending, no number", () => {
    const c = payCell(role(), { status: "pending", data: undefined })
    expect(c).toEqual({ kind: "pending", text: PAY_PENDING })
  })

  test("no middle range when either end is missing", () => {
    const c = payCell(role({ wage_p25: null }), payRead())
    expect(c.kind === "value" && c.text).toBe("Median $54,000 a year")
  })
})

describe("educationCell", () => {
  test("the stored label with its area and the O*NET release", () => {
    expect(educationCell(role(), detailRead("29.3"))).toEqual({
      kind: "value",
      text: "Postsecondary certificate",
      area: "United States",
      vintage: "O*NET 29.3",
    })
  })

  test("release unknown is said, not hidden", () => {
    const c = educationCell(role(), { status: "error", data: undefined })
    expect(c.kind === "value" && c.vintage).toBe("O*NET, release not confirmed")
  })

  test("no stored label: the reason", () => {
    expect(educationCell(role({ typical_education: null }), detailRead(undefined, "empty", "no education data for 29-2061")).text).toBe(
      "Not available — no education data for 29-2061",
    )
    expect(educationCell(role({ typical_education: " " }), { status: "error", data: undefined }).text).toBe(
      "Not available — no education data for this role",
    )
  })

  test("pending while the read is out", () => {
    expect(educationCell(role(), { status: "pending", data: undefined }).kind).toBe("pending")
  })
})

test("roleCells with no reads yet is pending, and cellLine names area and vintage", () => {
  expect(roleCells(role(), undefined).pay.kind).toBe("pending")
  const c = roleCells(role(), { pay: payRead(), education: detailRead("29.3") })
  expect(cellLine(c.pay)).toBe(`Median $54,000 a year, middle range $48,000–$60,000 (${AREA}; May 2024)`)
  expect(cellLine({ kind: "reason", text: "x" })).toBe("x")
})

describe("turnSendsToCounselor", () => {
  test("true only for metadata.career_exercise.next === 'counselor'", () => {
    expect(turnSendsToCounselor({ metadata: { career_exercise: { next: "counselor", guardrail: "age_blocked" } } })).toBe(true)
    expect(turnSendsToCounselor({ metadata: { career_exercise: { stage_after: "discover" } } })).toBe(false)
    expect(turnSendsToCounselor({ metadata: { next: "counselor" } })).toBe(false)
    expect(turnSendsToCounselor({ metadata: undefined })).toBe(false)
    expect(turnSendsToCounselor(null)).toBe(false)
  })

  test("the surface is the server's name for it", () => {
    expect(EXERCISE_SURFACE).toBe("career_exercise")
  })
})

function session(over: Partial<ExerciseSession> = {}): ExerciseSession {
  return {
    session_id: "s1",
    student_id: "me-uuid",
    tenant_id: null,
    stage: "commit",
    status: "active",
    version: 3,
    updated_at: "2026-11-10T12:00:00+00:00",
    self_portrait: "I work best when <I> can fix things",
    profile_reactions: ["Agrees on detail"],
    pillars: { wiring: ["hands-on"], interests: ["robots"], aptitudes: [], context: ["no car"] },
    roles: [role({ bucket: "curious", reason: "likes helping" }), role({ onet_soc: "31-9092.00", title: "Medical Assistant", wage_median: null, bucket: "maybe" })],
    posting_reaction: { look_forward: ["patient care"], dread: ["night shifts"] },
    experiments: [{ onet_soc: "29-2061.00", kind: "shadow", target_date: "2026-12-01", bridge_match_id: null }],
    paths: { primary: "LPN", backup: "Medical Assistant", check_in_adult: "Ms. Lee", follow_up: "2027-01-15" },
    annotations: [
      { id: "n1", kind: "note", stage: "pillars", text: "Great list", by: "c", by_role: "practitioner", at: "2026-11-10", session_version: 2 },
      { id: "p1", kind: "confirm_paths", paths: { primary: "LPN", backup: "Medical Assistant" }, by: "c", by_role: null, at: "2026-11-10", session_version: 3 },
    ],
    paths_confirmation: { by: "c", by_role: null, at: "2026-11-10", paths: { primary: "LPN", backup: "Medical Assistant" }, current: true },
    ...over,
  }
}

describe("worksheet model and PDF", () => {
  test("six sections in the exercise's order", () => {
    expect(WORKSHEET_SECTIONS.map((s) => s.stage)).toEqual(["discover", "pillars", "explore", "narrow", "test", "commit"])
  })

  test("the PDF carries every section, escapes the student's words, and shows area + vintage or the reason", () => {
    const s = session()
    const cells = {
      "29-2061.00": roleCells(s.roles[0], { pay: payRead(), education: detailRead("29.3") }),
      "31-9092.00": roleCells(s.roles[1], { pay: payRead({}, "empty", "no published pay"), education: detailRead("29.3") }),
    }
    const html = buildWorksheetHtml(s, cells)
    for (const sec of WORKSHEET_SECTIONS) expect(html).toContain(sec.title)
    expect(html).toContain("I work best when &lt;I&gt; can fix things")
    expect(html).not.toContain("<I>")
    expect(html).toContain(`$54,000`)
    expect(html).toContain(`${AREA}; May 2024`)
    expect(html).toContain("Not available — no published pay")
    expect(html).toContain("Counselor note:</strong> Great list")
    expect(html).toContain("Confirmed by your counselor.")
    expect(html).toContain("How I'm wired")
    expect(html).toContain("shadow — Licensed Practical Nurse (by 2026-12-01)")
    expect(html).toContain("Check-in adult: Ms. Lee")
  })

  test("an empty session says so in every section", () => {
    const s = session({
      self_portrait: null,
      profile_reactions: [],
      pillars: {},
      roles: [],
      posting_reaction: {},
      experiments: [],
      paths: null,
      annotations: [],
      paths_confirmation: null,
    })
    const html = buildWorksheetHtml(s, {})
    expect(html.match(/Nothing here yet\./g)?.length).toBe(6)
  })

  test("helpers", () => {
    const s = session()
    expect(worksheetFileBase(s)).toBe("career-exploration-worksheet_2026-11-10")
    expect(worksheetFileBase(session({ updated_at: "" }))).toBe("career-exploration-worksheet")
    expect(pillarLabel("aptitudes")).toBe("Aptitudes")
    expect(pillarLabel("odd_key")).toBe("odd key")
    expect(roleTitle(s, "99-9999.00")).toBe("99-9999.00")
    expect(notesFor(s, "pillars").map((n) => n.id)).toEqual(["n1"])
    expect(notesFor(s, "commit")).toEqual([])
  })

  test("currentSession: the newest open one, else the newest", () => {
    const closed = session({ session_id: "c", status: "closed" })
    const paused = session({ session_id: "p", status: "paused" })
    expect(currentSession([closed, paused])?.session_id).toBe("p")
    expect(currentSession([closed])?.session_id).toBe("c")
    expect(currentSession([])).toBeNull()
    expect(currentSession(undefined)).toBeNull()
  })
})

describe("exerciseErrorMessage", () => {
  const err = (status: number, detail: unknown) => ({ response: { status, data: { detail } } })
  test("409 codes, 403, 404, a server sentence, and the fallback", () => {
    expect(exerciseErrorMessage(err(409, { code: "version_conflict", currentVersion: 4 }), "f")).toMatch(/changed since this page loaded/)
    expect(exerciseErrorMessage(err(409, { code: "invalid_transition", message: "m" }), "f")).toMatch(/can't be done right now/)
    expect(exerciseErrorMessage(err(409, { code: "other", message: "server says" }), "f")).toBe("server says")
    expect(exerciseErrorMessage(err(403, "not enabled"), "f")).toMatch(/isn't open on your account/)
    expect(exerciseErrorMessage(err(404, "No such session"), "f")).toMatch(/could not be found/)
    expect(exerciseErrorMessage(err(500, "boom"), "f")).toBe("boom")
    expect(exerciseErrorMessage(err(422, [{ msg: "x" }]), "f")).toBe("f")
    expect(exerciseErrorMessage(new Error("net"), "f")).toBe("f")
  })
})

test("the chat message schema trims and refuses blank", () => {
  expect(chatMessageSchema.safeParse({ message: "   " }).success).toBe(false)
  expect(chatMessageSchema.parse({ message: "  hi  " })).toEqual({ message: "hi" })
})
