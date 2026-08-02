/**
 * @jest-environment jsdom
 *
 * The PRISM Brain Map must travel into the exported Word/PDF/print artefact,
 * so a saved turn matches what was on screen.
 *
 * These live in their own file because
 * `ChatWindowChatTab.turn-export.test.tsx` MOCKS the export module — the real
 * `buildTurnHtml` is not reachable from there.
 */
import { buildTurnHtml } from "@/lib/exportTranscript/exportTurn";

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><text>Gold ↔ Blue · 92</text></svg>';

describe("buildTurnHtml — PRISM figure", () => {
  it("embeds the map as a self-contained data URI", () => {
    const html = buildTurnHtml({
      speaker: "Meridian",
      body: "Your Blue is 92.",
      figure: { svg: SVG, caption: "PRISM Brain Map. Blue 92." },
    });
    expect(html).toContain("data:image/svg+xml;charset=utf-8,");
    // Word and the print frame must not need the network.
    expect(html).not.toContain('src="http');
    const encoded = html.split("charset=utf-8,")[1].split('"')[0];
    expect(decodeURIComponent(encoded)).toBe(SVG);
  });

  it("survives non-Latin1 characters in the map", () => {
    // "↔" and "·" would break a btoa()-based encoding.
    const html = buildTurnHtml({
      speaker: "Meridian",
      body: "b",
      figure: { svg: SVG },
    });
    const encoded = html.split("charset=utf-8,")[1].split('"')[0];
    expect(decodeURIComponent(encoded)).toContain("↔");
  });

  it("uses the description as alt text", () => {
    const html = buildTurnHtml({
      speaker: "Meridian",
      body: "b",
      figure: { svg: SVG, caption: "PRISM Brain Map. Blue 92." },
    });
    expect(html).toContain('alt="PRISM Brain Map. Blue 92."');
  });

  it("omits the figure block entirely when there is no map", () => {
    const html = buildTurnHtml({ speaker: "Meridian", body: "Just prose." });
    expect(html).not.toContain("data:image/svg+xml");
    expect(html).toContain("Just prose.");
  });

  it("still escapes the body — adding `figure` must not weaken the contract", () => {
    const html = buildTurnHtml({
      speaker: "Meridian",
      body: "<script>alert(1)</script>",
      figure: { svg: SVG },
    });
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("escapes a hostile caption", () => {
    const html = buildTurnHtml({
      speaker: "Meridian",
      body: "b",
      figure: { svg: SVG, caption: '"><script>alert(1)</script>' },
    });
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
