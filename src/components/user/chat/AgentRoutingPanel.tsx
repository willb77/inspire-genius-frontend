import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, Zap, Clock, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/useAuth";

type AgentRoutingPanelProps = {
  domain?: string | null;
  agentName?: string | null;
  confidence?: number | null;
  latencyMs?: number | null;
  tokenCount?: number | null;
  observability?: Record<string, unknown> | null;
};

export default function AgentRoutingPanel({
  domain,
  agentName,
  confidence,
  latencyMs,
  tokenCount,
  observability,
}: AgentRoutingPanelProps) {
  const { t } = useTranslation("chat");
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "company-admin" || user?.role === "super-admin";
  const isSuperAdmin = user?.role === "super-admin";

  if (!domain && !agentName) return null;

  return (
    <div className="border-b bg-muted/30 px-4 py-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground"
      >
        <div className="flex items-center gap-2">
          {domain && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                domain === "coaching" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                domain === "business" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                domain === "system" && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
                domain === "career_talent" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
              )}
            >
              {domain.replace("_", " ")}
            </span>
          )}
          {agentName && (
            <span className="font-medium">{agentName}</span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="mt-1.5 flex flex-wrap gap-3 pb-1 text-[11px] text-muted-foreground">
          {isAdmin && confidence != null && (
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" /> {t("routing.confidence", { defaultValue: "Confidence: {{confidencePct}}%", confidencePct: (confidence * 100).toFixed(0) })}
            </span>
          )}
          {isAdmin && latencyMs != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {t("routing.latency", { defaultValue: "{{latencyMs}}ms", latencyMs })}
            </span>
          )}
          {isAdmin && tokenCount != null && (
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" /> {t("routing.tokens", { defaultValue: "{{tokenCount}} tokens", tokenCount })}
            </span>
          )}
          {isSuperAdmin && observability && Object.keys(observability).length > 0 && (
            <details className="w-full">
              <summary className="cursor-pointer text-[10px]">{t("routing.observabilityDetails", { defaultValue: "Observability details" })}</summary>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-[10px]">
                {JSON.stringify(observability, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
