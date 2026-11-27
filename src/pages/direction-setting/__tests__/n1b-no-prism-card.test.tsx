/**
 * @jest-environment jsdom
 *
 * N1-b-a (2026-11-27, R4). Direction Setting's Matches page used to tell every
 * empty list "nothing is missing from your profile". The server says WHY the
 * list is empty (`emptyReason: "no_prism"`, empty list and no PRISM only); the
 * page threw that away on the shared path. It now draws a no-PRISM card, with a
 * link to Establish, only for that exact reason, on both display paths.
 *
 * The hooks are mocked at the page's own seam so each path's `emptyReason` is
 * set independently — that is what tells "read from the query whose rows are
 * shown" from "read from one of them".
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

type Reason = "no_prism" | null
let mockShared = false
let mockDs: { matches: unknown[]; gated: boolean; emptyReason: Reason } | undefined
let mockFit: { data?: unknown[]; gated: boolean; emptyReason: Reason }

jest.mock("@/hooks/switches/useFitSharedDisplayEnabled", () => ({
  useFitSharedDisplayEnabled: () => mockShared,
}))
jest.mock("@/hooks/switches/useJobFitComponentsEnabled", () => ({
  useJobFitComponentsEnabled: () => false,
}))
jest.mock("@/hooks/direction-setting/useMatches", () => ({
  useMatches: () => ({ data: mockDs, isLoading: false, isError: false }),
}))
jest.mock("@/hooks/job-fit/useFitMatches", () => ({
  FIT_MATCHES_STALE_MS: 300000,
  useFitMatches: () => ({ ...mockFit, isLoading: false, isError: false }),
}))
jest.mock("@/hooks/job-fit/useFitDetail", () => ({
  useFitDetail: () => ({ data: undefined, isLoading: false }),
}))
jest.mock("@/hooks/job-fit/useFitComponents", () => ({
  useFitComponents: () => ({ data: undefined }),
}))
jest.mock("@/hooks/direction-setting/useJourney", () => ({
  useJourney: () => ({ data: { artefactKeys: [] }, isLoading: false, isError: false }),
  useAdvanceJourney: () => ({ mutate: jest.fn(), isPending: false }),
}))

import MatchesPage from "../MatchesPage"
import { ROUTES } from "@/constants/routes"

// withPrism puts PRISM in its own <em>, so match on the page text, not one element.
const pageText = () => document.body.textContent ?? ""
const CARD_TITLE = /Matching needs your PRISM first/
const OLD_COPY = /Nothing is missing from your profile/
const renderPage = () =>
  render(
    <MemoryRouter>
      <MatchesPage />
    </MemoryRouter>,
  )

beforeEach(() => {
  mockShared = false
  mockDs = { matches: [], gated: false, emptyReason: null }
  mockFit = { data: [], gated: false, emptyReason: null }
})

describe("no PRISM on file", () => {
  it("shared display off: the no-PRISM card, with a button to Establish, and not the old copy", () => {
    mockDs = { matches: [], gated: false, emptyReason: "no_prism" }
    renderPage()
    expect(pageText()).toMatch(CARD_TITLE)
    expect(screen.getByRole("link", { name: /Add your PRISM/ }).getAttribute("href")).toBe(
      ROUTES.DIRECTION_SETTING.ESTABLISH,
    )
    expect(screen.queryByText(OLD_COPY)).toBeNull()
  })

  it("shared display on: the same card, read from the shared query (the F7 regression)", () => {
    mockShared = true
    mockDs = { matches: [], gated: false, emptyReason: null }
    mockFit = { data: [], gated: false, emptyReason: "no_prism" }
    renderPage()
    expect(pageText()).toMatch(CARD_TITLE)
    expect(screen.queryByText(OLD_COPY)).toBeNull()
  })

  it("shared display on but the shared read has not landed: reads the rows it is showing (cold visit)", () => {
    mockShared = true
    mockFit = { data: undefined, gated: false, emptyReason: null }
    mockDs = { matches: [], gated: false, emptyReason: "no_prism" }
    renderPage()
    expect(pageText()).toMatch(CARD_TITLE)
  })

  it("offers no Career areas link — it needs PRISM too — but keeps the stages that work", () => {
    mockDs = { matches: [], gated: false, emptyReason: "no_prism" }
    renderPage()
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"))
    expect(hrefs).not.toContain(ROUTES.DIRECTION_SETTING.CAREERS)
    expect(hrefs).toContain(ROUTES.DIRECTION_SETTING.PORTRAIT)
    expect(hrefs).toContain(ROUTES.DIRECTION_SETTING.INTERVIEW)
  })
})

describe("has PRISM, or a different reason", () => {
  it("empty list with no reason (shared off): today's copy, no card", () => {
    renderPage()
    expect(screen.getByText(OLD_COPY)).toBeTruthy()
    expect(pageText()).not.toMatch(CARD_TITLE)
  })

  it("empty list with no reason (shared on): today's copy, no card", () => {
    mockShared = true
    renderPage()
    expect(screen.getByText(OLD_COPY)).toBeTruthy()
    expect(pageText()).not.toMatch(CARD_TITLE)
  })

  it("the old page still lists Career areas as something that works", () => {
    renderPage()
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toContain(
      ROUTES.DIRECTION_SETTING.CAREERS,
    )
  })

  it("matching switched off wins over a no-PRISM reason", () => {
    mockDs = { matches: [], gated: true, emptyReason: "no_prism" }
    renderPage()
    expect(pageText()).not.toMatch(CARD_TITLE)
    expect(screen.queryByText(OLD_COPY)).toBeNull()
  })
})
