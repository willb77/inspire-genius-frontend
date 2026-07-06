import type { JSX } from "react";
import { cn } from "@/lib/utils";

interface WelcomeHeroProps {
  firstName: string;
  tier?: string; // e.g. "Individual · Free tier"
}

/**
 * WelcomeHero — the editorial intro/hero at the top of the v2 user dashboard.
 *
 * Purely presentational: props in, no data hooks, no navigation. Introduces
 * Meridian as the user's single mentor, backed by a bench of specialists.
 */
export function WelcomeHero({ firstName, tier }: WelcomeHeroProps): JSX.Element {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-1",
            "bg-[#5B8A72]/10 text-[#3E6B55]",
            "text-[11px] font-semibold uppercase tracking-[0.14em]",
          )}
        >
          Welcome to Inspire Genius
        </span>
        {tier ? (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-1",
              "bg-[#0B1B33]/[0.04] text-[#4b5f80]",
              "text-[11px] font-semibold uppercase tracking-[0.08em]",
            )}
          >
            {tier}
          </span>
        ) : null}
      </div>

      <h1 className="font-serif text-[#0B1B33] text-4xl md:text-5xl leading-tight tracking-tight">
        Welcome, {firstName}
      </h1>

      <p className="max-w-2xl text-[15px] leading-relaxed text-[#4b5f80]">
        Meridian is your single mentor here — one voice, backed by a bench of
        specialists. Let&apos;s get your brain map started so everything you see
        next is tuned to how you&apos;re wired.
      </p>
    </section>
  );
}
