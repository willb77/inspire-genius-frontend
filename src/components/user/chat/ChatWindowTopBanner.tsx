import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type ChatWindowTab = "chat" | "documents";

type StatusBanner = {
  type: "success" | "error" | "info";
  text: string;
};

type ChatWindowTopBannerProps = {
  selectedDocNames?: string[];
  selectedSummary: string;
  selectedTooltip: string;
  isConnecting?: boolean;
  statusBanner?: StatusBanner;
  activeTab: ChatWindowTab;
  selectDocsLottieSrc: string;
};

export default function ChatWindowTopBanner({
  selectedDocNames,
  selectedSummary,
  selectedTooltip,
  isConnecting,
  statusBanner,
  activeTab,
  selectDocsLottieSrc,
}: ChatWindowTopBannerProps) {
  const { t } = useTranslation("chat");
  if (selectedDocNames && selectedDocNames.length) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="min-h-10 w-full mb-3 inline-flex items-start gap-1 text-xs bg-blue-50 text-blue-900 border border-blue-200 rounded-md px-2 py-1">
            <span>{t("banner.selected", { defaultValue: "Selected:" })}</span>
            <span className="font-semibold">{selectedSummary}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>{selectedTooltip}</TooltipContent>
      </Tooltip>
    );
  }

  if (isConnecting) {
    return <div className="text-xs text-blue-600">{t("banner.connecting", { defaultValue: "Connecting..." })}</div>;
  }

  if (statusBanner && activeTab === "chat") {
    let statusClass = "text-gray-600";
    if (statusBanner.type === "success") statusClass = "text-green-600";
    else if (statusBanner.type === "error") statusClass = "text-red-600";

    return (
      <div
        className={cn(
          "flex justify-center items-center gap-2 text-xs font-medium",
          statusClass
        )}
      >
        {statusBanner.text}
        {statusBanner.type === "success" && (
          <div className="w-fit">
            <iframe
              src={selectDocsLottieSrc}
              title={t("banner.successAnimationTitle", { defaultValue: "Success animation" })}
              className="h-24 w-24"
              allow="autoplay"
            />
          </div>
        )}
      </div>
    );
  }

  return null;
}
