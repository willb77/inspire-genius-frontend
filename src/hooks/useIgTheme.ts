import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/context/useAuth";
import { themesAllowed, type IgThemeId } from "@/lib/theme/igThemes";
import {
  getThemeChoice,
  readThemesPreviewFlag,
  reloadThemeChoice,
  setThemeChoice,
  subscribeThemeChoice,
  THEME_KEY,
  TILE_KEY,
} from "@/lib/theme/themeStore";

export interface UseIgTheme {
  theme: IgThemeId;
  tile: string;
  setTheme: (theme: IgThemeId) => void;
  setTile: (tile: string) => void;
}

/** The device's theme choice, shared by every caller. */
export function useIgTheme(): UseIgTheme {
  const choice = useSyncExternalStore(subscribeThemeChoice, getThemeChoice, getThemeChoice);
  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === THEME_KEY || e.key === TILE_KEY) reloadThemeChoice();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return {
    theme: choice.theme,
    tile: choice.tile,
    setTheme: (theme) => setThemeChoice({ theme }),
    setTile: (tile) => setThemeChoice({ tile }),
  };
}

/** Whether this user may use themes at all (the Phase A allowlist). */
export function useThemesAllowed(): boolean {
  const { user } = useAuth();
  return themesAllowed(user?.role as string | undefined, readThemesPreviewFlag());
}
