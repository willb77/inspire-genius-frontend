const get = jest.fn()
const post = jest.fn()
const put = jest.fn()
const patch = jest.fn()
const del = jest.fn()

jest.mock("@/lib/agentApi", () => ({
  agentApi: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    put: (...a: unknown[]) => put(...a),
    patch: (...a: unknown[]) => patch(...a),
    delete: (...a: unknown[]) => del(...a),
  },
}))

import * as svc from "../curriculum.service"

const ADMIN = "/v1/agents/career-discovery/curriculum/admin"
const env = (data: unknown) => ({ data: { status: true, data } })

beforeEach(() => {
  jest.clearAllMocks()
})

describe("curriculum.service — every call on agentApi, under the Discovery prefix", () => {
  it("reads the status", async () => {
    get.mockResolvedValue(env({ enabled: false, tablesReady: true }))
    await expect(svc.getCurriculumStatus()).resolves.toEqual({ enabled: false, tablesReady: true })
    expect(get).toHaveBeenCalledWith(`${ADMIN}/status`)
  })

  it("lists, creates and updates schools", async () => {
    get.mockResolvedValue(env({ institutions: [{ id: "i1" }] }))
    await expect(svc.listInstitutions()).resolves.toEqual([{ id: "i1" }])
    expect(get).toHaveBeenCalledWith(`${ADMIN}/institutions`)

    post.mockResolvedValue(env({ institution: { id: "i2" } }))
    await expect(svc.createInstitution({ name: "A" })).resolves.toEqual({ id: "i2" })
    expect(post).toHaveBeenCalledWith(`${ADMIN}/institutions`, { name: "A" })

    patch.mockResolvedValue(env({ institution: { id: "i/3" } }))
    await svc.updateInstitution("i/3", { name: "B" })
    expect(patch).toHaveBeenCalledWith(`${ADMIN}/institutions/i%2F3`, { name: "B" })
  })

  it("lists and creates catalogs, reads and deletes one", async () => {
    get.mockResolvedValueOnce(env({ catalogs: [{ id: "c1" }] }))
    await expect(svc.listCatalogs("i1")).resolves.toEqual([{ id: "c1" }])
    expect(get).toHaveBeenCalledWith(`${ADMIN}/institutions/i1/catalogs`)

    post.mockResolvedValue(env({ catalog: { id: "c2" } }))
    await svc.createCatalog("i1", { catalogYear: "2026", fromCatalogId: "c1" })
    expect(post).toHaveBeenCalledWith(`${ADMIN}/institutions/i1/catalogs`, {
      catalogYear: "2026",
      fromCatalogId: "c1",
    })

    get.mockResolvedValueOnce(env({ catalog: { id: "c1" }, courses: [], programs: [] }))
    await expect(svc.getCatalog("c1")).resolves.toMatchObject({ catalog: { id: "c1" } })
    expect(get).toHaveBeenLastCalledWith(`${ADMIN}/catalogs/c1`)

    del.mockResolvedValue({})
    await svc.deleteCatalog("c1")
    expect(del).toHaveBeenCalledWith(`${ADMIN}/catalogs/c1`)
  })

  it("upserts and deletes courses and programs by code", async () => {
    put.mockResolvedValueOnce(env({ course: { code: "MAT 121" } }))
    await expect(
      svc.upsertCourse("c1", { code: "MAT 121", title: "t", credits: 3, termsOffered: [], prerequisites: [] })
    ).resolves.toEqual({ code: "MAT 121" })
    expect(put).toHaveBeenCalledWith(`${ADMIN}/catalogs/c1/courses`, expect.objectContaining({ code: "MAT 121" }))

    del.mockResolvedValue({})
    await svc.deleteCourse("c1", "MAT 121")
    expect(del).toHaveBeenCalledWith(`${ADMIN}/catalogs/c1/courses`, { params: { code: "MAT 121" } })

    put.mockResolvedValueOnce(env({ program: { code: "P1" } }))
    await expect(
      svc.upsertProgram("c1", { code: "P1", title: "t", credential: "AAS", totalCredits: 60, requirements: [] })
    ).resolves.toEqual({ code: "P1" })
    expect(put).toHaveBeenLastCalledWith(`${ADMIN}/catalogs/c1/programs`, expect.objectContaining({ code: "P1" }))

    await svc.deleteProgram("c1", "P1")
    expect(del).toHaveBeenLastCalledWith(`${ADMIN}/catalogs/c1/programs`, { params: { code: "P1" } })
  })

  it("always sends dryRun explicitly on an import", async () => {
    post.mockResolvedValue(env({ dryRun: true, written: false, report: { ok: true } }))
    await svc.importCatalog("c1", { coursesCsv: "a", programsCsv: "b", dryRun: true })
    expect(post).toHaveBeenLastCalledWith(`${ADMIN}/catalogs/c1/import`, {
      coursesCsv: "a",
      programsCsv: "b",
      dryRun: true,
    })
    await svc.importCatalog("c1", { coursesCsv: "a", programsCsv: "b", dryRun: false })
    expect(post).toHaveBeenLastCalledWith(`${ADMIN}/catalogs/c1/import`, {
      coursesCsv: "a",
      programsCsv: "b",
      dryRun: false,
    })
  })

  it("publishes", async () => {
    post.mockResolvedValue(env({ catalog: { id: "c1", status: "published" } }))
    await expect(svc.publishCatalog("c1")).resolves.toEqual({ id: "c1", status: "published" })
    expect(post).toHaveBeenCalledWith(`${ADMIN}/catalogs/c1/publish`)
  })
})

describe("curriculum.service — program outcomes (CUR-3), super-admin ADMIN routes only", () => {
  it("reads the role families", async () => {
    get.mockResolvedValue(env({ roleFamilies: ["A"], maxOutcomesPerProgram: 20, socCodeNote: "n" }))
    await expect(svc.getRoleFamilies()).resolves.toEqual({ roleFamilies: ["A"], maxOutcomesPerProgram: 20, socCodeNote: "n" })
    expect(get).toHaveBeenCalledWith(`${ADMIN}/role-families`)
  })

  it("reads and replaces a program's outcomes, encoding the id", async () => {
    get.mockResolvedValue(env({ outcomes: [] }))
    await expect(svc.getProgramOutcomes("p/1")).resolves.toEqual({ outcomes: [] })
    expect(get).toHaveBeenCalledWith(`${ADMIN}/programs/p%2F1/outcomes`)

    put.mockResolvedValue(env({ outcomes: [] }))
    const body = [{ roleFamily: "A", blueprintId: null, socCode: "15-1252" }]
    await svc.replaceProgramOutcomes("p1", body)
    expect(put).toHaveBeenCalledWith(`${ADMIN}/programs/p1/outcomes`, { outcomes: body })
  })

  it("reads a catalog's outcome coverage", async () => {
    get.mockResolvedValue(env({ programCount: 0 }))
    await expect(svc.getOutcomeCoverage("c1")).resolves.toEqual({ programCount: 0 })
    expect(get).toHaveBeenCalledWith(`${ADMIN}/catalogs/c1/outcome-coverage`)
  })

  it("never calls an entitled reader route (they are Discovery's, not this admin screen's)", async () => {
    get.mockResolvedValue(env({}))
    put.mockResolvedValue(env({}))
    await svc.getRoleFamilies()
    await svc.getProgramOutcomes("p1")
    await svc.replaceProgramOutcomes("p1", [])
    await svc.getOutcomeCoverage("c1")
    for (const [url] of [...get.mock.calls, ...put.mock.calls]) {
      expect(String(url).startsWith(`${ADMIN}/`)).toBe(true)
    }
  })
})
