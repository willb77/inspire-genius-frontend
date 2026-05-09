import type { ReactNode } from "react"

export type ChartError = Error | string | null | undefined

export type CommonChartProps = {
  loading?: boolean
  error?: ChartError
  emptyState?: ReactNode
  title: string
  subtitle?: string
  height?: number
  className?: string
}
