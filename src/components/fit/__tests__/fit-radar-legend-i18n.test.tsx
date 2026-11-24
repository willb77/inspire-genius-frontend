/**
 * @jest-environment jsdom
 *
 * The fit behaviour-map legend speaks the reader's language: the group labels
 * and definitions, the Match / Close / Growth area markers and their
 * definitions, and "Not measured" all come from `fit.fitRadar.*` in
 * studioUi.json, in every locale. jest.setup.ts mocks react-i18next with the
 * English file, so this suite uses the REAL library with the Spanish and the
 * English resources to ask what the mock cannot.
 *
 * The downloadable report (fitReport.ts) still reads the English constants in
 * fit-definitions.ts directly; the last test pins that so a later change to the
 * legend cannot silently change the report.
 */
import fs from "node:fs"
import path from "node:path"
import { render, screen } from "@testing-library/react"
import i18next, { type i18n as I18n } from "i18next"
import { I18nextProvider, initReactI18next } from "react-i18next"
import { FitRadarOverlay } from "../FitRadarOverlay"
import type { FitCardGroup } from "../FitCardsModel"
import {
  FIT_CARD_GROUP_LABELS,
  FIT_CARD_STATUS_LABELS,
} from "@/constants/fit-definitions"
import { NOT_MEASURED } from "@/lib/job-fit/coverage"

jest.mock("react-i18next", () => jest.requireActual("react-i18next"))

const LOCALES = path.resolve(__dirname, "../../../../public/locales")
const LANGS = ["en", "es", "fr", "pt", "it", "pl", "cs"] as const

const studioUi = (lng: string) =>
  JSON.parse(fs.readFileSync(path.join(LOCALES, lng, "studioUi.json"), "utf8")) as {
    fit: { fitRadar: Record<string, unknown> }
  }

async function instance(lng: string): Promise<I18n> {
  const inst = i18next.createInstance()
  await inst.use(initReactI18next).init({
    lng,
    fallbackLng: false,
    ns: ["studioUi"],
    defaultNS: "studioUi",
    resources: { [lng]: { studioUi: studioUi(lng) } },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })
  return inst
}

const item = (key: string, name: string, category: FitCardGroup["category"], you: number | null, status: "match" | "close" | "growth" | null) => ({
  key,
  category,
  dimensionName: name,
  definition: null,
  jobRating: 70,
  personRating: you,
  difference: you === null ? null : you - 70,
  status,
})

const GROUPS: FitCardGroup[] = [
  { category: "behavior", items: [item("a", "Analytical", "behavior", 80, "match"), item("b", "Persistence", "behavior", 65, "close")] },
  { category: "aptitude", items: [item("c", "Investigative", "aptitude", 40, "growth")] },
  { category: "core-trait", items: [item("d", "Dependable", "core-trait", null, null)] },
]

async function draw(lng: string) {
  const inst = await instance(lng)
  return render(
    <I18nextProvider i18n={inst}>
      <FitRadarOverlay groups={GROUPS} />
    </I18nextProvider>,
  )
}

type Leaf = { label: string; definition: string }
const fr = (lng: string) => studioUi(lng).fit.fitRadar as {
  group: Record<string, Leaf>
  status: Record<string, Leaf>
  notMeasured: string
}

describe("fit behaviour-map legend is translated", () => {
  it.each(LANGS)("%s: every legend string the overlay owns is present and non-empty", (lng) => {
    const r = fr(lng)
    for (const g of ["behavior", "aptitude", "core-trait"]) {
      expect(r.group[g].label.trim()).not.toBe("")
      expect(r.group[g].definition.trim()).not.toBe("")
    }
    for (const s of ["match", "close", "growth"]) {
      expect(r.status[s].label.trim()).not.toBe("")
      expect(r.status[s].definition.trim()).not.toBe("")
    }
    expect(r.notMeasured.trim()).not.toBe("")
  })

  it.each(["es", "fr", "pt", "it", "pl", "cs"] as const)(
    "%s: the legend draws the translated text, not the English constants",
    async (lng) => {
      await draw(lng)
      const r = fr(lng)
      const legend = screen.getByTestId("fit-radar-legend")
      for (const g of ["behavior", "aptitude", "core-trait"] as const) {
        expect(legend).toHaveTextContent(r.group[g].label)
        expect(legend).toHaveTextContent(r.group[g].definition)
        expect(legend).not.toHaveTextContent(FIT_CARD_GROUP_LABELS[g])
      }
      const key = screen.getByTestId("fit-radar-status-key")
      for (const s of ["match", "close", "growth"] as const) {
        expect(key).toHaveTextContent(r.status[s].definition)
        expect(key).not.toHaveTextContent(`${FIT_CARD_STATUS_LABELS[s]} `)
      }
      expect(legend).toHaveTextContent(r.notMeasured)
      expect(legend).not.toHaveTextContent(NOT_MEASURED)
    },
  )

  it("the 10-point growth threshold is stated in every locale's Close and Growth definitions", () => {
    for (const lng of LANGS) {
      const r = fr(lng)
      expect(r.status.close.definition).toContain("10")
      expect(r.status.growth.definition).toContain("10")
    }
  })

  it("en still paints exactly the English constants (the report's source)", async () => {
    await draw("en")
    expect(screen.getByTestId("fit-radar-legend")).toHaveTextContent(FIT_CARD_GROUP_LABELS.behavior)
    expect(screen.getAllByTestId("fit-radar-status")[0]).toHaveTextContent(FIT_CARD_STATUS_LABELS.match)
    expect(fr("en").notMeasured).toBe(NOT_MEASURED)
  })

  it("every locale carries the same fitRadar key set as English", () => {
    const keys = (o: unknown, p = ""): string[] =>
      Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
        v && typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`],
      )
    const en = keys(studioUi("en").fit.fitRadar).sort()
    for (const lng of LANGS) expect(keys(studioUi(lng).fit.fitRadar).sort()).toEqual(en)
  })
})
