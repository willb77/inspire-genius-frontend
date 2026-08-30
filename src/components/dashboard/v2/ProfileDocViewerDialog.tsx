import { useEffect, useState, type JSX } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, ExternalLink, FileText } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getDownloadUrl } from "@/services/documents/documentService";

export interface ViewableDoc {
  id: string;
  /** Heading for the dialog, e.g. "Resume" or the PRISM file name. */
  label: string;
  fileName?: string;
  contentType?: string;
  /**
   * A ready-made URL to render, skipping the `getDownloadUrl` lookup.
   *
   * Used by the PRISM report, which is generated on demand rather than stored:
   * there is no document row to look up, and the URL comes back from the same
   * call that built the file. Without this the dialog would have to invent an
   * id for something that does not exist in the documents table.
   */
  url?: string;
  /**
   * The document is still being generated. Lets a caller open the dialog on
   * click and fill it in when the file is ready, rather than leaving the button
   * looking inert for the second or two the render takes.
   */
  pending?: boolean;
  /** Generation failed. Shows the same honest error as a failed lookup. */
  failed?: boolean;
}

interface ProfileDocViewerDialogProps {
  doc: ViewableDoc | null;
  onOpenChange: (open: boolean) => void;
}

/** Decide how to render from content-type first, filename only as a fallback. */
function kindOf(doc: ViewableDoc): "pdf" | "image" | "other" {
  const ct = (doc.contentType ?? "").toLowerCase();
  const name = (doc.fileName ?? doc.label ?? "").toLowerCase();
  if (ct.includes("pdf") || name.endsWith(".pdf")) return "pdf";
  if (ct.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/.test(name))
    return "image";
  return "other";
}

/**
 * Opens an uploaded profile document in a modal.
 *
 * The presigned URL is fetched when the dialog opens rather than up front —
 * these URLs expire, so minting one per view avoids handing the user a dead
 * link from a page that has been sitting open.
 *
 * Only PDFs and images render inline. CSV/XLSX/DOCX have no reliable in-browser
 * viewer, so those get an explicit "Open in a new tab" action instead of an
 * iframe that would silently download or show a blank frame.
 */
export function ProfileDocViewerDialog({
  doc,
  onOpenChange,
}: ProfileDocViewerDialogProps): JSX.Element {
  const { t } = useTranslation("dashboard");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const open = doc !== null;

  useEffect(() => {
    if (!doc) {
      setUrl(null);
      setError(false);
      return;
    }
    // Still being generated — hold the dialog in its loading state.
    if (doc.pending) {
      setUrl(null);
      setError(false);
      setLoading(true);
      return;
    }
    if (doc.failed) {
      setUrl(null);
      setError(true);
      setLoading(false);
      return;
    }
    // A doc that arrives with its own URL is already resolved — generated on
    // demand rather than stored, so there is nothing to look up.
    if (doc.url) {
      setUrl(doc.url);
      setError(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    setUrl(null);
    getDownloadUrl(doc.id)
      .then((u) => {
        // Guard against a slow response for a document the user has already
        // navigated away from, which would otherwise show the wrong file.
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [doc]);

  const kind = doc ? kindOf(doc) : "other";

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? undefined : onOpenChange(false))}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate">
            {doc?.label}
            {doc?.fileName && doc.fileName !== doc.label ? (
              <span className="ml-2 text-[13px] font-normal text-[#7C93B5]">
                {doc.fileName}
              </span>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div
            className="flex h-64 items-center justify-center gap-2 text-[#4b5f80]"
            data-testid="doc-viewer-loading"
          >
            <Loader2 className="size-4 animate-spin" />
            {t("homeV2.openingDocument", { defaultValue: "Opening document…" })}
          </div>
        ) : error ? (
          <p
            className="py-8 text-center text-sm text-[#4b5f80]"
            data-testid="doc-viewer-error"
          >
            {t("homeV2.docOpenFailed", {
              defaultValue:
                "That document couldn't be opened. It may still be processing.",
            })}
          </p>
        ) : url ? (
          <>
            {kind === "pdf" ? (
              <iframe
                src={url}
                title={doc?.label ?? "document"}
                data-testid="doc-viewer-pdf"
                className="h-[70vh] w-full rounded-xl border border-[rgba(11,27,51,0.10)] bg-white"
              />
            ) : kind === "image" ? (
              <img
                src={url}
                alt={doc?.label ?? "document"}
                data-testid="doc-viewer-image"
                className="max-h-[70vh] w-full rounded-xl object-contain"
              />
            ) : (
              <div
                className="flex flex-col items-center gap-3 py-10 text-center"
                data-testid="doc-viewer-fallback"
              >
                <FileText className="size-8 text-[#7C93B5]" aria-hidden="true" />
                <p className="text-sm text-[#4b5f80]">
                  {t("homeV2.noInlinePreview", {
                    defaultValue:
                      "This file type can't be previewed here. Open it in a new tab instead.",
                  })}
                </p>
              </div>
            )}

            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="doc-viewer-open-tab"
              className="inline-flex items-center gap-1.5 self-start text-[13px] font-medium text-[#C9711A] underline underline-offset-2 hover:text-[#E8932B]"
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
              {t("homeV2.openInNewTab", { defaultValue: "Open in a new tab" })}
            </a>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
