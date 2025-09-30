import { Button } from "@/components/ui/button";
import { CircleHelp, RefreshCcw } from "lucide-react";

export type UserCoachCardProps = {
  title: string;
  gender: string;
  accent: string;
  tone: string;
  extraCount?: number;
  onChat?: () => void;
};

export default function UserCoachCard({
  title,
  gender,
  accent,
  tone,
  extraCount = 0,
  onChat,
}: UserCoachCardProps) {
  return (
    <div className="bg-white rounded-2xl border shadow-[4px_4px_20px_4px_rgba(0,0,0,0.1)] p-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground rounded-full p-1"
          aria-label="Help"
        >
          <CircleHelp className="h-4 w-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <div className="text-muted-foreground mb-1">Gender</div>
          <div className="bg-gray-100 text-foreground rounded-xl px-3 py-2 font-medium">{gender}</div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Voice Accent</div>
          <div className="bg-gray-100 text-foreground rounded-xl px-3 py-2 font-medium">{accent}</div>
        </div>
        <div>
          <div className="text-muted-foreground mb-1">Voice Tone</div>
          <div className="bg-gray-100 text-foreground rounded-xl px-3 py-2 font-medium flex items-center gap-2">
            <span className="flex-1">{tone}</span>
            {extraCount > 0 ? (
              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg font-medium">
                {extraCount}+
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6">
        <Button
          className="h-11 w-full rounded-xl bg-blue-primary hover:bg-blue-primary/90 text-white"
          onClick={onChat}
          disabled={true}
        >
          Chat
          <RefreshCcw className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
