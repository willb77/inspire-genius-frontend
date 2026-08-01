/**
 * Team Development Studio — design-system skin (Wave 2 of the HomeV2 CSS
 * migration).
 *
 * The Studio ships in two looks: the original ("classic") slate/shadcn palette,
 * and the new ("v2") HomeV2 editorial look (cream `bg-panel`, navy `text-ink`,
 * orange `accent-orange`, serif headings, `rounded-2xl` hairline cards). Which
 * one renders is decided ONCE, at the page root, from the `new_user_surfaces`
 * flag (or an explicit `variant`), and flows to every child through context.
 *
 * ── Why this shape (coverage-safety) ────────────────────────────────────────
 * The FE CI coverage gate is tight on *branches*. If each component picked its
 * classes with an inline `v2 ? "a" : "b"` ternary, every widget would add
 * uncovered branches (the v2 arm never runs under the default-OFF test flag).
 * Instead ALL branching lives here: two FLAT literal skins (`CLASSIC`, `V2`)
 * and a single selector (`getDevSkin`). Components read PRE-RESOLVED class
 * strings (`sk.text900`, `sk.brandHex`, …) with no conditional of their own, so
 * they add zero branches. The v2 literal is exercised by `skin.test.tsx`.
 *
 * Classic values are byte-identical to the pre-Wave-2 literals, so the classic
 * surface (and every existing test) is unchanged. Semantic colours (emerald /
 * amber / destructive / PRISM quadrant colours) are NOT part of the skin — they
 * stay hardcoded in the components on both looks.
 *
 * RTL/i18n: tokens are colour/typography only; no physical-direction utilities.
 */
import { createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { V2Panel } from "@/components/v2";
import { isNewUserSurfacesEnabled } from "@/lib/surfaceFlags";

export type DevVariant = "classic" | "v2";

export interface DevSkin {
  /** True on the HomeV2 look. Only structural wrappers (page frame) read this;
   *  leaf components must consume the resolved class strings, never this flag. */
  v2: boolean;

  // ── Text (per slate shade → token, so classic stays byte-identical) ────────
  /** Large page/section title. v2 turns it serif + navy ink. */
  heading: string;
  text900: string;
  text800: string;
  text700: string;
  text600: string;
  text500: string;
  text400: string;

  // ── Borders / surfaces ─────────────────────────────────────────────────────
  border200: string;
  border100: string;
  border300: string;
  bgMuted50: string;
  bgMuted100: string;
  radius: string;

  // ── Brand accents ──────────────────────────────────────────────────────────
  /** Full focus-visible outline colour utility (incl. the `focus-visible:` prefix). */
  focusRing: string;
  accentText: string;
  avatarGradient: string;
  /** Solid brand fill — active tab / selected pill. */
  accentBg: string;
  /** 10% brand tint. */
  accentBgSoft: string;
  /** 5% brand tint. */
  accentBgFaint: string;
  /** Solid brand border. */
  accentBorder: string;
  /** 40% brand border — selected card outline. */
  accentBorderSoft: string;
  /** Brand border on hover (incl. the `hover:` prefix). */
  accentBorderHover: string;
  /** Brand border on focus (incl. the `focus:` prefix). */
  accentBorderFocus: string;

  // ── Raw hex (for SVG stroke / recharts / inline style, which can't take a
  //    Tailwind class) ───────────────────────────────────────────────────────
  brandHex: string;
  trackHex: string;
}

const CLASSIC: DevSkin = {
  v2: false,
  heading: "text-slate-900",
  text900: "text-slate-900",
  text800: "text-slate-800",
  text700: "text-slate-700",
  text600: "text-slate-600",
  text500: "text-slate-500",
  text400: "text-slate-400",
  border200: "border-slate-200",
  border100: "border-slate-100",
  border300: "border-slate-300",
  bgMuted50: "bg-slate-50",
  bgMuted100: "bg-slate-100",
  radius: "rounded-xl",
  focusRing: "focus-visible:outline-[#3B5BFF]",
  accentText: "text-[#3B5BFF]",
  avatarGradient: "from-[#3B5BFF] to-[#2DD4BF]",
  accentBg: "bg-[#3B5BFF]",
  accentBgSoft: "bg-[#3B5BFF]/10",
  accentBgFaint: "bg-[#3B5BFF]/5",
  accentBorder: "border-[#3B5BFF]",
  accentBorderSoft: "border-[#3B5BFF]/40",
  accentBorderHover: "hover:border-[#3B5BFF]",
  accentBorderFocus: "focus:border-[#3B5BFF]",
  brandHex: "#3B5BFF",
  trackHex: "#e5e7eb",
};

const V2: DevSkin = {
  v2: true,
  heading: "font-serif text-ink",
  text900: "text-ink",
  text800: "text-ink",
  text700: "text-ink",
  text600: "text-body-slate",
  text500: "text-body-slate",
  text400: "text-mute",
  border200: "border-hairline",
  border100: "border-hairline",
  border300: "border-hairline",
  bgMuted50: "bg-panel",
  bgMuted100: "bg-panel",
  radius: "rounded-2xl",
  focusRing: "focus-visible:outline-accent-orange",
  accentText: "text-accent-orange-dark",
  avatarGradient: "from-ink to-accent-orange",
  accentBg: "bg-accent-orange",
  accentBgSoft: "bg-accent-orange/10",
  accentBgFaint: "bg-accent-orange/5",
  accentBorder: "border-accent-orange",
  accentBorderSoft: "border-accent-orange/40",
  accentBorderHover: "hover:border-accent-orange",
  accentBorderFocus: "focus:border-accent-orange",
  brandHex: "#E8932B",
  trackHex: "#E7DECF",
};

/** Pick a skin. The single branch that decides classic vs v2 for the whole Studio. */
export function getDevSkin(v2: boolean): DevSkin {
  return v2 ? V2 : CLASSIC;
}

/** Resolve the effective variant: an explicit prop wins; otherwise the flag. */
export function resolveDevV2(variant?: DevVariant): boolean {
  if (variant) return variant === "v2";
  return isNewUserSurfacesEnabled();
}

const DevSkinContext = createContext<DevSkin>(CLASSIC);

/** Provide the resolved skin to the Studio subtree. Set once at the page root. */
export function DevSkinProvider({
  v2,
  children,
}: {
  v2: boolean;
  children: ReactNode;
}) {
  return (
    <DevSkinContext.Provider value={getDevSkin(v2)}>
      {children}
    </DevSkinContext.Provider>
  );
}

/**
 * Read the active skin. Defaults to CLASSIC when no provider is present, so
 * standalone component tests (and the classic surface) render unchanged.
 */
export function useDevSkin(): DevSkin {
  return useContext(DevSkinContext);
}

/**
 * The Studio page frame. On v2 it's the cream `V2Panel`; on classic it's the
 * original bare `space-y-6` column. This is the ONE place a structural v2/classic
 * branch lives outside a leaf — covered by skin.test.tsx.
 */
export function DevPageFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const sk = useDevSkin();
  if (sk.v2) {
    return <V2Panel className={cn("space-y-6", className)}>{children}</V2Panel>;
  }
  return <div className={cn("space-y-6", className)}>{children}</div>;
}
