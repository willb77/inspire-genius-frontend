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
    const fixture = {
      items: [
        {
          request_id: 'req-1',
          action_url_1: 'https://prism.test/survey/1',
          quest_status_desc: 'pending',
          forename: 'Jane',
          surname: 'Smith',
          email: 'jane@example.com',
          organisation: null,
          qtype_id: 1,
          created_at: '2026-06-15T00:00:00Z',
          updated_at: '2026-06-15T00:00:00Z',
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
})
