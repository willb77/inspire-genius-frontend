import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fileUrl: string;
  fileName?: string;
  onDownload?: () => void;
};

export default function DocumentIframeModal({ open, onOpenChange, fileUrl, fileName = "Document" }: Props) {
  const [loading, setLoading] = useState<boolean>(true);
  const displayName = useMemo(() => {
    const name = String(fileName || "");
    return name.length > 40 ? `${name.slice(0, 40)}…` : name;
  }, [fileName]);

  useEffect(() => {
    if (open) setLoading(true);
  }, [fileUrl, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[70vw] !max-w-7xl h-[92vh] p-0 overflow-hidden" showCloseButton={false}>
        <div className="flex items-center justify-between border h-fit pl-4 pr-10 py-3 bg-white">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="font-semibold truncate mr-2">{displayName}</div>
            </TooltipTrigger>
            {fileName && fileName.length > 40 ? (
              <TooltipContent sideOffset={6}>{fileName}</TooltipContent>
            ) : null}
          </Tooltip>
          <div className="flex items-center gap-2">
            <button aria-label="Close" className="p-1 rounded-md hover:bg-gray-100" onClick={() => onOpenChange(false)}>
              <X className="size-5" />
            </button>
          </div>
        </div>
        <div className="h-screen relative">
          {loading && (
            <div className="absolute inset-0 grid place-items-center bg-white/80 z-10">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                <span>Loading document…</span>
              </div>
            </div>
          )}
          <iframe
            src={fileUrl}
            title={fileName}
            className="w-full h-full bg-white"
            style={{ border: "none" }}
            onLoad={() => setLoading(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
