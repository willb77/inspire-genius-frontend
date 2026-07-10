import { useState } from "react";

import { Switch } from "@/components/ui/switch";
import { isNewUserSurfacesEnabled, setNewUserSurfaces } from "@/lib/surfaceFlags";

/**
 * User-facing switch that flips the /home surface between the new dashboard
 * (HomeV2) and the classic Home. It writes the `new_user_surfaces` flag via
 * `setNewUserSurfaces` and reloads so the route resolver re-evaluates.
 *
 * Rendered by the HomeSurface route resolver, so it sits above whichever
 * variant is active and is reachable from both.
 */
export default function HomeSurfaceToggle() {
  const [on] = useState(isNewUserSurfacesEnabled);

  const handleChange = (next: boolean) => {
    setNewUserSurfaces(next);
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-end gap-2 px-4 py-2 text-xs text-muted-foreground">
      <span className={on ? "" : "font-medium text-foreground"}>Classic</span>
      <Switch
        checked={on}
        onCheckedChange={handleChange}
        aria-label="Toggle new home page"
      />
      <span className={on ? "font-medium text-foreground" : ""}>New</span>
    </div>
  );
}
