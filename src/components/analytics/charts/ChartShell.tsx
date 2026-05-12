import type { ReactNode } from "react"
import DataCard from "@/components/dashboard/DataCard"
import LoadingSkeleton from "./LoadingSkeleton"
import ErrorPill from "./ErrorPill"
import type { ChartError } from "./types"

type ChartShellProps = {
  title: string
  subtitle?: string
  loading?: boolean
  error?: ChartError
  emptyState?: ReactNode
  isEmpty: boolean
  height?: number
  className?: string
  children: ReactNode
}

export default function ChartShell({
  title,
  subtitle,
  loading,
  error,
  emptyState,
  isEmpty,
  height = 200,
  className,
  children,
}: ChartShellProps) {
  let body: ReactNode

  if (loading) {
    body = <LoadingSkeleton height={height} />
  } else if (error) {
    body = <ErrorPill error={error} />
  } else if (isEmpty) {
    body = (
      <div data-testid="chartkit-empty-state" className="text-[13px] text-[#6b7280]">
        {emptyState ?? "No data available."}
      </div>
    )
  } else {
    body = children
  }

  return (
    <DataCard title={title} className={className}>
      {subtitle && (
        <p className="-mt-2 mb-3 text-[12px] text-[#6b7280]">{subtitle}</p>
      )}
      {body}
    </DataCard>
  )
}
