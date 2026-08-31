/**
 * @jest-environment jsdom
 *
 * ActivePrismRequestCard — the link-recovery surface. Covers the reason it
 * exists: a requested-but-incomplete PRISM survey must remain reachable after
 * a reload, since the link was previously shown only once on submit.
 */
import { render, screen } from '@testing-library/react'
import ActivePrismRequestCard from '../ActivePrismRequestCard'

const mockActive = jest.fn()
jest.mock('@/hooks/prism/usePrismRequest', () => ({
  useActivePrismRequests: () => mockActive(),
}))

function row(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  }
}

beforeEach(() => mockActive.mockReset())

describe('ActivePrismRequestCard', () => {
  it('renders nothing while loading', () => {
    mockActive.mockReturnValue({ active: [], isLoading: true, isError: false })
    const { container } = render(<ActivePrismRequestCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when there is no open request', () => {
    mockActive.mockReturnValue({ active: [], isLoading: false, isError: false })
    const { container } = render(<ActivePrismRequestCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('surfaces the questionnaire link for an open request', () => {
    mockActive.mockReturnValue({
      active: [
        { row: row(), questionnaireUrl: 'https://prism.test/survey/open' },
      ],
      isLoading: false,
      isError: false,
    })
    render(<ActivePrismRequestCard />)

    // Named by questionnaire type, so concurrent surveys are distinguishable.
    expect(screen.getByText(/Professional questionnaire/i)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /open questionnaire/i })
    expect(link).toHaveAttribute('href', 'https://prism.test/survey/open')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('renders one card per concurrent questionnaire type', () => {
    mockActive.mockReturnValue({
      active: [
        { row: row(), questionnaireUrl: 'https://prism.test/survey/pro' },
        {
          row: row({ id: 'req-2', qtype_id: 4 }),
          questionnaireUrl: 'https://prism.test/survey/found',
        },
      ],
      isLoading: false,
      isError: false,
    })
    render(<ActivePrismRequestCard />)
    expect(screen.getAllByTestId('active-prism-request')).toHaveLength(2)
    expect(screen.getByText(/Foundation questionnaire/i)).toBeInTheDocument()
  })

  it('explains itself when PRISM has issued no link yet', () => {
    mockActive.mockReturnValue({
      active: [{ row: row({ action_url_2: '' }), questionnaireUrl: null }],
      isLoading: false,
      isError: false,
    })
    render(<ActivePrismRequestCard />)
    expect(
      screen.getByText(/has not issued a questionnaire link/i),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: /open questionnaire/i }),
    ).not.toBeInTheDocument()
  })
})
