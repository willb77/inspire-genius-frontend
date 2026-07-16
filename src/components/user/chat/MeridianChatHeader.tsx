import { ArrowLeft, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type MeridianChatHeaderProps = {
  isConnected: boolean;
  currentAgent?: string | null;
  currentDomain?: string | null;
  onBack?: () => void;
};

export default function MeridianChatHeader({
  isConnected,
  currentAgent: _currentAgent,
  currentDomain,
  onBack,
}: MeridianChatHeaderProps) {
  const { t } = useTranslation("chat");
  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="h-6 w-6 text-violet-500" />
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                isConnected ? "bg-green-500" : "bg-gray-400",
              )}
            />
          </div>
          <div>
            <h2 className="text-sm font-semibold">{t("header.title", { defaultValue: "Meridian" })}</h2>
            <p className="text-xs text-muted-foreground">
              {t("header.subtitle", { defaultValue: "Powered by Agent Eco-System" })}
            </p>
          </div>
        </div>
      </div>
      {currentDomain && (
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-xs font-medium",
            currentDomain === "coaching" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
            currentDomain === "business" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
            currentDomain === "system" && "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
            currentDomain === "career_talent" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
          )}
        >
          {currentDomain.replace("_", " ")}
        </span>
      )}
    </div>
  );
}
