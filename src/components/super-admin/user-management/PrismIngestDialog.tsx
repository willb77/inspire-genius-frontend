"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUp, Loader2, CheckCircle2, XCircle, Paperclip, Trash2 } from "lucide-react";
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
import { useAdminDeletePrismScores } from "@/hooks/prism/usePrismReportDownload";

/** A user the dialog can ingest a PRISM report for. */
export type PrismIngestTarget = {
  id: string;
  email: string;
  name?: string;
};

type RowStatus = "idle" | "running" | "done" | "error";

const ACCEPT = ".csv";

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
    // Sequential loop keeps per-row progress legible; the new CSV endpoint
    // is fast (no LLM) but Aurora writes still benefit from serialization.
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
            Uploads a legacy PRISM CSV export, parses it server-side, and inserts the assessment
            plus scores for the user. Re-uploading the same file is a no-op (idempotent per SHA-256).
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

        {!bulk && targets[0] && (
          <DeletePrismScoresSection target={targets[0]} disabled={running} />
        )}

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

/**
 * PRISM-RR (D3/D5): a super-admin deletes ONE user's PRISM scores and their
 * PRISM CSV documents. The report PDF is kept — it has its own Upload / Delete
 * PRISM PDF action. A hard delete with no undo, so it sits behind an explicit
 * step and typing the user's email. The server answers 403 while
 * `prism_pdf_replace` is off for the user, which the toast reports.
 */
export function DeletePrismScoresSection({
  target,
  disabled,
}: {
  target: PrismIngestTarget;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const del = useAdminDeletePrismScores();
  const matches = typed.trim().toLowerCase() === target.email.trim().toLowerCase();

  useEffect(() => {
    setConfirming(false);
    setTyped("");
  }, [target.id]);

  if (!confirming) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 p-2.5">
        <div className="text-xs text-muted-foreground">
          Remove this user&apos;s PRISM scores and PRISM CSV documents. The report PDF is kept.
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-red-300 text-red-700 hover:bg-red-50"
          disabled={disabled || del.isPending}
          data-testid="prism-scores-delete-open"
          onClick={() => setConfirming(true)}
        >
          <Trash2 className="size-4" /> Delete PRISM scores…
        </Button>
      </div>
    );
  }

  return (
    <div
      className="space-y-2 rounded-md border border-red-300 bg-red-50 p-3"
      data-testid="prism-scores-delete-confirm"
    >
      <p className="text-sm font-medium text-red-800">
        Delete {target.name || target.email}&apos;s PRISM scores?
      </p>
      <p className="text-xs text-red-800">
        This permanently removes their PRISM assessments, scores and PRISM CSV documents. Their
        report PDF is kept. It cannot be undone except by importing their PRISM data again.
      </p>
      <label className="block text-xs text-red-800" htmlFor="prism-scores-delete-email">
        Type <span className="font-mono">{target.email}</span> to confirm
      </label>
      <input
        id="prism-scores-delete-email"
        data-testid="prism-scores-delete-email"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        autoComplete="off"
        className="w-full rounded-md border border-red-300 bg-white px-2 py-1 text-sm"
      />
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={del.isPending}
          onClick={() => {
            setConfirming(false);
            setTyped("");
          }}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          data-testid="prism-scores-delete-submit"
          disabled={!matches || del.isPending || disabled}
          onClick={() =>
            del.mutate(
              { userId: target.id },
              {
                onSuccess: () => {
                  setConfirming(false);
                  setTyped("");
                },
              },
            )
          }
        >
          {del.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          Delete scores
        </Button>
      </div>
    </div>
  );
}
