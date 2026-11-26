/**
 * TDS-U11b — telling a practitioner's client cards (U11a) apart from members.
 *
 * The rule under test: every roster the server sends today (no null member id,
 * no client fields) passes through unchanged, and a card with no member id is
 * never handed to anything that builds a person-page link.
 */
import {
  clientIdOf,
  connectedMembers,
  rosterShowsClients,
  unconnectedClients,
  type RosterEntry,
} from "@/lib/practitionerRoster"
import type { RosterMember } from "@/types/development"

const cov = { prism: false, clifton: false, disc: false }

function member(id: string, extra: Partial<RosterEntry> = {}): RosterEntry {
  return { memberId: id, name: `Person ${id}`, coverage: cov, planStatus: null, ...extra }
}

describe("connectedMembers", () => {
  it("returns today's roster unchanged: same objects, same order", () => {
    const today = [member("a"), member("b"), member("c")]
    const out = connectedMembers(today)
    expect(out).toHaveLength(3)
    out.forEach((m, i) => expect(m).toBe(today[i]))
  })

  it("keeps a linked client's card, with its clientId, among the members", () => {
    const linked = member("acct-1", { clientId: "cl-1", connected: true })
    expect(connectedMembers([linked])).toEqual([linked])
  })

  it("never returns a card with no member id", () => {
    const out = connectedMembers([
      member("a"),
      { ...member("x"), memberId: null, clientId: "cl-9", connected: false },
      { ...member("y"), memberId: "" },
    ])
    expect(out.map((m) => m.memberId)).toEqual(["a"])
  })

  it("is empty for anything that is not a list", () => {
    expect(connectedMembers(undefined)).toEqual([])
    expect(connectedMembers(null)).toEqual([])
    expect(connectedMembers({} as unknown as RosterEntry[])).toEqual([])
  })
})

describe("unconnectedClients", () => {
  it("is empty for today's roster", () => {
    expect(unconnectedClients([member("a"), member("b")])).toEqual([])
  })

  it("returns the clients the server marked connected:false, in order", () => {
    const out = unconnectedClients([
      member("a"),
      { ...member("x"), name: "Ada Client", memberId: null, clientId: "cl-1", connected: false },
      member("acct-2", { clientId: "cl-2", connected: true }),
      { ...member("y"), name: "Bo Client", memberId: null, clientId: "cl-3", connected: false },
    ])
    expect(out).toEqual([
      { clientId: "cl-1", name: "Ada Client" },
      { clientId: "cl-3", name: "Bo Client" },
    ])
  })

  it("drops a malformed card rather than guessing: no member id but not marked unconnected, or no client id", () => {
    expect(
      unconnectedClients([
        { ...member("x"), memberId: null },
        { ...member("y"), memberId: null, connected: false },
        { ...member("z"), memberId: null, clientId: "", connected: false },
        { ...member("w"), memberId: null, clientId: "cl-4", connected: null },
      ]),
    ).toEqual([])
  })

  it("is empty for anything that is not a list", () => {
    expect(unconnectedClients(undefined)).toEqual([])
  })
})

describe("clientIdOf", () => {
  it("reads the client id off a linked client's card", () => {
    expect(clientIdOf(member("a", { clientId: "cl-1", connected: true }) as RosterMember)).toBe("cl-1")
  })

  it("is null on every other card", () => {
    expect(clientIdOf(member("a") as RosterMember)).toBeNull()
    expect(clientIdOf(member("a", { clientId: "" }) as RosterMember)).toBeNull()
    expect(clientIdOf(member("a", { clientId: 7 as unknown as string }) as RosterMember)).toBeNull()
  })
})

describe("rosterShowsClients (RM-6, RM6PRE-a)", () => {
  it("is true when any card is a linked client", () => {
    expect(rosterShowsClients([member("a"), member("b", { clientId: "c-b" })] as RosterMember[])).toBe(true)
  })

  it("is true for an empty list (no clients yet, or only unconnected ones)", () => {
    expect(rosterShowsClients([])).toBe(true)
    expect(rosterShowsClients(null)).toBe(true)
    expect(rosterShowsClients(undefined)).toBe(true)
  })

  it("is false for an organisation list with no client card", () => {
    expect(rosterShowsClients([member("a"), member("b")] as RosterMember[])).toBe(false)
  })

  it("an empty or non-string client id is not a client", () => {
    expect(rosterShowsClients([member("a", { clientId: "" })] as RosterMember[])).toBe(false)
  })
})
