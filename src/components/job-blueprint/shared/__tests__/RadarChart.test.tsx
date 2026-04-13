import { render, screen } from '@testing-library/react'
import { BlueprintRadarChart } from '../RadarChart'

jest.mock('recharts', () => ({
  Radar: () => <div data-testid="radar" />,
  RadarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="radar-chart">{children}</div>,
  PolarGrid: () => <div />,
  PolarAngleAxis: () => <div />,
  PolarRadiusAxis: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => <div />,
  Tooltip: () => <div />,
}))

describe('BlueprintRadarChart', () => {
  const data = [
    { dimension: 'Innovating', benchmark: 85 },
    { dimension: 'Evaluating', benchmark: 70 },
    { dimension: 'Finishing', benchmark: 60 },
  ]

  const datasets = [
    { key: 'benchmark', name: 'Benchmark', color: '#38A169', fillOpacity: 0.15 },
  ]

  it('renders the radar chart', () => {
    render(<BlueprintRadarChart data={data} datasets={datasets} />)
    expect(screen.getByTestId('radar-chart')).toBeInTheDocument()
  })

  it('renders a Radar element for each dataset', () => {
    render(<BlueprintRadarChart data={data} datasets={datasets} />)
    const radars = screen.getAllByTestId('radar')
    expect(radars).toHaveLength(1)
  })

  it('renders multiple Radar elements for multiple datasets', () => {
    const multiDatasets = [
      ...datasets,
      { key: 'candidate', name: 'Candidate', color: '#805AD5', fillOpacity: 0.1 },
    ]
    render(<BlueprintRadarChart data={data} datasets={multiDatasets} />)
    const radars = screen.getAllByTestId('radar')
    expect(radars).toHaveLength(2)
  })
})
