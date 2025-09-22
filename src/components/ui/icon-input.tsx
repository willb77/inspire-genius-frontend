import * as React from "react"
import { cn } from "@/lib/utils"

export type IconInputProps = React.ComponentProps<"input"> & {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  onRightIconClick?: () => void
}

export function IconInput({
  className,
  type,
  leftIcon,
  rightIcon,
  onRightIconClick,
  ...props
}: IconInputProps) {
  const hasLeft = Boolean(leftIcon)
  const hasRight = Boolean(rightIcon)
  return (
    <div className="relative">
      {hasLeft ? (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-primary">
          {leftIcon}
        </span>
      ) : null}
      <input
        type={type}
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-11 w-full min-w-0 rounded-md border bg-transparent py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          hasLeft ? "pl-10" : "pl-3",
          hasRight ? "pr-10" : "pr-3",
          className
        )}
        {...props}
      />
      {hasRight ? (
        <button
          type="button"
          aria-label="toggle"
          onClick={onRightIconClick}
          className="absolute inset-y-0 right-3 grid place-items-center text-muted-foreground hover:text-foreground"
        >
          {rightIcon}
        </button>
      ) : null}
    </div>
  )
}

export default IconInput
