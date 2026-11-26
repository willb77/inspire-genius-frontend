/**
 * TDS U12 (CSA #2210): retiring "Client PRISM Assessments" removes only the
 * page, its nav row and its legacy client-list read. The PRISM import that
 * other surfaces use stays: the person's own "Replace PRISM data" and the
 * super-admin PRISM ingest (CSA F12).
 */
import * as prismHooks from "@/hooks/prism"
import * as prismService from "@/services/prism/prism.service"
import * as practitionerHooks from "@/hooks/practitioner/usePractitioner"
import * as practitionerService from "@/services/practitioner/practitioner.service"

jest.mock("@/lib/axios", () => ({ api: { get: jest.fn(), post: jest.fn() } }))

describe("U12 retirement keeps the shared PRISM import", () => {
  it("still exports usePrismImport and importPrismFile", () => {
    expect(typeof prismHooks.usePrismImport).toBe("function")
    expect(typeof prismService.importPrismFile).toBe("function")
  })

  it("removes the legacy client-list read and keeps the other practitioner reads", () => {
    expect("usePractitionerClients" in practitionerHooks).toBe(false)
    expect("getPractitionerClients" in practitionerService).toBe(false)
    expect(typeof practitionerHooks.usePractitionerSessions).toBe("function")
    expect(typeof practitionerService.getPractitionerSessions).toBe("function")
  })
})
