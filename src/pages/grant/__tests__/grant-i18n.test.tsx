/**
 * @jest-environment jsdom
 *
 * I18N-5A — the GRANT pages' extracted strings.
 *
 * The global jest setup replaces react-i18next with a mock that reads
 * public/locales/en/*.json and IGNORES `defaultValue`. That makes the page tests
 * above blind to a drifted default. These tests close that gap two ways:
 *
 *  1. a static sync check: every `t("key", <English default>)` in src/pages/grant
 *     must exist in grantPages.json with a byte-identical value, and
 *  2. a render under the REAL react-i18next + i18next, once with the English bundle
 *     loaded and once with an EMPTY bundle (so the `defaultValue` is what shows).
 */

import * as fs from "fs"
import * as path from "path"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createInstance } from "i18next"

jest.mock("react-i18next", () => jest.requireActual("react-i18next"))
jest.mock("@/lib/axios", () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() },
  syncAuthToken: jest.fn(),
}))
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/hooks/grant/mocks", () => ({
  ...jest.requireActual("@/hooks/grant/mocks"),
  USE_GRANT_MOCKS: true,
}))

import { I18nextProvider, initReactI18next } from "react-i18next"
import GrantInstitutionsPage from "../GrantInstitutionsPage"
import GrantLoansPage from "../GrantLoansPage"
import { relativeDeadline } from "../_format"

const GRANT_DIR = path.resolve(__dirname, "..")
const EN_JSON = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "../../../../public/locales/en/grantPages.json"), "utf-8")
) as Record<string, unknown>

function lookup(key: string): unknown {
  let cur: unknown = EN_JSON
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part]
    } else return undefined
  }
  return cur
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) {
      if (name !== "__tests__") sourceFiles(p, out)
    } else if (/\.(ts|tsx)$/.test(name)) out.push(p)
  }
  return out
}

/** Decode a JS string literal body written with the given quote. */
function decode(raw: string): string {
  return raw.replace(/\\(u[0-9a-fA-F]{4}|.)/g, (_m, c: string) =>
    c[0] === "u" && c.length === 5 ? String.fromCharCode(parseInt(c.slice(1), 16)) : c === "n" ? "\n" : c
  )
}

const LITERAL = String.raw`(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')`
// t("key", "English")   |   t("key", { ..., defaultValue: "English" })   (multi-line safe)
const CALL = new RegExp(String.raw`(?<![\w$.])t\(\s*"([^"]+)"\s*,\s*${LITERAL}`, "g")
const OPTS = new RegExp(
  String.raw`(?<![\w$.])t\(\s*"([^"]+)"\s*,\s*\{[^]*?defaultValue(_one|_other)?\s*:\s*${LITERAL}`,
  "g"
)

describe("grantPages.json is in sync with the source defaults", () => {
  const pairs: { file: string; key: string; value: string }[] = []
  for (const f of sourceFiles(GRANT_DIR)) {
    const src = fs.readFileSync(f, "utf-8")
    for (const m of src.matchAll(CALL)) {
      pairs.push({ file: path.relative(GRANT_DIR, f), key: m[1], value: decode(m[2] ?? m[3]) })
    }
    for (const m of src.matchAll(OPTS)) {
      pairs.push({
        file: path.relative(GRANT_DIR, f),
        key: m[1] + (m[2] ?? ""),
        value: decode(m[3] ?? m[4]),
      })
    }
  }

  test("finds a realistic number of extracted strings (the scan is not vacuous)", () => {
    expect(pairs.length).toBeGreaterThan(300)
  })

  test("every extracted key exists in en/grantPages.json with the identical English", () => {
    const bad = pairs.filter((p) => lookup(p.key) !== p.value).map((p) => `${p.file}: ${p.key}`)
    expect(bad).toEqual([])
  })
})

async function makeI18n(withBundle: boolean) {
  const i18n = createInstance()
  await i18n.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    ns: ["grantPages"],
    defaultNS: "grantPages",
    resources: withBundle ? { en: { grantPages: EN_JSON } } : { en: { grantPages: {} } },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })
  return i18n
}

function renderWith(i18n: Awaited<ReturnType<typeof makeI18n>>, ui: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>
  )
}

describe.each([
  ["with the English bundle loaded", true],
  ["with an empty bundle (defaultValue shows)", false],
])("GRANT pages under the real i18n instance, %s", (_label, withBundle) => {
  test("Institutions page renders its English copy", async () => {
    const i18n = await makeI18n(withBundle)
    renderWith(i18n, <GrantInstitutionsPage />)
    expect(screen.getByRole("heading", { name: "Institutions" })).toBeInTheDocument()
    expect(
      screen.getByText("Estimate your net price — cost of attendance minus expected grant aid.")
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Institution")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Estimate net price" })).toBeInTheDocument()
    expect(
      screen.getByText("Run an estimate to see your net price broken down here.")
    ).toBeInTheDocument()
  })

  test("Loans page keeps the inline emphasis in the policy callout", async () => {
    const i18n = await makeI18n(withBundle)
    const { container } = renderWith(i18n, <GrantLoansPage />)
    expect(screen.getByText("Repayment changed in 2026.")).toHaveClass("font-semibold")
    expect(screen.getByText("SAVE plan is closed to new enrollment")).toHaveClass("font-medium")
    expect(container.textContent).toContain(
      "Repayment changed in 2026. The SAVE plan is closed to new enrollment and is being phased out"
    )
  })

  test("relativeDeadline plurals resolve in English", async () => {
    const i18n = await makeI18n(withBundle)
    const t = i18n.getFixedT("en", "grantPages")
    const now = new Date("2026-01-01T00:00:00Z")
    expect(relativeDeadline("2026-01-15T00:00:00Z", now, t)).toBe("in 14 days")
    expect(relativeDeadline("2025-12-31T00:00:00Z", now, t)).toBe("1 day ago")
    expect(relativeDeadline("2025-12-29T00:00:00Z", now, t)).toBe("3 days ago")
    expect(relativeDeadline("2026-01-01T00:00:00Z", now, t)).toBe("due today")
  })
})
