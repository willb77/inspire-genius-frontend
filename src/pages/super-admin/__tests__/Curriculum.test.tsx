import React from "react"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import Curriculum from "../Curriculum"
import CurriculumCatalog from "../CurriculumCatalog"
import {
  createCatalog,
  createInstitution,
  deleteCatalog,
  getCatalog,
  getCurriculumStatus,
  getOutcomeCoverage,
  listCatalogs,
  listInstitutions,
  updateInstitution,
} from "@/services/curriculum/curriculum.service"
import { catalogDetail, http } from "@/test/curriculumFixtures"

jest.mock("@/services/curriculum/curriculum.service")
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))
jest.mock("@/layouts/SuperAdminLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="super-admin-layout">{children}</div>,
}))

const m = <T extends (...a: never[]) => unknown>(f: T) => f as unknown as jest.MockedFunction<T>
const status = m(getCurriculumStatus)

const SCHOOL = { id: "inst-1", name: "Example Community College", unitid: "123456", opeid: null, orgId: null }
const CAT = catalogDetail().catalog

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/super-admin/curriculum" element={<Curriculum />} />
          <Route path="/super-admin/curriculum/catalogs/:catalogId" element={<CurriculumCatalog />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  jest.resetAllMocks()
  status.mockResolvedValue({ enabled: true, tablesReady: true })
  m(listCatalogs).mockResolvedValue([])
})

