/**
 * @jest-environment jsdom
 *
 * G8 — RequestPrismDialog happy-path tests.
 * Per coordinator directive: 3–5 happy-path tests only, no snapshots,
 * no edge cases.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// ── Mocks ────────────────────────────────────────────────
const mockMutate = jest.fn()

jest.mock('@/hooks/prism/usePrismRequest', () => ({
  useRequestPrismSurvey: () => ({ mutate: mockMutate, isPending: false }),
  useMyPrismRequests: () => ({ data: { items: [], total: 0 }, isLoading: false }),
  myPrismRequestsKey: ['prism', 'requests', 'me'],
}))

jest.mock('@/context/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'u-1',
      email: 'jane.smith@example.com',
      fullName: 'Jane Smith',
    },
  }),
}))

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}))

// shadcn Dialog uses Radix portal — in jsdom we just render the content
// inline so RTL queries can find the form fields.
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import RequestPrismDialog from '@/components/prism/RequestPrismDialog'

function renderWithQuery(node: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>)
}

beforeEach(() => {
  mockMutate.mockReset()
})

describe('RequestPrismDialog (G8)', () => {
  test('T1: renders form with fields prefilled from useAuth and submits with the right payload', async () => {
    renderWithQuery(<RequestPrismDialog open={true} onOpenChange={jest.fn()} />)

    // Pre-fill from useAuth → "Jane Smith" split, email pre-filled
    const forename = screen.getByLabelText(/First name/i) as HTMLInputElement
    const surname = screen.getByLabelText(/Last name/i) as HTMLInputElement
    const email = screen.getByLabelText(/^Email$/i) as HTMLInputElement
    expect(forename.value).toBe('Jane')
    expect(surname.value).toBe('Smith')
    expect(email.value).toBe('jane.smith@example.com')

    // Fill the optional organisation field and submit
    const org = screen.getByLabelText(/Organisation/i) as HTMLInputElement
    fireEvent.change(org, { target: { value: 'Acme Corp' } })

    fireEvent.click(screen.getByRole('button', { name: /Request survey/i }))

    await waitFor(() => expect(mockMutate).toHaveBeenCalledTimes(1))
    const [payload] = mockMutate.mock.calls[0]
    expect(payload).toEqual({
      forename: 'Jane',
      surname: 'Smith',
      email: 'jane.smith@example.com',
      organisation: 'Acme Corp',
      qtype_id: undefined,
    })
  })
})
