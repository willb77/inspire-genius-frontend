/** Summit surface — small presentational helpers (platform Tailwind tokens). */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PRISM } from "@/pages/summit/summitData";

export function PageHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <div className="mb-1">
      <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-[#0E5F6B]">{eyebrow}</div>
      <h1 className="font-serif text-[32px] leading-tight text-[#0B1B33]">{title}</h1>
      {sub && <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-[#13294B]/80">{sub}</p>}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-5", className)}>{children}</div>
  );
}

export function MiniLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11.5px] font-bold uppercase tracking-wider text-[#7C93B5]">{children}</div>
  );
}

export function CardH({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn("mb-2 mt-1 font-serif text-xl text-[#0B1B33]", className)}>{children}</h3>;
}

const CALLOUT_TONES = {
  brain: "bg-[#127A8A]/10 text-[#13294B]",
  info: "bg-[#1D3A66]/[0.07] text-[#13294B]",
  sage: "bg-[#5B8A72]/[0.12] text-[#13294B]",
} as const;

export function Callout({
  tone = "brain",
  icon,
  children,
}: {
  tone?: keyof typeof CALLOUT_TONES;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl px-4 py-3.5 text-[13.5px] leading-snug", CALLOUT_TONES[tone])}>
      {icon && <span className="mt-0.5 flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </div>
  );
}

export function PrismBars({ compact }: { compact?: boolean }) {
  return (
    <div className={cn("flex flex-col", compact ? "gap-1.5" : "gap-2.5")}>
      {PRISM.map((p) => (
        <div key={p.dim} className="flex items-center gap-3">
          <span className={cn("flex-shrink-0 font-semibold text-[#13294B]", compact ? "w-[104px] text-xs" : "w-[120px] text-[13px]")}>
            {p.dim}
          </span>
          <div className="h-[9px] flex-1 overflow-hidden rounded-full bg-[#F1ECE2]">
            <div className="h-full rounded-full" style={{ width: `${p.score}%`, background: p.hue }} />
          </div>
          <span className="w-6 text-right text-[12.5px] font-bold tabular-nums text-[#0B1B33]">{p.score}</span>
        </div>
      ))}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-[#5B8A72]/15 text-[#5B8A72]",
  progress: "bg-[#127A8A]/13 text-[#0E5F6B]",
  proposed: "bg-[#C88B1B]/15 text-[#A9720F]",
  explored: "bg-[#5B8A72]/15 text-[#5B8A72]",
  active: "bg-[#127A8A]/13 text-[#0E5F6B]",
  todo: "bg-[#F1ECE2] text-[#7C93B5]",
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide", STATUS_STYLES[status] ?? STATUS_STYLES.todo)}>
      {label}
    </span>
  );
}
