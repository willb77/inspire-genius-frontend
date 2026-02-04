import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import type { SimpleKind, UploadedFile, UploadDocumentsModalProps } from "@/types/documents";
import { useUploadDocuments } from "@/hooks/documents/useUploadDocuments";

// Category selection removed per requirement

function kindFromName(name: string): SimpleKind {
  const low = name.toLowerCase();
  if (low.endsWith(".pdf")) return "pdf";
  if (low.endsWith(".csv")) return "csv";
  if (low.endsWith(".ppt") || low.endsWith(".pptx")) return "ppt";
  return "doc";
}

export default function UploadDocumentsModal({ open, onOpenChange, onUploaded }: UploadDocumentsModalProps) {
  type Step = "form" | "progress" | "complete";
  const [step, setStep] = useState<Step>("form");
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<File[]>([]);
  const [progress, setProgress] = useState(0); // displayed progress
  const progressRef = useRef(0); // track latest progress to avoid stale closures
  const serverProgressRef = useRef(0); // raw progress from axios
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadMutation = useUploadDocuments();
  const smoothTimerRef = useRef<number | null>(null);
  const colorTimerRef = useRef<number | null>(null);
  const [colorIndex, setColorIndex] = useState(0);
  const finishTimerRef = useRef<number | null>(null);
  const finalMsgTimerRef = useRef<number | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [finalMsgIndex, setFinalMsgIndex] = useState(0);

  // Reset when closing
  useEffect(() => {
    if (!open) {
      setStep("form");
      setDragOver(false);
      setQueue([]);
      setProgress(0);
      serverProgressRef.current = 0;
      setUploadError(null);
      if (colorTimerRef.current) {
        window.clearInterval(colorTimerRef.current);
        colorTimerRef.current = null;
      }
      if (smoothTimerRef.current) {
        window.clearInterval(smoothTimerRef.current);
        smoothTimerRef.current = null;
      }
      if (finishTimerRef.current) {
        window.clearInterval(finishTimerRef.current);
        finishTimerRef.current = null;
      }
      if (finalMsgTimerRef.current) {
        window.clearInterval(finalMsgTimerRef.current);
        finalMsgTimerRef.current = null;
      }
      setFinishing(false);
      setFinalMsgIndex(0);
    }
  }, [open]);

  // Keep a live reference of progress for use inside async handlers
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Only require files queued
  const isReadyToUpload = queue.length > 0;

  const onPickFiles = () => inputRef.current?.click();

  const addFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    setQueue((prev) => [...prev, ...Array.from(files)]);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const onUpload = async () => {
    if (!isReadyToUpload) return;
    setStep("progress");
    setProgress(0);
    serverProgressRef.current = 0;
    setUploadError(null);
    try {
      await uploadMutation.mutateAsync({ files: queue, onProgress: (p) => { serverProgressRef.current = p; } });
      // Use the latest progress value at the moment of success
      const startP = Math.max(0, Math.min(100, progressRef.current));
      setFinishing(true);
      setFinalMsgIndex(0);
      if (smoothTimerRef.current) {
        window.clearInterval(smoothTimerRef.current);
        smoothTimerRef.current = null;
      }
      if (finalMsgTimerRef.current) {
        window.clearInterval(finalMsgTimerRef.current);
        finalMsgTimerRef.current = null;
      }
      finalMsgTimerRef.current = window.setInterval(() => {
        setFinalMsgIndex((i) => (i < 2 ? i + 1 : 2));
      }, 1000);
      const startTime = Date.now();
      if (finishTimerRef.current) {
        window.clearInterval(finishTimerRef.current);
        finishTimerRef.current = null;
      }
      finishTimerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(1, elapsed / 3000);
        const next = Math.round(startP + (100 - startP) * t);
        // Ensure monotonic increase (never go backward)
        setProgress((prev) => (next < prev ? prev : next));
        if (t >= 1) {
          if (finishTimerRef.current) {
            window.clearInterval(finishTimerRef.current);
            finishTimerRef.current = null;
          }
          if (finalMsgTimerRef.current) {
            window.clearInterval(finalMsgTimerRef.current);
            finalMsgTimerRef.current = null;
          }
          setFinishing(false);
          setStep("complete");
          const result: UploadedFile[] = queue.map((f) => ({
            name: f.name,
            url: URL.createObjectURL(f),
            kind: kindFromName(f.name),
          }));
          onUploaded?.(result, "");
        }
      }, 50);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to upload document";
      setUploadError(msg);
      // Stay on progress view and let user close explicitly
      setStep("progress");
      if (smoothTimerRef.current) {
        window.clearInterval(smoothTimerRef.current);
        smoothTimerRef.current = null;
      }
      if (finishTimerRef.current) {
        window.clearInterval(finishTimerRef.current);
        finishTimerRef.current = null;
      }
      if (finalMsgTimerRef.current) {
        window.clearInterval(finalMsgTimerRef.current);
        finalMsgTimerRef.current = null;
      }
      setFinishing(false);
    }
  };

  // Progress is now updated via axios onUploadProgress in the mutation
  // Smooth the displayed progress up to 90% while uploading; wait for success to jump to 100
  useEffect(() => {
    if (step !== "progress" || uploadError || finishing) {
      if (smoothTimerRef.current) {
        window.clearInterval(smoothTimerRef.current);
        smoothTimerRef.current = null;
      }
      return;
    }
    const tick = () => {
      setProgress((curr) => (curr < 97 ? curr + 1 : 97));
    };
    // ~180s to reach 97% => ~1850ms per 1%
    smoothTimerRef.current = window.setInterval(tick, 1850);
    return () => {
      if (smoothTimerRef.current) {
        window.clearInterval(smoothTimerRef.current);
        smoothTimerRef.current = null;
      }
    };
  }, [step, uploadError, finishing]);

  // Cycle text color near 90% for better feedback
  useEffect(() => {
    if (step === "progress" && !uploadError && progress >= 85 && progress < 100) {
      if (colorTimerRef.current) window.clearInterval(colorTimerRef.current);
      colorTimerRef.current = window.setInterval(() => {
        setColorIndex((i) => (i + 1) % 3);
      }, 400);
      return () => {
        if (colorTimerRef.current) {
          window.clearInterval(colorTimerRef.current);
          colorTimerRef.current = null;
        }
      };
    } else {
      if (colorTimerRef.current) {
        window.clearInterval(colorTimerRef.current);
        colorTimerRef.current = null;
      }
    }
  }, [step, uploadError, progress]);

  const handleOpenChange = (next: boolean) => {
    // Prevent closing while actively uploading (no error yet)
    if (step === "progress" && !uploadError && next === false) {
      return;
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[min(640px,calc(100vw-2rem))] max-h-[85vh] p-0" showCloseButton={false}>
        {step === "form" && (
          <div className="p-6 max-h-[75vh] overflow-y-auto">
            <div className="mb-1 text-xl font-semibold">Upload Documents</div>
            <div className="text-sm text-muted-foreground mb-5">Please upload a document for analysis.</div>

            {/* Category selection removed */}

            {/* Dropzone */}
            <div
              className={`mt-4 rounded-xl border-2 border-dashed ${dragOver ? "border-blue-400 bg-blue-50/40" : "border-gray-300"} p-6`}
              role="region"
              aria-label="Documents drop zone"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <div className="flex flex-col items-center justify-center text-center gap-3">
                <Upload className="size-8 text-blue-primary" />
                <div className="text-sm text-muted-foreground">
                  Drag & drop your files here
                </div>
                <div className="text-xs text-muted-foreground">OR</div>
                <Button type="button" className="h-9 bg-blue-primary hover:bg-blue-primary/90" onClick={onPickFiles}>
                  Browse files
                </Button>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                  accept=".pdf"
                />
              </div>
            </div>

            {/* Queue */}
            {queue.length > 0 && (
              <div className="mt-4 space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {queue.map((f, idx) => (
                  <div key={`${f.name}-${idx}`} className="flex items-center gap-3 rounded-xl border px-3 py-2">
                    <span className="inline-flex items-center justify-center size-6 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-600">
                      {kindFromName(f.name).toUpperCase()}
                    </span>
                    <div className="flex-1 text-sm truncate">{f.name}</div>
                    <button className="text-muted-foreground hover:text-foreground" onClick={() => setQueue((prev) => prev.filter((_, i) => i !== idx))}>
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <Button
                variant="secondary"
                className="h-10 rounded-lg bg-gray-100 hover:bg-gray-100 text-foreground"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!isReadyToUpload}
                className="h-10 rounded-lg bg-blue-primary hover:bg-blue-primary/90"
                onClick={onUpload}
              >
                Upload
                <Upload className="size-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === "progress" && (
          <div className="p-10 flex flex-col items-center text-center gap-5 relative">
            {uploadError ? (
              <button
                type="button"
                aria-label="Close"
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                onClick={() => onOpenChange(false)}
              >
                <X className="size-5" />
              </button>
            ) : null}
            <Upload className="size-7 text-blue-primary" />
            {uploadError ? (
              <div className="text-lg font-semibold text-red-600">Something went wrong</div>
            ) : (
              (() => {
                const nearing = ["text-blue-600", "text-amber-600", "text-violet-600"][colorIndex] || "";
                const msgs90 = ["Almost there...", "Finalizing...", "Wrapping up..."];
                const colors90 = ["text-green-600", "text-emerald-600", "text-lime-600"];
                const uploadLabel = queue.length > 1 ? "Uploading Documents" : "Uploading Document";
                const isNearing = progress >= 85 && progress < 90;
                const isFinalizing = finishing || (progress >= 90 && progress < 100);
                const progressTextClass = isFinalizing
                  ? `${colors90[colorIndex] || "text-green-600"} animate-pulse`
                  : isNearing
                  ? nearing
                  : "";
                const text = isFinalizing
                  ? `${(finishing ? msgs90[finalMsgIndex] : (msgs90[colorIndex] || msgs90[0]))} ${progress}%`
                  : `${uploadLabel}.... ${progress}%`;
                return (
                  <div
                    className={"text-lg font-medium " + progressTextClass}
                    aria-busy={step === "progress" && !uploadError}
                  >
                    {text}
                  </div>
                );
              })()
            )}
            {uploadError ? (
              <div className="text-sm text-muted-foreground">The uploaded document may not be in a supported format or is too large. Please check the file and try again.</div>
            ) : (
              <div className="text-sm text-muted-foreground">This might take a few seconds. Please don't close this window while uploading.</div>
            )}
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${uploadError ? "bg-red-500" : "bg-blue-primary"} transition-[width] duration-300`}
                style={{ width: `${progress}%` }}
              />
            </div>
            {uploadError ? (
              <div className="w-full text-left">
                <p className="text-sm text-red-600">{uploadError}</p>
              </div>
            ) : null}
            {!uploadError ? (
              <Button variant="secondary" className="bg-gray-100 hover:bg-gray-100 text-foreground w-full" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
            ) : null}
          </div>
        )}

        {step === "complete" && (
          <div className="p-10 flex flex-col items-center text-center gap-5">
            <Upload className="size-7 text-blue-primary" />
            <div className="text-lg font-semibold">Document Uploaded</div>
            <div className="text-sm text-muted-foreground">Document Uploaded successfully!</div>
            <Button variant="secondary" className="bg-gray-100 hover:bg-gray-100 text-foreground w-full" onClick={() => onOpenChange(false)}>
              Back
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
