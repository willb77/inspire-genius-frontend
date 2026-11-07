import { checkPassword, PASSWORD_MIN_LENGTH, passwordMeetsRule } from "../passwordRule"

describe("the one password rule (mirrors the Cognito pool policy)", () => {
  it("is 8 characters minimum", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8)
    expect(passwordMeetsRule("Abcdef1")).toBe(false)
    expect(passwordMeetsRule("Abcdefg1")).toBe(true)
  })

  it("needs a capital, a small letter and a number", () => {
    expect(passwordMeetsRule("abcdefg1")).toBe(false)
    expect(passwordMeetsRule("ABCDEFG1")).toBe(false)
    expect(passwordMeetsRule("Abcdefgh")).toBe(false)
  })

  it("does not need a symbol", () => {
    expect(passwordMeetsRule("Abcdefg1")).toBe(true)
    expect(passwordMeetsRule("Abcdefg1!")).toBe(true)
  })

  it("reports each part in display order", () => {
    expect(checkPassword("abc").map((c) => [c.key, c.met])).toEqual([
      ["length", false],
      ["upper", false],
      ["lower", true],
      ["number", false],
    ])
  })
})
