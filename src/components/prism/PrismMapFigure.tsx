import { useMemo, useState } from "react";

import type { PrismMap } from "@/types/chat/data-types";

/**
 * Renders the PRISM Brain Map that accompanies a turn reporting the user's
 * own scores.
 *
 * The SVG is rendered through a **data-URI `<img>`**, not
 * `dangerouslySetInnerHTML`. The markup is generated server-side and is
 * asserted script-free by tests, but an `<img>` cannot execute script under
 * any circumstance, so a future change to the generator (or a compromised
 * response) cannot turn this into an injection point. It also embeds cleanly
 * in the Word/PDF/print export path, which is plain HTML.
 *
 * `encodeURIComponent` rather than `btoa`: the map contains non-Latin1
 * characters (↔, ·) that would make `btoa` throw.
 */
export default function PrismMapFigure({ map }: { map: PrismMap }) {
  const [showTable, setShowTable] = useState(false);

  const src = useMemo(() => {
    if (!map?.svg) return "";
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(map.svg)}`;
  }, [map?.svg]);

  if (!src) return null;

  return (
    <figure className="my-3" data-testid="prism-map-figure">
      <img
        src={src}
        // The full numeric read-out, so a screen reader gets the data rather
        // than "image".
        alt={map.description}
        className="w-full max-w-2xl rounded-lg border border-slate-200"
        loading="lazy"
      />
      <figcaption className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <span>PRISM Brain Map</span>
        {map.assessed_at ? (
          <span>· assessed {String(map.assessed_at).slice(0, 10)}</span>
        ) : null}
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="underline underline-offset-2 hover:text-foreground"
          data-testid="prism-map-toggle-table"
        >
          {showTable ? "Hide the numbers" : "Show the numbers"}
        </button>
      </figcaption>
      {showTable ? (
        <pre
          className="mt-2 overflow-x-auto rounded-md bg-slate-50 p-3 text-xs leading-relaxed"
          data-testid="prism-map-table"
        >
          {map.table}
        </pre>
      ) : null}
    </figure>
  );
}
