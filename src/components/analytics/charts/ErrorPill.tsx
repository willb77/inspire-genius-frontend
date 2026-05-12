import type { ChartError } from "./types"

type ErrorPillProps = {
  error: ChartError
}

export default function ErrorPill({ error }: ErrorPillProps) {
  if (!error) return null
  const message =
    typeof error === "string" ? error : error.message || "Failed to load chart data."
  return (
    <div
      data-testid="chartkit-error-pill"
      role="alert"
      className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-[12px] font-medium text-[#EF4444] border border-red-100"
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#EF4444]" />
      {message}
    </div>
  )
}
