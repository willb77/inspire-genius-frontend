import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { ExportChatModalProps } from "@/types/chat";
import DatePickerButton from "@/components/shared/DatePickerButton";

export default function ExportChatModal({ open, onOpenChange, onExport, disableExport =false }: ExportChatModalProps) {
  type Step = "form" | "progress" | "complete";
  const [step, setStep] = useState<Step>("form");
  const [progress, setProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form fields
  const today = useMemo(() => new Date(), []);
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);
  const [fromDate, setFromDate] = useState<Date>(thirtyDaysAgo);
  const [toDate, setToDate] = useState<Date>(today);
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");

  // Reset when opening/closing
  useEffect(() => {
    if (!open) {
      // Reset to initial state when closed
      setStep("form");
      setProgress(0);
      setFromDate(thirtyDaysAgo);
      setToDate(today);
      setFormat("pdf");
    }
  }, [open, thirtyDaysAgo, today]);

  // Simulate export when on progress step
  useEffect(() => {
    if (!open) return;
    if (step !== "progress") return;
    setProgress(0);
    const id = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + Math.floor(5 + Math.random() * 12));
        if (next >= 100) {
          clearInterval(id);
          setStep("complete");
        }
        return next;
      });
    }, 300);
    return () => clearInterval(id);
  }, [step, open]);

  const handleExport = async () => {
    if (!fromDate || !toDate) return;
    // Call parent export; format is fixed to pdf visually and disabled
    try {
      setIsSubmitting(true);
      await onExport?.(fromDate, toDate);
    } finally {
      setIsSubmitting(false);
      onOpenChange(false);
    }
  };

  const onCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(520px,calc(100vw-2rem))] p-0 overflow-hidden" showCloseButton={false}>
        {step === "form" && (
          <div className="p-6">
            <div className="mb-1 text-lg font-semibold">Export Chat</div>
            <div className="text-sm text-muted-foreground mb-5">Download a copy of your chat for future reference.</div>

            {/* From date */}
            <label className="block text-sm font-medium mb-1">Chat From</label>
            <div className="mb-3">
              <DatePickerButton
                date={fromDate}
                onSelect={(d) => {
                  if (!d) return;
                  setFromDate(d);
                  if (toDate && d > toDate) setToDate(d);
                }}
                disabled={(date) => (toDate ? date > toDate : false)}
                buttonClassName="w-full"
              />
            </div>

            {/* To date */}
            <label className="block text-sm font-medium mb-1">Chat Till</label>
            <div className="mb-3">
              <DatePickerButton
                date={toDate}
                onSelect={(d) => d && setToDate(d)}
                disabled={(date) => (fromDate ? date < fromDate : false)}
                buttonClassName="w-full"
              />
            </div>

            {/* Export type */}
            <label className="block text-sm font-medium mb-1">Export File</label>
            <Select value={format} disabled>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="PDF" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 mt-6">
              <Button variant="secondary" className="bg-gray-100 hover:bg-gray-100 text-foreground" onClick={onCancel}>
                Cancel
              </Button>
              <Button className="bg-blue-primary hover:bg-blue-primary/90" onClick={handleExport} disabled={isSubmitting || disableExport}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" /> Exporting
                  </>
                ) : (
                  "Export"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "progress" && (
          <div className="p-6">
            <div className="flex flex-col items-center text-center gap-5">
              <Loader2 className="size-10 text-blue-primary animate-spin" />
              <div className="text-lg font-medium">Exporting Chat... {progress}%</div>
              <div className="text-sm text-muted-foreground">Sit back and relax, we're working on your export.</div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-primary transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="w-full flex justify-center">
                <Button variant="secondary" className="bg-gray-100 hover:bg-gray-100 text-foreground" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "complete" && (
          <div className="p-6">
            <div className="flex flex-col items-center text-center gap-5">
              <CheckCircle2 className="size-10 text-green-600" />
              <div className="text-lg font-semibold">Export Complete</div>
              <div className="text-sm text-muted-foreground">Chat exported successfully!</div>
              <div className="w-full flex justify-center">
                <Button variant="secondary" className="bg-gray-100 hover:bg-gray-100 text-foreground" onClick={() => onOpenChange(false)}>
                  Back
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
