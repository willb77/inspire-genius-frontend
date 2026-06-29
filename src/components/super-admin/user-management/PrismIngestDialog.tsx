"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUp, Loader2, CheckCircle2, XCircle, Paperclip } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { importPrismFile } from "@/services/prism/prism.service";

/** A user the dialog can ingest a PRISM report for. */
export type PrismIngestTarget = {
  id: string;
  email: string;
  name?: string;
};

type RowStatus = "idle" | "running" | "done" | "error";

const ACCEPT = ".csv,.pdf,.doc,.docx,.xls,.xlsx";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** One target = per-user upload; many = bulk ingest. */
  targets: PrismIngestTarget[];
};

/** Lowercased alphanumeric tokens we try to match a filename against. */
function matchTokens(t: PrismIngestTarget): string[] {
  const tokens: string[] = [];
  const local = t.email.split("@")[0]?.toLowerCase();
  if (local) tokens.push(local.replace(/[^a-z0-9]/g, ""));
  if (t.name) {
    for (const part of t.name.toLowerCase().split(/\s+/)) {
      const clean = part.replace(/[^a-z0-9]/g, "");
      if (clean.length >= 3) tokens.push(clean);
    }
  }
  return tokens.filter(Boolean);
}

export default function PrismIngestDialog({ open, onOpenChange, targets }: Props) {
  const queryClient = useQueryClient();
  const bulk = targets.length > 1;

  const [files, setFiles] = useState<Record<string, File>>({});
  const [statuses, setStatuses] = useState<Record<string, RowStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const multiInputRef = useRef<HTMLInputElement>(null);
  const rowInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Reset all state whenever the dialog is (re)opened for a new set of targets.
  useEffect(() => {
    if (open) {
      setFiles({});
      setStatuses({});
      setErrors({});
      setRunning(false);
      setProgress(null);
    }
  }, [open, targets]);

  const assignedCount = useMemo(() => Object.keys(files).length, [files]);
  const allDone = useMemo(
    () =>
      targets.length > 0 &&
      targets.every((t) => statuses[t.id] === "done" || statuses[t.id] === "error"),
    [targets, statuses],
  );

  function assignFile(userId: string, file: File | undefined) {
    setFiles((prev) => {
      const next = { ...prev };
      if (file) next[userId] = file;
      else delete next[userId];
      return next;
    });
    setStatuses((prev) => ({ ...prev, [userId]: "idle" }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  /** Auto-match a batch of files to unassigned targets by filename. */
  function autoMatch(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);
    let matched = 0;
    setFiles((prev) => {
      const next = { ...prev };
      for (const file of incoming) {
        const fname = file.name.toLowerCase();
        const target = targets.find(
          (t) => !next[t.id] && matchTokens(t).some((tok) => fname.includes(tok)),
        );
        if (target) {
          next[target.id] = file;
          matched += 1;
        }
      }
      return next;
    });
    const unmatched = incoming.length - matched;
    if (matched > 0) {
      toast.success(`Matched ${matched} file${matched === 1 ? "" : "s"} to users by filename.`);
    }
    if (unmatched > 0) {
      toast.warning(
        `${unmatched} file${unmatched === 1 ? "" : "s"} could not be matched — assign manually.`,
      );
    }
  }

  async function runIngest() {
    const queued = targets.filter((t) => files[t.id]);
    if (queued.length === 0) return;
    setRunning(true);
    setProgress({ done: 0, total: queued.length });

    let ok = 0;
    let failed = 0;
    // Sequential on purpose: /import-prism is LLM-backed and slow; serial keeps
    // per-row progress legible and avoids overwhelming the endpoint.
    for (let i = 0; i < queued.length; i++) {
      const t = queued[i];
      const file = files[t.id];
      setStatuses((prev) => ({ ...prev, [t.id]: "running" }));
      try {
        await importPrismFile(t.id, file);
        setStatuses((prev) => ({ ...prev, [t.id]: "done" }));
        ok += 1;
      } catch (e) {
        const err = e as Error & { response?: { data?: { detail?: string } } };
        const detail = err.response?.data?.detail ?? err.message ?? "Import failed";
        setStatuses((prev) => ({ ...prev, [t.id]: "error" }));
        setErrors((prev) => ({ ...prev, [t.id]: detail }));
        failed += 1;
      }
      setProgress({ done: i + 1, total: queued.length });
    }

    queryClient.invalidateQueries({ queryKey: ["prism-history"] });
    setRunning(false);
    if (failed === 0) {
      toast.success(`Ingested ${ok} PRISM report${ok === 1 ? "" : "s"}.`);
    } else {
      toast.error(`${ok} ingested, ${failed} failed. See per-row errors.`);
    }
  }

  function statusBadge(id: string) {
    const s = statuses[id] ?? "idle";
    if (s === "running")
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-transparent">
          <Loader2 className="size-3 mr-1 animate-spin" /> Ingesting
        </Badge>
      );
    if (s === "done")
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700 border-transparent">
          <CheckCircle2 className="size-3 mr-1" /> Done
        </Badge>
      );
    if (s === "error")
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-700 border-transparent">
          <XCircle className="size-3 mr-1" /> Failed
        </Badge>
      );
    return files[id] ? (
      <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-transparent">
        Ready
      </Badge>
    ) : (
      <Badge variant="outline" className="text-muted-foreground">
        No file
      </Badge>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (running ? null : onOpenChange(o))}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {bulk ? `Bulk ingest PRISM reports (${targets.length})` : "Upload PRISM report"}
          </DialogTitle>
          <DialogDescription>
            Parses the report (CSV, PDF, DOCX, XLS/XLSX), extracts the quadrant scores, and attaches
            them to the user — creates the PRISM record and stores the scores. Existing scores are
            updated in place.
          </DialogDescription>
        </DialogHeader>

        {bulk && (
          <div className="rounded-md border border-dashed p-3 flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Add multiple files and auto-match them to users by filename (email or name).
            </div>
            <input
              ref={multiInputRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                autoMatch(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={running}
              onClick={() => multiInputRef.current?.click()}
            >
              <FileUp className="size-4" /> Add files
            </Button>
          </div>
        )}

        <div className="max-h-[45vh] overflow-y-auto space-y-2">
          {targets.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-md border p-2.5"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{t.name || t.email}</div>
                {t.name && (
                  <div className="truncate text-xs text-muted-foreground">{t.email}</div>
                )}
                {files[t.id] && (
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-indigo-600">
                    <Paperclip className="size-3" />
                    <span className="truncate max-w-[16rem]">{files[t.id].name}</span>
                  </div>
                )}
                {errors[t.id] && (
                  <div className="mt-0.5 text-xs text-red-600 break-words">{errors[t.id]}</div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {statusBadge(t.id)}
                <input
                  ref={(el) => {
                    rowInputRefs.current[t.id] = el;
                  }}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    assignFile(t.id, e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={running}
                  onClick={() => rowInputRefs.current[t.id]?.click()}
                >
                  {files[t.id] ? "Change" : "Choose file"}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="flex items-center sm:justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            {progress
              ? `Ingesting ${progress.done}/${progress.total}…`
              : `${assignedCount} of ${targets.length} ready`}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={running}
              onClick={() => onOpenChange(false)}
            >
              {allDone ? "Close" : "Cancel"}
            </Button>
            <Button
              type="button"
              disabled={running || assignedCount === 0}
              onClick={runIngest}
              className={cn(running && "opacity-80")}
            >
              {running ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Ingesting…
                </>
              ) : (
                <>
                  <FileUp className="size-4" /> Ingest{" "}
                  {assignedCount > 0 ? `(${assignedCount})` : ""}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
