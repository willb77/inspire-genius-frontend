import { render, screen } from '@testing-library/react'
import { RankRateInput } from '../job-dna/RankRateInput'
import { APTITUDES, BEHAVIORS, CORE_TRAITS } from '@/constants/job-blueprint/dimensions'
import { calculateBenchmark as calcBenchmark } from '@/lib/job-blueprint/scoring'
import { getRankTable } from '@/constants/job-blueprint/scoring-tables'
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

// ── Guard: the manual wizard's output IS Rank-then-Rate (2026-10-20) ──────────
// Every emitted row must reproduce its own target from its stored inputs, with
// rankPosition 1-based and rankPercent the licensed rank-table value — the
// same relationship the drafter and the global library are held to in the
// monorepo. rankPercent used to be a literal 0 that nothing filled in.

describe('RankRateInput — stored fields are a coherent Rank-then-Rate record', () => {
  it.each([
    ['behavior', BEHAVIORS],
    ['aptitude', APTITUDES],
    ['core-trait', CORE_TRAITS],
  ] as const)('%s: target = calculateBenchmark(rankPosition - 1, rateValue), rankPercent = table[rankPosition - 1]', (category, dims) => {
    const onChange = jest.fn()
    render(<RankRateInput dimensions={dims} category={category} onChange={onChange} />)
    const out: DimensionBenchmark[] = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(out).toHaveLength(dims.length)
    expect(out.map((b) => b.rankPosition).sort((a, b) => a - b)).toEqual(dims.map((_, i) => i + 1))
    for (const b of out) {
      expect(b.rankPercent).toBe(getRankTable(category)[b.rankPosition - 1])
      expect(b.finalBenchmarkPercent).toBe(calcBenchmark(b.rankPosition - 1, b.rateValue, category))
    }
  })

  it('round-trips a saved 1-based record without shifting it', () => {
    const onChange = jest.fn()
    const saved: DimensionBenchmark[] = BEHAVIORS.map((d, i) => ({
      dimensionId: d.id,
      dimensionName: d.name,
      category: 'behavior',
      rankPosition: i + 1,
      rankPercent: getRankTable('behavior')[i],
      rateValue: 3,
      finalBenchmarkPercent: calcBenchmark(i, 3, 'behavior'),
      interpretation: 'moderate',
    }))
    render(<RankRateInput dimensions={BEHAVIORS} category="behavior" value={saved} onChange={onChange} />)
    const out: DimensionBenchmark[] = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    for (const b of out) {
      const before = saved.find((s) => s.dimensionId === b.dimensionId)
      expect(b.rankPosition).toBe(before?.rankPosition)
      expect(b.finalBenchmarkPercent).toBe(before?.finalBenchmarkPercent)
    }
  })
})
