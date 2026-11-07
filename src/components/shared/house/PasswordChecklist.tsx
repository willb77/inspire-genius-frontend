import { Check, Circle } from "lucide-react"
import { checkPassword } from "@/lib/house/passwordRule"
import { cn } from "@/lib/utils"

/**
 * Live checklist for the one password rule. Each line turns to a tick as it is
 * met, so people see what is missing before they submit, not after.
 */
export function PasswordChecklist({ password, className }: { password: string; className?: string }) {
  return (
    <ul className={cn("mt-2 space-y-1 text-left text-xs", className)} aria-label="Password rules">
      {checkPassword(password).map((c) => (
        <li
          key={c.key}
          data-met={c.met}
          className={cn("flex items-center gap-1.5", c.met ? "text-foreground" : "text-muted-foreground")}
        >
          {c.met ? (
            <Check className="h-3.5 w-3.5 text-green-600" aria-hidden="true" />
          ) : (
            <Circle className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>
            {c.label}
            <span className="sr-only">{c.met ? " — done" : " — still needed"}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
