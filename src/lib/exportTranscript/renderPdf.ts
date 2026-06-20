// HTML → PDF renderer.
//
// The spec calls for WeasyPrint server-side. Until we stand up a render
// service, we render in-browser with `html2canvas` + `jsPDF`:
//   1. Mount the HTML in an off-screen iframe sized to A4 (210 mm wide).
//   2. html2canvas the body into a canvas at 2× scale (Retina-quality).
//   3. Slice the canvas vertically into A4 page-height chunks and add
//      each chunk to a jsPDF document.
//   4. Stamp a footer page number on every page after the cover (the
//      cover is page 1 and intentionally has no footer per §7).
//
// This is a fidelity compromise — `@page` rules don't fire under
// html2canvas — but every other CSS rule (colors, typography, borders,
// page-break-inside: avoid, etc.) carries through.

import type { jsPDF as JsPdfType } from "jspdf";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const PX_PER_MM = 3.7795275591; // 96dpi
const A4_WIDTH_PX = Math.round(A4_WIDTH_MM * PX_PER_MM); // 794
const A4_HEIGHT_PX = Math.round(A4_HEIGHT_MM * PX_PER_MM); // 1123

async function loadDeps(): Promise<{
  jsPDF: typeof import("jspdf").jsPDF;
  html2canvas: typeof import("html2canvas").default;
}> {
  const [{ jsPDF }, html2canvasMod] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  return { jsPDF, html2canvas: html2canvasMod.default };
}

function mountIframe(html: string): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = `${A4_WIDTH_PX}px`;
  iframe.style.height = `${A4_HEIGHT_PX}px`;
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  return iframe;
}

function waitForRender(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise((resolve) => {
    if (iframe.contentDocument?.readyState === "complete") {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      return;
    }
    iframe.addEventListener(
      "load",
      () => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      },
      { once: true },
    );
  });
}

function stampFooter(pdf: JsPdfType, pageCount: number) {
  const footerText = "Inspires Genius  ·  Executive Assessment  ·  ";
  pdf.setFontSize(7);
  pdf.setTextColor(154, 163, 178);
  for (let p = 2; p <= pageCount; p++) {
    pdf.setPage(p);
    pdf.text(`${footerText}${p}`, A4_WIDTH_MM - 13, A4_HEIGHT_MM - 6, { align: "right" });
  }
  pdf.setTextColor(0, 0, 0);
}

export async function renderHtmlToPdf(html: string): Promise<Blob> {
  const { jsPDF, html2canvas } = await loadDeps();
  const iframe = mountIframe(html);
  try {
    await waitForRender(iframe);
    const doc = iframe.contentDocument!;
    const body = doc.body;
    // Snap measured width to A4 so html2canvas captures at predictable size.
    body.style.width = `${A4_WIDTH_PX}px`;

    const canvas = await html2canvas(body, {
      scale: 2,
      backgroundColor: "#ffffff",
      windowWidth: A4_WIDTH_PX,
      windowHeight: body.scrollHeight,
      width: A4_WIDTH_PX,
      height: body.scrollHeight,
      useCORS: true,
      logging: false,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageHeightPx = Math.floor((A4_HEIGHT_MM / A4_WIDTH_MM) * canvas.width);
    let renderedHeight = 0;
    let pageIndex = 0;

    while (renderedHeight < canvas.height) {
      const sliceHeight = Math.min(pageHeightPx, canvas.height - renderedHeight);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = sliceHeight;
      const ctx = slice.getContext("2d");
      if (!ctx) break;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, -renderedHeight);
      const sliceImg = slice.toDataURL("image/jpeg", 0.92);
      const sliceHeightMm = (sliceHeight / canvas.width) * A4_WIDTH_MM;
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(sliceImg, "JPEG", 0, 0, A4_WIDTH_MM, sliceHeightMm);
      renderedHeight += sliceHeight;
      pageIndex++;
    }

    stampFooter(pdf, pdf.getNumberOfPages());

    return pdf.output("blob");
  } finally {
    iframe.remove();
  }
}
