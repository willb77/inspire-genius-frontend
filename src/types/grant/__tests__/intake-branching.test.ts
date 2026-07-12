/**
 * @jest-environment node
 */
// Branching intake: flat-form ⇄ nested backend payload mappers, Sec 5 routing,
// and step-config integrity. Pure logic — mirrors the backend
// tests/grant/test_intake_expansion.py + test_interview_config.py.

import {
  activeModuleIds,
  fromIntakePayload,
  SCREENER_FLAGS,
  toIntakePayload,
  type PartialAidIntake,
} from "@/types/grant/intake"
import { INTAKE_STEPS } from "@/pages/grant/intake/steps"

type Obj = Record<string, unknown>
const asObj = (v: unknown) => v as Obj

describe("toIntakePayload (flat form → nested backend)", () => {
  test("builds screener, modules, and top-level mirrors for a veteran w/ disability", () => {
    const payload = toIntakePayload({
      student_age: 30,
      enrollment_status: "returning_adult",
      state_of_residence: "TX",
      institution_type: "four_year",
      household_income_range: "under_30k",
      citizenship_status: "us_citizen",
      sc_military: true,
      sc_disability: true,
      sc_returning_adult: true,
      m_mil_affiliation: "self_veteran",
      m_mil_gi_bill: "ch33",
      m_dis_categories: ["physical"],
      m_dis_vr_client: true,
      m_adl_employer_benefit: true,
    })
    expect(payload.citizenship_status).toBe("us_citizen")
    // top-level mirrors the scholarship filters read
    expect(payload.military_affiliation).toBe("self_veteran")
    expect(payload.disability_categories).toEqual(["physical"])
    expect(payload.returning_adult).toBe(true)
    // nested screener + modules
    expect(asObj(payload.screener).military).toBe(true)
    expect(asObj(asObj(payload.modules).military).gi_bill_chapter).toBe("ch33")
    expect(asObj(asObj(payload.modules).disability).vr_client).toBe(true)
    expect(asObj(asObj(payload.modules).adult).employer_tuition_benefit).toBe(true)
    // module not flagged → absent
    expect(asObj(payload.modules).justice).toBeUndefined()
  })

  test("omits empty answers and empty screener/modules", () => {
    const payload = toIntakePayload({ student_age: 20 })
    expect(payload).toEqual({ student_age: 20 })
    expect(payload.screener).toBeUndefined()
    expect(payload.modules).toBeUndefined()
  })
})

describe("fromIntakePayload (nested backend → flat form)", () => {
  test("rebuilds core, screener flags, and module fields", () => {
    const flat = fromIntakePayload({
      student_age: 30,
      state_of_residence: "TX",
      military_affiliation: "self_veteran",
      screener: { military: true, disability: true },
      modules: {
        military: { gi_bill_chapter: "ch33", service_connected_rating: 30 },
        disability: { disability_categories: ["learning"], vr_client: true },
      },
    })
    expect(flat.student_age).toBe(30)
    expect(flat.sc_military).toBe(true)
    expect(flat.sc_disability).toBe(true)
    expect(flat.m_mil_gi_bill).toBe("ch33")
    expect(flat.m_mil_rating).toBe(30)
    expect(flat.m_dis_categories).toEqual(["learning"])
    expect(flat.m_dis_vr_client).toBe(true)
  })

  test("top-level mirror booleans imply their screener flag", () => {
    const flat = fromIntakePayload({ returning_adult: true, foster_care: true })
    expect(flat.sc_returning_adult).toBe(true)
    expect(flat.sc_foster_care).toBe(true)
  })

  test("empty payload → empty object", () => {
    expect(fromIntakePayload({})).toEqual({})
  })
})

describe("round-trip preserves screener + module answers", () => {
  test("justice + field-specific profile survives flat→nested→flat", () => {
    const original: PartialAidIntake = {
      student_age: 22,
      enrollment_status: "prospective",
      state_of_residence: "CA",
      institution_type: "four_year",
      household_income_range: "30k_60k",
      sc_justice: true,
      m_jus_status: "released",
      m_jus_reentry: true,
      sc_field_specific: true,
      m_fld_nursing: true,
    }
    const back = fromIntakePayload(toIntakePayload(original))
    expect(back.sc_justice).toBe(true)
    expect(back.m_jus_status).toBe("released")
    expect(back.m_jus_reentry).toBe(true)
    expect(back.m_fld_nursing).toBe(true)
  })
})

describe("activeModuleIds (Sec 5 routing)", () => {
  test("maps screener flags to module ids", () => {
    expect(activeModuleIds({ sc_military: true, sc_disability: true }).sort()).toEqual([
      "disability",
      "military",
    ])
    expect(activeModuleIds({ sc_returning_adult: true })).toEqual(["adult"])
    expect(activeModuleIds({ sc_foster_care: true })).toEqual(["foster"])
    expect(activeModuleIds({})).toEqual([])
  })
})

describe("intake step config integrity", () => {
  test("a screener step exists for every flag", () => {
    const screenerFields = INTAKE_STEPS.filter((s) => s.phase === "screener").map((s) => s.field)
    for (const flag of SCREENER_FLAGS) expect(screenerFields).toContain(`sc_${flag}`)
  })

  test("every module step is gated by a real screener field", () => {
    const screenerFields = new Set<string>(
      INTAKE_STEPS.filter((s) => s.phase === "screener").map((s) => s.field as string)
    )
    for (const s of INTAKE_STEPS.filter((s) => s.phase === "module")) {
      expect(s.gate).toBeDefined()
      expect(screenerFields.has(s.gate as string)).toBe(true)
    }
  })

  test("all trigger steps precede the first module step", () => {
    const phases = INTAKE_STEPS.map((s) => s.phase)
    expect(phases.lastIndexOf("trigger")).toBeLessThan(phases.indexOf("module"))
  })
})
