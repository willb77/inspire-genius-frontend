/**
 * MessageAttachments — download control(s) for files Meridian generated in a
 * chat turn (IG Core document-generation skill: branded Word/PDF/PowerPoint/…
 * documents). Each attachment carries a presigned, time-limited download URL,
 * so a plain anchor is enough — no fresh-URL fetch needed (contrast RAG
 * sources). Renders nothing when there are no attachments.
 *
 * The presigned link is ALSO embedded in the message markdown; this component
 * is the explicit, branded affordance beneath the bubble.
 */
import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import type { ChatAttachment } from "@/types/chat";

function formatBytes(bytes?: number): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function MessageAttachments({
  attachments,
  className,
}: {
  attachments?: ChatAttachment[];
  className?: string;
}) {
  const { t } = useTranslation("chat");

  const items = (attachments ?? []).filter((a) => a?.url && a?.filename);
  if (items.length === 0) return null;

  return (
    <div
      className={cn("mt-2 flex flex-col gap-1.5", className)}
      data-testid="message-attachments"
    >
      {items.map((a, i) => {
        const size = formatBytes(a.size_bytes);
        const ext = (a.format ?? a.filename.split(".").pop() ?? "").toUpperCase();
        return (
          <a
            key={`${a.filename}-${i}`}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            download={a.filename}
            data-testid="message-attachment-download"
            className={cn(
              "inline-flex w-fit max-w-full items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              "border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
            )}
            aria-label={t("attachments.downloadAria", {
              defaultValue: "Download {{filename}}",
              filename: a.filename,
            })}
          >
            <Download className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {t("attachments.download", { defaultValue: "Download" })}{" "}
              {a.filename}
            </span>
            {(ext || size) && (
              <span className="shrink-0 text-teal-600">
                {ext}
                {ext && size ? " · " : ""}
                {size}
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}
