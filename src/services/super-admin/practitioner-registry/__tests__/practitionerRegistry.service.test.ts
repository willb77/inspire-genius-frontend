import {
  addPractitioner,
  assignClient,
  bulkAddPractitioners,
  editPractitioner,
  listAssignable,
  listRegions,
  listRegistry,
  regeneratePractitionerCode,
  setPractitionerActive,
} from "../practitionerRegistry.service"

const get = jest.fn()
const post = jest.fn()
const patch = jest.fn()
jest.mock("@/lib/agentApi", () => ({
  agentApi: {
    get: (...a: unknown[]) => get(...a),
    post: (...a: unknown[]) => post(...a),
    patch: (...a: unknown[]) => patch(...a),
  },
}))

const BASE = "/v1/agents/practitioner-registry"
const env = (data: unknown) => ({ data: { status: true, data } })

describe("practitionerRegistry.service", () => {
  beforeEach(() => jest.clearAllMocks())

  it("lists, omitting includeInactive unless asked", async () => {
    get.mockResolvedValue(env([{ practitionerSub: "p1" }]))
    expect(await listRegistry()).toEqual([{ practitionerSub: "p1" }])
    expect(get).toHaveBeenCalledWith(BASE, { params: { includeInactive: undefined } })
    await listRegistry(true)
    expect(get).toHaveBeenLastCalledWith(BASE, { params: { includeInactive: true } })
  })

  it("adds one and bulk-adds", async () => {
    post.mockResolvedValueOnce(env({ practitionerSub: "p1" }))
    const input = { practitionerEmail: "a@b.co", siteId: "S", clientId: "C", reference: "R", externalIdent: "E", region: "EU", country: "FR" }
    expect(await addPractitioner(input)).toEqual({ practitionerSub: "p1" })
    expect(post).toHaveBeenCalledWith(BASE, input)
    post.mockResolvedValueOnce(env({ added: 2 }))
    expect(await bulkAddPractitioners("csv")).toEqual({ added: 2 })
    expect(post).toHaveBeenLastCalledWith(`${BASE}/bulk`, { csv: "csv" })
  })

  it("edits by sub, encoding it, sending only the fields", async () => {
    patch.mockResolvedValue(env({ practitionerSub: "p/1" }))
    await editPractitioner({ practitionerSub: "p/1", region: "EU" })
    expect(patch).toHaveBeenCalledWith(`${BASE}/p%2F1`, { region: "EU" })
  })

  it("deactivates and reactivates", async () => {
    post.mockResolvedValue(env({}))
    await setPractitionerActive("p1", false)
    expect(post).toHaveBeenLastCalledWith(`${BASE}/p1/deactivate`)
    await setPractitionerActive("p1", true)
    expect(post).toHaveBeenLastCalledWith(`${BASE}/p1/reactivate`)
  })

  it("reads regions and the filtered picker", async () => {
    get.mockResolvedValueOnce(env([{ region: "EU", countries: ["FR"] }]))
    expect(await listRegions()).toEqual([{ region: "EU", countries: ["FR"] }])
    expect(get).toHaveBeenLastCalledWith(`${BASE}/regions`)
    get.mockResolvedValueOnce(env([]))
    await listAssignable("EU", "FR")
    expect(get).toHaveBeenLastCalledWith(`${BASE}/assignable`, { params: { region: "EU", country: "FR" } })
  })

  it("assigns a client", async () => {
    post.mockResolvedValue(env({ clientId: "c1", clientSub: "u1", practitionerSub: "p1" }))
    expect(await assignClient({ clientEmail: "c@d.co", practitionerSub: "p1" })).toEqual({
      clientId: "c1", clientSub: "u1", practitionerSub: "p1",
    })
    expect(post).toHaveBeenCalledWith(`${BASE}/assignments`, { clientEmail: "c@d.co", practitionerSub: "p1" })
  })

  it("regenerates a practitioner's code (PC-1c)", async () => {
    post.mockResolvedValue(env({ practitionerSub: "p/1", practitionerCode: "ABC-DEF-GHJ" }))
    expect((await regeneratePractitionerCode("p/1")).practitionerCode).toBe("ABC-DEF-GHJ")
    expect(post).toHaveBeenLastCalledWith(`${BASE}/p%2F1/regenerate-code`)
  })
})
