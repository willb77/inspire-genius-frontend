import { GraduationCap } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { setPreviewOverride, useVerticalAccess } from "@/verticals/core"
import { useTranslation } from "react-i18next"

/**
 * Super-admin preview toggle for the GRANT (Financial Aid) vertical.
 *
 * Flips `grant_dev_access` on/off, which shows/hides the GRANT section in the
 * sidebar live (via the reactive store behind useVerticalAccess) — a UI
 * replacement for editing localStorage by hand. Rendered as a subtle fixed pill
 * pinned to the top-center of every super-admin page (just below the header),
 * so it's available everywhere without cluttering the layout.
 */
export default function GrantPreviewToggle() {
  const { t } = useTranslation("studioUi")
  const { hasAccess } = useVerticalAccess("grant")

  return (
    <div className="fixed top-[70px] left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur">
      <GraduationCap className="size-4 text-muted-foreground" aria-hidden />
      <Label htmlFor="grant-preview-toggle" className="cursor-pointer text-xs font-medium">
        {t("grant.grantPreviewToggle.financialAidPreview", { defaultValue: "Financial Aid preview" })}
      </Label>
      <Switch
        id="grant-preview-toggle"
        checked={hasAccess}
        onCheckedChange={(on) => setPreviewOverride("grant", on)}
        aria-label={t("grant.grantPreviewToggle.toggleTheFinancialAidGrant", { defaultValue: "Toggle the Financial Aid (GRANT) vertical view" })}
      />
    </div>
  )
}
