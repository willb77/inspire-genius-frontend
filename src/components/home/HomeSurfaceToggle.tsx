import { useTranslation } from "react-i18next";

import { Switch } from "@/components/ui/switch";

/**
 * User-facing switch that flips the /home surface between the new dashboard
 * (HomeV2) and the classic Home. Controlled by the HomeSurface route resolver:
 * the parent owns the flag state (persisting it via `setNewUserSurfaces`) and
 * swaps the rendered page in-place, so flipping is an instant client-side
 * re-render — NOT a full `window.location.reload()`. Avoiding the hard reload
 * keeps the authenticated session intact (a fresh boot could otherwise bounce
 * the user to /login via the auth-refresh path).
 */
export default function HomeSurfaceToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (next: boolean) => void;
}) {
  const { t } = useTranslation("dashboard");

  return (
    <div className="flex items-center justify-end gap-2 px-4 py-2 text-xs text-muted-foreground">
      <span className={enabled ? "" : "font-medium text-foreground"}>
        {t("homeV2.classic", { defaultValue: "Classic" })}
      </span>
      <Switch
        checked={enabled}
        onCheckedChange={onChange}
        aria-label={t("homeV2.toggleNewHome", {
          defaultValue: "Toggle new home page",
        })}
      />
      <span className={enabled ? "font-medium text-foreground" : ""}>
        {t("homeV2.new", { defaultValue: "New" })}
      </span>
    </div>
  );
}
