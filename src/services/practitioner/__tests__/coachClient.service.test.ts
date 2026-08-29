import {
  listClients,
  getClient,
  addClient,
  bulkImportClients,
  uploadClientResource,
  listSchedule,
  createSessionsBulk,
  getCreditsSummary,
  getClientUsage,
} from "../coachClient.service"
import { CLIENT_RESOURCES } from "@/types/practitioner/coachClient"

describe("coachClient.service", () => {
  test("listClients returns a roster of summaries", async () => {
    const clients = await listClients()
    expect(Array.isArray(clients)).toBe(true)
    expect(clients.length).toBeGreaterThan(0)
    expect(clients[0]).toEqual(
      expect.objectContaining({ id: expect.any(String), name: expect.any(String) }),
    )
  })

  test("getClient returns a detail with all 10 resource keys", async () => {
    const detail = await getClient("cl-1")
    expect(detail).not.toBeNull()
    expect(detail?.id).toBe("cl-1")
    const keys = Object.keys(detail!.resources)
    expect(keys).toHaveLength(CLIENT_RESOURCES.length)
    CLIENT_RESOURCES.forEach((r) => {
      expect(detail!.resources).toHaveProperty(r.key)
    })
    expect(detail!.sessionsList.length).toBeGreaterThan(0)
    expect(detail!.goals.length).toBeGreaterThanOrEqual(0)
  })

  test("getClient resolves null for an unknown id", async () => {
    const detail = await getClient("nope")
    expect(detail).toBeNull()
  })

  test("getClient without ready PRISM has empty prismScores", async () => {
    const detail = await getClient("cl-7")
    expect(detail?.prismScores).toEqual([])
  })

  test("addClient returns a new client summary", async () => {
    const client = await addClient({ name: "New Person", email: "new@x.com", org: "Acme" })
    expect(client).toEqual(
      expect.objectContaining({ name: "New Person", email: "new@x.com", org: "Acme", status: "new" }),
    )
  })

  test("addClient defaults org to empty string", async () => {
    const client = await addClient({ name: "No Org", email: "noorg@x.com" })
    expect(client.org).toBe("")
  })

  test("bulkImportClients reports the number of imported rows", async () => {
    const result = await bulkImportClients([
      { name: "A", email: "a@x.com" },
      { name: "B", email: "b@x.com" },
    ])
    expect(result).toEqual({ imported: 2 })
  })

  test("uploadClientResource REJECTS in stub mode instead of faking success", async () => {
    // This test previously asserted `{ ok: true }` — from a call with NO FILE.
    // It was encoding the defect as the expectation: the implementation
    // discarded the upload and reported success, so a coach saw a success toast
    // and the file was gone. The assertion is inverted deliberately; if it ever
    // reads "resolves ok" again, the data-loss bug is back.
    await expect(uploadClientResource("cl-1", "resume")).rejects.toThrow()
  })

  test("listSchedule returns upcoming entries", async () => {
    const entries = await listSchedule()
    expect(entries.length).toBeGreaterThan(0)
    expect(entries[0]).toEqual(
      expect.objectContaining({ id: expect.any(String), clientName: expect.any(String) }),
    )
  })

  test("createSessionsBulk creates one entry per client and emails invites", async () => {
    const result = await createSessionsBulk({
      clientIds: ["cl-1", "cl-2"],
      startsAt: "2026-07-23T15:00:00",
      durationMin: 60,
      spacingMin: 15,
      topic: "t",
      message: "",
      sendInvites: true,
    })
    expect(result.created).toBe(2)
    expect(result.emailed).toBe(2)
    expect(result.entries).toHaveLength(2)
    expect(result.entries[0].clientName).toBe("Marcus Chen")
  })

  test("createSessionsBulk does not email when sendInvites is false", async () => {
    const result = await createSessionsBulk({
      clientIds: ["cl-1"],
      startsAt: "2026-07-23T15:00:00",
      durationMin: 30,
      spacingMin: 0,
      topic: "solo",
      message: "hi",
      sendInvites: false,
    })
    expect(result.created).toBe(1)
    expect(result.emailed).toBe(0)
  })

  test("getCreditsSummary reports PUK currency", async () => {
    const summary = await getCreditsSummary()
    expect(summary.currency).toBe("PUK")
    expect(summary).toEqual(
      expect.objectContaining({ balance: expect.any(Number), allocated: expect.any(Number), used: expect.any(Number) }),
    )
  })

  test("getClientUsage returns a usage row per client", async () => {
    const usage = await getClientUsage()
    expect(usage.length).toBeGreaterThan(0)
    expect(usage[0]).toEqual(
      expect.objectContaining({
        clientName: expect.any(String),
        sessions: expect.any(Number),
        creditsUsed: expect.any(Number),
        lastActive: expect.any(String),
      }),
    )
  })
})