describe("Administration → Curriculum page", () => {
  it("says the switch is off instead of rendering an empty list", async () => {
    status.mockResolvedValue({ enabled: false, tablesReady: false })
    renderAt("/super-admin/curriculum")
    expect(await screen.findByText("Curriculum is not enabled")).toBeInTheDocument()
    expect(listInstitutions).not.toHaveBeenCalled()
  })

  it("schools → catalog years → open a catalog", async () => {
    m(listInstitutions).mockResolvedValue([SCHOOL])
    m(listCatalogs).mockResolvedValue([CAT, { ...CAT, id: "cat-0", version: 0, status: "published", publishedAt: "2026-01-02T00:00:00Z" }])
    m(getCatalog).mockResolvedValue(catalogDetail())
    renderAt("/super-admin/curriculum")
    await userEvent.click(await screen.findByRole("button", { name: "Catalog years" }))
    const years = await screen.findByRole("region", { name: "Catalog years" })
    expect(within(years).getByText("Catalog years — Example Community College")).toBeInTheDocument()
    expect(await within(years).findByRole("button", { name: "Delete draft 2026-2027 v1" })).toBeInTheDocument()
    expect(within(years).getByRole("button", { name: "Edit 2026-2027 v0" })).toBeInTheDocument()
    expect(within(years).queryByRole("button", { name: /new version/i })).not.toBeInTheDocument()
    await userEvent.click(within(years).getAllByRole("link", { name: "Open" })[0])
    expect(await screen.findByText("Catalog 2026-2027 · v1")).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Courses" })).toBeInTheDocument()
    expect(await screen.findByText("You're editing v1. v0 stays live until you publish.")).toBeInTheDocument()
  })

  it("Edit on a published row opens the year's draft in progress; a superseded row keeps New version (CUR-UNLOCK)", async () => {
    const live = { ...CAT, id: "cat-1", version: 1, status: "published" as const, publishedAt: "2026-10-24T05:08:08Z" }
    const old = { ...CAT, id: "cat-0", version: 0, status: "superseded" as const }
    const draft = { ...CAT, id: "cat-2", version: 2 }
    m(listInstitutions).mockResolvedValue([SCHOOL])
    m(listCatalogs).mockResolvedValue([draft, live, old])
    m(getCatalog).mockResolvedValue(catalogDetail({ id: "cat-2", version: 2 }))
    renderAt("/super-admin/curriculum?school=inst-1")
    const years = await screen.findByRole("region", { name: "Catalog years" })
    expect(await within(years).findByRole("button", { name: /new version/i })).toBeInTheDocument()
    expect(within(years).queryByRole("button", { name: "Edit 2026-2027 v0" })).not.toBeInTheDocument()
    await userEvent.click(within(years).getByRole("button", { name: "Edit 2026-2027 v1" }))
    expect(await screen.findByText("Catalog 2026-2027 · v2")).toBeInTheDocument()
    expect(getCatalog).toHaveBeenCalledWith("cat-2")
    expect(createCatalog).not.toHaveBeenCalled()
    expect(await screen.findByText("You're editing v2. v1 stays live until you publish.")).toBeInTheDocument()
  })

  it("adds a school, validating the IPEDS id, and renders a 409 duplicate", async () => {
    m(listInstitutions).mockResolvedValue([])
    m(listCatalogs).mockResolvedValue([])
    m(createInstitution).mockRejectedValueOnce(http(409, "A school with UNITID 123456 exists."))
    renderAt("/super-admin/curriculum")
    expect(await screen.findByText(/No schools yet/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Add school" }))
    await userEvent.type(screen.getByLabelText("School name"), "Example College")
    await userEvent.type(screen.getByLabelText(/UNITID/), "12")
    await userEvent.click(screen.getByRole("button", { name: "Add school" }))
    expect(await screen.findByText("UNITID is the 6-digit IPEDS id")).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/UNITID/), "3456")
    await userEvent.click(screen.getByRole("button", { name: "Add school" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("A school with UNITID 123456 exists.")
    m(createInstitution).mockResolvedValueOnce({ ...SCHOOL, id: "inst-9" })
    await userEvent.clear(screen.getByLabelText(/UNITID/))
    await userEvent.click(screen.getByRole("button", { name: "Add school" }))
    await waitFor(() =>
      expect(createInstitution).toHaveBeenLastCalledWith({ name: "Example College", unitid: "", opeid: "" })
    )
    expect(await screen.findByRole("region", { name: "Catalog years" })).toBeInTheDocument()
  })

  it("edits a school", async () => {
    m(listInstitutions).mockResolvedValue([SCHOOL])
    m(updateInstitution).mockResolvedValue(SCHOOL)
    m(listCatalogs).mockResolvedValue([])
    renderAt("/super-admin/curriculum")
    await userEvent.click(await screen.findByRole("button", { name: `Edit ${SCHOOL.name}` }))
    await userEvent.type(screen.getByLabelText(/OPEID/), "00123400")
    await userEvent.click(screen.getByRole("button", { name: "Save school" }))
    await waitFor(() =>
      expect(updateInstitution).toHaveBeenCalledWith("inst-1", {
        name: SCHOOL.name,
        unitid: "123456",
        opeid: "00123400",
      })
    )
  })

  it("starts a catalog year draft and opens it; refuses a bad year; renders a failed delete", async () => {
    m(listInstitutions).mockResolvedValue([SCHOOL])
    m(listCatalogs).mockResolvedValue([CAT])
    m(getCatalog).mockResolvedValue(catalogDetail())
    m(deleteCatalog).mockRejectedValue(http(409, "This catalog is published, and published catalogs are never edited."))
    renderAt("/super-admin/curriculum?school=inst-1")
    const years = await screen.findByRole("region", { name: "Catalog years" })
    await userEvent.click(await within(years).findByRole("button", { name: "Delete draft 2026-2027 v1" }))
    expect(await within(years).findByRole("alert")).toHaveTextContent("published catalogs are never edited")

    await userEvent.type(within(years).getByLabelText("New catalog year"), "2026-2028")
    await userEvent.click(within(years).getByRole("button", { name: "Start draft" }))
    expect(await within(years).findByText(/consecutive years/)).toBeInTheDocument()

    m(createCatalog).mockResolvedValue({ ...CAT, id: "cat-1" })
    await userEvent.clear(within(years).getByLabelText("New catalog year"))
    await userEvent.type(within(years).getByLabelText("New catalog year"), "2027")
    await userEvent.click(within(years).getByRole("button", { name: "Start draft" }))
    await waitFor(() => expect(createCatalog).toHaveBeenCalledWith("inst-1", { catalogYear: "2027", fromCatalogId: null }))
    expect(await screen.findByText("Catalog 2026-2027 · v1")).toBeInTheDocument()
  })

  it("renders a failed school list", async () => {
    m(listInstitutions).mockRejectedValue(http(503, "Curriculum isn't set up on this tier yet (migration 051 is not applied)."))
    renderAt("/super-admin/curriculum")
    expect(await screen.findByRole("alert")).toHaveTextContent("migration 051 is not applied")
  })
})

describe("Curriculum catalog page", () => {
  it("is read-only for a published catalog, with Edit at the top (CUR-UNLOCK)", async () => {
    m(getCatalog).mockResolvedValue(catalogDetail({ status: "published" }))
    renderAt("/super-admin/curriculum/catalogs/cat-1")
    expect(await screen.findByText(/Read-only: this is the live catalog\. Edit opens a draft/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Add course" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Edit 2026-2027 v1" })).toBeInTheDocument()
  })

  it("Edit on a published catalog starts a copy when no draft is in progress, and opens it", async () => {
    m(getCatalog).mockImplementation(async (id: string) =>
      id === "cat-2" ? catalogDetail({ id: "cat-2", version: 2 }) : catalogDetail({ status: "published" })
    )
    m(listCatalogs).mockResolvedValue([{ ...CAT, status: "published" }])
    m(createCatalog).mockResolvedValue({ ...CAT, id: "cat-2", version: 2 })
    renderAt("/super-admin/curriculum/catalogs/cat-1")
    await userEvent.click(await screen.findByRole("button", { name: "Edit 2026-2027 v1" }))
    expect(await screen.findByText("Catalog 2026-2027 · v2")).toBeInTheDocument()
    expect(createCatalog).toHaveBeenCalledTimes(1)
    expect(createCatalog).toHaveBeenCalledWith("inst-1", { catalogYear: "2026-2027", fromCatalogId: "cat-1" })
    expect(await screen.findByRole("button", { name: "Add course" })).toBeInTheDocument()
  })

  it("a superseded catalog has no Edit and keeps its old read-only line", async () => {
    m(getCatalog).mockResolvedValue(catalogDetail({ status: "superseded" }))
    renderAt("/super-admin/curriculum/catalogs/cat-1")
    expect(await screen.findByText(/Read-only: published catalogs are never edited/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Edit 2026/ })).not.toBeInTheDocument()
  })

  it("a draft has no Edit and no banner when the year was never published", async () => {
    m(getCatalog).mockResolvedValue(catalogDetail())
    m(listCatalogs).mockResolvedValue([CAT])
    renderAt("/super-admin/curriculum/catalogs/cat-1")
    expect(await screen.findByRole("button", { name: "Add course" })).toBeInTheDocument()
    await waitFor(() => expect(listCatalogs).toHaveBeenCalledWith("inst-1"))
    expect(screen.queryByRole("button", { name: /^Edit 2026/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/stays live until you publish/)).not.toBeInTheDocument()
  })

  it("moves between tabs on a draft", async () => {
    m(getCatalog).mockResolvedValue(catalogDetail())
    renderAt("/super-admin/curriculum/catalogs/cat-1")
    expect(await screen.findByRole("button", { name: "Add course" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("tab", { name: "Prerequisite graph" }))
    expect(await screen.findByRole("img", { name: "Prerequisite graph for P1" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("tab", { name: "Publish" }))
    expect(await screen.findByRole("button", { name: /publish 2026-2027 v1/i })).toBeEnabled()
  })

  it("has an Outcome coverage tab (CUR-3)", async () => {
    m(getCatalog).mockResolvedValue(catalogDetail())
    m(getOutcomeCoverage).mockResolvedValue({
      catalog: { id: "cat-1", status: "draft", catalogYear: "2026-2027", version: 1 },
      programCount: 1,
      withOutcomes: 0,
      withoutOutcomes: [{ id: "prog-1", code: "P1", title: "Example Program" }],
      complete: false,
    })
    renderAt("/super-admin/curriculum/catalogs/cat-1")
    await userEvent.click(await screen.findByRole("tab", { name: "Outcome coverage" }))
    expect(await screen.findByText("0 of 1 programs have at least one career outcome.")).toBeInTheDocument()
    expect(getOutcomeCoverage).toHaveBeenCalledWith("cat-1")
  })

  it("renders a missing catalog's error and the gate's state", async () => {
    m(getCatalog).mockRejectedValue(http(404, "Not found."))
    renderAt("/super-admin/curriculum/catalogs/nope")
    expect(await screen.findByRole("alert")).toHaveTextContent("Not found.")
  })
})
