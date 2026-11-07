import { formatDate, formatDateTime, NO_DATE } from "../formatDate"
import { BUTTON_WORDS, GLOSSARY, plain } from "../glossary"
import {
  clearHouseStyle,
  HOUSE_STYLE_AREAS,
  isHouseStyleOn,
  setHouseStyle,
} from "../areaSwitch"

describe("formatDate / formatDateTime", () => {
  const d = new Date(2026, 10, 3, 14, 5) // local Nov 3, 2026 2:05 PM

  it("uses the one house format", () => {
    expect(formatDate(d)).toBe("Nov 3, 2026")
    expect(formatDateTime(d)).toBe("Nov 3, 2026, 2:05 PM")
  })

  it("accepts ISO strings and epoch numbers", () => {
    expect(formatDate(d.toISOString())).toBe("Nov 3, 2026")
    expect(formatDate(d.getTime())).toBe("Nov 3, 2026")
  })

  it.each([null, undefined, "", "not a date", NaN])("renders %p as a dash, never today", (bad) => {
    expect(formatDate(bad as never)).toBe(NO_DATE)
    expect(formatDateTime(bad as never)).toBe(NO_DATE)
  })
})

describe("glossary", () => {
  it("maps internal names to plain words, ignoring case and whitespace", () => {
    expect(plain("Aura")).toBe("your coach")
    expect(plain("  Job DNA ")).toBe("Job profile")
    expect(plain("Ratified")).toBe("Coach approved")
    expect(plain("RTBF")).toBe("Data deletion requests")
  })

  it("leaves unknown terms and customer brand names unchanged", () => {
    expect(plain("Résumé Writer")).toBe("Résumé Writer")
    for (const brand of ["GRANT", "Lumen", "Honor", "Meridian"]) {
      expect(plain(brand)).toBe(brand)
      expect(GLOSSARY[brand.toLowerCase()]).toBeUndefined()
    }
  })

  it("keys are all lower-case, so lookups cannot silently miss", () => {
    for (const key of Object.keys(GLOSSARY)) expect(key).toBe(key.toLowerCase().trim())
  })

  it("has the eight house button words", () => {
    expect(Object.values(BUTTON_WORDS)).toEqual([
      "Save", "Cancel", "Close", "Next", "Back", "Finish", "Delete", "Try again", "Log out",
    ])
  })
})

describe("house-style area switches", () => {
  const OLD_ENV = process.env.VITE_HOUSE_STYLE_AREAS

  beforeEach(() => {
    localStorage.clear()
    delete process.env.VITE_HOUSE_STYLE_AREAS
  })
  afterAll(() => {
    if (OLD_ENV === undefined) delete process.env.VITE_HOUSE_STYLE_AREAS
    else process.env.VITE_HOUSE_STYLE_AREAS = OLD_ENV
  })

  it("every area is OFF by default", () => {
    for (const area of HOUSE_STYLE_AREAS) expect(isHouseStyleOn(area)).toBe(false)
  })

  it("the build list switches named areas on, and only those", () => {
    process.env.VITE_HOUSE_STYLE_AREAS = " admin , distributor"
    expect(isHouseStyleOn("admin")).toBe(true)
    expect(isHouseStyleOn("distributor")).toBe(true)
    expect(isHouseStyleOn("manager")).toBe(false)
  })

  it("a stored value wins over the build list, both ways", () => {
    process.env.VITE_HOUSE_STYLE_AREAS = "admin"
    setHouseStyle("admin", false)
    expect(isHouseStyleOn("admin")).toBe(false)
    setHouseStyle("manager", true)
    expect(isHouseStyleOn("manager")).toBe(true)
    clearHouseStyle("admin")
    expect(isHouseStyleOn("admin")).toBe(true)
  })

  it("falls back to the build default when storage throws", () => {
    const spy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    expect(isHouseStyleOn("admin")).toBe(false)
    spy.mockRestore()
  })
})
