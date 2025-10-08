import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, X } from "lucide-react";
import type { SimpleKind, UploadedFile, UploadDocumentsModalProps } from "@/types/mydocuments-types";

const CATEGORIES = [
  { label: "Resume", value: "resume" },
  { label: "Offer Letter", value: "offer" },
  { label: "Certificates", value: "cert" },
  { label: "Other", value: "other" },
] as const;

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
  const [category, setCategory] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [queue, setQueue] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset when closing
  useEffect(() => {
    if (!open) {
      setStep("form");
      setCategory("");
      setDragOver(false);
      setQueue([]);
      setProgress(0);
    }
  }, [open]);

  const isReadyToUpload = category && queue.length > 0;

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

  const onUpload = () => {
    if (!isReadyToUpload) return;
    setStep("progress");
  };

  // Simulate upload
  useEffect(() => {
    if (step !== "progress") return;
    setProgress(0);
    const id = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + Math.floor(8 + Math.random() * 12));
        if (next >= 100) {
          clearInterval(id);
          setStep("complete");
          // Build uploaded payload
          const result: UploadedFile[] = queue.map((f) => ({
            name: f.name,
            url: URL.createObjectURL(f),
            kind: kindFromName(f.name),
          }));
          onUploaded?.(result, category);
        }
        return next;
      });
    }, 250);
    return () => clearInterval(id);
  }, [step, category, queue, onUploaded]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(640px,calc(100vw-2rem))] max-h-[85vh] p-0" showCloseButton={false}>
        {step === "form" && (
          <div className="p-6 max-h-[75vh] overflow-y-auto">
            <div className="mb-1 text-xl font-semibold">Upload Documents</div>
            <div className="text-sm text-muted-foreground mb-5">Please upload a document for analysis.</div>

            {/* Category */}
            <label className="block text-sm font-medium mb-1">Document Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full h-11 rounded-xl bg-gray-100 border border-gray-10">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Dropzone */}
            <div
              className={`mt-4 rounded-xl border-2 border-dashed ${dragOver ? "border-blue-400 bg-blue-50/40" : "border-gray-300"} p-6`}
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
                  accept=".pdf,.csv,.ppt,.pptx,.doc,.docx"
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
          <div className="p-10 flex flex-col items-center text-center gap-5">
            <Upload className="size-7 text-blue-primary" />
            <div className="text-lg font-medium">Uploading Documents.... {progress}%</div>
            <div className="text-sm text-muted-foreground">This might take a few seconds</div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
            <Button variant="secondary" className="bg-gray-100 hover:bg-gray-100 text-foreground w-full" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
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
