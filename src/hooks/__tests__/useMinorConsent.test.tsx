/**
 * @jest-environment jsdom
 */
import type { ReactNode } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { rosterAgeRows, useMinorConsentStatus, useRosterAgeCapture } from "../useMinorConsent"
import { getMinorConsentStatus, recordRosterAges } from "@/services/minorConsent.service"
import type { BulkUserRecord } from "@/types/bulk-import"

jest.mock("@/services/minorConsent.service", () => ({
  getMinorConsentStatus: jest.fn(),
  recordRosterAges: jest.fn(),
}))

const mockStatus = getMinorConsentStatus as jest.Mock
const mockRecord = recordRosterAges as jest.Mock

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

const rec = (email1: string, date_of_birth?: string, organization_id?: string): BulkUserRecord =>
  ({ fname: "A", lname: "B", email1, user_type: "user", date_of_birth, organization_id }) as BulkUserRecord

describe("rosterAgeRows", () => {
  it("takes only rows with a date, and the org only when set", () => {
    expect(rosterAgeRows([rec("a@x.test", "2011-04-09", "org-1"), rec("b@x.test"), rec("c@x.test", "2010-01-01")]))
      .toEqual([
        { email: "a@x.test", dateOfBirth: "2011-04-09", organizationId: "org-1" },
        { email: "c@x.test", dateOfBirth: "2010-01-01" },
      ])
  })
})

describe("useRosterAgeCapture", () => {
  beforeEach(() => jest.clearAllMocks())

  /** Both hooks under one client, so the test can wait for the status to SETTLE. */
  function renderBoth() {
    return renderHook(() => ({ capture: useRosterAgeCapture(), status: useMinorConsentStatus() }), { wrapper })
  }

  async function flush() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
  }

  it("switch off: capture not allowed and nothing is ever sent", async () => {
    mockStatus.mockResolvedValue({ enabled: false, rosterAgeCapture: false })
    const { result } = renderBoth()
    await waitFor(() => expect(result.current.status.isSuccess).toBe(true))
    expect(result.current.capture.ageCaptureAllowed).toBe(false)
    act(() => result.current.capture.recordFrom([rec("a@x.test", "2011-04-09")]))
    await flush()
    expect(mockRecord).not.toHaveBeenCalled()
  })

  it("status failure reads as not allowed, and sends nothing", async () => {
    mockStatus.mockRejectedValue(new Error("404"))
    const { result } = renderBoth()
    await waitFor(() => expect(result.current.status.isError).toBe(true))
    expect(result.current.capture.ageCaptureAllowed).toBe(false)
    act(() => result.current.capture.recordFrom([rec("a@x.test", "2011-04-09")]))
    await flush()
    expect(mockRecord).not.toHaveBeenCalled()
  })

  it("allowed: sends the dated rows only, and not at all when none are dated", async () => {
    mockStatus.mockResolvedValue({ enabled: false, rosterAgeCapture: true })
    mockRecord.mockResolvedValue({ total: 1, recorded: 1, invalid_date: 0, not_permitted: 0, not_enabled: 0, results: [] })
    const { result } = renderHook(() => useRosterAgeCapture(), { wrapper })
    await waitFor(() => expect(result.current.ageCaptureAllowed).toBe(true))
    act(() => result.current.recordFrom([rec("b@x.test")]))
    expect(mockRecord).not.toHaveBeenCalled()
    act(() => result.current.recordFrom([rec("a@x.test", "2011-04-09"), rec("b@x.test")]))
    await waitFor(() => expect(mockRecord).toHaveBeenCalledTimes(1))
    expect(mockRecord.mock.calls[0][0]).toEqual([{ email: "a@x.test", dateOfBirth: "2011-04-09" }])
  })
})
