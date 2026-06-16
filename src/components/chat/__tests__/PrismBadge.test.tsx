/**
 * @jest-environment jsdom
 *
 * G9 Agent C — PrismBadge happy-path tests.
 * Per coordinator directive: 3–5 happy-path tests only, no snapshots,
 * no edge cases.
 */
import { render, screen } from '@testing-library/react'
import React from 'react'

// ── Mocks ────────────────────────────────────────────────
const mockUseLatestPrismStatus = jest.fn()

jest.mock('@/hooks/prism/usePrismRequest', () => ({
  useLatestPrismStatus: () => mockUseLatestPrismStatus(),
}))

// Radix Tooltip uses portals — render trigger inline for RTL.
jest.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) =>
    <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}))

import PrismBadge from '@/components/chat/PrismBadge'

beforeEach(() => {
  mockUseLatestPrismStatus.mockReset()
})

describe('PrismBadge (G9 Agent C)', () => {
  test('T1: renders "PRISM ready" chip + filename in tooltip when hasReadyPrism', () => {
    mockUseLatestPrismStatus.mockReturnValue({
      latest: null,
      hasReadyPrism: true,
      ingest_status: 'done',
      completed_at: '2026-06-15T12:00:00Z',
      csv_s3_key: 'users/x/prism/2026-06-15/PRISM,W,B,2026-06-15.csv',
      pdf_s3_key: null,
      requested_at: '2026-06-14T00:00:00Z',
      isLoading: false,
      isError: false,
    })

    render(<PrismBadge />)

    expect(screen.getByTestId('prism-ready-badge')).toBeInTheDocument()
    expect(screen.getByText('PRISM ready')).toBeInTheDocument()
    // Tooltip content (Radix mocked) renders the CSV filename.
    expect(screen.getByText('PRISM,W,B,2026-06-15.csv')).toBeInTheDocument()
  })

  test('T2: renders nothing when hasReadyPrism is false', () => {
    mockUseLatestPrismStatus.mockReturnValue({
      latest: null,
      hasReadyPrism: false,
      ingest_status: 'pending',
      completed_at: null,
      csv_s3_key: null,
      pdf_s3_key: null,
      requested_at: null,
      isLoading: false,
      isError: false,
    })

    const { container } = render(<PrismBadge />)

    expect(container.firstChild).toBeNull()
    expect(screen.queryByTestId('prism-ready-badge')).not.toBeInTheDocument()
    expect(screen.queryByText('PRISM ready')).not.toBeInTheDocument()
  })
})
