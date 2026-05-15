import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ErrorStateProps = {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export default function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this content. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6 text-[#EF4444]" />
      </div>
      <h3 className="text-[15px] font-semibold text-[#374151] mb-1">{title}</h3>
      <p className="text-[13px] text-[#9ca3af] max-w-xs mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  )
}
