import type { JSX } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface WelcomeTileProps {
  firstName: string;
}

/**
 * WelcomeTile — the v2 user-dashboard welcome hero rendered inside a card/tile.
 *
 * The reference wireframe hero is a full-bleed gradient block; here it is wrapped
 * in the standard white surface tile used across the v2 dashboard. Purely
 * presentational: props in, no data hooks, no navigation.
 */
export function WelcomeTile({ firstName }: WelcomeTileProps): JSX.Element {
  return (
    <section
      className={cn(
        "rounded-2xl border border-[rgba(11,27,51,0.10)] bg-white p-6 shadow-sm",
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-[#C9711A]" aria-hidden="true" />
        <span className="text-[12px] font-bold uppercase tracking-[0.09em] text-[#7C93B5]">
          Welcome to Inspire Genius
        </span>
      </div>

      <h1 className="mt-2 font-serif text-3xl leading-tight tracking-tight text-[#0B1B33]">
        Welcome, {firstName}
      </h1>

      <p className="mt-2.5 max-w-xl text-[15px] leading-relaxed text-[#4b5f80]">
        Meridian is your single mentor here — one voice, backed by a bench of
        specialists.
      </p>
    </section>
  );
}
