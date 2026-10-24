import type { ReactElement } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom"
import { EditCatalogButton, LiveVersionBanner } from "../CatalogEdit"
import { PublishPanel } from "../PublishPanel"
import { createCatalog, listCatalogs } from "@/services/curriculum/curriculum.service"
import { catalogDetail, http } from "@/test/curriculumFixtures"
import type { Catalog } from "@/types/curriculum"

jest.mock("@/services/curriculum/curriculum.service")
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }))

const m = <T extends (...a: never[]) => unknown>(f: T) => f as unknown as jest.MockedFunction<T>
const list = m(listCatalogs)
const create = m(createCatalog)

const LIVE: Catalog = { ...catalogDetail().catalog, status: "published", publishedAt: "2026-10-24T05:08:08Z" }
const DRAFT_2: Catalog = { ...LIVE, id: "cat-2", version: 2, status: "draft", publishedAt: null }
const OLD: Catalog = { ...LIVE, id: "cat-0", version: 0, status: "superseded" }

function Opened() {
  const { catalogId } = useParams()
  return <p>opened {catalogId}</p>
}

function renderIt(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={ui} />
          <Route path="/super-admin/curriculum/catalogs/:catalogId" element={<Opened />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

beforeEach(() => jest.resetAllMocks())

describe("EditCatalogButton (CUR-UNLOCK)", () => {
  it("starts a draft copy of a published catalog when none is in progress, and opens it", async () => {
    list.mockResolvedValue([LIVE, OLD])
    create.mockResolvedValue(DRAFT_2)
    renderIt(<EditCatalogButton catalog={LIVE} />)
    await userEvent.click(screen.getByRole("button", { name: "Edit 2026-2027 v1" }))
    expect(await screen.findByText("opened cat-2")).toBeInTheDocument()
    expect(list).toHaveBeenCalledWith("inst-1")
    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith("inst-1", { catalogYear: "2026-2027", fromCatalogId: "cat-1" })
  })

  it("opens the draft already in progress instead of starting a second", async () => {
    list.mockResolvedValue([LIVE, DRAFT_2, OLD])
    renderIt(<EditCatalogButton catalog={LIVE} />)
    await userEvent.click(screen.getByRole("button", { name: "Edit 2026-2027 v1" }))
    expect(await screen.findByText("opened cat-2")).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it("does not create a draft when the catalog list cannot be read, and says why", async () => {
    list.mockRejectedValue(http(503, "Curriculum is not enabled on this tier."))
    renderIt(<EditCatalogButton catalog={LIVE} />)
    await userEvent.click(screen.getByRole("button", { name: "Edit 2026-2027 v1" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Curriculum is not enabled on this tier.")
    expect(create).not.toHaveBeenCalled()
  })

  it("renders the server's refusal of the copy", async () => {
    list.mockResolvedValue([LIVE])
    create.mockRejectedValue(http(422, "Copy from a catalog of the same school."))
    renderIt(<EditCatalogButton catalog={LIVE} />)
    await userEvent.click(screen.getByRole("button", { name: "Edit 2026-2027 v1" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Copy from a catalog of the same school.")
  })

  it.each([["draft", DRAFT_2], ["superseded", OLD]] as const)("is not shown on a %s catalog", (_s, catalog) => {
    renderIt(<EditCatalogButton catalog={catalog} />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})

describe("LiveVersionBanner (CUR-UNLOCK)", () => {
  it("names the version being edited and the version that stays live", async () => {
    list.mockResolvedValue([OLD, LIVE, DRAFT_2])
    renderIt(<LiveVersionBanner catalog={DRAFT_2} />)
    expect(await screen.findByRole("status")).toHaveTextContent(
      /^You're editing v2\. v1 stays live until you publish\.$/
    )
  })

  it("says nothing on a draft of a year that was never published", async () => {
    list.mockResolvedValue([{ ...DRAFT_2, version: 1 }])
    renderIt(<LiveVersionBanner catalog={{ ...DRAFT_2, version: 1 }} />)
    await waitFor(() => expect(list).toHaveBeenCalledWith("inst-1"))
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("is not shown on a published catalog", () => {
    list.mockResolvedValue([LIVE, DRAFT_2])
    renderIt(<LiveVersionBanner catalog={LIVE} />)
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(list).not.toHaveBeenCalled()
  })
})

describe("PublishPanel — Start a new version (CURU-F2)", () => {
  it("on a published catalog, opens the draft already in progress instead of starting a second", async () => {
    list.mockResolvedValue([LIVE, DRAFT_2])
    renderIt(<PublishPanel detail={catalogDetail({ status: "published" })} />)
    await userEvent.click(screen.getByRole("button", { name: "Start a new version 2026-2027 v1" }))
    expect(await screen.findByText("opened cat-2")).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it("on a superseded catalog, is unchanged: it always starts a copy", async () => {
    list.mockResolvedValue([LIVE, DRAFT_2, OLD])
    create.mockResolvedValue({ ...DRAFT_2, id: "cat-3", version: 3 })
    renderIt(<PublishPanel detail={catalogDetail({ id: "cat-0", version: 0, status: "superseded" })} />)
    await userEvent.click(screen.getByRole("button", { name: "Start a new version" }))
    expect(await screen.findByText("opened cat-3")).toBeInTheDocument()
    expect(create).toHaveBeenCalledWith("inst-1", { catalogYear: "2026-2027", fromCatalogId: "cat-0" })
    expect(list).not.toHaveBeenCalled()
  })
})
