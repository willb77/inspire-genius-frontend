/**
 * @jest-environment jsdom
 *
 * G8 — usePrismRequest happy-path tests.
 * Per coordinator directive: 3–5 happy-path tests only, no snapshots.
 */
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// ── Mock the service layer ───────────────────────────────
const mockList = jest.fn()
const mockRequest = jest.fn()

jest.mock('@/services/prism/prism', () => ({
  listMyPrismRequests: (...args: unknown[]) => mockList(...args),
  requestPrismSurvey: (...args: unknown[]) => mockRequest(...args),
}))

import {
  useMyPrismRequests,
  useRequestPrismSurvey,
  useActivePrismRequests,
  useLatestPrismStatus,
  myPrismRequestsKey,
} from '@/hooks/prism/usePrismRequest'

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

beforeEach(() => {
  mockList.mockReset()
  mockRequest.mockReset()
})

describe('usePrismRequest hooks (G8)', () => {
  test('T2a: useMyPrismRequests returns the mocked response shape', async () => {
    // Mirrors the BACKEND payload exactly: `rows` (not `items`) and `id`
    // (not `request_id`). This fixture previously encoded the wrong shape,
    // which is why the mismatch went unnoticed — the hook read `items`,
    // always got [], and the "PRISM ready" badge could never render.
    const fixture = {
      rows: [
        {
          id: 'req-1',
          action_url_1: '',
          action_url_2: 'https://prism.test/survey/1',
          forename: 'Jane',
          surname: 'Smith',
          email: 'jane@example.com',
          organisation: null,
          qtype_id: 1,
          requested_at: '2026-06-15T00:00:00Z',
          completed_at: null,
          ingest_status: 'pending',
        },
      ],
      total: 1,
    }
    mockList.mockResolvedValue(fixture)

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useMyPrismRequests(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(fixture)
    expect(mockList).toHaveBeenCalledTimes(1)
  })

  test('T2b: useRequestPrismSurvey invalidates the list query on success', async () => {
    mockRequest.mockResolvedValue({
      request_id: 'req-2',
      action_url_1: 'https://prism.test/survey/2',
      quest_status_desc: 'pending',
    })

    const { client, wrapper } = makeWrapper()
    const invalidateSpy = jest.spyOn(client, 'invalidateQueries')

    const { result } = renderHook(() => useRequestPrismSurvey(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        forename: 'Jane',
        surname: 'Smith',
        email: 'jane@example.com',
      })
    })

    expect(mockRequest).toHaveBeenCalledWith({
      forename: 'Jane',
      surname: 'Smith',
      email: 'jane@example.com',
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: myPrismRequestsKey })
  })

  /* Contract regression: the backend returns `rows`, not `items`. The old
     fixture (and the type) said `items`, so useLatestPrismStatus always saw
     an empty list and the "PRISM ready" badge could never render. */
  test('T2c: useLatestPrismStatus reads the backend `rows` key', async () => {
    mockList.mockResolvedValue({
      rows: [
        {
          id: 'req-done',
          action_url_1: '',
          action_url_2: 'https://prism.test/survey/done',
          forename: 'Jane',
          surname: 'Smith',
          email: 'jane@example.com',
          organisation: null,
          qtype_id: 4,
          requested_at: '2026-06-15T00:00:00Z',
          completed_at: '2026-06-20T00:00:00Z',
          ingest_status: 'done',
        },
      ],
      total: 1,
    })

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useLatestPrismStatus(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.latest?.id).toBe('req-done')
    expect(result.current.hasReadyPrism).toBe(true)
  })

  /* The link-recovery surface: open requests, each with ActionURL1 falling
     back to ActionURL2 (PRISM leaves URL1 empty for a fresh candidate). */
  test('T2d: useActivePrismRequests returns open rows with a resolved link', async () => {
    mockList.mockResolvedValue({
      rows: [
        {
          id: 'req-open',
          action_url_1: '',
          action_url_2: 'https://prism.test/survey/open',
          forename: 'Jane',
          surname: 'Smith',
          email: 'jane@example.com',
          organisation: null,
          qtype_id: 1,
          requested_at: '2026-07-22T00:00:00Z',
          completed_at: null,
          ingest_status: 'pending',
        },
        {
          id: 'req-closed',
          action_url_1: 'https://prism.test/survey/closed',
          action_url_2: '',
          forename: 'Jane',
          surname: 'Smith',
          email: 'jane@example.com',
          organisation: null,
          qtype_id: 4,
          requested_at: '2026-06-01T00:00:00Z',
          completed_at: '2026-06-05T00:00:00Z',
          ingest_status: 'done',
        },
      ],
      total: 2,
    })

    const { wrapper } = makeWrapper()
    const { result } = renderHook(() => useActivePrismRequests(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    // Completed rows are excluded.
    expect(result.current.active).toHaveLength(1)
    expect(result.current.active[0].row.id).toBe('req-open')
    // ActionURL2 is used when ActionURL1 is empty.
    expect(result.current.active[0].questionnaireUrl).toBe(
      'https://prism.test/survey/open',
    )
  })
})
