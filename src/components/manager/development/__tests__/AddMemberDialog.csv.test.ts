/**
 * U7: the "Import a file" tab's CSV parse. A quoted field may hold commas,
 * line breaks and doubled quotes; unquoted input splits exactly as the plain
 * comma split it replaces did. Invented people — this repo is public.
 */
import { parseCsvRecords, parseMemberCsv } from "../memberCsv"

describe("parseMemberCsv", () => {
  it("keeps a quoted comma inside its cell", () => {
    expect(parseMemberCsv('"Smith, Jr.",a@x.com,Lead,Ops')).toEqual([
      { name: "Smith, Jr.", email: "a@x.com", title: "Lead", department: "Ops" },
    ])
  })

  it("reads a doubled quote as one quote, and a quoted line break as text", () => {
    expect(parseCsvRecords('"Jo ""JJ"" Lee",j@x.com\n"Two\nLines",t@x.com')).toEqual([
      ["Jo \"JJ\" Lee", "j@x.com"],
      ["Two\nLines", "t@x.com"],
    ])
  })

  it("parses unquoted input exactly as before: trimmed cells, blank lines and the header dropped", () => {
    const text = "Name, Email, Title, Department\r\n\r\n  Jordan Lee, jordan@co.com, Engineer, Platform  \nSam Rivera\n"
    expect(parseMemberCsv(text)).toEqual([
      { name: "Jordan Lee", email: "jordan@co.com", title: "Engineer", department: "Platform" },
      { name: "Sam Rivera", email: undefined, title: undefined, department: undefined },
    ])
  })

  it("a quote inside an unquoted value is literal", () => {
    expect(parseCsvRecords('Jo "JJ" Lee,j@x.com')).toEqual([['Jo "JJ" Lee', "j@x.com"]])
  })

  it("drops rows with no name, and returns nothing for empty text", () => {
    expect(parseMemberCsv(",a@x.com\n")).toEqual([])
    expect(parseMemberCsv("")).toEqual([])
  })
})
