import { parseMemberCsv } from "../AddMemberDialog"

describe("parseMemberCsv", () => {
  it("parses rows without a header", () => {
    const rows = parseMemberCsv(
      "Jordan Lee, jordan@co.com, Engineer, Platform\nSam Rivera, , Designer, Product",
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({
      name: "Jordan Lee",
      email: "jordan@co.com",
      title: "Engineer",
      department: "Platform",
    })
    // empty cell -> undefined
    expect(rows[1].email).toBeUndefined()
    expect(rows[1].department).toBe("Product")
  })

  it("skips a header row", () => {
    const rows = parseMemberCsv("name,email,title,department\nJordan,j@co.com,Eng,Plat")
    expect(rows).toHaveLength(1)
    expect(rows[0].name).toBe("Jordan")
  })

  it("drops rows without a name", () => {
    expect(parseMemberCsv("\n , nobody@co.com\n")).toHaveLength(0)
  })

  it("returns [] for blank input", () => {
    expect(parseMemberCsv("   ")).toEqual([])
    expect(parseMemberCsv("")).toEqual([])
  })
})
