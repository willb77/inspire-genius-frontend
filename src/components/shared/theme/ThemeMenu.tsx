import { Palette } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIgTheme } from "@/hooks/useIgTheme";
import { cn } from "@/lib/utils";
import { IG_THEMES, IG_TILES, findIgTheme, isThemedPath } from "@/lib/theme/igThemes";

/**
 * The Theme picker in the top header. Rendered only for the Phase A allowlist
 * (UserTopHeader checks `useThemesAllowed`).
 */
export default function ThemeMenu() {
  const { pathname } = useLocation();
  const { theme, tile, setTheme, setTile } = useIgTheme();
  const current = findIgTheme(theme);
  const themedHere = isThemedPath(pathname);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Theme: ${current.label}`}
          data-testid="ig-theme-menu-trigger"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-ig-icon-muted hover:bg-ig-icon-hover md:h-9 md:w-9"
        >
          <Palette className="h-[18px] w-[18px]" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4" data-testid="ig-theme-menu">
        <p className="text-sm font-semibold">Appearance</p>
        {!themedHere && (
          <p className="mt-1 text-xs text-muted-foreground" data-testid="ig-theme-scope-note">
            Colour themes show on Home for now. Night Light and Grayscale work on every page.
          </p>
        )}

        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground" id="ig-theme-label">
          Theme
        </p>
        <div role="radiogroup" aria-labelledby="ig-theme-label" className="mt-2 grid grid-cols-2 gap-2">
          {IG_THEMES.map((t) => {
            const selected = t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTheme(t.id)}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-lg border px-2 text-left text-[13px] font-medium",
                  selected ? "border-2 border-foreground" : "border-border hover:bg-accent",
                )}
              >
                <span aria-hidden className="flex h-5 w-7 shrink-0 overflow-hidden rounded border border-black/20">
                  <span className="flex-1" style={{ background: t.swatch[0] }} />
                  <span className="flex-1" style={{ background: t.swatch[1] }} />
                </span>
                {t.label}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground" id="ig-tile-label">
          Tile colour
        </p>
        <div role="radiogroup" aria-labelledby="ig-tile-label" className="mt-2 flex flex-wrap gap-2">
          {IG_TILES.map((t) => {
            const selected = t.id === tile;
            return (
              <button
                key={t.label}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`Tile colour: ${t.label}`}
                title={t.label}
                onClick={() => setTile(t.id)}
                className={cn(
                  "h-11 min-w-11 rounded-lg border text-xs font-semibold",
                  t.id ? "" : "px-3",
                  selected ? "border-2 border-foreground" : "border-border",
                )}
                style={t.id ? { background: t.id } : undefined}
              >
                {t.id ? null : "Auto"}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
