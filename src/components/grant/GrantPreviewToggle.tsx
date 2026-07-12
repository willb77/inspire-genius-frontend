import { GraduationCap } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useVerticalAccess } from "@/hooks/grant/useVerticalAccess"
import { setGrantPreviewOverride } from "@/hooks/grant/grantPreviewStore"

/**
 * Super-admin preview toggle for the GRANT (Financial Aid) vertical.
 *
 * Flips `grant_dev_access` on/off, which shows/hides the GRANT section in the
 * sidebar live (via the reactive store behind useVerticalAccess) — a UI
 * replacement for editing localStorage by hand. Rendered as a subtle fixed pill
 * so it's available on every super-admin page without cluttering the layout.
 */
export default function GrantPreviewToggle() {
  const { hasAccess } = useVerticalAccess("grant")

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
      <GraduationCap className="size-4 text-muted-foreground" aria-hidden />
      <Label htmlFor="grant-preview-toggle" className="cursor-pointer text-xs font-medium">
        Financial Aid preview
      </Label>
      <Switch
        id="grant-preview-toggle"
        checked={hasAccess}
        onCheckedChange={setGrantPreviewOverride}
        aria-label="Toggle the Financial Aid (GRANT) vertical view"
      />
    </div>
  )
}
