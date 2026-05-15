import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MultiAgentIndicatorProps {
  contributingAgents: string[];
  synthesized: boolean;
  className?: string;
}

/**
 * Session-level pill indicating Meridian synthesized a response from
 * multiple contributing agents. Renders nothing unless synthesized AND
 * 2+ agents contributed. Distinct from per-message CollaborationBadge.
 */
export function MultiAgentIndicator({
  contributingAgents,
  synthesized,
  className,
}: MultiAgentIndicatorProps) {
  if (!synthesized || !contributingAgents || contributingAgents.length < 2) {
    return null;
  }

  const agentList = contributingAgents.join(", ");
  const tooltipText = `Collaborative response from ${agentList}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="status"
          aria-label={tooltipText}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border border-violet-200/60 bg-violet-50 px-2.5 py-1 text-[11px] font-medium text-violet-700 shadow-sm",
            "dark:border-violet-800/40 dark:bg-violet-950/40 dark:text-violet-300",
            "animate-in fade-in-50 slide-in-from-top-1 duration-300",
            "transition-colors hover:bg-violet-100 dark:hover:bg-violet-900/50",
            className,
          )}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-500" />
          </span>
          <Sparkles className="h-3 w-3" />
          <span>Multi-Agent &middot; {contributingAgents.length} agents</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  );
}
