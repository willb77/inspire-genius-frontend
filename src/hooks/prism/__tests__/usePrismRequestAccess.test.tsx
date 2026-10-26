/**
 * @jest-environment jsdom
 *
 * Prior approval for PRISM survey requests (2026-10-26): the hooks and the
 * service helpers that read the server's refusal.
 */
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const mockGet = jest.fn()
const mockPost = jest.fn()
jest.mock('@/lib/agentApi', () => ({
  agentApi: {
    get: (...a: unknown[]) => mockGet(...a),
    post: (...a: unknown[]) => mockPost(...a),
  },
}))

import {
  prismRequestAccessKey,
  usePrismRequestAccess,
  useRequestPrismAccess,
} from '@/hooks/prism/usePrismRequestAccess'
import {
  PRISM_REQUEST_APPROVAL_MESSAGE,
  apiErrorMessage,
  isApprovalRequiredError,
  isOtherEmail,
} from '@/services/prism/prism'

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

const state = {
  allowed: false, scope: null, pending: false, request: null,
  message: PRISM_REQUEST_APPROVAL_MESSAGE, account: { name: 'Pat', email: 'pat@example.com' },
}

beforeEach(() => {
  mockGet.mockReset()
  mockPost.mockReset()
})

it('reads GET /v1/prism/requests/access', async () => {
  mockGet.mockResolvedValue({ data: state })
  const { wrapper } = makeWrapper()
  const { result } = renderHook(() => usePrismRequestAccess(), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(mockGet).toHaveBeenCalledWith('/v1/prism/requests/access')
  expect(result.current.data?.allowed).toBe(false)
})

it('does not read when disabled', () => {
  const { wrapper } = makeWrapper()
  renderHook(() => usePrismRequestAccess({ enabled: false }), { wrapper })
  expect(mockGet).not.toHaveBeenCalled()
})

it('posts the practitioner and confirmation only, and caches the new state', async () => {
  const pending = { ...state, pending: true }
  mockPost.mockResolvedValue({ data: pending })
  const { client, wrapper } = makeWrapper()
  const { result } = renderHook(() => useRequestPrismAccess(), { wrapper })
  await act(async () => {
    await result.current.mutateAsync({ practitionerName: 'Dr P', confirmIsMe: true })
  })
  expect(mockPost).toHaveBeenCalledWith('/v1/prism/requests/access', {
    practitionerName: 'Dr P',
    confirmIsMe: true,
  })
  expect(client.getQueryData(prismRequestAccessKey)).toEqual(pending)
})

it('recognises only the approval refusal', () => {
  const refusal = { response: { status: 403, data: { detail: { code: 'prism_request_approval_required' } } } }
  expect(isApprovalRequiredError(refusal)).toBe(true)
  expect(isApprovalRequiredError({ response: { status: 403, data: { detail: 'nope' } } })).toBe(false)
  expect(isApprovalRequiredError({ response: { status: 422, data: { detail: { code: 'prism_request_approval_required' } } } })).toBe(false)
  expect(isApprovalRequiredError(new Error('x'))).toBe(false)
})

it('reads a message out of a string, a structured detail, or the error', () => {
  expect(apiErrorMessage({ response: { data: { detail: 'plain' } } })).toBe('plain')
  expect(apiErrorMessage({ response: { data: { detail: { message: 'structured' } } } })).toBe('structured')
  expect(apiErrorMessage(Object.assign(new Error('own'), { response: { data: { detail: { code: 'x' } } } }))).toBe('own')
})

it('treats only a different (or unknowable) account email as someone else', () => {
  expect(isOtherEmail('Pat@Example.com ', 'pat@example.com')).toBe(false)
  expect(isOtherEmail('', 'pat@example.com')).toBe(false)
  expect(isOtherEmail(undefined, 'pat@example.com')).toBe(false)
  expect(isOtherEmail('other@example.com', 'pat@example.com')).toBe(true)
  expect(isOtherEmail('pat@example.com', '')).toBe(true)
})

it('carries the decided message verbatim', () => {
  expect(PRISM_REQUEST_APPROVAL_MESSAGE).toBe(
    'All Requests for Surveys need prior Approval. Please provide your name and the name of the PRISM Practitioner who provided access to the site. A notification will be sent to Admin@inspiresgenius.com',
  )
})
