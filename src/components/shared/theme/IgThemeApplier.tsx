import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useIgTheme, useThemesAllowed } from "@/hooks/useIgTheme";
import { applyIgTheme, clearIgTheme } from "@/lib/theme/igThemes";

/**
 * Applies the device's theme to <html>. Mounted once, in SidebarScaffold, so it
 * covers every authenticated page and is gone on the public pages (login,
 * signup), which therefore always render in today's colours.
 */
export default function IgThemeApplier(): null {
  const { pathname } = useLocation();
  const allowed = useThemesAllowed();
  const { theme, tile } = useIgTheme();

  useEffect(() => {
    applyIgTheme(document.documentElement, { allowed, pathname, theme, tile });
  }, [allowed, pathname, theme, tile]);

  useEffect(() => () => clearIgTheme(document.documentElement), []);

  return null;
}
