import { useTranslation } from "react-i18next"
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
  title: titleProp,
  message: messageProp,
  onRetry,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation("shellUi")
  const title = titleProp ?? t("errorState.title", { defaultValue: "Something went wrong" })
  const message = messageProp ?? t("errorState.message", { defaultValue: "We couldn't load this content. Please try again." })
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="w-12 h-12 rounded-full bg-[#FEF2F2] flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6 text-[#EF4444]" />
      </div>
      <h3 className="text-[15px] font-semibold text-[#374151] mb-1">{title}</h3>
      <p className="text-[13px] text-[#9ca3af] max-w-xs mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t("errorState.retry", { defaultValue: "Try Again" })}
        </Button>
      )}
    </div>
  )
}
