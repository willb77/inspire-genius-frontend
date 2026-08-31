/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Routes, Route } from "react-router-dom"

import InterviewRolePage from "../InterviewRolePage"
import InterviewRolesIndex from "../InterviewRolesIndex"
import { ROLE_PAGES, getRolePageBySlug, ROLE_PAGE_INDEX } from "@/types/interviewRolePage"

function renderSlug(slug: string) {
  render(
    <MemoryRouter initialEntries={[`/interview-practice/${slug}`]}>
      <Routes>
        <Route path="/interview-practice/:slug" element={<InterviewRolePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const SAMPLE = ROLE_PAGES[0] // exists by construction

describe("interviewRolePage data", () => {
  it("bundles role pages and resolves by slug", () => {
    expect(ROLE_PAGES.length).toBeGreaterThan(10)
    expect(getRolePageBySlug(SAMPLE.slug)?.title).toBe(SAMPLE.title)
    expect(getRolePageBySlug("no-such-role")).toBeUndefined()
    expect(getRolePageBySlug(undefined)).toBeUndefined()
  })

  it("every index row points at /interview-practice/<slug>", () => {
    for (const row of ROLE_PAGE_INDEX) {
      expect(row.path).toBe(`/interview-practice/${row.slug}`)
    }
  })
})

describe("InterviewRolePage", () => {
  afterEach(() => {
    document.head.querySelectorAll("script[data-role-page]").forEach((n) => n.remove())
  })

  it("renders the hero, a CTA into the coach, and injects JSON-LD", () => {
    renderSlug(SAMPLE.slug)
    expect(screen.getByRole("heading", { level: 1, name: SAMPLE.hero.headline })).toBeInTheDocument()

    const ctas = screen.getAllByRole("link", { name: /practice/i })
    expect(ctas.some((a) => a.getAttribute("href") === "/interview-practice")).toBe(true)

    const ld = document.head.querySelector("script[data-role-page]")
    expect(ld).not.toBeNull()
    const parsed = JSON.parse(ld!.textContent || "{}")
    expect(parsed["@context"]).toBe("https://schema.org")
    expect(document.title).toBe(SAMPLE.meta.title)
  })

  it("shows a graceful not-found for an unknown slug", () => {
    renderSlug("definitely-not-a-real-role")
    expect(screen.getByText(/don't have a guide for that role/i)).toBeInTheDocument()
    expect(document.head.querySelector("script[data-role-page]")).toBeNull()
  })
})

describe("InterviewRolesIndex", () => {
  it("lists every role and links to the coach", () => {
    render(
      <MemoryRouter>
        <InterviewRolesIndex />
      </MemoryRouter>,
    )
    // A known role link is present.
    expect(screen.getAllByRole("link").some((a) => a.getAttribute("href") === SAMPLE.meta.path)).toBe(true)
    expect(screen.getAllByRole("link").some((a) => a.getAttribute("href") === "/interview-practice")).toBe(true)
  })
})
