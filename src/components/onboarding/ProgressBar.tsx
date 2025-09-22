import type { CSSProperties } from "react";

export interface ProgressBarProps {
  current: number; // current step (1-indexed)
  total: number;   // total steps
  className?: string;
}

export default function ProgressBar({ current, total, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (current / total) * 100));

  const style: CSSProperties = {
    width: pct + "%",
  };

  return (
    <div className={"w-full flex items-center gap-2 " + (className ?? "")}> 
      <div className="relative h-[3px] w-full bg-gray-200 rounded">
        <div className="absolute left-0 top-0 h-[3px] bg-[#3158D0] rounded" style={style} />
      </div>
      <div className="text-xs text-muted-foreground shrink-0">
        {current}/{total}
      </div>
    </div>
  );
}
