import { isShared } from "../studentRoster"

describe("isShared", () => {
  it("is false only for the explicit not-shared marker", () => {
    expect(isShared({ shared: false, reason: "not_shared" } as never)).toBe(false)
  })

  it("is true for real data, including data that is entirely null", () => {
    // The distinction the whole feature rests on: a granted-but-empty block is
    // SHARED. Treating it as unshared would relabel "we have no measurement"
    // as "they refused", which is a different fact about a different person.
    expect(isShared({ visitDays4w: null, lastLoginAt: null } as never)).toBe(true)
    expect(isShared({ state: "not_started" } as never)).toBe(true)
  })
})
