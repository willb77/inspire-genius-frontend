import { render, screen } from '@testing-library/react'
import { AccuracyChart } from '../AccuracyChart'
import type { AccuracyReport } from '@/types/job-blueprint'

jest.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => <div />,
}))

// The exact shape blueprint-service tests/test_analytics.py::test_accuracy asserts on:
// {distribution, pendingOutcomeData, note}. Counts are dev's seeded cohort (2026-07).
const NOTE =
  'Predicted classification distribution only. True predictive accuracy cannot be computed until real post-hire performance outcomes are collected — no outcome data exists yet, so no accuracy figure is reported (Methodology Manual §8).'

const REPORT: AccuracyReport = {
  distribution: [
    { period: '2026-07', strongFit: 25, potentialFit: 25, moderateFit: 10, misalignment: 36, total: 96 },
  ],
  pendingOutcomeData: true,
  note: NOTE,
}

describe('AccuracyChart', () => {
  it('renders the card with an honest title — no "accuracy" is claimed', () => {
    render(<AccuracyChart report={REPORT} />)
    expect(screen.getByText('Predicted fit distribution')).toBeInTheDocument()
    expect(screen.queryByText(/Prediction Accuracy/i)).not.toBeInTheDocument()
  })

  it('plots the distribution as a bar chart', () => {
    render(<AccuracyChart report={REPORT} />)
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
  })

  it('renders the backend note verbatim when outcome data is pending', () => {
    render(<AccuracyChart report={REPORT} />)
    expect(screen.getByRole('note')).toHaveTextContent(NOTE)
  })

  it('omits the note once the backend stops flagging pending outcomes', () => {
    render(<AccuracyChart report={{ ...REPORT, pendingOutcomeData: false }} />)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('an empty distribution says so and still shows the note', () => {
    render(<AccuracyChart report={{ ...REPORT, distribution: [] }} />)
    expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument()
    expect(screen.getByText('No predicted classifications yet.')).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(NOTE)
  })
})
