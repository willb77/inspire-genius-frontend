/**
 * Per-device theme choice (D2: device first; per-account is a later change).
 *
 * A tiny external store so every `useIgTheme()` caller — the picker and the
 * applier — sees the same value without a new Context. Reads are validated
 * against the fixed lists in igThemes.ts, so a hand-edited localStorage value
 * falls back to the default instead of reaching the DOM.
 */
import { DEFAULT_IG_THEME, isIgThemeId, isIgTile, THEMES_PREVIEW_KEY, type IgThemeId } from "./igThemes";

export const THEME_KEY = "ig_theme";
export const TILE_KEY = "ig_tile";

export interface IgThemeChoice {
  theme: IgThemeId;
  tile: string;
}

function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode / blocked storage — the choice lasts for this page view */
  }
}

function read(): IgThemeChoice {
  const theme = readKey(THEME_KEY);
  const tile = readKey(TILE_KEY);
  return {
    theme: isIgThemeId(theme) ? theme : DEFAULT_IG_THEME,
    tile: isIgTile(tile) ? tile : "",
  };
}

let snapshot: IgThemeChoice = read();
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

export function getThemeChoice(): IgThemeChoice {
  return snapshot;
}

export function subscribeThemeChoice(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setThemeChoice(next: Partial<IgThemeChoice>): void {
  const theme = next.theme !== undefined && isIgThemeId(next.theme) ? next.theme : snapshot.theme;
  const tile = next.tile !== undefined && isIgTile(next.tile) ? next.tile : snapshot.tile;
  if (theme === snapshot.theme && tile === snapshot.tile) return;
  snapshot = { theme, tile };
  writeKey(THEME_KEY, theme);
  writeKey(TILE_KEY, tile);
  emit();
}

/** Re-read storage (another tab changed it, or a test reset it). */
export function reloadThemeChoice(): void {
  snapshot = read();
  emit();
}

export function readThemesPreviewFlag(): string | null {
  return readKey(THEMES_PREVIEW_KEY);
}
