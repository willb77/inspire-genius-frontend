import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Trash2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Document, Page, pdfjs, Thumbnail } from "react-pdf";
import type { DocumentViewerModalProps } from "@/types/chat-types";

// Configure PDF.js worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function DocumentViewerModal({ open, onOpenChange, fileUrl, fileName = "Document.pdf", onDelete, onDownload, }: DocumentViewerModalProps) {
  // State for react-pdf
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const [viewerWidth, setViewerWidth] = useState<number>(0);

  // Reset on file change or modal open
  useEffect(() => {
    setPageNumber(1);
    setNumPages(0);
  }, [open, fileUrl]);

  // Measure viewer width to support fit-to-width rendering
  useLayoutEffect(() => {
    const measure = () => {
      if (!viewerRef.current) return;
      // clientWidth is more robust for layout sizing
      const width = viewerRef.current.clientWidth;
      if (width) setViewerWidth(width);
    };

    // Initial measure after layout
    // rAF ensures the element is in the DOM and styled
    const raf1 = requestAnimationFrame(measure);
    const raf2 = requestAnimationFrame(measure);

    // Observe container size changes
    let ro: ResizeObserver | null = null;
    if (viewerRef.current && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(viewerRef.current);
    }

    // Fallback on window resize
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener("resize", measure);
      if (ro) ro.disconnect();
    };
  }, [open]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    // Measure once more after the PDF is ready
    if (viewerRef.current) {
      const width = viewerRef.current.clientWidth;
      if (width) setViewerWidth(width);
    }
  };

  // Compute a resilient fit-to-width that works on first open
  const computedFitWidth = Math.max(
    100,
    Math.floor(((viewerRef.current?.clientWidth ?? viewerWidth) || 0) - 32) // 16px padding left+right
  );

  const goPrev = () => setPageNumber((prev) => Math.max(1, prev - 1));
  const goNext = () => setPageNumber((prev) => Math.min(numPages, prev + 1));

  const handleDownload = () => {
    if (onDownload) return onDownload();
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[70vw] !max-w-7xl h-[92vh] p-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b pl-4 pr-10 py-3 bg-white relative z-20">
          <div className="flex items-center gap-2">
            <img src="/images/user/home/document-pdf.svg" alt="PDF" className="w-6 h-6" />
            <div className="font-semibold">{fileName}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="h-8 px-3 rounded-lg bg-red-100 text-red-700 hover:bg-red-100" onClick={onDelete}>
              Delete
              <Trash2 className="size-4 ml-2" />
            </Button>
            <Button className="h-8 px-3 rounded-lg bg-blue-primary text-white hover:bg-blue-primary/90" onClick={handleDownload}>
              Download
              <Download className="size-4 ml-2" />
            </Button>
            <button aria-label="Close" className="p-1 rounded-md hover:bg-gray-100" onClick={() => onOpenChange(false)}>
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex h-[calc(100%-3rem)] min-h-0">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            className="flex h-full min-h-0 min-w-0 w-full"
            loading={<div className="w-full h-full grid place-items-center text-sm text-muted-foreground">Loading PDF...</div>}
            error={<div className="w-full h-full grid place-items-center text-sm text-red-600">Failed to load PDF</div>}
          >
            {/* Thumbnails */}
            <div className="w-52 shrink-0 border-r p-3 overflow-auto bg-gray-50/60">
              <div className="space-y-4">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPageNumber(p)}
                    className="w-full group"
                  >
                    <div className={`rounded-md overflow-hidden border bg-white ${pageNumber === p ? "ring-2 ring-blue-500" : ""}`}>
                      <Thumbnail pageNumber={p} width={160} />
                    </div>
                    <div className="text-center mt-1 text-xs text-black">{String(p).padStart(2, "0")}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Main viewer */}
            <div className="flex-1 min-h-0 min-w-0 overflow-auto bg-muted/20 p-3">
              <div className="rounded-xl bg-white shadow-sm h-full min-h-0 flex flex-col">
                {/* Simple toolbar: page navigation + zoom */}
                <div className="border-b px-2 py-1 flex items-center justify-between sticky top-0 bg-white z-10">
                  <div className="flex items-center gap-1">
                    <button
                      aria-label="Previous page"
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                      onClick={goPrev}
                      disabled={pageNumber <= 1}
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <div className="text-xs tabular-nums">{numPages ? `${pageNumber} / ${numPages}` : "-- / --"}</div>
                    <button
                      aria-label="Next page"
                      className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
                      onClick={goNext}
                      disabled={pageNumber >= numPages}
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                  <div />
                </div>

                {/* Viewer */}
                <div ref={viewerRef} className="flex-1 min-h-0 overflow-auto bg-gray-50">
                  <div className="p-4 w-fit">
                    <Page
                      pageNumber={pageNumber}
                      width={computedFitWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Document>
        </div>
      </DialogContent>
    </Dialog>
  );
}
