/**
 * IG themes — Phase A.
 *
 * The colours live in `src/styles/ig-themes.css` as `--ig-*` tokens whose
 * defaults equal today's hard-coded colours. This module decides WHICH theme
 * is applied to the document, and where.
 *
 * Three rules hold the blast radius down:
 *   1. Themes are offered only to an allowlist: super-admins, plus anyone who
 *      has opted this device into the preview (`ig_themes_preview=true`). A
 *      theme is cosmetic, so a client-side gate is enough — it guards no data.
 *   2. Palette themes apply only on THEMED_PATHS — the pages whose colours have
 *      been moved onto the tokens. An unconverted page keeps hard-coded colours
 *      that would clash with a dark background, so it stays Light.
 *   3. Values read back from storage are matched against fixed lists before
 *      they touch the DOM; nothing user-typed is written into a style.
 *
 * PRISM colours are canonical (`prism_canon.py`) and are never themed.
 */
import { ROLES } from "@/constants/routes";

export type IgThemeId =
  | "classic"
  | "dark"
  | "black"
  | "sepia"
  | "amber"
  | "contrast"
  | "gray"
  | "cvd"
  | "midnight"
  | "solarLight"
  | "solarDark"
  | "forest"
  | "dynamic";

/** classic = today's colours; palette = token swap; overlay = whole-page filter. */
export type IgThemeKind = "classic" | "palette" | "overlay";

export interface IgThemeDef {
  id: IgThemeId;
  label: string;
  kind: IgThemeKind;
  /** Two swatch colours for the picker: page background, then accent. */
  swatch: readonly [string, string];
}

export const IG_THEMES: readonly IgThemeDef[] = [
  { id: "classic", label: "Light", kind: "classic", swatch: ["#FBF7F0", "#C9711A"] },
  { id: "dark", label: "Dark", kind: "palette", swatch: ["#0F1115", "#F0A35E"] },
  { id: "black", label: "True Black", kind: "palette", swatch: ["#000000", "#F0A35E"] },
  { id: "sepia", label: "Sepia", kind: "palette", swatch: ["#F4ECD8", "#8A4B14"] },
  { id: "amber", label: "Night Light", kind: "overlay", swatch: ["#F3D9B1", "#C9711A"] },
  { id: "contrast", label: "High Contrast", kind: "palette", swatch: ["#000000", "#FFE600"] },
  { id: "gray", label: "Grayscale", kind: "overlay", swatch: ["#F3F4F6", "#6B7280"] },
  { id: "cvd", label: "Colour-blind safe", kind: "palette", swatch: ["#FBF7F0", "#0072B2"] },
  { id: "midnight", label: "Midnight", kind: "palette", swatch: ["#0B1426", "#F0A35E"] },
  { id: "solarLight", label: "Solarized Light", kind: "palette", swatch: ["#EEE8D5", "#A8400F"] },
  { id: "solarDark", label: "Solarized Dark", kind: "palette", swatch: ["#002B36", "#E58A54"] },
  { id: "forest", label: "Forest", kind: "palette", swatch: ["#EEF2EA", "#3F6B2E"] },
  { id: "dynamic", label: "Dynamic", kind: "palette", swatch: ["#FBF1E8", "#9A520F"] },
];

export const DEFAULT_IG_THEME: IgThemeId = "classic";

/** Tile (card) colours. "" = the theme's own card colour. */
export const IG_TILES: readonly { id: string; label: string }[] = [
  { id: "", label: "Auto" },
  { id: "#FFFFFF", label: "White" },
  { id: "#EEF2F7", label: "Mist" },
  { id: "#FEF3C7", label: "Butter" },
  { id: "#E0F2FE", label: "Sky" },
  { id: "#FCE7F3", label: "Blush" },
  { id: "#DCFCE7", label: "Mint" },
  { id: "#EDE9FE", label: "Lilac" },
  { id: "#1F2937", label: "Graphite" },
  { id: "#111111", label: "Ink" },
];

/** Routes whose page AND shell have been moved onto the --ig-* tokens. */
export const THEMED_PATHS: readonly string[] = ["/home"];

/** Device opt-in for the preview, alongside super-admin. */
export const THEMES_PREVIEW_KEY = "ig_themes_preview";

export function isIgThemeId(value: unknown): value is IgThemeId {
  return typeof value === "string" && IG_THEMES.some((t) => t.id === value);
}

export function isIgTile(value: unknown): value is string {
  return typeof value === "string" && IG_TILES.some((t) => t.id === value);
}

export function findIgTheme(id: IgThemeId): IgThemeDef {
  return IG_THEMES.find((t) => t.id === id) ?? IG_THEMES[0];
}

export function isThemedPath(pathname: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return THEMED_PATHS.includes(path);
}

/** The allowlist. Anything other than these two exact conditions is "no". */
export function themesAllowed(role: string | undefined | null, previewFlag: string | null): boolean {
  return role === ROLES.SUPER_ADMIN || previewFlag === "true";
}

function luminance(hex: string): number {
  const channel = (i: number): number => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

export interface IgTileTokens {
  bg: string;
  alt: string;
  ink: string;
  body: string;
  faint: string;
  accent: string;
  line: string;
}

/** Text colours for a tile, chosen by the tile's lightness so text stays readable. */
export function tileTokens(hex: string): IgTileTokens {
  const dark = luminance(hex) < 0.18;
  const ink = dark ? "#F9FAFB" : "#0B1B33";
  return {
    bg: hex,
    alt: `color-mix(in srgb, ${hex} ${dark ? 90 : 94}%, ${ink})`,
    ink,
    body: dark ? "#D1D5DB" : "#3D4E6B",
    faint: dark ? "#B6BDC9" : "#56647C",
    accent: dark ? "#F0A35E" : "#9A520F",
    line: `color-mix(in srgb, ${hex} ${dark ? 80 : 82}%, ${ink})`,
  };
}

const TILE_PROPS: readonly (keyof IgTileTokens)[] = ["bg", "alt", "ink", "body", "faint", "accent", "line"];

export function clearIgTheme(root: HTMLElement): void {
  delete root.dataset.igTheme;
  delete root.dataset.igOverlay;
  delete root.dataset.igTile;
  for (const p of TILE_PROPS) root.style.removeProperty(`--ig-tile-${p}`);
}

export interface ApplyIgThemeInput {
  allowed: boolean;
  pathname: string;
  theme: IgThemeId;
  tile: string;
}

/** Writes the theme onto `root` (the <html> element). Always clears first. */
export function applyIgTheme(root: HTMLElement, { allowed, pathname, theme, tile }: ApplyIgThemeInput): void {
  clearIgTheme(root);
  if (!allowed || !isIgThemeId(theme)) return;
  const def = findIgTheme(theme);
  if (def.kind === "overlay") root.dataset.igOverlay = def.id;
  if (!isThemedPath(pathname)) return;
  root.dataset.igTheme = def.kind === "palette" ? def.id : "classic";
  if (tile && isIgTile(tile)) {
    root.dataset.igTile = "1";
    const tokens = tileTokens(tile);
    for (const p of TILE_PROPS) root.style.setProperty(`--ig-tile-${p}`, tokens[p]);
  }
}
