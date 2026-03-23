import { render, screen } from '@testing-library/react'
import { RankRateInput } from '../job-dna/RankRateInput'
import { BEHAVIORS, CORE_TRAITS } from '@/constants/job-blueprint/dimensions'
import type { DimensionBenchmark } from '@/types/job-blueprint'

describe('RankRateInput', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders all 8 behavior dimensions', () => {
    render(
      <RankRateInput
        dimensions={BEHAVIORS}
        category="behavior"
        onChange={mockOnChange}
      />
    )
    expect(screen.getByText('Innovating')).toBeInTheDocument()
    expect(screen.getByText('Initiating')).toBeInTheDocument()
    expect(screen.getByText('Evaluating')).toBeInTheDocument()
  })

  it('renders all 6 core trait dimensions', () => {
    render(
      <RankRateInput
        dimensions={CORE_TRAITS}
        category="core-trait"
        onChange={mockOnChange}
      />
    )
    expect(screen.getByText('Relationship Management')).toBeInTheDocument()
    expect(screen.getByText('Flexibility')).toBeInTheDocument()
  })

  it('calls onChange on initial render with default benchmarks', () => {
    render(
      <RankRateInput
        dimensions={BEHAVIORS}
        category="behavior"
        onChange={mockOnChange}
      />
    )
    // Should be called with 8 benchmarks
    expect(mockOnChange).toHaveBeenCalled()
    const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
    expect(lastCall).toHaveLength(8)
  })

  it('emits benchmarks with correct structure', () => {
    render(
      <RankRateInput
        dimensions={BEHAVIORS}
        category="behavior"
        onChange={mockOnChange}
      />
    )
    const benchmarks: DimensionBenchmark[] = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0]
    const first = benchmarks[0]
    expect(first).toHaveProperty('dimensionId')
    expect(first).toHaveProperty('dimensionName')
    expect(first).toHaveProperty('category', 'behavior')
    expect(first).toHaveProperty('rankPosition')
    expect(first).toHaveProperty('rateValue')
    expect(first).toHaveProperty('finalBenchmarkPercent')
    expect(first).toHaveProperty('interpretation')
  })

  it('has rate sliders for each dimension', () => {
    render(
      <RankRateInput
        dimensions={BEHAVIORS}
        category="behavior"
        onChange={mockOnChange}
      />
    )
    const sliders = screen.getAllByRole('slider')
    expect(sliders).toHaveLength(8)
  })

  it('has move up/down buttons', () => {
    render(
      <RankRateInput
        dimensions={BEHAVIORS}
        category="behavior"
        onChange={mockOnChange}
      />
    )
    const upButtons = screen.getAllByLabelText(/Move .+ up/)
    const downButtons = screen.getAllByLabelText(/Move .+ down/)
    expect(upButtons).toHaveLength(8)
    expect(downButtons).toHaveLength(8)
  })

  it('disables move up for first item', () => {
    render(
      <RankRateInput
        dimensions={BEHAVIORS}
        category="behavior"
        onChange={mockOnChange}
      />
    )
    const upButtons = screen.getAllByLabelText(/Move .+ up/)
    expect(upButtons[0]).toBeDisabled()
  })

  it('disables move down for last item', () => {
    render(
      <RankRateInput
        dimensions={BEHAVIORS}
        category="behavior"
        onChange={mockOnChange}
      />
    )
    const downButtons = screen.getAllByLabelText(/Move .+ down/)
    expect(downButtons[downButtons.length - 1]).toBeDisabled()
  })
})
