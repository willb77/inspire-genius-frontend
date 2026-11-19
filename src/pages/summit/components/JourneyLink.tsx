/**
 * "My journey" — the way from Goals Studio into the Direction Setting journey
 * (Direction Setting merge, reading B1).
 *
 * Direction Setting stays where it is: an entitlement-gated vertical at
 * /vertical/direction-setting, with its stages, its gate and its API untouched.
 * This is only a door from Goals Studio, so a person who has the journey does
 * not have to know a second place exists. Stage 5 of that journey is already a
 * door the other way (it sends the person to My Goals).
 *
 * It renders NOTHING unless the server says the person holds the
 * `direction-setting` entitlement. Loading, an error and "not entitled" all
 * read as hidden: a visibility gate must fail closed, because Goals Studio is
 * open to every role and the journey is not. This is a visibility control only
 * — the vertical's own `VerticalShell` still decides who can enter it.
 */
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Route as RouteIcon } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { useVerticalAccess } from "@/verticals/core";

export default function JourneyLink() {
  const { t } = useTranslation("summitPages");
  const { hasAccess, isLoading } = useVerticalAccess("direction-setting");

  if (isLoading || !hasAccess) return null;

  return (
    <Link
      to={ROUTES.DIRECTION_SETTING.JOURNEY}
      data-testid="goals-journey-link"
      className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
    >
      <RouteIcon className="h-4 w-4" aria-hidden />
      {t("layout.journey", { defaultValue: "My journey" })}
    </Link>
  );
}
