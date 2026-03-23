import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { ExportChatModalProps } from "@/types/chat";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parse, isValid } from "date-fns";

const getSecureRandomInt = (maxExclusive: number) => {
  if (maxExclusive <= 0) return 0;

  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== "function") return 0;

  const range = 0x100000000;
  const limit = range - (range % maxExclusive);
  const buffer = new Uint32Array(1);

  let value = 0;
  do {
    cryptoObj.getRandomValues(buffer);
    value = buffer[0] ?? 0;
  } while (value >= limit);

  return value % maxExclusive;
};

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
  // Display dates as: dd Mon yy (e.g., 05 Nov 25)
  const DISP_FMT = "dd LLL yy";
  const [fromStr, setFromStr] = useState<string>(format(thirtyDaysAgo, DISP_FMT));
  const [toStr, setToStr] = useState<string>(format(today, DISP_FMT));
  const [exportFormat, setExportFormat] = useState<"pdf" | "csv">("pdf");

  // Reset when opening/closing
  useEffect(() => {
    if (!open) {
      // Reset to initial state when closed
      setStep("form");
      setProgress(0);
      setFromStr(format(thirtyDaysAgo, DISP_FMT));
      setToStr(format(today, DISP_FMT));
      setExportFormat("pdf");
    }
  }, [open, thirtyDaysAgo, today]);

  // Simulate export when on progress step
  useEffect(() => {
    if (!open) return;
    if (step !== "progress") return;
    setProgress(0);
    const id = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + 5 + getSecureRandomInt(12));
        if (next >= 100) {
          clearInterval(id);
          setStep("complete");
        }
        return next;
      });
    }, 300);
    return () => clearInterval(id);
  }, [step, open]);

  const parseDisplayDate = (s: string): Date | null => {
    const patterns = ["dd LLL yy", "d LLL yyyy", "dd-MM-yyyy"] as const;
    for (const p of patterns) {
      const d = parse(s, p, new Date());
      if (isValid(d)) return d;
    }
    const naive = new Date(s);
    return isValid(naive) ? naive : null;
  };

  const handleExport = async () => {
    const fromDate = parseDisplayDate(fromStr);
    const toDate = parseDisplayDate(toStr);
    if (!fromDate || !toDate) return;
    if (fromDate > toDate) return;
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
      <DialogContent className="w-[min(520px,calc(100vw-2rem))] p-0 overflow-visible" showCloseButton={false}>
        {step === "form" && (
          <div className="p-6">
            <div className="mb-1 text-lg font-semibold">Export Chat</div>
            <div className="text-sm text-muted-foreground mb-5">Download a copy of your chat for future reference.</div>

            {/* From date (Onboarding-style DatePicker) */}
            <label className="block text-sm font-medium mb-1">Chat From</label>
            <div className="mb-3 w-full">
              <DatePicker
                value={fromStr}
                displayFormat={DISP_FMT}
                onChange={(v) => {
                  setFromStr(v);
                  const parsedFrom = (() => { const d = parse(v, DISP_FMT, new Date()); return isValid(d) ? d : null; })();
                  const parsedTo = (() => { const d = parse(toStr, DISP_FMT, new Date()); return isValid(d) ? d : null; })();
                  if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
                    setToStr(v);
                  }
                }}
                placeholder="From date"
                minDate={new Date(1900, 0, 1)}
                maxDate={(() => {
                  const parsedTo = parse(toStr, DISP_FMT, new Date());
                  return isValid(parsedTo) ? parsedTo : today;
                })()}
                className="w-full"
              />
            </div>

            {/* To date (Onboarding-style DatePicker) */}
            <label className="block text-sm font-medium mb-1">Chat Till</label>
            <div className="mb-3 w-full">
              <DatePicker
                value={toStr}
                displayFormat={DISP_FMT}
                onChange={(v) => setToStr(v)}
                placeholder="To date"
                minDate={(() => {
                  const parsedFrom = parse(fromStr, DISP_FMT, new Date());
                  return isValid(parsedFrom) ? parsedFrom : new Date(1900, 0, 1);
                })()}
                maxDate={today}
                className="w-full"
              />
            </div>

            {/* Export type */}
            <label className="block text-sm font-medium mb-1">Export File</label>
            <Select value={exportFormat} disabled>
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
