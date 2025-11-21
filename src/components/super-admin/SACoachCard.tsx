import { Button } from "@/components/ui/button";
import { RefreshCcw, Loader2 } from "lucide-react";

export type SACoachCardProps = {
  title: string;
  categoryName?: string;
  isActive: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  onToggle: () => void;
};

export default function SACoachCard({ title, categoryName, isActive, isLoading, disabled, onToggle }: SACoachCardProps) {
  return (
    <div className="bg-white rounded-2xl border shadow-[4px_4px_20px_4px_rgba(0,0,0,0.1)] p-5">
      <div className="flex items-start justify-between">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      </div>

      {categoryName ? (
        <div className="mt-3 text-sm">
          <div className="text-muted-foreground mb-1">Category</div>
          <div className="bg-gray-100 text-foreground rounded-xl px-3 py-2 font-medium">{categoryName}</div>
        </div>
      ) : null}

      <div className="mt-6">
        <Button
          className="h-11 w-full rounded-xl bg-blue-primary hover:bg-blue-primary/90 text-white"
          onClick={onToggle}
          disabled={!!isLoading || !!disabled}
        >
          {isActive ? "Disable" : "Enable"}
          {isLoading ? (
            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4 ml-2" />
          )}
        </Button>
      </div>
    </div>
  );
}
