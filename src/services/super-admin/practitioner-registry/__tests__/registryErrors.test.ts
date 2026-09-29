import { formatRegistryError, registryErrors, registryErrorSummary } from "../registryErrors"

const axiosErr = (detail: unknown) => ({ response: { data: { detail } } })

describe("registryErrors", () => {
  it("returns the registry list and drops anything that is not one", () => {
    const e = axiosErr([
      { row: 2, field: "site_id", message: "is required" },
      { loc: ["body", "x"], msg: "bad" },
    ])
    expect(registryErrors(e)).toEqual([{ row: 2, field: "site_id", message: "is required" }])
  })

  it("is empty for a string detail, a network error, or nothing", () => {
    expect(registryErrors(axiosErr("Super-admin access required"))).toEqual([])
    expect(registryErrors(new Error("Network Error"))).toEqual([])
    expect(registryErrors(undefined)).toEqual([])
  })

  it("formats with and without a row", () => {
    expect(formatRegistryError({ row: 3, field: "country", message: "bad" })).toBe("row 3 · country: bad")
    expect(formatRegistryError({ row: null, field: "client_email", message: "bad" })).toBe("client_email: bad")
  })

  it("summarises at most three, always as a string", () => {
    const list = [1, 2, 3, 4, 5].map((row) => ({ row, field: "site_id", message: "is required" }))
    const s = registryErrorSummary(axiosErr(list), "fallback")
    expect(s).toBe("row 1 · site_id: is required; row 2 · site_id: is required; row 3 · site_id: is required (and 2 more)")
    expect(registryErrorSummary(axiosErr(list.slice(0, 1)), "f")).toBe("row 1 · site_id: is required")
  })

  it("falls back to apiErrorMessage for FastAPI's own shapes", () => {
    expect(registryErrorSummary(axiosErr("Super-admin access required"), "f")).toBe("Super-admin access required")
    expect(registryErrorSummary(axiosErr([{ loc: ["body", "csv"], msg: "Field required" }]), "f")).toBe("csv: Field required")
    expect(registryErrorSummary({}, "fallback")).toBe("fallback")
  })
})
